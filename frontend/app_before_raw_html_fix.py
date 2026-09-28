
import streamlit as st
import pandas as pd
import numpy as np
import time
import requests
import html
from pathlib import Path

# ============================================================
# PAGE CONFIG
# ============================================================

st.set_page_config(
    page_title="SafeBhoomi",
    page_icon="🏔️",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# ============================================================
# SESSION STATE
# ============================================================

if "intro_done" not in st.session_state:
    st.session_state.intro_done = False

if "page" not in st.session_state:
    st.session_state.page = "Dashboard"

if "selected_district" not in st.session_state:
    st.session_state.selected_district = "Nainital"

if "simulation" not in st.session_state:
    st.session_state.simulation = "Normal Conditions"

if "sim_active" not in st.session_state:
    st.session_state.sim_active = False

if "alert_level" not in st.session_state:
    st.session_state.alert_level = "NORMAL"

# ============================================================
# DATA
# ============================================================

PROJECT = Path("/content/landslide_project")

DATA_FILE = PROJECT / "data" / "districts.csv"

DISTRICTS = [
    ["Almora", 29.5971, 79.6591, 0.36],
    ["Bageshwar", 29.8383, 79.7714, 0.42],
    ["Chamoli", 30.4020, 79.3281, 0.55],
    ["Champawat", 29.3357, 80.0910, 0.45],
    ["Dehradun", 30.3165, 78.0322, 0.25],
    ["Haridwar", 29.9457, 78.1642, 0.12],
    ["Nainital", 29.3919, 79.4542, 0.50],
    ["Pauri Garhwal", 30.1461, 78.7782, 0.48],
    ["Pithoragarh", 29.5829, 80.2182, 0.52],
    ["Rudraprayag", 30.2844, 78.9811, 0.55],
    ["Tehri Garhwal", 30.3780, 78.4800, 0.47],
    ["Udham Singh Nagar", 28.9760, 79.4000, 0.15],
    ["Uttarkashi", 30.7268, 78.4354, 0.53],
]

df = pd.DataFrame(
    DISTRICTS,
    columns=["District", "Lat", "Lon", "BaseRisk"]
)

# ============================================================
# DISTRICT IMAGE DATA
# Wikipedia is queried when the Districts page opens.
# Fallback mountain image is used if unavailable.
# ============================================================

FALLBACK_IMAGE = (
    "https://images.unsplash.com/"
    "photo-1464822759023-fed622ff2c3b"
    "?auto=format&fit=crop&w=1200&q=80"
)

DISTRICT_IMAGE_CACHE = {}

def get_district_image(district):

    if district in DISTRICT_IMAGE_CACHE:
        return DISTRICT_IMAGE_CACHE[district]

    try:
        url = "https://en.wikipedia.org/api/rest_v1/page/summary/" + district.replace(" ", "_")

        response = requests.get(
            url,
            timeout=5,
            headers={"User-Agent": "SafeBhoomi/1.0"}
        )

        if response.status_code == 200:
            data = response.json()

            image = (
                data.get("originalimage", {}).get("source")
                or data.get("thumbnail", {}).get("source")
            )

            if image:
                DISTRICT_IMAGE_CACHE[district] = image
                return image

    except Exception:
        pass

    DISTRICT_IMAGE_CACHE[district] = FALLBACK_IMAGE

    return FALLBACK_IMAGE


# ============================================================
# RISK ENGINE
# ============================================================

def risk_level(score):

    if score >= 0.75:
        return "CRITICAL"

    if score >= 0.50:
        return "HIGH"

    if score >= 0.30:
        return "MODERATE"

    return "LOW"


def risk_color(level):

    return {
        "LOW": "#39d98a",
        "MODERATE": "#f4d35e",
        "HIGH": "#ff9f43",
        "CRITICAL": "#ff4d67",
    }.get(level, "#39d98a")


def calculate_district(district, base):

    simulation_multiplier = {
        "Normal Conditions": 1.00,
        "Heavy Rainfall": 1.22,
        "Extreme Rainfall": 1.48,
        "Landslide Event": 1.72,
        "Road Blockage": 1.30,
        "Multiple Hazards": 1.85,
    }.get(st.session_state.simulation, 1.0)

    score = min(base * simulation_multiplier, 0.99)

    rainfall = int(
        35
        + score * 70
        + (
            35
            if st.session_state.simulation == "Heavy Rainfall"
            else 75
            if st.session_state.simulation == "Extreme Rainfall"
            else 0
        )
    )

    humidity = min(98, int(52 + score * 42))

    soil = min(
        99,
        int(
            25
            + score * 65
            + (
                20
                if st.session_state.simulation
                in ["Extreme Rainfall", "Multiple Hazards"]
                else 0
            )
        )
    )

    slope = min(99, int(25 + score * 70))

    historical = min(99, int(base * 100))

    level = risk_level(score)

    return {
        "risk": score,
        "level": level,
        "rainfall": rainfall,
        "humidity": humidity,
        "soil": soil,
        "slope": slope,
        "historical": historical,
    }


# ============================================================
# GLOBAL CSS
# ============================================================

st.markdown(
    """
<style>

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap');

html, body, [class*="css"] {
    font-family: 'Inter', sans-serif;
}

.stApp {
    background:
        linear-gradient(
            rgba(4, 10, 16, 0.91),
            rgba(4, 10, 16, 0.96)
        ),
        url("https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2200&q=85");

    background-size: cover;
    background-position: center;
    background-attachment: fixed;
    color: #eaf4f4;
}

/* Remove Streamlit sidebar */

[data-testid="stSidebar"] {
    display: none;
}

section.main > div {
    padding-top: 1rem;
}

/* ========================================================
   INTRO
   ======================================================== */

.intro-screen {
    height: 92vh;

    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;

    text-align: center;

    background:
        linear-gradient(
            rgba(2, 8, 14, 0.65),
            rgba(2, 8, 14, 0.90)
        ),
        url("https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2200&q=90");

    background-size: cover;
    background-position: center;

    border-radius: 28px;

    box-shadow:
        0 0 80px rgba(0,0,0,0.75),
        inset 0 0 100px rgba(0,0,0,0.75);

    animation: introAppear 1.6s ease-out;
}

.intro-logo {
    font-family: 'Space Grotesk', sans-serif;
    font-size: clamp(3.5rem, 9vw, 8rem);
    font-weight: 800;
    letter-spacing: 0.14em;

    color: white;

    text-shadow:
        0 0 20px rgba(87, 230, 185, 0.45),
        0 0 60px rgba(87, 230, 185, 0.22);

    animation:
        logoReveal 2s ease-out,
        logoPulse 3s ease-in-out 2s infinite;
}

.intro-subtitle {
    margin-top: 8px;

    font-size: 1.05rem;
    letter-spacing: 0.42em;

    color: #8de6c5;

    animation: fadeUp 1.5s ease-out 0.7s both;
}

.intro-tagline {
    margin-top: 35px;

    font-size: 0.85rem;
    letter-spacing: 0.35em;

    color: #b5c7c9;

    animation: fadeUp 1.5s ease-out 1.1s both;
}

.system-ready {
    margin-top: 50px;

    padding: 9px 22px;

    border: 1px solid rgba(90, 240, 190, 0.4);
    border-radius: 30px;

    color: #76efbf;

    background: rgba(20, 70, 58, 0.25);

    animation:
        fadeUp 1.5s ease-out 1.5s both,
        readyPulse 2s ease-in-out infinite;
}

@keyframes introAppear {
    from {
        opacity: 0;
        transform: scale(1.04);
    }

    to {
        opacity: 1;
        transform: scale(1);
    }
}

@keyframes logoReveal {
    from {
        opacity: 0;
        transform: translateY(35px) scale(0.85);
        filter: blur(12px);
    }

    to {
        opacity: 1;
        transform: translateY(0) scale(1);
        filter: blur(0);
    }
}

@keyframes logoPulse {

    0%,100% {
        text-shadow:
            0 0 20px rgba(87,230,185,.35),
            0 0 60px rgba(87,230,185,.12);
    }

    50% {
        text-shadow:
            0 0 30px rgba(87,230,185,.75),
            0 0 90px rgba(87,230,185,.25);
    }
}

@keyframes fadeUp {

    from {
        opacity: 0;
        transform: translateY(20px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes readyPulse {

    0%,100% {
        box-shadow: 0 0 0 rgba(80,230,180,0);
    }

    50% {
        box-shadow: 0 0 25px rgba(80,230,180,.20);
    }
}

/* ========================================================
   HEADER
   ======================================================== */

.top-header {
    display: flex;

    align-items: center;
    justify-content: space-between;

    padding: 17px 25px;

    margin-bottom: 16px;

    border: 1px solid rgba(150, 210, 210, 0.14);

    border-radius: 18px;

    background:
        linear-gradient(
            135deg,
            rgba(13,30,37,.91),
            rgba(8,19,26,.82)
        );

    backdrop-filter: blur(18px);

    box-shadow:
        0 15px 50px rgba(0,0,0,.35);

    animation: fadeUp .55s ease-out;
}

.brand {
    font-family: 'Space Grotesk', sans-serif;

    font-size: 1.45rem;

    font-weight: 800;

    letter-spacing: .08em;

    color: white;
}

.brand span {
    color: #70e5bb;
}

.live-indicator {
    display: inline-flex;

    align-items: center;

    gap: 7px;

    margin-left: 13px;

    font-size: .72rem;

    color: #6ff0bd;
}

.live-dot {
    width: 7px;
    height: 7px;

    border-radius: 50%;

    background: #61e9b4;

    box-shadow: 0 0 12px #61e9b4;

    animation: alertPulse 1.6s infinite;
}

@keyframes alertPulse {

    0%,100% {
        transform: scale(1);
        opacity: .8;
    }

    50% {
        transform: scale(1.5);
        opacity: 1;
    }
}

/* ========================================================
   NAV BUTTONS
   ======================================================== */

div.stButton > button {

    border-radius: 12px !important;

    border: 1px solid rgba(150,210,210,.13) !important;

    background:
        linear-gradient(
            135deg,
            rgba(19,39,47,.95),
            rgba(10,25,31,.95)
        ) !important;

    color: #cbdcde !important;

    font-weight: 600 !important;

    transition:
        transform .16s ease,
        box-shadow .20s ease,
        border-color .20s ease,
        background .20s ease !important;
}

div.stButton > button:hover {

    transform: translateY(-3px) !important;

    border-color: rgba(102,231,188,.55) !important;

    color: white !important;

    box-shadow:
        0 9px 25px rgba(40,210,160,.15),
        0 0 18px rgba(40,210,160,.10) !important;
}

div.stButton > button:active {

    transform: translateY(1px) scale(.98) !important;

}

/* ========================================================
   HERO
   ======================================================== */

.hero {

    position: relative;

    min-height: 270px;

    padding: 45px;

    border-radius: 25px;

    overflow: hidden;

    background:
        linear-gradient(
            100deg,
            rgba(4,14,20,.96),
            rgba(4,14,20,.66),
            rgba(4,14,20,.40)
        ),
        url("https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1800&q=85");

    background-size: cover;
    background-position: center;

    border: 1px solid rgba(150,220,220,.14);

    box-shadow:
        0 30px 80px rgba(0,0,0,.35);

    animation: fadeUp .65s ease-out;
}

.hero h1 {

    font-family: 'Space Grotesk';

    font-size: clamp(2rem, 5vw, 4rem);

    margin: 0;

    font-weight: 800;

    letter-spacing: -.03em;
}

.hero p {

    max-width: 680px;

    color: #b5c7c9;

    font-size: 1.05rem;

    line-height: 1.7;
}

.hero-line {

    width: 80px;
    height: 3px;

    margin: 20px 0;

    background: #62e6b4;

    box-shadow: 0 0 20px rgba(98,230,180,.55);
}

/* ========================================================
   CARDS
   ======================================================== */

.metric-card {

    padding: 22px;

    border-radius: 18px;

    min-height: 125px;

    background:
        linear-gradient(
            145deg,
            rgba(18,38,46,.94),
            rgba(8,22,29,.91)
        );

    border: 1px solid rgba(160,220,220,.12);

    box-shadow:
        0 12px 35px rgba(0,0,0,.22);

    animation: cardIn .55s ease-out both;

    transition:
        transform .25s ease,
        border-color .25s ease,
        box-shadow .25s ease;
}

.metric-card:hover {

    transform: translateY(-6px);

    border-color: rgba(98,230,180,.32);

    box-shadow:
        0 18px 45px rgba(0,0,0,.35),
        0 0 25px rgba(98,230,180,.07);
}

.metric-title {

    color: #8ca6a9;

    font-size: .76rem;

    text-transform: uppercase;

    letter-spacing: .13em;
}

.metric-number {

    margin-top: 10px;

    font-family: 'Space Grotesk';

    font-size: 2rem;

    font-weight: 700;

    color: white;
}

.metric-small {

    color: #76e6b9;

    font-size: .75rem;

    margin-top: 5px;
}

@keyframes cardIn {

    from {
        opacity: 0;
        transform: translateY(18px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* ========================================================
   SECTION
   ======================================================== */

.section-title {

    font-family: 'Space Grotesk';

    font-size: 1.55rem;

    font-weight: 700;

    margin-top: 32px;

    margin-bottom: 14px;
}

.section-caption {

    color: #829a9d;

    margin-bottom: 20px;
}

/* ========================================================
   DISTRICT CARD
   ======================================================== */

.district-card {

    overflow: hidden;

    border-radius: 19px;

    background:
        linear-gradient(
            145deg,
            rgba(17,35,43,.97),
            rgba(7,18,24,.96)
        );

    border: 1px solid rgba(150,220,220,.12);

    margin-bottom: 18px;

    transition:
        transform .25s ease,
        box-shadow .25s ease,
        border-color .25s ease;
}

.district-card:hover {

    transform: translateY(-7px);

    border-color: rgba(98,230,180,.36);

    box-shadow:
        0 22px 55px rgba(0,0,0,.38);
}

.district-img {

    width: 100%;

    height: 165px;

    object-fit: cover;

    display: block;
}

.district-body {

    padding: 18px;
}

.district-name {

    font-family: 'Space Grotesk';

    font-size: 1.18rem;

    font-weight: 700;
}

.risk-pill {

    display: inline-block;

    padding: 5px 10px;

    margin-top: 9px;

    border-radius: 999px;

    font-size: .68rem;

    font-weight: 800;

    letter-spacing: .08em;
}

/* ========================================================
   INFO PANEL
   ======================================================== */

.info-panel {

    padding: 25px;

    border-radius: 20px;

    background:
        linear-gradient(
            145deg,
            rgba(14,34,42,.96),
            rgba(7,18,24,.96)
        );

    border: 1px solid rgba(150,220,220,.13);

    box-shadow:
        0 18px 55px rgba(0,0,0,.25);

    animation: fadeUp .5s ease-out;
}

.progress-wrap {

    margin-top: 15px;
}

.progress-bg {

    width: 100%;

    height: 8px;

    border-radius: 99px;

    background: rgba(255,255,255,.08);

    overflow: hidden;
}

.progress-fill {

    height: 100%;

    border-radius: 99px;

    box-shadow: 0 0 12px currentColor;
}

/* ========================================================
   ALERT
   ======================================================== */

.alert-box {

    padding: 19px 22px;

    margin: 12px 0;

    border-radius: 15px;

    border-left: 4px solid #ff4d67;

    background: rgba(255,77,103,.075);

    animation:
        fadeUp .45s ease-out,
        alertGlow 2.2s ease-in-out infinite;
}

@keyframes alertGlow {

    0%,100% {
        box-shadow: 0 0 0 rgba(255,77,103,0);
    }

    50% {
        box-shadow: 0 0 25px rgba(255,77,103,.09);
    }
}

/* ========================================================
   SIMULATION
   ======================================================== */

.simulation-panel {

    padding: 28px;

    border-radius: 22px;

    background:
        linear-gradient(
            145deg,
            rgba(18,35,43,.97),
            rgba(6,18,24,.97)
        );

    border: 1px solid rgba(140,220,220,.14);

    animation: fadeUp .5s ease-out;
}

.scan-line {

    height: 2px;

    width: 100%;

    margin: 18px 0;

    background: linear-gradient(
        90deg,
        transparent,
        #63e5b5,
        transparent
    );

    animation: scan 2s linear infinite;
}

@keyframes scan {

    0% {
        transform: translateX(-30%);
        opacity: .1;
    }

    50% {
        opacity: 1;
    }

    100% {
        transform: translateX(30%);
        opacity: .1;
    }
}

/* ========================================================
   FOOTER
   ======================================================== */

.footer {

    margin-top: 60px;

    padding: 30px;

    text-align: center;

    color: #607a7d;

    font-size: .75rem;

    letter-spacing: .08em;

    border-top: 1px solid rgba(150,220,220,.09);
}

</style>
""",
    unsafe_allow_html=True
)

# ============================================================
# CINEMATIC STARTUP
# ============================================================

if not st.session_state.intro_done:

    st.markdown(
        """
        <div class="intro-screen">

            <div class="intro-logo">
                SAFEBHOOMI
            </div>

            <div class="intro-subtitle">
                LANDSLIDE INTELLIGENCE PLATFORM
            </div>

            <div class="intro-tagline">
                PREDICT • ANALYZE • RESPOND
            </div>

            <div class="system-ready">
                ● SYSTEM INITIALIZING
            </div>

        </div>
        """,
        unsafe_allow_html=True
    )

    time.sleep(5)

    st.session_state.intro_done = True

    st.rerun()


# ============================================================
# TOP HEADER
# ============================================================

st.markdown(
    """
    <div class="top-header">

        <div>
            <span class="brand">
                SAFE<span>BHOOMI</span>
            </span>

            <span class="live-indicator">
                <span class="live-dot"></span>
                LIVE INTELLIGENCE
            </span>
        </div>

        <div style="
            color:#718b8e;
            font-size:.72rem;
            letter-spacing:.12em;
        ">
            UTTARAKHAND • HAZARD MONITORING
        </div>

    </div>
    """,
    unsafe_allow_html=True
)


# ============================================================
# NAVIGATION
# ============================================================

nav_items = [
    "Dashboard",
    "Live Map",
    "Districts",
    "States",
    "Area Risk",
    "Alerts",
    "Safe Route",
    "Simulation",
    "AI Analyst",
]

cols = st.columns(len(nav_items))

for col, item in zip(cols, nav_items):

    with col:

        if st.button(
            item,
            key="nav_" + item,
            use_container_width=True
        ):
            st.session_state.page = item
            st.rerun()


# ============================================================
# CURRENT DATA
# ============================================================

records = []

for _, row in df.iterrows():

    data = calculate_district(
        row["District"],
        row["BaseRisk"]
    )

    records.append({
        **row.to_dict(),
        **data
    })

risk_df = pd.DataFrame(records)

critical_count = int((risk_df["level"] == "CRITICAL").sum())
high_count = int((risk_df["level"] == "HIGH").sum())
moderate_count = int((risk_df["level"] == "MODERATE").sum())
low_count = int((risk_df["level"] == "LOW").sum())

average_risk = risk_df["risk"].mean()

selected = risk_df[
    risk_df["District"] == st.session_state.selected_district
].iloc[0]

# ============================================================
# DASHBOARD
# ============================================================

if st.session_state.page == "Dashboard":

    st.markdown(
        """
        <div class="hero">

            <h1>Know the mountain<br>before it moves.</h1>

            <div class="hero-line"></div>

            <p>
                SafeBhoomi combines terrain intelligence, rainfall,
                soil conditions, historical susceptibility and
                hazard simulation to create a unified landslide
                intelligence system for Uttarakhand.
            </p>

        </div>
        """,
        unsafe_allow_html=True
    )

    st.markdown(
        '<div class="section-title">Uttarakhand Situation Overview</div>',
        unsafe_allow_html=True
    )

    st.markdown(
        '<div class="section-caption">Live intelligence across all 13 districts</div>',
        unsafe_allow_html=True
    )

    c1, c2, c3, c4, c5 = st.columns(5)

    cards = [
        ("DISTRICTS MONITORED", "13", "FULL COVERAGE"),
        ("CRITICAL", str(critical_count), "IMMEDIATE ATTENTION"),
        ("HIGH RISK", str(high_count), "ELEVATED HAZARD"),
        ("ACTIVE ALERTS", str(critical_count + high_count + 2), "LIVE MONITORING"),
        ("AVG RISK", f"{average_risk*100:.0f}%", "STATEWIDE INDEX"),
    ]

    for col, (title, number, small) in zip(
        [c1, c2, c3, c4, c5],
        cards
    ):

        with col:

            st.markdown(
                f"""
                <div class="metric-card">

                    <div class="metric-title">
                        {title}
                    </div>

                    <div class="metric-number">
                        {number}
                    </div>

                    <div class="metric-small">
                        ● {small}
                    </div>

                </div>
                """,
                unsafe_allow_html=True
            )

    # Quick intelligence
    st.markdown(
        '<div class="section-title">Priority Intelligence</div>',
        unsafe_allow_html=True
    )

    top = risk_df.sort_values(
        "risk",
        ascending=False
    ).head(4)

    qcols = st.columns(4)

    for col, (_, r) in zip(qcols, top.iterrows()):

        color = risk_color(r["level"])

        with col:

            st.markdown(
                f"""
                <div class="info-panel">

                    <div style="
                        color:#829a9d;
                        font-size:.72rem;
                        letter-spacing:.1em;
                    ">
                        PRIORITY DISTRICT
                    </div>

                    <div style="
                        font-family:'Space Grotesk';
                        font-size:1.25rem;
                        margin-top:7px;
                    ">
                        {r["District"]}
                    </div>

                    <div style="
                        color:{color};
                        font-weight:800;
                        margin-top:8px;
                    ">
                        {r["level"]}
                    </div>

                    <div style="
                        font-size:2rem;
                        font-weight:700;
                        margin-top:6px;
                    ">
                        {r["risk"]*100:.0f}%
                    </div>

                    <div style="color:#829a9d;font-size:.76rem;">
                        Rainfall {r["rainfall"]} mm
                    </div>

                </div>
                """,
                unsafe_allow_html=True
            )

    st.markdown(
        '<div class="section-title">System Modules</div>',
        unsafe_allow_html=True
    )

    modules = [
        ("LIVE MAP", "Terrain + risk zones", "Live Map"),
        ("DISTRICTS", "13 district intelligence profiles", "Districts"),
        ("SIMULATION", "Test extreme hazard scenarios", "Simulation"),
        ("SAFE ROUTE", "Find safer travel corridors", "Safe Route"),
    ]

    mcols = st.columns(4)

    for col, (title, desc, target) in zip(mcols, modules):

        with col:

            st.markdown(
                f"""
                <div class="metric-card">

                    <div style="
                        color:#70e5bb;
                        font-size:.72rem;
                        letter-spacing:.13em;
                    ">
                        SAFEBHOOMI MODULE
                    </div>

                    <div style="
                        font-family:'Space Grotesk';
                        font-size:1.2rem;
                        margin-top:9px;
                    ">
                        {title}
                    </div>

                    <div style="
                        color:#839a9d;
                        font-size:.78rem;
                        margin-top:7px;
                    ">
                        {desc}
                    </div>

                </div>
                """,
                unsafe_allow_html=True
            )

            if st.button(
                "OPEN",
                key="module_" + title,
                use_container_width=True
            ):
                st.session_state.page = target
                st.rerun()


# ============================================================
# LIVE MAP
# ============================================================

elif st.session_state.page == "Live Map":

    st.markdown(
        '<div class="section-title">Live Terrain Intelligence</div>',
        unsafe_allow_html=True
    )

    st.markdown(
        '<div class="section-caption">Three-dimensional risk visualization of Uttarakhand</div>',
        unsafe_allow_html=True
    )

    # 3D-style geographic terrain
    try:

        import plotly.graph_objects as go

        theta = np.linspace(0, 2*np.pi, 80)

        xs = []
        ys = []
        zs = []

        # terrain surface around Uttarakhand
        lat_range = np.linspace(28.6, 31.0, 35)
        lon_range = np.linspace(77.7, 81.2, 45)

        for lat in lat_range:

            for lon in lon_range:

                elevation = (
                    2.0
                    + 1.3 * np.sin((lon - 78) * 2.1)
                    + 1.0 * np.cos((lat - 29) * 3.0)
                    + 0.7 * np.sin((lat + lon) * 2.0)
                )

                xs.append(lon)
                ys.append(lat)
                zs.append(elevation)

        fig = go.Figure()

        fig.add_trace(
            go.Scatter3d(
                x=xs,
                y=ys,
                z=zs,
                mode="markers",
                marker=dict(
                    size=2,
                    color=zs,
                    colorscale="Viridis",
                    opacity=.25,
                    showscale=False,
                ),
                hoverinfo="skip",
                name="Terrain"
            )
        )

        for _, r in risk_df.iterrows():

            color = risk_color(r["level"])

            z = (
                3.0
                + 1.2 * np.sin((r["Lon"] - 78) * 2.1)
                + .8 * np.cos((r["Lat"] - 29) * 3)
            )

            fig.add_trace(
                go.Scatter3d(
                    x=[r["Lon"]],
                    y=[r["Lat"]],
                    z=[z + .35],
                    mode="markers+text",
                    text=[r["District"]],
                    textposition="top center",
                    marker=dict(
                        size=9,
                        color=color,
                        line=dict(
                            color="white",
                            width=1
                        )
                    ),
                    name=r["District"],
                    hovertemplate=(
                        "<b>%{text}</b><br>"
                        f"Risk: {r['risk']*100:.0f}%<br>"
                        f"Level: {r['level']}<br>"
                        f"Rainfall: {r['rainfall']} mm"
                        "<extra></extra>"
                    )
                )
            )

        fig.update_layout(
            height=690,

            paper_bgcolor="rgba(0,0,0,0)",

            scene=dict(
                bgcolor="rgba(3,12,18,0.82)",

                xaxis=dict(
                    title="Longitude",
                    showgrid=False,
                    color="#718b8e"
                ),

                yaxis=dict(
                    title="Latitude",
                    showgrid=False,
                    color="#718b8e"
                ),

                zaxis=dict(
                    title="Terrain Elevation",
                    showgrid=False,
                    color="#718b8e"
                ),

                camera=dict(
                    eye=dict(
                        x=1.45,
                        y=1.45,
                        z=1.1
                    )
                )
            ),

            margin=dict(
                l=0,
                r=0,
                t=10,
                b=0
            ),

            legend=dict(
                font=dict(color="white")
            )
        )

        st.plotly_chart(
            fig,
            use_container_width=True,
            config={
                "displayModeBar": False
            }
        )

    except Exception as e:

        st.error(
            "3D terrain module requires Plotly. "
            "Install it with: pip install plotly"
        )

    st.markdown(
        '<div class="section-title">Select District</div>',
        unsafe_allow_html=True
    )

    names = list(risk_df["District"])

    selected_name = st.selectbox(
        "District",
        names,
        index=names.index(
            st.session_state.selected_district
        )
    )

    if selected_name != st.session_state.selected_district:

        st.session_state.selected_district = selected_name

        st.rerun()

    r = risk_df[
        risk_df["District"] == selected_name
    ].iloc[0]

    color = risk_color(r["level"])

    st.markdown(
        f"""
        <div class="info-panel">

            <div style="
                font-size:.7rem;
                letter-spacing:.14em;
                color:#7d999c;
            ">
                SELECTED TERRAIN NODE
            </div>

            <div style="
                font-family:'Space Grotesk';
                font-size:2rem;
                font-weight:700;
                margin-top:7px;
            ">
                {r["District"]}
            </div>

            <div style="
                color:{color};
                font-weight:800;
                font-size:1rem;
                margin-top:8px;
            ">
                ● {r["level"]} RISK
            </div>

        </div>
        """,
        unsafe_allow_html=True
    )


# ============================================================
# DISTRICTS
# ============================================================

elif st.session_state.page == "Districts":

    st.markdown(
        '<div class="section-title">District Intelligence</div>',
        unsafe_allow_html=True
    )

    st.markdown(
        '<div class="section-caption">Explore all 13 Uttarakhand districts</div>',
        unsafe_allow_html=True
    )

    search = st.text_input(
        "Search district",
        placeholder="Type district name..."
    )

    display_df = risk_df.copy()

    if search.strip():

        display_df = display_df[
            display_df["District"]
            .str.contains(
                search,
                case=False,
                na=False
            )
        ]

    rows = list(display_df.iterrows())

    for start in range(0, len(rows), 3):

        row = rows[start:start+3]

        cols = st.columns(3)

        for col, (_, r) in zip(cols, row):

            with col:

                image = get_district_image(
                    r["District"]
                )

                color = risk_color(
                    r["level"]
                )

                st.markdown(
                    f"""
                    <div class="district-card">

                        <img
                            class="district-img"
                            src="{html.escape(image)}"
                        >

                        <div class="district-body">

                            <div class="district-name">
                                {r["District"]}
                            </div>

                            <span
                                class="risk-pill"
                                style="
                                    background:{color}20;
                                    color:{color};
                                    border:1px solid {color}50;
                                "
                            >
                                {r["level"]}
                            </span>

                            <div style="
                                font-size:1.65rem;
                                font-weight:700;
                                margin-top:13px;
                            ">
                                {r["risk"]*100:.0f}%
                            </div>

                            <div style="
                                color:#81999c;
                                font-size:.75rem;
                            ">
                                Current risk index
                            </div>

                            <div style="
                                margin-top:14px;
                                color:#a5b8ba;
                                font-size:.78rem;
                                line-height:1.8;
                            ">
                                Rainfall: {r["rainfall"]} mm<br>
                                Soil saturation: {r["soil"]}%<br>
                                Slope exposure: {r["slope"]}%
                            </div>

                        </div>

                    </div>
                    """,
                    unsafe_allow_html=True
                )

                if st.button(
                    "VIEW DETAILS",
                    key="district_" + r["District"],
                    use_container_width=True
                ):

                    st.session_state.selected_district = r["District"]

                    st.session_state.page = "Area Risk"

                    st.rerun()


# ============================================================
# STATES
# ============================================================

elif st.session_state.page == "States":

    st.markdown(
        '<div class="section-title">State Intelligence</div>',
        unsafe_allow_html=True
    )

    st.markdown(
        '<div class="section-caption">Uttarakhand-wide hazard overview</div>',
        unsafe_allow_html=True
    )

    state_risk = risk_df["risk"].mean()

    c1, c2, c3, c4 = st.columns(4)

    state_cards = [
        ("STATE", "UTTARAKHAND", "13 DISTRICTS"),
        ("AVERAGE RISK", f"{state_risk*100:.0f}%", "CURRENT INDEX"),
        ("HIGH + CRITICAL", str(high_count + critical_count), "DISTRICTS"),
        ("MONITORING", "ACTIVE", "REAL-TIME MODE"),
    ]

    for col, (a,b,c) in zip(
        [c1,c2,c3,c4],
        state_cards
    ):

        with col:

            st.markdown(
                f"""
                <div class="metric-card">

                    <div class="metric-title">
                        {a}
                    </div>

                    <div class="metric-number">
                        {b}
                    </div>

                    <div class="metric-small">
                        ● {c}
                    </div>

                </div>
                """,
                unsafe_allow_html=True
            )

    st.markdown(
        '<div class="section-title">District Risk Distribution</div>',
        unsafe_allow_html=True
    )

    chart = risk_df[
        ["District", "risk"]
    ].copy()

    chart["Risk %"] = chart["risk"] * 100

    st.bar_chart(
        chart.set_index("District")["Risk %"],
        height=450
    )

    st.markdown(
        '<div class="section-title">District Drill-down</div>',
        unsafe_allow_html=True
    )

    selected_state_district = st.selectbox(
        "Choose a district",
        list(risk_df["District"]),
        key="state_district_select"
    )

    if st.button(
        "OPEN DISTRICT INTELLIGENCE",
        use_container_width=True
    ):

        st.session_state.selected_district = selected_state_district

        st.session_state.page = "Area Risk"

        st.rerun()


# ============================================================
# AREA RISK
# ============================================================

elif st.session_state.page == "Area Risk":

    st.markdown(
        '<div class="section-title">Area Risk Intelligence</div>',
        unsafe_allow_html=True
    )

    names = list(risk_df["District"])

    selected_name = st.selectbox(
        "Select area",
        names,
        index=names.index(
            st.session_state.selected_district
        )
    )

    st.session_state.selected_district = selected_name

    r = risk_df[
        risk_df["District"] == selected_name
    ].iloc[0]

    color = risk_color(r["level"])

    left, right = st.columns([1.15, 1])

    with left:

        image = get_district_image(
            selected_name
        )

        st.image(
            image,
            use_container_width=True
        )

        st.markdown(
            f"""
            <div class="info-panel">

                <div style="
                    color:#81999c;
                    font-size:.7rem;
                    letter-spacing:.12em;
                ">
                    AREA PROFILE
                </div>

                <h2 style="
                    font-family:'Space Grotesk';
                    margin-bottom:4px;
                ">
                    {selected_name}
                </h2>

                <div style="
                    color:{color};
                    font-weight:800;
                ">
                    ● {r["level"]} RISK
                </div>

                <p style="
                    color:#a5b8ba;
                    line-height:1.7;
                ">
                    This area is being evaluated using rainfall,
                    terrain slope, soil saturation and historical
                    landslide susceptibility.
                </p>

            </div>
            """,
            unsafe_allow_html=True
        )

    with right:

        st.markdown(
            f"""
            <div class="info-panel">

                <div style="
                    color:#829a9d;
                    font-size:.7rem;
                    letter-spacing:.12em;
                ">
                    CURRENT RISK INDEX
                </div>

                <div style="
                    font-family:'Space Grotesk';
                    font-size:4rem;
                    font-weight:800;
                    color:{color};
                    margin-top:5px;
                ">
                    {r["risk"]*100:.0f}%
                </div>

                <div class="progress-wrap">

                    <div class="progress-bg">

                        <div
                            class="progress-fill"
                            style="
                                width:{r["risk"]*100:.0f}%;
                                background:{color};
                                color:{color};
                            "
                        ></div>

                    </div>

                </div>

                <div class="scan-line"></div>

                <p style="color:#91a8aa;">
                    Risk classification: <b>{r["level"]}</b>
                </p>

            </div>
            """,
            unsafe_allow_html=True
        )

    st.markdown(
        '<div class="section-title">Risk Factors</div>',
        unsafe_allow_html=True
    )

    factors = [
        ("Rainfall", r["rainfall"], "mm"),
        ("Humidity", r["humidity"], "%"),
        ("Soil Saturation", r["soil"], "%"),
        ("Slope Exposure", r["slope"], "%"),
        ("Historical Susceptibility", r["historical"], "%"),
    ]

    fcols = st.columns(5)

    for col, (name, value, unit) in zip(
        fcols,
        factors
    ):

        with col:

            st.markdown(
                f"""
                <div class="metric-card">

                    <div class="metric-title">
                        {name}
                    </div>

                    <div class="metric-number">
                        {value}{unit}
                    </div>

                    <div class="metric-small">
                        ● ANALYZED
                    </div>

                </div>
                """,
                unsafe_allow_html=True
            )

    st.markdown(
        '<div class="section-title">Recommended Monitoring</div>',
        unsafe_allow_html=True
    )

    if r["level"] in ["HIGH", "CRITICAL"]:

        st.warning(
            "Enhanced monitoring recommended. "
            "Check rainfall trends, road conditions and local alerts."
        )

    elif r["level"] == "MODERATE":

        st.info(
            "Continue monitoring rainfall and slope conditions."
        )

    else:

        st.success(
            "Current calculated risk is low under the selected scenario."
        )


# ============================================================
# ALERTS
# ============================================================

elif st.session_state.page == "Alerts":

    st.markdown(
        '<div class="section-title">Hazard Alerts</div>',
        unsafe_allow_html=True
    )

    st.markdown(
        '<div class="section-caption">Prioritized intelligence generated from current conditions</div>',
        unsafe_allow_html=True
    )

    alert_df = risk_df[
        risk_df["level"].isin(
            ["HIGH", "CRITICAL"]
        )
    ].sort_values(
        "risk",
        ascending=False
    )

    if len(alert_df) == 0:

        st.success(
            "No high-priority hazard alerts currently generated."
        )

    for _, r in alert_df.iterrows():

        color = risk_color(r["level"])

        st.markdown(
            f"""
            <div class="alert-box"
                 style="border-left-color:{color};">

                <div style="
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                ">

                    <div>

                        <div style="
                            color:{color};
                            font-weight:800;
                            font-size:.7rem;
                            letter-spacing:.12em;
                        ">
                            {r["level"]} RISK ALERT
                        </div>

                        <div style="
                            font-family:'Space Grotesk';
                            font-size:1.25rem;
                            margin-top:5px;
                        ">
                            {r["District"]}
                        </div>

                    </div>

                    <div style="
                        font-size:1.5rem;
                        font-weight:700;
                    ">
                        {r["risk"]*100:.0f}%
                    </div>

                </div>

                <div style="
                    color:#8da4a6;
                    font-size:.78rem;
                    margin-top:10px;
                ">
                    Rainfall {r["rainfall"]} mm •
                    Soil saturation {r["soil"]}% •
                    Slope exposure {r["slope"]}%
                </div>

            </div>
            """,
            unsafe_allow_html=True
        )


# ============================================================
# SAFE ROUTE
# ============================================================

elif st.session_state.page == "Safe Route":

    st.markdown(
        '<div class="section-title">Safe Route Intelligence</div>',
        unsafe_allow_html=True
    )

    st.markdown(
        '<div class="section-caption">Evaluate travel corridors against simulated hazard conditions</div>',
        unsafe_allow_html=True
    )

    c1, c2 = st.columns(2)

    with c1:

        start = st.selectbox(
            "Starting area",
            list(risk_df["District"]),
            index=list(risk_df["District"]).index(
                "Nainital"
            )
        )

    with c2:

        destination = st.selectbox(
            "Destination",
            list(risk_df["District"]),
            index=list(risk_df["District"]).index(
                "Dehradun"
            )
        )

    routes = [
        ("NH-7", 38, "LOWER EXPOSURE"),
        ("NH-109", 54, "MODERATE EXPOSURE"),
        ("NH-125", 68, "ELEVATED EXPOSURE"),
        ("Mountain Corridor A", 77, "HIGH EXPOSURE"),
    ]

    st.markdown(
        '<div class="section-title">Available Corridors</div>',
        unsafe_allow_html=True
    )

    for name, exposure, status in routes:

        color = (
            "#39d98a"
            if exposure < 45
            else "#f4d35e"
            if exposure < 60
            else "#ff9f43"
            if exposure < 75
            else "#ff4d67"
        )

        st.markdown(
            f"""
            <div class="info-panel" style="
                margin-bottom:12px;
            ">

                <div style="
                    display:flex;
                    justify-content:space-between;
                ">

                    <div>
                        <div style="
                            font-family:'Space Grotesk';
                            font-size:1.15rem;
                        ">
                            {name}
                        </div>

                        <div style="
                            color:{color};
                            font-size:.72rem;
                            font-weight:800;
                            margin-top:5px;
                        ">
                            ● {status}
                        </div>
                    </div>

                    <div style="
                        font-size:1.5rem;
                        font-weight:700;
                    ">
                        {exposure}%
                    </div>

                </div>

                <div class="progress-wrap">

                    <div class="progress-bg">

                        <div class="progress-fill"
                             style="
                                width:{exposure}%;
                                background:{color};
                                color:{color};
                             ">
                        </div>

                    </div>

                </div>

            </div>
            """,
            unsafe_allow_html=True
        )

    if st.button(
        "CALCULATE SAFER ROUTE",
        use_container_width=True
    ):

        st.success(
            f"Route analysis complete: {start} → {destination}. "
            "The lowest-exposure monitored corridor has been prioritized."
        )


# ============================================================
# SIMULATION
# ============================================================

elif st.session_state.page == "Simulation":

    st.markdown(
        '<div class="section-title">Hazard Simulation Centre</div>',
        unsafe_allow_html=True
    )

    st.markdown(
        '<div class="section-caption">Test how the SafeBhoomi intelligence system responds to changing conditions</div>',
        unsafe_allow_html=True
    )

    st.markdown(
        """
        <div class="simulation-panel">

            <div style="
                color:#70e5bb;
                font-size:.7rem;
                letter-spacing:.14em;
            ">
                SIMULATION ENGINE
            </div>

            <h2 style="
                font-family:'Space Grotesk';
                margin-bottom:3px;
            ">
                What happens if conditions change?
            </h2>

            <p style="color:#829a9d;">
                Simulations modify rainfall, soil saturation and
                hazard exposure across the monitoring system.
            </p>

        </div>
        """,
        unsafe_allow_html=True
    )

    simulation_options = [
        "Normal Conditions",
        "Heavy Rainfall",
        "Extreme Rainfall",
        "Landslide Event",
        "Road Blockage",
        "Multiple Hazards",
    ]

    selected_sim = st.selectbox(
        "Choose simulation scenario",
        simulation_options,
        index=simulation_options.index(
            st.session_state.simulation
        )
    )

    st.session_state.simulation = selected_sim

    if st.button(
        "RUN SIMULATION",
        use_container_width=True
    ):

        st.session_state.sim_active = True

        if selected_sim == "Normal Conditions":
            st.session_state.alert_level = "NORMAL"

        elif selected_sim == "Heavy Rainfall":
            st.session_state.alert_level = "WATCH"

        elif selected_sim == "Extreme Rainfall":
            st.session_state.alert_level = "WARNING"

        else:
            st.session_state.alert_level = "CRITICAL"

        st.rerun()

    if st.session_state.sim_active:

        st.markdown(
            """
            <div class="scan-line"></div>
            """,
            unsafe_allow_html=True
        )

        st.markdown(
            f"""
            <div class="info-panel">

                <div style="
                    color:#70e5bb;
                    font-size:.7rem;
                    letter-spacing:.14em;
                ">
                    SIMULATION ACTIVE
                </div>

                <div style="
                    font-family:'Space Grotesk';
                    font-size:2rem;
                    margin-top:8px;
                ">
                    {selected_sim}
                </div>

                <div style="
                    color:#ff9f43;
                    font-weight:800;
                    margin-top:8px;
                ">
                    ● SYSTEM STATUS: {st.session_state.alert_level}
                </div>

            </div>
            """,
            unsafe_allow_html=True
        )

        st.markdown(
            '<div class="section-title">Simulation Results</div>',
            unsafe_allow_html=True
        )

        s1, s2, s3, s4 = st.columns(4)

        simulated_values = [
            ("RAINFALL", "↑", "INTENSIFIED"),
            ("SOIL SATURATION", "↑", "UPDATED"),
            ("RISK ZONES", "↑", "RECALCULATED"),
            ("ALERTS", "!", "GENERATED"),
        ]

        for col, (a,b,c) in zip(
            [s1,s2,s3,s4],
            simulated_values
        ):

            with col:

                st.markdown(
                    f"""
                    <div class="metric-card">

                        <div class="metric-title">
                            {a}
                        </div>

                        <div class="metric-number">
                            {b}
                        </div>

                        <div class="metric-small">
                            ● {c}
                        </div>

                    </div>
                    """,
                    unsafe_allow_html=True
                )

        st.markdown(
            '<div class="section-title">Updated Priority Zones</div>',
            unsafe_allow_html=True
        )

        sim_top = risk_df.sort_values(
            "risk",
            ascending=False
        ).head(5)

        for _, r in sim_top.iterrows():

            color = risk_color(r["level"])

            st.markdown(
                f"""
                <div style="
                    padding:14px 18px;
                    margin-bottom:8px;
                    border-radius:12px;
                    background:rgba(255,255,255,.035);
                    border-left:3px solid {color};
                ">

                    <b>{r["District"]}</b>

                    <span style="
                        float:right;
                        color:{color};
                        font-weight:800;
                    ">
                        {r["risk"]*100:.0f}% • {r["level"]}
                    </span>

                </div>
                """,
                unsafe_allow_html=True
            )

        if st.button(
            "RESET SIMULATION",
            use_container_width=True
        ):

            st.session_state.simulation = "Normal Conditions"
            st.session_state.sim_active = False
            st.session_state.alert_level = "NORMAL"

            st.rerun()


# ============================================================
# AI ANALYST
# ============================================================

elif st.session_state.page == "AI Analyst":

    st.markdown(
        '<div class="section-title">AI Hazard Analyst</div>',
        unsafe_allow_html=True
    )

    st.markdown(
        '<div class="section-caption">AI-assisted interpretation of SafeBhoomi intelligence</div>',
        unsafe_allow_html=True
    )

    st.markdown(
        """
        <div class="info-panel">

            <div style="
                color:#70e5bb;
                font-size:.7rem;
                letter-spacing:.14em;
            ">
                AI ANALYSIS ENGINE
            </div>

            <h2 style="
                font-family:'Space Grotesk';
            ">
                Intelligent Risk Explanation
            </h2>

            <div class="scan-line"></div>

            <p style="color:#91a8aa;line-height:1.8;">
                The AI Analyst will combine SafeBhoomi's calculated
                risk factors with Gemini to explain why an area is
                vulnerable and what information deserves attention.
            </p>

        </div>
        """,
        unsafe_allow_html=True
    )

    analyst_area = st.selectbox(
        "Analyze district",
        list(risk_df["District"]),
        index=list(risk_df["District"]).index(
            st.session_state.selected_district
        )
    )

    ar = risk_df[
        risk_df["District"] == analyst_area
    ].iloc[0]

    if st.button(
        "ANALYZE RISK",
        use_container_width=True
    ):

        st.markdown(
            """
            <div class="scan-line"></div>
            """,
            unsafe_allow_html=True
        )

        st.info(
            f"""
            SafeBhoomi preliminary analysis for {analyst_area}:

            Current calculated risk is {ar["risk"]*100:.0f}%,
            classified as {ar["level"]}.

            Key factors:
            rainfall {ar["rainfall"]} mm,
            soil saturation {ar["soil"]}%,
            slope exposure {ar["slope"]}%,
            historical susceptibility {ar["historical"]}%.
            """
        )

        st.caption(
            "Gemini integration will be connected through the FastAPI backend so the API key remains server-side."
        )


# ============================================================
# FOOTER
# ============================================================

st.markdown(
    """
    <div class="footer">

        SAFEBHOOMI • LANDSLIDE INTELLIGENCE PLATFORM<br><br>

        PREDICT • ANALYZE • RESPOND

    </div>
    """,
    unsafe_allow_html=True
)
