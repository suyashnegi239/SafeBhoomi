
import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  CircleMarker,
  Popup,
  useMap
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

const CENTER = [30.0668, 79.0193];

const FALLBACK_DISTRICTS = [
  ["Almora", 29.5971, 79.6591, 52],
  ["Bageshwar", 29.8383, 79.7714, 66],
  ["Chamoli", 30.4020, 79.3281, 77],
  ["Champawat", 29.3362, 80.0910, 60],
  ["Dehradun", 30.3165, 78.0322, 31],
  ["Haridwar", 29.9457, 78.1642, 18],
  ["Nainital", 29.3919, 79.4542, 68],
  ["Pauri Garhwal", 30.1460, 78.7814, 61],
  ["Pithoragarh", 29.5829, 80.2182, 71],
  ["Rudraprayag", 30.2844, 78.9811, 73],
  ["Tehri Garhwal", 30.3782, 78.4804, 60],
  ["Udham Singh Nagar", 28.9745, 79.3925, 20],
  ["Uttarkashi", 30.7268, 78.4354, 72]
];

function riskColor(score) {
  if (score >= 75) return "#ef4444";
  if (score >= 60) return "#f97316";
  if (score >= 40) return "#eab308";
  return "#22c55e";
}

function riskName(score) {
  if (score >= 75) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 40) return "MODERATE";
  return "LOW";
}

function FitUttarakhand({ geo }) {
  const map = useMap();

  useEffect(() => {
    if (!geo) return;

    try {
      const layer = L.geoJSON(geo);
      map.fitBounds(layer.getBounds(), {
        padding: [25, 25],
        maxZoom: 8
      });
    } catch (e) {
      map.setView(CENTER, 7);
    }
  }, [geo, map]);

  return null;
}

