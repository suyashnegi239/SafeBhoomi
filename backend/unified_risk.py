
import sys
import json
import sqlite3
from pathlib import Path

# ============================================================
# SafeBhoomi Unified Risk Engine
# Dataset-backed district intelligence
# ============================================================

# ------------------------------------------------------------
# Deployment-safe project paths
# Works locally in Colab AND when deployed on Render.
# ------------------------------------------------------------
BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BACKEND_DIR.parent

DISTRICT_DATA = (
    PROJECT_DIR
    / "frontend_react"
    / "public"
    / "safebhoomi_districts.json"
)

DB_PATH = PROJECT_DIR / "data" / "safebhoomi.db"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

try:
    from .terrain_engine import get_terrain
except ImportError:
    from terrain_engine import get_terrain


def load_district_data():
    """Load the SafeBhoomi district dataset."""
    if not DISTRICT_DATA.exists():
        return {}

    try:
        with open(DISTRICT_DATA, "r", encoding="utf-8") as f:
            rows = json.load(f)

        return {
            str(row.get("district", "")).strip().lower(): row
            for row in rows
            if row.get("district")
        }

    except Exception:
        return {}


def get_district_data(district):
    data = load_district_data()
    return data.get(str(district).strip().lower())


def get_historical_landslide_count(district):
    """
    Historical inventory count from the SQLite landslides table.

    IMPORTANT:
    This is separate from recent_landslides.
    An empty inventory is reported as unavailable rather than 0
    because zero records does not prove zero historical events.
    """

    if not DB_PATH.exists():
        return None

    try:
        conn = sqlite3.connect(DB_PATH)

        row = conn.execute(
            """
            SELECT COUNT(*)
            FROM landslides
            WHERE LOWER(TRIM(district)) = LOWER(TRIM(?))
            """,
            (district,)
        ).fetchone()

        conn.close()

        count = int(row[0]) if row else 0

        return count if count > 0 else None

    except Exception:
        return None


