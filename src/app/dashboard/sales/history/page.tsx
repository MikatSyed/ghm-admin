'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import { QuickFilterChips } from '@/components/ui/QuickFilterChips';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatBDT, formatDateDhaka, formatInt, formatTimeDhaka, startOfMonthDhakaISO, startOfWeekDhakaISO, todayInDhakaISO } from '@/lib/format';
import { useDownloadReport, useSales, useVans, useVoidSale } from '@/hooks/api';
import { BadgeDollarSign, ChevronLeft, ChevronRight, Download, Eye, FilterX, Search, Truck, X } from 'lucide-react';

const PAGE_SIZE = 12;
type QuickFilter = 'today' | 'week' | 'month' | 'custom';

const quickOptions: ReadonlyArray<{ key: QuickFilter; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'custom', label: 'Custom' },
];

export default function SalesHistoryPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [vanId, setVanId] = useState('');
  const [dateFrom, setDateFrom] = useState(startOfMonthDhakaISO);
  const [dateTo, setDateTo] = useState(todayInDhakaISO);
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('month');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const { data: vans } = useVans();
  const downloadReport = useDownloadReport();
  const { data, isLoading, isError, error } = useSales({
    page,
    pageSize: PAGE_SIZE,
    vanId: vanId || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    q: q || undefined,
    sort: '-date,-createdAt',
  });
  const voidSale = useVoidSale();

  // Debounce free-text search so we don't fire a request per keystroke
  useEffect(() => {
    const t = window.setTimeout(() => {
      setQ(qInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [qInput]);

  const items = data?.data ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = !!vanId || !!q || quickFilter !== 'month';

  function applyQuickFilter(next: QuickFilter) {
    setQuickFilter(next);
    setPage(1);
    if (next === 'today') {
      const today = todayInDhakaISO();
      setDateFrom(today);
      setDateTo(today);
    }
    if (next === 'week') {
      setDateFrom(startOfWeekDhakaISO());
      setDateTo(todayInDhakaISO());
    }
    if (next === 'month') {
      setDateFrom(startOfMonthDhakaISO());
      setDateTo(todayInDhakaISO());
    }
  }

  function clearFilters() {
    setVanId('');
    setQInput('');
    applyQuickFilter('month');
  }

  async function onConfirmVoid() {
    if (!confirmId) return;
    try {
      await voidSale.mutateAsync(confirmId);
      setConfirmId(null);
    } catch {}
  }

  function exportCsv() {
    if (!dateFrom || !dateTo) return;
    downloadReport.mutate({ type: 'sales', params: { dateFrom, dateTo } });
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '9px',
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: '0.2em',
    color: 'var(--text-muted)',
    marginBottom: '4px',
  };

  return (
    <MainLayout>
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '4rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '30px', fontWeight: 900, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '-0.025em' }}>Sales History</h1>
            <p style={{ marginTop: '0.25rem', color: 'var(--text-muted)', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.24em' }}>
              Search · filter · export · void
            </p>
          </div>
          <button
            className="btn-secondary"
            disabled={!dateFrom || !dateTo || downloadReport.isPending}
            title={!dateFrom || !dateTo ? 'Pick a date range' : `Export ${dateFrom} → ${dateTo}`}
            onClick={exportCsv}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', opacity: !dateFrom || !dateTo ? 0.45 : 1 }}
          >
            <Download size={15} /> {downloadReport.isPending ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>

        {downloadReport.isError && (
          <div className="card" style={{ padding: '1rem', color: '#ef4444', background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.2)', fontWeight: 800, fontSize: '13px' }}>
            {(downloadReport.error as Error)?.message ?? 'Export failed'}
          </div>
        )}

        {/* Filters */}
        <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <QuickFilterChips value={quickFilter} options={quickOptions} onChange={applyQuickFilter} />
          <div style={{ display: 'flex', alignItems: 'end', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 220px', minWidth: '220px' }}>
              <label style={labelStyle}>Search</label>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="SAL-001 / INV-1024 / van name"
                  value={qInput}
                  onChange={(e) => setQInput(e.target.value)}
                  className="input-premium"
                  style={{ width: '100%', paddingLeft: '36px' }}
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Van</label>
              <select className="input-premium" value={vanId} onChange={(e) => { setVanId(e.target.value); setPage(1); }}>
                <option value="">All vans</option>
                {(vans ?? []).map((v) => <option key={v.id} value={v.id}>{v.vanName}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>From</label>
              <input type="date" className="input-premium" value={dateFrom} max={dateTo || undefined} onChange={(e) => { setDateFrom(e.target.value); setQuickFilter('custom'); setPage(1); }} />
            </div>
            <div>
              <label style={labelStyle}>To</label>
              <input type="date" className="input-premium" value={dateTo} min={dateFrom || undefined} max={todayInDhakaISO()} onChange={(e) => { setDateTo(e.target.value); setQuickFilter('custom'); setPage(1); }} />
            </div>
            {hasFilters && (
              <button className="btn-action clear-filter-btn" onClick={clearFilters} style={{ height: '40px' }}>
                <FilterX size={14} /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
              <thead>
                <tr>
                  {['Sale ID', 'Date', 'Van', 'Items', 'Total', 'Invoice', 'Actions'].map((h) => (
                    <th key={h} className="table-header" style={{ textAlign: h === 'Total' || h === 'Actions' ? 'right' : 'left', padding: '0.85rem 1.25rem' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading && [0, 1, 2, 3, 4].map((i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                    {[0, 1, 2, 3, 4, 5, 6].map((j) => <td key={j} style={{ padding: '1rem 1.25rem' }}><div className="skeleton skeleton-line" /></td>)}
                  </tr>
                ))}
                {!isLoading && isError && (
                  <tr>
                    <td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: '#ef4444', fontWeight: 800 }}>
                      {(error as Error)?.message ?? 'Failed to load sales'}
                    </td>
                  </tr>
                )}
                {!isLoading && !isError && items.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <BadgeDollarSign size={32} style={{ margin: '0 auto 10px', opacity: 0.35, display: 'block' }} />
                      <p style={{ fontWeight: 900, fontSize: '13px', color: 'var(--text-main)' }}>No sales found</p>
                      <p style={{ fontWeight: 700, fontSize: '11px', marginTop: '4px' }}>Try widening the date range or clearing filters.</p>
                    </td>
                  </tr>
                )}
                {!isLoading && !isError && items.map((s) => {
                  const invStatus = s.invoice?.status;
                  const voidBlocked = invStatus === 'paid';
                  return (
                    <tr
                      key={s.id}
                      className="table-row"
                      style={{ cursor: 'pointer' }}
                      onClick={() => router.push(`/dashboard/sales/${s.id}`)}
                    >
                      <td className="table-cell" style={{ padding: '0.85rem 1.25rem', fontWeight: 900 }}>{s.id}</td>
                      <td className="table-cell" style={{ padding: '0.85rem 1.25rem' }}>
                        <div style={{ fontWeight: 700 }}>{formatDateDhaka(s.date)}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, marginTop: '2px' }}>{formatTimeDhaka(s.createdAt)}</div>
                      </td>
                      <td className="table-cell" style={{ padding: '0.85rem 1.25rem' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                          <Truck size={14} style={{ color: 'var(--text-muted)' }} />
                          {s.van?.vanName ?? s.vanId}
                        </span>
                      </td>
                      <td className="table-cell tabular-nums" style={{ padding: '0.85rem 1.25rem' }}>{formatInt(s.items?.length ?? 0)}</td>
                      <td className="table-cell tabular-nums" style={{ padding: '0.85rem 1.25rem', textAlign: 'right', fontWeight: 900, color: 'var(--primary)' }}>{formatBDT(s.total)}</td>
                      <td className="table-cell" style={{ padding: '0.85rem 1.25rem' }}>
                        {s.invoiceId ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 800, fontSize: '12px' }}>{s.invoiceId}</span>
                            <StatusBadge status={invStatus ?? 'unpaid'} size="xs" />
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', opacity: 0.5, fontWeight: 700 }}>N/A</span>
                        )}
                      </td>
                      <td className="table-cell" style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          <RowBtn label="View details" onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/sales/${s.id}`); }}>
                            <Eye size={13} />
                          </RowBtn>
                          <RowBtn
                            label={voidBlocked ? 'Invoice already paid — cannot void' : 'Void sale'}
                            danger
                            disabled={voidBlocked}
                            onClick={(e) => { e.stopPropagation(); setConfirmId(s.id); }}
                          >
                            <X size={13} />
                          </RowBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!isLoading && !isError && total > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.85rem 1.25rem', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)' }}>
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {formatInt(total)} sales
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <PageBtn disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft size={14} /></PageBtn>
                <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 900 }}>{page} / {pageCount}</span>
                <PageBtn disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}><ChevronRight size={14} /></PageBtn>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Void confirmation */}
      {confirmId && (
        <div className="sheet-overlay" onClick={() => !voidSale.isPending && setConfirmId(null)}>
          <div
            className="sheet-content animate-fade-in"
            style={{ maxWidth: '440px', height: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-soft)', background: 'rgba(239,68,68,0.05)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '8px', background: 'rgba(239,68,68,0.1)', borderRadius: '10px', color: '#ef4444', display: 'flex' }}>
                <X size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-main)' }}>Void Sale</h3>
                <p style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.18em', opacity: 0.6 }}>{confirmId}</p>
              </div>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600, lineHeight: 1.6 }}>
                Stock will return to the van and the linked invoice will be cancelled.
                Voiding is blocked if the invoice has already been marked paid.
              </p>
              {voidSale.isError && (
                <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: '12px', fontWeight: 700 }}>
                  {(voidSale.error as Error)?.message ?? 'Void failed'}
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={() => setConfirmId(null)} disabled={voidSale.isPending} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button onClick={onConfirmVoid} disabled={voidSale.isPending} className="btn-danger" style={{ flex: 1 }}>
                  {voidSale.isPending ? 'Voiding…' : 'Void Sale'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

function RowBtn({ children, label, danger, disabled, onClick }: {
  children: React.ReactNode;
  label: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '28px',
        height: '28px',
        borderRadius: '8px',
        border: `1px solid ${danger ? 'rgba(239,68,68,0.2)' : 'var(--border)'}`,
        background: danger ? 'rgba(239,68,68,0.08)' : 'var(--overlay-medium)',
        color: danger ? '#ef4444' : 'var(--text-muted)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  );
}

function PageBtn({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className="pagin-btn"
      disabled={disabled}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '30px',
        height: '30px',
        borderRadius: '9px',
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        color: 'var(--text-muted)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        transition: 'all 0.15s ease',
      }}
    >
      {children}
    </button>
  );
}
