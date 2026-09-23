'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import MainLayout from '@/components/MainLayout';
import {
  useProducts,
  useStockBatches,
  useDeleteStockBatch,
  useCreateStockBatch,
  useStockEntry,
  useDeleteStockEntry,
  useStockAdjustmentAudit,
  useAvailableStockLots,
} from '@/hooks/api';
import type {
  StockBatch,
  StockEntry,
  StockEntryInput,
} from '@/lib/types';
import { ApiError } from '@/lib/api';
import {
  Plus,
  Boxes,
  Search,
  Loader2,
  Trash2,
  X,
  AlertTriangle,
  Package,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileX,
  Coins,
  User,
  Filter,
  ArrowDownToLine,
  SlidersHorizontal,
  Layers,
  History,
  CheckCircle2,
  Trash,
  Activity,
  Tag,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  isBefore,
  isSameDay,
  startOfDay,
  parseISO,
  getDay,
} from 'date-fns';

const dhakaToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());

function describeError(err: unknown, dict: Record<string, string> = {}): string {
  if (err instanceof ApiError) {
    return dict[err.code ?? ''] ?? err.message;
  }
  return err instanceof Error ? err.message : 'Unexpected error';
}

export default function StockPage() {
  /* Intake list filters */
  const [q, setQ] = useState('');
  const [productId, setProductId] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  /* Modal & drawer state */
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [auditDrawerOpen, setAuditDrawerOpen] = useState(false);
  const [damagedDrawerOpen, setDamagedDrawerOpen] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<
    | { kind: 'entry'; row: StockEntry }
    | { kind: 'batch'; row: StockBatch }
    | null
  >(null);
  const [lotTrail, setLotTrail] = useState<
    | { kind: 'entry'; id: string }
    | null
  >(null);

  const productsQ = useProducts({ pageSize: 200, sort: 'name' });
  const products = productsQ.data?.data ?? [];

  const batchesQ = useStockBatches({
    q: q || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
    pageSize,
    // -createdAt tiebreak matters: salvage batches are all dated "today", so
    // sorting by date alone leaves same-day batches in unstable order.
    sort: '-date,-createdAt',
  });

  const damagedCountQ = useAvailableStockLots({ condition: 'DAMAGED' });
  const damagedCount = damagedCountQ.data?.total ?? 0;

  const createBatchMutation = useCreateStockBatch();
  const deleteEntryMutation = useDeleteStockEntry();
  const deleteBatchMutation = useDeleteStockBatch();

  const total = batchesQ.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const batchRows = batchesQ.data?.data ?? [];

  // Client-side productId filter: only show batches that contain that product,
  // and hide non-matching entries inside them.
  const visibleBatches = useMemo(() => {
    if (productId === 'all') return batchRows;
    return batchRows
      .map(b => ({ ...b, entries: b.entries.filter(e => e.productId === productId) }))
      .filter(b => b.entries.length > 0);
  }, [batchRows, productId]);

  const intakeStats = useMemo(() => {
    let qty = 0;
    let cost = 0;
    let entryCount = 0;
    let freshRemaining = 0;
    let damagedRemaining = 0;
    for (const b of visibleBatches) {
      for (const e of b.entries) {
        qty += e.quantity;
        cost += e.quantity * e.basePrice;
        entryCount += 1;
        const remaining = e.remainingQuantity ?? e.quantity;
        if (e.condition === 'DAMAGED') damagedRemaining += remaining;
        else freshRemaining += remaining;
      }
    }
    return { qty, cost, entryCount, freshRemaining, damagedRemaining };
  }, [visibleBatches]);

  const resetFilters = () => {
    setQ(''); setProductId('all'); setDateFrom(''); setDateTo(''); setPage(1);
  };

  const handleCreateEntry = async (input: StockEntryInput) => {
    setErrorMsg(null);
    try {
      // Wrap a single product entry in a one-line batch so it shows up in the
      // grouped Stock view instead of becoming an orphan StockEntry.
      await createBatchMutation.mutateAsync({
        date: input.date,
        source: input.source,
        notes: input.notes,
        lines: [{
          productId: input.productId,
          quantity: input.quantity,
          basePrice: input.basePrice,
          listTaxPercent: input.listTaxPercent,
          listProfitPercent: input.listProfitPercent,
          listOthersPercent: input.listOthersPercent,
          listPrice: input.listPrice,
          tradeTaxPercent: input.tradeTaxPercent,
          tradeProfitPercent: input.tradeProfitPercent,
          tradeOthersPercent: input.tradeOthersPercent,
          tradePrice: input.tradePrice,
          mrpTaxPercent: input.mrpTaxPercent,
          mrpProfitPercent: input.mrpProfitPercent,
          mrpOthersPercent: input.mrpOthersPercent,
          mrp: input.mrp,
          expiryDate: input.expiryDate || undefined,
          notes: input.notes,
        }],
      });
      setEntryModalOpen(false);
    } catch (err) {
      setErrorMsg(describeError(err));
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setErrorMsg(null);
    try {
      if (confirmDelete.kind === 'entry') {
        await deleteEntryMutation.mutateAsync(confirmDelete.row.id);
      } else {
        await deleteBatchMutation.mutateAsync(confirmDelete.row.id);
      }
      setConfirmDelete(null);
    } catch (err) {
      setErrorMsg(describeError(err));
    }
  };

  const hasFilters = q || productId !== 'all' || dateFrom || dateTo;
  const deletePending =
    deleteEntryMutation.isPending ||
    deleteBatchMutation.isPending;

  return (
    <MainLayout>
      <div
        className="animate-fade-in"
        style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', paddingBottom: '4rem' }}
      >
        {/* ── Header ────────────────────────────────────── */}
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
              <Boxes size={28} />
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
                Stock <span style={{ color: 'var(--primary)' }}>Movements</span>
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
                Purchase batches · {total} groups · expand to manage products
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setAuditDrawerOpen(true)}
              title="View audit log of all stock adjustments"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '0.65rem 1rem',
                borderRadius: 14,
                background: 'rgba(148,163,184,0.08)',
                border: '1px solid rgba(148,163,184,0.22)',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                transition: 'all 0.18s',
              }}
            >
              <History size={14} />
              Audit
              <ChevronRight size={12} />
            </button>
            <button
              onClick={() => setDamagedDrawerOpen(true)}
              title="View damaged/salvage stock available to sell at a discount"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '0.65rem 1rem',
                borderRadius: 14,
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.22)',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                transition: 'all 0.18s',
              }}
            >
              <Tag size={14} />
              Damaged Stock
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: 'rgba(239,68,68,0.14)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  fontSize: 10,
                  fontWeight: 950,
                  color: '#ef4444',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {damagedCount.toLocaleString()}
              </span>
              <ChevronRight size={12} />
            </button>
            <button
              onClick={() => { setErrorMsg(null); setEntryModalOpen(true); }}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
            >
              <Plus size={18} />
              New Entry
            </button>
          </div>
        </div>

        {/* ── KPI row ──────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1.25rem' }}>
          <StatCard
            label="Total Batches"
            value={total.toLocaleString()}
            sub="Matching current filter"
            icon={<Boxes size={20} />}
          />
          <StatCard
            label="Quantity (this page)"
            value={intakeStats.qty.toLocaleString()}
            sub={`${intakeStats.entryCount} products across ${visibleBatches.length} batches`}
            icon={<Package size={20} />}
          />
          <StatCard
            label="Cost Value (this page)"
            value={`৳${intakeStats.cost.toLocaleString()}`}
            sub="Qty × buying rate"
            icon={<Coins size={20} />}
          />
          <StatCard
            label="Fresh Remaining"
            value={intakeStats.freshRemaining.toLocaleString()}
            sub="Sellable at normal price"
            icon={<CheckCircle2 size={20} />}
          />
          <StatCard
            label="Damaged Remaining"
            value={intakeStats.damagedRemaining.toLocaleString()}
            sub="Sellable at discount only"
            icon={<Tag size={20} />}
            accent="#ef4444"
          />
        </div>

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

        {/* ── Filters ──────────────────────────────────── */}
        <div
          className="card"
          style={{
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                opacity: 0.5,
              }}
            />
            <input
              type="text"
              placeholder="Search by ID, source, or product…"
              className="input-premium"
              style={{ width: '100%', paddingLeft: '44px' }}
              value={q}
              onChange={e => { setQ(e.target.value); setPage(1); }}
            />
          </div>

          <FilterSelect
            icon={<Filter size={12} />}
            label="Product"
            value={productId}
            onChange={v => { setProductId(v); setPage(1); }}
            options={[
              { value: 'all', label: 'All products' },
              ...products.map(p => ({ value: p.id, label: p.name })),
            ]}
          />

          <DateInput label="From" value={dateFrom} onChange={v => { setDateFrom(v); setPage(1); }} />
          <DateInput label="To" value={dateTo} onChange={v => { setDateTo(v); setPage(1); }} />

          {hasFilters && (
            <button
              onClick={resetFilters}
              className="btn-secondary"
              style={{ padding: '0.5rem 1rem', fontSize: '10px' }}
            >
              Clear
            </button>
          )}
        </div>

        {/* ── Table ────────────────────────────────────── */}
        <div className="table-container stock-table-shell">
          <BatchTable
            loading={batchesQ.isLoading}
            batches={visibleBatches}
            forceExpand={productId !== 'all'}
            onDeleteBatch={row => setConfirmDelete({ kind: 'batch', row })}
            onDeleteEntry={row => setConfirmDelete({ kind: 'entry', row })}
            onViewLots={row => setLotTrail({ kind: 'entry', id: row.id })}
          />
        </div>

        {/* ── Pagination ───────────────────────────────── */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                color: 'var(--text-muted)',
                opacity: 0.6,
              }}
            >
              Page {page} of {totalPages} · {total} records
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                style={{
                  padding: '0.5rem 0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: page <= 1 ? 0.4 : 1,
                }}
              >
                <ChevronLeft size={14} />
                Prev
              </button>
              <button
                className="btn-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                style={{
                  padding: '0.5rem 0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: page >= totalPages ? 0.4 : 1,
                }}
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── Modals & Drawers ─────────────────────────── */}
        {typeof document !== 'undefined' && createPortal(
          <>
            {entryModalOpen && (
              <EntryModal
                pending={createBatchMutation.isPending}
                onClose={() => setEntryModalOpen(false)}
                onSubmit={handleCreateEntry}
              />
            )}

            {confirmDelete && (
              <ConfirmDialog
                title={
                  confirmDelete.kind === 'entry' ? 'Delete Entry'
                  : 'Delete Batch'
                }
                message={
                  confirmDelete.kind === 'batch'
                    ? `Remove ${confirmDelete.row.id} and all ${confirmDelete.row.entries.length} product entries inside? This action cannot be undone.`
                    : `Remove ${confirmDelete.row.id}? This action cannot be undone.`
                }
                confirmLabel={deletePending ? 'Deleting…' : 'Delete'}
                pending={deletePending}
                onCancel={() => setConfirmDelete(null)}
                onConfirm={handleDelete}
              />
            )}

            {lotTrail && (
              <LotTrailModal
                key={`${lotTrail.kind}-${lotTrail.id}`}
                target={lotTrail}
                onClose={() => setLotTrail(null)}
              />
            )}

            {auditDrawerOpen && (
              <AdjustmentAuditModal onClose={() => setAuditDrawerOpen(false)} />
            )}

            {damagedDrawerOpen && (
              <DamagedStockModal onClose={() => setDamagedDrawerOpen(false)} />
            )}
          </>,
          document.body
        )}
      </div>
    </MainLayout>
  );
}

