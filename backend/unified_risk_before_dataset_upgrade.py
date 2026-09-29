
import sys
from pathlib import Path

# Make backend folder available when running directly in Colab
BACKEND_DIR = Path("/content/landslide_project/backend")

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

try:
    from .terrain_engine import get_terrain, slope_factor
except ImportError:
    from terrain_engine import get_terrain, slope_factor


def calculate_unified_risk(
    district,
    rainfall_24h=0,
    rainfall_7d=0,
    humidity=0,
    soil_saturation=0,
    historical_susceptibility=0
):

    terrain = get_terrain(district)

    if terrain.get("status") == "UNAVAILABLE":
        return {
            "district": district,
            "status": "UNAVAILABLE",
            "message": "Terrain data unavailable for this district."
        }

    # Normalize inputs
    rain24 = min(max(float(rainfall_24h) / 150.0, 0), 1)
    rain7 = min(max(float(rainfall_7d) / 500.0, 0), 1)
    hum = min(max(float(humidity) / 100.0, 0), 1)
    soil = min(max(float(soil_saturation) / 100.0, 0), 1)
    hist = min(max(float(historical_susceptibility), 0), 1)

    slope = float(terrain["slope_deg"])
    slp = min(max(slope / 45.0, 0), 1)

    # Unified risk score
    score = (
        rain24 * 0.25 +
        rain7 * 0.15 +
        hum * 0.10 +
        slp * 0.20 +
        soil * 0.15 +
        hist * 0.15
    )

    score = round(score * 100, 1)

    # Risk classification
    if score >= 75:
        level = "CRITICAL"
    elif score >= 50:
        level = "HIGH"
    elif score >= 30:
        level = "MODERATE"
    else:
        level = "LOW"

    # Explain the risk
    drivers = []

    if rainfall_24h >= 100:
        drivers.append("Very heavy recent rainfall")
    elif rainfall_24h >= 50:
        drivers.append("Heavy recent rainfall")

    if rainfall_7d >= 250:
        drivers.append("High accumulated rainfall")

    if slope >= 30:
        drivers.append("Steep terrain")

    if soil_saturation >= 75:
        drivers.append("High soil saturation")

    if historical_susceptibility >= 0.7:
        drivers.append("High historical susceptibility")
    elif historical_susceptibility >= 0.4:
        drivers.append("Moderate historical susceptibility")

    if not drivers:
        drivers.append("No major elevated indicator detected")

    return {
        "district": district,

        "risk": {
            "score": score,
            "level": level
        },

        "terrain": {
            "elevation_m": terrain["elevation_m"],
            "slope_deg": slope,
            "terrain_class": terrain["terrain_class"],
            "slope_factor": slope_factor(slope)
        },

        "inputs": {
            "rainfall_24h_mm": rainfall_24h,
            "rainfall_7d_mm": rainfall_7d,
            "humidity_percent": humidity,
            "soil_saturation_percent": soil_saturation,
            "historical_susceptibility": historical_susceptibility
        },

        "risk_drivers": drivers,

        "data_status": {
            "terrain": "MODELLED",
            "rainfall": "INPUT",
            "soil": "INPUT",
            "historical_susceptibility": "INPUT"
        },

        "engine": {
            "name": "SafeBhoomi Unified Risk Engine",
            "version": "1.0"
        }
    }
