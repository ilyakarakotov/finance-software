# Build Prompt: Greencity Development Finance Platform — Phase 1

## What You're Building

A web-based development finance platform that replaces a complex Excel proforma used by a home building company (Greencity) to model SFR (single-family residential) development projects. Phase 1 must replicate the core analytical engine of the spreadsheet while making it structurally unbreakable and instantly recalculable.

The reference project is a 50-unit SFR development across 10 buildings (A–J) in 2 phases, on 7.5 acres, with ~$35M total development cost and ~$46M gross revenue, targeting 43% levered XIRR.

---

## Tech Stack

- **Frontend**: React + TypeScript, Tailwind CSS, Recharts for charts
- **Backend**: Python (FastAPI)
- **Database**: Azure SQL Database (already provisioned — use pyodbc + ODBC Driver 18 for SQL Server)
- **Calc Engine**: DAG-based dependency graph (core of the system — see below)
- **Auth**: Simple role-based (Admin, Viewer) — no complex RBAC yet

### Azure SQL Notes
- Use `IDENTITY(1,1)` for auto-increment PKs (not SERIAL)
- Use `NVARCHAR` for text fields, `DECIMAL(18,2)` for currency, `DECIMAL(10,6)` for rates/percentages
- Use `DATETIMEOFFSET` for calendar dates
- Connection string format: `mssql+pyodbc://{user}:{password}@{server}.database.windows.net/{db}?driver=ODBC+Driver+18+for+SQL+Server&Encrypt=yes`
- SQLAlchemy engine: set `fast_executemany=True` on the pyodbc connection for bulk insert performance on the monthly cashflow table

---

## Data Model

### Project
```
project_id, name, address, lot_size_acres, start_date, 
total_units, total_sf, cost_of_sale_pct (default 6.5%),
gc_fee_pct (default 12%), contingency_pct (default 5%),
sales_tax_rate
```

### Phase
```
phase_id, project_id, name (e.g. "Phase 1"), 
start_month (relative to project start), sequence
```

### Building
```
building_id, phase_id, name (e.g. "Building A"), 
unit_count, sf_per_unit, total_sf
```

### Unit
```
unit_id, building_id, unit_number, sf, 
sale_price, sale_month (nullable), status (available/under_contract/closed)
```

### Budget Line Item
```
line_item_id, project_id, building_id (nullable for project-level costs),
category (construction/contingency/horizontal/soft_costs/gc_fee/land/other),
subcategory, csi_code (nullable), description,
budget_amount, forecast_method (s_curve/straight_line/manual),
start_month, duration_months, s_curve_steepness (1-9, default 5)
```

### Capital Stack Tranche
```
tranche_id, project_id, type (equity_gp/equity_lp/mezz/senior/land_loan),
committed_amount, interest_rate, origination_fee_pct,
gp_equity_pct, lp_equity_pct, preferred_return_rate,
loan_release_pct (for sales-based payoff)
```

### Promote Tier
```
tier_id, project_id, sequence (0=preferred, 1=tier1, 2=tier2),
hurdle_rate, gp_split, lp_split
```

### Monthly Cashflow (computed, stored for performance)
```
cf_id, project_id, month_number, calendar_date,
-- costs
construction_cost, contingency, horizontal, soft_costs, gc_fee, land, other,
total_development_cost, cumulative_development_cost,
-- financing
equity_draw, senior_draw, senior_balance, senior_interest,
mezz_draw, mezz_balance, mezz_interest, land_loan_draw, land_loan_balance,
-- revenue
gross_sales, cost_of_sale, net_sales, loan_payoff_from_sales,
-- returns
free_cashflow, cumulative_cashflow
```

---

## Calculation Engine (Critical)

This is the heart of the system. The Excel proforma distributes costs across a 71-month timeline using S-curve and straight-line methods, then layers financing draws, interest accrual, sales proceeds, and equity waterfall calculations on top.

### S-Curve Distribution

The spreadsheet uses a logistic S-curve to distribute costs over time. Replicate this exactly:

```python
def s_curve_distribution(total_amount, duration_months, steepness=5):
    """
    Distribute total_amount across duration_months using logistic S-curve.
    steepness: 1 (flat/linear) to 9 (steep/concentrated in middle)
    Returns list of monthly amounts that sum to total_amount.
    """
    import numpy as np
    k = steepness
    midpoint = duration_months / 2
    months = range(duration_months)
    
    # Cumulative S-curve values
    cumulative = [1 / (1 + np.exp(-k * (m - midpoint) / duration_months * 4)) for m in range(duration_months + 1)]
    
    # Normalize to get monthly increments
    total_curve = cumulative[-1] - cumulative[0]
    monthly = [(cumulative[m+1] - cumulative[m]) / total_curve * total_amount for m in months]
    
    # Adjust rounding to match total exactly
    diff = total_amount - sum(monthly)
    monthly[-1] += diff
    
    return monthly
```

