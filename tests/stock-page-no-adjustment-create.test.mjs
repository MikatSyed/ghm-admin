import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('../src/app/dashboard/stock/page.tsx', import.meta.url), 'utf8');

test('stock page does not expose manual stock adjustment creation', () => {
  const removedCreationMarkers = [
    'useCreateStockAdjustment',
    'handleCreateAdjustment',
    '<AdjustmentModal',
    'function AdjustmentModal',
    'onNewAdjustment',
    'New Adjustment',
    'Execute Adjustment',
    'function AdjustBtn',
    'setAdjDrawerOpen',
    'function AdjustmentsModal',
  ];

  for (const marker of removedCreationMarkers) {
    assert.equal(source.includes(marker), false, `unexpected stock adjustment creation marker: ${marker}`);
  }
});
