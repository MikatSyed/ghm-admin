import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('../src/app/dashboard/products/page.tsx', import.meta.url), 'utf8');

test('product modal keeps product creation identity-only', () => {
  assert.match(source, /Product Identity/);
  assert.match(source, /Actual buy and sell prices are finalized during purchase entry/i);
  assert.doesNotMatch(source, /<Field label="Base Price/);
  assert.doesNotMatch(source, /<Field label="Trade/);
  assert.doesNotMatch(source, /<Field label="Sell Price/);
});

test('product catalog does not present product master prices as active buy and sell prices', () => {
  assert.match(source, /Lot Pricing/);
  assert.match(source, /Set during purchase/i);
  assert.doesNotMatch(source, />Buy<\/p>/);
  assert.doesNotMatch(source, />Sell<\/p>/);
});
