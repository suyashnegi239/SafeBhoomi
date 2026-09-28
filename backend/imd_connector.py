
import requests

IMD_API_URL = "https://api.imd.gov.in"


def get_weather_status():
    return {
        "source": "India Meteorological Department",
        "status": "AWAITING_AUTHORIZATION",
        "live": False,
        "message": "IMD live API requires authorized access."
    }


def get_public_imd_rainfall_page():
    url = "https://mausam.imd.gov.in/responsive/rainfallinformation.php"

    try:
        response = requests.get(url, timeout=20)
        response.raise_for_status()

        return {
            "success": True,
            "source": "IMD",
            "url": url,
            "content_length": len(response.text)
        }

    except Exception as e:
        return {
            "success": False,
            "source": "IMD",
            "error": str(e)
        }
