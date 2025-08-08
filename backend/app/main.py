from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routes.speaking import router as speaking_router


settings = get_settings()

app = FastAPI(title="IELTS Speaking Coach")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.client_origin, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {"status": "ok", "env": settings.app_env}


app.include_router(speaking_router, prefix="/api")