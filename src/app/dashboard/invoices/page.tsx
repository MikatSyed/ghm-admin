'use client';

import React, { useEffect, useRef, useState } from 'react';
import MainLayout from '@/components/MainLayout';
import { useInvoices, useInvoice, useDownloadInvoicePdf, useExportInvoices } from '@/hooks/api';
import type { InvoiceDetail, InvoiceStatus } from '@/lib/types';
import { companyInfo } from '@/lib/company';
import { InvoiceDocument, type InvoiceData } from '@/components/invoices/InvoiceDocument';
import PrintPortal from '@/components/PrintPortal';
import {
  FileText,
  Search,
  SlidersHorizontal,
  Printer,
  Download,
  Eye,
  X,
  Receipt,
  CheckCircle2,
  Clock,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Truck,
  BadgeDollarSign,
  Loader2,
} from 'lucide-react';

/* ─── Status Badge ─── */
function StatusBadge({ status }: { status: InvoiceStatus }) {
  const paid = status === 'paid';
  const color = paid ? '#10b981' : '#f59e0b';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '4px 10px', borderRadius: '8px',
      fontSize: '9px', fontWeight: 900,
      textTransform: 'uppercase', letterSpacing: '0.12em',
      background: `${color}1a`,
      color,
      border: `1px solid ${color}40`,
    }}>
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'currentColor', boxShadow: '0 0 6px currentColor' }} />
      {status}
    </span>
  );
}

/* ─── Action Icon Button ─── */
function ActionBtn({ icon, title, onClick, disabled }: { icon: React.ReactNode; title: string; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="icon-btn"
      style={{
        width: '32px', height: '32px', borderRadius: '8px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--overlay-soft)',
        border: '1px solid var(--overlay-medium)',
        color: 'var(--text-muted)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'all 0.2s',
      }}
    >
      {icon}
    </button>
  );
}

function invoiceDataFromDetail(invoice: InvoiceDetail): InvoiceData {
  return {
    id: invoice.id,
    date: invoice.date,
    status: invoice.status,
    paidAt: invoice.paidAt ?? null,
    van: invoice.van ? { vanName: invoice.van.vanName, driver: invoice.van.driver } : null,
    customer: invoice.customer ? { name: invoice.customer.name, phone: invoice.customer.phone, address: invoice.customer.address } : null,
    items: invoice.items.map(item => ({ name: item.name, qty: item.qty, price: item.price, subtotal: item.subtotal })),
    total: invoice.total,
  };
}

/* ─── Print host — mirrors the Distribution Order slip's print mechanism ── */
function PrintInvoiceHost({ invoiceId, onDone }: { invoiceId: string; onDone: () => void }) {
  const { data: invoice } = useInvoice(invoiceId);
  const printedRef = useRef(false);

  useEffect(() => {
    if (!invoice || printedRef.current) return;
    printedRef.current = true;
    document.body.classList.add('printing-receipt');
    const handleAfterPrint = () => {
      document.body.classList.remove('printing-receipt');
      onDone();
    };
    window.addEventListener('afterprint', handleAfterPrint, { once: true });
    const t = setTimeout(() => window.print(), 50);
    return () => clearTimeout(t);
  }, [invoice, onDone]);

  if (!invoice) return null;

  return (
    <PrintPortal>
      <InvoiceDocument invoice={invoiceDataFromDetail(invoice)} company={companyInfo} />
    </PrintPortal>
  );
}

const PAGE_SIZE = 10;

