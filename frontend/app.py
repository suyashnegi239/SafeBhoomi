
import streamlit as st
import pandas as pd
import numpy as np
import time
import requests
from pathlib import Path

# ============================================================
# CONFIG
# ============================================================

st.set_page_config(
    page_title="SafeBhoomi",
    page_icon="🏔️",
    layout="wide",
    initial_sidebar_state="collapsed"
)

PROJECT = Path("/content/landslide_project")

# ============================================================
# SESSION STATE
# ============================================================

if "intro_done" not in st.session_state:
    st.session_state.intro_done = False

if "page" not in st.session_state:
    st.session_state.page = "Dashboard"

if "selected_district" not in st.session_state:
    st.session_state.selected_district = "Chamoli"

if "simulation" not in st.session_state:
    st.session_state.simulation = "Normal Conditions"

if "simulation_active" not in st.session_state:
    st.session_state.simulation_active = False


# ============================================================
# DISTRICTS
# ============================================================

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
# RISK CALCULATION
# ============================================================

def calculate_risk(base):

    multiplier = {
        "Normal Conditions": 1.00,
        "Heavy Rainfall": 1.20,
        "Extreme Rainfall": 1.48,
        "Landslide Event": 1.72,
        "Road Blockage": 1.30,
        "Multiple Hazards": 1.85,
    }.get(st.session_state.simulation, 1.0)

    risk = min(base * multiplier, 0.99)

    rainfall = int(35 + base * 70)

    if st.session_state.simulation == "Heavy Rainfall":
        rainfall += 35

    elif st.session_state.simulation == "Extreme Rainfall":
        rainfall += 75

    elif st.session_state.simulation == "Multiple Hazards":
        rainfall += 90

    soil = int(25 + risk * 65)

    if st.session_state.simulation in [
        "Extreme Rainfall",
        "Multiple Hazards"
    ]:
        soil += 15

    soil = min(99, soil)

    slope = min(99, int(25 + risk * 70))

    humidity = min(99, int(55 + risk * 40))

    historical = int(base * 100)

    if risk >= .75:
        level = "CRITICAL"
    elif risk >= .50:
        level = "HIGH"
    elif risk >= .30:
        level = "MODERATE"
    else:
        level = "LOW"

    return {
        "risk": risk,
        "level": level,
        "rainfall": rainfall,
        "soil": soil,
        "slope": slope,
        "humidity": humidity,
        "historical": historical
    }


records = []

for _, row in df.iterrows():

    r = calculate_risk(row["BaseRisk"])

    records.append({
        "District": row["District"],
        "Lat": row["Lat"],
        "Lon": row["Lon"],
        "BaseRisk": row["BaseRisk"],
        **r
    })

risk_df = pd.DataFrame(records)


def risk_color(level):

    return {
        "LOW": "#39d98a",
        "MODERATE": "#f4d35e",
        "HIGH": "#ff9f43",
        "CRITICAL": "#ff4d67"
    }.get(level, "#39d98a")


# ============================================================
# DISTRICT IMAGES
# ============================================================

FALLBACK_IMAGE = (
    "https://images.unsplash.com/"
    "photo-1464822759023-fed622ff2c3b"
    "?auto=format&fit=crop&w=1200&q=85"
)

image_cache = {}


def district_image(name):

    if name in image_cache:
        return image_cache[name]

    try:

        url = (
            "https://en.wikipedia.org/api/rest_v1/page/summary/"
            + name.replace(" ", "_")
        )

        response = requests.get(
            url,
            timeout=4,
            headers={
                "User-Agent": "SafeBhoomi/1.0"
            }
        )

        if response.status_code == 200:

            data = response.json()

            image = (
                data.get("originalimage", {}).get("source")
                or data.get("thumbnail", {}).get("source")
            )

            if image:

                image_cache[name] = image
                return image

    except Exception:
        pass

    image_cache[name] = FALLBACK_IMAGE

    return FALLBACK_IMAGE


# ============================================================
# GLOBAL STYLE
# ============================================================