/* ─── Lot trail drawer ────────────────────────────────────── */
function LotTrailModal({
  target,
  onClose,
}: {
  target: { kind: 'entry'; id: string };
  onClose: () => void;
}) {
  const entryQ = useStockEntry(target.id);
  const loading = entryQ.isLoading;
  const error = entryQ.error;

  return (
    <ModalShell 
      title="Trace" 
      accent={target.kind.toUpperCase()} 
      icon={<History size={18} />} 
      onClose={onClose}
      maxWidth="600px"
    >
      <div className="custom-scrollbar" style={{ padding: '2.5rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <span key={i} className="skeleton" style={{ height: 64, borderRadius: 12 }} />
            ))}
          </div>
        ) : error ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#ef4444' }}>
            <AlertTriangle size={16} />
            <span style={{ fontSize: 12, fontWeight: 800 }}>
              {error instanceof Error ? error.message : 'Failed to load'}
            </span>
          </div>
        ) : entryQ.data ? (
          <EntryLotBody data={entryQ.data} />
        ) : null}
      </div>
    </ModalShell>
  );
}

const AUDIT_ACTION_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  CREATE: { label: 'Created', color: '#10b981', icon: <Plus size={11} /> },
  UPDATE: { label: 'Updated', color: '#3b82f6', icon: <SlidersHorizontal size={11} /> },
  DELETE: { label: 'Deleted', color: '#ef4444', icon: <Trash size={11} /> },
  RESTORE: { label: 'Restored', color: '#10b981', icon: <CheckCircle2 size={11} /> },
};

function HistoryRow({
  icon,
  iconColor,
  title,
  subtitle,
  timestamp,
}: {
  icon: React.ReactNode;
  iconColor: string;
  title: string;
  subtitle?: string;
  timestamp: string;
}) {
  const date = new Date(timestamp);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        borderRadius: 12,
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid var(--border)',
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 9,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `${iconColor}1a`,
          border: `1px solid ${iconColor}33`,
          color: iconColor,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: 'var(--text-main)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              fontSize: 10,
              color: 'var(--text-muted)',
              fontWeight: 700,
              opacity: 0.7,
              marginTop: 2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
      <div
        style={{
          fontSize: 9,
          fontWeight: 800,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          opacity: 0.6,
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
        }}
      >
        {format(date, 'MMM dd, yyyy · HH:mm')}
      </div>
    </div>
  );
}

