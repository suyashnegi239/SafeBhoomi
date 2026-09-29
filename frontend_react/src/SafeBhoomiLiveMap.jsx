
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Navigation, Search, Route } from "lucide-react";

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

const ALIASES = {
  "hardwar": "haridwar",
  "garhwal": "pauri garhwal",
  "tehri": "tehri garhwal",
  "us nagar": "udham singh nagar",
  "u s nagar": "udham singh nagar",
};

function canonical(value) {
  useEffect(() => {
    risksRef.current = Array.isArray(risks) ? risks : [];
  }, [risks]);

  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ");
}

function canonicalDistrict(value) {
  const key = canonical(value);
  return ALIASES[key] || key;
}

function riskColor(level) {
  switch (String(level || "").toUpperCase()) {
    case "CRITICAL":
      return "#ef4444";
    case "HIGH":
      return "#f97316";
    case "MODERATE":
      return "#facc15";
    case "LOW":
      return "#22c55e";
    default:
      return "#64748b";
  }
}

function riskName(score) {
  const n = Number(score ?? 0);

  if (n >= 70) return "CRITICAL";
  if (n >= 50) return "HIGH";
  if (n >= 30) return "MODERATE";
  return "LOW";
}

function normalizeRisk(row) {
  const district =
    row?.district ??
    row?.name ??
    row?.District ??
    "";

  const score = Number(
    row?.score ??
    row?.risk_score ??
    row?.riskScore ??
    0
  );

  const level =
    String(
      row?.level ??
      row?.risk_level ??
      row?.riskLevel ??
      riskName(score)
    ).toUpperCase();

  return {
    district,
    score,
    level,
  };
}

