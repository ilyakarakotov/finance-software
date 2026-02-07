from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import engine, Base
from app.models import *  # noqa: F401, F403
from app.api import projects, budget, capital, cashflow
from app.api.cost_codes import router as cost_codes_router
from app.api.contractors import router as contractors_router
from app.api.benchmarks import router as benchmarks_router
from app.api.loan_draws import router as loan_draws_router
from app.api.builders_capital import router as builders_capital_router

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
app.include_router(cost_codes_router, prefix="/api")
app.include_router(contractors_router, prefix="/api")
app.include_router(benchmarks_router, prefix="/api")
app.include_router(loan_draws_router, prefix="/api")
app.include_router(builders_capital_router, prefix="/api")


@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": "1.0.0"}
