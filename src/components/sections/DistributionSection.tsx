'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  useVans,
  useVanDistribution,
  useVanStockSummary,
  useCreateDistribution,
  useAddDistributionLine,
  useUpdateDistributionLine,
  useDeleteDistributionLine,
  useProducts,
} from '@/hooks/api';
import type { Distribution, DistributionLine, Van, VanStockSummaryProduct } from '@/lib/types';
import { ApiError } from '@/lib/api';
import VanAdjustmentPopup from '@/components/VanAdjustmentPopup';
import BatchAllocatePicker, { type DraftLine } from '@/components/BatchAllocatePicker';
import {
  Truck,
  Calendar,
  Plus,
  Package,
  Loader2,
  Trash2,
  X,
  AlertTriangle,
  ArrowRight,
  Undo2,
  CheckCircle2,
  User,
  Search,
  Settings2,
  Layers,
} from 'lucide-react';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function DistributionSection() {
  const searchParams = useSearchParams();
  const vansQ = useVans();
  const vans = vansQ.data ?? [];

  const initialVan = searchParams.get('van');
  const initialDate = searchParams.get('date') ?? todayStr();

  const [selectedVanId, setSelectedVanId] = useState<string | null>(initialVan);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (selectedVanId) url.searchParams.set('van', selectedVanId);
    else url.searchParams.delete('van');
    if (selectedDate && selectedDate !== todayStr()) url.searchParams.set('date', selectedDate);
    else url.searchParams.delete('date');
    window.history.replaceState(null, '', url.toString());
  }, [selectedVanId, selectedDate]);

  const selectedVan = useMemo(
    () => vans.find(v => v.id === selectedVanId) ?? null,
    [vans, selectedVanId],
  );

  const setVan = (id: string | null) => setSelectedVanId(id);
  const setDate = (date: string) => setSelectedDate(date);

  return (
    <div
      className="animate-fade-in"
      style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              padding: '14px',
              background: 'rgba(16,185,129,0.1)',
              borderRadius: '18px',
              color: 'var(--primary)',
              border: '1px solid rgba(16,185,129,0.2)',
              boxShadow: '0 0 24px rgba(16,185,129,0.1)',
            }}
          >
            <Truck size={28} />
          </div>
          <div>
            <h1
              style={{
                fontSize: '2rem',
                fontWeight: 900,
                color: 'var(--text-main)',
                textTransform: 'uppercase',
                fontStyle: 'italic',
                lineHeight: 1.1,
                letterSpacing: '-0.03em',
              }}
            >
              Daily <span style={{ color: 'var(--primary)' }}>Distribution</span>
            </h1>
            <p
              style={{
                fontSize: '10px',
                fontWeight: 900,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.3em',
                opacity: 0.6,
                marginTop: '4px',
              }}
            >
              Allocate · Track · Return
            </p>
          </div>
        </div>

        {/* Date picker */}
        <div
          className="card"
          style={{
            padding: '0.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <Calendar size={14} style={{ color: 'var(--primary)' }} />
          <input
            type="date"
            className="input-premium"
            style={{ padding: '6px 12px', fontSize: '12px' }}
            value={selectedDate}
            onChange={e => setDate(e.target.value)}
          />
        </div>
      </div>

      {/* Main grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(260px, 320px) 1fr',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        {/* Van list (left) */}
        <VanListPanel
          vans={vans}
          loading={vansQ.isLoading}
          selectedVanId={selectedVanId}
          onSelect={setVan}
        />

        {/* Right panel */}
        {selectedVanId && selectedVan ? (
          <DistributionPanel
            key={`${selectedVanId}-${selectedDate}`}
            van={selectedVan}
            date={selectedDate}
          />
        ) : (
          <EmptyPanel hasVans={vans.length > 0} />
        )}
      </div>
    </div>
  );
}

