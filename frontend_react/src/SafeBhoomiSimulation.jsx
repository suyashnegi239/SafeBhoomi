
import React, { useEffect, useMemo, useState } from "react";

const stages = [
  {
    title: "Rainfall intensifies",
    description: "Heavy rainfall is increasing water input into the mountain system.",
    icon: "🌧️",
    rainfall: 42,
    saturation: 38,
    stability: 88,
    risk: 24
  },
  {
    title: "Soil absorbs water",
    description: "Water is entering the soil and increasing saturation.",
    icon: "💧",
    rainfall: 68,
    saturation: 61,
    stability: 69,
    risk: 43
  },
  {
    title: "Slope becomes unstable",
    description: "High saturation reduces effective slope stability.",
    icon: "⛰️",
    rainfall: 82,
    saturation: 78,
    stability: 47,
    risk: 67
  },
  {
    title: "Landslide risk peaks",
    description: "The simulated slope has reached a critical hazard condition.",
    icon: "⚠️",
    rainfall: 94,
    saturation: 91,
    stability: 24,
    risk: 89
  },
  {
    title: "Road impact detected",
    description: "The simulation identifies a possible road blockage zone.",
    icon: "🚧",
    rainfall: 87,
    saturation: 86,
    stability: 31,
    risk: 82
  },
  {
    title: "Conditions improve",
    description: "Rainfall decreases and the simulated system begins recovering.",
    icon: "🌤️",
    rainfall: 51,
    saturation: 67,
    stability: 58,
    risk: 54
  }
];

function Mountain({ stage }) {
  const danger = stage.risk >= 70;

  return (
    <div className={"simMountain " + (danger ? "dangerMountain" : "")}>
      <div className="simSky">
        <div className="simCloud cloudOne"></div>
        <div className="simCloud cloudTwo"></div>

        {Array.from({ length: Math.min(28, Math.floor(stage.rainfall / 3)) }).map((_, i) => (
          <span
            key={i}
            className="rainDrop"
            style={{
              left: `${8 + ((i * 17) % 84)}%`,
              animationDelay: `${(i % 8) * 0.11}s`
            }}
          />
        ))}
      </div>

      <div className="mountainBack"></div>
      <div className="mountainFront">
        <div className="mountainSnow"></div>

        {danger && (
          <>
            <div className="landslideSlide slideOne"></div>
            <div className="landslideSlide slideTwo"></div>
            <div className="rock rockOne"></div>
            <div className="rock rockTwo"></div>
            <div className="rock rockThree"></div>
          </>
        )}

        <div className="mountainRoad"></div>
        <div className="roadWarning">🚧</div>
      </div>

      <div className="simulationGround">
        <span>UTTARAKHAND TERRAIN MODEL</span>
      </div>
    </div>
  );
}

