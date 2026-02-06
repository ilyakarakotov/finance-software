# Greencity Development Finance Platform — Phase 1

A web-based development finance platform that replaces a complex Excel proforma used by Greencity to model SFR (single-family residential) development projects.

## Tech Stack

- **Frontend**: React + TypeScript, Tailwind CSS, Recharts, React Router
- **Backend**: Python (FastAPI)
- **Database**: Azure SQL Database (pyodbc + ODBC Driver 18)
- **Calc Engine**: DAG-based dependency graph with S-curve distribution

## Quick Start

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Copy .env.example to .env and fill in your Azure SQL credentials
cp .env.example .env

# Run the server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server runs on `http://localhost:5173` and proxies `/api` requests to `http://localhost:8000`.

## Project Structure

```
/backend
  /app
    /api          — FastAPI routes (projects, budget, capital, cashflow)
    /models       — SQLAlchemy models (Azure SQL / mssql+pyodbc)
    /engine       — Python calc engine (S-curve, financing, waterfall, returns)
    /schemas      — Pydantic request/response schemas
  requirements.txt

/frontend
  /src
    /api          — API client functions
    /components
      /project    — ProjectSetup, ProjectList
      /budget     — BudgetTable with S-curve preview
      /capital    — CapitalStack visualizer, promote builder
      /cashflow   — CashflowTimeline (horizontal scrolling table)
      /dashboard  — SummaryDashboard, metrics, sensitivity grid, waterfall
      /sales      — SalesSchedule (unit pricing and closing timeline)
      /shared     — CurrencyInput, PercentInput, MetricCard, SparkLine
      /layout     — AppLayout with sidebar navigation
    /hooks        — useProject, useCalcEngine
    /types        — TypeScript interfaces
    /utils        — Formatting helpers
```

## Screens

1. **Project Setup** — Create projects, add phases/buildings/units
2. **Budget / Cost Engine** — Line items by category, S-curve previews
3. **Capital Stack** — Equity/debt tranches, promote tiers, live metrics
4. **Cashflow Timeline** — Monthly horizontal table with collapsible rows
5. **Dashboard** — Key metrics, sources & uses, waterfall, sensitivity grid
6. **Sales Schedule** — Unit pricing, sale months, status tracking

## Validation Targets (Lowell Heights)

| Metric | Expected |
|---|---|
| Total Development Cost | $30,624,139 |
| Total Revenue | $46,040,000 |
| Senior Debt Interest | $3,759,208 |
| Project Profit | $7,714,631 |
| Levered XIRR | 43.44% |
| Equity Multiple | 3.09x |