st.markdown(
r"""
<style>

@import url(
'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap'
);

html, body, [class*="css"] {
    font-family: Inter, sans-serif;
}

.stApp {

    color: #edf7f5;

    background:
        linear-gradient(
            rgba(3,10,16,.91),
            rgba(3,10,16,.97)
        ),
        url(
        "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2400&q=90"
        );

    background-size: cover;
    background-position: center;
    background-attachment: fixed;
}

/* Remove sidebar completely */

[data-testid="stSidebar"] {
    display: none !important;
}

[data-testid="collapsedControl"] {
    display: none !important;
}

/* Hide Streamlit decoration */

#MainMenu {
    visibility: hidden;
}

footer {
    visibility: hidden;
}

header {
    visibility: hidden;
}


/* ==========================================================
   CINEMATIC INTRO
   ========================================================== */

.intro {

    position: relative;

    height: 88vh;

    overflow: hidden;

    display: flex;

    align-items: center;

    justify-content: center;

    text-align: center;

    border-radius: 28px;

    background:
        linear-gradient(
            rgba(2,7,12,.28),
            rgba(2,7,12,.82)
        ),
        url(
        "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=2400&q=90"
        );

    background-size: cover;

    background-position: center;

    box-shadow:
        inset 0 0 130px rgba(0,0,0,.85),
        0 30px 100px rgba(0,0,0,.5);

    animation: cinematicIn 1.2s ease-out;
}

.intro::before {

    content: "";

    position: absolute;

    inset: 0;

    background:
        radial-gradient(
            circle at 50% 35%,
            rgba(92,230,185,.10),
            transparent 38%
        );

    animation: atmosphere 5s ease-in-out infinite;
}

.intro-content {

    position: relative;

    z-index: 5;

    animation: introContent 2s ease-out;
}

.intro-title {

    font-family: "Space Grotesk";

    font-size: clamp(
        4rem,
        10vw,
        9rem
    );

    font-weight: 800;

    letter-spacing: .11em;

    color: white;

    margin: 0;

    text-shadow:
        0 0 25px rgba(92,230,185,.25),
        0 0 80px rgba(92,230,185,.15);

    animation:
        logoReveal 2.1s ease-out,
        logoGlow 3.5s ease-in-out 2s infinite;
}

.intro-sub {

    margin-top: 12px;

    font-size: .95rem;

    letter-spacing: .45em;

    color: #8be8c4;

    animation: fadeUp 1.3s ease-out .7s both;
}

.intro-tag {

    margin-top: 28px;

    font-size: .72rem;

    letter-spacing: .38em;

    color: #b7c8ca;

    animation: fadeUp 1.3s ease-out 1.1s both;
}

.intro-ready {

    display: inline-block;

    margin-top: 45px;

    padding: 10px 22px;

    border-radius: 30px;

    color: #70e5bb;

    background: rgba(40,130,100,.15);

    border: 1px solid rgba(100,230,185,.35);

    font-size: .7rem;

    letter-spacing: .16em;

    animation:
        fadeUp 1.3s ease-out 1.5s both,
        readyPulse 2s ease-in-out infinite;
}


/* Animated rain */

.rain {

    position: absolute;

    inset: 0;

    pointer-events: none;

    opacity: .22;

    background-image:
        repeating-linear-gradient(
            105deg,
            transparent 0px,
            transparent 15px,
            rgba(170,220,230,.4) 16px,
            transparent 17px,
            transparent 32px
        );

    background-size: 120px 180px;

    animation: rainMove .7s linear infinite;
}

@keyframes rainMove {

    from {
        background-position: 0 0;
    }

    to {
        background-position: -100px 180px;
    }
}

@keyframes cinematicIn {

    from {
        opacity: 0;
        transform: scale(1.04);
    }

    to {
        opacity: 1;
        transform: scale(1);
    }
}

@keyframes introContent {

    from {
        opacity: 0;
        transform: translateY(35px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes logoReveal {

    from {
        opacity: 0;
        transform: scale(.72);
        filter: blur(18px);
    }

    to {
        opacity: 1;
        transform: scale(1);
        filter: blur(0);
    }
}

@keyframes logoGlow {

    0%,100% {
        text-shadow:
            0 0 20px rgba(92,230,185,.25),
            0 0 60px rgba(92,230,185,.10);
    }

    50% {
        text-shadow:
            0 0 35px rgba(92,230,185,.65),
            0 0 100px rgba(92,230,185,.25);
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

@keyframes atmosphere {

    0%,100% {
        opacity: .45;
        transform: scale(1);
    }

    50% {
        opacity: .85;
        transform: scale(1.08);
    }
}

@keyframes readyPulse {

    0%,100% {
        box-shadow: 0 0 0 rgba(90,230,180,0);
    }

    50% {
        box-shadow: 0 0 30px rgba(90,230,180,.18);
    }
}


/* ==========================================================
   HEADER
   ========================================================== */

.header {

    padding: 16px 22px;

    margin-bottom: 12px;

    border-radius: 17px;

    background:
        linear-gradient(
            135deg,
            rgba(14,31,39,.96),
            rgba(6,17,23,.92)
        );

    border: 1px solid rgba(160,220,220,.12);

    backdrop-filter: blur(18px);

    box-shadow:
        0 15px 50px rgba(0,0,0,.28);

    animation: fadeUp .55s ease-out;
}

.brand {

    font-family: "Space Grotesk";

    font-weight: 800;

    font-size: 1.45rem;

    letter-spacing: .08em;
}

.brand-safe {
    color: white;
}

.brand-bhoomi {
    color: #70e5bb;
}

.live {

    display: inline-flex;

    align-items: center;

    gap: 7px;

    margin-left: 12px;

    font-size: .68rem;

    color: #70e5bb;

    letter-spacing: .08em;
}

.live-dot {

    width: 7px;
    height: 7px;

    border-radius: 50%;

    background: #70e5bb;

    box-shadow: 0 0 14px #70e5bb;

    animation: dotPulse 1.5s infinite;
}

@keyframes dotPulse {

    0%,100% {
        transform: scale(1);
    }

    50% {
        transform: scale(1.55);
    }
}


/* ==========================================================
   BUTTONS
   ========================================================== */

div.stButton > button {

    min-height: 42px;

    border-radius: 11px !important;

    background:
        linear-gradient(
            135deg,
            rgba(18,40,48,.96),
            rgba(8,22,28,.96)
        ) !important;

    color: #c9d9da !important;

    border: 1px solid rgba(150,215,215,.12) !important;

    font-weight: 600 !important;

    transition:
        transform .14s ease,
        box-shadow .20s ease,
        border-color .20s ease !important;
}

div.stButton > button:hover {

    transform: translateY(-3px) !important;

    color: white !important;

    border-color: rgba(105,230,190,.55) !important;

    box-shadow:
        0 8px 28px rgba(50,220,170,.13),
        0 0 18px rgba(50,220,170,.08) !important;
}

div.stButton > button:active {

    transform: translateY(1px) scale(.985) !important;
}


/* ==========================================================
   HERO
   ========================================================== */

.hero {

    min-height: 285px;

    padding: 44px;

    border-radius: 24px;

    overflow: hidden;

    background:
        linear-gradient(
            90deg,
            rgba(3,12,17,.96),
            rgba(3,12,17,.70),
            rgba(3,12,17,.30)
        ),
        url(
        "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=2200&q=90"
        );

    background-size: cover;

    background-position: center;

    border: 1px solid rgba(150,220,220,.13);

    box-shadow:
        0 25px 70px rgba(0,0,0,.35);

    animation: fadeUp .65s ease-out;
}

.hero h1 {

    font-family: "Space Grotesk";

    font-size: clamp(
        2.1rem,
        5vw,
        4.3rem
    );

    line-height: 1.04;

    margin: 0;
}

.hero-line {

    width: 75px;

    height: 3px;

    margin: 21px 0;

    background: #70e5bb;

    box-shadow: 0 0 18px rgba(112,229,187,.55);
}

.hero p {

    max-width: 700px;

    color: #afc1c3;

    line-height: 1.7;
}


/* ==========================================================
   CARDS
   ========================================================== */

.card {

    padding: 21px;

    min-height: 125px;

    border-radius: 17px;

    background:
        linear-gradient(
            145deg,
            rgba(18,38,46,.96),
            rgba(7,19,25,.94)
        );

    border: 1px solid rgba(150,220,220,.11);

    box-shadow:
        0 12px 35px rgba(0,0,0,.22);

    animation: cardIn .55s ease-out both;

    transition:
        transform .23s ease,
        border-color .23s ease,
        box-shadow .23s ease;
}

.card:hover {

    transform: translateY(-6px);

    border-color: rgba(105,230,190,.32);

    box-shadow:
        0 18px 45px rgba(0,0,0,.35),
        0 0 22px rgba(105,230,190,.06);
}

.metric-title {

    color: #829a9d;

    font-size: .70rem;

    letter-spacing: .13em;
}

.metric-number {

    margin-top: 8px;

    font-family: "Space Grotesk";

    font-size: 2rem;

    font-weight: 700;

    color: white;
}

.metric-small {

    margin-top: 5px;

    color: #70e5bb;

    font-size: .70rem;
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


/* ==========================================================
   SECTION
   ========================================================== */

.section-title {

    margin-top: 30px;

    margin-bottom: 8px;

    font-family: "Space Grotesk";

    font-size: 1.5rem;

    font-weight: 700;
}

.section-caption {

    color: #7f989b;

    margin-bottom: 18px;
}


/* ==========================================================
   DISTRICT
   ========================================================== */

.district {

    overflow: hidden;

    border-radius: 18px;

    background:
        linear-gradient(
            145deg,
            rgba(17,36,44,.97),
            rgba(6,18,24,.96)
        );

    border: 1px solid rgba(150,220,220,.11);

    margin-bottom: 18px;

    transition:
        transform .25s ease,
        box-shadow .25s ease,
        border-color .25s ease;
}

.district:hover {

    transform: translateY(-6px);

    border-color: rgba(105,230,190,.35);

    box-shadow:
        0 22px 50px rgba(0,0,0,.38);
}

.district img {

    width: 100%;

    height: 155px;

    object-fit: cover;
}

.district-content {

    padding: 17px;
}


/* ==========================================================
   INFO PANEL
   ========================================================== */

.panel {

    padding: 24px;

    border-radius: 19px;

    background:
        linear-gradient(
            145deg,
            rgba(15,35,43,.96),
            rgba(6,18,24,.96)
        );

    border: 1px solid rgba(150,220,220,.12);

    box-shadow:
        0 16px 50px rgba(0,0,0,.25);

    animation: fadeUp .5s ease-out;
}


/* ==========================================================
   ALERT
   ========================================================== */

.alert {

    padding: 18px 21px;

    margin-bottom: 12px;

    border-radius: 14px;

    border-left: 4px solid #ff4d67;

    background: rgba(255,77,103,.075);

    animation:
        fadeUp .4s ease-out,
        alertPulse 2.5s ease-in-out infinite;
}

@keyframes alertPulse {

    0%,100% {
        box-shadow: 0 0 0 rgba(255,77,103,0);
    }

    50% {
        box-shadow: 0 0 24px rgba(255,77,103,.10);
    }
}


/* ==========================================================
   SCANNING
   ========================================================== */

.scan {

    height: 2px;

    width: 100%;

    margin: 18px 0;

    background:
        linear-gradient(
            90deg,
            transparent,
            #70e5bb,
            transparent
        );

    animation: scanning 1.8s linear infinite;
}

@keyframes scanning {

    0% {
        transform: translateX(-40%);
        opacity: .15;
    }

    50% {
        opacity: 1;
    }

    100% {
        transform: translateX(40%);
        opacity: .15;
    }
}


/* ==========================================================
   FOOTER
   ========================================================== */

.footer {

    margin-top: 60px;

    padding: 28px;

    text-align: center;

    color: #617b7e;

    font-size: .70rem;

    letter-spacing: .10em;

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
        <div class="intro">

            <div class="rain"></div>

            <div class="intro-content">

                <div class="intro-title">
                    SAFEBHOOMI
                </div>

                <div class="intro-sub">
                    LANDSLIDE INTELLIGENCE PLATFORM
                </div>

                <div class="intro-tag">
                    PREDICT • ANALYZE • RESPOND
                </div>

                <div class="intro-ready">
                    ● SYSTEM READY
                </div>

            </div>

        </div>
        """,
        unsafe_allow_html=True
    )

    time.sleep(4)

    st.session_state.intro_done = True

    st.rerun()


