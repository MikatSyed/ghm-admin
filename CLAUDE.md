@AGENTS.md

# GHM Dashboard — Project Context

Frontend for **GHM Fresh** (Green Harvest Mark) — a van-distribution business selling fresh produce in Bangladesh. This app is the ops dashboard: warehouse stock, van distribution, POS-style sales, invoicing, expenses, banking, accounting and reporting.

Talks to the `ghm-server` backend (NestJS + Prisma + PostgreSQL, sibling repo at `../ghm-server`). For the full domain model (FIFO stock-lot tracking, pricing ladder, Prisma schema) and API contract, read `../ghm-server/PROJECT_CONTEXT.md` and `../ghm-server/README.md` before making cross-cutting changes — this file only covers the frontend.

## Stack
- Next.js 16 (App Router) + React 19 + TypeScript (strict)
- Data fetching: TanStack Query v5 — **every** API call goes through `src/hooks/api.ts` (one big file, grouped by domain, with a `qk` query-key map)
- State: Zustand v5 (`src/store/`) — auth, theme, in-progress sales cart
- Charts: Recharts. Icons: lucide-react. Dates: date-fns.
- Styling: hand-rolled CSS custom properties in `src/app/globals.css` (`--primary`, `--surface`, `--border-soft`, ...) plus inline `style={}` objects in components — **no Tailwind, no component library**.
- E2E: Playwright, tests in `tests/*.test.mjs` + `tests/*.setup.ts`, auth state cached at `tests/.auth/user.json`

## Scripts
- `npm run dev` / `build` / `start` — Next.js
- `npm run lint`
- `npm run test:e2e` / `test:e2e:ui` / `test:e2e:report` — Playwright (app must be running at `E2E_BASE_URL`, default `http://localhost:3001`)

## Backend connection
Controlled by `NEXT_PUBLIC_API_BASE_URL`:
- **Current `.env`: `/api/v1`** (same-origin) → requests hit the Next.js route handler proxy at `src/app/api/v1/[...path]/route.ts`, which forwards to `http://localhost:6398/api/v1` (hardcoded in that file — must match ghm-server's own `.env` `PORT`). This sidesteps CORS and keeps the backend host off the client.
- Point it at a backend URL directly to bypass the proxy.

`src/lib/api.ts` is the actual fetch wrapper (`api.get/post/put/patch/del/download`): attaches `Authorization: Bearer <token>` from `localStorage['ghm.token']`, throws a typed `ApiError` (status/code/fields) on non-2xx, and has a `.download()` helper for CSV/PDF blob responses.

## Auth
JWT bearer token. `useAuth` (Zustand, persisted to `localStorage['ghm.auth']`) holds `{ token, user }`; `lib/api.ts` reads the token from a separate `localStorage['ghm.token']` key kept in sync by the store. `AuthGate` (wraps the whole dashboard layout) blocks rendering until the Zustand store rehydrates, then redirects `/login` ↔ `/dashboard` based on token presence, and logs out on a 401 from `GET /auth/me`.

## Pages (`src/app/dashboard/*`)

| Route | Feature |
|---|---|
| `/dashboard` | Overview — today's metrics, revenue/cost/profit series, van performance, category breakdown, low-stock alerts, activity feed |
| `/stock` | Stock entries & batches (FIFO cost lots), stock adjustments (damage/wastage/correction) |
| `/distribution` | Morning warehouse → van allocation |
| `/distribution-orders` | Restaurant/shop **issue → confirm** order flow (separate from van sales) |
| `/customers` | Restaurant/shop/direct-customer records |
| `/sales` (Today) | POS sale entry per van + return/damage/wastage adjustments + day-close variance review |
| `/sales/history` | Search, filter, export CSV, void old sales |
| `/sales/[id]` | Sale detail — print receipt, download invoice PDF, void |
| `/expenses` | Operating costs, optionally per-van |
| `/banking` | Bank account balances/transactions |
| `/accounting` | Monthly ledger, van profitability, batch profitability |
| `/invoices` | List/detail, PDF download, CSV export, paid/unpaid status (one-way: can't revert from paid) |
| `/reports` | Sales / expenses / stock / profit-by-van reports, CSV export |
| `/search` | Cross-entity search (sales, stock, expenses, returns) |
| `/products`, `/categories` (under Settings in nav) | Catalog management |
| `/profile`, `/settings` | Account / app settings |

Nav structure (sections, order, icons) lives in `src/components/Sidebar.tsx` (`navSections`) — update it when adding or removing a page.

## Sales flow (see `docs/SALES_GUIDE.md` for the full guide)
```
Morning: Distribution -> load stock onto vans
Day:     Sales -> Today -> POS sale + return/damage/wastage per van card
Evening: Sales -> Today -> read each van's variance column to close the day
```
Sales are attributed to a van only — there's no customer field on a van sale (that's what Distribution Orders is for). `SalesPOSModal` / `DirectSaleModal` record sales; `VanDayCard` is the per-van summary card (Alloc/Sold/Ret/Dmg/Avail/Variance/Value).

## Components of note
- `MainLayout`, `Sidebar`, `Topbar` — dashboard chrome
- `PrintPortal` + `invoice-print.css` — isolates invoice/order-slip printing from app chrome
- `invoices/InvoiceDocument.tsx`, `invoices/OrderSlipDocument.tsx` — printable documents
- `sales/SalesPOSModal.tsx`, `sales/DirectSaleModal.tsx`, `sales/VanDayCard.tsx` — sales entry
- `BatchAllocatePicker.tsx`, `VanAdjustmentPopup.tsx` — stock lot / distribution editing
- `ui/DataTable.tsx`, `ui/SearchFilterBar.tsx`, `ui/QuickFilterChips.tsx`, `ui/StatTile.tsx`, `ui/StatusBadge.tsx` — shared list/table primitives, reused across every list page

## Conventions
- All API access goes through `src/hooks/api.ts`. Mutations invalidate related query keys manually — stock-affecting mutations (sales, distributions, adjustments, stock entries) cascade invalidation across `products`, `stock-entries`, `stock-batches`, `vans`, and `dashboard` together since they all derive from the same FIFO stock state on the backend.
- Domain types in `src/lib/types.ts` mirror the backend's Prisma models — keep in sync with `ghm-server/prisma/schema.prisma`, especially the pricing-ladder field names (`basePrice`/`listPrice`/`tradePrice`/`mrp`, **not** the old `buyPrice`/`sellPrice`).
- `src/lib/pricing.ts` (`computeLadder`) mirrors the backend's pricing-ladder math exactly, for live client-side preview without a round-trip — keep the two in sync if that formula ever changes server-side.
- Money: integers in BDT, no decimals (matches backend). `taka-in-words.ts` spells amounts out in words for printed documents.
- Dates: `YYYY-MM-DD`, Asia/Dhaka calendar (matches backend) — see `src/lib/format.ts` (`todayInDhakaISO`, etc.).
- Theme: light/dark via `data-theme` attribute on `<html>`, toggled by `useTheme` (persisted to `localStorage`).
- Company/invoice letterhead placeholders (address, BIN, TIN) live in `src/lib/company.ts` — currently unfilled placeholder values, not real registration data.
