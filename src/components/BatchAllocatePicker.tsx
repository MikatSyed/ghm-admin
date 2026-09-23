'use client';

import React, { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useProducts, useAvailableStockLots } from '@/hooks/api';
import type { AvailableStockLot } from '@/hooks/api';
import type { StockCondition } from '@/lib/types';
import {
  Plus,
  Loader2,
  Trash2,
  X,
  CheckCircle2,
  Search,
  Boxes,
  ChevronLeft,
  Layers,
} from 'lucide-react';

export type DraftLine = {
  productId: string;
  allocated: number;
  batchId?: string | null;
  stockEntryId?: string;
};

type DraftEntry = DraftLine & {
  key: string;
  productName: string;
  unit: string;
  batchLabel: string;
  unitCost: number;
  tradePrice: number;
  condition: StockCondition;
  maxQty: number;
};

const CONDITION_COLORS: Record<StockCondition, string> = {
  FRESH: '#10b981',
  AGING: '#f59e0b',
  DAMAGED: '#ef4444',
  CUSTOM: '#6366f1',
};

const dateOnlyToDate = (value: string) => new Date(`${value.slice(0, 10)}T00:00:00`);
const landedUnitCost = (lot: AvailableStockLot) => lot.effectiveBuyPrice ?? lot.basePrice;

type BatchGroup = {
  batchId: string;
  label: string;
  date: string;
  source: string;
  lots: AvailableStockLot[];
  totalRemaining: number;
};

type ProductRowGroup = {
  productId: string;
  rows: AvailableStockLot[];
};

// For every product present in the anchor batch, pull in ALL its available
// lots system-wide (fresh + damaged, any batch) so a driver can assign fresh
// stock, salvaged/discounted stock, or a mix of both in one go — instead of
// having to separately hunt down whichever batch the salvage happened to land in.
function buildProductGroups(anchorLots: AvailableStockLot[], allLots: AvailableStockLot[]): ProductRowGroup[] {
  const seenLotIds = new Set<string>();
  const groups: ProductRowGroup[] = [];
  const groupByProduct = new Map<string, ProductRowGroup>();

  const addLot = (lot: AvailableStockLot) => {
    if (seenLotIds.has(lot.id)) return;
    let group = groupByProduct.get(lot.productId);
    if (!group) {
      group = { productId: lot.productId, rows: [] };
      groupByProduct.set(lot.productId, group);
      groups.push(group);
    }
    group.rows.push(lot);
    seenLotIds.add(lot.id);
  };

  anchorLots.forEach(addLot);

  // Only pull in DAMAGED siblings from other batches — salvaged stock always
  // lands in its own auto-created batch, so it can never literally sit inside
  // the purchase batch a driver opens. Fresh/aging stock from OTHER batches is
  // intentionally left out: opening BAT-004 should offer only BAT-004's own
  // fresh lot for a product, not every other batch's fresh lot for it too.
  const productIds = new Set(anchorLots.map(l => l.productId));
  allLots
    .filter(l => productIds.has(l.productId) && l.condition === 'DAMAGED')
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach(addLot);

  return groups;
}

function groupLotsByBatch(lots: AvailableStockLot[]): BatchGroup[] {
  const groups = new Map<string, BatchGroup>();
  lots.forEach(lot => {
    const key = lot.batchId ?? `__direct__:${lot.id}`;
    const existing = groups.get(key);
    if (existing) {
      existing.lots.push(lot);
      existing.totalRemaining += lot.remainingQuantity;
    } else {
      groups.set(key, {
        batchId: key,
        label: lot.batch?.id ?? (lot.batchId ?? 'Direct entry'),
        date: lot.batch?.date ?? lot.date,
        source: lot.batch?.source ?? lot.source,
        lots: [lot],
        totalRemaining: lot.remainingQuantity,
      });
    }
  });
  return Array.from(groups.values()).sort((a, b) => b.date.localeCompare(a.date));
}

