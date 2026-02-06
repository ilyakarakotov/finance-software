# Implementation Prompt: Budget Auto-Generation & Reverse Price Solver

## Context

The proforma app currently requires manual entry for every budget line item — construction costs, contingency, GC fees, sales tax, and timing parameters are all entered individually. But in the real Excel spreadsheet these values cascade from a small number of root inputs. This prompt implements that same cascading logic so the user enters ~25 inputs instead of ~100+.

---

## Change 1: Add Construction Cost $/SF to Project Setup

### What to change
Add a `construction_cost_psf` field to the project model and the Project Setup screen.

### Database
```sql
ALTER TABLE projects ADD COLUMN construction_cost_psf DECIMAL(10,2);
```

### UI (Project Setup screen)
Add a field labeled **"Construction Cost ($/SF)"** in the project-level rates section, next to the existing Cost of Sale %, GC Fee %, and Contingency % fields. Default value: `0` (user must enter it).

### No calc engine changes yet — this just stores the value for Change 2 to use.

---

## Change 2: Auto-Generate Construction Budget Line Items from Buildings

### Current behavior
User manually creates 10 budget line items (one per building) in the construction category, typing each dollar amount, start month, duration, and steepness individually.

### New behavior
When the user clicks a new **"Generate Budget from Buildings"** button on the Budget screen, the app should:

1. **Delete** all existing budget line items in categories: `construction`, `contingency`, `gc_fee` (these will be regenerated — do NOT touch `horizontal`, `soft_costs`, `land`, `other`)
2. **For each building** in the project, create these line items automatically:

#### a) Construction line item
```
category: "construction"
description: "Bldg {building.name}"
building_id: {building.id}
budget_amount: project.construction_cost_psf × building.sf_per_unit × building.unit_count
forecast_method: "s_curve"
start_month: building.construction_start_month   ← NEW field on building (see Change 3)
duration_months: building.construction_duration   ← NEW field on building (see Change 3)
s_curve_steepness: 3  (default)
```

#### b) Contingency line item (mirrors parent construction line)
```
category: "contingency"
description: "Bldg {building.name} contingency"
building_id: {building.id}
budget_amount: construction_amount × project.contingency_pct
forecast_method: "s_curve"
start_month: SAME as construction start_month  ← inherited
duration_months: SAME as construction duration  ← inherited
s_curve_steepness: 3  (same as parent)
```

#### c) GC Fee on construction
```
category: "gc_fee"
description: "GC Fee - Bldg {building.name}"
building_id: {building.id}
budget_amount: construction_amount × project.gc_fee_pct
forecast_method: "s_curve"
start_month: SAME as construction start_month  ← inherited
duration_months: SAME as construction duration  ← inherited
s_curve_steepness: 3  (default — the Excel varies this 3-12 per building but that's a quirk, default to 3 for all)
```

3. **After building-level items**, create these project-level derived items:

#### d) GC Fee on total contingency
```
category: "gc_fee"
description: "GC Fee - Contingency"
building_id: NULL
budget_amount: SUM(all contingency amounts) × project.gc_fee_pct
forecast_method: "s_curve"
start_month: earliest contingency start_month
duration_months: (latest contingency end_month) - (earliest contingency start_month)
s_curve_steepness: 3
```

#### e) GC Fee on total horizontal
```
category: "gc_fee"
description: "GC Fee - Horizontal"
building_id: NULL
budget_amount: SUM(all horizontal amounts) × project.gc_fee_pct
forecast_method: "s_curve"
start_month: earliest horizontal start_month
duration_months: 7  (or span of horizontal items)
s_curve_steepness: 3
```

#### f) GC Fee on total soft costs
```
category: "gc_fee"
description: "GC Fee - Soft Costs"
building_id: NULL
budget_amount: SUM(all soft_costs amounts) × project.gc_fee_pct
forecast_method: "s_curve"
start_month: 1
duration_months: 6
s_curve_steepness: 5
```

#### g) Horizontal contingency
```
category: "contingency"
description: "Horizontal Contingency"
building_id: NULL
budget_amount: SUM(all horizontal amounts) × project.contingency_pct
forecast_method: "s_curve"
start_month: earliest horizontal start_month
duration_months: span of horizontal items
s_curve_steepness: 3
```

#### h) Sales Tax on all GC fees
```
category: "gc_fee"
description: "Sales Tax"
building_id: NULL
budget_amount: SUM(all gc_fee amounts created above) × project.sales_tax_rate
forecast_method: "s_curve"
start_month: earliest soft_costs start_month
duration_months: 29  (or span of project active months)
s_curve_steepness: 5
```

