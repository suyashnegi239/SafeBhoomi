from fastapi import APIRouter
from .config import (
    IMD_API_URL,
    IMD_API_KEY,
    GEMINI_API_KEY
)

router = APIRouter(prefix="/api")


# ============================================================
# SYSTEM
# ============================================================

@router.get("/status")
def status():

    return {
        "application": "SafeBhoomi",

        "services": {
            "backend": "online",

            "imd": (
                "configured"
                if IMD_API_KEY
                else "awaiting_api_key"
            ),

            "gemini": (
                "configured"
                if GEMINI_API_KEY
                else "awaiting_api_key"
            ),

            "landslide_database":
                "NRSC_ISRO",

            "terrain_database":
                "NRSC_ISRO_BHUVAN"
        }
    }


# ============================================================
# WEATHER
# ============================================================

@router.get("/weather/{district}")
def weather(district: str):

    # REAL IMD connector will be inserted here.
    # No fake values.

    return {
        "district": district,
        "source": "IMD",
        "status": "pending_live_connector"
    }


# ============================================================
# LANDSLIDES
# ============================================================

@router.get("/landslides/{district}")
def landslides(district: str):

    return {
        "district": district,
        "source": "NRSC/ISRO",
        "status": "historical_inventory"
    }


# ============================================================
# RISK
# ============================================================

@router.get("/risk/{district}")
def risk(district: str):

    return {
        "district": district,
        "status": "risk_engine_ready",
        "source": "SafeBhoomi derived model"
    }
