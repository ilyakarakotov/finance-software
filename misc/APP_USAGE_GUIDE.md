# Greencity Finance Platform — Usage Guide

## Getting Started

The app launches at **http://localhost:5173**. The home screen shows a list of projects. The **Lowell Heights** project is pre-loaded with seed data so you can explore all screens immediately.

Click a project name to enter it. Use the sidebar to navigate between screens.

---

## Screens & Inputs

### 1. Project Setup (`/project/:id/setup`)

All fields on this screen are **manual inputs**.

| Field | Input Type | Notes |
|---|---|---|
| Project Name | Manual | Free text |
| Address | Manual | Free text |
| Lot Size (acres) | Manual | Decimal |
| Start Date | Manual | Date picker — sets month 1 of the timeline |
| Total Units | Manual | Integer |
| Total SF | Manual | Integer |
| Cost of Sale % | Manual | Default 6.5% — applied to gross sales |
| GC Fee % | Manual | Default 12% |
| Contingency % | Manual | Default 5% |
| Sales Tax Rate | Manual | Default 0% |

**Phases** and **Buildings** are also created manually here:
- Add a phase, give it a name and sequence number
- Add buildings to a phase with a name, unit count, and SF per unit
- **Units are auto-generated** when a building is created (one per `unit_count`), inheriting the building's SF. Prices and sale months must be set manually on the Sales Schedule screen.

---

### 2. Budget / Cost Engine (`/project/:id/budget`)

| Field | Input Type | Notes |
|---|---|---|
| Category | Manual | Select from: construction, contingency, horizontal, soft_costs, gc_fee, land, other |
| Description | Manual | Free text label |
| Building Assignment | Manual | Optional — link a line item to a specific building |
| Budget Amount ($) | Manual | Total dollar amount for this line item |
| Forecast Method | Manual | `s_curve` or `straight_line` |
| Start Month | Manual | Which project month spending begins |
| Duration (months) | Manual | How many months the spend is distributed over |
| S-Curve Steepness | Manual | 1 (flat) to 12 (steep) — only used with `s_curve` method |

**Automatic outputs on this screen:**
- **S-Curve Sparkline** — a mini chart auto-generated from the line item's amount, duration, and steepness, showing how the spend distributes over time
- **Category Subtotals** — auto-summed per category group
- **Grand Total** — auto-summed across all line items

Click **Recalculate** to run the full calc engine after making budget changes.

---

### 3. Capital Stack (`/project/:id/capital`)

| Field | Input Type | Notes |
|---|---|---|
| Tranche Type | Manual | equity, senior, mezz, land_loan |
| Committed Amount ($) | Manual | Total capital committed |
| Interest Rate (%) | Manual | Annual rate (senior/mezz/land) |
| Origination Fee (%) | Manual | Upfront fee on debt |
| GP / LP Equity Split (%) | Manual | Only for equity tranche |
| Preferred Return Rate (%) | Manual | Only for equity tranche |
| Loan Release (%) | Manual | Multiplier on allocated loan per unit sale (e.g., 1.15 = 115%) |

**Promote Tiers** (also manual):
| Field | Input Type |
|---|---|
| Sequence | Manual |
| Hurdle Rate (%) | Manual |
| GP Split (%) | Manual |
| LP Split (%) | Manual |

**Automatic outputs on this screen:**
- **Stacked bar chart** — visual breakdown of capital sources
- **Metric cards** (Total Dev Cost, Equity Multiple, Project IRR, Profit Margin) — auto-calculated after running Recalculate

---

### 4. Cashflow Timeline (`/project/:id/cashflow`)

**This entire screen is automatic output.** There are no manual inputs here.

After clicking **Recalculate**, the calc engine produces a month-by-month timeline showing:

| Row Group | What It Shows |
|---|---|
| Development Costs | Construction, contingency, horizontal, soft costs, GC fee, land — distributed via S-curve/straight-line from budget inputs |
| Financing | Equity draws, senior/mezz/land loan draws & balances, interest accruals — computed from capital stack inputs and draw-order logic |
| Revenue | Gross sales, cost of sale, net sales, loan payoff from sales — driven by unit prices and sale months |
| Returns | Free cashflow, cumulative cashflow — derived from all of the above |

You can collapse/expand row groups and click individual cells for detail.

---

### 5. Dashboard (`/project/:id/dashboard`)

**This entire screen is automatic output.** No manual inputs.

Displays after recalculation:
- **Key Metrics** — Total Dev Cost, Total w/ Financing, Revenue, Profit, Margin, Levered IRR, Equity Multiple
- **Sources & Uses** — Pie charts auto-generated from capital stack and budget
- **Equity Waterfall** — Bar chart showing GP vs LP distributions based on promote tiers
- **Sensitivity Grid** — 5×5 matrix varying cost and revenue assumptions (click "Load Sensitivity" to generate)

---

### 6. Sales Schedule (`/project/:id/sales`)

| Field | Input Type | Notes |
|---|---|---|
| Sale Price ($) | Manual | Per-unit selling price |
| Sale Month | Manual | Project month when unit closes |
| Status | Manual | available, reserved, sold, closed |

**Automatic outputs:**
- **Unit list** — auto-populated from buildings (unit number, SF, building name inherited)
- **Running totals** — total units, total revenue, average price per SF

---

## Manual vs Automatic — Quick Reference

### You Enter (Manual Inputs)
- Project details (name, dates, rates, SF)
- Phase & building structure
- Budget line items (amounts, timing, distribution method)
- Capital stack (debt terms, equity splits, promote structure)
- Unit sale prices and closing months

### The Engine Calculates (Automatic Outputs)
- Monthly cost distribution (S-curve / straight-line)
- Capital draw sequencing (equity first, then debt)
- Interest accrual on debt balances
- Loan payoff from unit sales
- Free cashflow per month
- Cumulative cashflow
- Project IRR (levered & unlevered), equity multiple
- GP/LP waterfall distributions
- Sensitivity analysis across cost/revenue scenarios
- All charts, sparklines, totals, and metric cards

---

## Recalculation

The calc engine does **not** run automatically when you change inputs. After making changes on any input screen, click the **Recalculate** button (available on Budget, Capital Stack, Cashflow, and Dashboard screens) to rerun the full engine. This updates all downstream outputs across every screen.

---

## Current Limitations

- **No live database connection** — the app runs on a local SQLite file with pre-loaded Lowell Heights seed data
- **No auto-save** — changes to project setup fields require clicking Save; budget and capital stack fields save on blur
- **No undo** — deleted items (phases, buildings, budget lines, tranches) cannot be recovered
- **Single project** — while the app supports multiple projects, only Lowell Heights is seeded
- **Desktop only** — the UI is optimized for desktop screen widths
