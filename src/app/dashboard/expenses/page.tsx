'use client';

import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import {
  Wallet,
  Plus,
  Truck,
  Users,
  X,
  ShoppingCart,
  Calculator,
  CheckCircle2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Loader2,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  useCreateExpense,
  useDeleteExpense,
  useDownloadPurchaseVoucher,
  useExpenses,
  useExportExpenses,
  useMe,
  useProducts,
  useUpdateExpense,
  type ExpenseInput,
} from '@/hooks/api';
import type { Expense, ExpenseCategory, ExpenseStatus, Product } from '@/lib/types';

/* ─── Interfaces ─── */
interface BankAccount { id: string; bankName: string; accountNumber: string; balance: number; }
interface PurchaseLine {
  id: string;
  productId: string;
  product: { name: string; unit: string };
  quantity: number;
  basePrice: number;
  transportCost: number;
  labourCost: number;
  otherCost: number;
  effectiveBuyPrice: number;
  sellPrice: number;
  profitPercent?: number;
  condition?: StockCondition;
}
interface Purchase {
  id: string;
  date: string;
  source: string;
  total: number;
  lines: PurchaseLine[];
  bankAccount?: { bankName: string; accountNumber: string };
}
type PurchaseListResponse = { data?: Purchase[] };
type StockCondition = 'FRESH' | 'AGING' | 'DAMAGED' | 'CUSTOM';

type PurchaseLineInput = {
  productId: string;
  quantity: number;
  basePrice: number;
  transportCost?: number;
  labourCost?: number;
  otherCost?: number;
  sellPrice?: number;
  profitPercent?: number;
  condition?: StockCondition;
};
type PurchaseCreateInput = {
  date: string;
  source: string;
  notes?: string;
  bankAccountId?: string;
  lines: PurchaseLineInput[];
};
type Tab = 'general' | 'purchases';

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Hosting',
  'Domain',
  'Software / SaaS',
  'Employee Salary',
  'Commission',
  'Office Rent',
  'Utilities',
  'Internet / Phone',
  'Fuel',
  'Van Rent',
  'Labor Cost',
  'Shipping Cost',
  'Market Fees',
  'Repairs & Maintenance',
  'Packaging',
  'Bank Charges',
  'Other',
];

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  Hosting: '#6366f1',
  Domain: '#8b5cf6',
  'Software / SaaS': '#3b82f6',
  'Employee Salary': '#0f766e',
  Commission: '#f59e0b',
  'Office Rent': '#64748b',
  Utilities: '#06b6d4',
  'Internet / Phone': '#2563eb',
  Fuel: '#ef4444',
  'Van Rent': '#f97316',
  'Labor Cost': '#10b981',
  'Shipping Cost': '#14b8a6',
  'Market Fees': '#84cc16',
  'Repairs & Maintenance': '#dc2626',
  Packaging: '#a855f7',
  'Bank Charges': '#475569',
  Other: '#94a3b8',
};

interface DraftLine {
  productId: string;
  quantity: string;
  basePrice: string;
  sellMode: 'percent' | 'manual';
  profitPercent: string;
  sellPrice: string;
  condition: StockCondition;
}
const emptyLine = (): DraftLine => ({
  productId: '', quantity: '', basePrice: '',
  sellMode: 'percent', profitPercent: '', sellPrice: '',
  condition: 'FRESH',
});

const CONDITION_META: Record<StockCondition, { label: string; color: string }> = {
  FRESH:   { label: 'Fresh',   color: '#10b981' },
  AGING:   { label: 'Aging',   color: '#f59e0b' },
  DAMAGED: { label: 'Damaged', color: '#ef4444' },
  CUSTOM:  { label: 'Custom',  color: '#6366f1' },
};

const toLocalISO = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseLocalDate = (value: string) => {
  if (!value) return new Date();
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
};

