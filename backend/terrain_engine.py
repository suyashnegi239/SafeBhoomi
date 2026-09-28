
import math

# SafeBhoomi terrain intelligence
# Values are MODELLED/DERIVED until an official DEM tile is loaded.

DISTRICT_TERRAIN = {
    "Almora": {
        "elevation_m": 1650,
        "slope_deg": 28,
        "terrain_class": "Mountainous"
    },
    "Bageshwar": {
        "elevation_m": 1890,
        "slope_deg": 31,
        "terrain_class": "Mountainous"
    },
    "Chamoli": {
        "elevation_m": 2400,
        "slope_deg": 34,
        "terrain_class": "High Mountain"
    },
    "Champawat": {
        "elevation_m": 1600,
        "slope_deg": 29,
        "terrain_class": "Mountainous"
    },
    "Dehradun": {
        "elevation_m": 640,
        "slope_deg": 14,
        "terrain_class": "Valley / Foothill"
    },
    "Haridwar": {
        "elevation_m": 300,
        "slope_deg": 5,
        "terrain_class": "Plain / Foothill"
    },
    "Nainital": {
        "elevation_m": 1900,
        "slope_deg": 32,
        "terrain_class": "Mountainous"
    },
    "Pauri Garhwal": {
        "elevation_m": 1650,
        "slope_deg": 30,
        "terrain_class": "Mountainous"
    },
    "Pithoragarh": {
        "elevation_m": 1650,
        "slope_deg": 33,
        "terrain_class": "High Mountain"
    },
    "Rudraprayag": {
        "elevation_m": 2100,
        "slope_deg": 35,
        "terrain_class": "High Mountain"
    },
    "Tehri Garhwal": {
        "elevation_m": 1550,
        "slope_deg": 31,
        "terrain_class": "Mountainous"
    },
    "Udham Singh Nagar": {
        "elevation_m": 250,
        "slope_deg": 4,
        "terrain_class": "Plain"
    },
    "Uttarkashi": {
        "elevation_m": 2100,
        "slope_deg": 36,
        "terrain_class": "High Mountain"
    }
}


def get_terrain(district):
    data = DISTRICT_TERRAIN.get(district)

    if data is None:
        return {
            "district": district,
            "status": "UNAVAILABLE"
        }

    return {
        "district": district,
        **data,
        "status": "MODELLED"
    }


def slope_factor(slope_deg):
    slope = float(slope_deg)

    if slope < 10:
        return 0.15
    elif slope < 20:
        return 0.35
    elif slope < 30:
        return 0.60
    elif slope < 40:
        return 0.82
    else:
        return 1.0


def terrain_risk(district):
    terrain = get_terrain(district)

    if terrain["status"] == "UNAVAILABLE":
        return terrain

    factor = slope_factor(terrain["slope_deg"])

    return {
        **terrain,
        "slope_factor": round(factor, 2)
    }
