
import { useState, useEffect } from "react";
import SafeBhoomiSafeRoute from "./SafeBhoomiSafeRoute";
import SafeBhoomiEmergency from "./SafeBhoomiEmergency";
import SafeBhoomiSimulation from "./SafeBhoomiSimulation";
import {
  Activity, Map, ShieldAlert, Route, Brain, Radio,
  Menu, X, PhoneCall, CloudRain, Mountain, Play,
  RefreshCw, Navigation, Wifi, WifiOff
} from "lucide-react";
import "./index.css";
import SafeBhoomiLiveMap from "./SafeBhoomiLiveMap";

const districts = [
  ["Chamoli",55,"HIGH",73],["Rudraprayag",55,"HIGH",73],
  ["Uttarkashi",53,"HIGH",72],["Pithoragarh",52,"HIGH",71],
  ["Nainital",50,"HIGH",68],["Bageshwar",42,"MODERATE",55],
  ["Pauri Garhwal",48,"MODERATE",61],["Tehri Garhwal",47,"MODERATE",60],
  ["Champawat",45,"MODERATE",57],["Almora",36,"MODERATE",45],
  ["Dehradun",25,"LOW",31],["Haridwar",12,"LOW",18],
  ["Udham Singh Nagar",15,"LOW",20]
];

const nav = [
  ["Overview", Activity],
  ["Live Map", Map],
  ["Districts", Mountain],
  ["Area Risk", ShieldAlert],
  ["Alerts", Radio],
  ["Safe Route", Route],
  ["Simulation", Play],
  ["AI Analyst", Brain]
];

