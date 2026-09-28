import os

# ============================================================
# SAFE BHOOMI API CONFIG
# ============================================================

# Official weather provider
IMD_API_URL = os.getenv(
    "IMD_API_URL",
    "https://api.imd.gov.in"
)

IMD_API_KEY = os.getenv(
    "IMD_API_KEY"
)

# Gemini
GEMINI_API_KEY = os.getenv(
    "GEMINI_API_KEY"
)

# Optional future routing provider
ROUTING_API_KEY = os.getenv(
    "ROUTING_API_KEY"
)

# Application
APP_ENV = os.getenv(
    "APP_ENV",
    "production"
)
