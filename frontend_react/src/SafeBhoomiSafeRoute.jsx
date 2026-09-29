
import React, { useMemo } from "react";

const LEVEL_ORDER = {
  LOW: 1,
  MODERATE: 2,
  HIGH: 3,
  CRITICAL: 4,
};

const LEVEL_COLOR = {
  LOW: "#22c55e",
  MODERATE: "#facc15",
  HIGH: "#f97316",
  CRITICAL: "#ef4444",
};

function getRouteLevel(districts = []) {
  let highest = "LOW";

  for (const district of districts) {
    const level =
      String(
        district.level ||
        district.risk_level ||
        "LOW"
      ).toUpperCase();

    if (
      (LEVEL_ORDER[level] || 0) >
      (LEVEL_ORDER[highest] || 0)
    ) {
      highest = level;
    }
  }

  return highest;
}

export default function SafeBhoomiSafeRoute({
  route = null,
  districts = [],
  onCalculate,
  loading = false,
}) {
  const highestRisk = useMemo(
    () => getRouteLevel(districts),
    [districts]
  );

  const routeColor =
    LEVEL_COLOR[highestRisk] ||
    LEVEL_COLOR.LOW;

  return (
    <section className="safebhoomi-route-panel">

      <div className="safebhoomi-route-heading">
        <div>
          <div className="safebhoomi-route-kicker">
            SAFE ROUTE INTELLIGENCE
          </div>

          <h2>
            Risk-Aware Route
          </h2>

          <p>
            Route assessment uses the same district
            risk intelligence as the live map.
          </p>
        </div>

        <button
          className="safebhoomi-route-button"
          onClick={onCalculate}
          disabled={loading}
        >
          {loading
            ? "Calculating..."
            : "Calculate Safer Route"}
        </button>
      </div>

      {route && (
        <div className="safebhoomi-route-result">

          <div className="safebhoomi-route-status">
            <span
              className="route-risk-dot"
              style={{
                background: routeColor,
              }}
            />

            <div>
              <strong>
                {highestRisk === "LOW"
                  ? "Lower modeled risk route"
                  : `${highestRisk} risk encountered`}
              </strong>

              <span>
                Route risk is based on the
                districts crossed by the route.
              </span>
            </div>
          </div>

          <div className="safebhoomi-route-districts">

            {districts.map((district, index) => {
              const level =
                String(
                  district.level ||
                  district.risk_level ||
                  "LOW"
                ).toUpperCase();

              return (
                <div
                  className="route-district"
                  key={`${district.name}-${index}`}
                >
                  <span>
                    {district.name ||
                      district.district}
                  </span>

                  <b
                    style={{
                      color:
                        LEVEL_COLOR[level] ||
                        "#94a3b8",
                    }}
                  >
                    {level}
                  </b>
                </div>
              );
            })}

          </div>

          <div className="safebhoomi-route-disclaimer">
            This is a modeled risk assessment, not a
            guarantee that a road is physically safe or
            currently open.
          </div>
        </div>
      )}

    </section>
  );
}
