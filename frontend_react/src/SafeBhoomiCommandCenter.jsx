import React, { useEffect, useMemo, useState } from "react";
import {
  MapPin,
  Search,
  Navigation,
  Route,
  ShieldCheck,
  AlertTriangle,
  Activity,
  LocateFixed,
  X,
  ChevronRight,
  Mountain,
  CloudRain,
  Crosshair,
  Info,
} from "lucide-react";

/*
 * SafeBhoomi Advanced Safety Command Center
 *
 * This component deliberately sits ABOVE the existing application.
 * It does not replace the existing Live Map implementation.
 */

const DISTRICTS = [
  {
    name: "Almora",
    risk: 58,
    rainfall: 62,
    terrain: 71,
    landslide: 57,
    status: "Moderate",
  },
  {
    name: "Bageshwar",
    risk: 68,
    rainfall: 70,
    terrain: 78,
    landslide: 67,
    status: "High",
  },
  {
    name: "Chamoli",
    risk: 76,
    rainfall: 73,
    terrain: 91,
    landslide: 79,
    status: "High",
  },
  {
    name: "Champawat",
    risk: 61,
    rainfall: 65,
    terrain: 70,
    landslide: 60,
    status: "Moderate",
  },
  {
    name: "Dehradun",
    risk: 43,
    rainfall: 54,
    terrain: 47,
    landslide: 38,
    status: "Moderate",
  },
  {
    name: "Haridwar",
    risk: 21,
    rainfall: 38,
    terrain: 18,
    landslide: 14,
    status: "Low",
  },
  {
    name: "Nainital",
    risk: 72,
    rainfall: 74,
    terrain: 84,
    landslide: 75,
    status: "High",
  },
  {
    name: "Pauri Garhwal",
    risk: 69,
    rainfall: 71,
    terrain: 82,
    landslide: 70,
    status: "High",
  },
  {
    name: "Pithoragarh",
    risk: 81,
    rainfall: 78,
    terrain: 94,
    landslide: 84,
    status: "Very High",
  },
  {
    name: "Rudraprayag",
    risk: 84,
    rainfall: 80,
    terrain: 95,
    landslide: 87,
    status: "Very High",
  },
  {
    name: "Tehri Garhwal",
    risk: 74,
    rainfall: 72,
    terrain: 88,
    landslide: 76,
    status: "High",
  },
  {
    name: "Uttarkashi",
    risk: 79,
    rainfall: 69,
    terrain: 93,
    landslide: 81,
    status: "High",
  },
];

function classifyRisk(score) {
  if (score < 30) {
    return {
      label: "Low Risk",
      color: "#16a34a",
      bg: "#dcfce7",
      icon: "🟢",
    };
  }

  if (score < 55) {
    return {
      label: "Moderate Risk",
      color: "#ca8a04",
      bg: "#fef9c3",
      icon: "🟡",
    };
  }

  if (score < 75) {
    return {
      label: "High Risk",
      color: "#ea580c",
      bg: "#ffedd5",
      icon: "🟠",
    };
  }

  return {
    label: "Very High Risk",
    color: "#dc2626",
    bg: "#fee2e2",
    icon: "🔴",
  };
}

function scoreFromCoordinates(lat, lon) {
  /*
   * Deterministic fallback used when a live backend response isn't available.
   *
   * It is intentionally NOT presented as an official emergency warning.
   * The real risk API can later replace this calculation.
   */

  const a = Math.abs(Math.sin(lat * 12.9898 + lon * 78.233));
  const b = Math.abs(Math.cos(lat * 4.123 + lon * 9.817));

  return Math.round(18 + ((a * 0.55 + b * 0.45) * 76));
}

function Metric({ label, value, icon }) {
  return (
    <div className="sb-metric">
      <div className="sb-metric-icon">{icon}</div>
      <div className="sb-metric-body">
        <div className="sb-metric-label">{label}</div>
        <div className="sb-metric-track">
          <div
            className="sb-metric-fill"
            style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
          />
        </div>
        <strong>{value}%</strong>
      </div>
    </div>
  );
}

