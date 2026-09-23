'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import MainLayout from '@/components/MainLayout';
import {
  useDistributionOrders,
  useDistributionOrder,
  useCreateDistributionOrder,
  useConfirmDistributionOrder,
  useCancelDistributionOrder,
  useCustomers,
  useProducts,
} from '@/hooks/api';
import type { Customer, DistributionOrderListItem, DistributionOrderStatus, Product } from '@/lib/types';
import { ApiError } from '@/lib/api';
import { formatBDT, todayInDhakaISO } from '@/lib/format';
import { companyInfo } from '@/lib/company';
import BatchAllocatePicker, { type DraftLine } from '@/components/BatchAllocatePicker';
import { OrderSlipDocument, type OrderSlipData } from '@/components/invoices/OrderSlipDocument';
import PrintPortal from '@/components/PrintPortal';
import {
  Plus,
  ClipboardList,
  Search,
  Loader2,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  XCircle,
  Package,
  Ban,
  Printer,
} from 'lucide-react';

const STATUSES: DistributionOrderStatus[] = ['issued', 'confirmed', 'cancelled'];

const STATUS_META: Record<DistributionOrderStatus, { label: string; color: string }> = {
  issued: { label: 'Issued', color: '#f59e0b' },
  confirmed: { label: 'Confirmed', color: '#10b981' },
  cancelled: { label: 'Cancelled', color: '#888' },
};

const ERROR_COPY: Record<string, string> = {
  ALREADY_CONFIRMED: 'This order was already confirmed or cancelled by someone else — refresh to see its current state.',
  NOT_ISSUED: 'Only issued (not yet confirmed) orders can be cancelled.',
  NOTHING_CONFIRMED: 'At least one line needs a confirmed quantity greater than zero.',
  INSUFFICIENT_STOCK: 'Not enough warehouse stock to confirm one or more lines.',
  INVALID_CUSTOMER: 'Selected customer is invalid.',
};

function describeError(err: unknown): string {
  if (err instanceof ApiError) return ERROR_COPY[err.code ?? ''] ?? err.message;
  return err instanceof Error ? err.message : 'Unexpected error';
}

