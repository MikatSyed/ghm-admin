import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const stockPageSource = readFileSync(new URL('../src/app/dashboard/stock/page.tsx', import.meta.url), 'utf8');
const expensesPageSource = readFileSync(new URL('../src/app/dashboard/expenses/page.tsx', import.meta.url), 'utf8');
const batchPickerSource = readFileSync(new URL('../src/components/BatchAllocatePicker.tsx', import.meta.url), 'utf8');

test('record purchase exposes intentional sell price options', () => {
  assert.match(stockPageSource, /Sell Price Source/);
  assert.match(stockPageSource, /Product Default Trade Price/);
  assert.match(stockPageSource, /% Margin on Base/);
  assert.match(stockPageSource, /Manual Sell Price/);
  assert.match(stockPageSource, /Profit Margin %/);
  assert.match(stockPageSource, /tradePrice: resolvedSellPrice/);
});

test('record purchase has a guard against selling at or below base cost', () => {
  assert.match(stockPageSource, /sellPriceAtOrBelowCost/);
  assert.match(stockPageSource, /Sell price must be higher than base price/i);
});

test('distribution picker warns when lot sell price is at or below cost', () => {
  assert.match(batchPickerSource, /belowCost/);
  assert.match(batchPickerSource, /sell price <= cost/i);
});

test('distribution picker prefers landed lot cost over raw base price when available', () => {
  assert.match(batchPickerSource, /const landedUnitCost = .*effectiveBuyPrice .*lot\.basePrice/s);
  assert.match(batchPickerSource, /const unitCost = landedUnitCost\(lot\)/);
  assert.match(batchPickerSource, /unitCost,/);
});

test('purchase modal requires an intentional sell price after landed cost is known', () => {
  assert.match(expensesPageSource, /sellMode: 'percent'/);
  assert.doesNotMatch(expensesPageSource, /<option value="default">Product Default<\/option>/);
  assert.match(expensesPageSource, /const sellPrice = l\.sellMode === 'manual'\s*\?\s*\(Number\(l\.sellPrice\) \|\| 0\)\s*:\s*l\.sellMode === 'percent'\s*\?\s*\(l\.profitPercent \? Math\.round\(effectiveBuyPrice \* \(1 \+ Number\(l\.profitPercent\) \/ 100\)\) : 0\)\s*:\s*0/s);
  assert.match(expensesPageSource, /Sell price must be higher than landed cost for every line/i);
});
