
import streamlit as st
import pandas as pd
import folium

from streamlit_folium import st_folium

import sys
from pathlib import Path

# ---------------------------------------------------------
# PROJECT PATH
# ---------------------------------------------------------

PROJECT = Path("/content/landslide_project")

if str(PROJECT) not in sys.path:
    sys.path.insert(0, str(PROJECT))

from backend.risk_engine import calculate_risk


# ---------------------------------------------------------
# PAGE CONFIG
# ---------------------------------------------------------

st.set_page_config(
    page_title="SafeBhoomi",
    page_icon="⛰️",
    layout="wide",
    initial_sidebar_state="expanded",
)


# ---------------------------------------------------------
# CUSTOM UI
# ---------------------------------------------------------

st.markdown("""
<style>

html, body, [class*="css"] {
    font-family: Inter, Arial, sans-serif;
}

.stApp {
    background:
        radial-gradient(
            circle at 20% 10%,
            rgba(25, 100, 130, 0.12),
            transparent 35%
        ),
        #05090e;
    color: white;
}

section[data-testid="stSidebar"] {
    background: #071019;
    border-right: 1px solid rgba(100, 180, 220, 0.12);
}

.safe-title {
    font-size: 34px;
    font-weight: 800;
    letter-spacing: 2px;
    margin-bottom: 0;
}

.safe-subtitle {
    color: #7fa5b9;
    font-size: 13px;
    letter-spacing: 1px;
}

.section-title {
    font-size: 22px;
    font-weight: 700;
    margin-top: 10px;
}

.metric-card {
    background: linear-gradient(
        145deg,
        rgba(15, 31, 43, 0.96),
        rgba(7, 17, 25, 0.96)
    );
    border: 1px solid rgba(90, 170, 210, 0.14);
    border-radius: 14px;
    padding: 18px;
    min-height: 105px;
    transition: all 0.2s ease;
}

.metric-card:hover {
    transform: translateY(-3px);
    border-color: rgba(90, 200, 240, 0.35);
}

.metric-label {
    color: #7895a7;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.metric-value {
    color: white;
    font-size: 27px;
    font-weight: 750;
    margin-top: 5px;
}

.map-container {
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid rgba(100, 180, 220, 0.15);
}

button {
    transition:
        transform 0.12s ease,
        box-shadow 0.18s ease,
        border-color 0.18s ease !important;
}

button:hover {
    transform: translateY(-2px);
}

button:active {
    transform: translateY(1px) scale(0.99);
}

</style>
""", unsafe_allow_html=True)


# ---------------------------------------------------------
# LOAD DISTRICTS
# ---------------------------------------------------------

DISTRICTS_FILE = PROJECT / "data" / "districts.csv"

districts = pd.read_csv(DISTRICTS_FILE)


# ---------------------------------------------------------
# BASELINE RISK
# ---------------------------------------------------------

DISTRICT_BASE = {
    "Almora": 0.36,
    "Bageshwar": 0.42,
    "Chamoli": 0.55,
    "Champawat": 0.45,
    "Dehradun": 0.25,
    "Haridwar": 0.12,
    "Nainital": 0.50,
    "Pauri Garhwal": 0.48,
    "Pithoragarh": 0.52,
    "Rudraprayag": 0.55,
    "Tehri Garhwal": 0.47,
    "Udham Singh Nagar": 0.15,
    "Uttarkashi": 0.53,
}


# ---------------------------------------------------------
# RISK COLORS
# ---------------------------------------------------------

def risk_level(value):

    if value >= 0.75:
        return "CRITICAL", "#ef4444"

    elif value >= 0.50:
        return "HIGH", "#f97316"

    elif value >= 0.30:
        return "MODERATE", "#eab308"

    return "LOW", "#22c55e"


# ---------------------------------------------------------
# HEADER
# ---------------------------------------------------------

st.markdown(
    '<div class="safe-title">SAFEBHOOMI</div>',
    unsafe_allow_html=True
)

st.markdown(
    '<div class="safe-subtitle">'
    'LANDSLIDE INTELLIGENCE PLATFORM'
    '</div>',
    unsafe_allow_html=True
)

st.write("")


# ---------------------------------------------------------
# SIDEBAR
# ---------------------------------------------------------

st.sidebar.markdown("## SAFEBHOOMI")

st.sidebar.caption(
    "Observe • Predict • Respond"
)

page = st.sidebar.radio(
    "NAVIGATION",
    [
        "Live Map",
        "Area Risk",
        "Alerts",
        "Safe Route",
        "AI Analyst",
    ],
)

st.sidebar.divider()

st.sidebar.markdown("### SYSTEM")

st.sidebar.success("Risk Engine: ONLINE")
st.sidebar.success("District Data: ONLINE")


# ---------------------------------------------------------
# LIVE MAP
# ---------------------------------------------------------

