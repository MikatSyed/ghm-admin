'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, Printer, Truck, X } from 'lucide-react';
import MainLayout from '@/components/MainLayout';
import { StatTile } from '@/components/ui/StatTile';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { InvoiceDocument, type InvoiceData } from '@/components/invoices/InvoiceDocument';
import PrintPortal from '@/components/PrintPortal';
import { api } from '@/lib/api';
import { companyInfo } from '@/lib/company';
import { formatBDT, formatDateDhaka } from '@/lib/format';
import { useSale, useVoidSale } from '@/hooks/api';
import type { SaleDetail } from '@/lib/types';

type SaleWithOptionalFinancials = SaleDetail & {
  cogs?: number | null;
  profit?: number | null;
  status?: string | null;
};

function invoiceFromSale(sale: SaleWithOptionalFinancials): InvoiceData {
  // Invoice line items are a billing snapshot (name/price/subtotal) and don't
  // carry unit; sale items carry the product relation with unit. Look units
  // up from the sale by productId so the printed invoice always shows kg/pcs.
  const unitByProduct = new Map((sale.items ?? []).map((item) => [item.productId, item.product?.unit]));

  return {
    id: sale.invoice?.id ?? sale.invoiceId ?? `SALE-${sale.id}`,
    saleId: sale.id,
    date: sale.invoice?.date ?? sale.date,
    status: sale.invoice?.status ?? 'unpaid',
    paidAt: sale.invoice?.paidAt ?? null,
    van: sale.van ? { vanName: sale.van.vanName, driver: sale.van.driver } : sale.vanId ? { vanName: sale.vanId } : null,
    customer: sale.invoice?.customer ?? (sale.customer ? { name: sale.customer.name } : null),
    items: (sale.invoice?.items?.length ? sale.invoice.items : sale.items ?? []).map((item) => {
      const name = 'name' in item ? item.name : item.product?.name ?? item.productId;
      const unit = ('product' in item ? item.product?.unit : undefined) ?? unitByProduct.get(item.productId);
      const subtotal = 'subtotal' in item ? item.subtotal : item.qty * item.price;
      return {
        name,
        unit,
        qty: item.qty,
        price: item.price,
        subtotal,
      };
    }),
    total: sale.invoice?.total ?? sale.total,
  };
}

