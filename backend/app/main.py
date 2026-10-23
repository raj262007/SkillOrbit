import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables from the project root .env
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

from app.routes import admission, admin, auth, student, progress, leaderboard
app = FastAPI(
    title="PathForge AI — Backend API",
    description="FastAPI backend for the PathForge AI EdTech platform.",
    version="1.0.0",
)

# ─────────────────────────────────────────────────────────────────────────────
# CORS — allow Next.js frontend
# ─────────────────────────────────────────────────────────────────────────────
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_URL,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://192.168.56.1:3000",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app|http://localhost:.*|http://127\.0\.0\.1:.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────────────────────
# Routers — all prefixed with /api
# ─────────────────────────────────────────────────────────────────────────────
app.include_router(admission.router, prefix="/api", tags=["Admission"])
app.include_router(admin.router, prefix="/api", tags=["Admin"])
app.include_router(auth.router, prefix="/api", tags=["Auth"])
app.include_router(student.router, prefix="/api", tags=["Student"])
app.include_router(progress.router, prefix="/api", tags=["Progress"])
app.include_router(leaderboard.router, prefix="/api", tags=["Leaderboard"])


@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "message": "PathForge AI API is running."}