# GHM Dashboard — Features

Ops dashboard for **GHM Fresh** (Green Harvest Mark), a van-distribution business selling fresh produce in Bangladesh. Covers the full cycle: purchase → warehouse stock → van distribution / direct sale → invoice → accounting.

## Dashboard (Overview)
- Today's revenue, expenses, profit, invoice count
- Stock-on-hand and low-stock count
- Revenue/cost/profit/stock trend chart (daily / weekly / monthly / yearly)
- Van performance comparison (revenue, efficiency %, returns)
- Category-wise revenue breakdown
- Low-stock alerts
- Recent activity feed (sales, expenses, stock movements)

## Stock (Warehouse)
- Stock entries & batches — FIFO cost lots per product, per receiving batch
- Stock adjustments — damage, wastage, correction, from warehouse or van
- Condition tracking: Fresh / Aging / Damaged / Custom (kept as separate FIFO groups)
- Batch-wise allocation picker for pulling specific lots

## Distribution
- **Van Distribution** — morning allocation of warehouse stock onto each van
- Per-line editing: allocated / returned / damage-returned quantities
- Salvage flow — recover damaged van stock back into a new stock batch
- **Customer Orders (Distribution Orders)** — restaurant/shop issue → confirm flow; stock only moves on confirm, producing a sale + invoice

## Customers
- Restaurant / Shop / Direct / Other customer records, used by Distribution Orders and direct sales

## Sales
- **Today** — day-control screen: POS-style sale entry per van, plus return/damage/wastage adjustments from each van card; live variance (Alloc, Sold, Ret, Dmg, Avail, Value) to reconcile the day
- Quick Sale (unselected POS modal) and per-van New Sale
- Direct customer sale (outside the van round)
- **History** — search/filter by van/date, CSV export, void old sales
- **Sale Detail** — print receipt, download invoice PDF, void (blocked once the invoice is paid)
- "Print Last" — reprint the most recent sale for a van

## Expenses
- Categorized operating costs (Fuel, Van Rent, Labor, Shipping, Market Fees, ...), optionally tied to a van
- Paid / pending status, date filtering, CSV export

## Banking
- Bank account balance and transaction tracking (deposits/withdrawals), linkable to purchases

## Accounting
- Monthly ledger — revenue, cost, expenses, gross/net profit, stock units
- Van profitability — revenue/expenses/net profit per van, by month
- Batch profitability — per-batch (and per-product-within-batch) cost, sold qty/revenue/COGS, realized profit, remaining unsold qty, warehouse/van loss, potential profit

## Invoices
- List/detail view with line items
- Status: unpaid → paid (one-way — can't revert once paid)
- PDF download, CSV export

## Reports
- Sales, Expenses, Stock, Profit-by-Van reports with date range filters
- CSV export for every report type

## Search
- Cross-entity search across sales, stock, expenses, and returns
- Filters: date range, van, category, status

## Products & Categories (Settings)
- Product catalog with 4-tier pricing ladder: Base Price → List Price → Trade Price → MRP (tax/profit/other % recipe per tier, live-computed client-side)
- Category management with daily stats
- Soft delete / restore

## Account & App
- JWT login, profile view, logout
- Light/dark theme toggle
- Collapsible sidebar navigation

## Cross-cutting
- Bangladesh-specific: BDT integer pricing (no decimals), Asia/Dhaka calendar for all business dates, Taka-in-words for printed documents
- Print-ready invoice and order-slip documents, isolated from app chrome
- Role-aware display (Admin / Manager / Staff)
