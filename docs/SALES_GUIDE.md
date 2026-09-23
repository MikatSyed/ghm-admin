# GHM Sales Guide

Sales is now a day-control screen plus a history search screen.

## Mental Model

```
Morning                 Day                                      Evening
Distribution      ->    Today: POS + return/damage/wastage  ->   Today: variance review
```

- Morning: use Distribution to load stock onto vans.
- Day: use Sales -> Today to record sales and field adjustments from each van card.
- Evening: stay on Sales -> Today and read each van's variance column to close the day.

Sales are attributed to the van only. There is no customer workflow.

## Sidebar

```
Sales
├── Today
└── History
```

Today is for day-of-operation work. History is for searching, exporting, and voiding old sales.

## Record A Sale

1. Open Sales -> Today.
2. Use + Quick Sale for an unselected POS modal, or use + New Sale on a van card to preselect that van.
3. Pick the van and date if needed.
4. Add products from allocated stock.
5. Set quantity and price in the cart.
6. Press Finalize Sale.

The modal shows "Sale recorded · INV-xxxx" and then closes. The Today cards refresh through the sale mutation's existing invalidation.

## Record A Return, Damage, Or Wastage

1. Open Sales -> Today.
2. Find the van card.
3. Select the product row if needed.
4. Press Return, Damage, or Wastage.
5. Enter the quantity and save.

Return writes to returned stock. Damage and wastage currently share the van damage bucket until the backend splits those summaries.

## Look Up Past Sales

1. Open Sales -> History.
2. Use Today, Week, Month, or Custom date filters.
3. Filter by van or search by sale/invoice text.
4. Click a row to open the sale detail page.
5. Use Export CSV after choosing a date range.

History starts with blank dates so it behaves as a search tool.

## Print, Download, Or Void

Open a sale detail page from History or any receipt link.

- Print Receipt prints only the receipt content.
- Download PDF downloads the invoice when an invoice id exists.
- Void reverses the sale and returns stock to the van. It is disabled when the invoice is paid.

## Reconcile

Use Sales -> Today. Each van card lists Alloc, Sold, Ret, Dmg, Avail, Variance, and Value.

Variance equals available stock. A non-balanced backend reconciliation shows a red discrepancy banner with the affected products.

## Cheat Sheet

Allocate in Distribution. Sell and adjust in Today. Search and export in History. Print and void from Sale Detail.