def calculate_unified_risk(
    district,
    rainfall_24h=None,
    rainfall_7d=None,
    humidity=None,
    soil_saturation=None,
    historical_susceptibility=None,
    recent_landslides=None,
    road_blockages=None
):

    district_data = get_district_data(district)

    if district_data is None:
        return {
            "district": district,
            "status": "UNAVAILABLE",
            "message": "District data unavailable."
        }

    # --------------------------------------------------------
    # Dataset-backed values
    # --------------------------------------------------------

    rainfall_24h = (
        district_data.get("rainfall_mm", 0)
        if rainfall_24h is None
        else rainfall_24h
    )

    rainfall_7d = (
        district_data.get("rainfall_7d_mm")
        if rainfall_7d is None
        else rainfall_7d
    )

    # The current district JSON does not contain 7-day rainfall.
    rainfall_7d_available = rainfall_7d is not None

    humidity = (
        district_data.get("humidity_pct", 0)
        if humidity is None
        else humidity
    )

    soil_saturation = (
        district_data.get("soil_saturation_pct", 0)
        if soil_saturation is None
        else soil_saturation
    )

    historical_susceptibility = (
        district_data.get("historical_susceptibility", 0)
        if historical_susceptibility is None
        else historical_susceptibility
    )

    recent_landslides = (
        district_data.get("recent_landslides", 0)
        if recent_landslides is None
        else recent_landslides
    )

    road_blockages = (
        district_data.get("road_blockages", 0)
        if road_blockages is None
        else road_blockages
    )

    # --------------------------------------------------------
    # Terrain
    # --------------------------------------------------------

    terrain = get_terrain(district)

    if terrain.get("status") == "UNAVAILABLE":
        return {
            "district": district,
            "status": "UNAVAILABLE",
            "message": "Terrain data unavailable for this district."
        }

    # IMPORTANT:
    # Use the district dataset slope as the primary slope value
    # because it belongs to the same district-level dataset.
    slope = district_data.get("slope_deg")

    if slope is None:
        slope = terrain["slope_deg"]

    elevation = terrain["elevation_m"]

    # --------------------------------------------------------
    # Normalize model inputs
    # --------------------------------------------------------

    rain24 = min(max(float(rainfall_24h) / 150.0, 0), 1)

    if rainfall_7d_available:
        rain7 = min(max(float(rainfall_7d) / 500.0, 0), 1)
    else:
        rain7 = 0

    hum = min(max(float(humidity) / 100.0, 0), 1)

    soil = min(max(float(soil_saturation) / 100.0, 0), 1)

    hist = min(
        max(float(historical_susceptibility), 0),
        1
    )

    slp = min(max(float(slope) / 45.0, 0), 1)

    # --------------------------------------------------------
    # Unified risk score
    #
    # Historical susceptibility remains the historical
    # model factor. Recent landslides and road blockages
    # are contextual indicators and are NOT treated as
    # historical inventory counts.
    # --------------------------------------------------------

    score = (
        rain24 * 0.25 +
        rain7 * 0.10 +
        hum * 0.10 +
        slp * 0.20 +
        soil * 0.15 +
        hist * 0.20
    )

    score = round(score * 100, 1)

    # --------------------------------------------------------
    # Risk classification
    # --------------------------------------------------------

    if score >= 75:
        level = "CRITICAL"
    elif score >= 50:
        level = "HIGH"
    elif score >= 30:
        level = "MODERATE"
    else:
        level = "LOW"

    # --------------------------------------------------------
    # Historical inventory
    # --------------------------------------------------------

    historical_landslides = get_historical_landslide_count(district)

    if historical_landslides is None:
        historical_status = "NOT_IMPORTED"
    else:
        historical_status = "IMPORTED"

    # --------------------------------------------------------
    # Risk drivers
    # --------------------------------------------------------

    drivers = []

    if float(rainfall_24h) >= 100:
        drivers.append("Very heavy recent rainfall")
    elif float(rainfall_24h) >= 60:
        drivers.append("Heavy recent rainfall")
    elif float(rainfall_24h) >= 40:
        drivers.append("Elevated recent rainfall")

    if rainfall_7d_available and float(rainfall_7d) >= 250:
        drivers.append("High accumulated rainfall")

    if float(slope) >= 40:
        drivers.append("Very steep terrain")
    elif float(slope) >= 30:
        drivers.append("Steep terrain")

    if float(soil_saturation) >= 75:
        drivers.append("Very high soil saturation")
    elif float(soil_saturation) >= 60:
        drivers.append("Elevated soil saturation")

    if float(historical_susceptibility) >= 0.70:
        drivers.append("High historical susceptibility")
    elif float(historical_susceptibility) >= 0.40:
        drivers.append("Moderate historical susceptibility")

    if float(recent_landslides) >= 30:
        drivers.append("High recent landslide activity")
    elif float(recent_landslides) >= 15:
        drivers.append("Recent landslide activity detected")

    if float(road_blockages) >= 3:
        drivers.append("Multiple road blockages")

    if not drivers:
        drivers.append("No major elevated indicator detected")

    # --------------------------------------------------------
    # Response
    # --------------------------------------------------------

    return {
        "district": district,
        "status": "AVAILABLE",

        "risk": {
            "score": score,
            "level": level
        },

        "terrain": {
            "elevation_m": elevation,
            "slope_deg": slope,
            "terrain_class": terrain["terrain_class"],
            "source": "SafeBhoomi district terrain dataset"
        },

        "inputs": {
            "rainfall_24h_mm": rainfall_24h,
            "rainfall_7d_mm": rainfall_7d,
            "humidity_percent": humidity,
            "soil_saturation_percent": soil_saturation,
            "historical_susceptibility": historical_susceptibility,
            "recent_landslides": recent_landslides,
            "road_blockages": road_blockages
        },

        "historical": {
            "historical_landslides": historical_landslides,
            "status": historical_status,
            "source": "NRSC/ISRO historical inventory"
        },

        "risk_drivers": drivers,

        "data_status": {
            "terrain": "MODELLED",
            "rainfall": "DATASET",
            "soil": "DATASET",
            "historical_susceptibility": "DATASET",
            "recent_landslides": "DATASET",
            "road_blockages": "DATASET",
            "historical_landslides": historical_status
        },

        "engine": {
            "name": "SafeBhoomi Unified Risk Engine",
            "version": "2.0-dataset-backed"
        }
    }
