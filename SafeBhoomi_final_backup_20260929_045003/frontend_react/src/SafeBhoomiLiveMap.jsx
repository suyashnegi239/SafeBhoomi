
import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const CENTER = [79.0193, 30.0668];

const FALLBACK_DISTRICTS = [
  ["Chamoli", 30.401, 79.320, 73, 85, 78, 5, 34, 82, 4],
  ["Rudraprayag", 30.284, 78.981, 73, 72, 75, 4, 36, 79, 3],
  ["Uttarkashi", 30.726, 78.435, 72, 68, 70, 3, 33, 76, 2],
  ["Pithoragarh", 29.582, 80.219, 71, 65, 72, 3, 38, 80, 3],
  ["Nainital", 29.391, 79.454, 68, 58, 67, 2, 31, 70, 2],
  ["Bageshwar", 29.838, 79.771, 55, 45, 60, 1, 28, 62, 1],
  ["Pauri Garhwal", 30.146, 78.781, 61, 42, 58, 1, 29, 65, 1],
  ["Tehri Garhwal", 30.378, 78.480, 60, 40, 55, 1, 27, 61, 1],
  ["Champawat", 29.333, 80.091, 57, 38, 52, 1, 26, 58, 1],
  ["Almora", 29.598, 79.660, 45, 30, 48, 0, 23, 50, 0],
  ["Dehradun", 30.316, 78.032, 31, 20, 42, 0, 18, 43, 0],
  ["Haridwar", 29.945, 78.164, 18, 10, 35, 0, 8, 30, 0],
  ["Udham Singh Nagar", 29.000, 79.500, 20, 12, 38, 0, 7, 32, 0],
];

function riskColor(score) {
  if (score >= 75) return "#dc2626";
  if (score >= 60) return "#ea580c";
  if (score >= 40) return "#eab308";
  return "#16a34a";
}

function riskName(score) {
  if (score >= 75) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 40) return "MODERATE";
  return "LOW";
}

function normalizeDistrict(row) {
  return {
    district: row.district ?? row.name ?? row.District ?? "Unknown",
    lat: Number(row.latitude ?? row.lat ?? row.Latitude ?? 0),
    lon: Number(row.longitude ?? row.lon ?? row.Longitude ?? 0),
    score: Number(row.risk_score ?? row.riskScore ?? row.score ?? 0),
    rainfall: Number(row.rainfall_mm ?? row.Rainfall_mm ?? row.rainfall ?? 0),
    humidity: Number(row.humidity_pct ?? row.Humidity_pct ?? row.humidity ?? 0),
    landslides: Number(
      row.recent_landslides ?? row.landslides ?? row.Recent_Landslides ?? 0
    ),
    slope: Number(row.slope_deg ?? row.slope ?? row.Slope_deg ?? 0),
    soil: Number(
      row.soil_saturation_pct ??
        row.soil_saturation ??
        row.Soil_Saturation_pct ??
        0
    ),
    roads: Number(
      row.road_blockages ??
        row.blockages ??
        row.Road_Blockages ??
        0
    ),
  };
}

function fallbackData() {
  return FALLBACK_DISTRICTS.map(
    ([district, lat, lon, score, rainfall, humidity, landslides, slope, soil, roads]) =>
      ({
        district,
        lat,
        lon,
        score,
        rainfall,
        humidity,
        landslides,
        slope,
        soil,
        roads,
      })
  );
}

function makePoints(districts) {
  return {
    type: "FeatureCollection",
    features: districts.map((d) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [d.lon, d.lat],
      },
      properties: {
        district: d.district,
        score: d.score,
        risk: riskName(d.score),
      },
    })),
  };
}