### Monthly Cashflow Computation Order

For each month, compute in this exact sequence:

1. **Development Costs**: Sum all budget line items distributed to this month (S-curve or straight-line based on their forecast_method, starting at their start_month for their duration)
2. **Cumulative Development Costs**: Running total
3. **Equity Draws**: equity_pct × monthly development cost (equity funds first, up to committed amount)
4. **Senior Debt Draws**: remaining development cost after equity (up to committed amount)
5. **Mezz Draws**: if applicable, between equity and senior
6. **Loan Balances**: prior balance + draws - payoffs
7. **Interest Accrual**: balance × monthly_rate for each debt tranche
8. **Unit Sales**: sum of sale prices for units closing this month
9. **Cost of Sale**: sales × cost_of_sale_pct
10. **Loan Payoff from Sales**: per-unit allocated loan amount × release_pct
11. **Net Cash from Sales**: gross sales - cost of sale - loan payoff
12. **Free Cashflow to Equity**: net cash from sales - equity draws (in development months) + equity return (in sales months)

### Return Metrics

Compute these from the equity cashflow stream:

- **XIRR**: Use monthly dates and cashflows (scipy.optimize or custom Newton-Raphson). Development months are negative (equity contributions). Sales months are positive (distributions).
- **Equity Multiple**: total distributions / total contributions
- **Project Profit**: total revenue - total development costs - financing costs - cost of sale
- **Profit Margin**: profit / revenue

### Equity Waterfall

Apply the promote structure to total distributable profit:

```
1. Return of capital: LP gets back their equity, GP gets back their equity
2. Preferred return: accrue at pref_rate on unreturned capital, pay pro-rata
3. Tier 1: split remaining profit at tier1 GP/LP split until tier1 hurdle met
4. Tier 2: split remaining profit at tier2 GP/LP split
```

For each of GP and LP, compute: total cashflow, XIRR, equity multiple.

---

## Phase 1 Screens

### 1. Project Setup
- Form to create a project with basic info (name, address, lot size, start date, units, SF)
- Phase builder: add phases with names and start months
- Building builder: add buildings to phases with unit count and SF/unit
- Unit table: auto-generated from buildings, editable sale prices
- **On save**: auto-generate the monthly timeline (start_date through start_date + 71 months)

### 2. Budget / Cost Engine
- Table view grouped by category (Construction, Contingency, Horizontal, Soft Costs, GC Fee, Land, Other)
- Each line item: description, building assignment (or project-level), amount, forecast method, start month, duration, steepness
- **S-curve preview**: small inline sparkline showing the distribution shape as user adjusts steepness
- GC fee line items auto-calculate at gc_fee_pct × their parent category amount
- Contingency auto-calculates at contingency_pct × construction cost per building
- Category subtotals and grand total
- **On any edit**: recalculate the full monthly cashflow timeline

### 3. Capital Stack
- Visual stacked bar showing equity (GP + LP split), mezz, senior debt
- Input fields: committed amounts, rates, origination fees, LP/GP equity percentages
- Derived metrics shown live: LTC ratio, peak equity, peak debt balance, total financing cost
- Promote structure: configurable tiers with hurdle rates and GP/LP splits
- **On any edit**: recalculate waterfall and return metrics

### 4. Monthly Cashflow Timeline
- Horizontal scrolling table (months as columns, line items as rows)
- Collapsible row groups by category
- Color-coded cells: costs in red tones, revenue in green tones, financing in blue tones
- Cumulative total line with sparkline
- Summary row: total monthly cashflow
- **Click any cell**: show calculation breakdown (what formula produced this number)

### 5. Project Summary Dashboard
- Key metrics cards: Total Development Cost, Total Revenue, Project Profit, Profit Margin, Levered XIRR, Equity Multiple
- Sources & Uses table (mirrors the Summary sheet layout)
- Capital stack visualization
- GP vs LP return comparison
- Equity waterfall breakdown table
- **Sensitivity table**: 2D grid varying Sale Price PSF (rows) vs Construction Cost PSF (columns), each cell showing resulting Project Profit and XIRR. Compute by re-running the calc engine at each combination (5×5 grid = 25 scenarios).

