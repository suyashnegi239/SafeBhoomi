
from fastapi import APIRouter
from pydantic import BaseModel

from backend.unified_risk import calculate_unified_risk
import os
import json
import urllib.request
import urllib.error


router = APIRouter(
    prefix="/api/risk",
    tags=["Risk Intelligence"]
)


class RiskRequest(BaseModel):
    district: str

    # Optional overrides.
    # If omitted, the Unified Risk Engine reads the
    # SafeBhoomi district dataset automatically.
    rainfall_24h: float | None = None
    rainfall_7d: float | None = None
    humidity: float | None = None
    soil_saturation: float | None = None
    historical_susceptibility: float | None = None
    recent_landslides: float | None = None
    road_blockages: float | None = None


@router.post("/unified")
def unified_risk(request: RiskRequest):

    result = calculate_unified_risk(
        district=request.district,
        rainfall_24h=request.rainfall_24h,
        rainfall_7d=request.rainfall_7d,
        humidity=request.humidity,
        soil_saturation=request.soil_saturation,
        historical_susceptibility=request.historical_susceptibility,
        recent_landslides=request.recent_landslides,
        road_blockages=request.road_blockages
    )

    return result


# ============================================================
# SAFEBHOOMI AI ANALYST
# ============================================================

@router.post("/ai/analyze")
async def ai_analyze(payload: dict):
    """
    SafeBhoomi AI Analyst.

    Uses the current SafeBhoomi risk data supplied by the frontend.
    If a Gemini API key is configured, Gemini generates the response.
    Otherwise a deterministic SafeBhoomi assessment is returned.
    """

    question = str(payload.get("question", "")).strip()

    if not question:
        return {
            "error": "Please enter a question for the AI Analyst."
        }

    # --------------------------------------------------------
    # Collect SafeBhoomi context
    # --------------------------------------------------------
    context = payload.get("context", {})

    if not isinstance(context, dict):
        context = {}

    district = (
        payload.get("district")
        or context.get("district")
        or "Selected district"
    )

    risk = (
        payload.get("risk")
        or context.get("risk")
        or context.get("risk_level")
        or "UNKNOWN"
    )

    rainfall_24h = context.get("rainfall_24h_mm")
    rainfall_7d = context.get("rainfall_7d_mm")
    slope = context.get("slope_deg")
    elevation = context.get("elevation_m")
    soil = context.get("soil_saturation")
    landslides = context.get("recent_landslides")
    roads = context.get("road_blockages")
    susceptibility = context.get("historical_susceptibility")

    safe_context = {
        "district": district,
        "risk": risk,
        "rainfall_24h_mm": rainfall_24h,
        "rainfall_7d_mm": rainfall_7d,
        "slope_deg": slope,
        "elevation_m": elevation,
        "soil_saturation": soil,
        "recent_landslides": landslides,
        "road_blockages": roads,
        "historical_susceptibility": susceptibility,
    }

    # --------------------------------------------------------
    # Gemini — optional
    # --------------------------------------------------------
    api_key = os.getenv("GEMINI_API_KEY")

    if api_key:

        prompt = f"""
You are SafeBhoomi AI Analyst, a disaster-risk analysis assistant.

Use ONLY the supplied SafeBhoomi data.
Do not invent rainfall, landslide, road, soil, terrain, or weather values.

DISTRICT:
{district}

CURRENT SAFEBHOOMI RISK:
{risk}

AVAILABLE DATA:
{json.dumps(safe_context, indent=2)}

USER QUESTION:
{question}

Give a concise, clear answer for a student/user.

Rules:
- Explain what the available data means.
- If a value is unavailable, explicitly say it is unavailable.
- Never fabricate measurements.
- Do not claim that an event is happening unless the supplied data supports it.
- Give practical safety guidance when relevant.
- Distinguish between observed data and interpretation.
"""

        try:
            url = (
                "https://generativelanguage.googleapis.com/"
                "v1beta/models/gemini-2.5-flash:generateContent"
                f"?key={api_key}"
            )

            request_body = {
                "contents": [
                    {
                        "parts": [
                            {
                                "text": prompt
                            }
                        ]
                    }
                ]
            }

            request = urllib.request.Request(
                url,
                data=json.dumps(request_body).encode("utf-8"),
                headers={
                    "Content-Type": "application/json"
                },
                method="POST",
            )

            with urllib.request.urlopen(request, timeout=30) as response:
                result = json.loads(response.read().decode("utf-8"))

            answer = (
                result
                .get("candidates", [{}])[0]
                .get("content", {})
                .get("parts", [{}])[0]
                .get("text", "")
            )

            if answer:
                return {
                    "answer": answer,
                    "source": "SafeBhoomi AI Analyst",
                    "district": district,
                    "risk": risk,
                }

        except Exception as ai_error:
            print("Gemini AI error:", ai_error)

    # --------------------------------------------------------
    # Safe deterministic fallback
    # --------------------------------------------------------
    observations = []

    if rainfall_24h is not None:
        observations.append(
            f"24-hour rainfall is {rainfall_24h} mm."
        )

    if rainfall_7d is not None:
        observations.append(
            f"7-day rainfall is {rainfall_7d} mm."
        )

    if slope is not None:
        observations.append(
            f"terrain slope is {slope}°."
        )

    if elevation is not None:
        observations.append(
            f"elevation is {elevation} m."
        )

    if soil is not None:
        observations.append(
            f"soil saturation is {soil}."
        )

    if landslides is not None:
        observations.append(
            f"recent landslide records: {landslides}."
        )

    if roads is not None:
        observations.append(
            f"reported road blockages: {roads}."
        )

    if observations:
        observation_text = " ".join(observations)
    else:
        observation_text = (
            "Detailed measurements are currently unavailable."
        )

    answer = (
        f"SafeBhoomi's current assessment for {district} is "
        f"{risk}. {observation_text} "
        f"Based on the available data, this should be treated as a "
        f"risk assessment rather than a prediction of a landslide."
    )

    return {
        "answer": answer,
        "source": "SafeBhoomi Risk Engine",
        "district": district,
        "risk": risk,
        "data": safe_context,
    }