export default function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();
  const { data, isLoading, isError, error } = useSale(id);
  const sale = data as SaleWithOptionalFinancials | undefined;
  const voidSale = useVoidSale();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [downloadError, setDownloadError] = React.useState<string | null>(null);

  const status = sale?.status ?? sale?.invoice?.status ?? sale?.invoice?.status ?? 'unpaid';
  const isPaid = sale?.invoice?.status === 'paid';

  function printReceipt() {
    document.body.classList.add('printing-receipt');
    window.addEventListener('afterprint', () => document.body.classList.remove('printing-receipt'), { once: true });
    window.print();
  }

  async function downloadPdf() {
    if (!sale?.invoiceId) return;
    setDownloadError(null);
    try {
      await api.download(`/invoices/${sale.invoiceId}/pdf`, undefined, `invoice-${sale.id}.pdf`);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'PDF download failed');
    }
  }

  async function confirmVoid() {
    if (!sale) return;
    try {
      await voidSale.mutateAsync(sale.id);
      router.push('/dashboard/sales');
    } catch {
      setConfirmOpen(true);
    }
  }

  return (
    <MainLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '4rem' }}>
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
          <Link href="/dashboard/sales" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            <ArrowLeft size={15} /> Ledger
          </Link>
        </div>

        {isLoading && <DetailSkeleton />}

        {!isLoading && (isError || !sale) && (
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-main)' }}>Sale not found</h1>
            <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontWeight: 700 }}>
              {(error as Error)?.message ?? 'This sale could not be loaded.'}
            </p>
            <Link href="/dashboard/sales" className="btn-primary" style={{ display: 'inline-flex', marginTop: '1.25rem', textDecoration: 'none' }}>
              Back to ledger
            </Link>
          </div>
        )}

        {!isLoading && sale && (
          <>
            <PrintPortal>
              <InvoiceDocument invoice={invoiceFromSale(sale)} company={companyInfo} />
            </PrintPortal>

            <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '1rem', alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}>
                <div className="card" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start' }}>
                  <div>
                    <h1 style={{ fontSize: '30px', fontWeight: 900, fontStyle: 'italic', color: 'var(--text-main)', lineHeight: 1 }}>
                      Sale #{sale.id}
                    </h1>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                      <StatusBadge status={status} />
                      <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)' }}>{formatDateDhaka(sale.date)}</span>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)' }}>{sale.van?.vanName ?? sale.vanId}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  <StatTile label="Total" value={formatBDT(sale.total, 'full')} accent="primary" />
                  {sale.cogs != null && <StatTile label="COGS" value={formatBDT(sale.cogs, 'full')} accent="warning" />}
                  {sale.profit != null && <StatTile label="Profit" value={formatBDT(sale.profit, 'full')} accent={sale.profit >= 0 ? 'success' : 'danger'} />}
                </div>

                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['Product', 'Qty', 'Rate', 'Subtotal'].map((h) => <th key={h} className="table-header">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {(sale.items ?? []).map((item) => (
                        <tr key={item.id ?? item.productId} className="table-row">
                          <td className="table-cell" style={{ fontWeight: 900 }}>{item.product?.name ?? item.productId}</td>
                          <td className="table-cell">{item.qty} {item.product?.unit ?? ''}</td>
                          <td className="table-cell tabular-nums">{formatBDT(item.price, 'full')}</td>
                          <td className="table-cell tabular-nums" style={{ fontWeight: 900, color: 'var(--primary)' }}>{formatBDT(item.qty * item.price, 'full')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <aside style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <Truck size={18} color="var(--primary)" />
                    <h2 style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em' }}>Van</h2>
                  </div>
                  <p style={{ fontSize: '18px', fontWeight: 900 }}>{sale.van?.vanName ?? sale.vanId}</p>
                  {sale.van?.driver && <p style={{ marginTop: '0.35rem', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700 }}>{sale.van.driver}</p>}
                </div>

                <div className="card">
                  <h2 style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: '1rem' }}>Invoice</h2>
                  <p style={{ fontSize: '16px', fontWeight: 900 }}>{sale.invoiceId ?? 'N/A'}</p>
                  {sale.invoice && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.85rem', alignItems: 'flex-start' }}>
                      <StatusBadge status={sale.invoice.status} size="xs" />
                      {sale.invoice.status === 'paid' && sale.invoice.paidAt && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700 }}>Paid {sale.invoice.paidAt}</span>
                      )}
                    </div>
                  )}
                </div>
              </aside>
            </div>

            <div className="card no-print" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button type="button" className="btn-secondary" onClick={printReceipt} style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                <Printer size={15} /> Print Receipt
              </button>
              {sale.invoiceId && (
                <button type="button" className="btn-secondary" onClick={downloadPdf} style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                  <Download size={15} /> Download PDF
                </button>
              )}
              <button type="button" className="btn-danger" disabled={isPaid} onClick={() => setConfirmOpen(true)} style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center', opacity: isPaid ? 0.45 : 1, cursor: isPaid ? 'not-allowed' : 'pointer' }}>
                <X size={15} /> Void
              </button>
              {downloadError && <span style={{ color: '#ef4444', fontSize: '12px', fontWeight: 800 }}>{downloadError}</span>}
            </div>
          </>
        )}
      </div>

      {confirmOpen && sale && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }} onClick={() => !voidSale.isPending && setConfirmOpen(false)}>
          <div className="card" style={{ maxWidth: '420px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '0.5rem' }}>Void this sale?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 700, marginBottom: '1rem' }}>
              {sale.id} will be voided. Stock will return to the van. This is blocked if the invoice has been marked paid.
            </p>
            {voidSale.isError && (
              <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '10px', padding: '0.75rem', fontSize: '13px', fontWeight: 800, marginBottom: '1rem' }}>
                {(voidSale.error as Error)?.message ?? 'Void failed'}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" disabled={voidSale.isPending} onClick={() => setConfirmOpen(false)}>Cancel</button>
              <button className="btn-danger" disabled={voidSale.isPending || isPaid} onClick={confirmVoid}>{voidSale.isPending ? 'Voiding...' : 'Void Sale'}</button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

function DetailSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="card"><div className="skeleton skeleton-line" style={{ width: '40%', height: '30px' }} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {[0, 1, 2].map((i) => <StatTile key={i} label="Loading" value="" loading />)}
      </div>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton skeleton-line" />)}
      </div>
    </div>
  );
}