/* ─── Van list panel ──────────────────────────────────────── */
function VanListPanel({
  vans,
  loading,
  selectedVanId,
  onSelect,
}: {
  vans: Van[];
  loading: boolean;
  selectedVanId: string | null;
  onSelect: (id: string) => void;
}) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const active = vans.filter(v => v.isActive !== false);
    if (!term) return active;
    return active.filter(
      v =>
        v.id.toLowerCase().includes(term) ||
        v.vanName.toLowerCase().includes(term) ||
        v.driver.toLowerCase().includes(term),
    );
  }, [vans, q]);

  return (
    <div
      className="card"
      style={{
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        position: 'sticky',
        top: '1rem',
        maxHeight: 'calc(100vh - 8rem)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p
          style={{
            fontSize: '10px',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.25em',
            color: 'var(--text-muted)',
            opacity: 0.6,
          }}
        >
          Select Van
        </p>
        <Link
          href="/dashboard/distribution?tab=fleet"
          style={{
            fontSize: '9px',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            color: 'var(--primary)',
            textDecoration: 'none',
          }}
        >
          Manage →
        </Link>
      </div>

      <div style={{ position: 'relative' }}>
        <Search
          size={13}
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
            opacity: 0.5,
          }}
        />
        <input
          type="text"
          placeholder="Filter vans…"
          className="input-premium"
          style={{ width: '100%', paddingLeft: '34px', fontSize: '12px' }}
          value={q}
          onChange={e => setQ(e.target.value)}
        />
      </div>

      <div
        className="custom-scrollbar"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          overflowY: 'auto',
          marginRight: '-0.5rem',
          paddingRight: '0.5rem',
        }}
      >
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="skeleton"
              style={{ height: '68px', borderRadius: '12px', animation: `fade-in 0.5s ${i * 40}ms cubic-bezier(0.23,1,0.32,1) both` }}
            />
          ))
        ) : filtered.length === 0 ? (
          <div
            style={{
              padding: '2rem 1rem',
              textAlign: 'center',
              color: 'var(--text-muted)',
              opacity: 0.5,
            }}
          >
            <Truck size={24} style={{ margin: '0 auto', opacity: 0.4 }} />
            <p
              style={{
                marginTop: '0.5rem',
                fontSize: '10px',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
              }}
            >
              {q ? 'No matches' : 'No active vans'}
            </p>
          </div>
        ) : (
          filtered.map(v => {
            const isSel = v.id === selectedVanId;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onSelect(v.id)}
                style={{
                  textAlign: 'left',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: isSel ? 'rgba(16,185,129,0.14)' : 'var(--overlay-soft)',
                  border: `2px solid ${isSel ? 'var(--primary)' : 'var(--border)'}`,
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: isSel ? '0 0 0 4px rgba(16,185,129,0.12)' : 'none',
                }}
              >
                <div
                  style={{
                    padding: '7px',
                    borderRadius: '9px',
                    background: isSel ? 'rgba(16,185,129,0.15)' : 'var(--overlay-soft)',
                    color: isSel ? 'var(--primary)' : 'var(--text-muted)',
                    flexShrink: 0,
                  }}
                >
                  <Truck size={13} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: '12px',
                      fontWeight: 800,
                      color: 'var(--text-main)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {v.vanName}
                  </p>
                  <p
                    style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      marginTop: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <User size={9} style={{ opacity: 0.6 }} />
                    {v.driver} · {v.id}
                  </p>
                </div>
                {isSel && (
                  <ArrowRight size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ─── Empty panel ─────────────────────────────────────────── */
function EmptyPanel({ hasVans }: { hasVans: boolean }) {
  return (
    <div
      className="card"
      style={{
        padding: '5rem 2rem',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
      }}
    >
      <Truck size={48} style={{ color: 'var(--text-muted)', opacity: 0.25 }} />
      <p
        style={{
          fontSize: '12px',
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          color: 'var(--text-muted)',
          opacity: 0.7,
        }}
      >
        {hasVans ? 'Select a van to begin' : 'No vans available'}
      </p>
      {!hasVans && (
        <Link
          href="/dashboard/distribution?tab=fleet"
          className="btn-primary"
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={14} />
          Add Van
        </Link>
      )}
    </div>
  );
}

/* ─── Distribution panel ──────────────────────────────────── */
function DistributionPanel({ van, date }: { van: Van; date: string }) {
  const distQ = useVanDistribution(van.id, date);
  const createMutation = useCreateDistribution();

  const distribution = distQ.data;
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 404 means "no distribution exists yet for this van/date" — fall through to the create form.
  const errStatus = (distQ.error as { status?: number } | null)?.status;
  const isNotFound = distQ.isError && errStatus === 404;
  const isRealError = distQ.isError && !isNotFound;

  if (distQ.isLoading) {
    return (
      <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <span className="skeleton skeleton-block" style={{ width: '40%' }} />
        <span className="skeleton skeleton-line" style={{ width: '60%' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className="skeleton" style={{ height: 54, borderRadius: 12 }} />
          ))}
        </div>
      </div>
    );
  }

  if (isRealError) {
    return (
      <div className="card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ef4444' }}>
          <AlertTriangle size={16} />
          <span style={{ fontSize: '12px', fontWeight: 800 }}>
            Failed to load distribution: {distQ.error instanceof Error ? distQ.error.message : 'Unknown error'}
          </span>
        </div>
      </div>
    );
  }

  const hasDistribution = !isNotFound && !!distribution?.id;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {errorMsg && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 18px',
            borderRadius: '14px',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)',
            color: '#ef4444',
            fontSize: '12px',
            fontWeight: 800,
          }}
        >
          <AlertTriangle size={16} />
          <span style={{ flex: 1 }}>{errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header card */}
      <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
        <div
          style={{
            padding: '14px',
            background: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: '14px',
            color: 'var(--primary)',
          }}
        >
          <Truck size={20} />
        </div>
        <div style={{ flex: 1, minWidth: '220px' }}>
          <h2
            style={{
              fontSize: '1.2rem',
              fontWeight: 900,
              color: 'var(--text-main)',
              textTransform: 'uppercase',
              fontStyle: 'italic',
              letterSpacing: '-0.02em',
            }}
          >
            {van.vanName}
          </h2>
          <p
            style={{
              fontSize: '10px',
              fontWeight: 800,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              marginTop: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <User size={10} style={{ opacity: 0.6 }} /> {van.driver}
            <span style={{ opacity: 0.3 }}>·</span>
            <Calendar size={10} style={{ opacity: 0.6 }} /> {date}
            <span style={{ opacity: 0.3 }}>·</span>
            <span style={{ color: hasDistribution ? 'var(--primary)' : 'var(--text-muted)' }}>
              {hasDistribution ? 'Dispatched' : 'Not Created'}
            </span>
          </p>
        </div>
      </div>

      {hasDistribution ? (
        <ExistingDistribution
          distribution={distribution!}
          vanId={van.id}
          vanLabel={van.vanName}
          date={date}
          onError={setErrorMsg}
        />
      ) : (
        <CreateDistributionForm
          vanLabel={van.vanName}
          date={date}
          pending={createMutation.isPending}
          onSubmit={async (lines) => {
            setErrorMsg(null);
            try {
              await createMutation.mutateAsync({ vanId: van.id, date, lines });
            } catch (err) {
              setErrorMsg(
                err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed to create distribution',
              );
            }
          }}
        />
      )}
    </div>
  );
}


/* ─── Create distribution form ────────────────────────────── */
function CreateDistributionForm({
  vanLabel,
  date,
  pending,
  onSubmit,
}: {
  vanLabel: string;
  date: string;
  pending: boolean;
  onSubmit: (lines: DraftLine[]) => Promise<void> | void;
}) {
  return (
    <BatchAllocatePicker
      contextLabel={vanLabel}
      date={date}
      pending={pending}
      submitLabel="Allocate to van"
      emptyDraftHint="Pick a batch above to start adding products"
      onSubmit={onSubmit}
    />
  );
}

/* ─── Existing distribution ───────────────────────────────── */
type AdjustTarget = {
  productId: string;
  productName: string;
  productUnit: string;
  available: number;
  currentReturned: number;
  currentDamage: number;
  distributionLineId: string | null;
  defaultPrice: number;
};

function ExistingDistribution({
  distribution,
  vanId,
  vanLabel,
  date,
  onError,
}: {
  distribution: Distribution;
  vanId: string;
  vanLabel: string;
  date: string;
  onError: (msg: string) => void;
}) {
  const updateLine = useUpdateDistributionLine(vanId);
  const deleteLine = useDeleteDistributionLine(vanId);
  const addLine = useAddDistributionLine(vanId);
  const stockQ = useVanStockSummary(vanId, date);

  const lines = distribution.lines ?? [];
  const summaryByProductId = useMemo(() => {
    const m = new Map<string, VanStockSummaryProduct>();
    stockQ.data?.products.forEach((p) => m.set(p.productId, p));
    return m;
  }, [stockQ.data?.products]);

  const totalAllocated = lines.reduce((s, l) => s + l.allocated, 0);
  const totalReturned = lines.reduce((s, l) => s + (l.returned ?? 0), 0);
  const totalSold = (stockQ.data?.products ?? []).reduce((s, p) => s + p.sold, 0);
  const totalDamaged = (stockQ.data?.products ?? []).reduce((s, p) => s + p.damaged, 0);
  // Trust the backend's own per-product `available` (same field valueRemaining
  // below already relies on) instead of re-deriving it locally — the manual
  // subtraction can drift from whatever reconciliation logic the backend uses.
  const totalRemaining = lines.reduce((s, l) => s + (summaryByProductId.get(l.productId)?.available ?? 0), 0);

  const [adjustTarget, setAdjustTarget] = useState<AdjustTarget | null>(null);
  const [adderOpen, setAdderOpen] = useState(false);

  const productsQ = useProducts({ pageSize: 200, status: 'Active' });
  const products = productsQ.data?.data ?? [];
  const productById = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);

  // ৳ totals across all lines. Prefer the van stock summary's per-product
  // unitPrice — same snapshot VanDayCard uses — since it reflects a
  // damaged/salvage lot's discounted price; only fall back to the product's
  // current trade price when no summary is available yet.
  const valuePriceFor = (productId: string) =>
    summaryByProductId.get(productId)?.unitPrice ?? productById.get(productId)?.tradePrice ?? 0;
  const valueAllocated = lines.reduce((s, l) => s + l.allocated * valuePriceFor(l.productId), 0);
  const valueReturned = lines.reduce((s, l) => s + (l.returned ?? 0) * valuePriceFor(l.productId), 0);
  const valueRemaining = lines.reduce(
    (s, l) => s + (summaryByProductId.get(l.productId)?.available ?? 0) * valuePriceFor(l.productId),
    0,
  );

  const submitAddLines = async (drafts: DraftLine[]) => {
    try {
      for (const draft of drafts) {
        // If a line for the same (productId, batchId) already exists in the
        // distribution, update it with combined qty instead of creating a duplicate.
        const existing = lines.find(
          l => l.productId === draft.productId && (l.batchId ?? null) === (draft.batchId ?? null),
        );
        if (existing) {
          await updateLine.mutateAsync({
            distributionId: distribution.id!,
            lineId: existing.id,
            body: { allocated: existing.allocated + draft.allocated },
          });
        } else {
          await addLine.mutateAsync({
            distributionId: distribution.id!,
            body: {
              productId: draft.productId,
              allocated: draft.allocated,
              batchId: draft.batchId,
              stockEntryId: draft.stockEntryId,
            },
          });
        }
      }
      setAdderOpen(false);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed to add lines');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
        <SummaryCard
          label="Allocated"
          value={totalAllocated}
          subValue={`৳${valueAllocated.toLocaleString()}`}
          icon={<Package size={14} />}
        />
        <SummaryCard
          label="Sold"
          value={totalSold}
          icon={<CheckCircle2 size={14} />}
        />
        <SummaryCard
          label="Damaged"
          value={totalDamaged}
          icon={<AlertTriangle size={14} />}
        />
        <SummaryCard
          label="Returned"
          value={totalReturned}
          subValue={`৳${valueReturned.toLocaleString()}`}
          icon={<Undo2 size={14} />}
        />
        <SummaryCard
          label="On Van"
          value={totalRemaining}
          subValue={`৳${valueRemaining.toLocaleString()}`}
          icon={<Truck size={14} />}
          highlight
        />
      </div>

      {/* Add from batch */}
      {!adderOpen ? (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => setAdderOpen(true)}
            className="btn-secondary"
            disabled={addLine.isPending}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={14} />
            Add from batch
          </button>
        </div>
      ) : (
        <BatchAllocatePicker
          contextLabel={vanLabel}
          date={date}
          pending={addLine.isPending}
          submitLabel="Add to distribution"
          emptyDraftHint="Pick a batch above to add more products"
          onCancel={() => setAdderOpen(false)}
          onSubmit={submitAddLines}
        />
      )}

      <div className="table-container shadow-lg">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th className="table-header">Product</th>
              <th className="table-header">Allocated</th>
              <th className="table-header">Sold</th>
              <th className="table-header">Damaged</th>
              <th className="table-header">Returned</th>
              <th className="table-header">On Van</th>
              <th className="table-header"></th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '4rem', textAlign: 'center' }}>
                  <Package size={32} style={{ color: 'var(--text-muted)', opacity: 0.3, margin: '0 auto' }} />
                  <p
                    style={{
                      marginTop: '0.75rem',
                      fontSize: '11px',
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      letterSpacing: '0.2em',
                      color: 'var(--text-muted)',
                      opacity: 0.6,
                    }}
                  >
                    No lines on this distribution
                  </p>
                </td>
              </tr>
            ) : (
              lines.map(line => {
                const summary = summaryByProductId.get(line.productId);
                return (
                  <ExistingLineRow
                    key={line.id}
                    line={line}
                    summary={summary}
                    pending={updateLine.isPending || deleteLine.isPending}
                    onAdjust={() => {
                      const product = productById.get(line.productId);
                      setAdjustTarget({
                        productId: line.productId,
                        productName: line.product?.name ?? product?.name ?? line.productId,
                        productUnit: line.product?.unit ?? product?.unit ?? '',
                        available: summary?.available ?? Math.max(0, line.allocated - (line.returned ?? 0)),
                        currentReturned: line.returned ?? 0,
                        currentDamage: line.damageReturned ?? 0,
                        distributionLineId: line.id,
                        defaultPrice: product?.tradePrice ?? 0,
                      });
                    }}
                    onUpdate={async (body) => {
                      try {
                        await updateLine.mutateAsync({ distributionId: distribution.id!, lineId: line.id, body });
                      } catch (err) {
                        onError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Update failed');
                      }
                    }}
                    onDelete={async () => {
                      try {
                        await deleteLine.mutateAsync({ distributionId: distribution.id!, lineId: line.id });
                      } catch (err) {
                        onError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Delete failed');
                      }
                    }}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {adjustTarget && (
        <VanAdjustmentPopup
          vanId={vanId}
          date={date}
          distributionId={distribution.id}
          productId={adjustTarget.productId}
          productName={adjustTarget.productName}
          productUnit={adjustTarget.productUnit}
          available={adjustTarget.available}
          currentReturned={adjustTarget.currentReturned}
          currentDamage={adjustTarget.currentDamage}
          distributionLineId={adjustTarget.distributionLineId}
          defaultPrice={adjustTarget.defaultPrice}
          onClose={() => setAdjustTarget(null)}
        />
      )}
    </div>
  );
}

function ExistingLineRow({
  line,
  summary,
  pending,
  onAdjust,
  onUpdate,
  onDelete,
}: {
  line: DistributionLine;
  summary: VanStockSummaryProduct | undefined;
  pending: boolean;
  onAdjust: () => void;
  onUpdate: (body: { allocated?: number; returned?: number }) => void;
  onDelete: () => void;
}) {
  const [alloc, setAlloc] = useState(String(line.allocated));

  React.useEffect(() => {
    setAlloc(String(line.allocated));
  }, [line.allocated]);

  const allocDirty = Number(alloc) !== line.allocated;
  const returned = line.returned ?? 0;
  const sold = summary?.sold ?? 0;
  const damaged = summary?.damaged ?? 0;
  const onVan = summary?.available ?? line.allocated - returned;

  const commit = () => {
    if (!allocDirty) return;
    const aNum = Number(alloc);
    if (Number.isFinite(aNum) && aNum >= 0) onUpdate({ allocated: aNum });
  };

  const numCellStyle = (val: number, tint?: string): React.CSSProperties => ({
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    color: val > 0 ? (tint ?? 'var(--text-main)') : 'var(--text-muted)',
  });

  return (
    <tr className="table-row">
      <td className="table-cell">
        <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '13px' }}>
          {line.product?.name ?? line.productId}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: '10px',
            fontWeight: 700,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginTop: '2px',
            flexWrap: 'wrap',
          }}
        >
          <span>{line.product?.unit ?? ''}</span>
          {line.batchId && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                borderRadius: 999,
                background: 'rgba(16,185,129,0.1)',
                color: 'var(--primary)',
                fontSize: 9,
                letterSpacing: '0.12em',
              }}
            >
              <Layers size={9} /> {line.batchId}
            </span>
          )}
        </div>
      </td>
      <td className="table-cell" style={{ width: 140 }}>
        <input
          type="number"
          className="input-premium"
          style={{ padding: '6px 10px', fontSize: '12px', maxWidth: 120 }}
          min="0"
          step="any"
          value={alloc}
          onChange={e => setAlloc(e.target.value)}
          onBlur={commit}
        />
      </td>
      <td className="table-cell" style={numCellStyle(sold, '#10b981')}>
        {sold.toLocaleString()}
      </td>
      <td className="table-cell" style={numCellStyle(damaged, '#f59e0b')}>
        {damaged.toLocaleString()}
      </td>
      <td className="table-cell" style={numCellStyle(returned, '#3b82f6')}>
        {returned.toLocaleString()}
      </td>
      <td
        className="table-cell"
        style={{
          fontWeight: 900,
          color: onVan < 0 ? '#ef4444' : 'var(--primary)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {onVan.toLocaleString()}
      </td>
      <td className="table-cell" style={{ width: 140 }}>
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
          {allocDirty && (
            <button
              onClick={commit}
              disabled={pending}
              title="Save allocation"
              style={{
                padding: '7px 10px',
                borderRadius: '9px',
                background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.3)',
                color: 'var(--primary)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '10px',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              {pending ? <Loader2 className="animate-spin" size={11} /> : <CheckCircle2 size={11} />}
              Save
            </button>
          )}
          <button
            onClick={onAdjust}
            disabled={pending}
            title="Sale, return, damage…"
            style={{
              padding: '7px',
              borderRadius: '9px',
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.25)',
              color: 'var(--primary)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Settings2 size={13} />
          </button>
          <button
            onClick={onDelete}
            disabled={pending}
            title="Remove line"
            style={{
              padding: '7px',
              borderRadius: '9px',
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
      </td>
    </tr>
  );
}

/* ─── Summary card (strip) ────────────────────────────────── */
function SummaryCard({
  label,
  value,
  subValue,
  icon,
  highlight,
}: {
  label: string;
  value: number;
  subValue?: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className="card"
      style={{
        padding: '1rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        border: highlight ? '1px solid rgba(16,185,129,0.25)' : undefined,
        background: highlight ? 'rgba(16,185,129,0.05)' : undefined,
      }}
    >
      <div
        style={{
          padding: '9px',
          borderRadius: '10px',
          background: highlight ? 'rgba(16,185,129,0.12)' : 'var(--overlay-soft)',
          color: highlight ? 'var(--primary)' : 'var(--text-muted)',
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <p
          style={{
            fontSize: '9px',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            color: 'var(--text-muted)',
          }}
        >
          {label}
        </p>
        <p
          style={{
            fontSize: '1.35rem',
            fontWeight: 900,
            color: highlight ? 'var(--primary)' : 'var(--text-main)',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.1,
            fontStyle: 'italic',
          }}
        >
          {value.toLocaleString()}
        </p>
        {subValue && (
          <p
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: 'var(--text-muted)',
              fontVariantNumeric: 'tabular-nums',
              marginTop: '3px',
              opacity: 0.85,
            }}
          >
            {subValue}
          </p>
        )}
      </div>
    </div>
  );
}