# ============================================================
# HEADER
# ============================================================

st.markdown(
    """
    <div class="header">

        <span class="brand">
            <span class="brand-safe">SAFE</span><span class="brand-bhoomi">BHOOMI</span>
        </span>

        <span class="live">
            <span class="live-dot"></span>
            LIVE INTELLIGENCE
        </span>

        <span style="
            float:right;
            color:#718b8e;
            font-size:.68rem;
            letter-spacing:.12em;
            margin-top:5px;
        ">
            UTTARAKHAND • HAZARD MONITORING
        </span>

    </div>
    """,
    unsafe_allow_html=True
)


# ============================================================
# TOP NAVIGATION
# ============================================================

pages = [
    "Dashboard",
    "Live Map",
    "Districts",
    "States",
    "Area Risk",
    "Alerts",
    "Safe Route",
    "Simulation",
    "AI Analyst"
]

nav = st.columns(len(pages))

for col, page in zip(nav, pages):

    with col:

        if st.button(
            page,
            key="nav_" + page,
            use_container_width=True
        ):

            st.session_state.page = page

            st.rerun()


# ============================================================
# DASHBOARD
# ============================================================

if st.session_state.page == "Dashboard":

    st.markdown(
        """
        <div class="hero">

            <h1>
                Know the mountain<br>
                before it moves.
            </h1>

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
        """
        <div class="section-title">
            Uttarakhand Situation Overview
        </div>

        <div class="section-caption">
            Live intelligence across all 13 districts
        </div>
        """,
        unsafe_allow_html=True
    )

    critical = int(
        (risk_df["level"] == "CRITICAL").sum()
    )

    high = int(
        (risk_df["level"] == "HIGH").sum()
    )

    average = int(
        risk_df["risk"].mean() * 100
    )

    active_alerts = high + critical + 2

    values = [
        ("DISTRICTS MONITORED", "13", "● FULL COVERAGE"),
        ("CRITICAL", str(critical), "● IMMEDIATE ATTENTION"),
        ("HIGH RISK", str(high), "● ELEVATED HAZARD"),
        ("ACTIVE ALERTS", str(active_alerts), "● LIVE MONITORING"),
        ("AVG RISK", f"{average}%", "● STATEWIDE INDEX")
    ]

    cols = st.columns(5)

    for i, (title, number, small) in enumerate(values):

        with cols[i]:

            st.markdown(
                f"""
                <div class="card">

                    <div class="metric-title">
                        {title}
                    </div>

                    <div class="metric-number">
                        {number}
                    </div>

                    <div class="metric-small">
                        {small}
                    </div>

                </div>
                """,
                unsafe_allow_html=True
            )


    # ========================================================
    # PRIORITY INTELLIGENCE
    # ========================================================

    st.markdown(
        """
        <div class="section-title">
            Priority Intelligence
        </div>
        """,
        unsafe_allow_html=True
    )

    priority = risk_df.sort_values(
        "risk",
        ascending=False
    ).head(4)

    cols = st.columns(4)

    for col, (_, r) in zip(
        cols,
        priority.iterrows()
    ):

        with col:

            color = risk_color(r["level"])

            st.markdown(
                f"""
                <div class="card">

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

                    <div style="
                        color:#829a9d;
                        font-size:.76rem;
                    ">
                        Rainfall {r["rainfall"]} mm
                    </div>

                </div>
                """,
                unsafe_allow_html=True
            )


    # ========================================================
    # SYSTEM MODULES
    # ========================================================

    st.markdown(
        """
        <div class="section-title">
            System Modules
        </div>
        """,
        unsafe_allow_html=True
    )

    modules = [
        (
            "LIVE MAP",
            "Terrain + risk zones",
            "Live Map"
        ),
        (
            "DISTRICTS",
            "13 district intelligence profiles",
            "Districts"
        ),
        (
            "SIMULATION",
            "Test extreme hazard scenarios",
            "Simulation"
        ),
        (
            "SAFE ROUTE",
            "Find safer travel corridors",
            "Safe Route"
        )
    ]

    cols = st.columns(4)

    for col, (name, description, target) in zip(
        cols,
        modules
    ):

        with col:

            st.markdown(
                f"""
                <div class="card">

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
                        {name}
                    </div>

                    <div style="
                        color:#839a9d;
                        font-size:.78rem;
                        margin-top:7px;
                    ">
                        {description}
                    </div>

                </div>
                """,
                unsafe_allow_html=True
            )

            if st.button(
                "OPEN",
                key="module_" + name,
                use_container_width=True
            ):

                st.session_state.page = target

                st.rerun()


# ============================================================
# DISTRICTS
# ============================================================

elif st.session_state.page == "Districts":

    st.markdown(
        """
        <div class="section-title">
            District Intelligence
        </div>

        <div class="section-caption">
            Explore all 13 Uttarakhand districts
        </div>
        """,
        unsafe_allow_html=True
    )

    search = st.text_input(
        "Search districts",
        placeholder="Search district..."
    )

    display = risk_df.copy()

    if search:

        display = display[
            display["District"].str.contains(
                search,
                case=False,
                na=False
            )
        ]

    rows = list(display.iterrows())

    for start in range(0, len(rows), 3):

        row = rows[start:start+3]

        cols = st.columns(3)

        for col, (_, r) in zip(
            cols,
            row
        ):

            with col:

                image = district_image(
                    r["District"]
                )

                color = risk_color(
                    r["level"]
                )

                st.markdown(
                    f"""
                    <div class="district">

                        <img src="{image}">

                        <div class="district-content">

                            <div style="
                                font-family:'Space Grotesk';
                                font-size:1.2rem;
                                font-weight:700;
                            ">
                                {r["District"]}
                            </div>

                            <div style="
                                color:{color};
                                font-weight:800;
                                font-size:.72rem;
                                margin-top:8px;
                                letter-spacing:.08em;
                            ">
                                ● {r["level"]} RISK
                            </div>

                            <div style="
                                font-size:1.7rem;
                                font-weight:700;
                                margin-top:9px;
                            ">
                                {r["risk"]*100:.0f}%
                            </div>

                            <div style="
                                color:#839a9d;
                                font-size:.76rem;
                                line-height:1.8;
                            ">
                                Rainfall {r["rainfall"]} mm<br>
                                Soil saturation {r["soil"]}%<br>
                                Slope exposure {r["slope"]}%
                            </div>

                        </div>

                    </div>
                    """,
                    unsafe_allow_html=True
                )

                if st.button(
                    "VIEW DISTRICT INTELLIGENCE",
                    key="open_" + r["District"],
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
        """
        <div class="section-title">
            State Intelligence
        </div>

        <div class="section-caption">
            Uttarakhand-wide hazard overview
        </div>
        """,
        unsafe_allow_html=True
    )

    avg = int(
        risk_df["risk"].mean() * 100
    )

    c1, c2, c3, c4 = st.columns(4)

    state_data = [
        ("STATE", "UTTARAKHAND", "13 DISTRICTS"),
        ("AVERAGE RISK", f"{avg}%", "STATEWIDE INDEX"),
        ("HIGH + CRITICAL",
         str(
             int(
                 (
                     risk_df["level"].isin(
                         ["HIGH","CRITICAL"]
                     )
                 ).sum()
             )
         ),
         "PRIORITY AREAS"),
        ("SYSTEM", "ACTIVE", "LIVE MONITORING")
    ]

    for col, (a,b,c) in zip(
        [c1,c2,c3,c4],
        state_data
    ):

        with col:

            st.markdown(
                f"""
                <div class="card">

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
        """
        <div class="section-title">
            District Risk Distribution
        </div>
        """,
        unsafe_allow_html=True
    )

    chart = risk_df.set_index(
        "District"
    )["risk"] * 100

    st.bar_chart(
        chart,
        height=450
    )

    selected = st.selectbox(
        "Select district",
        list(risk_df["District"])
    )

    if st.button(
        "OPEN DISTRICT",
        use_container_width=True
    ):

        st.session_state.selected_district = selected

        st.session_state.page = "Area Risk"

        st.rerun()


