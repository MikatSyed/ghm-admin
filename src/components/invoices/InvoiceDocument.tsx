import React from 'react';
import type { CompanyInfo } from '@/lib/company';
import { formatDateDhaka } from '@/lib/format';

export interface InvoiceData {
  id: string;
  saleId?: string;
  date: string;
  status: 'paid' | 'unpaid' | 'cancelled';
  paidAt?: string | null;
  van?: { vanName: string | null | undefined; driver?: string } | null;
  customer?: { name: string; phone?: string | null; address?: string | null } | null;
  items: { name: string; unit?: string; qty: number; price: number; subtotal: number }[];
  total: number;
}

interface InvoiceDocumentProps {
  invoice: InvoiceData;
  company: CompanyInfo;
}

const money = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatMoney(value: number): string {
  return `৳${money.format(Math.round((Number.isFinite(value) ? value : 0) * 100) / 100)}`;
}

function formatQty(value: number): string {
  return money.format(Number.isFinite(value) ? value : 0);
}

function displayDate(iso: string | null | undefined): string {
  return iso ? formatDateDhaka(iso) : '-';
}

// Layout modelled on a classic minimal tax-invoice template: no boxes/borders
// anywhere, a big brand name + right-aligned address block, a plain
// label/value meta list, and an underlined items table with a ruled totals
// block. Deliberately distinct from OrderSlipDocument's boxed pre-confirmation
// layout — this is the real, post-confirmation Invoice.
export function InvoiceDocument({ invoice, company }: InvoiceDocumentProps) {
  const subtotal = invoice.items.reduce((sum, item) => sum + (Number.isFinite(item.subtotal) ? item.subtotal : item.qty * item.price), 0);
  // Trust the backend's total as the amount actually payable — never
  // recompute it, so the printed/downloaded invoice always matches what
  // the app shows elsewhere for this same record. The VAT line (when
  // applicable) is derived as the reconciling difference so it never
  // implies a total other than payableTotal.
  const payableTotal = Number.isFinite(invoice.total) ? Math.round(invoice.total) : Math.round(subtotal);
  const vatAmount = company.vatRatePercent > 0 ? payableTotal - subtotal : 0;
  const statusLabel = invoice.status.toUpperCase();
  const billedToName = invoice.customer?.name ?? invoice.van?.vanName ?? '-';
  const billedToLines = invoice.customer
    ? [invoice.customer.phone, invoice.customer.address].filter(Boolean)
    : invoice.van?.driver
      ? [`Driver: ${invoice.van.driver}`]
      : [];

  return (
    <article className="invoice-document" aria-label={`Tax invoice ${invoice.id}`}>
      <header className="tx-header">
        <div className="tx-company-name">{company.name}</div>
        <div className="tx-company-address">
          {company.addressLines.map((line) => <p key={line}>{line}</p>)}
          <p className="tx-company-contact">Phone {company.phone}</p>
          <p className="tx-company-contact">{company.email}</p>
        </div>
      </header>

      <h1 className="tx-title">Tax Invoice</h1>

      <section className="tx-meta" aria-label="Invoice parties and metadata">
        <div className="tx-billto">
          <p className="tx-billto-name">{billedToName}</p>
          {billedToLines.map((line) => <p key={line}>{line}</p>)}
        </div>
        <dl className="tx-fields">
          <div><dt>Date</dt><dd>{displayDate(invoice.date)}</dd></div>
          <div><dt>Invoice Number</dt><dd>{invoice.id}</dd></div>
          {invoice.saleId && <div><dt>Sale Ref</dt><dd>{invoice.saleId}</dd></div>}
          <div><dt>Status</dt><dd>{statusLabel}</dd></div>
          {invoice.paidAt && <div><dt>Paid Date</dt><dd>{displayDate(invoice.paidAt)}</dd></div>}
        </dl>
      </section>

      <table className="tx-items">
        <thead>
          <tr>
            <th>Description</th>
            <th className="tx-num">Quantity</th>
            <th className="tx-num">Unit Price</th>
            <th className="tx-num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, index) => {
            const amount = Number.isFinite(item.subtotal) ? item.subtotal : item.qty * item.price;
            return (
              <tr key={`${item.name}-${index}`}>
                <td>{item.name}</td>
                <td className="tx-num">{formatQty(item.qty)}</td>
                <td className="tx-num">{formatMoney(item.price)}</td>
                <td className="tx-num">{formatMoney(amount)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <section className="tx-totals" aria-label="Invoice totals">
        <div><span>Subtotal</span><strong>{formatMoney(subtotal)}</strong></div>
        {company.vatRatePercent > 0 && (
          <div><span>VAT ({company.vatRatePercent}%)</span><strong>{formatMoney(vatAmount)}</strong></div>
        )}
        <div className="tx-grand"><span>Total</span><strong>{formatMoney(payableTotal)}</strong></div>
      </section>

      <footer className="tx-footer">
        <p>{company.footerNote}</p>
        {invoice.status !== 'paid' && <p className="tx-due">Due on receipt</p>}
      </footer>
    </article>
  );
}