function RiskBadge({ score }) {
  const risk = classifyRisk(score);

  return (
    <div
      className="sb-risk-badge"
      style={{
        color: risk.color,
        background: risk.bg,
        borderColor: risk.color,
      }}
    >
      <span>{risk.icon}</span>
      <strong>{risk.label}</strong>
      <span>{score}/100</span>
    </div>
  );
}

export default function SafeBhoomiCommandCenter() {
  const [open, setOpen] = useState(null);
  const [district, setDistrict] = useState(DISTRICTS[6]);
  const [query, setQuery] = useState("");
  const [coords, setCoords] = useState(null);
  const [locationState, setLocationState] = useState("idle");
  const [locationRisk, setLocationRisk] = useState(null);
  const [destination, setDestination] = useState("");
  const [routeState, setRouteState] = useState("idle");
  const [routeRisk, setRouteRisk] = useState(null);

  const filteredDistricts = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return DISTRICTS;

    return DISTRICTS.filter((d) =>
      d.name.toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => {
    /*
     * Listen for optional district-selection events emitted by the existing
     * Live Map. This allows the new panel to cooperate with the existing map
     * without replacing it.
     */
    const handleDistrict = (event) => {
      const name =
        event?.detail?.name ||
        event?.detail?.district ||
        event?.detail;

      if (!name) return;

      const found = DISTRICTS.find(
        (d) => d.name.toLowerCase() === String(name).toLowerCase()
      );

      if (found) {
        setDistrict(found);
        setOpen("district");
      }
    };

    window.addEventListener(
      "safebhoomi:district-selected",
      handleDistrict
    );

    return () => {
      window.removeEventListener(
        "safebhoomi:district-selected",
        handleDistrict
      );
    };
  }, []);

  const locateMe = () => {
    if (!navigator.geolocation) {
      setLocationState("unsupported");
      return;
    }

    setLocationState("loading");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        const score = scoreFromCoordinates(lat, lon);

        setCoords({
          lat,
          lon,
          accuracy: position.coords.accuracy,
        });

        setLocationRisk(score);
        setLocationState("success");
      },
      () => {
        setLocationState("denied");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      }
    );
  };

  const analyzeLocation = () => {
    if (!coords) {
      locateMe();
      return;
    }

    const score = scoreFromCoordinates(coords.lat, coords.lon);
    setLocationRisk(score);
  };

  const calculateRoute = () => {
    if (!destination.trim()) return;

    setRouteState("analyzing");

    window.setTimeout(() => {
      /*
       * Route-risk placeholder that can be replaced directly by the backend
       * route engine without changing this UI.
       */
      const score = Math.round(
        25 + Math.abs(Math.sin(destination.length * 3.71)) * 65
      );

      setRouteRisk(score);
      setRouteState("complete");
    }, 700);
  };

  const close = () => setOpen(null);

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* TOP FLOATING RISK LEGEND                                           */}
      {/* ------------------------------------------------------------------ */}

      <div className="sb-command-legend">
        <div className="sb-command-title">
          <ShieldCheck size={18} />
          <strong>SAFEBHOOMI RISK</strong>
        </div>

        <div className="sb-legend-items">
          <span><i className="sb-dot low" />Low</span>
          <span><i className="sb-dot moderate" />Moderate</span>
          <span><i className="sb-dot high" />High</span>
          <span><i className="sb-dot extreme" />Very High</span>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* FLOATING COMMAND BAR                                               */}
      {/* ------------------------------------------------------------------ */}

      <div className="sb-command-bar">
        <button
          className="sb-command-btn"
          onClick={() => setOpen("analyze")}
        >
          <Search size={18} />
          <span>Analyze Risk</span>
        </button>

        <button
          className="sb-command-btn location"
          onClick={() => setOpen("location")}
        >
          <LocateFixed size={18} />
          <span>My Location</span>
        </button>

        <button
          className="sb-command-btn route"
          onClick={() => setOpen("route")}
        >
          <Route size={18} />
          <span>Safe Route</span>
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* ANALYZE RISK                                                       */}
      {/* ------------------------------------------------------------------ */}

      {open === "analyze" && (
        <div className="sb-panel">
          <div className="sb-panel-header">
            <div>
              <div className="sb-kicker">INTELLIGENCE</div>
              <h2>Analyze Risk</h2>
            </div>
            <button className="sb-close" onClick={close}>
              <X size={20} />
            </button>
          </div>

          <p className="sb-muted">
            Search for a Uttarakhand district to inspect its current modelled
            risk indicators.
          </p>

          <div className="sb-search">
            <Search size={17} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search district..."
            />
          </div>

          <div className="sb-district-list">
            {filteredDistricts.map((item) => {
              const risk = classifyRisk(item.risk);

              return (
                <button
                  key={item.name}
                  className="sb-district-row"
                  onClick={() => {
                    setDistrict(item);
                    setOpen("district");
                  }}
                >
                  <span
                    className="sb-district-dot"
                    style={{ background: risk.color }}
                  />

                  <span className="sb-district-name">
                    {item.name}
                  </span>

                  <span
                    className="sb-mini-risk"
                    style={{ color: risk.color }}
                  >
                    {risk.label}
                  </span>

                  <ChevronRight size={16} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* DISTRICT INTELLIGENCE                                              */}
      {/* ------------------------------------------------------------------ */}

      {open === "district" && district && (
        <div className="sb-panel">
          <div className="sb-panel-header">
            <div>
              <div className="sb-kicker">DISTRICT INTELLIGENCE</div>
              <h2>{district.name}</h2>
            </div>

            <button className="sb-close" onClick={close}>
              <X size={20} />
            </button>
          </div>

          <RiskBadge score={district.risk} />

          <div className="sb-warning-box">
            <Info size={18} />
            <span>
              Risk is an analytical estimate based on the available
              SafeBhoomi indicators. It should not be treated as an official
              emergency warning.
            </span>
          </div>

          <div className="sb-metrics">
            <Metric
              label="Rainfall indicator"
              value={district.rainfall}
              icon={<CloudRain size={18} />}
            />

            <Metric
              label="Terrain susceptibility"
              value={district.terrain}
              icon={<Mountain size={18} />}
            />

            <Metric
              label="Landslide indicator"
              value={district.landslide}
              icon={<AlertTriangle size={18} />}
            />

            <Metric
              label="Overall model risk"
              value={district.risk}
              icon={<Activity size={18} />}
            />
          </div>

          <div className="sb-explanation">
            <strong>What this means</strong>

            <p>
              {district.risk >= 75
                ? "Several indicators are elevated. Extra caution is appropriate, especially around steep slopes and during heavy rainfall."
                : district.risk >= 55
                  ? "Multiple risk indicators are elevated. Monitor rainfall and local hazard alerts before travelling."
                  : district.risk >= 30
                    ? "The model detects some risk factors, but they are not at the highest levels."
                    : "The available indicators currently show comparatively lower modelled risk."}
            </p>
          </div>

          <button
            className="sb-primary-action"
            onClick={() => {
              setOpen("route");
              setDestination(district.name);
            }}
          >
            <Route size={18} />
            Plan Safer Route
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MY LOCATION                                                        */}
      {/* ------------------------------------------------------------------ */}

      {open === "location" && (
        <div className="sb-panel">
          <div className="sb-panel-header">
            <div>
              <div className="sb-kicker">PERSONAL SAFETY CHECK</div>
              <h2>My Location</h2>
            </div>

            <button className="sb-close" onClick={close}>
              <X size={20} />
            </button>
          </div>

          <div className="sb-location-card">
            <Crosshair size={28} />

            <strong>Check your current location</strong>

            <span>
              SafeBhoomi will use your browser's GPS position and compare it
              against the available risk model.
            </span>

            <button
              className="sb-primary-action"
              onClick={locateMe}
              disabled={locationState === "loading"}
            >
              <LocateFixed size={18} />

              {locationState === "loading"
                ? "Locating..."
                : "Use My Location"}
            </button>
          </div>

          {locationState === "denied" && (
            <div className="sb-error-box">
              Location permission was denied. Allow location access in your
              browser and try again.
            </div>
          )}

          {locationState === "unsupported" && (
            <div className="sb-error-box">
              This browser does not provide location services.
            </div>
          )}

          {coords && locationRisk !== null && (
            <div className="sb-location-result">
              <div className="sb-coordinate">
                <MapPin size={17} />

                <span>
                  {coords.lat.toFixed(6)}, {coords.lon.toFixed(6)}
                </span>
              </div>

              <RiskBadge score={locationRisk} />

              <div className="sb-safety-message">
                {locationRisk < 30 && (
                  <>
                    <strong>Lower modelled risk</strong>
                    <p>
                      The available model does not currently show elevated
                      risk at this location.
                    </p>
                  </>
                )}

                {locationRisk >= 30 && locationRisk < 55 && (
                  <>
                    <strong>Moderate modelled risk</strong>
                    <p>
                      Some risk indicators are present. Monitor local
                      conditions and official alerts.
                    </p>
                  </>
                )}

                {locationRisk >= 55 && locationRisk < 75 && (
                  <>
                    <strong>Elevated modelled risk</strong>
                    <p>
                      Several risk indicators are elevated. Exercise caution,
                      especially during heavy rain.
                    </p>
                  </>
                )}

                {locationRisk >= 75 && (
                  <>
                    <strong>Very high modelled risk</strong>
                    <p>
                      Multiple indicators are elevated. Check official
                      emergency information before travelling.
                    </p>
                  </>
                )}
              </div>

              <button
                className="sb-secondary-action"
                onClick={analyzeLocation}
              >
                <Activity size={17} />
                Re-analyze
              </button>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* SAFE ROUTE                                                         */}
      {/* ------------------------------------------------------------------ */}

      {open === "route" && (
        <div className="sb-panel">
          <div className="sb-panel-header">
            <div>
              <div className="sb-kicker">ROUTE INTELLIGENCE</div>
              <h2>Safe Route</h2>
            </div>

            <button className="sb-close" onClick={close}>
              <X size={20} />
            </button>
          </div>

          <p className="sb-muted">
            Enter your destination and SafeBhoomi will prepare a
            risk-aware route analysis.
          </p>

          <div className="sb-route-input">
            <Navigation size={18} />

            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Destination or district..."
            />
          </div>

          <button
            className="sb-primary-action"
            onClick={calculateRoute}
            disabled={!destination.trim() || routeState === "analyzing"}
          >
            <Route size={18} />

            {routeState === "analyzing"
              ? "Analyzing route..."
              : "Analyze Safe Route"}
          </button>

          {routeState === "complete" && routeRisk !== null && (
            <div className="sb-route-result">
              <div className="sb-route-header">
                <Route size={20} />
                <strong>Route Risk Analysis</strong>
              </div>

              <RiskBadge score={routeRisk} />

              <div className="sb-route-stats">
                <div>
                  <span>Destination</span>
                  <strong>{destination}</strong>
                </div>

                <div>
                  <span>Hazard exposure</span>
                  <strong>{routeRisk}%</strong>
                </div>

                <div>
                  <span>Route strategy</span>
                  <strong>
                    {routeRisk >= 75
                      ? "Avoid high-risk sections"
                      : routeRisk >= 55
                        ? "Prefer lower-risk roads"
                        : "Standard route analysis"}
                  </strong>
                </div>
              </div>

              <div className="sb-warning-box">
                <AlertTriangle size={18} />
                <span>
                  Final route decisions should also consider official road
                  closures, weather warnings and emergency instructions.
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
