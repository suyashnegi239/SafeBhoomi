
import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

function MapResizeFix() {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => clearTimeout(timer);
  }, [map]);

  return null;
}

function riskColor(level) {
  const value = String(level || "").toUpperCase();

  if (value === "CRITICAL") return "#ff3b30";
  if (value === "HIGH") return "#ff8a00";
  if (value === "MODERATE") return "#ffd60a";
  return "#34c759";
}

function riskLabel(level) {
  const value = String(level || "").toUpperCase();

  if (value === "CRITICAL") return "Critical";
  if (value === "HIGH") return "High";
  if (value === "MODERATE") return "Moderate";
  return "Low";
}

export default function SafeBhoomiLiveMap({ onDistrictSelect }) {
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);

  async function loadMapData() {
    try {
      setLoading(true);

      const response = await fetch("/safebhoomi_districts.json");

      if (!response.ok) {
        throw new Error("Unable to load district data");
      }

      const data = await response.json();

      setDistricts(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("SafeBhoomi map error:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMapData();

    const interval = setInterval(loadMapData, 60000);

    return () => clearInterval(interval);
  }, []);

  const statistics = useMemo(() => {
    return {
      critical: districts.filter(
        d => String(d.risk_level).toUpperCase() === "CRITICAL"
      ).length,

      high: districts.filter(
        d => String(d.risk_level).toUpperCase() === "HIGH"
      ).length,

      moderate: districts.filter(
        d => String(d.risk_level).toUpperCase() === "MODERATE"
      ).length,

      low: districts.filter(
        d => String(d.risk_level).toUpperCase() === "LOW"
      ).length
    };
  }, [districts]);

  return (
    <div className="safeBhoomiMapShell">

      <div className="safeBhoomiMapHeader">

        <div>
          <div className="safeBhoomiMapTitle">
            LIVE LANDSLIDE RISK MAP
          </div>

          <div className="safeBhoomiMapSubtitle">
            Uttarakhand district-level hazard intelligence
          </div>
        </div>

        <button
          className="safeBhoomiMapRefresh"
          onClick={loadMapData}
          disabled={loading}
        >
          {loading ? "UPDATING..." : "↻ REFRESH"}
        </button>

      </div>

      <div className="safeBhoomiMapStats">

        <div>
          <strong>{statistics.critical}</strong>
          <span>CRITICAL</span>
        </div>

        <div>
          <strong>{statistics.high}</strong>
          <span>HIGH</span>
        </div>

        <div>
          <strong>{statistics.moderate}</strong>
          <span>MODERATE</span>
        </div>

        <div>
          <strong>{statistics.low}</strong>
          <span>LOW</span>
        </div>

      </div>

      <div className="safeBhoomiMapContainer">

        <MapContainer
          center={[30.0668, 79.0193]}
          zoom={7}
          minZoom={6}
          maxZoom={11}
          scrollWheelZoom={true}
          style={{
            width: "100%",
            height: "100%",
            minHeight: "560px"
          }}
        >

          <MapResizeFix />

          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {districts.map((district) => {

            const isSelected =
              selectedDistrict === district.district;

            const radius =
              Math.max(10, Math.min(24, district.risk_score / 3));

            return (
              <CircleMarker
                key={district.district}
                center={[
                  district.latitude,
                  district.longitude
                ]}
                radius={isSelected ? radius + 5 : radius}
                pathOptions={{
                  color: riskColor(district.risk_level),
                  fillColor: riskColor(district.risk_level),
                  fillOpacity: 0.72,
                  weight: isSelected ? 4 : 2
                }}
                eventHandlers={{
                  click: () => {
                    setSelectedDistrict(district.district);

                    if (onDistrictSelect) {
                      onDistrictSelect(district.district);
                    }
                  }
                }}
              >

                <Popup>

                  <div style={{
                    minWidth: "220px",
                    fontFamily: "Arial, sans-serif"
                  }}>

                    <h3 style={{
                      margin: "0 0 8px 0"
                    }}>
                      {district.district}
                    </h3>

                    <div style={{
                      fontWeight: "700",
                      color: riskColor(district.risk_level),
                      marginBottom: "10px"
                    }}>
                      {riskLabel(district.risk_level)} RISK
                    </div>

                    <div>
                      Risk Score:
                      <strong> {district.risk_score}</strong>
                    </div>

                    <div>
                      Rainfall:
                      <strong> {district.rainfall_mm} mm</strong>
                    </div>

                    <div>
                      Soil Saturation:
                      <strong> {district.soil_saturation_pct}%</strong>
                    </div>

                    <div>
                      Recent Landslides:
                      <strong> {district.recent_landslides}</strong>
                    </div>

                    <div>
                      Slope:
                      <strong> {district.slope_deg}°</strong>
                    </div>

                    <div>
                      Road Blockages:
                      <strong> {district.road_blockages}</strong>
                    </div>

                    {onDistrictSelect && (
                      <button
                        style={{
                          marginTop: "12px",
                          width: "100%",
                          padding: "8px",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer"
                        }}
                        onClick={() =>
                          onDistrictSelect(district.district)
                        }
                      >
                        OPEN AREA RISK
                      </button>
                    )}

                  </div>

                </Popup>

              </CircleMarker>
            );
          })}

        </MapContainer>

        <div className="safeBhoomiMapLegend">

          <div className="legendTitle">
            RISK LEVEL
          </div>

          <div>
            <span className="legendDot critical"></span>
            Critical
          </div>

          <div>
            <span className="legendDot high"></span>
            High
          </div>

          <div>
            <span className="legendDot moderate"></span>
            Moderate
          </div>

          <div>
            <span className="legendDot low"></span>
            Low
          </div>

        </div>

      </div>

      <div className="safeBhoomiMapFooter">

        <span>
          ● LIVE DATA LAYER
        </span>

        <span>
          {lastUpdated
            ? `Updated ${lastUpdated.toLocaleTimeString()}`
            : "Initializing..."}
        </span>

      </div>

    </div>
  );
}
