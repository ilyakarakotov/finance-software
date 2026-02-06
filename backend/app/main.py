from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import engine, Base
from app.models import *  # noqa: F401, F403
from app.api import projects, budget, capital, cashflow

settings = get_settings()

# Create all tables on startup (for SQLite dev mode)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Greencity Development Finance Platform",
    version="1.0.0",
    description="Development finance proforma engine for SFR projects",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router, prefix="/api")
app.include_router(budget.router, prefix="/api")
app.include_router(capital.router, prefix="/api")
app.include_router(cashflow.router, prefix="/api")


@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": "1.0.0"}