# ============================================================
# AREA RISK
# ============================================================

elif st.session_state.page == "Area Risk":

    st.markdown(
        """
        <div class="section-title">
            Area Risk Intelligence
        </div>

        <div class="section-caption">
            Detailed environmental risk profile
        </div>
        """,
        unsafe_allow_html=True
    )

    names = list(
        risk_df["District"]
    )

    selected = st.selectbox(
        "Choose district",
        names,
        index=names.index(
            st.session_state.selected_district
        )
    )

    st.session_state.selected_district = selected

    r = risk_df[
        risk_df["District"] == selected
    ].iloc[0]

    color = risk_color(
        r["level"]
    )

    left, right = st.columns(
        [1, 1.15]
    )

    with left:

        st.image(
            district_image(selected),
            use_container_width=True
        )

        st.markdown(
            f"""
            <div class="panel">

                <div style="
                    color:#829a9d;
                    font-size:.7rem;
                    letter-spacing:.13em;
                ">
                    DISTRICT PROFILE
                </div>

                <div style="
                    font-family:'Space Grotesk';
                    font-size:2rem;
                    margin-top:6px;
                ">
                    {selected}
                </div>

                <div style="
                    color:{color};
                    font-weight:800;
                    margin-top:8px;
                ">
                    ● {r["level"]} RISK
                </div>

            </div>
            """,
            unsafe_allow_html=True
        )

    with right:

        st.markdown(
            f"""
            <div class="panel">

                <div class="metric-title">
                    CURRENT RISK INDEX
                </div>

                <div style="
                    color:{color};
                    font-family:'Space Grotesk';
                    font-size:4.5rem;
                    font-weight:800;
                ">
                    {r["risk"]*100:.0f}%
                </div>

                <div class="scan"></div>

                <div style="
                    color:#829a9d;
                    line-height:1.8;
                ">
                    Rainfall: <b>{r["rainfall"]} mm</b><br>
                    Humidity: <b>{r["humidity"]}%</b><br>
                    Soil saturation: <b>{r["soil"]}%</b><br>
                    Slope exposure: <b>{r["slope"]}%</b><br>
                    Historical susceptibility: <b>{r["historical"]}%</b>
                </div>

            </div>
            """,
            unsafe_allow_html=True
        )

    st.markdown(
        """
        <div class="section-title">
            Risk Components
        </div>
        """,
        unsafe_allow_html=True
    )

    components = [
        ("RAINFALL", f"{r['rainfall']} mm"),
        ("SOIL", f"{r['soil']}%"),
        ("SLOPE", f"{r['slope']}%"),
        ("HUMIDITY", f"{r['humidity']}%"),
        ("HISTORY", f"{r['historical']}%")
    ]

    cols = st.columns(5)

    for col, (a,b) in zip(
        cols,
        components
    ):

        with col:

            st.markdown(
                f"""
                <div class="card">

                    <div class="metric-title">
                        {a}
                    </div>

                    <div class="metric-number">
                        {b}
                    </div>

                    <div class="metric-small">
                        ● ANALYZED
                    </div>

                </div>
                """,
                unsafe_allow_html=True
            )


