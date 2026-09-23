# Stock Entry Pricing Guardrails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure stock recorded through Record Purchase always has an intentional distribution sell price that includes tax/profit/markup when needed, and cannot silently sell at base cost.

**Architecture:** Keep pricing capture at the stock-entry boundary because each purchase lot already stores `basePrice` and `tradePrice`. Distribution should consume the lot/product `tradePrice` as sell price and surface warnings if a lot has no margin. Avoid changing accounting formulas unless verification shows distribution is using base price instead of sell price.

**Tech Stack:** Next.js App Router, React client components, TypeScript, existing API hooks in `src/hooks/api.ts`, Node test runner, ESLint.

---

### Task 1: Lock Down Current Pricing Behavior With Tests

**Files:**
- Modify: `tests/stock-page-no-adjustment-create.test.mjs`
- Create: `tests/stock-entry-pricing-guardrails.test.mjs`
- Read: `src/app/dashboard/stock/page.tsx`

- [ ] **Step 1: Write a failing source-level test for required pricing controls**

Create `tests/stock-entry-pricing-guardrails.test.mjs`:

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('../src/app/dashboard/stock/page.tsx', import.meta.url), 'utf8');

test('record purchase exposes intentional sell price options', () => {
  assert.match(source, /Sell Price Source/);
  assert.match(source, /Product Default Trade Price/);
  assert.match(source, /% Margin on Base/);
  assert.match(source, /Manual Sell Price/);
  assert.match(source, /Profit Margin %/);
  assert.match(source, /tradePrice: resolvedSellPrice/);
});

test('record purchase has a guard against selling at or below base cost', () => {
  assert.match(source, /sellPriceBelowCost|sellPriceAtCost|marginWarning/);
  assert.match(source, /Sell price must be higher than base price|sell price is at or below base/i);
});
```

- [ ] **Step 2: Run test and verify it fails on missing guardrail**

Run:

```bash
node --test tests/stock-entry-pricing-guardrails.test.mjs
```

Expected: first test passes, second test fails because the current form calculates `resolvedSellPrice` but does not block/warn on `resolvedSellPrice <= basePrice`.

---

### Task 2: Add Purchase Form Pricing Guardrails

**Files:**
- Modify: `src/app/dashboard/stock/page.tsx`
- Test: `tests/stock-entry-pricing-guardrails.test.mjs`

- [ ] **Step 1: Add explicit margin state near `resolvedSellPrice` in `EntryModal`**

In `EntryModal`, after `resolvedSellPrice`, add:

```ts
  const sellPriceAtOrBelowCost = !!form.productId && form.basePrice > 0 && resolvedSellPrice <= form.basePrice;
  const marginAmount = resolvedSellPrice - (form.basePrice || 0);
```

- [ ] **Step 2: Prevent submit when sell price is at or below base cost**

Change `canSubmit` to:

```ts
  const canSubmit =
    !!form.date &&
    !!form.productId &&
    form.quantity > 0 &&
    form.basePrice > 0 &&
    form.source.trim().length > 0 &&
    !sellPriceAtOrBelowCost;
```

- [ ] **Step 3: Show clear inline warning below sell price controls**

After the `Sell Price Source` grid, add:

```tsx
              {sellPriceAtOrBelowCost && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    color: '#ef4444',
                    fontSize: 11,
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  <AlertTriangle size={14} />
                  Sell price must be higher than base price before distribution.
                </div>
              )}
```

- [ ] **Step 4: Make the summary show actual margin**

Under the `Sell Snapshot` summary metric, keep the existing source line and add:

```tsx
            <p>Margin ৳{marginAmount.toLocaleString()}</p>
```

- [ ] **Step 5: Run the focused test**

Run:

```bash
node --test tests/stock-entry-pricing-guardrails.test.mjs
```

Expected: PASS.

---

### Task 3: Verify Distribution Uses Sell Price, Not Base Price

**Files:**
- Read: `src/components/BatchAllocatePicker.tsx`
- Read: `src/components/sections/DistributionSection.tsx`
- Optional modify: `src/components/BatchAllocatePicker.tsx`

- [ ] **Step 1: Confirm allocation picker uses sell price snapshot**

Check that drafted lots use:

```ts
tradePrice: lot.tradePrice ?? product?.tradePrice ?? 0
```

Expected: distribution draft value should be based on `tradePrice`, while cost remains `basePrice`.

- [ ] **Step 2: Add a warning if any selectable lot has sell price at or below cost**

In `BatchAllocatePicker`, near the lot row where it displays `cost` and `sell`, compute:

```ts
const tradePrice = lot.tradePrice ?? product?.tradePrice ?? 0;
const belowCost = tradePrice <= lot.basePrice;
```

Display a compact warning when `belowCost`:

```tsx
{belowCost && (
  <span style={{ marginLeft: 8, color: '#ef4444', fontWeight: 900 }}>
    · sell price <= cost
  </span>
)}
```

- [ ] **Step 3: Run TypeScript**

Run:

```bash
./node_modules/.bin/tsc --noEmit
```

Expected: exit code 0.

---

### Task 4: Final Verification

**Files:**
- Verify: `src/app/dashboard/stock/page.tsx`
- Verify: `src/components/BatchAllocatePicker.tsx`
- Verify: `tests/stock-entry-pricing-guardrails.test.mjs`

- [ ] **Step 1: Run focused tests**

Run:

```bash
node --test tests/stock-page-no-adjustment-create.test.mjs tests/stock-entry-pricing-guardrails.test.mjs
```

Expected: all tests pass.

- [ ] **Step 2: Run typecheck**

Run:

```bash
./node_modules/.bin/tsc --noEmit
```

Expected: exit code 0.

- [ ] **Step 3: Run lint**

Run:

```bash
npm run lint
```

Expected: exit code 0. Existing warnings may remain if unrelated.

- [ ] **Step 4: Run build if network is available**

Run:

```bash
npm run build
```

Expected: build succeeds. If it fails fetching Google fonts, report that as a network/environment blocker rather than a code failure.

---

## Self-Review

- Spec coverage: The plan fixes purchase-entry sell price capture, prevents base-cost selling, and confirms distribution uses `tradePrice`.
- Placeholder scan: No TBD/TODO placeholders.
- Type consistency: Uses existing names from `EntryModal`: `form`, `resolvedSellPrice`, `basePrice`, and `tradePrice`.
