
import { useState, useEffect } from "react";
import SafeBhoomiSafeRoute from "./SafeBhoomiSafeRoute";
import SafeBhoomiEmergency from "./SafeBhoomiEmergency";
import SafeBhoomiSimulation from "./SafeBhoomiSimulation";
import {

const SAFE_BASE_URL = import.meta.env.BASE_URL || "/";
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
    // Build context ONLY from real SafeBhoomi risk data.
    // Missing values remain null.
    const aiContext = {
      district:
        riskData?.district ||
        riskData?.area ||
        selectedDistrict?.name ||
        selected ||
        "Selected district",

      risk:
        riskData?.risk_level ||
        riskData?.risk ||
        riskData?.classification ||
        riskData?.level ||
        "UNKNOWN",

      rainfall_24h_mm:
        riskData?.inputs?.rainfall_24h_mm ?? null,

      rainfall_7d_mm:
        riskData?.inputs?.rainfall_7d_mm ?? null,

      slope_deg:
        riskData?.terrain?.slope_deg ?? null,

      elevation_m:
        riskData?.terrain?.elevation_m ?? null,

      soil_saturation:
        riskData?.soil?.saturation ??
        riskData?.inputs?.soil_saturation ??
        null,

      recent_landslides:
        riskData?.recent_landslides ??
        riskData?.hazards?.recent_landslides ??
        riskData?.landslides?.recent ??
        null,

      road_blockages:
        riskData?.road_blockages ??
        riskData?.hazards?.road_blockages ??
        riskData?.roads?.blockages ??
        null,

      historical_susceptibility:
        riskData?.historical_susceptibility ??
        riskData?.susceptibility?.historical ??
        null
    };

    console.log(
      "SafeBhoomi AI context:",
      aiContext
    );

    const response = await fetch(
      `${import.meta.env.VITE_API_BASE || ""}/api/ai/analyze`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question: aiQuestion,
          context: aiContext,
          district: aiContext.district,
          risk: aiContext.risk
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
        `AI service returned ${response.status}`
      );
    }

    if (!data.answer) {
      throw new Error(
        "AI Analyst returned no answer."
      );
    }

    setAiAnswer(data.answer);

  } catch (error) {
    console.error(
      "AI Analyst error:",
      error
    );

    setAiError(
      error.message ||
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

        <div className="startupBackground">

          <div className="startupLogo"></div>

          <div className="startupGlow"></div>

          <div className="startupVignette"></div>

        </div>

        <div className="startupContent">

          <div className="startupStatus">
            <span className="startupStatusDot"></span>
            SYSTEM INITIALIZING
          </div>

          <div className="startupBrand">
            SAFE<span>BHOOMI</span>
          </div>

          <div className="startupLine"></div>

          <div className="startupSubtitle">
            LANDSLIDE INTELLIGENCE PLATFORM
          </div>

          <div className="startupLoading">
            <span className="startupLoadingDot"></span>
            INITIALIZING TERRAIN INTELLIGENCE
            <span className="startupDots">...</span>
          </div>

        </div>

        <div className="startupBottom">
          <span>UTTARAKHAND</span>
          <span>•</span>
          <span>REAL-TIME RISK INTELLIGENCE</span>
        </div>

      </div>
    );
  }

  const district = districts.find(d=>d[0]===selected) || districts[0];

  const analyzeRisk = async (districtName) => {
    setRiskLoading(true);
    setRiskError("");

    try {
      // Load the real SafeBhoomi district dataset
      const datasetResponse = await fetch(`${SAFE_BASE_URL}safebhoomi_districts.json`);

      if (!datasetResponse.ok) {
        throw new Error("District dataset unavailable");
      }

      const districtDataset = await datasetResponse.json();

      // Find the selected district
      const selectedDistrict = districtDataset.find(
        item =>
          String(item.district).trim().toLowerCase() ===
          String(districtName).trim().toLowerCase()
      );

      if (!selectedDistrict) {
        throw new Error(`District not found: ${districtName}`);
      }

      // Send REAL dataset values to the backend.
      // Missing values remain null instead of being fabricated.
      const payload = {
        district: selectedDistrict.district,

        rainfall_24h:
          selectedDistrict.rainfall_mm ?? null,

        rainfall_7d:
          selectedDistrict.rainfall_7d_mm ?? null,

        humidity:
          selectedDistrict.humidity_pct ?? null,

        soil_saturation:
          selectedDistrict.soil_saturation_pct ?? null,

        historical_susceptibility:
          selectedDistrict.historical_susceptibility ?? null,

        recent_landslides:
          selectedDistrict.recent_landslides ?? null,

        road_blockages:
          selectedDistrict.road_blockages ?? null
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

      if (data.status === "UNAVAILABLE") {
        throw new Error(
          data.message || "Risk data unavailable for this district."
        );
      }

      setRiskData(data);

    } catch (error) {
      console.error("Risk API error:", error);
      setRiskError(
        error.message || "Risk intelligence service unavailable."
      );
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
                      {riskData.risk?.score ?? "—"}%
                    </strong>

                    <span>
                      {riskData.risk?.level ?? "UNKNOWN"}
                    </span>

                    <small>
                      {riskData.district}
                    </small>
                  </div>

                  <div className="riskFactors">

                    <Factor
                      name="24h Rainfall"
                      value={
                        riskData.inputs?.rainfall_24h_mm != null
                          ? `${riskData.inputs.rainfall_24h_mm} mm`
                          : "Unavailable"
                      }
                    />

                    <Factor
                      name="7-Day Rainfall"
                      value={
                        riskData.inputs?.rainfall_7d_mm != null
                          ? `${riskData.inputs.rainfall_7d_mm} mm`
                          : "Unavailable"
                      }
                    />

                    <Factor
                      name="Humidity"
                      value={
                        riskData.inputs?.humidity_percent != null
                          ? `${riskData.inputs.humidity_percent}%`
                          : "Unavailable"
                      }
                    />

                    <Factor
                      name="Soil Saturation"
                      value={
                        riskData.inputs?.soil_saturation_percent != null
                          ? `${riskData.inputs.soil_saturation_percent}%`
                          : "Unavailable"
                      }
                    />

                    <Factor
                      name="Slope"
                      value={
                        riskData.terrain?.slope_deg != null
                          ? `${riskData.terrain.slope_deg}°`
                          : "Unavailable"
                      }
                    />

                    <Factor
                      name="Elevation"
                      value={
                        riskData.terrain?.elevation_m != null
                          ? `${riskData.terrain.elevation_m} m`
                          : "Unavailable"
                      }
                    />

                    <Factor
                      name="Recent Landslides"
                      value={
                        riskData.inputs?.recent_landslides != null
                          ? String(riskData.inputs.recent_landslides)
                          : "Unavailable"
                      }
                    />

                    <Factor
                      name="Road Blockages"
                      value={
                        riskData.inputs?.road_blockages != null
                          ? String(riskData.inputs.road_blockages)
                          : "Unavailable"
                      }
                    />

                    <Factor
                      name="Historical Susceptibility"
                      value={
                        riskData.inputs?.historical_susceptibility != null
                          ? `${Math.round(
                              riskData.inputs.historical_susceptibility * 100
                            )}%`
                          : "Unavailable"
                      }
                    />

                    <Factor
                      name="Historical Landslides"
                      value={
                        riskData.historical?.historical_landslides != null
                          ? String(riskData.historical.historical_landslides)
                          : "Not imported"
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
                    {Array.isArray(riskData.risk_drivers) &&
                      riskData.risk_drivers.map((driver, index) => (
                        <div className="driverCard" key={index}>
                          <ShieldAlert size={18} />
                          <span>{driver}</span>
                        </div>
                      ))}
                  </div>

                </div>

                <div className="dataStatus">

                  <span>
                    TERRAIN: {riskData.data_status?.terrain || "UNKNOWN"}
                  </span>

                  <span>
                    RAINFALL: {riskData.data_status?.rainfall || "UNKNOWN"}
                  </span>

                  <span>
                    SOIL: {riskData.data_status?.soil || "UNKNOWN"}
                  </span>

                  <span>
                    SUSCEPTIBILITY: {
                      riskData.data_status?.historical_susceptibility || "UNKNOWN"
                    }
                  </span>

                  <span>
                    LANDSLIDES: {
                      riskData.data_status?.recent_landslides || "UNKNOWN"
                    }
                  </span>

                  <span>
                    ROADS: {
                      riskData.data_status?.road_blockages || "UNKNOWN"
                    }
                  </span>

                  <span>
                    HISTORICAL INVENTORY: {
                      riskData.data_status?.historical_landslides || "UNKNOWN"
                    }
                  </span>

                </div>

                <div className="riskDisclaimer">
                  <span>MODEL STATUS</span>

                  <p>
                    Risk score is a SafeBhoomi modelled indicator based on
                    available rainfall, terrain, soil and susceptibility data.
                    It is not an official government warning.
                  </p>
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