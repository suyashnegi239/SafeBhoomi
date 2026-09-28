
def calculate_risk(
    rainfall=35,
    humidity=65,
    slope=0.35,
    soil_saturation=0.35,
    historical_factor=0.20
):
    """
    PahadSafe environmental risk engine.

    This is a deterministic baseline model for the hackathon.
    It combines rainfall, humidity, slope, soil saturation
    and historical susceptibility.
    """

    rainfall_score = min(float(rainfall) / 150.0, 1.0)
    humidity_score = min(float(humidity) / 100.0, 1.0)

    slope_score = max(0.0, min(float(slope), 1.0))
    soil_score = max(0.0, min(float(soil_saturation), 1.0))
    historical_score = max(
        0.0,
        min(float(historical_factor), 1.0)
    )

    risk = (
        rainfall_score * 0.30
        + humidity_score * 0.10
        + slope_score * 0.25
        + soil_score * 0.20
        + historical_score * 0.15
    )

    risk = max(0.0, min(risk, 1.0))

    if risk >= 0.75:
        level = "CRITICAL"
    elif risk >= 0.50:
        level = "HIGH"
    elif risk >= 0.30:
        level = "MODERATE"
    else:
        level = "LOW"

    return {
        "risk": round(risk, 3),
        "level": level,
        "components": {
            "rainfall": round(rainfall_score, 3),
            "humidity": round(humidity_score, 3),
            "slope": round(slope_score, 3),
            "soil_saturation": round(soil_score, 3),
            "historical": round(historical_score, 3),
        }
    }
