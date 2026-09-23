import React from 'react';
import type { CompanyInfo } from '@/lib/company';
import { formatDateDhaka } from '@/lib/format';

export interface OrderSlipData {
  id: string;
  date: string;
  status: 'issued' | 'confirmed' | 'cancelled';
  customer: { name: string; phone?: string | null; address?: string | null };
  items: { name: string; unit?: string; requestedQty: number }[];
}

interface OrderSlipDocumentProps {
  order: OrderSlipData;
  company: CompanyInfo;
}

const qtyFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

function formatQty(value: number): string {
  return qtyFormat.format(Number.isFinite(value) ? value : 0);
}

function displayDate(iso: string | null | undefined): string {
  return iso ? formatDateDhaka(iso) : '-';
}

const STATUS_LABEL: Record<OrderSlipData['status'], string> = {
  issued: 'PENDING CONFIRMATION',
  confirmed: 'CONFIRMED',
  cancelled: 'CANCELLED',
};

// Pre-confirmation delivery record — deliberately not styled/labelled as a tax
// invoice (no VAT/BIN/TIN, no pricing) since no real Invoice exists until the
// order is confirmed. Reuses the .invoice-* print CSS classes for consistent
// A4 layout, but the content is order-slip specific.
export function OrderSlipDocument({ order, company }: OrderSlipDocumentProps) {
  const totalQty = order.items.reduce((sum, item) => sum + item.requestedQty, 0);
  const statusLabel = STATUS_LABEL[order.status];

  return (
    <article className="invoice-document" aria-label={`Order slip ${order.id}`}>
      <header className="invoice-letterhead">
        <div>
          <p className="invoice-company-name">{company.name}</p>
          {company.tagline && <p className="invoice-company-tagline">{company.tagline}</p>}
          <div className="invoice-company-lines">
            {company.addressLines.map((line) => <p key={line}>{line}</p>)}
            <p>Phone: {company.phone} · Email: {company.email}</p>
          </div>
        </div>

        <div className="invoice-title-block">
          <h1>Order Slip</h1>
          <p className="invoice-subtitle">Delivery record — not a tax invoice</p>
          <dl>
            <div><dt>Order No</dt><dd>{order.id}</dd></div>
            <div><dt>Order Date</dt><dd>{displayDate(order.date)}</dd></div>
          </dl>
          <span className={`invoice-status-stamp invoice-status-${order.status === 'cancelled' ? 'cancelled' : 'unpaid'}`}>
            {statusLabel}
          </span>
        </div>
      </header>

      <section className="invoice-parties" aria-label="Order parties">
        <div>
          <h2>Deliver To</h2>
          <p className="invoice-party-name">{order.customer.name}</p>
          {[order.customer.phone, order.customer.address].filter(Boolean).join(' · ') && (
            <p>{[order.customer.phone, order.customer.address].filter(Boolean).join(' · ')}</p>
          )}
        </div>
        <div>
          <h2>Order Information</h2>
          <dl>
            <div><dt>Nature</dt><dd>Produce distribution request</dd></div>
            <div><dt>Stock Status</dt><dd>No stock moved yet</dd></div>
            <div><dt>Status</dt><dd>{statusLabel}</dd></div>
          </dl>
        </div>
      </section>

      <table className="invoice-items">
        <thead>
          <tr>
            <th className="invoice-col-sl">SL</th>
            <th>Description</th>
            <th>Unit</th>
            <th className="invoice-num">Requested Qty</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, index) => (
            <tr key={`${item.name}-${index}`}>
              <td className="invoice-col-sl">{index + 1}</td>
              <td>{item.name}</td>
              <td>{item.unit ?? '-'}</td>
              <td className="invoice-num">{formatQty(item.requestedQty)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="invoice-settlement" aria-label="Order totals">
        <div className="invoice-words">
          <h2>Note</h2>
          <p style={{ textTransform: 'none' }}>
            Quantities above are the customer&apos;s request only. No stock has been allocated and no amount is
            payable until this order is confirmed in the system.
          </p>
        </div>
        <div className="invoice-totals">
          <div><span>Line Items</span><strong>{order.items.length}</strong></div>
          <div className="invoice-grand-total"><span>Total Requested Qty</span><strong>{formatQty(totalQty)}</strong></div>
        </div>
      </section>

      <section className="invoice-signatures" aria-label="Signatures">
        <div><span />Prepared By</div>
        <div><span />Received By (Customer)</div>
        <div><span />Authorized Signature</div>
      </section>

      <footer className="invoice-footer">
        <p>Computer-generated order slip · not a tax invoice · no financial commitment implied.</p>
        <p>
          Generated:{' '}
          <span suppressHydrationWarning>{new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Dhaka',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }).format(new Date())}</span>
        </p>
      </footer>
    </article>
  );
}