const formatDisplayDate = (value: string) => {
  if (!value) return '';
  const date = parseLocalDate(value);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatPurchaseDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatMoney = (value: number) => `৳${(Number.isFinite(value) ? value : 0).toLocaleString()}`;

const paymentMethodLabel = (method?: string | null) => {
  switch (method) {
    case 'cash': return 'Cash';
    case 'bank': return 'Bank';
    case 'mobile_banking': return 'Mobile Banking';
    case 'card': return 'Card';
    case 'other': return 'Other';
    default: return 'Not set';
  }
};

const createdByLabel = (createdBy: Expense['createdBy']) => {
  if (!createdBy) return '—';
  return typeof createdBy === 'string' ? createdBy : createdBy.name || createdBy.email || createdBy.id;
};

/* ─── Purchase Modal (multi-product) ─── */
function PurchaseModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const qc = useQueryClient();
  const productsQ = useProducts({ status: 'Active', pageSize: 200, sort: 'name' });
  const products = productsQ.data?.data ?? [];
  const productsLoading = productsQ.isLoading || productsQ.isFetching;
  const productsError = productsQ.error;
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [header, setHeader] = useState({
    date: new Date().toISOString().split('T')[0],
    source: '', notes: '', bankAccountId: '',
    transportCost: '', labourCost: '', otherCost: '',
  });
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);

  useEffect(() => {
    api.get<BankAccount[]>('/banking/accounts').then(r => setBanks(r || [])).catch(() => {});
  }, []);

  const setLine = (idx: number, patch: Partial<DraftLine>) => {
    setLines(ls => ls.map((l, i) => i === idx ? { ...l, ...patch } : l));
  };
  const addLine = () => setLines(ls => [...ls, emptyLine()]);
  const removeLine = (idx: number) => setLines(ls => ls.length === 1 ? ls : ls.filter((_, i) => i !== idx));

  // Shared costs distributed proportionally by line quantity.
  const sharedTransport = Number(header.transportCost) || 0;
  const sharedLabour = Number(header.labourCost) || 0;
  const sharedOther = Number(header.otherCost) || 0;
  const totalQty = lines.reduce((s, l) => s + (Number(l.quantity) || 0), 0);

  const productById = new Map<string, Product>(products.map(p => [p.id, p]));

  const computed = lines.map((l, idx) => {
    const product = productById.get(l.productId);
    const qty = Number(l.quantity) || 0;
    const base = Number(l.basePrice) || 0;
    const share = totalQty > 0 ? qty / totalQty : 0;
    // Last line absorbs rounding remainder; others get floored share.
    const isLast = idx === lines.length - 1;
    const others = idx;
    const splitFor = (total: number) => {
      if (totalQty === 0) return 0;
      if (!isLast) return Math.floor(total * share);
      // remainder for last line
      const accountedFor = lines.slice(0, others).reduce((s, ll) => {
        const llqty = Number(ll.quantity) || 0;
        const sh = totalQty > 0 ? llqty / totalQty : 0;
        return s + Math.floor(total * sh);
      }, 0);
      return total - accountedFor;
    };
    const transportCost = splitFor(sharedTransport);
    const labourCost = splitFor(sharedLabour);
    const otherCost = splitFor(sharedOther);
    const lineSubtotal = base * qty + transportCost + labourCost + otherCost;
    const effectiveBuyPrice = qty > 0 ? Math.round(lineSubtotal / qty) : 0;
    const defaultSellPrice = product?.tradePrice ?? 0;
    const sellPrice = l.sellMode === 'manual'
      ? (Number(l.sellPrice) || 0)
      : l.sellMode === 'percent'
        ? (l.profitPercent ? Math.round(effectiveBuyPrice * (1 + Number(l.profitPercent) / 100)) : 0)
        : 0;
    const pricingSource = l.sellMode === 'manual' ? 'Manual'
      : l.sellMode === 'percent' && l.profitPercent ? `${l.profitPercent}% margin`
      : 'Enter margin';
    const marginAmount = sellPrice - effectiveBuyPrice;
    return { qty, base, transportCost, labourCost, otherCost, lineSubtotal, effectiveBuyPrice, sellPrice, defaultSellPrice, pricingSource, marginAmount };
  });
  const productTotal = computed.reduce((s, c) => s + c.qty * c.base, 0);
  const grandTotal = computed.reduce((s, c) => s + c.lineSubtotal, 0);
  const completedLine = (idx: number) => !!lines[idx]?.productId && computed[idx].qty > 0;
  // The sell snapshot is only valid after landed cost is known and the user has
  // intentionally set a margin/manual price above that landed unit cost.
  const hasInvalidSellLine = computed.some((c, idx) => completedLine(idx) && (c.effectiveBuyPrice <= 0 || c.sellPrice <= c.effectiveBuyPrice));
  const summaryLines = lines.map((line, idx) => {
    const product = productById.get(line.productId);
    const c = computed[idx];
    return {
      id: `${line.productId || 'line'}-${idx}`,
      name: product?.name || `Product ${idx + 1}`,
      unit: product?.unit || 'unit',
      qty: c.qty,
      base: c.base,
      baseTotal: c.qty * c.base,
      landedTotal: c.lineSubtotal,
      effectiveBuyPrice: c.effectiveBuyPrice,
      sellPrice: c.sellPrice,
      defaultSellPrice: c.defaultSellPrice,
      pricingSource: c.pricingSource,
      marginAmount: c.marginAmount,
      belowCost: c.qty > 0 && c.sellPrice <= c.effectiveBuyPrice,
    };
  }).filter(line => line.qty > 0 || line.base > 0 || lines.length === 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validLines = lines.map((l, idx) => ({ l, c: computed[idx] }))
      .filter(({ l, c }) => l.productId && c.qty > 0 && c.base >= 0);
    if (validLines.length === 0) {
      alert('Add at least one product line with quantity > 0.');
      return;
    }
    if (hasInvalidSellLine) {
      alert('Sell price must be higher than landed cost for every line.');
      return;
    }
    setLoading(true);
    try {
      const body: PurchaseCreateInput = {
        date: header.date,
        source: header.source,
        notes: header.notes || undefined,
        bankAccountId: header.bankAccountId || undefined,
        lines: validLines.map(({ l, c }) => {
          const out: PurchaseLineInput = {
            productId: l.productId,
            quantity: c.qty,
            basePrice: c.base,
            transportCost: c.transportCost,
            labourCost: c.labourCost,
            otherCost: c.otherCost,
            sellPrice: c.sellPrice,
            condition: l.condition,
          };
          if (l.sellMode === 'percent' && l.profitPercent) out.profitPercent = Number(l.profitPercent);
          return out;
        }),
      };
      await api.post('/purchases', body);
      qc.invalidateQueries({ queryKey: ['stock-batches'] });
      qc.invalidateQueries({ queryKey: ['stock-entries'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      onSave();
      onClose();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save purchase');
    } finally { setLoading(false); }
  };

  const h = (v: string, k: keyof typeof header) => setHeader(p => ({ ...p, [k]: v }));

  const labelStyle: React.CSSProperties = {
    fontSize: '9px', fontWeight: 900, textTransform: 'uppercase',
    letterSpacing: '0.16em', color: '#475569',
  };
  const sectionLabelStyle: React.CSSProperties = {
    fontSize: '9px', fontWeight: 900, textTransform: 'uppercase',
    letterSpacing: '0.18em', color: '#475569',
    display: 'flex', alignItems: 'center', gap: '8px',
  };
  const fmt = (n: number) => `৳${n.toLocaleString()}`;

  return (
    <div
      className="sheet-overlay purchase-modal-overlay"
      onClick={onClose}
      style={{
        background: 'rgba(15, 23, 42, 0.18)',
        backdropFilter: 'blur(14px) saturate(125%)',
        WebkitBackdropFilter: 'blur(14px) saturate(125%)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        className="sheet-content purchase-modal-content animate-fade-in"
        style={{
          maxWidth: '1400px',
          margin: 'auto',
          boxShadow: '0 32px 90px rgba(15, 23, 42, 0.24), 0 0 0 1px rgba(15, 23, 42, 0.08)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-soft)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(16,185,129,0.03)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              padding: '10px', background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: '12px', color: 'var(--primary)',
            }}>
              <ShoppingCart size={20} />
            </div>
            <div>
              <h2 style={{
                fontSize: '15px', fontWeight: 900, textTransform: 'uppercase',
                letterSpacing: '0.05em', color: 'var(--text-main)',
              }}>
                Record <span style={{ color: 'var(--primary)' }}>Purchase</span>
              </h2>
              <p style={{
                fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.5,
                marginTop: '2px',
              }}>
                Inventory Procurement Entry
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{
            padding: '8px', borderRadius: '10px', background: 'var(--overlay-soft)',
            color: 'var(--text-muted)', border: 'none', cursor: 'pointer',
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Body: form (left) + live preview (right) */}
        <form
          className="purchase-modal-form"
          onSubmit={handleSubmit}
          style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}
        >
          {/* LEFT — Form */}
          <div
            className="purchase-modal-main custom-scrollbar"
            style={{
              flex: '1 1 0', minWidth: 0, padding: '2rem', display: 'flex',
              flexDirection: 'column', gap: '1.5rem', overflowY: 'auto',
            }}
          >
            {/* Section: Header */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={sectionLabelStyle}>
                <Calculator size={12} /> Purchase Details
              </p>
              <div className="purchase-details-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 1.4fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={labelStyle}>Date</label>
                  <PurchaseDatePicker value={header.date} onChange={value => h(value, 'date')} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={labelStyle}>Source / Supplier</label>
                  <input type="text" className="input-premium" placeholder="Karwan Bazar"
                    value={header.source} onChange={e => h(e.target.value, 'source')} required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={labelStyle}>Pay From Bank (Optional)</label>
                  <select className="input-premium" value={header.bankAccountId}
                    onChange={e => h(e.target.value, 'bankAccountId')}>
                    <option value="">— Cash / No Bank —</option>
                    {banks.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.bankName} ···{b.accountNumber.slice(-4)} (৳{b.balance.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section: Product Lines (compact table) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={sectionLabelStyle}>
                  <ShoppingCart size={12} /> Products ({lines.length})
                </p>
                <button type="button" onClick={addLine}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '6px 10px', fontSize: '10px', fontWeight: 900,
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                    background: 'rgba(16,185,129,0.08)', color: 'var(--primary)',
                    border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px',
                    cursor: 'pointer',
                  }}>
                  <Plus size={11} /> Add Product
                </button>
              </div>
              <p style={{
                marginTop: '-0.35rem',
                fontSize: '10px',
                fontWeight: 750,
                color: 'var(--text-muted)',
              }}>
                Sell price defaults from Product Trade Price. Use margin/manual only for shipment-specific override.
              </p>
              <div style={{
                border: '1px solid var(--border-soft)', borderRadius: '12px',
                background: 'var(--surface)', overflow: 'hidden',
                boxShadow: '0 12px 30px rgba(15, 23, 42, 0.05)',
              }}>
                <div style={{ overflowX: 'auto' }}>
                  <table className="purchase-lines-table" style={{
                    width: '100%', minWidth: '760px', tableLayout: 'fixed',
                    borderCollapse: 'collapse', fontSize: '11px',
                  }}>
                    <colgroup>
                      <col style={{ width: '26%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '8%' }} />
                      <col style={{ width: '10%' }} />
                      <col style={{ width: '15%' }} />
                      <col style={{ width: '14%' }} />
                      <col style={{ width: '15%' }} />
                      <col style={{ width: '44px' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        {[
                          { h: 'Product', align: 'left' },
                          { h: 'Condition', align: 'center' },
                          { h: 'Qty', align: 'center' },
                          { h: 'Base ৳', align: 'center' },
                          { h: 'Sell Mode', align: 'center' },
                          { h: 'Sell Snapshot', align: 'center' },
                          { h: 'Subtotal', align: 'right' },
                          { h: '', align: 'center' },
                        ].map(({ h, align }, i) => (
                          <th key={i} style={{
                            padding: '12px 10px',
                            textAlign: align as 'left' | 'right' | 'center',
                            fontSize: '9px', fontWeight: 900,
                            letterSpacing: '0.14em', textTransform: 'uppercase',
                            color: 'var(--text-muted)',
                            background: 'var(--surface-hover)',
                            borderBottom: '1px solid var(--border-soft)',
                            position: 'sticky', top: 0, zIndex: 1,
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line, idx) => {
                        const c = computed[idx];
                        const cellTd: React.CSSProperties = {
                          padding: '8px 8px', verticalAlign: 'middle',
                          borderTop: idx === 0 ? 'none' : '1px solid var(--border-soft)',
                        };
                        const inputCompact: React.CSSProperties = {
                          width: '100%', height: '38px', fontSize: '12px', padding: '0 10px',
                        };
                        return (
                          <tr key={idx}>
                            <td style={cellTd}>
                              <select className="input-premium" style={inputCompact}
                                value={line.productId}
                                onChange={e => {
                                  const selected = productById.get(e.target.value);
                                  setLine(idx, {
                                    productId: e.target.value,
                                    basePrice: line.basePrice || (selected?.basePrice != null ? String(selected.basePrice) : ''),
                                    sellMode: 'percent',
                                    profitPercent: '',
                                    sellPrice: '',
                                  });
                                }} required
                                disabled={productsLoading || !!productsError}>
                                <option value="">
                                  {productsLoading ? 'Loading…'
                                    : productsError ? 'Load failed'
                                    : products.length === 0 ? 'No products'
                                    : '— Select —'}
                                </option>
                                {products.map(p => (
                                  <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                                ))}
                              </select>
                            </td>
                            <td style={cellTd}>
                              <select className="input-premium" style={{
                                ...inputCompact,
                                borderLeft: `3px solid ${CONDITION_META[line.condition].color}`,
                                paddingLeft: '8px',
                              }}
                                value={line.condition}
                                title="Condition of this lot. Non-FRESH lines won't update the global product sell price."
                                onChange={e => setLine(idx, { condition: e.target.value as StockCondition })}>
                                {(['FRESH', 'AGING', 'DAMAGED', 'CUSTOM'] as const).map(k => (
                                  <option key={k} value={k}>{CONDITION_META[k].label}</option>
                                ))}
                              </select>
                            </td>
                            <td style={cellTd}>
                              <input type="number" className="input-premium" style={inputCompact}
                                placeholder="0" min="0"
                                value={line.quantity}
                                onChange={e => setLine(idx, { quantity: e.target.value })} required />
                            </td>
                            <td style={cellTd}>
                              <input type="number" className="input-premium" style={inputCompact}
                                placeholder="0" min="0"
                                value={line.basePrice}
                                onChange={e => setLine(idx, { basePrice: e.target.value })} required />
                            </td>
                            <td style={cellTd}>
                              <select className="input-premium" style={inputCompact}
                                value={line.sellMode}
                                onChange={e => setLine(idx, { sellMode: e.target.value as DraftLine['sellMode'] })}>
                                <option value="percent">% Margin</option>
                                <option value="manual">Manual ৳</option>
                              </select>
                            </td>
                            <td style={cellTd}>
                              {line.sellMode === 'percent' ? (
                                <input type="number" className="input-premium" style={inputCompact}
                                  placeholder="Profit %" min="0"
                                  value={line.profitPercent}
                                  onChange={e => setLine(idx, { profitPercent: e.target.value })} />
                              ) : (
                                <input type="number" className="input-premium" style={inputCompact}
                                  placeholder="Sell ৳" min="0"
                                  value={line.sellPrice}
                                  onChange={e => setLine(idx, { sellPrice: e.target.value })} />
                              )}
                            </td>
                            <td style={{ ...cellTd, textAlign: 'right' }}>
                              <div style={{
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'flex-end', lineHeight: 1.2,
                                fontVariantNumeric: 'tabular-nums',
                              }}>
                                <span style={{ fontSize: '13px', fontWeight: 900, color: 'var(--text-main)' }}>
                                  {fmt(c.lineSubtotal)}
                                </span>
                                <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', opacity: 0.7 }}>
                                  landed {fmt(c.effectiveBuyPrice)} · sell {fmt(c.sellPrice)}
                                </span>
                                <span style={{ fontSize: '9px', fontWeight: 800, color: c.marginAmount > 0 ? 'var(--primary)' : '#ef4444', opacity: 0.85 }}>
                                  margin {fmt(c.marginAmount)} · ref {fmt(c.defaultSellPrice)}
                                </span>
                              </div>
                            </td>
                            <td style={{ ...cellTd, textAlign: 'center' }}>
                              {lines.length > 1 && (
                                <button type="button" onClick={() => removeLine(idx)}
                                  aria-label="Remove line"
                                  style={{
                                    background: 'rgba(239,68,68,0.08)',
                                    border: '1px solid rgba(239,68,68,0.2)',
                                    cursor: 'pointer', color: '#ef4444',
                                    padding: '6px', borderRadius: '6px',
                                    display: 'inline-flex',
                                  }}>
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Section: Shared trip costs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={sectionLabelStyle}>
                <Truck size={12} /> Shared Trip Costs (split by quantity)
              </p>
              <div className="purchase-cost-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                {([
                  { label: 'Transport (৳)', key: 'transportCost', icon: <Truck size={12} /> },
                  { label: 'Labour (৳)', key: 'labourCost', icon: <Users size={12} /> },
                  { label: 'Other (৳)', key: 'otherCost', icon: <MoreHorizontal size={12} /> },
                ] as const).map(({ label, key, icon }) => (
                  <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {icon}{label}
                    </label>
                    <input type="number" className="input-premium" placeholder="0" min="0"
                      value={header[key]}
                      onChange={e => h(e.target.value, key)} />
                  </div>
                ))}
              </div>
            </div>

            {/* Section: Notes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}>Notes (Optional)</label>
              <input type="text" className="input-premium" placeholder="Any notes about this trip…"
                value={header.notes} onChange={e => h(e.target.value, 'notes')} />
            </div>
          </div>

          {/* RIGHT — Live Calculation Preview */}
          <aside
            className="purchase-modal-summary custom-scrollbar"
            style={{
              width: '360px', flexShrink: 0, padding: '2rem 1.5rem',
              background: 'var(--surface-tint-mint)',
              borderLeft: '1px solid var(--border-soft)',
              display: 'flex', flexDirection: 'column', gap: '1.25rem',
              overflowY: 'auto',
            }}
          >
            <div>
              <p style={{
                fontSize: '9px', fontWeight: 900, textTransform: 'uppercase',
                letterSpacing: '0.2em', color: 'var(--primary)',
              }}>
                Live Calculation
              </p>
              <p style={{
                fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)',
                marginTop: '4px', lineHeight: 1.5,
              }}>
                Landed buy price plus the sell-price snapshot that stock/distribution will use.
              </p>
            </div>

            <div style={{
              display: 'flex', flexDirection: 'column', gap: '10px',
              padding: '1rem', borderRadius: '14px', background: 'var(--surface)',
              border: '1px solid var(--border-soft)',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {summaryLines.map(line => (
                  <div key={line.id} style={{
                    paddingBottom: '8px',
                    borderBottom: '1px dashed var(--border-soft)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                      <span style={{
                        minWidth: 0, fontSize: '12px', fontWeight: 900,
                        color: 'var(--text-main)', overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {line.name}
                      </span>
                      <span style={{
                        flexShrink: 0, fontSize: '12px', fontWeight: 900,
                        color: 'var(--text-main)', fontVariantNumeric: 'tabular-nums',
                      }}>
                        {fmt(line.baseTotal)}
                      </span>
                    </div>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', gap: '12px',
                      marginTop: '3px', fontSize: '9px', fontWeight: 800,
                      color: 'var(--text-muted)',
                    }}>
                      <span>{line.qty || 0} {line.unit} x {fmt(line.base)}</span>
                      <span>landed {fmt(line.effectiveBuyPrice)} / {line.unit}</span>
                    </div>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', gap: '12px',
                      marginTop: '3px', fontSize: '9px', fontWeight: 900,
                      color: line.belowCost ? '#ef4444' : 'var(--primary)',
                    }}>
                      <span>{line.pricingSource}</span>
                      <span>sell {fmt(line.sellPrice)}{line.belowCost ? ' ⚠' : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
              {hasInvalidSellLine && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 14px', borderRadius: 12,
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                  color: '#ef4444', fontSize: 11, fontWeight: 900,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  <AlertTriangle size={14} />
                  Enter margin/manual sell price higher than landed cost for every line.
                </div>
              )}
              <PreviewRow label="Product Total" value={fmt(productTotal)} />
              <PreviewRow label="Transport" value={fmt(sharedTransport)} muted={!sharedTransport} />
              <PreviewRow label="Labour" value={fmt(sharedLabour)} muted={!sharedLabour} />
              <PreviewRow label="Other" value={fmt(sharedOther)} muted={!sharedOther} />
              <div style={{
                borderTop: '1px dashed var(--border)', paddingTop: '10px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ ...labelStyle, letterSpacing: '0.15em' }}>Grand Total</span>
                <span style={{
                  fontSize: '16px', fontWeight: 900, color: 'var(--text-main)',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {fmt(grandTotal)}
                </span>
              </div>
            </div>

            <div style={{
              padding: '1rem 1.25rem', borderRadius: '14px',
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.25)',
            }}>
              <span style={{ ...labelStyle, color: 'var(--primary)', opacity: 0.9 }}>
                Bank Withdrawal
              </span>
              <p style={{
                fontSize: '22px', fontWeight: 900, color: 'var(--primary)',
                fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
                marginTop: '4px',
              }}>
                {fmt(grandTotal)}
              </p>
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', marginTop: '6px' }}>
                {header.bankAccountId
                  ? banks.find(b => b.id === header.bankAccountId)?.bankName ?? '—'
                  : 'Cash (no bank deducted)'}
              </p>
            </div>

            <div style={{
              marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px',
              paddingTop: '1rem', borderTop: '1px solid var(--border-soft)',
            }}>
              <button type="submit" className="btn-primary"
                style={{ width: '100%', height: '50px' }} disabled={loading || totalQty === 0 || hasInvalidSellLine}>
                {loading ? 'Saving…' : 'Commit Purchase'}
              </button>
              <button type="button" onClick={onClose} className="btn-secondary"
                style={{ width: '100%', height: '44px' }}>
                Cancel
              </button>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
}

function PurchaseDatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  allowClear = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowClear?: boolean;
}) {
  const selected = parseLocalDate(value);
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));
  const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const cells = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  const selectDate = (day: number) => {
    onChange(toLocalISO(new Date(viewDate.getFullYear(), viewDate.getMonth(), day)));
    setOpen(false);
  };

  return (
    <div className="purchase-date-picker">
      <button type="button" className="input-premium purchase-date-trigger" onClick={() => setOpen(v => !v)}>
        <span className={value ? '' : 'is-placeholder'}>{value ? formatDisplayDate(value) : placeholder}</span>
        <CalendarDays size={15} />
      </button>
      {open && (
        <div className="purchase-calendar" onClick={e => e.stopPropagation()}>
          <div className="purchase-calendar-header">
            <button type="button" aria-label="Previous month" onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>
              <ChevronLeft size={15} />
            </button>
            <strong>{monthLabel}</strong>
            <button type="button" aria-label="Next month" onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>
              <ChevronRight size={15} />
            </button>
          </div>
          <div className="purchase-calendar-grid purchase-calendar-weekdays">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => <span key={`${day}-${idx}`}>{day}</span>)}
          </div>
          <div className="purchase-calendar-grid">
            {cells.map((day, idx) => {
              const date = day ? new Date(viewDate.getFullYear(), viewDate.getMonth(), day) : null;
              const isSelected = date ? toLocalISO(date) === value : false;
              const isToday = date ? toLocalISO(date) === toLocalISO(new Date()) : false;
              return day ? (
                <button
                  key={day}
                  type="button"
                  className={`${isSelected ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}`}
                  onClick={() => selectDate(day)}
                >
                  {day}
                </button>
              ) : <span key={`blank-${idx}`} />;
            })}
          </div>
          <div className="purchase-calendar-actions">
            {allowClear && (
              <button type="button" onClick={() => { onChange(''); setOpen(false); }}>
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
                onChange(toLocalISO(today));
                setOpen(false);
              }}
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      opacity: muted ? 0.4 : 1,
    }}>
      <span style={{
        fontSize: '10px', fontWeight: 800, textTransform: 'uppercase',
        letterSpacing: '0.15em', color: 'var(--text-muted)',
      }}>
        {label}
      </span>
      <span style={{
        fontSize: '12px', fontWeight: 800, color: 'var(--text-main)',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </span>
    </div>
  );
}

function ExpenseStatusBadge({ status }: { status: ExpenseStatus }) {
  const paid = status === 'paid';
  const color = paid ? '#10b981' : '#f59e0b';
  return (
    <span className="expense-status-badge" style={{ color, background: `${color}14`, borderColor: `${color}33` }}>
      {paid ? <CheckCircle2 size={12} /> : <CalendarDays size={12} />}
      {status}
    </span>
  );
}

function ExpenseCategoryBadge({ category }: { category: ExpenseCategory }) {
  const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.Other;
  return (
    <span className="expense-category-badge" style={{ color, background: `${color}14`, borderColor: `${color}33` }}>
      {category}
    </span>
  );
}

function ExpenseModal({
  expense,
  onClose,
  onSubmit,
  saving,
}: {
  expense?: Expense | null;
  onClose: () => void;
  onSubmit: (body: ExpenseInput) => Promise<void>;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    date: expense?.date?.slice(0, 10) || toLocalISO(new Date()),
    category: expense?.category || 'Other' as ExpenseCategory,
    amount: expense?.amount ? String(expense.amount) : '',
    description: expense?.description || '',
    status: expense?.status || 'paid' as ExpenseStatus,
    vendor: expense?.vendor || '',
    paymentMethod: expense?.paymentMethod || 'cash',
    bankAccountId: expense?.bankAccountId || '',
    notes: expense?.notes || '',
  });

  const set = (key: keyof typeof form, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Enter a valid expense amount.');
      return;
    }

    await onSubmit({
      date: form.date,
      category: form.category,
      amount,
      description: form.description.trim(),
      status: form.status,
      vendor: form.vendor.trim() || undefined,
      paymentMethod: form.paymentMethod || undefined,
      bankAccountId: form.bankAccountId.trim() || undefined,
      notes: form.notes.trim() || undefined,
    });
  };

  return (
    <div className="sheet-overlay" onClick={onClose} style={{ background: 'rgba(15,23,42,0.22)', backdropFilter: 'blur(12px)' }}>
      <form className="sheet-content expense-modal animate-fade-in" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="expense-modal-header">
          <div>
            <p>{expense ? 'Update Expense' : 'Record Expense'}</p>
            <h2>{expense ? expense.id : 'New Operating Cost'}</h2>
          </div>
          <button type="button" className="btn-action" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        <div className="expense-modal-body">
          <div className="expense-form-grid">
            <label>
              <span>Date</span>
              <PurchaseDatePicker value={form.date} onChange={value => set('date', value)} />
            </label>
            <label>
              <span>Category</span>
              <select className="input-premium" value={form.category} onChange={e => set('category', e.target.value)}>
                {EXPENSE_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
            <label>
              <span>Amount</span>
              <input className="input-premium" type="number" min="1" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0" required />
            </label>
            <label>
              <span>Status</span>
              <select className="input-premium" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
              </select>
            </label>
          </div>

          <label className="expense-field">
            <span>Description</span>
            <input className="input-premium" value={form.description} onChange={e => set('description', e.target.value)} placeholder="What was this expense for?" required />
          </label>

          <div className="expense-form-grid">
            <label>
              <span>Vendor / Payee</span>
              <input className="input-premium" value={form.vendor} onChange={e => set('vendor', e.target.value)} placeholder="Supplier or employee name" />
            </label>
            <label>
              <span>Payment Method</span>
              <select className="input-premium" value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)}>
                <option value="cash">Cash</option>
                <option value="bank">Bank</option>
                <option value="mobile_banking">Mobile Banking</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              <span>Bank / Reference</span>
              <input className="input-premium" value={form.bankAccountId} onChange={e => set('bankAccountId', e.target.value)} placeholder="Optional account/reference" />
            </label>
          </div>

          <label className="expense-field">
            <span>Notes</span>
            <input className="input-premium" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Internal note, receipt info, or payroll period" />
          </label>
        </div>

        <div className="expense-modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : expense ? 'Update Expense' : 'Save Expense'}
          </button>
        </div>
      </form>
    </div>
  );
}

function DeleteExpenseModal({ expense, onCancel, onConfirm, deleting }: { expense: Expense; onCancel: () => void; onConfirm: () => void; deleting: boolean }) {
  return (
    <div className="sheet-overlay" onClick={onCancel} style={{ background: 'rgba(15,23,42,0.22)', backdropFilter: 'blur(12px)' }}>
      <div className="expense-delete-modal animate-fade-in" onClick={e => e.stopPropagation()}>
        <h2>Delete expense?</h2>
        <p>{expense.id} · {expense.description}</p>
        <div>
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn-danger" onClick={onConfirm} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete'}</button>
        </div>
      </div>
    </div>
  );
}

function purchaseProductTotal(purchase: Purchase) {
  return purchase.lines.reduce((sum, line) => sum + line.quantity * line.basePrice, 0);
}

function purchaseCostTotal(purchase: Purchase, key: 'transportCost' | 'labourCost' | 'otherCost') {
  return purchase.lines.reduce((sum, line) => sum + (line[key] || 0), 0);
}

function PurchaseDetailsModal({
  purchase,
  onClose,
  onDownload,
  downloading,
}: {
  purchase: Purchase;
  onClose: () => void;
  onDownload: () => void;
  downloading: boolean;
}) {
  const productTotal = purchaseProductTotal(purchase);
  const transportTotal = purchaseCostTotal(purchase, 'transportCost');
  const labourTotal = purchaseCostTotal(purchase, 'labourCost');
  const otherTotal = purchaseCostTotal(purchase, 'otherCost');

  return (
    <div className="sheet-overlay" onClick={onClose} style={{ background: 'rgba(15,23,42,0.22)', backdropFilter: 'blur(12px)' }}>
      <div className="sheet-content purchase-detail-modal animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="purchase-detail-header">
          <div>
            <p className="purchase-detail-kicker">Purchase Voucher</p>
            <h2>{purchase.id}</h2>
            <p>{formatPurchaseDate(purchase.date)} · {purchase.source}</p>
          </div>
          <div className="purchase-detail-actions">
            <button type="button" className="btn-secondary" onClick={onDownload} disabled={downloading}>
              {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Voucher PDF
            </button>
            <button type="button" className="btn-action" onClick={onClose} aria-label="Close"><X size={18} /></button>
          </div>
        </div>

        <div className="purchase-detail-body">
          <div className="purchase-detail-meta">
            <div><span>Payment Source</span><strong>{purchase.bankAccount?.bankName || 'Cash'}</strong></div>
            <div><span>Product Total</span><strong>৳{productTotal.toLocaleString()}</strong></div>
            <div><span>Trip Costs</span><strong>৳{(transportTotal + labourTotal + otherTotal).toLocaleString()}</strong></div>
            <div><span>Grand Total</span><strong>৳{(purchase.total ?? 0).toLocaleString()}</strong></div>
          </div>

          <div className="purchase-detail-table-wrap">
            <table className="purchase-detail-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Condition</th>
                  <th>Qty</th>
                  <th>Base</th>
                  <th>Costs</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {purchase.lines.map(line => {
                  const costs = line.transportCost + line.labourCost + line.otherCost;
                  const lineTotal = line.quantity * line.basePrice + costs;
                  return (
                    <tr key={line.id}>
                      <td>{line.product.name}</td>
                      <td>{line.condition || '-'}</td>
                      <td>{line.quantity} {line.product.unit}</td>
                      <td>৳{line.basePrice.toLocaleString()}</td>
                      <td>৳{costs.toLocaleString()}</td>
                      <td>৳{lineTotal.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Status Badge ─── */
/* ─── Page ─── */
export default function UnifiedExpensesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [expenseFilters, setExpenseFilters] = useState({
    search: '',
    category: 'all' as ExpenseCategory | 'all',
    status: 'all' as ExpenseStatus | 'all',
    from: '',
    to: '',
  });
  const [purchaseFilters, setPurchaseFilters] = useState({
    search: '',
    bank: 'all',
    from: '',
    to: '',
  });
  const meQ = useMe();
  const role = meQ.data?.role;
  const canWriteExpenses = role === 'ADMIN' || role === 'MANAGER';
  const canDeleteExpenses = role === 'ADMIN';
  const expensesQ = useExpenses({
    pageSize: 100,
    sort: '-date',
    q: expenseFilters.search || undefined,
    category: expenseFilters.category,
    status: expenseFilters.status,
    dateFrom: expenseFilters.from || undefined,
    dateTo: expenseFilters.to || undefined,
  });
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const exportExpenses = useExportExpenses();
  const downloadPurchaseVoucher = useDownloadPurchaseVoucher();
  const expenses = expensesQ.data?.data ?? [];
  const paidExpenses = expenses.filter(e => e.status === 'paid');
  const pendingExpenses = expenses.filter(e => e.status === 'pending');
  const currentMonth = toLocalISO(new Date()).slice(0, 7);
  const monthExpenses = expenses.filter(e => e.date.slice(0, 7) === currentMonth);
  const totalPaid = paidExpenses.reduce((s, e) => s + e.amount, 0);
  const totalPending = pendingExpenses.reduce((s, e) => s + e.amount, 0);
  const monthTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const topCategory = EXPENSE_CATEGORIES
    .map(category => ({
      category,
      amount: expenses.filter(e => e.category === category).reduce((s, e) => s + e.amount, 0),
    }))
    .sort((a, b) => b.amount - a.amount)[0];

  const loadPurchases = async () => {
    setLoading(true);
    try {
      const r = await api.get<PurchaseListResponse>('/purchases', { pageSize: 100, sort: '-date' });
      setPurchases(r.data || []);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => {
    if (activeTab === 'purchases') loadPurchases();
  }, [activeTab]);

  const bankOptions = Array.from(new Set(purchases.map(p => p.bankAccount?.bankName || 'Cash')));
  const filteredPurchases = purchases.filter(p => {
    const search = purchaseFilters.search.trim().toLowerCase();
    const purchaseDate = p.date.slice(0, 10);
    const bankName = p.bankAccount?.bankName || 'Cash';
    const matchesSearch = !search
      || p.id.toLowerCase().includes(search)
      || p.source.toLowerCase().includes(search)
      || (p.lines ?? []).some(l => l.product.name.toLowerCase().includes(search));
    const matchesBank = purchaseFilters.bank === 'all' || bankName === purchaseFilters.bank;
    const matchesFrom = !purchaseFilters.from || purchaseDate >= purchaseFilters.from;
    const matchesTo = !purchaseFilters.to || purchaseDate <= purchaseFilters.to;
    return matchesSearch && matchesBank && matchesFrom && matchesTo;
  });
  const resetPurchaseFilters = () => setPurchaseFilters({ search: '', bank: 'all', from: '', to: '' });
  const resetExpenseFilters = () => setExpenseFilters({ search: '', category: 'all', status: 'all', from: '', to: '' });
  const expenseQueryParams = {
    q: expenseFilters.search || undefined,
    category: expenseFilters.category,
    status: expenseFilters.status,
    dateFrom: expenseFilters.from || undefined,
    dateTo: expenseFilters.to || undefined,
  };

  const saveExpense = async (body: ExpenseInput) => {
    if (editingExpense) {
      await updateExpense.mutateAsync({ id: editingExpense.id, body });
    } else {
      await createExpense.mutateAsync(body);
    }
    setShowExpenseModal(false);
    setEditingExpense(null);
  };

  const confirmDeleteExpense = async () => {
    if (!deletingExpense) return;
    await deleteExpense.mutateAsync(deletingExpense.id);
    setDeletingExpense(null);
  };

  return (
    <MainLayout>
      {showPurchaseModal && <PurchaseModal onClose={() => setShowPurchaseModal(false)} onSave={loadPurchases} />}
      {(showExpenseModal || editingExpense) && (
        <ExpenseModal
          expense={editingExpense}
          onClose={() => { setShowExpenseModal(false); setEditingExpense(null); }}
          onSubmit={saveExpense}
          saving={createExpense.isPending || updateExpense.isPending}
        />
      )}
      {deletingExpense && (
        <DeleteExpenseModal
          expense={deletingExpense}
          onCancel={() => setDeletingExpense(null)}
          onConfirm={confirmDeleteExpense}
          deleting={deleteExpense.isPending}
        />
      )}
      {selectedPurchase && (
        <PurchaseDetailsModal
          purchase={selectedPurchase}
          onClose={() => setSelectedPurchase(null)}
          onDownload={() => downloadPurchaseVoucher.mutate(selectedPurchase.id)}
          downloading={downloadPurchaseVoucher.isPending && downloadPurchaseVoucher.variables === selectedPurchase.id}
        />
      )}
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }} className="animate-fade-in">
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '14px', background: 'rgba(239,68,68,0.1)', borderRadius: '18px', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', boxShadow: '0 0 24px rgba(239,68,68,0.08)' }}>
              <Wallet size={26} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-main)', textTransform: 'uppercase' }}>
                Expense & <span style={{ color: '#ef4444' }}>Purchase Ledger</span>
              </h1>
              <p style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3em', opacity: 0.55, marginTop: '3px' }}>
                Track operating spend, procurement cost, and payment source
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              className="btn-primary"
              onClick={() => {
                if (activeTab === 'purchases') setShowPurchaseModal(true);
                else if (canWriteExpenses) setShowExpenseModal(true);
              }}
              disabled={activeTab === 'general' && !canWriteExpenses}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={14} /> Record {activeTab === 'general' ? 'Expense' : 'Purchase'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid var(--border-soft)' }}>
          {[
            { id: 'general', label: 'General Expenses', icon: <Wallet size={14} /> },
            { id: 'purchases', label: 'Inventory Purchases', icon: <ShoppingCart size={14} /> },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as Tab)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '12px 4px', fontSize: '11px', fontWeight: 900,
                textTransform: 'uppercase', letterSpacing: '0.1em',
                color: activeTab === t.id ? 'var(--primary)' : 'var(--text-muted)',
                borderBottom: `2px solid ${activeTab === t.id ? 'var(--primary)' : 'transparent'}`,
                background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                cursor: 'pointer', transition: 'all 0.2s',
                opacity: activeTab === t.id ? 1 : 0.6
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'general' ? (
          <div className="animate-fade-in space-y-6">
            <div className="expense-kpi-grid">
              {[
                { label: 'Paid Expenses', value: formatMoney(totalPaid), sub: `${paidExpenses.length} paid records`, color: '#10b981' },
                { label: 'Pending', value: formatMoney(totalPending), sub: `${pendingExpenses.length} awaiting payment`, color: '#f59e0b' },
                { label: 'This Month', value: formatMoney(monthTotal), sub: `${monthExpenses.length} records in ${currentMonth}`, color: '#3b82f6' },
                { label: 'Top Category', value: topCategory?.amount ? topCategory.category : '—', sub: topCategory?.amount ? formatMoney(topCategory.amount) : 'No expenses loaded', color: '#ef4444' },
              ].map(kpi => (
                <div key={kpi.label} className="expense-kpi-card">
                  <span style={{ color: kpi.color }}>{kpi.label}</span>
                  <strong>{kpi.value}</strong>
                  <p>{kpi.sub}</p>
                </div>
              ))}
            </div>

            <div className="expense-filter-bar">
              <div className="expense-filter-search">
                <label>Search</label>
                <div className="expense-search-input">
                  <Search size={14} />
                  <input
                    className="input-premium"
                    value={expenseFilters.search}
                    onChange={e => setExpenseFilters(f => ({ ...f, search: e.target.value }))}
                    placeholder="Description, vendor, or category"
                  />
                </div>
              </div>
              <div>
                <label>Category</label>
                <select
                  className="input-premium"
                  value={expenseFilters.category}
                  onChange={e => setExpenseFilters(f => ({ ...f, category: e.target.value as ExpenseCategory | 'all' }))}
                >
                  <option value="all">All categories</option>
                  {EXPENSE_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
                </select>
              </div>
              <div>
                <label>Status</label>
                <select
                  className="input-premium"
                  value={expenseFilters.status}
                  onChange={e => setExpenseFilters(f => ({ ...f, status: e.target.value as ExpenseStatus | 'all' }))}
                >
                  <option value="all">All status</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div>
                <label>From</label>
                <PurchaseDatePicker
                  value={expenseFilters.from}
                  onChange={value => setExpenseFilters(f => ({ ...f, from: value }))}
                  placeholder="Start date"
                  allowClear
                />
              </div>
              <div>
                <label>To</label>
                <PurchaseDatePicker
                  value={expenseFilters.to}
                  onChange={value => setExpenseFilters(f => ({ ...f, to: value }))}
                  placeholder="End date"
                  allowClear
                />
              </div>
              <button type="button" className="btn-secondary" onClick={resetExpenseFilters}>Reset</button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => exportExpenses.mutate(expenseQueryParams)}
                disabled={exportExpenses.isPending}
              >
                {exportExpenses.isPending ? 'Exporting...' : 'Export CSV'}
              </button>
            </div>

            <div className="expense-role-note">
              Role access: Admin can create/edit/delete/export. Manager can create/edit. Staff is read-only in this UI.
            </div>

            <div className="expense-table-wrap">
              <div style={{ overflowX: 'auto' }}>
                <table className="expense-table">
                  <thead>
                    <tr>
                      {['ID', 'Date', 'Category', 'Description', 'Vendor', 'Payment', 'Amount', 'Status', 'Created By', 'Actions'].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {expensesQ.isLoading ? (
                      <tr><td colSpan={10} className="expense-empty-cell">Loading expenses...</td></tr>
                    ) : expenses.length === 0 ? (
                      <tr><td colSpan={10} className="expense-empty-cell">No general expenses match these filters</td></tr>
                    ) : expenses.map(expense => (
                      <tr key={expense.id}>
                        <td><span className="expense-id">{expense.id}</span></td>
                        <td>{formatPurchaseDate(expense.date)}</td>
                        <td><ExpenseCategoryBadge category={expense.category} /></td>
                        <td>
                          <strong>{expense.description}</strong>
                          {expense.notes && <p>{expense.notes}</p>}
                        </td>
                        <td>{expense.vendor || '—'}</td>
                        <td>
                          <span>{paymentMethodLabel(expense.paymentMethod)}</span>
                          {expense.bankAccount?.bankName && <p>{expense.bankAccount.bankName}</p>}
                        </td>
                        <td className="expense-amount">{formatMoney(expense.amount)}</td>
                        <td><ExpenseStatusBadge status={expense.status} /></td>
                        <td>{createdByLabel(expense.createdBy)}</td>
                        <td>
                          <div className="expense-row-actions">
                            <button
                              type="button"
                              title="Edit expense"
                              onClick={() => setEditingExpense(expense)}
                              disabled={!canWriteExpenses}
                            >
                              <Pencil size={14} /> Edit
                            </button>
                            <button
                              type="button"
                              title="Delete expense"
                              onClick={() => setDeletingExpense(expense)}
                              disabled={!canDeleteExpenses}
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in space-y-6">
            <div className="purchase-filter-bar">
              <div className="purchase-filter-search">
                <label>Search</label>
                <input
                  className="input-premium"
                  value={purchaseFilters.search}
                  onChange={e => setPurchaseFilters(f => ({ ...f, search: e.target.value }))}
                  placeholder="ID, source, or product"
                />
              </div>
              <div>
                <label>Bank</label>
                <select
                  className="input-premium"
                  value={purchaseFilters.bank}
                  onChange={e => setPurchaseFilters(f => ({ ...f, bank: e.target.value }))}
                >
                  <option value="all">All banks</option>
                  {bankOptions.map(bank => <option key={bank} value={bank}>{bank}</option>)}
                </select>
              </div>
              <div>
                <label>From</label>
                <PurchaseDatePicker
                  value={purchaseFilters.from}
                  onChange={value => setPurchaseFilters(f => ({ ...f, from: value }))}
                  placeholder="Start date"
                  allowClear
                />
              </div>
              <div>
                <label>To</label>
                <PurchaseDatePicker
                  value={purchaseFilters.to}
                  onChange={value => setPurchaseFilters(f => ({ ...f, to: value }))}
                  placeholder="End date"
                  allowClear
                />
              </div>
              <button type="button" className="btn-secondary" onClick={resetPurchaseFilters}>
                Reset
              </button>
            </div>

            {/* Purchase History Table */}
            <div className="purchase-history-table-wrap">
              <div style={{ overflowX: 'auto' }}>
                <table className="purchase-history-table">
                  <thead>
                    <tr>
                      {['ID', 'Date', 'Source', 'Products', 'Total', 'Bank', 'Actions'].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading records…</td></tr>
                    ) : filteredPurchases.length === 0 ? (
                      <tr><td colSpan={7} style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 800 }}>No purchase records match these filters</td></tr>
                    ) : filteredPurchases.map(p => (
                      <tr key={p.id}>
                        <td><span className="purchase-id">{p.id}</span></td>
                        <td>{formatPurchaseDate(p.date)}</td>
                        <td><span className="purchase-source">{p.source}</span></td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {(p.lines ?? []).slice(0, 2).map(l => (
                              <span key={l.id} className="purchase-product-line">
                                {l.product.name} <span style={{ color: 'var(--text-muted)' }}>×{l.quantity}</span>
                              </span>
                            ))}
                            {(p.lines?.length ?? 0) > 2 && (
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800 }}>
                                +{(p.lines!.length - 2)} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="purchase-total">৳{(p.total ?? 0).toLocaleString()}</td>
                        <td>{p.bankAccount?.bankName || 'Cash'}</td>
                        <td>
                          <div className="purchase-row-actions">
                            <button type="button" title="View purchase voucher" onClick={() => setSelectedPurchase(p)}>
                              <Eye size={14} /> View
                            </button>
                            <button
                              type="button"
                              title="Download purchase voucher PDF"
                              onClick={() => downloadPurchaseVoucher.mutate(p.id)}
                              disabled={downloadPurchaseVoucher.isPending}
                            >
                              {downloadPurchaseVoucher.isPending && downloadPurchaseVoucher.variables === p.id
                                ? <Loader2 size={14} className="animate-spin" />
                                : <Download size={14} />}
                              Voucher PDF
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
