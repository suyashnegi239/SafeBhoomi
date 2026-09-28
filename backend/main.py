from pathlib import Path
from .risk_api import router as risk_router
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from .api_routes import router


app = FastAPI(
    title="SafeBhoomi API",
    description="Landslide Intelligence Platform for Uttarakhand",
    version="1.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():

    return {
        "application": "SafeBhoomi",
        "status": "online",
        "message": "Know the mountain before it moves."
    }


@app.get("/health")
def health():

    return {
        "status": "healthy"
    }


app.include_router(router)


app.include_router(risk_router)


# ---------------------------------------------------------
# REACT PRODUCTION BUILD
# ---------------------------------------------------------
FRONTEND_DIST = Path("/content/landslide_project/frontend_react/dist")

if FRONTEND_DIST.exists():
    app.mount(
        "/",
        StaticFiles(directory=FRONTEND_DIST, html=True),
        name="frontend"
    )