/* ─── Page ─── */
export default function InvoicesPage() {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | InvoiceStatus>('all');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);

  const listQ = useInvoices({ q: query || undefined, status: statusFilter, page, pageSize: PAGE_SIZE, sort: '-date' });
  const exportMutation = useExportInvoices();
  const downloadMutation = useDownloadInvoicePdf();

  const rows = listQ.data?.data ?? [];
  const total = listQ.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Stats reflect the current page only — this list is server-paginated, so
  // summing every invoice ever issued would need a separate aggregate endpoint.
  const pagePaid = rows.filter(i => i.status === 'paid');
  const pageUnpaid = rows.filter(i => i.status === 'unpaid');
  const pageTotal = rows.reduce((s, i) => s + i.total, 0);
  const paidTotal = pagePaid.reduce((s, i) => s + i.total, 0);
  const unpaidTotal = pageUnpaid.reduce((s, i) => s + i.total, 0);
  const avgTotal = rows.length ? Math.round(pageTotal / rows.length) : 0;

  const resetFilters = () => { setQuery(''); setStatusFilter('all'); setPage(1); };

  return (
    <MainLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }} className="animate-fade-in">

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '14px', background: 'rgba(16,185,129,0.1)', borderRadius: '18px', color: 'var(--primary)', border: '1px solid rgba(16,185,129,0.2)', boxShadow: '0 0 24px rgba(16,185,129,0.08)' }}>
              <FileText size={26} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-main)', textTransform: 'uppercase', fontStyle: 'italic' }}>
                Invoice<span style={{ color: 'var(--primary)' }}>.History</span>
              </h1>
              <p style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3em', opacity: 0.55, marginTop: '3px' }}>
                Invoice Management · Manage and track invoices
              </p>
            </div>
          </div>
          <button
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            disabled={exportMutation.isPending}
            onClick={() => exportMutation.mutate({ q: query || undefined, status: statusFilter })}
          >
            {exportMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Export CSV
          </button>
        </div>

        {/* ── KPI Row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1.25rem' }}>
          {[
            { label: 'Total (this page)', amount: pageTotal, icon: <Receipt size={20} />, color: 'var(--primary)', sub: `${rows.length} records loaded`, pct: 100 },
            { label: 'Paid (this page)',  amount: paidTotal, icon: <CheckCircle2 size={20} />, color: '#10b981', sub: `${pagePaid.length} paid invoices`, pct: pageTotal ? Math.round(paidTotal / pageTotal * 100) : 0 },
            { label: 'Unpaid (this page)', amount: unpaidTotal, icon: <Clock size={20} />, color: '#f59e0b', sub: `${pageUnpaid.length} awaiting payment`, pct: pageTotal ? Math.round(unpaidTotal / pageTotal * 100) : 0 },
            { label: 'Avg. Value (this page)', amount: avgTotal, icon: <TrendingUp size={20} />, color: '#3b82f6', sub: 'Average value per invoice', pct: 100 },
          ].map(k => (
            <div key={k.label} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-24px', right: '-24px', width: '100px', height: '100px', borderRadius: '50%', background: k.color, filter: 'blur(50px)', opacity: 0.08, pointerEvents: 'none' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', position: 'relative', zIndex: 1 }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${k.color}18`, color: k.color, border: `1px solid ${k.color}30` }}>
                  {k.icon}
                </div>
                <span style={{ fontSize: '10px', fontWeight: 900, color: k.color, fontVariantNumeric: 'tabular-nums', opacity: 0.8 }}>{k.pct}%</span>
              </div>
              <p style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-muted)', opacity: 0.6, marginBottom: '6px', position: 'relative', zIndex: 1 }}>{k.label}</p>
              <p style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-main)', fontStyle: 'italic', letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums', lineHeight: 1, position: 'relative', zIndex: 1 }}>৳{k.amount.toLocaleString()}</p>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px', fontWeight: 700, opacity: 0.4, fontStyle: 'italic', position: 'relative', zIndex: 1 }}>{k.sub}</p>
              <div style={{ height: '3px', width: '100%', background: 'var(--overlay-soft)', borderRadius: '99px', overflow: 'hidden', marginTop: '1rem', position: 'relative', zIndex: 1 }}>
                <div style={{ height: '100%', width: `${k.pct}%`, background: k.color, borderRadius: '99px', boxShadow: `0 0 8px ${k.color}` }} />
              </div>
            </div>
          ))}
        </div>

        {/* ── Search & Filter ── */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }} className="search-group">
            <div style={{ position: 'absolute', inset: 0, background: 'var(--primary)', filter: 'blur(16px)', opacity: 0, borderRadius: '14px', transition: 'opacity 0.3s', pointerEvents: 'none' }} className="search-glow" />
            <Search size={14} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none', zIndex: 1 }} className="search-icon" />
            <input
              value={query}
              onChange={e => { setQuery(e.target.value); setPage(1); }}
              type="text"
              placeholder="Search by invoice # or customer/van..."
              className="input-premium"
              style={{ width: '100%', paddingLeft: '44px' }}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value as 'all' | InvoiceStatus); setPage(1); }}
              style={{
                appearance: 'none',
                padding: '0.625rem 2.25rem 0.625rem 1rem',
                borderRadius: '12px', fontSize: '11px', fontWeight: 900,
                textTransform: 'uppercase', letterSpacing: '0.1em',
                background: 'var(--surface)',
                border: `1px solid ${statusFilter !== 'all' ? 'rgba(16,185,129,0.3)' : 'var(--overlay-medium)'}`,
                color: statusFilter !== 'all' ? 'var(--primary)' : 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
            <SlidersHorizontal size={12} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)', opacity: 0.5 }} />
          </div>

          {(query || statusFilter !== 'all') && (
            <button
              onClick={resetFilters}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.625rem 1rem', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '12px' }}
              className="clear-filter-btn"
            >
              <X size={12} /> Reset
            </button>
          )}
          <div style={{ flex: 1 }} />
          <p style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)', opacity: 0.5 }}>
            {total} record{total !== 1 ? 's' : ''}
          </p>
        </div>

        {/* ── Table ── */}
        <div className="table-container" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Invoice #', 'Date', 'Customer / Van', 'Items', 'Amount', 'Status', 'Actions'].map(h => (
                    <th key={h} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {listQ.isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="table-row">
                      {Array.from({ length: 7 }).map((__, j) => (
                        <td key={j} className="table-cell"><span className="skeleton skeleton-line" style={{ width: '70%' }} /></td>
                      ))}
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '5rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', opacity: 0.35 }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'var(--overlay-soft)', border: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FileText size={24} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
                        </div>
                        <p style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', color: 'var(--text-main)' }}>No invoices found</p>
                      </div>
                    </td>
                  </tr>
                ) : rows.map(inv => (
                  <tr key={inv.id} className="table-row">
                    <td className="table-cell">
                      <span style={{ fontWeight: 900, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '-0.02em', color: 'var(--text-main)' }}>{inv.id}</span>
                    </td>
                    <td className="table-cell">
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{inv.date.slice(0, 10)}</span>
                    </td>
                    <td className="table-cell">
                      <span style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-main)' }}>{inv.customer ?? inv.van ?? '-'}</span>
                    </td>
                    <td className="table-cell">
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{inv.items} items</span>
                    </td>
                    <td className="table-cell">
                      <span style={{ fontSize: '14px', fontWeight: 900, color: 'var(--primary)', fontVariantNumeric: 'tabular-nums', fontStyle: 'italic' }}>
                        ৳{inv.total.toLocaleString()}
                      </span>
                    </td>
                    <td className="table-cell"><StatusBadge status={inv.status} /></td>
                    <td className="table-cell">
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <ActionBtn icon={<Eye size={13} />} title="View" onClick={() => setSelectedId(inv.id)} />
                        <ActionBtn icon={<Printer size={13} />} title="Print" onClick={() => setPrintingId(inv.id)} />
                        <ActionBtn
                          icon={downloadMutation.isPending && downloadMutation.variables === inv.id ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                          title="Download PDF"
                          disabled={downloadMutation.isPending}
                          onClick={() => downloadMutation.mutate(inv.id)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedId && (
            <InvoiceDetailModal
              invoiceId={selectedId}
              onClose={() => setSelectedId(null)}
              onPrint={() => setPrintingId(selectedId)}
              onDownload={() => downloadMutation.mutate(selectedId)}
              downloading={downloadMutation.isPending && downloadMutation.variables === selectedId}
            />
          )}

          {printingId && <PrintInvoiceHost invoiceId={printingId} onDone={() => setPrintingId(null)} />}

          {/* Table Footer / Pagination */}
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--overlay-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(10,10,10,0.3)', flexWrap: 'wrap', gap: '0.75rem' }}>
            <p style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>
              Showing <span style={{ color: 'var(--primary)' }}>{rows.length}</span> of <span style={{ color: 'var(--text-main)' }}>{total}</span> invoices
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="pagin-btn"
                style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--overlay-soft)',
                  border: '1px solid var(--overlay-medium)',
                  color: 'var(--text-muted)',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  opacity: page === 1 ? 0.3 : 1,
                  transition: 'all 0.2s',
                }}
              >
                <ChevronLeft size={14} />
              </button>

              <span style={{ fontSize: '11px', fontWeight: 900, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', padding: '0 8px' }}>
                Page {page} of {totalPages}
              </span>

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="pagin-btn"
                style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--overlay-soft)',
                  border: '1px solid var(--overlay-medium)',
                  color: 'var(--text-muted)',
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                  opacity: page === totalPages ? 0.3 : 1,
                  transition: 'all 0.2s',
                }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

      </div>
    </MainLayout>
  );
}

