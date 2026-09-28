
import { useState } from "react";
import {
  Activity, Map, ShieldAlert, Route, Brain, Radio,
  Menu, X, PhoneCall, CloudRain, Mountain, Play,
  RefreshCw, Navigation, Wifi, WifiOff
} from "lucide-react";
import "./index.css";

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
  const [page,setPage] = useState("Overview");
  const [mobile,setMobile] = useState(false);
  const [online,setOnline] = useState(navigator.onLine);
  const [selected,setSelected] = useState("Chamoli");
  const [simulation,setSimulation] = useState("Heavy Rain");

  const district = districts.find(d=>d[0]===selected) || districts[0];

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

        <button className="emergency" onClick={()=>alert("Emergency mode activated. Connect emergency calling in the next backend step.")}>
          <PhoneCall size={17}/> EMERGENCY
        </button>

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
          <Page title="Live Hazard Map" subtitle="Interactive Uttarakhand risk intelligence">
            <div className="mapBox">
              <div className="mapGrid"></div>
              {districts.map((d,i)=>(
                <button
                  key={d[0]}
                  className={"mapPoint " + (d[1]>=50?"danger":d[1]>=30?"moderate":"safe")}
                  style={{left:`${12+(i%7)*12}%`,top:`${22+Math.floor(i/7)*42}%`}}
                  onClick={()=>{setSelected(d[0]);setPage("Area Risk")}}
                  title={d[0]}
                >
                  <span></span>{d[0]}
                </button>
              ))}
              <div className="mapLegend">
                <b>RISK ZONES</b>
                <span>● HIGH</span><span>● MODERATE</span><span>● LOW</span>
              </div>
            </div>
          </Page>
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
          <Page title="Area Risk Analysis" subtitle="Multi-factor landslide risk assessment">
            <select value={selected} onChange={e=>setSelected(e.target.value)} className="select">
              {districts.map(d=><option key={d[0]}>{d[0]}</option>)}
            </select>

            <div className="riskMain">
              <div className="riskScore">
                <small>RISK SCORE</small>
                <strong>{district[1]}%</strong>
                <span>{district[2]}</span>
              </div>
              <div className="riskFactors">
                <Factor name="Rainfall" value={district[3]+" mm"}/>
                <Factor name="Soil Saturation" value={district[1] > 45 ? "Elevated":"Normal"}/>
                <Factor name="Slope Instability" value={district[1] > 45 ? "High":"Moderate"}/>
                <Factor name="Historical Susceptibility" value={district[1] > 45 ? "High":"Moderate"}/>
              </div>
            </div>
          </Page>
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
          <Page title="Safe Route" subtitle="Find safer travel corridors during hazards">
            <div className="routeBox">
              <input placeholder="Start location"/>
              <input placeholder="Destination"/>
              <button className="primary"><Navigation size={17}/> ANALYZE SAFER ROUTE</button>
              <div className="routeResult">
                <Route size={28}/>
                <div><b>Route intelligence ready</b><small>Road blockage and hazard layers will be connected to the backend next.</small></div>
              </div>
            </div>
          </Page>
        )}

        {page === "Simulation" && (
          <Page title="Hazard Simulation" subtitle="Test SafeBhoomi against extreme scenarios">
            <div className="simulation">
              {["Heavy Rain","Extreme Rainfall","Landslide","Road Blockage","Multiple Hazards"].map(x=>(
                <button className={simulation===x?"sim active":"sim"} key={x} onClick={()=>setSimulation(x)}>
                  <CloudRain size={20}/>{x}
                </button>
              ))}
              <button className="run" onClick={()=>alert(simulation+" simulation started")}>
                <Play size={17}/> RUN SIMULATION
              </button>
            </div>
          </Page>
        )}

        {page === "AI Analyst" && (
          <Page title="AI Analyst" subtitle="Intelligent hazard interpretation">
            <div className="aiBox">
              <Brain size={42}/>
              <h3>SafeBhoomi AI Analyst</h3>
              <p>Ask about district risk, rainfall conditions, hazards or response planning.</p>
              <textarea placeholder="Ask the AI Analyst..."></textarea>
              <button className="primary"><Brain size={17}/> ANALYZE SITUATION</button>
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
  return <><div className="sectionTitle"><div><span>SAFEBHOOMI INTELLIGENCE</span><h2>{title}</h2><p>{subtitle}</p></div></div>{children}</>
}

export default App