export default function SafeBhoomiLiveMap({ onDistrictSelect }) {
  const [districts, setDistricts] = useState([]);
  const [geo, setGeo] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showZones, setShowZones] = useState(true);
  const [showDistricts, setShowDistricts] = useState(true);
  const [showPulse, setShowPulse] = useState(true);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const loadData = async () => {
    setLoading(true);

    try {
      const d = await fetch("/SafeBhoomi/safebhoomi_districts.json")
        .then(r => r.json());

      setDistricts(
        d.map(x => ({
          name: x.district,
          lat: Number(x.latitude),
          lon: Number(x.longitude),
          score: Number(x.risk_score || 0),
          rainfall: Number(x.rainfall_mm || 0),
          humidity: Number(x.humidity_pct || 0),
          landslides: Number(x.recent_landslides || 0),
          slope: Number(x.slope_deg || 0),
          saturation: Number(x.soil_saturation_pct || 0),
          blockages: Number(x.road_blockages || 0)
        }))
      );
    } catch {
      setDistricts(
        FALLBACK_DISTRICTS.map(x => ({
          name: x[0],
          lat: x[1],
          lon: x[2],
          score: x[3],
          rainfall: 0,
          humidity: 0,
          landslides: 0,
          slope: 0,
          saturation: 0,
          blockages: 0
        }))
      );
    }

    try {
      const g = await fetch("/SafeBhoomi/uttarakhand.geojson")
        .then(r => r.json());
      setGeo(g);
    } catch (e) {
      console.warn("Boundary unavailable", e);
    }

    setLastUpdate(new Date());
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 60000);
    return () => clearInterval(timer);
  }, []);

  const stats = useMemo(() => ({
    critical: districts.filter(d => d.score >= 75).length,
    high: districts.filter(d => d.score >= 60 && d.score < 75).length,
    moderate: districts.filter(d => d.score >= 40 && d.score < 60).length,
    low: districts.filter(d => d.score < 40).length
  }), [districts]);

  const districtStyle = feature => {
    const name =
      feature?.properties?.district ||
      feature?.properties?.DISTRICT ||
      feature?.properties?.name ||
      "";

    const d = districts.find(
      x => x.name.toLowerCase() === String(name).toLowerCase()
    );

    const score = d?.score || 0;

    return {
      color: "#dbeafe",
      weight: 1.5,
      fillColor: riskColor(score),
      fillOpacity: showDistricts ? 0.42 : 0.08
    };
  };

  const onEachDistrict = (feature, layer) => {
    const name =
      feature?.properties?.district ||
      feature?.properties?.DISTRICT ||
      feature?.properties?.name ||
      "District";

    const d = districts.find(
      x => x.name.toLowerCase() === String(name).toLowerCase()
    );

    layer.bindTooltip(
      `${name}${d ? ` • ${riskName(d.score)} ${d.score}` : ""}`,
      { sticky: true }
    );

    layer.on({
      mouseover: e => {
        e.target.setStyle({
          weight: 3,
          fillOpacity: 0.65
        });
      },
      mouseout: e => {
        e.target.setStyle(districtStyle(feature));
      },
      click: () => {
        if (d) {
          setSelected(d);
          onDistrictSelect?.(d.name);
        }
      }
    });
  };

  const selectedData = selected;

  return (
    <div className="safeBhoomiMapPage">

      <div className="mapHeader">
        <div>
          <div className="mapEyebrow">SAFEBHOOMI • TERRAIN INTELLIGENCE</div>
          <h1>Uttarakhand Live Hazard Map</h1>
          <p>
            Interactive district-level landslide risk monitoring
          </p>
        </div>

        <div className="mapLiveStatus">
          <span className="liveDot"></span>
          LIVE MONITORING
        </div>
      </div>

      <div className="riskStats">
        <div>
          <strong>{districts.length}</strong>
          <span>Districts</span>
        </div>
        <div className="critical">
          <strong>{stats.critical}</strong>
          <span>Critical</span>
        </div>
        <div className="high">
          <strong>{stats.high}</strong>
          <span>High</span>
        </div>
        <div className="moderate">
          <strong>{stats.moderate}</strong>
          <span>Moderate</span>
        </div>
        <div className="low">
          <strong>{stats.low}</strong>
          <span>Low</span>
        </div>
      </div>

      <div className="mapToolbar">
        <button onClick={() => setShowZones(v => !v)}>
          {showZones ? "● Risk Zones" : "○ Risk Zones"}
        </button>

        <button onClick={() => setShowDistricts(v => !v)}>
          {showDistricts ? "● District Fill" : "○ District Fill"}
        </button>

        <button onClick={() => setShowPulse(v => !v)}>
          {showPulse ? "● Hazard Pulse" : "○ Hazard Pulse"}
        </button>

        <button onClick={loadData}>
          ↻ Refresh
        </button>

        <span className="mapUpdated">
          Updated {lastUpdate.toLocaleTimeString()}
        </span>
      </div>

      <div className="mapMain">

        <MapContainer
          center={CENTER}
          zoom={7}
          minZoom={6}
          maxZoom={11}
          scrollWheelZoom={true}
          className="safeBhoomiLeaflet"
        >

          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitUttarakhand geo={geo} />

          {geo && (
            <GeoJSON
              data={geo}
              style={districtStyle}
              onEachFeature={onEachDistrict}
            />
          )}

          {showZones &&
            districts.map(d => (
              <CircleMarker
                key={d.name}
                center={[d.lat, d.lon]}
                radius={Math.max(8, Math.min(25, 7 + d.score / 5))}
                pathOptions={{
                  color: riskColor(d.score),
                  fillColor: riskColor(d.score),
                  fillOpacity: 0.25,
                  weight: 2,
                  className:
                    showPulse && d.score >= 60
                      ? "hazardPulse"
                      : ""
                }}
                eventHandlers={{
                  click: () => {
                    setSelected(d);
                    onDistrictSelect?.(d.name);
                  }
                }}
              >
                <Popup>
                  <div className="riskPopup">
                    <div className="popupTitle">{d.name}</div>

                    <div
                      className="popupRisk"
                      style={{ color: riskColor(d.score) }}
                    >
                      {riskName(d.score)} — {d.score}/100
                    </div>

                    <div className="popupGrid">
                      <span>Rainfall</span>
                      <b>{d.rainfall} mm</b>

                      <span>Recent landslides</span>
                      <b>{d.landslides}</b>

                      <span>Slope</span>
                      <b>{d.slope}°</b>

                      <span>Soil saturation</span>
                      <b>{d.saturation}%</b>

                      <span>Road blockages</span>
                      <b>{d.blockages}</b>
                    </div>

                    <button
                      className="popupButton"
                      onClick={() => onDistrictSelect?.(d.name)}
                    >
                      Open District Analysis →
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
        </MapContainer>

        {selectedData && (
          <div className="mapSidePanel">
            <button
              className="closePanel"
              onClick={() => setSelected(null)}
            >
              ×
            </button>

            <div className="panelLabel">SELECTED DISTRICT</div>

            <h2>{selectedData.name}</h2>

            <div
              className="panelRisk"
              style={{ color: riskColor(selectedData.score) }}
            >
              {riskName(selectedData.score)}
              <strong>{selectedData.score}</strong>
            </div>

            <div className="panelMetric">
              <span>Rainfall</span>
              <b>{selectedData.rainfall} mm</b>
            </div>

            <div className="panelMetric">
              <span>Soil saturation</span>
              <b>{selectedData.saturation}%</b>
            </div>

            <div className="panelMetric">
              <span>Slope</span>
              <b>{selectedData.slope}°</b>
            </div>

            <div className="panelMetric">
              <span>Recent landslides</span>
              <b>{selectedData.landslides}</b>
            </div>

            <div className="panelMetric">
              <span>Road blockages</span>
              <b>{selectedData.blockages}</b>
            </div>

            <button
              className="openDistrict"
              onClick={() => onDistrictSelect?.(selectedData.name)}
            >
              View Full Area Risk →
            </button>
          </div>
        )}

      </div>

      <div className="mapLegendNew">
        <span><i className="legendCritical"></i> Critical</span>
        <span><i className="legendHigh"></i> High</span>
        <span><i className="legendModerate"></i> Moderate</span>
        <span><i className="legendLow"></i> Low</span>
        <small>
          Risk zones are derived from SafeBhoomi's current district risk dataset.
        </small>
      </div>

      {loading && (
        <div className="mapLoading">
          <div className="loaderRing"></div>
          Loading Uttarakhand terrain intelligence…
        </div>
      )}

    </div>
  );
}