export default function SafeBhoomiSimulation() {
  const [running, setRunning] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [speed, setSpeed] = useState(1);

  const stage = stages[stageIndex];

  useEffect(() => {
    if (!running) return;

    const timer = setInterval(() => {
      setStageIndex(current => {
        if (current >= stages.length - 1) {
          setRunning(false);
          return current;
        }
        return current + 1;
      });
    }, 2200 / speed);

    return () => clearInterval(timer);
  }, [running, speed]);

  const status = useMemo(() => {
    if (stage.risk >= 80) return "CRITICAL";
    if (stage.risk >= 60) return "HIGH";
    if (stage.risk >= 40) return "MODERATE";
    return "LOW";
  }, [stage.risk]);

  const startSimulation = () => {
    setStageIndex(0);
    setRunning(true);
  };

  const resetSimulation = () => {
    setRunning(false);
    setStageIndex(0);
  };

  return (
    <div className="simulationPage">

      <div className="simulationHero">
        <div>
          <div className="simulationEyebrow">
            SAFEBHOOMI • HAZARD SIMULATION ENGINE
          </div>

          <h1>🌋 Landslide Simulation</h1>

          <p>
            Watch how rainfall, soil saturation and slope stability
            interact to create changing landslide risk.
          </p>
        </div>

        <div className={"simulationStatus " + status.toLowerCase()}>
          <span className="statusDot"></span>
          {status}
        </div>
      </div>

      <div className="simulationControls">
        <button
          className="simulationStart"
          onClick={startSimulation}
          disabled={running}
        >
          {running ? "▶ Simulation Running..." : "▶ Start Simulation"}
        </button>

        <button
          className="simulationReset"
          onClick={resetSimulation}
        >
          ↻ Reset
        </button>

        <label className="simulationSpeed">
          Speed
          <select
            value={speed}
            onChange={e => setSpeed(Number(e.target.value))}
          >
            <option value="0.5">0.5×</option>
            <option value="1">1×</option>
            <option value="1.5">1.5×</option>
            <option value="2">2×</option>
          </select>
        </label>
      </div>

      <div className="simulationTimeline">
        {stages.map((item, i) => (
          <div
            key={item.title}
            className={
              "timelineStep " +
              (i === stageIndex ? "active " : "") +
              (i < stageIndex ? "completed" : "")
            }
          >
            <div className="timelineDot">
              {i < stageIndex ? "✓" : i + 1}
            </div>
            <span>{item.title}</span>
          </div>
        ))}
      </div>

      <div className="simulationMain">

        <div className="simulationVisualCard">
          <div className="visualHeader">
            <div>
              <strong>LIVE TERRAIN MODEL</strong>
              <small>Scenario: Heavy rainfall event</small>
            </div>

            <div className="stageCounter">
              STEP {stageIndex + 1}/{stages.length}
            </div>
          </div>

          <Mountain stage={stage} />

          <div className="simulationEvent">
            <div className="eventIcon">{stage.icon}</div>

            <div>
              <strong>{stage.title}</strong>
              <p>{stage.description}</p>
            </div>
          </div>
        </div>

        <div className="simulationMetrics">

          <div className="metricCard">
            <div className="metricTop">
              <span>Rainfall</span>
              <b>{stage.rainfall} mm</b>
            </div>

            <div className="metricBar">
              <span style={{ width: `${stage.rainfall}%` }}></span>
            </div>

            <small>Precipitation intensity</small>
          </div>

          <div className="metricCard">
            <div className="metricTop">
              <span>Soil Saturation</span>
              <b>{stage.saturation}%</b>
            </div>

            <div className="metricBar">
              <span style={{ width: `${stage.saturation}%` }}></span>
            </div>

            <small>Water retained in soil</small>
          </div>

          <div className="metricCard">
            <div className="metricTop">
              <span>Slope Stability</span>
              <b>{stage.stability}%</b>
            </div>

            <div className="metricBar stabilityBar">
              <span style={{ width: `${stage.stability}%` }}></span>
            </div>

            <small>Higher is safer</small>
          </div>

          <div className={"riskCard " + status.toLowerCase()}>
            <span>SIMULATED LANDSLIDE RISK</span>

            <strong>{stage.risk}%</strong>

            <div className="riskRing">
              <div>{status}</div>
            </div>
          </div>

        </div>
      </div>

      <div className="simulationExplanation">

        <div>
          <span>01</span>
          <strong>Rainfall</strong>
          <p>
            Increasing rainfall adds water to the mountain system.
          </p>
        </div>

        <div>
          <span>02</span>
          <strong>Saturation</strong>
          <p>
            Water accumulation increases soil saturation.
          </p>
        </div>

        <div>
          <span>03</span>
          <strong>Stability</strong>
          <p>
            Higher saturation can reduce slope stability.
          </p>
        </div>

        <div>
          <span>04</span>
          <strong>Risk</strong>
          <p>
            SafeBhoomi converts the changing conditions into a simulated risk level.
          </p>
        </div>

      </div>

      <div className="simulationDisclaimer">
        ⚙️ Demonstration simulation — values represent a SafeBhoomi scenario model,
        not an official landslide warning or real-time emergency prediction.
      </div>

    </div>
  );
}