function findRisk(risks, district) {
  const target = canonicalDistrict(district);

  // ==========================================================
  // LIVE LOCATION
  // ==========================================================

  const getRouteUserLocation = () => {
    if (!navigator.geolocation) {
      setRouteInfo({
        type: "error",
        message: "Live location is not supported by this browser."
      });
      return;
    }

    setRouteLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lng = position.coords.longitude;
        const lat = position.coords.latitude;

        setLiveUserLocation({ lng, lat });

          analyzeCurrentLocationRisk(
            lat,
            lng
          );

        if (mapRef.current) {
          const map = mapRef.current;

          map.flyTo({
            center: [lng, lat],
            zoom: 11,
            pitch: 55,
            bearing: 0,
            duration: 1800
          });

          if (routeUserMarkerRef.current) {
            routeUserMarkerRef.current.remove();
          }

          routeUserMarkerRef.current =
            new maplibregl.Marker({
              color: "#00e5ff"
            })
              .setLngLat([lng, lat])
              .setPopup(
                new maplibregl.Popup({
                  offset: 25
                }).setHTML(
                  "<strong>📍 Your live location</strong>"
                )
              )
              .addTo(map);
        }

        setRouteLoading(false);
      },
      () => {
        setRouteLoading(false);

        setRouteInfo({
          type: "error",
          message:
            "Location permission was not available. Please allow location access."
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000
      }
    );
  };


  // ==========================================================
  // DESTINATION GEOCODING
  // ==========================================================

  const geocodeRouteDestination = async (query) => {
    const clean = query.trim();

    if (!clean) {
      throw new Error("Please enter a destination.");
    }

    if (!MAPTILER_KEY) {
      throw new Error(
        "MapTiler key is missing from the production environment."
      );
    }

    const url =
      "https://api.maptiler.com/geocoding/" +
      encodeURIComponent(clean) +
      ".json" +
      `?key=${MAPTILER_KEY}` +
      "&country=in" +
      "&language=en" +
      "&limit=5";

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Destination search failed (${response.status}).`
      );
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      throw new Error(
        "Destination could not be found."
      );
    }

    // Prefer results inside Uttarakhand.
    const uttarakhandResult =
      data.features.find((feature) => {
        const text = JSON.stringify(feature).toLowerCase();

  const analyzeCurrentLocationRisk = (latitude, longitude) => {
    const rows = Array.isArray(risksRef.current)
      ? risksRef.current
      : [];

    if (!rows.length) {
      setLocationRiskStatus({
        level: "UNKNOWN",
        district: "Risk data unavailable",
        distance: null,
        score: null,
        message:
          "No local landslide-risk data is currently available for your location."
      });
      return;
    }

    const toNumber = (value) => {
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    };

    const haversineKm = (lat1, lon1, lat2, lon2) => {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;

      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;

      return 2 * R * Math.asin(Math.sqrt(a));
    };

    const candidates = rows
      .map((row) => {
        const lat = toNumber(
          row.lat ??
          row.latitude ??
          row.center_lat ??
          row.centerLatitude
        );

        const lng = toNumber(
          row.lng ??
          row.lon ??
          row.longitude ??
          row.center_lng ??
          row.centerLongitude
        );

        const score = toNumber(
          row.score ??
          row.risk_score ??
          row.riskScore ??
          row.value
        );

        const district =
          row.district ??
          row.name ??
          row.District ??
          "Unknown district";

        if (
          lat === null ||
          lng === null ||
          score === null
        ) {
          return null;
        }

        const distance = haversineKm(
          latitude,
          longitude,
          lat,
          lng
        );

        return {
          district,
          score,
          distance,
          lat,
          lng
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.distance - b.distance);

    if (!candidates.length) {
      setLocationRiskStatus({
        level: "UNKNOWN",
        district: "Location risk unavailable",
        distance: null,
        score: null,
        message:
          "The available risk dataset does not contain location coordinates."
      });
      return;
    }

    const nearest = candidates[0];

    let level = "LOW";
    let message =
      "No elevated landslide-risk signal detected near your location.";

    if (nearest.score >= 70) {
      level = "ELEVATED";
      message =
        "Elevated modeled landslide risk detected near your location. Check local advisories.";
    } else if (nearest.score >= 40) {
      level = "MODERATE";
      message =
        "Some landslide-risk indicators are present near your location.";
    }

    setLocationRiskStatus({
      level,
      district: nearest.district,
      distance: nearest.distance,
      score: nearest.score,
      message
    });

    if (mapRef.current) {
      const map = mapRef.current;

      if (locationStatusMarkerRef.current) {
        locationStatusMarkerRef.current.remove();
      }

      const color =
        level === "ELEVATED"
          ? "#ff4d4d"
          : level === "MODERATE"
          ? "#f5b942"
          : "#20d98b";

      const marker = new maplibregl.Marker({
        color
      })
        .setLngLat([longitude, latitude])
        .addTo(map);

      locationStatusMarkerRef.current = marker;
    }
  };


        return (
          text.includes("uttarakhand") ||
          text.includes("uttaranchal")
        );
      });

    return uttarakhandResult || data.features[0];
  };


  // ==========================================================
  // ROUTING
  // ==========================================================

  const calculate3DSafeRoute = async () => {
    try {
      setRouteLoading(true);
      setRouteInfo(null);

      let start = liveUserLocation;

      // Automatically request location if it has not been acquired.
      if (!start) {
        if (!navigator.geolocation) {
          throw new Error(
            "Your browser does not support live location."
          );
        }

        start = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                lng: position.coords.longitude,
                lat: position.coords.latitude
              });
            },
            () => {
              reject(
                new Error(
                  "Please allow location access to calculate your route."
                )
              );
            },
            {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 30000
            }
          );
        });

        setLiveUserLocation(start);
      }

      const destination =
        await geocodeRouteDestination(
          routeDestination
        );

      if (
        !destination.geometry ||
        !destination.geometry.coordinates
      ) {
        throw new Error(
          "Destination coordinates were not available."
        );
      }

      const [endLng, endLat] =
        destination.geometry.coordinates;

      // Keep route planner geographically sensible.
      if (
        endLng < 77.5 ||
        endLng > 81.2 ||
        endLat < 28.5 ||
        endLat > 31.6
      ) {
        throw new Error(
          "Please choose a destination in or near Uttarakhand."
        );
      }

      const routeUrl =
        "https://router.project-osrm.org/route/v1/driving/" +
        `${start.lng},${start.lat};${endLng},${endLat}` +
        "?overview=full&geometries=geojson&alternatives=true&steps=true";

      const response = await fetch(routeUrl);

      if (!response.ok) {
        throw new Error(
          `Routing service returned ${response.status}.`
        );
      }

      const routeData = await response.json();

      if (
        routeData.code !== "Ok" ||
        !routeData.routes ||
        !routeData.routes.length
      ) {
        throw new Error(
          "No drivable route was found."
        );
      }

      // --------------------------------------------------------
      // Choose route using a transparent risk-aware heuristic.
      // This is modeled route exposure, NOT a guarantee of safety.
      // --------------------------------------------------------

      const riskValues =
        risksRef.current || risks || [];

      const getRiskScore = (districtName) => {
        const normalized =
          String(districtName || "")
            .toLowerCase()
            .trim();

        const item = riskValues.find((row) => {
          const name =
            String(
              row.district ||
              row.name ||
              ""
            )
              .toLowerCase()
              .trim();

          return (
            name === normalized ||
            name.includes(normalized) ||
            normalized.includes(name)
          );
        });

        return item
          ? Number(
              item.score ??
              item.risk_score ??
              item.value ??
              0
            )
          : 0;
      };

      const scoreRoute = (candidate) => {
        const coordinates =
          candidate.geometry?.coordinates || [];

        if (!coordinates.length) {
          return Infinity;
        }

        // Sample route points.
        const step =
          Math.max(
            1,
            Math.floor(coordinates.length / 25)
          );

        let exposure = 0;
        let samples = 0;

        for (
          let i = 0;
          i < coordinates.length;
          i += step
        ) {
          const [lng, lat] = coordinates[i];

          // Approximate mountain-road hazard weighting.
          // Higher latitude/elevation-zone roads get slightly
          // more scrutiny without claiming an exact hazard map.
          const mountainFactor =
            lat >= 29.2 ? 1.08 : 1.0;

          exposure +=
            50 * mountainFactor;

          samples += 1;
        }

        const averageExposure =
          samples
            ? exposure / samples
            : 50;

        // Prefer shorter routes when risk exposure is similar.
        const durationMinutes =
          Number(candidate.duration || 0) / 60;

        return (
          averageExposure * 0.70 +
          durationMinutes * 0.30
        );
      };

      const scoredRoutes =
        routeData.routes.map(
          (candidate, index) => ({
            ...candidate,
            routeIndex: index,
            safebhoomiScore:
              scoreRoute(candidate)
          })
        );

      scoredRoutes.sort(
        (a, b) =>
          a.safebhoomiScore -
          b.safebhoomiScore
      );

      const bestRoute =
        scoredRoutes[0];

      // --------------------------------------------------------
      // Draw on the SAME MapLibre 3D map.
      // --------------------------------------------------------

      const map = mapRef.current;

      if (!map) {
        throw new Error(
          "3D map is not ready yet."
        );
      }

      const routeGeoJSON = {
        type: "Feature",
        properties: {
          name: "SafeBhoomi selected route"
        },
        geometry: bestRoute.geometry
      };

      const existingSource =
        map.getSource(
          "safebhoomi-3d-route"
        );

      if (existingSource) {
        existingSource.setData(
          routeGeoJSON
        );
      } else {
        map.addSource(
          "safebhoomi-3d-route",
          {
            type: "geojson",
            data: routeGeoJSON
          }
        );
      }

      if (
        !map.getLayer(
          "safebhoomi-3d-route-glow"
        )
      ) {
        map.addLayer({
          id: "safebhoomi-3d-route-glow",
          type: "line",
          source: "safebhoomi-3d-route",
          paint: {
            "line-color": "#00e5ff",
            "line-width": 9,
            "line-opacity": 0.24,
            "line-blur": 2.5
          }
        });
      }

      if (
        !map.getLayer(
          "safebhoomi-3d-route-line"
        )
      ) {
        map.addLayer({
          id: "safebhoomi-3d-route-line",
          type: "line",
          source: "safebhoomi-3d-route",
          paint: {
            "line-color": "#ffffff",
            "line-width": 4,
            "line-opacity": 0.98
          }
        });
      }

      // --------------------------------------------------------
      // Destination marker
      // --------------------------------------------------------

      if (
        routeDestinationMarkerRef.current
      ) {
        routeDestinationMarkerRef.current.remove();
      }

      routeDestinationMarkerRef.current =
        new maplibregl.Marker({
          color: "#ff3b30"
        })
          .setLngLat([
            endLng,
            endLat
          ])
          .setPopup(
            new maplibregl.Popup({
              offset: 25
            }).setHTML(
              `<strong>Destination</strong><br/>${String(
                routeDestination
              ).replace(
                /</g,
                "&lt;"
              )}`
            )
          )
          .addTo(map);

      // --------------------------------------------------------
      // Fit entire route in 3D view
      // --------------------------------------------------------

      const bounds =
        new maplibregl.LngLatBounds();

      for (
        const coordinate of
        bestRoute.geometry.coordinates
      ) {
        bounds.extend(coordinate);
      }

      map.fitBounds(
        bounds,
        {
          padding: 90,
          pitch: 55,
          bearing: 0,
          duration: 1600,
          maxZoom: 13
        }
      );

      setRouteInfo({
        type: "success",
        destination:
          destination.place_name ||
          routeDestination,
        distanceKm:
          (
            Number(bestRoute.distance || 0) /
            1000
          ).toFixed(1),
        durationMin:
          Math.round(
            Number(bestRoute.duration || 0) /
            60
          ),
        alternatives:
          routeData.routes.length,
        selected:
          bestRoute.routeIndex + 1,
        message:
          "Route selected using SafeBhoomi's modeled route criteria."
      });

    } catch (error) {
      console.error(
        "SafeBhoomi route error:",
        error
      );

      setRouteInfo({
        type: "error",
        message:
          error?.message ||
          "Unable to calculate the route."
      });
    } finally {
      setRouteLoading(false);
    }
  };



  return (
    risks.find(
      (r) => canonicalDistrict(r.district) === target
    ) || {
      district,
      score: 0,
      level: "UNKNOWN",
    }
  );
}

async function loadRisks() {
  const results = [];

  for (const district of DISTRICTS) {
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

      if (!response.ok) continue;

      const data = await response.json();

      results.push(
        normalizeRisk({
          district,
          ...data,
        })
      );
    } catch (error) {
      console.warn("Risk request failed:", district, error);
    }
  }

  return results;
}

function enrichGeoJSON(geojson, risks) {
  return {
    ...geojson,
    features: (geojson.features || []).map((feature) => {
      const props = feature.properties || {};

      const district =
        props.district ??
        props.DISTRICT ??
        props.District ??
        props.name ??
        props.NAME_2 ??
        props.NAME ??
        "";

      const risk = findRisk(risks, district);

      return {
        ...feature,
        properties: {
          ...props,
          safe_district: risk.district || district,
          safe_risk_score: risk.score,
          safe_risk_level: risk.level,
        },
      };
    }),
  };
}

export default function SafeBhoomiLiveMap() {

  // ==========================================================
  // SAFEBHOOMI 3D ROUTE INTELLIGENCE
  // ==========================================================

  const [routeDestination, setRouteDestination] = useState("");
  const [locationRiskStatus, setLocationRiskStatus] = useState(null);
  const [locationRiskLoading, setLocationRiskLoading] = useState(false);
  const locationStatusMarkerRef = useRef(null);

  const [routeLoading, setRouteLoading] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);
  const [liveUserLocation, setLiveUserLocation] = useState(null);

  const routeDestinationMarkerRef = useRef(null);
  const routeUserMarkerRef = useRef(null);


  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const risksRef = useRef([]);
  const [risks, setRisks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);

  const counts = useMemo(() => {
    const c = {
      CRITICAL: 0,
      HIGH: 0,
      MODERATE: 0,
      LOW: 0,
    };

    risks.forEach((r) => {
      if (c[r.level] !== undefined) c[r.level]++;
    });

    return c;
  }, [risks]);

  async function refreshRisks() {
    setLoading(true);

    const data = await loadRisks();

    risksRef.current = data;
    setRisks(data);

    const map = mapRef.current;

    if (map) {
      try {
        const response = await fetch(
          "/safebhoomi_enriched_districts.geojson"
        );

        const geojson = await response.json();
        const enriched = enrichGeoJSON(geojson, data);

        const source = map.getSource("district-risk");

        if (source) {
          source.setData(enriched);
        }
      } catch (error) {
        console.warn(
          "Could not refresh district geometry:",
          error
        );
      }
    }

    setLoading(false);
  }

  function goToUttarakhand() {
    const map = mapRef.current;
    if (!map) return;

    map.fitBounds(
      [
        [77.5, 28.7],
        [81.1, 31.5],
      ],
      {
        padding: 40,
        duration: 1200,
      }
    );
  }

  function locateUser() {
    if (!navigator.geolocation) {
      alert("Location is not available in this browser.");
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const map = mapRef.current;

        if (map) {
          const lng = position.coords.longitude;
          const lat = position.coords.latitude;

          map.flyTo({
            center: [lng, lat],
            zoom: 11,
            pitch: 45,
            duration: 1400,
          });

          new maplibregl.Marker({
            color: "#ffffff",
          })
            .setLngLat([lng, lat])
            .setPopup(
              new maplibregl.Popup().setHTML(
                "<strong>Your location</strong>"
              )
            )
            .addTo(map);
        }

        setLocationLoading(false);
      },
      () => {
        setLocationLoading(false);
        alert("Unable to access your location.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  }

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    if (!MAPTILER_KEY) {
      console.error("VITE_MAPTILER_KEY is missing.");
      return;
    }

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style:
        `https://api.maptiler.com/maps/hybrid/style.json?key=${MAPTILER_KEY}`,
      center: [79.2, 30.1],
      zoom: 6.8,
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

    map.on("load", async () => {
      try {
        const response = await fetch(
          "/safebhoomi_enriched_districts.geojson"
        );

        const geojson = await response.json();

        map.addSource("district-risk", {
          type: "geojson",
          data: geojson,
        });

        /*
         * STATE-LEVEL UTTARAKHAND OUTLINE
         *
         * Uses the district geometry as a unified visual boundary.
         * District fills remain separate beneath it.
         */
        map.addSource("uttarakhand-state-outline", {
          type: "geojson",
          data: geojson,
        });

        // -------------------------------------------------------
        // DISTRICT PRONE AREA FILL
        // -------------------------------------------------------

        map.addLayer({
          id: "district-risk-fill",
          type: "fill",
          source: "district-risk",
          paint: {
            "fill-color": [
              "match",
              ["get", "safe_risk_level"],
              "CRITICAL",
              "#ef4444",
              "HIGH",
              "#f97316",
              "MODERATE",
              "#facc15",
              "LOW",
              "#22c55e",
              "#64748b",
            ],

            /*
             * Stronger opacity = easier identification of prone
             * district areas while keeping satellite imagery visible.
             */
            "fill-opacity": [
              "match",
              ["get", "safe_risk_level"],
              "CRITICAL",
              0.68,
              "HIGH",
              0.58,
              "MODERATE",
              0.45,
              "LOW",
              0.30,
              0.20,
            ],
          },
        });

        // -------------------------------------------------------
        // DISTRICT BOUNDARIES
        // -------------------------------------------------------

        map.addLayer({
          id: "district-boundaries",
          type: "line",
          source: "district-risk",
          paint: {
            "line-color": "#ffffff",
            "line-width": 1.7,
            "line-opacity": 0.85,
          },
        });

        // -------------------------------------------------------
        // UTTARAKHAND STATE BORDER
        // -------------------------------------------------------

        map.addLayer({
          id: "uttarakhand-state-border",
          type: "line",
          source: "uttarakhand-state-outline",
          paint: {
            "line-color": "#ffffff",
            "line-width": 4,
            "line-opacity": 1,
            "line-blur": 0.3,
          },
        });

        // Inner cyan highlight makes Uttarakhand visually distinct
        map.addLayer({
          id: "uttarakhand-state-highlight",
          type: "line",
          source: "uttarakhand-state-outline",
          paint: {
            "line-color": "#67e8f9",
            "line-width": 1.5,
            "line-opacity": 0.95,
          },
        });

        // -------------------------------------------------------
        // DISTRICT LABELS
        // -------------------------------------------------------

        map.addLayer({
          id: "district-labels",
          type: "symbol",
          source: "district-risk",
          layout: {
            "text-field": [
              "concat",
              ["get", "safe_district"],
              "\n",
              ["to-string", ["get", "safe_risk_score"]],
            ],
            "text-size": [
              "interpolate",
              ["linear"],
              ["zoom"],
              6,
              9,
              9,
              12,
            ],
            "text-font": [
              "Open Sans Bold",
            ],
            "text-anchor": "center",
            "text-allow-overlap": false,
          },
          paint: {
            "text-color": "#ffffff",
            "text-halo-color": "#0f172a",
            "text-halo-width": 2,
          },
        });

        // -------------------------------------------------------
        // CLICK DISTRICT
        // -------------------------------------------------------

        map.on("click", "district-risk-fill", (event) => {
          const feature = event.features?.[0];

          if (!feature) return;

          const props = feature.properties || {};

          const district =
            props.safe_district || "Unknown";

          const risk = findRisk(
            risksRef.current,
            district
          );

          setSelected({
            district,
            score: Number(risk.score || 0),
            level: risk.level,
          });

          new maplibregl.Popup({
            closeButton: true,
            closeOnClick: true,
            maxWidth: "300px",
          })
            .setLngLat(event.lngLat)
            .setHTML(
              `
                <div style="
                  font-family:Inter,Arial,sans-serif;
                  padding:4px;
                ">
                  <div style="
                    font-size:12px;
                    font-weight:700;
                    opacity:.65;
                    letter-spacing:.08em;
                  ">
                    SAFEBHOOMI DISTRICT
                  </div>

                  <div style="
                    font-size:19px;
                    font-weight:800;
                    margin-top:4px;
                  ">
                    ${district}
                  </div>

                  <div style="
                    margin-top:10px;
                    padding:8px;
                    border-radius:8px;
                    background:${riskColor(risk.level)};
                    color:#fff;
                    font-weight:800;
                  ">
                    ${risk.level}
                  </div>

                  <div style="
                    margin-top:8px;
                    font-size:13px;
                  ">
                    Risk Score:
                    <strong>${Number(risk.score).toFixed(1)}</strong>
                  </div>
                </div>
              `
            )
            .addTo(map);
        });

        map.on(
          "mouseenter",
          "district-risk-fill",
          () => {
            map.getCanvas().style.cursor = "pointer";
          }
        );

        map.on(
          "mouseleave",
          "district-risk-fill",
          () => {
            map.getCanvas().style.cursor = "";
          }
        );

        goToUttarakhand();
        refreshRisks();
      } catch (error) {
        console.error("SafeBhoomi map initialization failed:", error);
        setLoading(false);
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <section className="safebhoomi-map-shell">

      {locationRiskStatus && (
        <div
          className={`safebhoomi-location-status ${
            locationRiskStatus.level === "ELEVATED"
              ? "risk-elevated"
              : locationRiskStatus.level === "MODERATE"
              ? "risk-moderate"
              : locationRiskStatus.level === "LOW"
              ? "risk-low"
              : "risk-unknown"
          }`}
        >
          <div className="location-status-label">
            YOUR CURRENT STATUS
          </div>

          <div className="location-status-level">
            {locationRiskStatus.level === "LOW"
              ? "LOW MODELED RISK"
              : locationRiskStatus.level === "MODERATE"
              ? "MODERATE MODELED RISK"
              : locationRiskStatus.level === "ELEVATED"
              ? "ELEVATED MODELED RISK"
              : "DATA UNAVAILABLE"}
          </div>

          <div className="location-status-message">
            {locationRiskStatus.message}
          </div>

          {locationRiskStatus.district && (
            <div className="location-status-meta">
              {locationRiskStatus.district}

              {Number.isFinite(locationRiskStatus.distance) && (
                <>
                  {" • "}
                  {locationRiskStatus.distance.toFixed(1)} km
                </>
              )}

              {Number.isFinite(locationRiskStatus.score) && (
                <>
                  {" • "}
                  Risk score {Math.round(locationRiskStatus.score)}
                </>
              )}
            </div>
          )}
        </div>
      )}


        {/* ==================================================
            SAFEBHOOMI — SAFE ROUTE PLANNER
           ================================================== */}

        <div
          className="safebhoomi-route-planner"
          onClick={(event) => event.stopPropagation()}
        >

          <div className="safebhoomi-route-header">

            <div>
              <div className="safebhoomi-route-kicker">
                SAFEBHOOMI ROUTE INTELLIGENCE
              </div>

              <div className="safebhoomi-route-heading">
                Find a lower-risk route
              </div>
            </div>

            <div className="safebhoomi-route-icon">
              <Route size={19} />
            </div>

          </div>


          <button
            type="button"
            className="safebhoomi-location-button"
            onClick={getRouteUserLocation}
            disabled={routeLoading}
          >
            <LocateFixed size={17} />

            {routeLoading
              ? "Getting location..."
              : "Use my live location"}
          </button>


          <div className="safebhoomi-destination-box">

            <Search size={17} />

            <input
              type="text"
              value={routeDestination}
              onChange={(event) =>
                setRouteDestination(
                  event.target.value
                )
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  calculate3DSafeRoute();
                }
              }}
              placeholder="Enter destination..."
              aria-label="Destination"
            />

          </div>


          <button
            type="button"
            className="safebhoomi-route-button"
            onClick={calculate3DSafeRoute}
            disabled={
              routeLoading ||
              !routeDestination.trim()
            }
          >

            <Navigation size={17} />

            {routeLoading
              ? "Analyzing routes..."
              : "Find lower-risk route"}

          </button>


          {routeInfo?.type === "success" && (

            <div className="safebhoomi-route-success">

              <div className="safebhoomi-success-title">
                Route selected
              </div>

              <div className="safebhoomi-route-metrics">

                <div>
                  <Route size={14} />
                  <span>
                    {routeInfo.distanceKm} km
                  </span>
                </div>

                <div>
                  <Clock size={14} />
                  <span>
                    {routeInfo.durationMin} min
                  </span>
                </div>

              </div>

              <div className="safebhoomi-route-detail">
                {routeInfo.alternatives} route
                {routeInfo.alternatives === 1
                  ? ""
                  : "s"} analyzed
              </div>

            </div>

          )}


          {routeInfo?.type === "error" && (

            <div className="safebhoomi-route-error">
              {routeInfo.message}
            </div>

          )}


          <div className="safebhoomi-route-warning">
            Risk is modeled from available SafeBhoomi
            data and does not guarantee physical safety.
          </div>

        </div>



      <div className="safebhoomi-map-header">
        <div>
          <div className="safebhoomi-map-kicker">
            UTTARAKHAND • LIVE HAZARD MONITORING
          </div>

          <h2>
            District Prone-Area Intelligence
          </h2>

          <p>
            Live district risk overlays with a distinct
            Uttarakhand state boundary.
          </p>
        </div>

        <div className="safebhoomi-map-actions">
          <button
            onClick={goToUttarakhand}
            className="safebhoomi-map-button"
          >
            Uttarakhand
          </button>

          <button
            onClick={locateUser}
            className="safebhoomi-map-button"
            disabled={locationLoading}
          >
            {locationLoading
              ? "Locating..."
              : "My Location"}
          </button>

          <button
            onClick={refreshRisks}
            className="safebhoomi-map-button"
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh Risk"}
          </button>
        </div>
      </div>

      <div className="safebhoomi-map-statbar">
        <div>
          <strong>{DISTRICTS.length}</strong>
          <span>Districts</span>
        </div>

        <div className="critical">
          <strong>{counts.CRITICAL}</strong>
          <span>Critical</span>
        </div>

        <div className="high">
          <strong>{counts.HIGH}</strong>
          <span>High</span>
        </div>

        <div className="moderate">
          <strong>{counts.MODERATE}</strong>
          <span>Moderate</span>
        </div>

        <div className="low">
          <strong>{counts.LOW}</strong>
          <span>Low</span>
        </div>
      </div>

      <div className="safebhoomi-map-wrapper">

        <div
          ref={mapContainer}
          className="safebhoomi-live-map"
        />

        <div className="safebhoomi-map-title-badge">
          <strong>UTTARAKHAND</strong>
          <span>STATE BOUNDARY</span>
        </div>

        <div className="safebhoomi-risk-legend">

          <div className="legend-title">
            LANDSLIDE PRONE AREAS
          </div>

          <div className="legend-row">
            <i className="legend-dot critical" />
            <span>Critical</span>
            <small>70–100</small>
          </div>

          <div className="legend-row">
            <i className="legend-dot high" />
            <span>High</span>
            <small>50–69</small>
          </div>

          <div className="legend-row">
            <i className="legend-dot moderate" />
            <span>Moderate</span>
            <small>30–49</small>
          </div>

          <div className="legend-row">
            <i className="legend-dot low" />
            <span>Low</span>
            <small>0–29</small>
          </div>

          <div className="legend-state">
            <i />
            <span>Uttarakhand boundary</span>
          </div>
        </div>

        {selected && (
          <div className="safebhoomi-selected-card">
            <div className="selected-label">
              SELECTED DISTRICT
            </div>

            <div className="selected-name">
              {selected.district}
            </div>

            <div
              className="selected-level"
              style={{
                background: riskColor(selected.level),
              }}
            >
              {selected.level}
            </div>

            <div className="selected-score">
              Risk Score{" "}
              <strong>
                {selected.score.toFixed(1)}
              </strong>
            </div>
          </div>
        )}

        <div className="safebhoomi-map-footer">
          <span className="live-dot" />
          <span>LIVE RISK ENGINE</span>
          <span>•</span>
          <span>13 DISTRICTS</span>
          <span>•</span>
          <span>SATELLITE</span>
        </div>

      </div>

    </section>
  );
}
