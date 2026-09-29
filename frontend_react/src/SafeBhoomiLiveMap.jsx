
import { useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  LocateFixed,
  Layers3,
  RefreshCw,
  X,
  Mountain,
  ShieldAlert,
  CloudRain,
  Droplets,
  Route,
  MapPinned
} from "lucide-react";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://safebhoomiapi-1.onrender.com";

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY || "";

const SAFE_BASE_URL = import.meta.env.BASE_URL || "/";

const UTTARAKHAND_CENTER = [79.2, 30.05];

const DISTRICTS = [
  "Almora",
  "Bageshwar",
  "Chamoli",
  "Champawat",
  "Dehradun",
  "Haridwar",
  "Nainital",
  "Pauri Garhwal",
  "Pithoragarh",
  "Rudraprayag",
  "Tehri Garhwal",
  "Udham Singh Nagar",
  "Uttarkashi"
];

const FALLBACK = {
  Almora: {
    score: 52,
    level: "HIGH"
  },
  Bageshwar: {
    score: 42,
    level: "MODERATE"
  },
  Chamoli: {
    score: 55,
    level: "HIGH"
  },
  Champawat: {
    score: 45,
    level: "MODERATE"
  },
  Dehradun: {
    score: 25,
    level: "LOW"
  },
  Haridwar: {
    score: 12,
    level: "LOW"
  },
  Nainital: {
    score: 50,
    level: "HIGH"
  },
  "Pauri Garhwal": {
    score: 48,
    level: "MODERATE"
  },
  Pithoragarh: {
    score: 52,
    level: "HIGH"
  },
  Rudraprayag: {
    score: 55,
    level: "HIGH"
  },
  "Tehri Garhwal": {
    score: 47,
    level: "MODERATE"
  },
  "Udham Singh Nagar": {
    score: 15,
    level: "LOW"
  },
  Uttarkashi: {
    score: 53,
    level: "HIGH"
  }
};

function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function riskLevel(score) {
  const n = Number(score) || 0;

  if (n >= 75) return "CRITICAL";
  if (n >= 50) return "HIGH";
  if (n >= 30) return "MODERATE";
  return "LOW";
}

function riskColor(level) {
  switch (String(level || "").toUpperCase()) {
    case "CRITICAL":
      return "#7f1d1d";
    case "HIGH":
      return "#dc2626";
    case "MODERATE":
      return "#f59e0b";
    default:
      return "#16a34a";
  }
}

function normalizeRiskResponse(data, district) {
  const score =
    data?.risk?.score ??
    data?.risk_score ??
    data?.score ??
    FALLBACK[district]?.score ??
    0;

  const level =
    data?.risk?.level ??
    data?.risk_level ??
    riskLevel(score);

  return {
    district,
    score: Number(score),
    level: String(level).toUpperCase(),
    available: data?.status === "AVAILABLE",
    raw: data
  };
}

async function getDistrictRisk(district) {
  const row = {
    district,
    rainfall_24h: null,
    rainfall_7d: null,
    humidity: null,
    soil_saturation: null,
    historical_susceptibility: null,
    recent_landslides: null,
    road_blockages: null
  };

  try {
    const datasetResponse = await fetch(
      `${SAFE_BASE_URL}safebhoomi_districts.json`
    );

    if (datasetResponse.ok) {
      const dataset = await datasetResponse.json();
      const found = dataset.find(
        (item) =>
          normalizeName(item.district) === normalizeName(district)
      );

      if (found) {
        row.rainfall_24h = found.rainfall_mm;
        row.rainfall_7d = found.rainfall_7d_mm ?? found.rainfall_mm;
        row.humidity = found.humidity_pct;
        row.soil_saturation = found.soil_saturation_pct;
        row.historical_susceptibility =
          found.historical_susceptibility;
        row.recent_landslides = found.recent_landslides;
        row.road_blockages = found.road_blockages;
      }
    }
  } catch {
    // Render API remains the primary source.
  }

  const response = await fetch(`${API_BASE}/api/risk/unified`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(row)
  });

  if (!response.ok) {
    throw new Error(`Risk API HTTP ${response.status}`);
  }

  return normalizeRiskResponse(
    await response.json(),
    district
  );
}