### Important behavior notes
- The "Generate Budget from Buildings" button should show a confirmation dialog: *"This will regenerate all construction, contingency, and GC fee line items from building data. Horizontal, soft costs, land, and other items will not be affected. Continue?"*
- After generation, the user CAN still manually edit any generated line item (override the amount, change timing, etc.) — the generation is a starting point, not a lock
- If the user clicks Generate again, it wipes and regenerates the auto-generated categories
- Mark auto-generated items with a flag (e.g., `is_auto_generated: true`) so the UI can show a small badge/icon indicating they were derived, not manually created

---

## Change 3: Add Construction Timing to Buildings

### What to change
Add `construction_start_month` and `construction_duration` fields to the building model and the Project Setup screen's building editor.

### Database
```sql
ALTER TABLE buildings ADD COLUMN construction_start_month INTEGER DEFAULT 1;
ALTER TABLE buildings ADD COLUMN construction_duration INTEGER DEFAULT 6;
```

### UI (Project Setup screen)
In the building editor (where the user currently enters name, unit count, SF per unit), add two more fields:
- **Construction Start (Month)** — integer, which project month construction begins for this building
- **Construction Duration (Months)** — integer, default 6

These are the timing inputs that drive the S-curve distribution for that building's construction, contingency, and GC fee line items.

---

## Change 4: Auto-Calculate Origination Fee

### Current behavior
The origination fee is not explicitly shown — it's buried in the financing calculations or manually entered somewhere.

### New behavior
When the calc engine runs, it should automatically compute:
```
origination_fee = senior_debt_committed × origination_fee_pct
```

