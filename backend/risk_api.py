
from fastapi import APIRouter
from pydantic import BaseModel

from .unified_risk import calculate_unified_risk


router = APIRouter(
    prefix="/api/risk",
    tags=["Risk Intelligence"]
)


class RiskRequest(BaseModel):
    district: str
    rainfall_24h: float = 0
    rainfall_7d: float = 0
    humidity: float = 0
    soil_saturation: float = 0
    historical_susceptibility: float = 0


@router.post("/unified")
def unified_risk(request: RiskRequest):

    result = calculate_unified_risk(
        district=request.district,
        rainfall_24h=request.rainfall_24h,
        rainfall_7d=request.rainfall_7d,
        humidity=request.humidity,
        soil_saturation=request.soil_saturation,
        historical_susceptibility=request.historical_susceptibility
    )

    return result
