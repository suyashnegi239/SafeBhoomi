
from fastapi import APIRouter

router = APIRouter(prefix="/api/landslide-map", tags=["Landslide Map"])

# Official Bhuvan/NRSC map service reference.
# We keep this as a map-layer source instead of inventing coordinates.
BHUVAN_LANDSLIDE_PORTAL = (
    "https://bhuvan-app1.nrsc.gov.in/"
    "disaster/usrtasks/landslide/landslide.php"
)

@router.get("/source")
def landslide_source():
    return {
        "provider": "NRSC/ISRO",
        "platform": "Bhuvan",
        "type": "historical_landslide_inventory",
        "portal": BHUVAN_LANDSLIDE_PORTAL,
        "status": "AVAILABLE",
        "data_period": "1998-2022 atlas inventory",
        "note": (
            "Historical inventory. It must not be presented "
            "as a live landslide count."
        )
    }

@router.get("/layers")
def landslide_layers():
    return {
        "provider": "NRSC/ISRO Bhuvan",
        "layers": [
            {
                "id": "landslide_inventory",
                "name": "Landslide Inventory",
                "type": "HISTORICAL"
            },
            {
                "id": "event_based",
                "name": "Event-Based Inventory",
                "type": "HISTORICAL"
            },
            {
                "id": "route_wise",
                "name": "Route-Wise Inventory",
                "type": "HISTORICAL"
            },
            {
                "id": "seasonal",
                "name": "Seasonal Inventory",
                "type": "HISTORICAL"
            }
        ]
    }