function makeDistrictGeoJSON(geo, districts) {
  if (!geo) return null;

  const byName = new Map(
    districts.map((d) => [String(d.district).toLowerCase(), d.score])
  );

  const features = (geo.features || []).map((feature) => {
    const props = feature.properties || {};

    const name =
      props.DISTRICT ??
      props.district ??
      props.District ??
      props.NAME_2 ??
      props.NAME_1 ??
      props.name ??
      "";

    const score = byName.get(String(name).toLowerCase()) ?? 0;

    return {
      ...feature,
      properties: {
        ...props,
        safebhoomi_district: name,
        safebhoomi_score: score,
        safebhoomi_risk: riskName(score),
      },
    };
  });

  return {
    type: "FeatureCollection",
    features,
  };
}

export default function SafeBhoomiLiveMap({ onDistrictSelect }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const animationRef = useRef(null);

  const [districts, setDistricts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showZones, setShowZones] = useState(true);
  const [showPulse, setShowPulse] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const response = await fetch("/SafeBhoomi/safebhoomi_districts.json");

        if (!response.ok) {
          throw new Error(`Dataset request failed: ${response.status}`);
        }

        const json = await response.json();

        const rows = Array.isArray(json)
          ? json
          : json.districts || json.data || [];

        const normalized = rows
          .map(normalizeDistrict)
          .filter((d) => d.lat && d.lon && d.district);

        if (!normalized.length) {
          throw new Error("Dataset contained no usable district records.");
        }

        if (!cancelled) {
          setDistricts(normalized);
        }
      } catch (err) {
        console.warn("SafeBhoomi district dataset unavailable:", err);

        if (!cancelled) {
          setDistricts(fallbackData());
          setError("Using local fallback district data.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current || loading || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,

      // Clean OpenStreetMap raster basemap.
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: [
              "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },

          terrain: {
            type: "raster-dem",
            tiles: [
              "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            encoding: "terrarium",
            maxzoom: 15,
          },
        },

        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm",
          },
        ],

        terrain: {
          source: "terrain",
          exaggeration: 1.35,
        },
      },

      center: CENTER,
      zoom: 7.1,
      pitch: 55,
      bearing: 18,
      minZoom: 5.5,
      maxZoom: 15,
      maxPitch: 75,
      attributionControl: true,
    });

    map.addControl(
      new maplibregl.NavigationControl({
        visualizePitch: true,
      }),
      "top-right"
    );

    map.addControl(
      new maplibregl.TerrainControl({
        source: "terrain",
        exaggeration: 1.35,
      }),
      "top-right"
    );

    map.on("load", () => {
      mapRef.current = map;

      // --------------------------------------------------------
      // DISTRICT POINTS
      // --------------------------------------------------------
      map.addSource("safebhoomi-points", {
        type: "geojson",
        data: makePoints(districts),
      });

      // Main risk circles
      map.addLayer({
        id: "risk-circles",
        type: "circle",
        source: "safebhoomi-points",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "score"],
            0,
            6,
            40,
            10,
            60,
            14,
            75,
            19,
            100,
            24,
          ],
          "circle-color": [
            "case",
            [">=", ["get", "score"], 75],
            "#dc2626",
            [">=", ["get", "score"], 60],
            "#ea580c",
            [">=", ["get", "score"], 40],
            "#eab308",
            "#16a34a",
          ],
          "circle-opacity": 0.78,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
          "circle-stroke-opacity": 0.9,
        },
      });

      // Outer pulse layer
      map.addLayer({
        id: "hazard-pulse",
        type: "circle",
        source: "safebhoomi-points",
        filter: [">=", ["get", "score"], 60],
        paint: {
          "circle-radius": 28,
          "circle-color": [
            "case",
            [">=", ["get", "score"], 75],
            "#dc2626",
            "#ea580c",
          ],
          "circle-opacity": 0.10,
          "circle-stroke-width": 2,
          "circle-stroke-color": [
            "case",
            [">=", ["get", "score"], 75],
            "#dc2626",
            "#ea580c",
          ],
          "circle-stroke-opacity": 0.28,
        },
      });

      // District labels
      map.addLayer({
        id: "district-labels",
        type: "symbol",
        source: "safebhoomi-points",
        layout: {
          "text-field": [
            "concat",
            ["get", "district"],
            "  ",
            ["get", "risk"],
          ],
          "text-size": 11,
          "text-offset": [0, 2.2],
          "text-anchor": "top",
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#0f172a",
          "text-halo-color": "#ffffff",
          "text-halo-width": 2,
        },
      });

      // Clickable districts
      map.on("click", "risk-circles", (event) => {
        const feature = event.features?.[0];

        if (!feature) return;

        const districtName = feature.properties?.district;

        const district = districts.find(
          (d) => d.district === districtName
        );

        if (!district) return;

        setSelected(district);

        if (onDistrictSelect) {
          onDistrictSelect(district.district);
        }

        new maplibregl.Popup({
          closeButton: true,
          closeOnClick: true,
        })
          .setLngLat(event.lngLat)
          .setHTML(`
            <div style="min-width:210px;font-family:Inter,Arial,sans-serif">
              <strong style="font-size:16px">${district.district}</strong>
              <div style="margin-top:8px">
                <b>Risk:</b>
                <span style="color:${riskColor(district.score)}">
                  ${riskName(district.score)}
                </span>
              </div>
              <div><b>Risk score:</b> ${district.score}/100</div>
              <div><b>Rainfall:</b> ${district.rainfall} mm</div>
              <div><b>Soil saturation:</b> ${district.soil}%</div>
              <div><b>Slope:</b> ${district.slope}°</div>
              <div><b>Recent landslides:</b> ${district.landslides}</div>
            </div>
          `)
          .addTo(map);
      });

      map.on("mouseenter", "risk-circles", () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", "risk-circles", () => {
        map.getCanvas().style.cursor = "";
      });

      // Slight cinematic initial movement.
      map.easeTo({
        pitch: 58,
        bearing: 22,
        duration: 1800,
      });

      // --------------------------------------------------------
      // HAZARD PULSE ANIMATION
      // --------------------------------------------------------
      let pulse = 0;

      const animatePulse = () => {
        if (!map.getLayer("hazard-pulse")) {
          animationRef.current = requestAnimationFrame(animatePulse);
          return;
        }

        if (!showPulse) {
          map.setPaintProperty(
            "hazard-pulse",
            "circle-opacity",
            0
          );
        } else {
          const wave = (Math.sin(pulse) + 1) / 2;

          map.setPaintProperty(
            "hazard-pulse",
            "circle-radius",
            24 + wave * 18
          );

          map.setPaintProperty(
            "hazard-pulse",
            "circle-opacity",
            0.04 + wave * 0.12
          );
        }

        pulse += 0.045;
        animationRef.current = requestAnimationFrame(animatePulse);
      };

      animationRef.current = requestAnimationFrame(animatePulse);
    });

    map.on("error", (event) => {
      console.warn("MapLibre error:", event?.error || event);
    });

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      map.remove();
      mapRef.current = null;
    };
  }, [loading, districts, onDistrictSelect]);

  // Toggle district risk zones.
  useEffect(() => {
    const map = mapRef.current;

    if (!map || !map.getLayer("risk-circles")) return;

    map.setLayoutProperty(
      "risk-circles",
      "visibility",
      showZones ? "visible" : "none"
    );

    map.setLayoutProperty(
      "district-labels",
      "visibility",
      showZones ? "visible" : "none"
    );
  }, [showZones]);

  // Toggle hazard pulse.
  useEffect(() => {
    const map = mapRef.current;

    if (!map || !map.getLayer("hazard-pulse")) return;

    map.setPaintProperty(
      "hazard-pulse",
      "circle-opacity",
      showPulse ? 0.12 : 0
    );
  }, [showPulse]);

  const stats = {
    critical: districts.filter((d) => d.score >= 75).length,
    high: districts.filter((d) => d.score >= 60 && d.score < 75).length,
    moderate: districts.filter((d) => d.score >= 40 && d.score < 60).length,
    low: districts.filter((d) => d.score < 40).length,
  };

  return (
    <section className="safeBhoomiMapPage">
      <div className="safeBhoomiMapHeader">
        <div>
          <div className="eyebrow">SAFEBHOOMI • TERRAIN INTELLIGENCE</div>
          <h1>Uttarakhand 3D Hazard Map</h1>
          <p>
            Explore terrain, district risk zones and hazard intelligence
            across Uttarakhand.
          </p>
        </div>

        <div className="mapLiveBadge">
          <span className="liveDot" />
          LIVE MONITORING
        </div>
      </div>

      <div className="safeBhoomiMapToolbar">
        <button
          type="button"
          className={showZones ? "mapTool active" : "mapTool"}
          onClick={() => setShowZones((value) => !value)}
        >
          {showZones ? "Hide Risk Zones" : "Show Risk Zones"}
        </button>

        <button
          type="button"
          className={showPulse ? "mapTool active" : "mapTool"}
          onClick={() => setShowPulse((value) => !value)}
        >
          {showPulse ? "Hazard Pulse On" : "Hazard Pulse Off"}
        </button>

        <button
          type="button"
          className="mapTool"
          onClick={() => {
            const map = mapRef.current;

            if (!map) return;

            map.flyTo({
              center: CENTER,
              zoom: 7.1,
              pitch: 58,
              bearing: 22,
              duration: 1200,
            });
          }}
        >
          Reset Terrain
        </button>
      </div>

      <div className="safeBhoomiMapStats">
        <div className="mapStat critical">
          <strong>{stats.critical}</strong>
          <span>Critical</span>
        </div>

        <div className="mapStat high">
          <strong>{stats.high}</strong>
          <span>High</span>
        </div>

        <div className="mapStat moderate">
          <strong>{stats.moderate}</strong>
          <span>Moderate</span>
        </div>

        <div className="mapStat low">
          <strong>{stats.low}</strong>
          <span>Low</span>
        </div>
      </div>

      {error && (
        <div className="mapDataNotice">
          {error}
        </div>
      )}

      <div className="safeBhoomiMapShell">
        {loading && (
          <div className="mapLoading">
            <div className="mapLoadingSpinner" />
            <strong>Loading terrain intelligence…</strong>
            <span>Preparing Uttarakhand hazard data</span>
          </div>
        )}

        <div
          ref={containerRef}
          className="safeBhoomiMapCanvas"
          aria-label="SafeBhoomi 3D Uttarakhand hazard map"
        />

        {selected && (
          <aside className="mapIntelPanel">
            <div className="mapIntelEyebrow">SELECTED DISTRICT</div>

            <h2>{selected.district}</h2>

            <div
              className="mapRiskBadge"
              style={{
                color: riskColor(selected.score),
                borderColor: riskColor(selected.score),
              }}
            >
              {riskName(selected.score)} · {selected.score}/100
            </div>

            <div className="mapIntelGrid">
              <div>
                <span>Rainfall</span>
                <strong>{selected.rainfall} mm</strong>
              </div>

              <div>
                <span>Humidity</span>
                <strong>{selected.humidity}%</strong>
              </div>

              <div>
                <span>Soil</span>
                <strong>{selected.soil}%</strong>
              </div>

              <div>
                <span>Slope</span>
                <strong>{selected.slope}°</strong>
              </div>

              <div>
                <span>Landslides</span>
                <strong>{selected.landslides}</strong>
              </div>

              <div>
                <span>Road Blockages</span>
                <strong>{selected.roads}</strong>
              </div>
            </div>
          </aside>
        )}
      </div>

      <div className="safeBhoomiMapLegend">
        <span>
          <i style={{ background: "#dc2626" }} />
          Critical
        </span>

        <span>
          <i style={{ background: "#ea580c" }} />
          High
        </span>

        <span>
          <i style={{ background: "#eab308" }} />
          Moderate
        </span>

        <span>
          <i style={{ background: "#16a34a" }} />
          Low
        </span>

        <span className="terrainHint">
          🏔 Drag to rotate • Scroll to zoom • Terrain control for 3D elevation
        </span>
      </div>
    </section>
  );
}