### 6. Sales Schedule
- Unit table with: unit #, building, SF, sale price, price PSF, sale month, status, allocated loan amount, net proceeds
- Drag or input sale months to schedule closings
- Running totals: units sold, revenue closed, pipeline value
- Per-unit profit: sale price - allocated cost - commission - allocated loan interest
- **On edit**: recalculate sales-month cashflows and downstream financing/returns

---

## UI/UX Requirements

- **Dark theme** (dark navy/charcoal background, not pure black)
- Financial formatting: use $X,XXX for currency, (X,XXX) for negatives, X.X% for percentages
- Tables should feel spreadsheet-like: dense, aligned, monospace numbers
- All editable inputs highlighted with subtle background color
- Every computed metric should be clickable to show its derivation
- Responsive but optimized for desktop (1440px+ primary target)
- Toast notifications on save/recalculate
- Loading states during recalculation (should be <500ms for full recalc)

---

## Validation Targets

Use the Lowell Heights project as the test case. The system output should match these known values from the spreadsheet:

| Metric | Expected Value |
|---|---|
| Total Development Cost | $30,624,139 |
| Total with Financing | $35,332,769 |
| Total Revenue (50 units) | $46,040,000 |
| Cost of Sale | $2,992,600 |
| Senior Debt Committed | $31,647,401 |
| Equity (GP + LP) | $3,685,368 |
| GP Equity | $2,174,367 |
| LP Equity | $1,511,001 |
| Senior Debt Interest | $3,759,208 |
| Project Profit | $7,714,631 |
| Levered XIRR | 43.44% |
| Equity Multiple | 3.09x |
| Unlevered XIRR | 26.01% |
| GP XIRR | 53.93% |
| LP XIRR | 22.65% |
| GP Multiple | 3.99x |
| LP Multiple | 1.80x |

If the calc engine reproduces these values (within 0.5% tolerance), the core is working.

---

## What's NOT in Phase 1

- Actuals/accounting integration
- Multi-project portfolio view
- Change order workflows
- Investor portal / LP login
- Document generation (PDF reports)
- Monte Carlo / advanced scenario simulation
- Mobile app
- Lease-up / rental income modeling (the spreadsheet has this tab but it's zeroed out for SFR projects)

---

## File Structure Suggestion

```
/frontend
  /src
    /components
      /project      -- ProjectSetup, PhaseBuilder, BuildingBuilder, UnitTable
      /budget        -- BudgetTable, LineItemRow, SCurvePreview
      /capital       -- CapitalStackVisualizer, PromoteBuilder, TrancheInput
      /cashflow      -- CashflowTimeline, CashflowCell, CalculationDrilldown
      /dashboard     -- SummaryDashboard, MetricCard, SensitivityGrid, WaterfallChart
      /sales         -- SalesSchedule, UnitRow, AbsorptionTimeline
      /shared        -- CurrencyInput, PercentInput, MonthPicker, SparkLine
    /hooks
      useProject.ts, useCalcEngine.ts, useCashflow.ts
    /engine
      calcEngine.ts  -- DAG-based recalculation orchestrator
      sCurve.ts      -- S-curve distribution function
      financing.ts   -- Debt draw, interest, payoff logic
      waterfall.ts   -- Equity promote waterfall
      returns.ts     -- XIRR, equity multiple, profit calcs
    /types
      project.ts, budget.ts, capital.ts, cashflow.ts
/backend
  /app
    /api            -- FastAPI routes
    /models         -- SQLAlchemy models (mssql+pyodbc dialect)
    /engine         -- Python calc engine (source of truth)
    /schemas        -- Pydantic schemas
  /migrations       -- Alembic (mssql dialect)
```

---

## Priority Order

Build and validate in this sequence:

1. **Calc engine** (Python backend) — get the numbers right against validation targets
2. **Data model + API** — CRUD for projects, buildings, units, budget items, capital stack
3. **Project setup UI** — create a project, add phases/buildings/units
4. **Budget UI** — enter line items, see S-curve previews
5. **Capital stack UI** — configure financing, see live metrics
6. **Cashflow timeline UI** — the big horizontal table with collapsible rows
7. **Dashboard** — summary metrics, sensitivity grid, waterfall chart
8. **Sales schedule UI** — unit pricing and closing timeline

The calc engine is the foundation. Everything else is presentation of its outputs. Get the engine right first.
