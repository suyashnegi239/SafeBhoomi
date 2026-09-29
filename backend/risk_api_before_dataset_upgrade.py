
from fastapi import APIRouter
from pydantic import BaseModel

from .unified_risk import calculate_unified_risk


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