function App() {
  const [showIntro, setShowIntro] = useState(true);
useEffect(() => {
    const timer = setTimeout(() => {
      setShowIntro(false);
    }, 4500);

    return () => clearTimeout(timer);
  }, []);

  const [page,setPage] = useState("Overview");
  const [mobile,setMobile] = useState(false);
  const [online,setOnline] = useState(navigator.onLine);
  const [selected,setSelected] = useState("Chamoli");
  const [simulation,setSimulation] = useState("Heavy Rain");
const [aiQuestion, setAiQuestion] = useState("");
const [aiAnswer, setAiAnswer] = useState("");
const [aiLoading, setAiLoading] = useState(false);
const [aiError, setAiError] = useState("");

const analyzeWithAI = async () => {
  if (!aiQuestion.trim()) {
    setAiError("Please enter a question for the AI Analyst.");
    return;
  }

  setAiLoading(true);
  setAiError("");
  setAiAnswer("");

  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE || ""}/api/ai/analyze`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question: aiQuestion,
          district: selected
        })
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.error || `AI service returned ${response.status}`
      );
    }

    setAiAnswer(data.answer);

  } catch (error) {
    console.error("AI Analyst error:", error);
    setAiError(
      "AI Analyst is temporarily unavailable. Please try again."
    );
  } finally {
    setAiLoading(false);
  }
};


  const [riskData,setRiskData] = useState(null);
  const [riskLoading,setRiskLoading] = useState(false);
  const [riskError,setRiskError] = useState("");

  if (showIntro) {
    return (
      <div className="startupScreen">
        <img
          src="/safebhoomi_intro.gif"
          alt="SafeBhoomi"
          className="startupAnimation"
        />

        <div className="startupLoading">
          <span></span>
          INITIALIZING LANDSLIDE INTELLIGENCE
        </div>
      </div>
    );
  }

  const district = districts.find(d=>d[0]===selected) || districts[0];

  const analyzeRisk = async (districtName) => {
    setRiskLoading(true);
    setRiskError("");

    try {
      const selectedDistrict =
        districts.find(d => d[0] === districtName) || districts[0];

      const payload = {
        district: districtName,
        rainfall_24h: selectedDistrict[3],
        rainfall_7d: selectedDistrict[3] * 3,
        humidity: 80,
        soil_saturation: selectedDistrict[1] > 45 ? 78 : 55,
        historical_susceptibility: selectedDistrict[1] / 100
      };

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE || ""}/api/risk/unified`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      setRiskData(data);

    } catch (error) {
      console.error("Risk API error:", error);
      setRiskError("Risk intelligence service unavailable.");
    } finally {
      setRiskLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brandMark">S</div>
          <div>
            <div className="brandName">SAFE<span>BHOOMI</span></div>
            <div className="brandSub">LANDSLIDE INTELLIGENCE</div>
          </div>
        </div>

        <div className="live">
          <span className={online ? "dot" : "dot off"}></span>
          {online ? "LIVE INTELLIGENCE" : "OFFLINE MODE"}
        </div>


        <button className="menu" onClick={()=>setMobile(!mobile)}>
          {mobile ? <X/> : <Menu/>}
        </button>
      </header>

      <nav className={mobile ? "nav open" : "nav"}>
        {nav.map(([name,Icon])=>(
          <button
            key={name}
            className={page===name ? "navItem active" : "navItem"}
            onClick={()=>{setPage(name);setMobile(false)}}
          >
            <Icon size={16}/>
            {name}
          </button>
        ))}
      </nav>

      <main>
        <section className="hero">
          <div>
            <div className="eyebrow">UTTARAKHAND • HAZARD MONITORING</div>
            <h1>Know the mountain<br/><span>before it moves.</span></h1>
            <p>
              SafeBhoomi combines rainfall, terrain, soil and historical
              hazard intelligence to help communities understand landslide risk.
            </p>
          </div>

          <div className="heroStatus">
            <Mountain size={28}/>
            <strong>13</strong>
            <small>DISTRICTS MONITORED</small>
          </div>
        </section>

        {page === "Overview" && (
          <>
            <div className="sectionTitle">
              <div>
                <span>STATEWIDE INTELLIGENCE</span>
                <h2>Uttarakhand Situation Overview</h2>
              </div>
              <button className="refresh" onClick={()=>location.reload()}>
                <RefreshCw size={15}/> Refresh
              </button>
            </div>

            <div className="metrics">
              <Metric value="13" label="DISTRICTS MONITORED" sub="FULL COVERAGE"/>
              <Metric value="0" label="CRITICAL" sub="IMMEDIATE ATTENTION"/>
              <Metric value="5" label="HIGH RISK" sub="ELEVATED HAZARD"/>
              <Metric value="7" label="ACTIVE ALERTS" sub="LIVE MONITORING"/>
              <Metric value="41%" label="AVG RISK" sub="STATEWIDE INDEX"/>
            </div>

            <div className="grid2">
              <Panel title="Priority Intelligence">
                {districts.slice(0,5).map(d=>(
                  <div className="priority" key={d[0]}>
                    <div>
                      <b>{d[0]}</b>
                      <small>{d[3]} mm rainfall</small>
                    </div>
                    <strong>{d[1]}%</strong>
                    <span className="high">{d[2]}</span>
                  </div>
                ))}
              </Panel>

              <Panel title="System Modules">
                <Module icon={Map} title="Live Map" text="Terrain + dynamic risk zones" onClick={()=>setPage("Live Map")}/>
                <Module icon={Mountain} title="Districts" text="13 district intelligence profiles" onClick={()=>setPage("Districts")}/>
                <Module icon={Play} title="Simulation" text="Test extreme hazard scenarios" onClick={()=>setPage("Simulation")}/>
                <Module icon={Route} title="Safe Route" text="Find safer travel corridors" onClick={()=>setPage("Safe Route")}/>
              </Panel>
            </div>
          </>
        )}

        {page === "Live Map" && (
      <SafeBhoomiLiveMap
        onDistrictSelect={(districtName) => {
          setSelected(districtName);
          setPage("Area Risk");
        }}
      />
    )}

        {page === "Districts" && (
          <Page title="District Intelligence" subtitle="All 13 Uttarakhand districts">
            <div className="districtGrid">
              {districts.map(d=>(
                <button className="districtCard" key={d[0]} onClick={()=>{setSelected(d[0]);setPage("Area Risk")}}>
                  <div className="mountainIcon"><Mountain size={24}/></div>
                  <b>{d[0]}</b>
                  <span>{d[2]} RISK</span>
                  <strong>{d[1]}%</strong>
                  <small>{d[3]} mm rainfall</small>
                </button>
              ))}
            </div>
          </Page>
        )}

        {page === "Area Risk" && (
          <Page
            title="Area Risk Analysis"
            subtitle="Multi-factor landslide risk assessment"
          >

            <div className="riskControl">
              <select
                value={selected}
                onChange={e => {
                  const value = e.target.value;
                  setSelected(value);
                  analyzeRisk(value);
                }}
                className="select"
              >
                {districts.map(d => (
                  <option key={d[0]} value={d[0]}>
                    {d[0]}
                  </option>
                ))}
              </select>

              <button
                className="primary"
                onClick={() => analyzeRisk(selected)}
                disabled={riskLoading}
              >
                <ShieldAlert size={17}/>
                {riskLoading ? " ANALYZING..." : " ANALYZE RISK"}
              </button>
            </div>

            {riskError && (
              <div className="riskError">
                {riskError}
              </div>
            )}

            {riskData && (
              <>
                <div className="riskMain">

                  <div className="riskScore">
                    <small>MODELLED RISK SCORE</small>

                    <strong>
                      {riskData.risk.score}%
                    </strong>

                    <span>
                      {riskData.risk.level}
                    </span>

                    <small>
                      {riskData.district}
                    </small>
                  </div>

                  <div className="riskFactors">

                    <Factor
                      name="24h Rainfall"
                      value={
                        riskData.inputs.rainfall_24h_mm + " mm"
                      }
                    />

                    <Factor
                      name="7-Day Rainfall"
                      value={
                        riskData.inputs.rainfall_7d_mm + " mm"
                      }
                    />

                    <Factor
                      name="Soil Saturation"
                      value={
                        riskData.inputs.soil_saturation_percent + "%"
                      }
                    />

                    <Factor
                      name="Slope"
                      value={
                        riskData.terrain.slope_deg + "°"
                      }
                    />

                    <Factor
                      name="Elevation"
                      value={
                        riskData.terrain.elevation_m + " m"
                      }
                    />

                    <Factor
                      name="Historical Susceptibility"
                      value={
                        Math.round(
                          riskData.inputs.historical_susceptibility * 100
                        ) + "%"
                      }
                    />

                  </div>
                </div>

                <div className="riskDrivers">

                  <div className="sectionTitle">
                    <div>
                      <span>WHY THIS SCORE</span>
                      <h2>Risk Drivers</h2>
                    </div>
                  </div>

                  <div className="driverGrid">

                    {riskData.risk_drivers.map((driver, index) => (
                      <div
                        className="driverCard"
                        key={index}
                      >
                        <ShieldAlert size={18}/>
                        <span>{driver}</span>
                      </div>
                    ))}

                  </div>

                </div>

                <div className="dataStatus">

                  <span>
                    TERRAIN: {riskData.data_status.terrain}
                  </span>

                  <span>
                    RAINFALL: {riskData.data_status.rainfall}
                  </span>

                  <span>
                    SOIL: {riskData.data_status.soil}
                  </span>

                  <span>
                    HISTORY: {riskData.data_status.historical_susceptibility}
                  </span>

                </div>
              </>
            )}

            {!riskData && !riskLoading && !riskError && (
              <div className="emptyRisk">
                <ShieldAlert size={38}/>
                <h3>Ready for Area Analysis</h3>
                <p>
                  Select a district and run the SafeBhoomi
                  multi-factor risk analysis.
                </p>
              </div>
            )}

          </Page>
        )}

        
{page === "Emergency" && (
  <SafeBhoomiEmergency />
)}

{page === "Alerts" && (
          <Page title="Hazard Alerts" subtitle="Current intelligence requiring attention">
            <div className="alertList">
              <Alert title="High rainfall detected" place="Chamoli" text="Rainfall conditions are elevating landslide susceptibility."/>
              <Alert title="Elevated landslide risk" place="Rudraprayag" text="Terrain and rainfall indicators show elevated hazard."/>
              <Alert title="Monitoring required" place="Pithoragarh" text="Continuous monitoring recommended for mountain corridors."/>
            </div>
          </Page>
        )}

        {page === "Safe Route" && (
  <SafeBhoomiSafeRoute />
)}

        {page === "Simulation" && (
  <SafeBhoomiSimulation />
)}

        {page === "AI Analyst" && (
  <Page
    title="AI Analyst"
    subtitle="Intelligent hazard interpretation"
  >
    <div className="aiBox">

      <div className="aiHeader">
        <div className="aiIcon">
          <Brain size={42}/>
        </div>

        <div>
          <h3>SafeBhoomi AI Analyst</h3>
          <p>
            Ask about district risk, rainfall, terrain, hazards
            or response planning.
          </p>
        </div>
      </div>

      <div className="aiContext">
        <span>ANALYSIS AREA</span>
        <strong>{selected}</strong>
      </div>

      <textarea
        value={aiQuestion}
        onChange={(e) => setAiQuestion(e.target.value)}
        placeholder="Ask the AI Analyst..."
        rows={5}
      />

      <button
        className="primary aiAnalyzeButton"
        onClick={analyzeWithAI}
        disabled={aiLoading}
      >
        <Brain size={17}/>
        {aiLoading ? " ANALYZING..." : " ANALYZE SITUATION"}
      </button>

      {aiError && (
        <div className="aiError">
          {aiError}
        </div>
      )}

      {aiAnswer && (
        <div className="aiResult">

          <div className="aiResultHeader">
            <Brain size={20}/>
            <span>AI ASSESSMENT</span>
          </div>

          <div className="aiResultText">
            {aiAnswer}
          </div>

        </div>
      )}

    </div>
  </Page>
)}
      </main>

      <footer>
        <span>SAFEBHOOMI • LANDSLIDE INTELLIGENCE PLATFORM</span>
        <span>{online ? <><Wifi size={14}/> ONLINE</> : <><WifiOff size={14}/> OFFLINE</>}</span>
      </footer>
    </div>
  )
}

function Metric({value,label,sub}) {
  return <div className="metric"><strong>{value}</strong><b>{label}</b><small>{sub}</small></div>
}

function Panel({title,children}) {
  return <section className="panel"><h3>{title}</h3>{children}</section>
}

function Module({icon:Icon,title,text,onClick}) {
  return <button className="module" onClick={onClick}><Icon/><div><b>{title}</b><small>{text}</small></div></button>
}

function Factor({name,value}) {
  return <div className="factor"><span>{name}</span><b>{value}</b></div>
}

function Alert({title,place,text}) {
  return <div className="alert"><ShieldAlert/><div><b>{title}</b><strong>{place}</strong><small>{text}</small></div></div>
}

function Page({title,subtitle,children}) {
  return <><div className="sectionTitle"><div><span>SAFEBHOOMI INTELLIGENCE</span><h2>{title}</h2><p>{subtitle}</p></div></div>{children}


</>
}

export default App