export default function BatchAllocatePicker({
  contextLabel,
  date,
  pending,
  submitLabel,
  emptyDraftHint,
  excludeLotIds,
  onCancel,
  onSubmit,
}: {
  contextLabel: string;
  date: string;
  pending: boolean;
  submitLabel: string;
  emptyDraftHint: string;
  excludeLotIds?: Set<string>;
  onCancel?: () => void;
  onSubmit: (lines: DraftLine[]) => Promise<void> | void;
}) {
  const productsQ = useProducts({ pageSize: 200, status: 'Active' });
  const lotsQ = useAvailableStockLots();
  const products = productsQ.data?.data ?? [];
  const allLots = lotsQ.data?.data ?? [];
  const productById = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);

  const lots = useMemo(
    () => (excludeLotIds ? allLots.filter(l => !excludeLotIds.has(l.id)) : allLots),
    [allLots, excludeLotIds],
  );

  const [batchSearch, setBatchSearch] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [perLotQty, setPerLotQty] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<DraftEntry[]>([]);
  // Per-product Fresh/Damaged toggle inside the batch picker — avoids showing
  // every fresh + every damaged lot for a product at once.
  const [productMode, setProductMode] = useState<Record<string, 'fresh' | 'damaged'>>({});

  const batches = useMemo(() => groupLotsByBatch(lots), [lots]);

  const filteredBatches = useMemo(() => {
    const term = batchSearch.trim().toLowerCase();
    if (!term) return batches;
    return batches.filter(b =>
      [b.label, b.source, b.date].some(v => v.toLowerCase().includes(term)) ||
      b.lots.some(l => (productById.get(l.productId)?.name ?? l.product?.name ?? '').toLowerCase().includes(term)),
    );
  }, [batches, batchSearch, productById]);

  const selectedBatch = useMemo(
    () => batches.find(b => b.batchId === selectedBatchId) ?? null,
    [batches, selectedBatchId],
  );

  const productGroups = useMemo(
    () => (selectedBatch ? buildProductGroups(selectedBatch.lots, lots) : []),
    [selectedBatch, lots],
  );

  const draftByLot = useMemo(() => {
    const m = new Map<string, number>();
    draft.forEach(d => {
      if (d.stockEntryId) m.set(d.stockEntryId, (m.get(d.stockEntryId) ?? 0) + d.allocated);
    });
    return m;
  }, [draft]);

  const selectBatch = (id: string) => {
    setSelectedBatchId(id);
    setPerLotQty({});
  };

  const closeBatch = () => {
    setSelectedBatchId(null);
    setPerLotQty({});
  };

  const setLotQty = (lot: AvailableStockLot, raw: string) => {
    const inDraft = draftByLot.get(lot.id) ?? 0;
    const max = Math.max(0, lot.remainingQuantity - inDraft);
    if (raw === '') {
      setPerLotQty(prev => ({ ...prev, [lot.id]: '' }));
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return;
    setPerLotQty(prev => ({ ...prev, [lot.id]: String(Math.min(n, max)) }));
  };

  const fillLot = (lot: AvailableStockLot) => {
    const inDraft = draftByLot.get(lot.id) ?? 0;
    const remaining = Math.max(0, lot.remainingQuantity - inDraft);
    setPerLotQty(prev => ({ ...prev, [lot.id]: String(remaining) }));
  };

  const addSelectedToDraft = () => {
    if (!selectedBatch) return;
    const additions: DraftEntry[] = [];
    // Iterate every row shown (fresh + any damaged siblings pulled in for the
    // same product), not just the lots that literally belong to this batch —
    // a driver may fill in both a fresh row and a damaged row for one product.
    productGroups.flatMap(g => g.rows).forEach(lot => {
      const raw = perLotQty[lot.id];
      const qty = Number(raw);
      if (!Number.isFinite(qty) || qty <= 0) return;
      const product = productById.get(lot.productId);
      const unitCost = landedUnitCost(lot);
      additions.push({
        key: `${lot.id}:${Date.now()}:${additions.length}`,
        productId: lot.productId,
        allocated: qty,
        batchId: lot.batchId,
        stockEntryId: lot.id,
        productName: product?.name ?? lot.product?.name ?? lot.productId,
        unit: product?.unit ?? lot.product?.unit ?? 'unit',
        batchLabel: lot.batch?.id ?? (lot.batchId ?? 'Direct'),
        unitCost,
        tradePrice: lot.tradePrice ?? product?.tradePrice ?? 0,
        condition: lot.condition,
        maxQty: lot.remainingQuantity,
      });
    });
    if (additions.length === 0) return;
    setDraft(prev => [...prev, ...additions]);
    closeBatch();
  };

  const removeDraft = (key: string) => setDraft(prev => prev.filter(d => d.key !== key));

  const updateDraftQty = (key: string, raw: string) => {
    const n = Number(raw);
    setDraft(prev => prev.map(d => {
      if (d.key !== key) return d;
      if (raw === '') return { ...d, allocated: 0 };
      if (!Number.isFinite(n) || n < 0) return d;
      // Other draft entries against same lot — keep their share reserved
      const otherReserved = prev
        .filter(o => o.stockEntryId === d.stockEntryId && o.key !== d.key)
        .reduce((s, o) => s + o.allocated, 0);
      const max = Math.max(0, d.maxQty - otherReserved);
      return { ...d, allocated: Math.min(n, max) };
    }));
  };

  const totalUnits = useMemo(() => {
    const totals = new Map<string, number>();
    draft.forEach(d => totals.set(d.unit, (totals.get(d.unit) ?? 0) + d.allocated));
    return Array.from(totals.entries())
      .map(([unit, qty]) => `${qty.toLocaleString()} ${unit}`)
      .join(', ');
  }, [draft]);

  const totalCost = draft.reduce((s, d) => s + d.allocated * d.unitCost, 0);
  const totalValue = draft.reduce((s, d) => s + d.allocated * d.tradePrice, 0);

  const submit = async () => {
    // Merge drafts targeting the same (productId, batchId) so the backend only
    // receives one line per pair. If merged entries came from different lots,
    // drop the specific stockEntryId so the backend allocates within the batch.
    const merged = new Map<string, DraftLine>();
    draft
      .filter(d => d.allocated > 0)
      .forEach(d => {
        const key = `${d.productId}::${d.batchId ?? ''}`;
        const existing = merged.get(key);
        if (existing) {
          const sameLot = existing.stockEntryId === d.stockEntryId;
          merged.set(key, {
            productId: d.productId,
            allocated: existing.allocated + d.allocated,
            batchId: d.batchId,
            stockEntryId: sameLot ? existing.stockEntryId : undefined,
          });
        } else {
          merged.set(key, {
            productId: d.productId,
            allocated: d.allocated,
            batchId: d.batchId,
            stockEntryId: d.stockEntryId,
          });
        }
      });
    if (merged.size === 0) return;
    await onSubmit(Array.from(merged.values()));
  };

  const loading = lotsQ.isLoading || productsQ.isLoading;

  return (
    <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: '11px', fontWeight: 900, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Allocate from stock batches
          </p>
          <p
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: 'var(--text-muted)',
              opacity: 0.6,
              marginTop: '3px',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
            }}
          >
            {contextLabel} · {date}
          </p>
        </div>
        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={pending}>
            <X size={13} style={{ marginRight: 6 }} /> Close
          </button>
        )}
      </div>

      {/* Step 1 — Batch list */}
      {!selectedBatch && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <StepBadge num={1} label="Pick a batch" />
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search
                size={13}
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', opacity: 0.5 }}
              />
              <input
                type="text"
                className="input-premium"
                placeholder="Search batches, products, sources…"
                value={batchSearch}
                onChange={e => setBatchSearch(e.target.value)}
                style={{ width: '100%', paddingLeft: 34, fontSize: 12 }}
              />
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <span key={i} className="skeleton" style={{ height: 96, borderRadius: 14 }} />
              ))}
            </div>
          ) : lotsQ.isError ? (
            <ErrorBanner message={`Failed to load batches: ${lotsQ.error instanceof Error ? lotsQ.error.message : 'Unknown error'}`} />
          ) : filteredBatches.length === 0 ? (
            <EmptyCard
              icon={<Boxes size={32} />}
              title={batchSearch ? 'No batches match' : 'No batches with available stock'}
            />
          ) : (
            <div
              className="custom-scrollbar"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '0.75rem',
                maxHeight: '52vh',
                overflowY: 'auto',
                paddingRight: '0.25rem',
              }}
            >
              {filteredBatches.map(b => {
                const draftedFromBatch = draft.filter(d => d.batchId === (b.batchId.startsWith('__direct__') ? null : b.batchId)).length;
                return (
                  <button
                    key={b.batchId}
                    type="button"
                    onClick={() => selectBatch(b.batchId)}
                    style={{
                      textAlign: 'left',
                      padding: '14px',
                      borderRadius: '14px',
                      background: 'var(--overlay-soft)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      color: 'var(--text-main)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      transition: 'all 0.15s',
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.borderColor = 'rgba(16,185,129,0.4)';
                      e.currentTarget.style.background = 'rgba(16,185,129,0.05)';
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.background = 'var(--overlay-soft)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Layers size={14} style={{ color: 'var(--primary)' }} />
                        <span style={{ fontSize: 12, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{b.label}</span>
                      </div>
                      {draftedFromBatch > 0 && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            letterSpacing: '0.15em',
                            padding: '3px 8px',
                            borderRadius: 999,
                            background: 'rgba(16,185,129,0.15)',
                            color: 'var(--primary)',
                          }}
                        >
                          {draftedFromBatch} drafted
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.12em',
                      }}
                    >
                      {b.source} · {b.date.slice(0, 10)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-main)' }}>
                        {b.lots.length} product{b.lots.length === 1 ? '' : 's'}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--primary)', fontVariantNumeric: 'tabular-nums' }}>
                        {b.totalRemaining.toLocaleString()} left
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 2 — Products inside selected batch */}
      {selectedBatch && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={closeBatch}
              className="btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <ChevronLeft size={13} /> Back to batches
            </button>
            <StepBadge num={2} label={`Pick products in ${selectedBatch.label}`} />
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                opacity: 0.7,
              }}
            >
              {selectedBatch.source} · {selectedBatch.date.slice(0, 10)}
            </span>
          </div>

          <div className="custom-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '46vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
            {productGroups.map(group => {
              const product = productById.get(group.productId);
              const productName = product?.name ?? group.rows[0]?.product?.name ?? group.productId;
              const freshRows = group.rows.filter(r => r.condition !== 'DAMAGED');
              const damagedRows = group.rows.filter(r => r.condition === 'DAMAGED');
              const hasBoth = freshRows.length > 0 && damagedRows.length > 0;
              const mode = productMode[group.productId] ?? (freshRows.length > 0 ? 'fresh' : 'damaged');
              const visibleRows = mode === 'fresh' ? freshRows : damagedRows;

              return (
                <div
                  key={group.productId}
                  style={{
                    padding: '0.85rem',
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    background: 'var(--overlay-soft)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-main)' }}>{productName}</span>

                    {hasBoth && (
                      <div style={{ display: 'inline-flex', borderRadius: 999, border: '1px solid var(--border)', overflow: 'hidden' }}>
                        {(['fresh', 'damaged'] as const).map(m => {
                          const active = mode === m;
                          const color = m === 'damaged' ? '#ef4444' : '#10b981';
                          return (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setProductMode(prev => ({ ...prev, [group.productId]: m }))}
                              style={{
                                padding: '5px 12px',
                                fontSize: 9,
                                fontWeight: 900,
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em',
                                border: 'none',
                                cursor: 'pointer',
                                background: active ? `${color}1a` : 'transparent',
                                color: active ? color : 'var(--text-muted)',
                              }}
                            >
                              {m === 'fresh' ? 'Fresh' : 'Damaged'}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {visibleRows.map(lot => {
                    const unit = product?.unit ?? lot.product?.unit ?? 'unit';
                    const tradePrice = lot.tradePrice ?? product?.tradePrice ?? 0;
                    const unitCost = landedUnitCost(lot);
                    const belowCost = tradePrice <= unitCost;
                    const inDraft = draftByLot.get(lot.id) ?? 0;
                    const remaining = Math.max(0, lot.remainingQuantity - inDraft);
                    const ageStr = formatDistanceToNow(dateOnlyToDate(lot.batch?.date ?? lot.date), { addSuffix: true });
                    const raw = perLotQty[lot.id] ?? '';
                    const qtyNum = Number(raw);
                    const isSet = raw !== '' && Number.isFinite(qtyNum) && qtyNum > 0;
                    return (
                      <div
                        key={lot.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(0,1fr) 150px 110px',
                          gap: '0.85rem',
                          alignItems: 'center',
                          padding: '0.65rem 0.85rem',
                          borderRadius: 10,
                          border: `1px solid ${isSet ? 'rgba(16,185,129,0.35)' : 'var(--border)'}`,
                          background: isSet ? 'rgba(16,185,129,0.06)' : 'var(--surface)',
                        }}
                      >
                        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              fontSize: 10,
                              fontWeight: 900,
                              color: CONDITION_COLORS[lot.condition],
                              textTransform: 'uppercase',
                              letterSpacing: '0.08em',
                            }}
                          >
                            <span style={{ width: 8, height: 8, borderRadius: 999, background: CONDITION_COLORS[lot.condition] }} />
                            {lot.condition}
                            {lot.batchId && <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>· {lot.batchId}</span>}
                          </span>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: 'var(--text-muted)',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {remaining.toLocaleString()} {unit} available
                            {inDraft > 0 && (
                              <span style={{ color: 'var(--primary)', marginLeft: 8 }}>· {inDraft} drafted</span>
                            )}
                            <span style={{ marginLeft: 8 }}>· cost ৳{unitCost.toLocaleString()} · sell ৳{tradePrice.toLocaleString()} · {ageStr}</span>
                            {belowCost && (
                              <span style={{ marginLeft: 8, color: '#ef4444', fontWeight: 900 }}>
                                {'· sell price <= cost'}
                              </span>
                            )}
                          </div>
                        </div>
                        <input
                          type="number"
                          className="input-premium"
                          min="0"
                          max={remaining}
                          step="any"
                          placeholder={`0 ${unit}`}
                          value={raw}
                          onChange={e => setLotQty(lot, e.target.value)}
                          style={{ padding: '8px 10px', fontSize: 12 }}
                          disabled={remaining === 0}
                        />
                        <button
                          type="button"
                          onClick={() => fillLot(lot)}
                          disabled={remaining === 0}
                          style={{
                            padding: '8px 10px',
                            borderRadius: 9,
                            fontSize: 10,
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            letterSpacing: '0.15em',
                            cursor: remaining === 0 ? 'not-allowed' : 'pointer',
                            border: '1px solid var(--border)',
                            background: 'var(--overlay-soft)',
                            color: 'var(--text-muted)',
                            opacity: remaining === 0 ? 0.4 : 1,
                          }}
                        >
                          Fill all
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" onClick={closeBatch} className="btn-secondary" disabled={pending}>
              Cancel
            </button>
            <button
              type="button"
              onClick={addSelectedToDraft}
              className="btn-primary"
              disabled={pending || !Object.values(perLotQty).some(v => Number(v) > 0)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <Plus size={14} /> Add to draft
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Draft list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
          <StepBadge num={3} label={`Draft (${draft.length})`} />
          {draft.length > 0 && (
            <button
              type="button"
              onClick={() => setDraft([])}
              disabled={pending}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: 10,
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
              }}
            >
              Clear all
            </button>
          )}
        </div>

        {draft.length === 0 ? (
          <div
            style={{
              padding: '1.25rem',
              border: '1px dashed var(--border)',
              borderRadius: 14,
              color: 'var(--text-muted)',
              fontSize: 11,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              textAlign: 'center',
            }}
          >
            {emptyDraftHint}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {draft.map(d => (
              <div
                key={d.key}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0,1fr) 130px 36px',
                  gap: '0.75rem',
                  alignItems: 'center',
                  padding: '0.75rem 0.9rem',
                  borderRadius: 12,
                  border: '1px solid rgba(16,185,129,0.25)',
                  background: 'rgba(16,185,129,0.05)',
                }}
              >
                <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--text-main)' }}>{d.productName}</div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.12em',
                    }}
                  >
                    {d.batchLabel} · {d.condition} · cost ৳{d.unitCost.toLocaleString()}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="number"
                    className="input-premium"
                    min="0"
                    step="any"
                    value={d.allocated || ''}
                    onChange={e => updateDraftQty(d.key, e.target.value)}
                    style={{ padding: '7px 10px', fontSize: 12, width: '100%' }}
                  />
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)' }}>{d.unit}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeDraft(d.key)}
                  disabled={pending}
                  title="Remove"
                  style={{
                    padding: 7,
                    borderRadius: 9,
                    background: 'var(--overlay-soft)',
                    border: '1px solid var(--border)',
                    color: '#ef4444',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 1.25rem',
          borderRadius: 14,
          background: 'rgba(16,185,129,0.06)',
          border: '1px solid rgba(16,185,129,0.18)',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--text-main)', fontVariantNumeric: 'tabular-nums' }}>
          {draft.length} line{draft.length === 1 ? '' : 's'} · {totalUnits || '0 units'} · COGS ৳{totalCost.toLocaleString()} · Value ৳{totalValue.toLocaleString()}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={submit}
            className="btn-primary"
            disabled={pending || draft.length === 0 || draft.every(d => d.allocated <= 0)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            {pending ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
            {pending ? 'Saving…' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function StepBadge({ num, label }: { num: number; label: string }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          background: 'rgba(16,185,129,0.15)',
          color: 'var(--primary)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          fontWeight: 900,
        }}
      >
        {num}
      </span>
      <span
        style={{
          fontSize: 11,
          fontWeight: 900,
          color: 'var(--text-main)',
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
        }}
      >
        {label}
      </span>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: '1rem',
        borderRadius: 12,
        background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.25)',
        color: '#ef4444',
        fontSize: 12,
        fontWeight: 800,
      }}
    >
      {message}
    </div>
  );
}

export function EmptyCard({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div
      style={{
        padding: '3rem 1.5rem',
        textAlign: 'center',
        border: '1px dashed var(--border)',
        borderRadius: 14,
        color: 'var(--text-muted)',
      }}
    >
      <div style={{ opacity: 0.3, margin: '0 auto', display: 'inline-flex' }}>{icon}</div>
      <p
        style={{
          marginTop: '0.75rem',
          fontSize: 11,
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          opacity: 0.6,
        }}
      >
        {title}
      </p>
    </div>
  );
}