export default function SafeBhoomiLiveMap() {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);

  const [risks, setRisks] = useState({});
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [satellite, setSatellite] = useState(true);
  const [locating, setLocating] = useState(false);

  const counts = useMemo(() => {
    const values = Object.values(risks);

    return {
      critical: values.filter((x) => x.level === "CRITICAL").length,
      high: values.filter((x) => x.level === "HIGH").length,
      moderate: values.filter((x) => x.level === "MODERATE").length,
      low: values.filter((x) => x.level === "LOW").length
    };
  }, [risks]);

  async function loadRisks() {
    setLoading(true);
    setApiError(false);

    const next = {};

    await Promise.all(
      DISTRICTS.map(async (district) => {
        try {
          next[district] = await getDistrictRisk(district);
        } catch {
          const fallback = FALLBACK[district] || {
            score: 0,
            level: "LOW"
          };

          next[district] = {
            district,
            score: fallback.score,
            level: fallback.level,
            available: false,
            raw: null
          };
        }
      })
    );

    setRisks(next);

    const failed = Object.values(next).some(
      (item) => !item.available
    );

    setApiError(failed);
    setLoading(false);

    return next;
  }

  function applyRiskColors(map, riskData) {
    if (!map || !map.getSource("districts")) return;

    const source = map.getSource("districts");

    const geojson = source._data;

    if (!geojson?.features) return;

    const features = geojson.features.map((feature) => {
      const props = feature.properties || {};

      const name =
        props.district ||
        props.DISTRICT ||
        props.District ||
        props.name ||
        props.NAME ||
        "";

      const risk = riskData[name] || riskData[normalizeName(name)];

      return {
        ...feature,
        properties: {
          ...props,
          safeRiskScore: risk?.score ?? 0,
          safeRiskLevel: risk?.level ?? "LOW"
        }
      };
    });

    map.getSource("districts").setData({
      ...geojson,
      features
    });
  }

  function setupMap() {
    if (!mapContainer.current || mapRef.current) return;

    if (!MAPTILER_KEY) {
      console.error("Missing VITE_MAPTILER_KEY");
      return;
    }

    const styleUrl = satellite
      ? `https://api.maptiler.com/maps/hybrid/style.json?key=${MAPTILER_KEY}`
      : `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: styleUrl,
      center: UTTARAKHAND_CENTER,
      zoom: 6.4,
      minZoom: 5.5,
      maxZoom: 12,
      pitch: 35,
      bearing: 0,
      attributionControl: true
    });

    mapRef.current = map;

    map.addControl(
      new maplibregl.NavigationControl({
        visualizePitch: true
      }),
      "top-right"
    );

    map.on("load", async () => {
      setMapReady(true);

      try {
        const response = await fetch(
          `${SAFE_BASE_URL}uttarakhand_districts.geojson`
        );

        if (!response.ok) {
          throw new Error("District GeoJSON unavailable");
        }

        const geojson = await response.json();

        if (!map.getSource("districts")) {
          map.addSource("districts", {
            type: "geojson",
            data: geojson
          });

          map.addLayer({
            id: "district-fill",
            type: "fill",
            source: "districts",
            paint: {
              "fill-color": [
                "match",
                ["get", "safeRiskLevel"],
                "CRITICAL",
                "#7f1d1d",
                "HIGH",
                "#dc2626",
                "MODERATE",
                "#f59e0b",
                "LOW",
                "#16a34a",
                "#64748b"
              ],
              "fill-opacity": 0.38
            }
          });

          map.addLayer({
            id: "district-outline",
            type: "line",
            source: "districts",
            paint: {
              "line-color": "#ffffff",
              "line-width": 1.6,
              "line-opacity": 0.85
            }
          });

          map.on("click", "district-fill", (event) => {
            const feature = event.features?.[0];

            if (!feature) return;

            const props = feature.properties || {};

            const district =
              props.district ||
              props.DISTRICT ||
              props.District ||
              props.name ||
              props.NAME;

            if (!district) return;

            const risk =
              risks[district] ||
              risks[
                Object.keys(risks).find(
                  (key) =>
                    normalizeName(key) === normalizeName(district)
                )
              ];

            setSelected({
              district,
              ...(risk || {
                score: Number(props.safeRiskScore || 0),
                level: props.safeRiskLevel || "LOW"
              })
            });
          });

          map.on("mouseenter", "district-fill", () => {
            map.getCanvas().style.cursor = "pointer";
          });

          map.on("mouseleave", "district-fill", () => {
            map.getCanvas().style.cursor = "";
          });
        }

        const loaded = await loadRisks();

        applyRiskColors(map, loaded);
      } catch (error) {
        console.error(error);
        setApiError(true);
        await loadRisks();
      }
    });
  }

  useEffect(() => {
    setupMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    const center = mapRef.current.getCenter();
    const zoom = mapRef.current.getZoom();

    mapRef.current.remove();

    mapRef.current = null;
    setMapReady(false);

    setTimeout(() => {
      setupMap();

      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.jumpTo({
            center,
            zoom
          });
        }
      }, 600);
    }, 100);
  }, [satellite]);

  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    applyRiskColors(mapRef.current, risks);
  }, [risks, mapReady]);

  function locateMe() {
    if (!navigator.geolocation) {
      alert("Location is not supported by this browser.");
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { longitude, latitude } = position.coords;

        mapRef.current?.flyTo({
          center: [longitude, latitude],
          zoom: 10,
          pitch: 45,
          duration: 1800
        });

        setLocating(false);
      },
      () => {
        setLocating(false);
        alert("Unable to access your location.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }

  function flyToUttarakhand() {
    mapRef.current?.flyTo({
      center: UTTARAKHAND_CENTER,
      zoom: 6.4,
      pitch: 35,
      duration: 1200
    });
  }

  const selectedColor = selected
    ? riskColor(selected.level)
    : "#dc2626";

  return (
    <section className="safe-map-shell">
      <div className="safe-map-header">
        <div>
          <div className="safe-map-eyebrow">
            LIVE INTELLIGENCE • UTTARAKHAND
          </div>

          <h2>Uttarakhand Risk Map</h2>

          <p>
            District-level landslide intelligence powered by
            SafeBhoomi's unified risk engine.
          </p>
        </div>

        <div className="safe-map-actions">
          <button
            className="safe-map-button"
            onClick={locateMe}
            disabled={locating}
          >
            <LocateFixed size={17} />
            {locating ? "Locating..." : "My Location"}
          </button>

          <button
            className="safe-map-button"
            onClick={() => setSatellite((v) => !v)}
          >
            <Layers3 size={17} />
            {satellite ? "Satellite" : "Map"}
          </button>

          <button
            className="safe-map-button"
            onClick={() => {
              flyToUttarakhand();
              loadRisks();
            }}
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </div>
      </div>

      <div className="safe-map-statbar">
        <div>
          <strong>13</strong>
          <span>Districts</span>
        </div>

        <div className="map-stat-critical">
          <strong>{counts.critical}</strong>
          <span>Critical</span>
        </div>

        <div className="map-stat-high">
          <strong>{counts.high}</strong>
          <span>High</span>
        </div>

        <div className="map-stat-moderate">
          <strong>{counts.moderate}</strong>
          <span>Moderate</span>
        </div>

        <div className="map-stat-low">
          <strong>{counts.low}</strong>
          <span>Low</span>
        </div>
      </div>

      <div className="safe-map-wrapper">
        <div
          ref={mapContainer}
          className="safe-map-canvas"
        />

        {!MAPTILER_KEY && (
          <div className="safe-map-overlay">
            <div className="safe-map-error-card">
              <ShieldAlert size={32} />
              <h3>Map configuration required</h3>
              <p>
                Add the MapTiler API key to enable satellite
                imagery.
              </p>
            </div>
          </div>
        )}

        {loading && (
          <div className="safe-map-loading">
            <RefreshCw className="safe-spin" size={18} />
            Loading district intelligence...
          </div>
        )}

        {apiError && !loading && (
          <div className="safe-map-api-warning">
            <ShieldAlert size={15} />
            Some live risk data unavailable — fallback intelligence
            displayed.
          </div>
        )}

        <div className="safe-map-legend">
          <div className="legend-title">
            LANDSLIDE RISK
          </div>

          <div>
            <i style={{ background: "#7f1d1d" }} />
            Critical
          </div>

          <div>
            <i style={{ background: "#dc2626" }} />
            High
          </div>

          <div>
            <i style={{ background: "#f59e0b" }} />
            Moderate
          </div>

          <div>
            <i style={{ background: "#16a34a" }} />
            Low
          </div>
        </div>

        <button
          className="safe-map-home"
          onClick={flyToUttarakhand}
          title="Return to Uttarakhand"
        >
          <MapPinned size={18} />
        </button>

        {selected && (
          <div className="safe-map-district-card">
            <button
              className="safe-map-close"
              onClick={() => setSelected(null)}
            >
              <X size={18} />
            </button>

            <div className="district-card-label">
              DISTRICT INTELLIGENCE
            </div>

            <h3>{selected.district}</h3>

            <div className="district-risk-row">
              <div
                className="district-risk-score"
                style={{ color: selectedColor }}
              >
                {Number(selected.score).toFixed(1)}
              </div>

              <div>
                <div
                  className="district-risk-pill"
                  style={{
                    borderColor: selectedColor,
                    color: selectedColor
                  }}
                >
                  {selected.level}
                </div>

                <span>Unified risk score</span>
              </div>
            </div>

            {selected.raw && (
              <div className="district-details">
                {selected.raw.terrain && (
                  <div>
                    <Mountain size={15} />
                    <span>
                      {selected.raw.terrain.slope_deg}° slope
                    </span>
                  </div>
                )}

                {selected.raw.inputs && (
                  <>
                    <div>
                      <CloudRain size={15} />
                      <span>
                        {selected.raw.inputs.rainfall_24h_mm} mm
                        rainfall
                      </span>
                    </div>

                    <div>
                      <Droplets size={15} />
                      <span>
                        {selected.raw.inputs.soil_saturation_percent}%
                        soil saturation
                      </span>
                    </div>

                    <div>
                      <Route size={15} />
                      <span>
                        {selected.raw.inputs.road_blockages} road
                        blockages
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}

            {selected.raw?.risk_drivers?.length > 0 && (
              <div className="district-drivers">
                <strong>Risk drivers</strong>

                {selected.raw.risk_drivers.map((driver) => (
                  <span key={driver}>• {driver}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
