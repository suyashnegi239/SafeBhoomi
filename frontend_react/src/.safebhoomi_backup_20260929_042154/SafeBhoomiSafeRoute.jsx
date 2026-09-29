
import React, { useMemo, useState } from "react";

const districts = [
  { name: "Nainital", risk: 58, distance: 32, time: 48 },
  { name: "Almora", risk: 52, distance: 46, time: 68 },
  { name: "Bageshwar", risk: 66, distance: 61, time: 92 },
  { name: "Chamoli", risk: 77, distance: 78, time: 121 },
  { name: "Pauri Garhwal", risk: 63, distance: 72, time: 112 },
  { name: "Tehri Garhwal", risk: 69, distance: 64, time: 101 },
  { name: "Rudraprayag", risk: 74, distance: 91, time: 138 },
  { name: "Uttarkashi", risk: 71, distance: 104, time: 154 },
  { name: "Pithoragarh", risk: 64, distance: 118, time: 176 },
  { name: "Champawat", risk: 48, distance: 82, time: 122 },
  { name: "Dehradun", risk: 35, distance: 44, time: 64 },
  { name: "Haridwar", risk: 28, distance: 57, time: 73 },
  { name: "Udham Singh Nagar", risk: 24, distance: 96, time: 108 }
];

function riskLabel(score) {
  if (score >= 75) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 40) return "MODERATE";
  return "LOW";
}

function RouteLine({ safer }) {
  return (
    <div className={"routeMap " + (safer ? "saferMap" : "")}>

      <div className="routeMountain mountainA"></div>
      <div className="routeMountain mountainB"></div>

      <div className="routeRoad">
        <div className="roadBase"></div>
        <div className="roadGlow"></div>
      </div>

      <div className="routeStart">
        <span>START</span>
        <b>●</b>
      </div>

      <div className="routeDestination">
        <span>DESTINATION</span>
        <b>★</b>
      </div>

      <div className="routeHazard hazardOne">
        ⚠
      </div>

      <div className="routeHazard hazardTwo">
        ⚠
      </div>

      {!safer && (
        <div className="blockedRoad">
          <span>ROAD RISK</span>
          <b>×</b>
        </div>
      )}

      {safer && (
        <div className="safeRouteBadge">
          ✓ LOWER-RISK ROUTE
        </div>
      )}

      <div className="routeMapLabel">
        HAZARD-AWARE ROUTE MODEL
      </div>
    </div>
  );
}