And add it to the total project cost (it's a financing cost, not a development cost — it goes in the "total with financing" number alongside interest). The Excel puts it in row 82 of the Development CF sheet.

This should NOT be a manual budget line item. It should be computed internally by the calc engine from the capital stack inputs.

---

## Change 5: Sale Price from $/PSF on Sales Schedule

### Current behavior
User enters a dollar price per unit manually (e.g., $1,130,000).

### New behavior
Add a **$/PSF** column to the Sales Schedule screen. The user workflow becomes:

1. User enters $/PSF for a unit (e.g., 420)
2. Sale price auto-calculates: `ROUND(sf_per_unit × price_psf, -10000)` → rounds to nearest $10K
3. User can still directly type a sale price to override — in that case, the $/PSF field back-calculates: `price / sf`

Add a **"Set Building Default $/PSF"** bulk action:
- User selects a building from a dropdown, enters a $/PSF value
- All units in that building get that $/PSF applied (with prices recalculated)
- Corner/end units can be individually adjusted after the bulk set

### Database
```sql
ALTER TABLE units ADD COLUMN price_per_sf DECIMAL(10,2);
```

The `sale_price` field remains and is always the source of truth for calculations. `price_per_sf` is a convenience input that drives `sale_price` via the formula above.

---

## Change 6: Reverse Price Solver (Target Return → Required $/PSF)

### What it does
The user enters a target return metric, and the app calculates the minimum average $/PSF needed across all units to achieve it.

### UI
Add a **"Price from Target Return"** panel to the Sales Schedule screen (or as a modal/drawer). It contains:

| Field | Input Type | Notes |
|---|---|---|
| Target Metric | Dropdown | Choose: Profit Margin %, Equity Multiple, or Levered IRR |
| Target Value | Number | e.g., 20% margin, 3.0x multiple, or 40% IRR |
| **Calculate** button | | Runs the solver |

**Output:**
- Required average $/PSF across all units
- A breakdown showing per-building suggested $/PSF (proportional to current pricing ratios if any exist, or uniform if starting fresh)
- An **"Apply Prices"** button that sets all unit prices to the solved values

### Solver Logic

**For Profit Margin target:**
```
target_revenue = total_cost_with_financing / (1 - target_margin - cost_of_sale_pct)
required_avg_psf = target_revenue / total_sf
```
This is a direct algebraic solve — no iteration needed.

**For Equity Multiple target:**
```
required_total_distributions = equity_total × target_multiple
required_profit = required_total_distributions - equity_total
required_revenue = total_dev_cost + required_profit + (total_revenue_estimate × cost_of_sale_pct)
// Note: cost_of_sale depends on revenue, so solve:
// revenue = (total_dev_cost + required_profit) / (1 - cost_of_sale_pct)
required_avg_psf = required_revenue / total_sf
```
Also a direct solve.

**For Levered IRR target:**
This requires iteration because IRR depends on the timing of cashflows, which depend on interest costs, which depend on how much debt is drawn, which depends on when costs occur relative to revenue.

Use binary search:
1. Start with a low $/PSF (e.g., break-even) and a high $/PSF (e.g., 2× break-even)
2. Set all unit prices to the midpoint $/PSF
3. Run the calc engine
4. Check the resulting levered IRR
5. If IRR < target, increase $/PSF. If IRR > target, decrease.
6. Repeat until IRR is within 0.1% of target (usually converges in 10-15 iterations)

The break-even $/PSF (floor for the search) is:
```
break_even_psf = (total_dev_cost_with_financing / total_sf) / (1 - cost_of_sale_pct)
```

### Distributing the solved $/PSF across buildings

Once you have the required average $/PSF, distribute it across buildings. Two modes:

**Uniform mode** (default): Every building gets the same $/PSF.

**Proportional mode** (if existing prices exist): Maintain the existing ratio between buildings. For example, if Building A units are currently priced 10% higher than Building C units, scale both by the same multiplier to hit the target average.

```
multiplier = required_avg_psf / current_weighted_avg_psf
new_building_psf = current_building_psf × multiplier
```

---

## Change 7: Break-Even & Target Metrics Display

### What to add
On the Dashboard screen, add a **"Pricing Analysis"** card that shows:

| Metric | Calculation |
|---|---|
| Break-Even $/SF | `(total_cost_with_financing / total_sf) / (1 - cost_of_sale_pct)` |
| Current Avg $/SF | `total_revenue / total_sf` |
| Margin Above Break-Even | `(current_avg - break_even) / break_even` as a percentage |
| $/SF for 20% Margin | Quick reference using the profit margin formula |
| $/SF for 3.0x Multiple | Quick reference using the equity multiple formula |

This gives the user instant context on where their current pricing sits relative to key thresholds.

---

## Change 8: Auto-Derive Equity & Debt from LTC Ratio (Optional Mode)

### Current behavior
User manually enters exact dollar amounts for equity and senior debt on the Capital Stack screen.

### New behavior
Add a toggle on the Capital Stack screen: **"Calculate from LTC Ratio"**

When toggled ON:
- A new **LTC Ratio** field appears (e.g., 90%)
- The committed amounts for equity and senior debt become read-only and auto-calculate:
  ```
  senior_debt = total_dev_cost × ltc_ratio
  equity = total_dev_cost × (1 - ltc_ratio)
  ```
- Since total_dev_cost includes interest which depends on debt amount, this is circular. Resolve it by running the calc engine 3 times in a loop:
  1. First pass: estimate debt from dev cost without interest
  2. Second pass: recalculate with interest from pass 1
  3. Third pass: converges (interest changes less than 0.1%)

When toggled OFF (default): Current manual entry behavior, no changes.

### Database
```sql
ALTER TABLE projects ADD COLUMN use_ltc_ratio BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN ltc_ratio DECIMAL(5,4);
```

---

## Implementation Priority Order

1. **Change 3** (building timing fields) — prerequisite for everything else
2. **Change 1** (construction $/SF on project) — prerequisite for auto-generation
3. **Change 2** (Generate Budget from Buildings button) — the biggest manual labor reduction
4. **Change 5** ($/PSF on Sales Schedule) — quality of life improvement
5. **Change 4** (origination fee auto-calc) — small but correctness matters
6. **Change 7** (break-even metrics) — informational, quick win
7. **Change 6** (reverse price solver) — the power feature
8. **Change 8** (LTC ratio mode) — optional enhancement

---

## Validation

After implementing all changes, the Lowell Heights seed data should still produce the same validation targets:

- Total Development Cost: $30,624,139 (±0.5%)
- Total with Financing: $35,332,769 (±0.5%)
- Total Revenue: $46,040,000 (exact)
- Levered XIRR: 43.44% (±0.5%)
- Equity Multiple: 3.09x (±0.5%)

To validate the auto-generation specifically:
1. Create Lowell Heights with `construction_cost_psf = 146.326086128622`
2. Add all 10 buildings with their SF, unit counts, start months, and durations
3. Manually add the horizontal, soft cost, and land line items
4. Click "Generate Budget from Buildings"
5. The generated construction, contingency, and GC fee line items should match the seed data amounts within rounding

To validate the reverse price solver:
1. Set target Levered IRR = 43.44%
2. Run the solver
3. The resulting average $/PSF should be approximately $451/SF (which is the current weighted average: $46,040,000 / 102,048 SF)

---

## Files to Modify

Based on a typical Next.js + Prisma/Drizzle + SQLite stack:

- **Schema/migrations**: Add columns to `projects`, `buildings`, `units` tables
- **Project Setup page**: Add construction $/SF field, building timing fields
- **Budget page**: Add "Generate Budget from Buildings" button + confirmation dialog + generation logic
- **Sales Schedule page**: Add $/PSF column, bulk set by building, reverse solver panel
- **Capital Stack page**: Add LTC ratio toggle (optional)
- **Dashboard page**: Add pricing analysis card
- **Calc engine**: Add origination fee auto-calc, break-even computation
- **API routes**: New endpoint for budget generation, new endpoint for reverse price solver