if page == "Live Map":

    st.markdown(
        '<div class="section-title">Live Hazard Map</div>',
        unsafe_allow_html=True
    )

    st.caption(
        "Uttarakhand district-level landslide risk overview"
    )

    # -----------------------------------------------------
    # SUMMARY METRICS
    # -----------------------------------------------------

    risks = []

    for _, row in districts.iterrows():

        district = row["District"]

        base = DISTRICT_BASE.get(
            district,
            0.30
        )

        # Convert baseline susceptibility into
        # deterministic environmental values.
        rainfall = 35 + base * 100
        humidity = 60 + base * 30
        slope = base
        soil = base * 0.9

        result = calculate_risk(
            rainfall=rainfall,
            humidity=humidity,
            slope=slope,
            soil_saturation=soil,
            historical_factor=base,
        )

        risks.append(
            {
                "district": district,
                "lat": row["Latitude"],
                "lon": row["Longitude"],
                "risk": result["risk"],
                "level": result["level"],
            }
        )

    risk_df = pd.DataFrame(risks)

    critical_count = (
        risk_df["level"] == "CRITICAL"
    ).sum()

    high_count = (
        risk_df["level"] == "HIGH"
    ).sum()

    moderate_count = (
        risk_df["level"] == "MODERATE"
    ).sum()

    low_count = (
        risk_df["level"] == "LOW"
    ).sum()


    c1, c2, c3, c4 = st.columns(4)

    with c1:
        st.markdown(
            f"""
            <div class="metric-card">
                <div class="metric-label">Critical</div>
                <div class="metric-value">
                    {critical_count}
                </div>
            </div>
            """,
            unsafe_allow_html=True
        )

    with c2:
        st.markdown(
            f"""
            <div class="metric-card">
                <div class="metric-label">High Risk</div>
                <div class="metric-value">
                    {high_count}
                </div>
            </div>
            """,
            unsafe_allow_html=True
        )

    with c3:
        st.markdown(
            f"""
            <div class="metric-card">
                <div class="metric-label">Moderate</div>
                <div class="metric-value">
                    {moderate_count}
                </div>
            </div>
            """,
            unsafe_allow_html=True
        )

    with c4:
        st.markdown(
            f"""
            <div class="metric-card">
                <div class="metric-label">Low Risk</div>
                <div class="metric-value">
                    {low_count}
                </div>
            </div>
            """,
            unsafe_allow_html=True
        )


    st.write("")


    # -----------------------------------------------------
    # MAP
    # -----------------------------------------------------

    m = folium.Map(
        location=[30.20, 79.20],
        zoom_start=7,
        tiles="CartoDB dark_matter",
        control_scale=True,
    )


    for item in risks:

        level = item["level"]

        if level == "CRITICAL":
            color = "#ef4444"

        elif level == "HIGH":
            color = "#f97316"

        elif level == "MODERATE":
            color = "#eab308"

        else:
            color = "#22c55e"


        popup_html = f"""
        <div style="
            width:220px;
            font-family:Arial;
        ">

            <h3 style="
                margin-bottom:5px;
            ">
                {item["district"]}
            </h3>

            <hr>

            <b>Risk:</b>
            {item["risk"] * 100:.0f}%

            <br>

            <b>Level:</b>
            <span style="
                color:{color};
                font-weight:bold;
            ">
                {level}
            </span>

        </div>
        """


        folium.CircleMarker(
            location=[
                item["lat"],
                item["lon"]
            ],
            radius=13,
            color=color,
            fill=True,
            fill_color=color,
            fill_opacity=0.65,
            weight=2,
            popup=folium.Popup(
                popup_html,
                max_width=300
            ),
            tooltip=(
                f'{item["district"]} • {level}'
            ),
        ).add_to(m)


    # -----------------------------------------------------
    # LEGEND
    # -----------------------------------------------------

    legend_html = """
    <div style="
        position: fixed;
        bottom: 30px;
        left: 30px;
        z-index: 9999;
        background: rgba(5,10,15,0.92);
        padding: 12px 15px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,0.12);
        color: white;
        font-family: Arial;
        font-size: 12px;
    ">

        <b>RISK LEVEL</b><br><br>

        <span style="color:#22c55e;">●</span>
        LOW<br>

        <span style="color:#eab308;">●</span>
        MODERATE<br>

        <span style="color:#f97316;">●</span>
        HIGH<br>

        <span style="color:#ef4444;">●</span>
        CRITICAL

    </div>
    """

    m.get_root().html.add_child(
        folium.Element(legend_html)
    )


    st_folium(
        m,
        width=None,
        height=650,
        returned_objects=[],
    )


    st.info(
        "Map currently uses SafeBhoomi's baseline risk "
        "engine. Real environmental API data will be "
        "connected in the next stages."
    )


# ---------------------------------------------------------
# OTHER PAGES — TEMPORARY PLACEHOLDERS
# ---------------------------------------------------------

elif page == "Area Risk":

    st.markdown(
        '<div class="section-title">Area Risk</div>',
        unsafe_allow_html=True
    )

    st.info(
        "Area Risk intelligence module is coming next."
    )


elif page == "Alerts":

    st.markdown(
        '<div class="section-title">Alerts</div>',
        unsafe_allow_html=True
    )

    st.info(
        "Alert intelligence module will be connected "
        "after the risk/data layer."
    )


elif page == "Safe Route":

    st.markdown(
        '<div class="section-title">Safe Route</div>',
        unsafe_allow_html=True
    )

    st.info(
        "Safe Route engine will be connected after "
        "road and hazard data are integrated."
    )


elif page == "AI Analyst":

    st.markdown(
        '<div class="section-title">AI Analyst</div>',
        unsafe_allow_html=True
    )

    st.info(
        "Gemini-powered analysis will be connected "
        "after the core risk system is ready."
    )
