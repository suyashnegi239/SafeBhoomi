import requests
import os
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
FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend_react" / "dist"

if FRONTEND_DIST.exists():
    app.mount(
        "/",
        StaticFiles(directory=FRONTEND_DIST, html=True),
        name="frontend"
    )


# ============================================================
# SAFEBHOOMI AI ANALYST
# ============================================================

from pydantic import BaseModel

class AIAnalystRequest(BaseModel):
    question: str
    district: str = "Uttarakhand"

@app.post("/api/ai/analyze")
def ai_analyze(request: AIAnalystRequest):

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        return {
            "success": False,
            "error": "AI service is not configured on the server."
        }

    question = request.question.strip()

    if not question:
        return {
            "success": False,
            "error": "Please enter a question."
        }

    # Keep the prompt focused on SafeBhoomi's purpose.
    prompt = f"""
You are SafeBhoomi AI Analyst, an intelligent landslide-risk
assistant for Uttarakhand, India.

District selected: {request.district}

User question:
{question}

Give a concise, practical analysis.

Rules:
- Focus on landslide risk, rainfall, terrain, soil saturation,
  hazards, emergency preparedness, monitoring and safer response.
- Do not invent live measurements.
- Clearly say when information is modelled or unavailable.
- Use simple language suitable for students and general users.
- Do not present yourself as an emergency authority.
- If there is an immediate emergency, advise contacting local
  emergency services and following official local instructions.
"""

    try:
        url = (
            "https://generativelanguage.googleapis.com/"
            "v1beta/models/gemini-2.5-flash:generateContent"
        )

        response = requests.post(
            url,
            params={"key": api_key},
            json={
                "contents": [
                    {
                        "parts": [
                            {"text": prompt}
                        ]
                    }
                ]
            },
            timeout=30
        )

        if response.status_code != 200:
            return {
                "success": False,
                "error": f"AI service returned HTTP {response.status_code}."
            }

        data = response.json()

        try:
            answer = (
                data["candidates"][0]
                ["content"]["parts"][0]["text"]
            )
        except (KeyError, IndexError, TypeError):
            return {
                "success": False,
                "error": "AI returned an unexpected response."
            }

        return {
            "success": True,
            "district": request.district,
            "answer": answer,
            "model": "gemini-2.5-flash"
        }

    except requests.RequestException:
        return {
            "success": False,
            "error": "Could not connect to the AI service."
        }