/* ─── Adjustment audit drawer ─────────────────────────────── */
function AdjustmentAuditModal({ onClose }: { onClose: () => void }) {
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const auditQ = useStockAdjustmentAudit({ page, pageSize });
  const rows = auditQ.data?.data ?? [];
  const total = auditQ.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <ModalShell title="Audit" accent="System Log" icon={<Activity size={18} />} onClose={onClose} maxWidth="900px">
      <div className="custom-scrollbar" style={{ padding: '2.5rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', color: 'var(--text-main)' }}>Global <span style={{ color: 'var(--primary)' }}>Audit</span></h2>
            <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.1em' }}>{total} entries · full history trail</p>
          </div>
        </div>


        {auditQ.isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className="skeleton" style={{ height: 56, borderRadius: 12 }} />
            ))}
          </div>
        ) : auditQ.error ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#ef4444' }}>
            <AlertTriangle size={16} />
            <span style={{ fontSize: 12, fontWeight: 800 }}>
              {auditQ.error instanceof Error ? auditQ.error.message : 'Failed to load audit log'}
            </span>
          </div>
        ) : rows.length === 0 ? (
          <div
            style={{
              padding: '2.5rem',
              textAlign: 'center',
              fontSize: 11,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              color: 'var(--text-muted)',
              opacity: 0.5,
              background: 'var(--overlay-soft)',
              border: '1px dashed var(--border)',
              borderRadius: 14,
            }}
          >
            No audit entries yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rows.map(entry => {
              const meta = AUDIT_ACTION_META[entry.action] ?? {
                label: entry.action,
                color: '#94a3b8',
                icon: <History size={11} />,
              };
              const subjectId =
                (entry.after as { id?: string } | undefined)?.id ??
                (entry.before as { id?: string } | undefined)?.id ??
                '—';
              const reason =
                (entry.after as { reason?: string } | undefined)?.reason ??
                (entry.before as { reason?: string } | undefined)?.reason;
              const quantity =
                (entry.after as { quantity?: number } | undefined)?.quantity ??
                (entry.before as { quantity?: number } | undefined)?.quantity;
              return (
                <HistoryRow
                  key={entry.id}
                  icon={meta.icon}
                  iconColor={meta.color}
                  title={`${meta.label} · ${subjectId}`}
                  subtitle={[
                    reason && `reason: ${reason}`,
                    typeof quantity === 'number' && `qty: ${quantity.toLocaleString()}`,
                    entry.userId ? `by ${entry.userId}` : 'system',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  timestamp={entry.occurredAt}
                />
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              marginTop: 'auto',
              paddingTop: 12,
              borderTop: '1px solid var(--border)',
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                color: 'var(--text-muted)',
                opacity: 0.6,
              }}
            >
              Page {page} of {totalPages} · {total} entries
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                style={{
                  padding: '0.5rem 0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  opacity: page <= 1 ? 0.4 : 1,
                }}
              >
                <ChevronLeft size={14} />
                Prev
              </button>
              <button
                className="btn-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                style={{
                  padding: '0.5rem 0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  opacity: page >= totalPages ? 0.4 : 1,
                }}
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

/* ─── Damaged / salvage stock drawer ──────────────────────── */
function DamagedStockModal({ onClose }: { onClose: () => void }) {
  const lotsQ = useAvailableStockLots({ condition: 'DAMAGED' });
  const lots = useMemo(
    () => [...(lotsQ.data?.data ?? [])].sort((a, b) => b.date.localeCompare(a.date)),
    [lotsQ.data],
  );
  const totalUnits = lots.reduce((sum, l) => sum + l.remainingQuantity, 0);
  const totalValue = lots.reduce((sum, l) => sum + l.remainingQuantity * (l.tradePrice ?? 0), 0);

  return (
    <ModalShell title="Damaged" accent="Stock" icon={<Tag size={18} />} onClose={onClose} maxWidth="900px">
      <div className="custom-scrollbar" style={{ padding: '2.5rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', color: 'var(--text-main)' }}>
            Damaged <span style={{ color: '#ef4444' }}>Stock</span>
          </h2>
          <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.1em' }}>
            Salvaged from vans · sellable at the discounted price shown · sitting in the warehouse right now
          </p>
        </div>

        {!lotsQ.isLoading && lots.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1rem 1.25rem', borderRadius: 14, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p style={{ fontSize: 9, fontWeight: 900, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Lots</p>
              <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-main)', marginTop: 4 }}>{lots.length}</p>
            </div>
            <div style={{ padding: '1rem 1.25rem', borderRadius: 14, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p style={{ fontSize: 9, fontWeight: 900, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Total units</p>
              <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-main)', marginTop: 4 }}>{totalUnits.toLocaleString()}</p>
            </div>
            <div style={{ padding: '1rem 1.25rem', borderRadius: 14, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p style={{ fontSize: 9, fontWeight: 900, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Salvage value</p>
              <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-main)', marginTop: 4 }}>৳{totalValue.toLocaleString()}</p>
            </div>
          </div>
        )}

        {lotsQ.isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <span key={i} className="skeleton" style={{ height: 56, borderRadius: 12 }} />
            ))}
          </div>
        ) : lotsQ.error ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#ef4444' }}>
            <AlertTriangle size={16} />
            <span style={{ fontSize: 12, fontWeight: 800 }}>
              {lotsQ.error instanceof Error ? lotsQ.error.message : 'Failed to load damaged stock'}
            </span>
          </div>
        ) : lots.length === 0 ? (
          <div
            style={{
              padding: '2.5rem',
              textAlign: 'center',
              fontSize: 11,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              color: 'var(--text-muted)',
              opacity: 0.5,
              background: 'var(--overlay-soft)',
              border: '1px dashed var(--border)',
              borderRadius: 14,
            }}
          >
            No damaged stock on hand right now
          </div>
        ) : (
          <div style={{ borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--overlay-soft)' }}>
                  {['Batch', 'Product', 'Qty left', 'Discount price', 'Normal price', 'Source', 'Date'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '0.65rem 1rem', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lots.map((lot) => {
                  const normalPrice = lot.product?.tradePrice;
                  const discountPct = normalPrice && lot.tradePrice != null && normalPrice > 0
                    ? Math.round((1 - lot.tradePrice / normalPrice) * 100)
                    : null;
                  return (
                    <tr key={lot.id} style={{ borderTop: '1px solid var(--border-soft)' }}>
                      <td style={{ padding: '0.75rem 1rem', fontSize: 11, fontWeight: 900, color: 'var(--primary)' }}>{lot.batchId ?? lot.id}</td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: 12, fontWeight: 800, color: 'var(--text-main)' }}>{lot.product?.name ?? lot.productId}</td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: 12, fontWeight: 800 }}>{lot.remainingQuantity.toLocaleString()} {lot.product?.unit ?? ''}</td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: 13, fontWeight: 900, color: '#ef4444' }}>
                        ৳{(lot.tradePrice ?? 0).toLocaleString()}
                        {discountPct !== null && discountPct > 0 && (
                          <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 900, color: '#ef4444', opacity: 0.7 }}>-{discountPct}%</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: 12, color: 'var(--text-muted)', textDecoration: normalPrice ? 'line-through' : 'none' }}>
                        {normalPrice ? `৳${normalPrice.toLocaleString()}` : '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>{lot.source}</td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>{lot.date}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

function EntryLotBody({ data }: { data: import('@/lib/types').StockEntryDetail }) {
  const consumed = data.quantity - (data.remainingQuantity ?? data.quantity);
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        <LotStat label="Quantity" value={data.quantity} />
        <LotStat label="Consumed" value={consumed} />
        <LotStat label="Remaining" value={data.remainingQuantity ?? data.quantity} highlight />
      </div>
      <p
        style={{
          fontSize: 10,
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          color: 'var(--text-muted)',
          opacity: 0.6,
          marginBottom: 10,
        }}
      >
        Allocations ({data.allocations?.length ?? 0})
      </p>
      {(data.allocations ?? []).length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', opacity: 0.5 }}>
          No allocations yet — this lot is untouched.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.allocations.map(a => (
            <div
              key={a.id}
              style={{
                padding: '12px 14px',
                borderRadius: 12,
                background: 'var(--overlay-soft)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  padding: '4px 10px',
                  borderRadius: 8,
                  fontSize: 9,
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  background: 'rgba(16,185,129,0.08)',
                  color: 'var(--primary)',
                  border: '1px solid rgba(16,185,129,0.2)',
                  whiteSpace: 'nowrap',
                }}
              >
                {a.consumerType.replace('_', ' ')}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: 'var(--text-main)',
                    fontVariantNumeric: 'tabular-nums',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {a.consumerId}
                </p>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, fontWeight: 700 }}>
                  @ ৳{a.unitCost.toLocaleString()} · {a.quantity.toLocaleString()} used · {a.remainingQuantity.toLocaleString()} left
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function LotStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        padding: '10px 12px',
        borderRadius: 12,
        background: highlight ? 'rgba(16,185,129,0.06)' : 'var(--overlay-soft)',
        border: `1px solid ${highlight ? 'rgba(16,185,129,0.25)' : 'var(--border)'}`,
      }}
    >
      <p
        style={{
          fontSize: 9,
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          color: 'var(--text-muted)',
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: '1.1rem',
          fontWeight: 900,
          color: highlight ? 'var(--primary)' : 'white',
          fontVariantNumeric: 'tabular-nums',
          fontStyle: 'italic',
          marginTop: 2,
        }}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

/* ─── Batch table (grouped Record-Purchase view) ──────────── */
function BatchTable({
  loading,
  batches,
  forceExpand,
  onDeleteBatch,
  onDeleteEntry,
  onViewLots,
}: {
  loading: boolean;
  batches: StockBatch[];
  forceExpand: boolean;
  onDeleteBatch: (row: StockBatch) => void;
  onDeleteEntry: (row: StockEntry) => void;
  onViewLots: (row: StockEntry) => void;
}) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setOpenIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <table className="stock-table">
      <thead>
        <tr>
          {['', 'Batch', 'Date', 'Source', 'Products', 'Quantity', 'Total Cost', ''].map((h, i) => (
            <th key={i} className="table-header">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <SkeletonRows count={5} columns={8} />
        ) : batches.length === 0 ? (
          <EmptyRow columns={8} label="No batches match your filters" />
        ) : (
          batches.map(batch => {
            const totalQty = batch.entries.reduce((s, e) => s + e.quantity, 0);
            const totalCost = batch.entries.reduce((s, e) => s + e.quantity * e.basePrice, 0);
            const isOpen = forceExpand || openIds.has(batch.id);
            return (
              <React.Fragment key={batch.id}>
                <tr
                  className="table-row"
                  onClick={() => toggle(batch.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="table-cell" style={{ width: 36 }}>
                    <ChevronRight
                      size={14}
                      style={{
                        color: 'var(--text-muted)',
                        transform: isOpen ? 'rotate(90deg)' : 'none',
                        transition: 'transform 0.15s ease',
                      }}
                    />
                  </td>
                  <td className="table-cell">
                    <span style={cellId}>{batch.id}</span>
                  </td>
                  <td className="table-cell">
                    <span style={cellText}>{format(new Date(batch.date), 'MMM dd, yyyy')}</span>
                  </td>
                  <td className="table-cell">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={11} style={{ color: 'var(--text-muted)', opacity: 0.6 }} />
                      <span style={cellText}>{batch.source || '—'}</span>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span style={cellStrong}>{batch.entries.length.toLocaleString()}</span>
                    <span style={cellUnit}>{batch.entries.length === 1 ? 'product' : 'products'}</span>
                  </td>
                  <td className="table-cell">
                    <span style={cellStrong}>{totalQty.toLocaleString()}</span>
                  </td>
                  <td className="table-cell">
                    <span style={{ ...cellStrong, color: 'var(--primary)' }}>
                      ৳{totalCost.toLocaleString()}
                    </span>
                  </td>
                  <td className="table-cell" onClick={e => e.stopPropagation()}>
                    <DeleteBtn onClick={() => onDeleteBatch(batch)} />
                  </td>
                </tr>
                {isOpen && (
                  <tr>
                    <td colSpan={8} style={{ padding: 0, background: 'var(--overlay-soft)' }}>
                      <NestedEntryTable
                        entries={batch.entries}
                        onDeleteEntry={onDeleteEntry}
                        onViewLots={onViewLots}
                      />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })
        )}
      </tbody>
    </table>
  );
}

function NestedEntryTable({
  entries,
  onDeleteEntry,
  onViewLots,
}: {
  entries: StockEntry[];
  onDeleteEntry: (row: StockEntry) => void;
  onViewLots: (row: StockEntry) => void;
}) {
  // eslint-disable-next-line react-hooks/purity -- one-time captured timestamp for relative expiry coloring
  const now = useMemo(() => Date.now(), []);
  const nestedTh: React.CSSProperties = {
    padding: '8px 12px',
    textAlign: 'left',
    fontSize: '9px',
    fontWeight: 900,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    opacity: 0.65,
  };
  const nestedTd: React.CSSProperties = { padding: '8px 12px', verticalAlign: 'middle' };
  return (
    <div className="stock-nested-panel">
      <table className="stock-nested-table">
        <thead>
          <tr>
            {['ID', 'Product', 'Condition', 'Qty', 'Remaining', 'Expiry', 'Buy Rate', 'Total', 'Notes', ''].map((h, i) => (
              <th key={i} style={nestedTh}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map(row => {
            const unit = row.product?.unit ?? '';
            const line = row.quantity * row.basePrice;
            const remaining = row.remainingQuantity ?? row.quantity;
            const consumed = row.quantity - remaining;
            const pctLeft = row.quantity > 0 ? remaining / row.quantity : 0;
            const remainingColor =
              pctLeft === 0 ? 'var(--text-muted)' : pctLeft < 0.25 ? '#f59e0b' : 'var(--primary)';
            const expiry = row.expiryDate ? new Date(row.expiryDate) : null;
            const nearExpiry = expiry ? (expiry.getTime() - now) / 86400000 : Infinity;
            const expiryColor =
              !expiry ? 'var(--text-muted)'
              : nearExpiry < 0 ? '#ef4444'
              : nearExpiry < 7 ? '#f59e0b'
              : 'var(--text-muted)';
            return (
              <tr key={row.id} style={{ borderTop: '1px dashed var(--border-soft)' }}>
                <td style={nestedTd}>
                  <span style={cellId}>{row.id}</span>
                </td>
                <td style={nestedTd}>
                  <ProductCell name={row.product?.name ?? row.productId} sub={row.productId} />
                </td>
                <td style={nestedTd}>
                  {row.condition === 'DAMAGED' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4, width: 'fit-content',
                          fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em',
                          color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                          borderRadius: 6, padding: '2px 7px',
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: 999, background: '#ef4444' }} />
                        Damaged
                      </span>
                      {row.tradePrice != null && (
                        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)' }}>sell ৳{row.tradePrice.toLocaleString()}</span>
                      )}
                    </div>
                  ) : (
                    <span
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4, width: 'fit-content',
                        fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em',
                        color: 'var(--primary)', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
                        borderRadius: 6, padding: '2px 7px',
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--primary)' }} />
                      Fresh
                    </span>
                  )}
                </td>
                <td style={nestedTd}>
                  <span style={cellStrong}>{row.quantity.toLocaleString()}</span>
                  {unit && <span style={cellUnit}>{unit}</span>}
                </td>
                <td style={nestedTd}>
                  <span style={{ ...cellStrong, color: remainingColor }}>
                    {remaining.toLocaleString()}
                  </span>
                  {consumed > 0 && (
                    <span
                      style={{
                        marginLeft: 6, fontSize: 9, color: 'var(--text-muted)',
                        opacity: 0.6, fontWeight: 700,
                      }}
                    >
                      -{consumed.toLocaleString()}
                    </span>
                  )}
                </td>
                <td style={nestedTd}>
                  {expiry ? (
                    <span style={{ ...cellText, color: expiryColor, fontWeight: 700 }}>
                      {format(expiry, 'MMM dd')}
                    </span>
                  ) : (
                    <span style={{ opacity: 0.3, fontStyle: 'italic' }}>—</span>
                  )}
                </td>
                <td style={nestedTd}>
                  <span style={cellMuted}>৳{row.basePrice.toLocaleString()}</span>
                </td>
                <td style={nestedTd}>
                  <span style={{ ...cellStrong, color: 'var(--primary)' }}>
                    ৳{line.toLocaleString()}
                  </span>
                </td>
                <td style={{ ...nestedTd, maxWidth: '200px', ...cellMuted }}>
                  {row.notes ? (
                    <span
                      title={row.notes}
                      style={{
                        display: '-webkit-box', WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}
                    >
                      {row.notes}
                    </span>
                  ) : (
                    <span style={{ opacity: 0.3, fontStyle: 'italic' }}>—</span>
                  )}
                </td>
                <td style={nestedTd}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <LotsBtn onClick={() => onViewLots(row)} />
                    <DeleteBtn onClick={() => onDeleteEntry(row)} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Shared table helpers ────────────────────────────────── */
const cellId: React.CSSProperties = {
  fontWeight: 900,
  color: 'var(--primary)',
  fontSize: '11px',
  letterSpacing: '-0.02em',
  fontVariantNumeric: 'tabular-nums',
};
const cellText: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 700,
  color: 'var(--text-main)',
  fontVariantNumeric: 'tabular-nums',
};
const cellStrong: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 950,
  color: 'var(--text-main)',
  fontVariantNumeric: 'tabular-nums',
};
const cellUnit: React.CSSProperties = {
  fontSize: '9px',
  color: 'var(--text-muted)',
  opacity: 0.5,
  marginLeft: '4px',
  textTransform: 'uppercase',
  fontWeight: 700,
};
const cellMuted: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--text-muted)',
  fontWeight: 600,
};

function ProductCell({ name, sub }: { name: string; sub: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          background: 'rgba(16,185,129,0.06)',
          border: '1px solid rgba(16,185,129,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--primary)',
        }}
      >
        <Package size={14} />
      </div>
      <div>
        <div
          style={{
            fontWeight: 800,
            color: 'var(--text-main)',
            fontSize: '13px',
            letterSpacing: '-0.01em',
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontSize: '9px',
            color: 'var(--text-muted)',
            fontWeight: 700,
            textTransform: 'uppercase',
            opacity: 0.55,
          }}
        >
          {sub}
        </div>
      </div>
    </div>
  );
}

function DeleteBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      title="Delete"
      onClick={onClick}
      style={{
        padding: '8px',
        borderRadius: '10px',
        background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.2)',
        color: '#ef4444',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      <Trash2 size={13} />
    </button>
  );
}

function LotsBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      title="View lot trail"
      onClick={onClick}
      style={{
        padding: '8px',
        borderRadius: '10px',
        background: 'rgba(16,185,129,0.08)',
        border: '1px solid rgba(16,185,129,0.2)',
        color: 'var(--primary)',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Layers size={13} />
    </button>
  );
}

function EmptyRow({ columns, label }: { columns: number; label: string }) {
  return (
    <tr>
      <td colSpan={columns} style={{ padding: '5rem', textAlign: 'center' }}>
        <FileX size={40} style={{ color: 'var(--text-muted)', opacity: 0.2, margin: '0 auto' }} />
        <p
          style={{
            marginTop: '1rem',
            fontSize: '11px',
            fontWeight: 900,
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            letterSpacing: '0.1em',
          }}
        >
          {label}
        </p>
      </td>
    </tr>
  );
}

/* ─── Skeleton rows ───────────────────────────────────────── */
function SkeletonRows({ count = 6, columns = 8 }: { count?: number; columns?: number }) {
  const widths = ['62%', '88%', '55%', '72%', '95%', '66%'];
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr
          key={i}
          className="table-row"
          style={{ animation: `fade-in 0.45s ${i * 35}ms cubic-bezier(0.23, 1, 0.32, 1) both` }}
        >
          {Array.from({ length: columns }).map((__, j) => (
            <td key={j} className="table-cell">
              <span
                className="skeleton skeleton-line"
                style={{ width: widths[(i + j) % widths.length] }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/* ─── StatCard ────────────────────────────────────────────── */
function StatCard({
  label,
  value,
  sub,
  icon,
  accent = 'var(--primary)',
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '3px',
          height: '100%',
          background: accent,
          boxShadow: `0 0 12px ${accent}`,
        }}
      />
      <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.05, transform: 'scale(2)' }}>
        {icon}
      </div>
      <p
        style={{
          fontSize: '9px',
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          color: 'var(--text-muted)',
          marginBottom: '4px',
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: '1.75rem',
          fontWeight: 900,
          color: 'var(--text-main)',
          fontStyle: 'italic',
          letterSpacing: '-0.04em',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </p>
      <p style={{ fontSize: '10px', color: accent, fontWeight: 700, marginTop: '4px' }}>{sub}</p>
    </div>
  );
}

/* ─── Filter select ───────────────────────────────────────── */
function FilterSelect({
  icon,
  label,
  value,
  onChange,
  options,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        background: 'var(--background)',
        padding: '4px',
        borderRadius: '12px',
        border: '1px solid var(--border)',
      }}
    >
      <div
        style={{
          padding: '0 10px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--text-muted)',
        }}
      >
        {icon}
        <span
          style={{
            fontSize: '10px',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          {label}
        </span>
      </div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-main)',
          fontSize: '11px',
          fontWeight: 900,
          textTransform: 'uppercase',
          padding: '8px 14px 8px 0',
          cursor: 'pointer',
          outline: 'none',
          fontFamily: 'inherit',
          maxWidth: '180px',
        }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ─── Date input ──────────────────────────────────────────── */
function DateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <PremiumDatePicker
      compact
      label={label}
      value={value}
      onChange={onChange}
      placeholder="Pick date"
    />
  );
}

/* ─── Premium calendar date picker ────────────────────────── */
const NAV_BTN_STYLE: React.CSSProperties = {
  padding: 7,
  borderRadius: 9,
  background: 'var(--overlay-soft)',
  border: '1px solid var(--border)',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.15s',
};

function PremiumDatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = 'Select date',
  compact = false,
  label,
}: {
  value: string;
  onChange: (date: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  compact?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const selected = value ? parseISO(value) : null;
  const minDate = min ? startOfDay(parseISO(min)) : null;
  const maxDate = max ? startOfDay(parseISO(max)) : null;
  const today = startOfDay(new Date());

  const [viewMonth, setViewMonth] = useState<Date>(() =>
    startOfMonth(selected ?? minDate ?? today),
  );

  const POP_W = 320;
  const POP_H = 380;
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const computeCoords = () => {
    if (!triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();
    const margin = 12;
    let left = rect.right - POP_W;
    if (left < margin) left = margin;
    if (left + POP_W > window.innerWidth - margin) {
      left = window.innerWidth - POP_W - margin;
    }
    let top = rect.bottom + 8;
    if (top + POP_H > window.innerHeight - margin) {
      top = Math.max(margin, rect.top - POP_H - 8);
    }
    return { top, left };
  };

  const togglePicker = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const next = computeCoords();
    if (next) setCoords(next);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const update = () => {
      const next = computeCoords();
      if (next) setCoords(next);
    };
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(t) &&
        popoverRef.current && !popoverRef.current.contains(t)
      ) {
        setOpen(false);
      }
    };
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', escHandler);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', escHandler);
    };
  }, [open]);

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const startDay = getDay(monthStart);
  const totalDays = monthEnd.getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) {
    cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));
  }
  while (cells.length < 42) cells.push(null);

  const canGoPrev = !minDate || !isBefore(startOfMonth(subMonths(viewMonth, 1)), startOfMonth(minDate));
  const canGoNext = !maxDate || !isBefore(startOfMonth(maxDate), startOfMonth(addMonths(viewMonth, 1)));

  const trigger = compact ? (
    <button
      ref={triggerRef}
      type="button"
      onClick={togglePicker}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.55rem',
        background: 'var(--background)',
        padding: '6px 10px 6px 12px',
        borderRadius: '12px',
        border: open
          ? '1px solid rgba(16,185,129,0.35)'
          : '1px solid var(--border)',
        cursor: 'pointer',
        transition: 'all 0.18s',
        boxShadow: open ? '0 0 0 4px rgba(16,185,129,0.06)' : 'none',
      }}
    >
      <Calendar
        size={12}
        style={{ color: selected ? 'var(--primary)' : 'var(--text-muted)' }}
      />
      {label && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--text-muted)',
          }}
        >
          {label}
        </span>
      )}
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: selected ? 'var(--text-main)' : 'var(--text-muted)',
          opacity: selected ? 1 : 0.55,
          fontVariantNumeric: 'tabular-nums',
          minWidth: 78,
        }}
      >
        {selected ? format(selected, 'MMM dd, yyyy') : placeholder}
      </span>
      {selected ? (
        <span
          role="button"
          tabIndex={0}
          title="Clear"
          onClick={e => { e.stopPropagation(); onChange(''); }}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onChange(''); } }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 18,
            height: 18,
            borderRadius: 5,
            color: 'var(--text-muted)',
            opacity: 0.55,
            cursor: 'pointer',
          }}
        >
          <X size={11} />
        </span>
      ) : (
        <ChevronRight
          size={11}
          style={{ color: 'var(--text-muted)', opacity: 0.35, transform: 'rotate(90deg)' }}
        />
      )}
    </button>
  ) : (
    <button
      ref={triggerRef}
      type="button"
      onClick={togglePicker}
      className="input-premium"
      style={{
        width: '100%',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        color: selected ? 'var(--text-main)' : 'var(--text-muted)',
        cursor: 'pointer',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Calendar size={14} style={{ color: selected ? 'var(--primary)' : 'var(--text-muted)', opacity: selected ? 1 : 0.6 }} />
        <span style={{ fontWeight: selected ? 800 : 600, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
          {selected ? format(selected, 'MMM dd, yyyy') : placeholder}
        </span>
      </span>
      {selected ? (
        <span
          role="button"
          tabIndex={0}
          title="Clear"
          onClick={e => { e.stopPropagation(); onChange(''); }}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onChange(''); } }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 20,
            height: 20,
            borderRadius: 6,
            color: 'var(--text-muted)',
            opacity: 0.5,
            cursor: 'pointer',
          }}
        >
          <X size={12} />
        </span>
      ) : (
        <ChevronRight size={12} style={{ color: 'var(--text-muted)', opacity: 0.4, transform: 'rotate(90deg)' }} />
      )}
    </button>
  );

  return (
    <div style={{ position: 'relative' }}>
      {trigger}

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={popoverRef}
          className="animate-fade-in"
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            zIndex: 2000,
            width: POP_W,
            padding: 16,
            borderRadius: 18,
            background: 'var(--surface)',
            border: '1px solid rgba(16,185,129,0.22)',
            boxShadow: '0 28px 64px var(--overlay-shadow), 0 0 36px rgba(16,185,129,0.1)',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <button
              type="button"
              onClick={() => canGoPrev && setViewMonth(m => subMonths(m, 1))}
              disabled={!canGoPrev}
              style={{ ...NAV_BTN_STYLE, opacity: canGoPrev ? 1 : 0.3, cursor: canGoPrev ? 'pointer' : 'not-allowed' }}
            >
              <ChevronLeft size={14} />
            </button>
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.18em',
                  color: 'var(--text-main)',
                  fontStyle: 'italic',
                }}
              >
                {format(viewMonth, 'MMMM')}
              </span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.25em',
                  color: 'var(--primary)',
                  opacity: 0.7,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {format(viewMonth, 'yyyy')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => canGoNext && setViewMonth(m => addMonths(m, 1))}
              disabled={!canGoNext}
              style={{ ...NAV_BTN_STYLE, opacity: canGoNext ? 1 : 0.3, cursor: canGoNext ? 'pointer' : 'not-allowed' }}
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Weekday row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 8 }}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div
                key={i}
                style={{
                  textAlign: 'center',
                  fontSize: 9,
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.2em',
                  color: 'var(--text-muted)',
                  opacity: 0.5,
                  padding: '4px 0',
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
            {cells.map((cell, idx) => {
              if (!cell) return <div key={idx} style={{ height: 36 }} />;
              const disabled =
                (minDate ? isBefore(cell, minDate) : false) ||
                (maxDate ? isBefore(maxDate, cell) : false);
              const isToday = isSameDay(cell, today);
              const isSelected = selected ? isSameDay(cell, selected) : false;

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(format(cell, 'yyyy-MM-dd'));
                    setOpen(false);
                  }}
                  style={{
                    height: 36,
                    borderRadius: 10,
                    border: isSelected
                      ? '1px solid rgba(16,185,129,0.5)'
                      : isToday
                      ? '1px solid var(--border)'
                      : '1px solid transparent',
                    background: isSelected
                      ? 'var(--primary)'
                      : 'transparent',
                    color: disabled
                      ? '#cbd5e1'
                      : isSelected
                      ? '#ffffff'
                      : isToday
                      ? 'var(--primary)'
                      : 'var(--text-main)',
                    fontSize: 12,
                    fontWeight: isSelected ? 950 : isToday ? 800 : 600,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    fontVariantNumeric: 'tabular-nums',
                    transition: 'all 0.15s',
                    boxShadow: isSelected ? '0 0 16px rgba(16,185,129,0.25)' : 'none',
                    position: 'relative',
                  }}
                  onMouseEnter={e => {
                    if (!disabled && !isSelected) {
                      e.currentTarget.style.background = 'rgba(16,185,129,0.08)';
                      e.currentTarget.style.color = 'var(--primary)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!disabled && !isSelected) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = isToday ? 'var(--primary)' : 'var(--text-main)';
                    }
                  }}
                >
                  {cell.getDate()}
                  {isToday && !isSelected && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 4,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 3,
                        height: 3,
                        borderRadius: '50%',
                        background: 'var(--primary)',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 12,
              paddingTop: 12,
              borderTop: '1px solid var(--border)',
            }}
          >
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); }}
              style={{
                fontSize: 9,
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                color: 'var(--text-muted)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '6px 8px',
                opacity: 0.7,
              }}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                const afterMin = minDate && isBefore(today, minDate) ? minDate : today;
                const target = maxDate && isBefore(maxDate, afterMin) ? maxDate : afterMin;
                onChange(format(target, 'yyyy-MM-dd'));
                setViewMonth(startOfMonth(target));
                setOpen(false);
              }}
              style={{
                fontSize: 9,
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                color: 'var(--primary)',
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.22)',
                borderRadius: 8,
                cursor: 'pointer',
                padding: '6px 12px',
              }}
            >
              Today
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