export default function SafeBhoomiSafeRoute() {

  const [start, setStart] = useState("Nainital");
  const [destination, setDestination] = useState("Chamoli");
  const [routeGenerated, setRouteGenerated] = useState(false);
  const [safer, setSafer] = useState(true);

  const startData = districts.find(d => d.name === start);
  const destinationData = districts.find(d => d.name === destination);

  const routeRisk = useMemo(() => {
    if (!startData || !destinationData) return 0;

    return Math.round(
      (startData.risk * 0.35) +
      (destinationData.risk * 0.65)
    );
  }, [startData, destinationData]);

  const alternativeRisk = Math.max(
    18,
    routeRisk - 17
  );

  const activeRisk = safer ? alternativeRisk : routeRisk;

  const generateRoute = () => {
    if (start === destination) return;
    setRouteGenerated(true);
    setSafer(true);
  };

  return (
    <div className="safeRoutePage">

      <div className="routeHero">

        <div>
          <div className="routeEyebrow">
            SAFEBHOOMI • HAZARD-AWARE NAVIGATION
          </div>

          <h1>🛣️ Safe Route</h1>

          <p>
            Compare route risk using SafeBhoomi's simulated
            landslide-risk intelligence.
          </p>
        </div>

        <div className="routeEngineStatus">
          <span></span>
          ROUTE ENGINE ONLINE
        </div>

      </div>

      <div className="routePlanner">

        <div className="routeField">

          <label>START LOCATION</label>

          <select
            value={start}
            onChange={e => {
              setStart(e.target.value);
              setRouteGenerated(false);
            }}
          >
            {districts.map(d => (
              <option key={d.name}>{d.name}</option>
            ))}
          </select>

        </div>

        <div className="routeArrow">
          →
        </div>

        <div className="routeField">

          <label>DESTINATION</label>

          <select
            value={destination}
            onChange={e => {
              setDestination(e.target.value);
              setRouteGenerated(false);
            }}
          >
            {districts.map(d => (
              <option key={d.name}>{d.name}</option>
            ))}
          </select>

        </div>

        <button
          className="generateRouteButton"
          onClick={generateRoute}
          disabled={start === destination}
        >
          {start === destination
            ? "Choose different locations"
            : "Calculate Safe Route →"}
        </button>

      </div>

      {routeGenerated && (
        <div className="routeResult">

          <div className="routeMapCard">

            <div className="routeCardHeader">
              <div>
                <strong>
                  {start} → {destination}
                </strong>

                <small>
                  Hazard-aware route comparison
                </small>
              </div>

              <div className="routeLiveBadge">
                SIMULATION
              </div>
            </div>

            <RouteLine safer={safer} />

          </div>

          <div className="routeAnalysis">

            <div className="routeRecommendation">

              <span>RECOMMENDED ROUTE</span>

              <h2>
                {safer
                  ? "Lower simulated hazard exposure"
                  : "Higher hazard exposure"}
              </h2>

              <p>
                SafeBhoomi is prioritising lower simulated
                landslide-risk sections rather than simply
                choosing the shortest route.
              </p>

            </div>

            <div className="routeRiskComparison">

              <div className="routeOption">
                <div>
                  <small>DIRECT ROUTE</small>
                  <strong>{routeRisk}%</strong>
                </div>

                <span className={
                  routeRisk >= 70
                    ? "criticalText"
                    : routeRisk >= 50
                    ? "highText"
                    : "moderateText"
                }>
                  {riskLabel(routeRisk)}
                </span>
              </div>

              <div className="routeOption recommended">

                <div>
                  <small>LOWER-RISK OPTION</small>
                  <strong>{alternativeRisk}%</strong>
                </div>

                <span className="safeText">
                  {riskLabel(alternativeRisk)}
                </span>

              </div>

            </div>

            <div className="routeStats">

              <div>
                <span>Distance</span>
                <b>
                  {safer
                    ? Math.round((startData.distance + destinationData.distance) * 0.62)
                    : Math.round((startData.distance + destinationData.distance) * 0.55)
                  } km
                </b>
              </div>

              <div>
                <span>Estimated time</span>
                <b>
                  {safer
                    ? Math.round((startData.time + destinationData.time) * 0.62)
                    : Math.round((startData.time + destinationData.time) * 0.55)
                  } min
                </b>
              </div>

              <div>
                <span>Hazard exposure</span>
                <b>{activeRisk}%</b>
              </div>

            </div>

            <button
              className="toggleRoute"
              onClick={() => setSafer(!safer)}
            >
              ↔ Compare alternative route
            </button>

          </div>

        </div>
      )}

      {!routeGenerated && (
        <div className="routeEmpty">

          <div className="routeEmptyIcon">
            🧭
          </div>

          <h2>Plan a safer journey</h2>

          <p>
            Select two Uttarakhand locations and SafeBhoomi
            will compare their simulated hazard exposure.
          </p>

          <div className="routeFeatures">

            <span>✓ Risk-aware routing</span>
            <span>✓ Hazard-zone detection</span>
            <span>✓ Route comparison</span>
            <span>✓ Road-risk indicators</span>

          </div>

        </div>
      )}

      <div className="routeNotice">
        ⚙️ Route results are a SafeBhoomi demonstration model.
        They are not live navigation directions and should not replace
        official road-closure information.
      </div>

    </div>
  );
}
