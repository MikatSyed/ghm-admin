import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const layoutSource = readFileSync(new URL('../src/app/layout.tsx', import.meta.url), 'utf8');
const globalsSource = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8');

test('root layout does not require network font fetches during build', () => {
  assert.equal(layoutSource.includes('next/font/google'), false);
  assert.equal(layoutSource.includes('Geist'), false);
});

test('global CSS defines local font-family variables', () => {
  assert.match(globalsSource, /--font-sans:\s*system-ui/);
  assert.match(globalsSource, /--font-mono:\s*ui-monospace/);
});