/* ─── Field ───────────────────────────────────────────────── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label
        style={{
          fontSize: '9px',
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          color: 'var(--text-muted)',
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

/* ─── Product picker (shared between modals) ──────────────── */
function ProductPicker({
  value,
  onChange,
  disabled: forceDisabled = false,
}: {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const productsQ = useProducts({ status: 'Active', pageSize: 200, sort: 'name' });
  const products = productsQ.data?.data ?? [];
  const loading = productsQ.isLoading || productsQ.isFetching;
  const error = productsQ.error;
  const disabled = forceDisabled || loading || !!error;

  return (
    <>
      <div style={{ position: 'relative' }}>
        <select
          className="input-premium"
          required
          disabled={disabled}
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ width: '100%', opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
        >
          <option value="">
            {loading
              ? 'Loading products…'
              : error
              ? 'Failed to load products'
              : products.length === 0
              ? 'No products — add one in Products first'
              : 'Select product…'}
          </option>
          {products.map(p => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.id})
            </option>
          ))}
        </select>
        {loading && (
          <Loader2
            size={14}
            className="animate-spin"
            style={{
              position: 'absolute',
              right: '40px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--primary)',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>
      {error && (
        <div
          style={{
            marginTop: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            fontSize: '10px',
            fontWeight: 700,
            color: '#ef4444',
          }}
        >
          <span>{error instanceof Error ? error.message : 'Unknown error'}</span>
          <button
            type="button"
            onClick={() => productsQ.refetch()}
            style={{
              fontSize: '9px',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              color: 'var(--primary)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )}
    </>
  );
}

function EntryModal({
  pending,
  onClose,
  onSubmit,
}: {
  pending: boolean;
  onClose: () => void;
  onSubmit: (input: StockEntryInput) => void;
}) {
  const productsQ = useProducts({ status: 'Active', pageSize: 200, sort: 'name' });
  const products = productsQ.data?.data ?? [];

  const [form, setForm] = useState({
    date: dhakaToday(),
    productId: '',
    quantity: 0,
    basePrice: 0,
    source: '',
    expiryDate: '',
    sellMode: 'default' as 'default' | 'percent' | 'manual',
    profitPercent: '',
    sellPrice: '',
  });
  const [notes, setNotes] = useState('');
  // Track whether the user has manually edited basePrice so picking a product
  // doesn't clobber an intentional override.
  const basePriceTouched = useRef(false);

  const selectedProduct = products.find(p => p.id === form.productId);
  const lineTotal = form.quantity * (form.basePrice || 0);
  const defaultSellPrice = selectedProduct?.tradePrice ?? 0;
  const resolvedSellPrice = form.sellMode === 'manual'
    ? Number(form.sellPrice) || 0
    : form.sellMode === 'percent'
      ? (form.profitPercent ? Math.round((form.basePrice || 0) * (1 + Number(form.profitPercent) / 100)) : defaultSellPrice)
      : defaultSellPrice;
  const sellPriceAtOrBelowCost = !!form.productId && form.basePrice > 0 && resolvedSellPrice <= form.basePrice;
  const marginAmount = resolvedSellPrice - (form.basePrice || 0);
  const pricingSource = form.sellMode === 'manual'
    ? 'Manual sell price'
    : form.sellMode === 'percent' && form.profitPercent
      ? `${form.profitPercent}% margin`
      : 'Product default trade price';

  const canSubmit =
    !!form.date &&
    !!form.productId &&
    form.quantity > 0 &&
    form.basePrice > 0 &&
    form.source.trim().length > 0 &&
    !sellPriceAtOrBelowCost;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      date: form.date,
      productId: form.productId,
      quantity: Math.max(0, form.quantity),
      basePrice: Math.max(0, form.basePrice),
      listPrice: selectedProduct?.listPrice,
      tradeProfitPercent: form.sellMode === 'percent' && form.profitPercent ? Number(form.profitPercent) : undefined,
      tradePrice: resolvedSellPrice,
      mrp: selectedProduct?.mrp,
      source: form.source.trim(),
      expiryDate: form.expiryDate?.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <ModalShell title="New Stock Entry" accent="" icon={<ArrowDownToLine size={18} />} onClose={onClose} maxWidth="1180px">
      <form onSubmit={handleSubmit} className="stock-entry-form">
        <div className="stock-entry-layout">
          <div className="stock-entry-main">
            <div className="stock-form-section">
              <div className="stock-section-title">Procurement Details</div>
              <div className="stock-entry-grid stock-entry-grid-top">
                <Field label="Entry Date">
                  <PremiumDatePicker
                    value={form.date}
                    onChange={date => setForm({ ...form, date })}
                    max={dhakaToday()}
                    placeholder="Pick entry date"
                  />
                </Field>
                <Field label="Target Product">
                  <ProductPicker
                    value={form.productId}
                    onChange={id => {
                      const selected = products.find(p => p.id === id);
                      setForm({
                        ...form,
                        productId: id,
                        basePrice: basePriceTouched.current ? form.basePrice : selected?.basePrice ?? 0,
                        sellMode: 'default',
                        profitPercent: '',
                        sellPrice: '',
                      });
                    }}
                  />
                </Field>
              </div>

              <div className="stock-entry-grid stock-entry-grid-two">
                <Field label={`Quantity (${selectedProduct?.unit || 'Units'})`}>
                  <input
                    type="number"
                    className="input-premium"
                    required
                    min="0.01"
                    step="any"
                    placeholder="0.00"
                    value={form.quantity || ''}
                    onChange={e => setForm({ ...form, quantity: Number(e.target.value) })}
                    style={{ height: '52px', fontSize: '16px', fontWeight: 800 }}
                  />
                </Field>
                <Field label="Base Price (৳)">
                  <input
                    type="number"
                    className="input-premium"
                    required
                    min="0"
                    step="any"
                    placeholder="0.00"
                    value={form.basePrice || ''}
                    onChange={e => {
                      basePriceTouched.current = true;
                      setForm({ ...form, basePrice: Number(e.target.value) });
                    }}
                    style={{ height: '52px', fontSize: '16px', fontWeight: 800 }}
                  />
                </Field>
              </div>

              <div className="stock-entry-grid stock-entry-grid-two">
                <Field label="Sell Price Source">
                  <select
                    className="input-premium"
                    value={form.sellMode}
                    onChange={e => setForm({ ...form, sellMode: e.target.value as typeof form.sellMode })}
                    style={{ height: '52px' }}
                  >
                    <option value="default">Product Default Trade Price</option>
                    <option value="percent">% Margin on Base</option>
                    <option value="manual">Manual Sell Price</option>
                  </select>
                </Field>
                {form.sellMode === 'manual' ? (
                  <Field label="Manual Sell Price (৳)">
                    <input
                      type="number"
                      className="input-premium"
                      min="0"
                      step="any"
                      placeholder="0.00"
                      value={form.sellPrice}
                      onChange={e => setForm({ ...form, sellPrice: e.target.value })}
                      style={{ height: '52px', fontSize: '16px', fontWeight: 800 }}
                    />
                  </Field>
                ) : form.sellMode === 'percent' ? (
                  <Field label="Profit Margin %">
                    <input
                      type="number"
                      className="input-premium"
                      min="0"
                      step="any"
                      placeholder="0"
                      value={form.profitPercent}
                      onChange={e => setForm({ ...form, profitPercent: e.target.value })}
                      style={{ height: '52px', fontSize: '16px', fontWeight: 800 }}
                    />
                  </Field>
                ) : (
                  <Field label="Default Sell Snapshot">
                    <div className="input-premium stock-readonly-value">
                      {selectedProduct ? `৳${defaultSellPrice.toLocaleString()}` : 'Select product'}
                    </div>
                  </Field>
                )}
              </div>

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

              <div className="stock-entry-grid stock-entry-grid-two">
                <Field label="Procurement Source">
                  <input
                    className="input-premium"
                    required
                    placeholder="e.g. Gazipur Market / Direct"
                    value={form.source}
                    onChange={e => setForm({ ...form, source: e.target.value })}
                    style={{ height: '52px' }}
                  />
                </Field>
                <Field label="Expiry Date (Optional)">
                  <PremiumDatePicker
                    value={form.expiryDate}
                    onChange={date => setForm({ ...form, expiryDate: date })}
                    min={dhakaToday()}
                    placeholder="No expiry"
                  />
                </Field>
              </div>

              <Field label="Internal Notes / Narrative">
                <textarea
                  className="input-premium custom-scrollbar"
                  placeholder="Record quality, driver, supplier terms, or special conditions..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  style={{ minHeight: '86px', padding: '12px', resize: 'none' }}
                />
              </Field>
            </div>
          </div>
        </div>

        <div className="stock-entry-summary">
          <div className="stock-summary-product">
            <span>Selected Product</span>
            <strong>{selectedProduct?.name ?? 'No product selected'}</strong>
            <p>{selectedProduct ? `${selectedProduct.id} · ${selectedProduct.unit}` : 'Pick product to preview inventory cost'}</p>
          </div>
          <div className="stock-summary-metric">
            <span>Quantity</span>
            <strong>{form.quantity ? form.quantity.toLocaleString() : '0'} {selectedProduct?.unit ?? 'units'}</strong>
          </div>
          <div className="stock-summary-metric">
            <span>Base Rate</span>
            <strong>৳{(form.basePrice || 0).toLocaleString()}</strong>
          </div>
          <div className="stock-summary-metric">
            <span>Sell Snapshot</span>
            <strong>৳{resolvedSellPrice.toLocaleString()}</strong>
            <p>{pricingSource}</p>
            <p>Margin ৳{marginAmount.toLocaleString()}</p>
          </div>
          <div className="stock-summary-total">
            <span>Projected Lot Cost</span>
            <strong>৳{lineTotal.toLocaleString()}</strong>
          </div>
        </div>

        <div className="stock-modal-footer">
          <div className="stock-footer-note">
            Stock lot will keep this buy cost and sell-price snapshot for distribution.
          </div>
          <div className="stock-footer-actions">
            <button type="button" onClick={onClose} className="btn-secondary" style={{ height: '52px', padding: '0 1.5rem' }}>Discard</button>
            <button
              type="submit"
              disabled={!canSubmit || pending}
              className="btn-primary"
              style={{
                height: '52px',
                padding: '0 2.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                opacity: canSubmit ? 1 : 0.4
              }}
            >
              {pending ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
              <span style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Commit to Inventory</span>
            </button>
          </div>
        </div>
      </form>
    </ModalShell>
  );
}

/* ─── Modal shell ───────────────────────────────── */
function ModalShell({
  title,
  accent,
  icon,
  onClose,
  children,
  maxWidth = '1100px',
}: {
  title: string;
  accent: string;
  icon: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string | number;
}) {
  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div
        className="sheet-content animate-fade-in custom-scrollbar"
        style={{ maxWidth, padding: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          padding: '1.5rem 2rem',
          borderBottom: '1px solid var(--overlay-medium)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.02)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backdropFilter: 'blur(20px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '10px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', color: 'var(--primary)' }}>
              {icon}
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', color: 'var(--text-main)' }}>
                {title}{accent && <span style={{ color: 'var(--primary)' }}>.{accent}</span>}
              </h2>
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.6 }}>
                Inventory Management · GHM Produce
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ padding: '8px', borderRadius: '10px', background: 'var(--overlay-soft)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: '2.5rem' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ─── Confirm dialog ──────────────────────────────────────── */
function ConfirmDialog({
  title,
  message,
  confirmLabel,
  pending,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--modal-backdrop)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1010,
        padding: '2rem',
      }}
      onClick={onCancel}
    >
      <div
        className="card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '1.75rem',
          border: '1px solid rgba(239,68,68,0.25)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
          <div
            style={{
              padding: '10px',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '12px',
              color: '#ef4444',
            }}
          >
            <AlertTriangle size={16} />
          </div>
          <h3
            style={{
              fontSize: '14px',
              fontWeight: 900,
              color: 'var(--text-main)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {title}
          </h3>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          <button type="button" onClick={onCancel} className="btn-secondary" style={{ flex: 1 }}>
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            style={{
              flex: 1,
              padding: '0.75rem 1.5rem',
              borderRadius: '0.75rem',
              fontSize: '0.75rem',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              background: '#ef4444',
              color: 'var(--text-main)',
              border: 'none',
              cursor: pending ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: pending ? 0.7 : 1,
            }}
          >
            {pending && <Loader2 className="animate-spin" size={14} />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