# ============================================================
# ALERTS
# ============================================================

elif st.session_state.page == "Alerts":

    st.markdown(
        """
        <div class="section-title">
            Hazard Alerts
        </div>

        <div class="section-caption">
            Priority warnings across Uttarakhand
        </div>
        """,
        unsafe_allow_html=True
    )

    alerts = risk_df[
        risk_df["level"].isin(
            ["HIGH","CRITICAL"]
        )
    ].sort_values(
        "risk",
        ascending=False
    )

    if len(alerts) == 0:

        st.success(
            "No high-priority alerts."
        )

    for _, r in alerts.iterrows():

        color = risk_color(
            r["level"]
        )

        st.markdown(
            f"""
            <div class="alert"
                 style="border-left-color:{color};">

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
                    font-size:1.3rem;
                    margin-top:5px;
                ">
                    {r["District"]}
                </div>

                <div style="
                    color:#829a9d;
                    font-size:.76rem;
                    margin-top:8px;
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
# SIMULATION
# ============================================================

elif st.session_state.page == "Simulation":

    st.markdown(
        """
        <div class="section-title">
            Hazard Simulation Centre
        </div>

        <div class="section-caption">
            Simulate changing mountain conditions
        </div>
        """,
        unsafe_allow_html=True
    )

    st.markdown(
        """
        <div class="panel">

            <div style="
                color:#70e5bb;
                font-size:.7rem;
                letter-spacing:.13em;
            ">
                SIMULATION ENGINE
            </div>

            <div style="
                font-family:'Space Grotesk';
                font-size:1.8rem;
                margin-top:7px;
            ">
                What happens if conditions change?
            </div>

            <div style="
                color:#829a9d;
                margin-top:8px;
                line-height:1.7;
            ">
                Change environmental conditions and observe
                how SafeBhoomi recalculates the hazard picture.
            </div>

        </div>
        """,
        unsafe_allow_html=True
    )

    scenarios = [
        "Normal Conditions",
        "Heavy Rainfall",
        "Extreme Rainfall",
        "Landslide Event",
        "Road Blockage",
        "Multiple Hazards"
    ]

    scenario = st.selectbox(
        "Simulation scenario",
        scenarios
    )

    st.session_state.simulation = scenario

    if st.button(
        "▶ RUN SIMULATION",
        use_container_width=True
    ):

        st.session_state.simulation_active = True

        st.rerun()

    if st.session_state.simulation_active:

        st.markdown(
            '<div class="scan"></div>',
            unsafe_allow_html=True
        )

        st.markdown(
            f"""
            <div class="panel">

                <div class="metric-title">
                    SIMULATION ACTIVE
                </div>

                <div style="
                    font-family:'Space Grotesk';
                    font-size:2rem;
                    margin-top:7px;
                ">
                    {scenario}
                </div>

                <div style="
                    color:#ff9f43;
                    font-weight:800;
                    margin-top:9px;
                ">
                    ● RISK ENGINE UPDATED
                </div>

            </div>
            """,
            unsafe_allow_html=True
        )

        updated = risk_df.sort_values(
            "risk",
            ascending=False
        ).head(5)

        st.markdown(
            """
            <div class="section-title">
                Updated Risk Zones
            </div>
            """,
            unsafe_allow_html=True
        )

        for _, r in updated.iterrows():

            color = risk_color(
                r["level"]
            )

            st.markdown(
                f"""
                <div class="card"
                     style="min-height:70px;margin-bottom:9px;">

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

            st.session_state.simulation_active = False

            st.rerun()


# ============================================================
# LIVE MAP
# ============================================================

elif st.session_state.page == "Live Map":

    st.markdown(
        """
        <div class="section-title">
            Live Terrain Intelligence
        </div>

        <div class="section-caption">
            Interactive three-dimensional terrain risk visualization
        </div>
        """,
        unsafe_allow_html=True
    )

    try:

        import plotly.graph_objects as go

        lat = np.linspace(
            28.6,
            31.0,
            35
        )

        lon = np.linspace(
            77.7,
            81.2,
            45
        )

        X, Y = np.meshgrid(
            lon,
            lat
        )

        Z = (
            2
            + 1.4*np.sin(
                (X-78)*2
            )
            + 1.0*np.cos(
                (Y-29)*3
            )
            + .5*np.sin(
                (X+Y)*2
            )
        )

        fig = go.Figure()

        fig.add_surface(
            x=X,
            y=Y,
            z=Z,
            colorscale="Viridis",
            opacity=.72,
            showscale=False
        )

        for _, r in risk_df.iterrows():

            z = (
                2
                + 1.4*np.sin(
                    (r["Lon"]-78)*2
                )
                + 1.0*np.cos(
                    (r["Lat"]-29)*3
                )
                + .7
            )

            color = risk_color(
                r["level"]
            )

            fig.add_trace(
                go.Scatter3d(
                    x=[r["Lon"]],
                    y=[r["Lat"]],
                    z=[z],
                    mode="markers+text",
                    text=[r["District"]],
                    textposition="top center",
                    marker=dict(
                        size=9,
                        color=color
                    ),
                    name=r["District"]
                )
            )

        fig.update_layout(
            height=680,
            paper_bgcolor="rgba(0,0,0,0)",
            scene=dict(
                bgcolor="rgba(3,10,16,.8)",
                xaxis=dict(
                    title="Longitude",
                    color="#829a9d"
                ),
                yaxis=dict(
                    title="Latitude",
                    color="#829a9d"
                ),
                zaxis=dict(
                    title="Terrain",
                    color="#829a9d"
                ),
                camera=dict(
                    eye=dict(
                        x=1.5,
                        y=1.5,
                        z=1.2
                    )
                )
            ),
            margin=dict(
                l=0,
                r=0,
                t=10,
                b=0
            )
        )

        st.plotly_chart(
            fig,
            use_container_width=True,
            config={
                "displayModeBar": False
            }
        )

    except Exception:

        st.error(
            "Install Plotly with: pip install plotly"
        )


# ============================================================
# SAFE ROUTE
# ============================================================

elif st.session_state.page == "Safe Route":

    st.markdown(
        """
        <div class="section-title">
            Safe Route Intelligence
        </div>

        <div class="section-caption">
            Compare monitored travel corridors
        </div>
        """,
        unsafe_allow_html=True
    )

    c1, c2 = st.columns(2)

    with c1:

        start = st.selectbox(
            "Start",
            list(risk_df["District"]),
            index=list(
                risk_df["District"]
            ).index("Nainital")
        )

    with c2:

        destination = st.selectbox(
            "Destination",
            list(risk_df["District"]),
            index=list(
                risk_df["District"]
            ).index("Dehradun")
        )

    routes = [
        ("NH-7", 38),
        ("NH-109", 54),
        ("NH-125", 68),
        ("Mountain Corridor A", 77)
    ]

    for name, risk in routes:

        color = (
            "#39d98a"
            if risk < 45
            else "#f4d35e"
            if risk < 60
            else "#ff9f43"
            if risk < 75
            else "#ff4d67"
        )

        st.markdown(
            f"""
            <div class="panel"
                 style="margin-bottom:10px;">

                <b>{name}</b>

                <span style="
                    float:right;
                    color:{color};
                    font-weight:800;
                ">
                    {risk}% EXPOSURE
                </span>

                <div style="
                    margin-top:12px;
                    height:7px;
                    border-radius:8px;
                    background:rgba(255,255,255,.08);
                ">

                    <div style="
                        width:{risk}%;
                        height:100%;
                        border-radius:8px;
                        background:{color};
                        box-shadow:0 0 12px {color};
                    "></div>

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
            f"Route analysis completed for {start} → {destination}."
        )


# ============================================================
# AI ANALYST
# ============================================================

elif st.session_state.page == "AI Analyst":

    st.markdown(
        """
        <div class="section-title">
            AI Hazard Analyst
        </div>

        <div class="section-caption">
            AI-assisted interpretation of SafeBhoomi intelligence
        </div>
        """,
        unsafe_allow_html=True
    )

    st.markdown(
        """
        <div class="panel">

            <div style="
                color:#70e5bb;
                font-size:.7rem;
                letter-spacing:.13em;
            ">
                AI ANALYSIS ENGINE
            </div>

            <div style="
                font-family:'Space Grotesk';
                font-size:1.8rem;
                margin-top:7px;
            ">
                Intelligent Risk Explanation
            </div>

            <div class="scan"></div>

            <div style="
                color:#829a9d;
                line-height:1.8;
            ">
                SafeBhoomi AI will combine the risk engine,
                environmental conditions and simulation state
                to explain the current hazard picture.
            </div>

        </div>
        """,
        unsafe_allow_html=True
    )

    area = st.selectbox(
        "District to analyze",
        list(risk_df["District"])
    )

    if st.button(
        "ANALYZE RISK",
        use_container_width=True
    ):

        r = risk_df[
            risk_df["District"] == area
        ].iloc[0]

        st.markdown(
            '<div class="scan"></div>',
            unsafe_allow_html=True
        )

        st.info(
            f"""
            Preliminary SafeBhoomi analysis:

            {area} currently has a calculated risk of
            {r["risk"]*100:.0f}% and is classified as
            {r["level"]}.

            Key indicators:
            rainfall {r["rainfall"]} mm,
            soil saturation {r["soil"]}%,
            slope exposure {r["slope"]}%,
            historical susceptibility {r["historical"]}%.
            """
        )


# ============================================================
# FOOTER
# ============================================================

st.markdown(
    """
    <div class="footer">

        SAFEBHOOMI • LANDSLIDE INTELLIGENCE PLATFORM

        <br><br>

        PREDICT • ANALYZE • RESPOND

    </div>
    """,
    unsafe_allow_html=True
)
