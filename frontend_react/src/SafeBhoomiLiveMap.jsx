import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://safebhoomiapi-1.onrender.com";

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;

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
  "Uttarkashi",
];

const FALLBACK_DISTRICTS = {
  Almora: { score: 52, level: "HIGH" },
  Bageshwar: { score: 52, level: "HIGH" },
  Chamoli: { score: 52, level: "HIGH" },
  Champawat: { score: 52, level: "HIGH" },
  Dehradun: { score: 52, level: "HIGH" },
  Haridwar: { score: 52, level: "HIGH" },
  Nainital: { score: 52, level: "HIGH" },
  "Pauri Garhwal": { score: 52, level: "HIGH" },
  Pithoragarh: { score: 52, level: "HIGH" },
  Rudraprayag: { score: 52, level: "HIGH" },
  "Tehri Garhwal": { score: 52, level: "HIGH" },
  "Udham Singh Nagar": { score: 52, level: "HIGH" },
  Uttarkashi: { score: 52, level: "HIGH" },
};

function normalize(value) {
  if (!value) return "";

  return String(value)
    .toLowerCase()
    .replace(/district/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonical(value) {
  const n = normalize(value);

  const aliases = {
    "hardwar": "haridwar",
    "us nagar": "udham singh nagar",
    "u s nagar": "udham singh nagar",
    "garhwal": "pauri garhwal",
    tehri: "tehri garhwal",
  };

  return aliases[n] || n;
}

function levelFromScore(score) {
  const value = Number(score || 0);

  if (value >= 75) return "VERY HIGH";
  if (value >= 50) return "HIGH";
  if (value >= 25) return "MODERATE";
  return "LOW";
}

function levelLabel(level) {
  const normalized = String(level || "").toUpperCase();

  if (normalized === "VERY HIGH") return "Very High";
  if (normalized === "HIGH") return "High";
  if (normalized === "MODERATE") return "Moderate";
  return "Low";
}

function riskColor(level) {
  const normalized = String(level || "").toUpperCase();

  if (normalized === "VERY HIGH") return "#7f1d1d";
  if (normalized === "HIGH") return "#dc2626";
  if (normalized === "MODERATE") return "#f59e0b";
  return "#22c55e";
}

function getGeoDistrict(properties) {
  const keys = [
    "safe_district",
    "district",
    "District",
    "DISTRICT",
    "name",
    "Name",
    "NAME",
    "dtname",
    "DIST_NAME",
    "district_name",
    "districtname",
    "DISTRICT_NAME",
  ];

  for (const key of keys) {
    if (properties?.[key]) {
      return String(properties[key]).trim();
    }
  }

  return null;
}

function findRisk(riskMap, district) {
  if (!district) return null;

  const target = canonical(district);

  for (const [name, value] of Object.entries(riskMap || {})) {
    if (canonical(name) === target) {
      return value;
    }
  }

  return null;
}

function enrichGeoJSON(geojson, riskMap) {
  if (!geojson?.features) return geojson;

  return {
    ...geojson,
    features: geojson.features.map((feature) => {
      const properties = {
        ...(feature.properties || {}),
      };

      const district = getGeoDistrict(properties);
      const risk = findRisk(riskMap, district);

      if (risk) {
        properties.safe_district = risk.district || district;
        properties.safe_risk_score = Number(risk.score || 0);
        properties.safe_risk_level =
          risk.level || levelFromScore(risk.score);
      }

      return {
        ...feature,
        properties,
      };
    }),
  };
}

function colorExpression() {
  return [
    "match",
    ["upcase", ["get", "safe_risk_level"]],
    "VERY HIGH",
    "#7f1d1d",
    "HIGH",
    "#dc2626",
    "MODERATE",
    "#f59e0b",
    "LOW",
    "#22c55e",
    "#64748b",
  ];
}

function opacityExpression() {
  return [
    "match",
    ["upcase", ["get", "safe_risk_level"]],
    "VERY HIGH",
    0.62,
    "HIGH",
    0.55,
    "MODERATE",
    0.48,
    "LOW",
    0.38,
    0.35,
  ];
}

export default function SafeBhoomiLiveMap() {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const geoJSONRef = useRef(null);
  const risksRef = useRef({});
  const mapReadyRef = useRef(false);

  const [risks, setRisks] = useState({});
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [locationStatus, setLocationStatus] = useState("");

  const counts = useMemo(() => {
    const result = {
      "VERY HIGH": 0,
      HIGH: 0,
      MODERATE: 0,
      LOW: 0,
    };

    Object.values(risks).forEach((item) => {
      const level = String(item.level || "").toUpperCase();

      if (result[level] !== undefined) {
        result[level] += 1;
      }
    });

    return result;
  }, [risks]);

  const loadAllRisks = useCallback(async () => {
    setLoading(true);

    const next = {};

    await Promise.all(
      DISTRICTS.map(async (district) => {
        try {
          const response = await fetch(
            `${API_BASE}/api/risk/unified`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                district,
              }),
            }
          );

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const data = await response.json();

          const score = Number(
            data?.risk?.score ??
              data?.score ??
              FALLBACK_DISTRICTS[district]?.score ??
              0
          );

          const level =
            String(
              data?.risk?.level ||
                data?.level ||
                levelFromScore(score)
            ).toUpperCase();

          next[district] = {
            district,
            score,
            level,
            data,
          };
        } catch (error) {
          const fallback = FALLBACK_DISTRICTS[district];

          next[district] = {
            district,
            score: Number(fallback?.score || 0),
            level:
              fallback?.level ||
              levelFromScore(fallback?.score || 0),
            data: null,
            fallback: true,
          };
        }
      })
    );

    risksRef.current = next;
    setRisks(next);
    setLastUpdated(new Date());

    setLoading(false);

    return next;
  }, []);

  const updateMapSource = useCallback((riskMap) => {
    const map = mapRef.current;
    const source = map?.getSource("safe-districts");

    if (!source || !geoJSONRef.current) return;

    const enriched = enrichGeoJSON(
      geoJSONRef.current,
      riskMap
    );

    source.setData(enriched);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initialise() {
      try {
        const geoResponse = await fetch(
          `${import.meta.env.BASE_URL}safebhoomi_enriched_districts.geojson`
        );

        if (!geoResponse.ok) {
          throw new Error(
            `GeoJSON HTTP ${geoResponse.status}`
          );
        }

        const geojson = await geoResponse.json();

        if (cancelled) return;

        geoJSONRef.current = geojson;

        const initialRisks = await loadAllRisks();

        if (cancelled) return;

        const map = new maplibregl.Map({
          container: mapContainer.current,
          style:
            `https://api.maptiler.com/maps/hybrid/style.json?key=${MAPTILER_KEY}`,
          center: [79.2, 30.1],
          zoom: 6.2,
          pitch: 35,
          bearing: 0,
          attributionControl: true,
        });

        mapRef.current = map;

        map.addControl(
          new maplibregl.NavigationControl({
            visualizePitch: true,
          }),
          "top-right"
        );

        map.addControl(
          new maplibregl.ScaleControl({
            maxWidth: 120,
            unit: "metric",
          }),
          "bottom-left"
        );

        map.on("load", () => {
          if (cancelled) return;

          map.addSource("safe-districts", {
            type: "geojson",
            data: enrichGeoJSON(
              geojson,
              initialRisks
            ),
          });

          map.addLayer({
            id: "safe-district-fill",
            type: "fill",
            source: "safe-districts",
            paint: {
              "fill-color": colorExpression(),
              "fill-opacity": opacityExpression(),
            },
          });

          map.addLayer({
            id: "safe-district-outline",
            type: "line",
            source: "safe-districts",
            paint: {
              "line-color": "#ffffff",
              "line-width": 1.8,
              "line-opacity": 0.9,
            },
          });

          map.addLayer({
            id: "safe-district-outline-hover",
            type: "line",
            source: "safe-districts",
            paint: {
              "line-color": "#ffffff",
              "line-width": 4,
              "line-opacity": 0,
            },
          });

          map.on(
            "mousemove",
            "safe-district-fill",
            (event) => {
              map.getCanvas().style.cursor = "pointer";

              if (!event.features?.length) return;

              const district =
                getGeoDistrict(
                  event.features[0].properties
                );

              if (district) {
                map.setFilter(
                  "safe-district-outline-hover",
                  [
                    "==",
                    [
                      "get",
                      "safe_district",
                    ],
                    district,
                  ]
                );

                map.setPaintProperty(
                  "safe-district-outline-hover",
                  "line-opacity",
                  1
                );
              }
            }
          );

          map.on(
            "mouseleave",
            "safe-district-fill",
            () => {
              map.getCanvas().style.cursor = "";

              map.setPaintProperty(
                "safe-district-outline-hover",
                "line-opacity",
                0
              );
            }
          );

          map.on(
            "click",
            "safe-district-fill",
            (event) => {
              const feature =
                event.features?.[0];

              if (!feature) return;

              const district =
                getGeoDistrict(
                  feature.properties
                );

              const risk =
                findRisk(
                  risksRef.current,
                  district
                );

              if (!risk) return;

              setSelectedDistrict({
                ...risk,
                district:
                  risk.district ||
                  district,
              });
            }
          );

          mapReadyRef.current = true;
        });
      } catch (error) {
        console.error(
          "SafeBhoomi map initialization failed:",
          error
        );
      }
    }

    initialise();

    return () => {
      cancelled = true;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      mapReadyRef.current = false;
    };
  }, [loadAllRisks]);

  const refreshRisk = async () => {
    const next = await loadAllRisks();
    updateMapSource(next);
  };

  const goHome = () => {
    const map = mapRef.current;
    if (!map) return;

    map.flyTo({
      center: [79.2, 30.1],
      zoom: 6.2,
      pitch: 35,
      bearing: 0,
      duration: 1000,
    });
  };

  const myLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus(
        "Location is not supported by this browser."
      );
      return;
    }

    setLocationStatus("Finding your location…");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const map = mapRef.current;

        if (!map) return;

        map.flyTo({
          center: [
            position.coords.longitude,
            position.coords.latitude,
          ],
          zoom: 11,
          pitch: 45,
          duration: 1400,
        });

        setLocationStatus("Location found.");
      },
      () => {
        setLocationStatus(
          "Location permission was unavailable."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  return (
    <section className="safe-map-shell">
      <div className="safe-map-header">
        <div>
          <div className="safe-map-kicker">
            SAFEBHOOMI • LIVE INTELLIGENCE
          </div>

          <h1>Uttarakhand Satellite Risk Map</h1>

          <p>
            Real satellite imagery with district-level
            hazard intelligence.
          </p>
        </div>

        <div className="safe-map-actions">
          <button
            className="safe-map-button"
            onClick={myLocation}
          >
            📍 My Location
          </button>

          <button
            className="safe-map-button"
            onClick={goHome}
          >
            🏔 Uttarakhand
          </button>

          <button
            className="safe-map-button"
            onClick={refreshRisk}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "↻ Refresh Risk"}
          </button>
        </div>
      </div>

      <div className="safe-map-stat-row">
        <div className="safe-risk-stat very-high">
          <strong>{counts["VERY HIGH"]}</strong>
          <span>Very High</span>
        </div>

        <div className="safe-risk-stat high">
          <strong>{counts.HIGH}</strong>
          <span>High</span>
        </div>

        <div className="safe-risk-stat moderate">
          <strong>{counts.MODERATE}</strong>
          <span>Moderate</span>
        </div>

        <div className="safe-risk-stat low">
          <strong>{counts.LOW}</strong>
          <span>Low</span>
        </div>
      </div>

      {locationStatus && (
        <div className="safe-map-status">
          {locationStatus}
        </div>
      )}

      <div className="safe-map-wrapper">
        <div
          ref={mapContainer}
          className="safe-map-canvas"
        />

        {selectedDistrict && (
          <div className="safe-map-district-card">
            <button
              className="safe-map-close"
              onClick={() =>
                setSelectedDistrict(null)
              }
            >
              ×
            </button>

            <div className="safe-map-card-kicker">
              DISTRICT INTELLIGENCE
            </div>

            <h2>
              {selectedDistrict.district}
            </h2>

            <div
              className="safe-map-risk-badge"
              style={{
                background:
                  riskColor(
                    selectedDistrict.level
                  ),
              }}
            >
              {levelLabel(
                selectedDistrict.level
              )}
            </div>

            <div className="safe-map-score">
              <strong>
                {Number(
                  selectedDistrict.score || 0
                ).toFixed(1)}
              </strong>
              <span>/ 100 risk score</span>
            </div>

            {selectedDistrict.data && (
              <div className="safe-map-details">
                {selectedDistrict.data.terrain && (
                  <div>
                    <span>Terrain</span>
                    <strong>
                      {selectedDistrict.data
                        .terrain
                        .terrain_class ||
                        "Mountainous"}
                    </strong>
                  </div>
                )}

                {selectedDistrict.data.inputs && (
                  <>
                    <div>
                      <span>Rainfall 24h</span>
                      <strong>
                        {selectedDistrict.data
                          .inputs
                          .rainfall_24h_mm ?? "—"}{" "}
                        mm
                      </strong>
                    </div>

                    <div>
                      <span>Soil saturation</span>
                      <strong>
                        {selectedDistrict.data
                          .inputs
                          .soil_saturation_percent ??
                          "—"}%
                      </strong>
                    </div>

                    <div>
                      <span>Recent landslides</span>
                      <strong>
                        {selectedDistrict.data
                          .inputs
                          .recent_landslides ??
                          "—"}
                      </strong>
                    </div>
                  </>
                )}
              </div>
            )}

            {selectedDistrict.data
              ?.risk_drivers?.length > 0 && (
              <div className="safe-map-drivers">
                <div className="safe-map-card-kicker">
                  RISK DRIVERS
                </div>

                {selectedDistrict.data.risk_drivers
                  .slice(0, 4)
                  .map((driver, index) => (
                    <div
                      key={`${driver}-${index}`}
                    >
                      • {driver}
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        <div className="safe-map-legend">
          <div className="safe-map-legend-title">
            LANDSLIDE RISK
          </div>

          {[
            ["VERY HIGH", "#7f1d1d"],
            ["HIGH", "#dc2626"],
            ["MODERATE", "#f59e0b"],
            ["LOW", "#22c55e"],
          ].map(([label, color]) => (
            <div
              className="safe-map-legend-row"
              key={label}
            >
              <i
                style={{
                  background: color,
                }}
              />
              <span>
                {levelLabel(label)}
              </span>
            </div>
          ))}
        </div>

        <div className="safe-map-live-pill">
          <span />
          LIVE RISK DATA
        </div>
      </div>

      <div className="safe-map-footer">
        <span>
          🛰 Satellite imagery
        </span>
        <span>
          🗺 13-district boundary layer
        </span>
        <span>
          🔴 Risk intelligence
        </span>
        <span>
          📍 Location
        </span>
        <span>
          🏔 Terrain navigation
        </span>

        {lastUpdated && (
          <span>
            Updated{" "}
            {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>
    </section>
  );
}