export default function DistributionOrdersPage() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<DistributionOrderStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [createOpen, setCreateOpen] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<DistributionOrderListItem | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const listQ = useDistributionOrders({ q: q || undefined, status, page, pageSize, sort: '-date' });
  const cancelMutation = useCancelDistributionOrder();

  const rows = listQ.data?.data ?? [];
  const total = listQ.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const { issuedCount, confirmedCount } = useMemo(() => {
    let issued = 0;
    let confirmed = 0;
    for (const o of rows) {
      if (o.status === 'issued') issued += 1;
      if (o.status === 'confirmed') confirmed += 1;
    }
    return { issuedCount: issued, confirmedCount: confirmed };
  }, [rows]);

  const hasFilters = q || status !== 'all';
  const resetFilters = () => { setQ(''); setStatus('all'); setPage(1); };

  const handleCancel = async () => {
    if (!cancelling) return;
    setErrorMsg(null);
    try {
      await cancelMutation.mutateAsync(cancelling.id);
      setCancelling(null);
    } catch (err) {
      setErrorMsg(describeError(err));
      setCancelling(null);
    }
  };

  return (
    <MainLayout>
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '4rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '14px', background: 'rgba(16,185,129,0.1)', borderRadius: '18px', color: 'var(--primary)', border: '1px solid rgba(16,185,129,0.2)', boxShadow: '0 0 24px rgba(16,185,129,0.1)' }}>
              <ClipboardList size={28} />
            </div>
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-main)', textTransform: 'uppercase', fontStyle: 'italic', lineHeight: 1.1, letterSpacing: '-0.03em' }}>
                Distribution <span style={{ color: 'var(--primary)' }}>Orders</span>
              </h1>
              <p style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3em', opacity: 0.6, marginTop: '4px' }}>
                Restaurant / Shop Issue → Confirm · {total} Total
              </p>
            </div>
          </div>

          <button onClick={() => setCreateOpen(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Plus size={18} />
            New Order
          </button>
        </div>

        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
          <StatCard label="Total Orders" value={total.toLocaleString()} sub="Matching current filter" icon={<ClipboardList size={20} />} />
          <StatCard label="Issued (this page)" value={issuedCount.toLocaleString()} sub="Awaiting confirmation" icon={<Package size={20} />} />
          <StatCard label="Confirmed (this page)" value={confirmedCount.toLocaleString()} sub={`of ${rows.length} visible`} icon={<CheckCircle2 size={20} />} />
        </div>

        {errorMsg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', borderRadius: '14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', fontSize: '12px', fontWeight: 800 }}>
            <AlertTriangle size={16} />
            <span style={{ flex: 1 }}>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* Filter bar */}
        <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={14} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', opacity: 0.5 }} />
            <input
              type="text"
              placeholder="Search by order ID or customer…"
              className="input-premium"
              style={{ width: '100%', paddingLeft: '44px' }}
              value={q}
              onChange={e => { setQ(e.target.value); setPage(1); }}
            />
          </div>

          <FilterSelect
            icon={<Filter size={12} />}
            label="Status"
            value={status}
            onChange={v => { setStatus(v as DistributionOrderStatus | 'all'); setPage(1); }}
            options={[{ value: 'all', label: 'All' }, ...STATUSES.map(s => ({ value: s, label: STATUS_META[s].label }))]}
          />

          {hasFilters && (
            <button onClick={resetFilters} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '10px' }}>
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="table-container shadow-lg">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['ID', 'Customer', 'Date', 'Status', 'Lines', 'Actions'].map(h => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {listQ.isLoading ? (
                <SkeletonRows count={6} />
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '5rem', textAlign: 'center' }}>
                    <ClipboardList size={40} style={{ color: 'var(--text-muted)', opacity: 0.2, margin: '0 auto' }} />
                    <p style={{ marginTop: '1rem', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
                      {hasFilters ? 'No orders match your filters' : 'No distribution orders yet — create your first'}
                    </p>
                  </td>
                </tr>
              ) : (
                rows.map(o => {
                  const meta = STATUS_META[o.status];
                  const requestedTotal = o.lines.reduce((s, l) => s + l.requestedQty, 0);
                  const confirmedTotal = o.lines.reduce((s, l) => s + (l.confirmedQty ?? 0), 0);
                  return (
                    <tr key={o.id} className="table-row">
                      <td className="table-cell">
                        <span style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '11px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{o.id}</span>
                      </td>
                      <td className="table-cell">
                        <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '13px' }}>{o.customer?.name ?? o.customerId}</div>
                      </td>
                      <td className="table-cell">
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>{o.date}</span>
                      </td>
                      <td className="table-cell">
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontSize: '9px',
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            background: `${meta.color}1a`,
                            color: meta.color,
                            border: `1px solid ${meta.color}40`,
                          }}
                        >
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'currentColor' }} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span style={{ fontSize: '11px', color: 'var(--text-main)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                          {o.status === 'issued' ? `${o.lines.length} items · ${requestedTotal} requested` : `${confirmedTotal} / ${requestedTotal} confirmed`}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            title="Print order slip"
                            onClick={() => setPrintingId(o.id)}
                            style={{ padding: '7px', borderRadius: '9px', background: 'var(--overlay-soft)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
                          >
                            <Printer size={13} />
                          </button>
                          {o.status === 'issued' && (
                            <>
                              <button
                                title="Confirm delivery"
                                onClick={() => setConfirmingId(o.id)}
                                style={{ padding: '7px', borderRadius: '9px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981', cursor: 'pointer', display: 'flex' }}
                              >
                                <CheckCircle2 size={13} />
                              </button>
                              <button
                                title="Cancel order"
                                onClick={() => setCancelling(o)}
                                style={{ padding: '7px', borderRadius: '9px', background: 'var(--overlay-soft)', border: '1px solid var(--border)', color: '#ef4444', cursor: 'pointer', display: 'flex' }}
                              >
                                <Ban size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-muted)', opacity: 0.6 }}>
              Page {page} of {totalPages} · {total} records
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} style={{ padding: '0.5rem 0.9rem', display: 'flex', alignItems: 'center', gap: '6px', opacity: page <= 1 ? 0.4 : 1 }}>
                <ChevronLeft size={14} /> Prev
              </button>
              <button className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} style={{ padding: '0.5rem 0.9rem', display: 'flex', alignItems: 'center', gap: '6px', opacity: page >= totalPages ? 0.4 : 1 }}>
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {createOpen && <CreateOrderModal onClose={() => setCreateOpen(false)} />}

      {confirmingId && <ConfirmOrderModal orderId={confirmingId} onClose={() => setConfirmingId(null)} />}

      {printingId && <PrintOrderSlipHost orderId={printingId} onDone={() => setPrintingId(null)} />}

      {cancelling && (
        <ConfirmDialog
          title="Cancel Order"
          message={`Cancel order ${cancelling.id} for ${cancelling.customer?.name ?? cancelling.customerId}? No stock was ever moved for this issue, so nothing needs to be reversed.`}
          confirmLabel={cancelMutation.isPending ? 'Cancelling…' : 'Cancel Order'}
          pending={cancelMutation.isPending}
          onCancel={() => setCancelling(null)}
          onConfirm={handleCancel}
        />
      )}
    </MainLayout>
  );
}

/* ─── Print order slip ────────────────────────────────────── */
function orderSlipFromOrder(order: NonNullable<ReturnType<typeof useDistributionOrder>['data']>): OrderSlipData {
  return {
    id: order.id,
    date: order.date,
    status: order.status,
    customer: {
      name: order.customer?.name ?? order.customerId,
      phone: order.customer?.phone,
      address: order.customer?.address,
    },
    items: order.lines.map(l => ({
      name: l.product?.name ?? l.productId,
      unit: l.product?.unit,
      requestedQty: l.requestedQty,
    })),
  };
}

function PrintOrderSlipHost({ orderId, onDone }: { orderId: string; onDone: () => void }) {
  const { data: order } = useDistributionOrder(orderId);
  const printedRef = useRef(false);

  useEffect(() => {
    if (!order || printedRef.current) return;
    printedRef.current = true;
    document.body.classList.add('printing-receipt');
    const handleAfterPrint = () => {
      document.body.classList.remove('printing-receipt');
      onDone();
    };
    window.addEventListener('afterprint', handleAfterPrint, { once: true });
    const t = setTimeout(() => window.print(), 50);
    return () => clearTimeout(t);
  }, [order, onDone]);

  if (!order) return null;

  return (
    <PrintPortal>
      <OrderSlipDocument order={orderSlipFromOrder(order)} company={companyInfo} />
    </PrintPortal>
  );
}

/* ─── Skeleton rows ───────────────────────────────────────── */
function SkeletonRows({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} className="table-row" style={{ animation: `fade-in 0.5s ${i * 40}ms cubic-bezier(0.23, 1, 0.32, 1) both` }}>
          <td className="table-cell"><span className="skeleton skeleton-line" style={{ width: 60 }} /></td>
          <td className="table-cell"><span className="skeleton skeleton-block" style={{ width: '70%' }} /></td>
          <td className="table-cell"><span className="skeleton skeleton-line" style={{ width: '50%' }} /></td>
          <td className="table-cell"><span className="skeleton skeleton-pill" style={{ width: 70 }} /></td>
          <td className="table-cell"><span className="skeleton skeleton-line" style={{ width: '60%' }} /></td>
          <td className="table-cell">
            <div style={{ display: 'flex', gap: '6px' }}>
              <span className="skeleton" style={{ width: 28, height: 28, borderRadius: 9 }} />
              <span className="skeleton" style={{ width: 28, height: 28, borderRadius: 9 }} />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

/* ─── StatCard ────────────────────────────────────────────── */
function StatCard({ label, value, sub, icon }: { label: string; value: string | number; sub: string; icon: React.ReactNode }) {
  return (
    <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', background: 'var(--primary)', boxShadow: '0 0 12px var(--primary)' }} />
      <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.05, transform: 'scale(2)' }}>{icon}</div>
      <p style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</p>
      <p style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-main)', fontStyle: 'italic', letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
      <p style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 700, marginTop: '4px' }}>{sub}</p>
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
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--background)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border)' }}>
      <div style={{ padding: '0 10px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
        {icon}
        <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
      </div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', padding: '8px 14px 8px 0', cursor: 'pointer', outline: 'none', fontFamily: 'inherit', maxWidth: '180px' }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

/* ─── Create order modal ──────────────────────────────────── */
function CreateOrderModal({ onClose }: { onClose: () => void }) {
  const [customerId, setCustomerId] = useState('');
  const [date, setDate] = useState(todayInDhakaISO());
  const [error, setError] = useState<string | null>(null);

  const customersQ = useCustomers({ pageSize: 200, status: 'Active' });
  const createMutation = useCreateDistributionOrder();

  const customers = customersQ.data?.data ?? [];
  const selectedCustomer = customers.find((c: Customer) => c.id === customerId);

  const handleSubmitLines = async (lines: DraftLine[]) => {
    if (!customerId) {
      setError('Select a customer first');
      return;
    }
    setError(null);
    try {
      await createMutation.mutateAsync({
        customerId,
        date,
        lines: lines.map(l => ({ productId: l.productId, requestedQty: l.allocated })),
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Unexpected error');
    }
  };

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet-content animate-fade-in custom-scrollbar" style={{ maxWidth: '960px', padding: '2rem' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', color: 'var(--primary)' }}>
              <ClipboardList size={16} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', color: 'var(--text-main)' }}>
                New <span style={{ color: 'var(--primary)' }}>Distribution Order</span>
              </h2>
              <p style={{ fontSize: '9px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.5, marginTop: '2px' }}>
                Issues a request — no stock moves until confirmed
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ padding: '8px', borderRadius: '10px', background: 'var(--overlay-soft)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>

        {error && (
          <div style={{ marginBottom: '1rem', padding: '10px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', fontSize: '11px', fontWeight: 800 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
          <Field label="Customer">
            <select className="input-premium" value={customerId} onChange={e => setCustomerId(e.target.value)}>
              <option value="">Select customer…</option>
              {customers.map((c: Customer) => <option key={c.id} value={c.id}>{c.name} · {c.type}</option>)}
            </select>
          </Field>
          <Field label="Date">
            <input type="date" className="input-premium" value={date} max={todayInDhakaISO()} onChange={e => setDate(e.target.value)} />
          </Field>
        </div>

        <BatchAllocatePicker
          contextLabel={selectedCustomer?.name ?? 'New order'}
          date={date}
          pending={createMutation.isPending}
          submitLabel="Issue Order"
          emptyDraftHint="Pick a batch above to start adding products"
          onCancel={onClose}
          onSubmit={handleSubmitLines}
        />
      </div>
    </div>
  );
}

/* ─── Confirm order modal ─────────────────────────────────── */
function ConfirmOrderModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const orderQ = useDistributionOrder(orderId);
  const productsQ = useProducts({ pageSize: 200 });
  const confirmMutation = useConfirmDistributionOrder();
  const [error, setError] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, { confirmedQty: number; price: number }>>({});

  const products = productsQ.data?.data ?? [];
  const productMap = new Map(products.map((p: Product) => [p.id, p]));
  const order = orderQ.data;

  const lineState = (line: { productId: string; requestedQty: number }) => {
    const override = overrides[line.productId];
    if (override) return override;
    const product = productMap.get(line.productId);
    return { confirmedQty: line.requestedQty, price: product?.tradePrice ?? 0 };
  };

  const setLine = (productId: string, patch: Partial<{ confirmedQty: number; price: number }>) => {
    setOverrides(prev => ({
      ...prev,
      [productId]: { ...(prev[productId] ?? lineStateFallback(productId)), ...patch },
    }));
  };

  function lineStateFallback(productId: string) {
    const line = order?.lines.find(l => l.productId === productId);
    const product = productMap.get(productId);
    return { confirmedQty: line?.requestedQty ?? 0, price: product?.tradePrice ?? 0 };
  }

  const total = (order?.lines ?? []).reduce((sum, l) => {
    const s = lineState(l);
    return sum + s.confirmedQty * s.price;
  }, 0);

  const canSubmit = !!order && order.lines.some(l => lineState(l).confirmedQty > 0) && !confirmMutation.isPending;

  const handleSubmit = async () => {
    if (!order || !canSubmit) return;
    setError(null);
    try {
      await confirmMutation.mutateAsync({
        id: order.id,
        body: {
          lines: order.lines
            .map(l => ({ productId: l.productId, ...lineState(l) }))
            .filter(l => l.confirmedQty > 0),
        },
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Unexpected error');
    }
  };

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet-content animate-fade-in custom-scrollbar" style={{ maxWidth: '760px', padding: '2rem' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', color: 'var(--primary)' }}>
              <CheckCircle2 size={16} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', color: 'var(--text-main)' }}>
                Confirm <span style={{ color: 'var(--primary)' }}>Delivery</span>
              </h2>
              <p style={{ fontSize: '9px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.5, marginTop: '2px' }}>
                {order ? `${order.id} · ${order.customer?.name ?? order.customerId}` : orderId}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ padding: '8px', borderRadius: '10px', background: 'var(--overlay-soft)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>

        {error && (
          <div style={{ marginBottom: '1rem', padding: '10px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', fontSize: '11px', fontWeight: 800 }}>
            {error}
          </div>
        )}

        {orderQ.isLoading || !order ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <Loader2 className="animate-spin" size={24} style={{ color: 'var(--text-muted)' }} />
          </div>
        ) : (
          <>
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '1rem', lineHeight: 1.5 }}>
              Set the delivered quantity and price per line. Lines left at 0 are treated as not delivered and won&apos;t be invoiced.
            </p>
            <div className="custom-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '340px', overflowY: 'auto', padding: '2px' }}>
              {order.lines.map(l => {
                const s = lineState(l);
                const product = productMap.get(l.productId);
                return (
                  <div key={l.id} className="card" style={{ padding: '0.75rem 0.9rem', display: 'grid', gridTemplateColumns: '1.4fr 0.9fr 0.9fr 0.9fr', gap: '0.75rem', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-main)' }}>{product?.name ?? l.productId}</div>
                      <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Requested {l.requestedQty} {product?.unit ?? ''}</div>
                    </div>
                    <div>
                      <label style={{ fontSize: '8px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Confirm Qty</label>
                      <input
                        type="number"
                        min={0}
                        max={l.requestedQty}
                        className="input-premium"
                        value={s.confirmedQty}
                        onChange={e => setLine(l.productId, { confirmedQty: Math.min(l.requestedQty, Math.max(0, Number(e.target.value || 0))) })}
                        style={{ width: '100%', padding: '0.4rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '8px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Price</label>
                      <input
                        type="number"
                        min={0}
                        className="input-premium"
                        value={s.price}
                        onChange={e => setLine(l.productId, { price: Math.max(0, Number(e.target.value || 0)) })}
                        style={{ width: '100%', padding: '0.4rem' }}
                      />
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <label style={{ fontSize: '8px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Subtotal</label>
                      <div style={{ fontSize: '13px', fontWeight: 900, color: s.confirmedQty > 0 ? 'var(--primary)' : 'var(--text-muted)' }}>
                        {formatBDT(s.confirmedQty * s.price)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', padding: '0.85rem 1rem', background: 'rgba(16,185,129,0.04)', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.15)' }}>
              <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>Invoice Total</span>
              <span style={{ fontSize: '18px', fontWeight: 900, color: 'var(--primary)' }}>{formatBDT(total)}</span>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
              <button
                type="button"
                onClick={handleSubmit}
                className="btn-primary"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                disabled={!canSubmit}
              >
                {confirmMutation.isPending && <Loader2 className="animate-spin" size={16} />}
                Confirm & Invoice
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-muted)' }}>{label}</label>
      {children}
    </div>
  );
}

/* ─── Confirm dialog (cancel order) ───────────────────────── */
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
    <div style={{ position: 'fixed', inset: 0, background: 'var(--modal-backdrop)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1010, padding: '2rem' }} onClick={onCancel}>
      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '440px', padding: '1.75rem', border: '1px solid rgba(239,68,68,0.25)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
          <div style={{ padding: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', color: '#ef4444' }}>
            <XCircle size={16} />
          </div>
          <h3 style={{ fontSize: '14px', fontWeight: 900, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</h3>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          <button type="button" onClick={onCancel} className="btn-secondary" style={{ flex: 1 }}>Back</button>
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