/* ─── Invoice Detail Modal (Full-Screen Side Sheet) ─── */
function InvoiceDetailModal({
  invoiceId,
  onClose,
  onPrint,
  onDownload,
  downloading,
}: {
  invoiceId: string;
  onClose: () => void;
  onPrint: () => void;
  onDownload: () => void;
  downloading: boolean;
}) {
  const { data: invoice, isLoading } = useInvoice(invoiceId);
  const partyName = invoice?.customer?.name ?? invoice?.van?.vanName ?? '-';

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet-content animate-fade-in custom-scrollbar" style={{ maxWidth: '900px', padding: 0 }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '1.5rem 2.5rem',
          borderBottom: '1px solid var(--overlay-medium)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--surface)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backdropFilter: 'blur(20px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '12px', background: 'rgba(16,185,129,0.1)', borderRadius: '16px', color: 'var(--primary)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <Receipt size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', color: 'var(--text-main)' }}>
                {invoiceId} <span style={{ color: 'var(--primary)', fontStyle: 'normal' }}>· Overview</span>
              </h2>
              <p style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.6 }}>
                {invoice ? `Generated on ${invoice.date.slice(0, 10)}` : 'Loading…'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn-secondary" style={{ height: '42px', padding: '0 15px' }} onClick={onPrint} disabled={!invoice}>
              <Printer size={14} /> Print
            </button>
            <button onClick={onClose} style={{ padding: '8px', borderRadius: '12px', background: 'var(--overlay-soft)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {isLoading || !invoice ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 800 }}>Loading invoice…</div>
        ) : (
          <div style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* Main Info Strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
              {[
                { label: 'Current Status', value: invoice.status.toUpperCase(), icon: <CheckCircle2 size={16} />, color: invoice.status === 'paid' ? '#10b981' : '#f59e0b' },
                { label: invoice.customer ? 'Customer' : 'Assigned Van', value: partyName, icon: <Truck size={16} />, color: 'var(--primary)' },
                { label: 'Total Amount', value: `৳${invoice.total.toLocaleString()}`, icon: <BadgeDollarSign size={16} />, color: 'var(--text-main)' },
              ].map(k => (
                <div key={k.label} className="card" style={{ padding: '1.25rem', borderLeft: `4px solid ${k.color}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <div style={{ color: k.color, opacity: 0.6 }}>{k.icon}</div>
                    <span style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-muted)' }}>{k.label}</span>
                  </div>
                  <p style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-main)', fontStyle: 'italic' }}>{k.value}</p>
                </div>
              ))}
            </div>

            {/* Item Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--overlay-soft)' }}>
                <h3 style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-main)' }}>Itemized Breakdown</h3>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Product', 'Qty', 'Unit Price', 'Subtotal'].map(h => (
                      <th key={h} className="table-header" style={{ background: 'transparent' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map(item => (
                    <tr key={item.id} className="table-row">
                      <td className="table-cell"><span style={{ fontWeight: 800 }}>{item.name}</span></td>
                      <td className="table-cell"><span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>{item.qty.toLocaleString()}</span></td>
                      <td className="table-cell"><span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>৳{item.price.toLocaleString()}</span></td>
                      <td className="table-cell"><span style={{ fontWeight: 900, color: 'var(--primary)' }}>৳{item.subtotal.toLocaleString()}</span></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} style={{ padding: '1.25rem', textAlign: 'right', fontWeight: 900, fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Total Amount</td>
                    <td style={{ padding: '1.25rem', fontWeight: 950, fontSize: '18px', color: 'var(--text-main)', fontStyle: 'italic' }}>৳{invoice.total.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ padding: '1.5rem 2.5rem', borderTop: '1px solid var(--overlay-medium)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', background: 'rgba(0,0,0,0.2)' }}>
          <button onClick={onClose} className="btn-secondary" style={{ padding: '0 2rem', height: '48px' }}>Close Preview</button>
          <button className="btn-primary" style={{ padding: '0 2.5rem', height: '48px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={onDownload} disabled={downloading || !invoice}>
            {downloading && <Loader2 size={14} className="animate-spin" />} Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
