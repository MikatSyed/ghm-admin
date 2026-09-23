'use client';

import React, { useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, Package, Printer, ShoppingCart, Trash2, Undo2, Wrench } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { qk, useProducts, useVanActivity, useVanDistribution, useVanStockSummary } from '@/hooks/api';
import { api } from '@/lib/api';
import { formatBDT, formatInt, formatTimeDhaka } from '@/lib/format';
import type { DistributionLine, Product, Van, VanActivityEventType, VanStockSummaryProduct } from '@/lib/types';
import PrintPortal from '@/components/PrintPortal';

export type VanDayAdjustArgs = {
  vanId: string;
  distributionId: string;
  type: 'RETURN' | 'DAMAGE' | 'WASTAGE';
  productId: string;
  productName: string;
  productUnit: string;
  available: number;
  currentReturned: number;
  currentDamage: number;
  distributionLineId: string;
  defaultPrice: number;
};

interface VanDayCardProps {
  van: Van;
  date: string;
  todayRevenue: number;
  todaySaleCount: number;
  onOpenPOS: (vanId: string) => void;
  onOpenAdjust: (args: VanDayAdjustArgs) => void;
}

type Row = VanStockSummaryProduct & {
  unitPrice: number;
  value: number;
  distributionLine?: DistributionLine;
  product?: Product;
};

const eventIcon: Record<VanActivityEventType, React.ReactNode> = {
  ALLOCATION: <Package size={14} />,
  SALE: <ShoppingCart size={14} />,
  RETURN: <Undo2 size={14} />,
  DAMAGE: <AlertTriangle size={14} />,
  WASTAGE: <Trash2 size={14} />,
  CORRECTION: <Wrench size={14} />,
};

export default function VanDayCard({ van, date, todayRevenue, todaySaleCount, onOpenPOS, onOpenAdjust }: VanDayCardProps) {
  const [activityOpen, setActivityOpen] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const qc = useQueryClient();
  const stockQ = useVanStockSummary(van.id, date);
  const distributionQ = useVanDistribution(van.id, date);
  const productsQ = useProducts({ pageSize: 200 });
  const activityQ = useVanActivity(activityOpen ? van.id : null, date);

  const productMap = useMemo(() => new Map((productsQ.data?.data ?? []).map((p) => [p.id, p])), [productsQ.data]);
  const lineMap = useMemo(() => new Map((distributionQ.data?.lines ?? []).map((line) => [line.productId, line])), [distributionQ.data]);

  const rows = useMemo<Row[]>(() => (
    (stockQ.data?.products ?? []).map((p) => {
      const product = productMap.get(p.productId);
      // A damaged/salvage lot's discounted price always wins over the
      // product's normal price — never let a driver default back to full price.
      const unitPrice = p.unitPrice ?? product?.tradePrice ?? 0;
      const soldRevenue = p.soldRevenue ?? p.sold * unitPrice;
      const profit = p.profit ?? (p.soldCost ? p.sold * unitPrice - p.soldCost : 0);
      // Derive margin from the same revenue/profit used above when the API
      // doesn't send one — otherwise it silently reads as 0% next to a
      // nonzero profit.
      const profitMargin = p.profitMargin ?? (soldRevenue > 0 ? (profit / soldRevenue) * 100 : 0);
      return {
        ...p,
        soldRevenue,
        soldCost: p.soldCost ?? 0,
        profit,
        profitMargin,
        unitPrice,
        value: p.available * unitPrice,
        distributionLine: lineMap.get(p.productId),
        product,
      };
    })
  ), [stockQ.data, productMap, lineMap]);

  const noDistribution = !stockQ.data?.distributionId;
  const disabledTitle = `No stock allocated to this van on ${date}`;

  async function printDay() {
    setPrinting(true);
    await Promise.all([
      stockQ.refetch(),
      distributionQ.refetch(),
      qc.fetchQuery({
        queryKey: qk.vanActivity(van.id, date),
        queryFn: () => api.get(`/vans/${van.id}/activity`, { date }),
      }),
    ]).finally(() => setPrinting(false));
    setPrintOpen(true);
    window.setTimeout(() => {
      document.body.classList.add('printing-receipt');
      window.addEventListener('afterprint', () => {
        document.body.classList.remove('printing-receipt');
        setPrintOpen(false);
      }, { once: true });
      window.print();
    }, 50);
  }

  function openAdjust(row: Row, type: 'RETURN' | 'DAMAGE' | 'WASTAGE') {
    if (!stockQ.data?.distributionId || !row.distributionLine) return;
    // TODO(backend): split damage vs wastage on van stock summary.
    onOpenAdjust({
      vanId: van.id,
      distributionId: stockQ.data.distributionId,
      type,
      productId: row.productId,
      productName: row.name ?? row.product?.name ?? row.productId,
      productUnit: row.unit ?? row.product?.unit ?? '',
      available: row.available,
      currentReturned: row.distributionLine.returned ?? 0,
      currentDamage: row.distributionLine.damageReturned ?? 0,
      distributionLineId: row.distributionLine.id,
      defaultPrice: row.product?.tradePrice ?? 0,
    });
  }

  if (stockQ.isLoading) {
    return (
      <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: 'none' }}>
        <div className="skeleton skeleton-line" style={{ width: '35%', height: '20px' }} />
        <div className="skeleton skeleton-line" style={{ width: '55%' }} />
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton skeleton-line" />)}
      </div>
    );
  }

  return (
    <div className="card no-print" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: 'none' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.6rem', borderRadius: '12px', background: 'rgba(16,185,129,0.08)', color: 'var(--primary)' }}>
            <ShoppingCart size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 900, color: 'var(--text-main)' }}>{van.vanName}</h2>
            <p style={{ marginTop: '0.15rem', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700 }}>{van.driver}</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ textAlign: 'right' }}>
            <p className="tabular-nums" style={{ fontSize: '22px', fontWeight: 900, color: 'var(--primary)', lineHeight: 1 }}>{formatBDT(todayRevenue)}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 800, marginTop: '0.2rem' }}>{formatInt(todaySaleCount)} sales today</p>
          </div>
          <button
            className="btn-primary"
            onClick={() => onOpenPOS(van.id)}
            disabled={noDistribution}
            title={noDistribution ? disabledTitle : undefined}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}
          >
            <ShoppingCart size={14} /> New Sale
          </button>
          <IconBtn label={printing ? 'Loading print data' : 'Print day'} onClick={printDay} disabled={printing}><Printer size={14} /></IconBtn>
          <IconBtn label={activityOpen ? 'Hide activity' : 'Show activity'} onClick={() => setActivityOpen((v) => !v)} active={activityOpen}>
            <ChevronDown size={14} style={{ transform: activityOpen ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }} />
          </IconBtn>
        </div>
      </div>

      {/* Discrepancy banner */}
      {stockQ.data?.reconciliation?.isBalanced === false && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(239,68,68,0.06)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={14} />
          <span>{formatInt(stockQ.data.reconciliation.discrepancies.length)} discrepancies: {stockQ.data.reconciliation.discrepancies.slice(0, 3).map((d) => d.name ?? d.productId).join(', ')}</span>
        </div>
      )}

      {/* Empty state OR table */}
      {noDistribution ? (
        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 800, background: 'var(--overlay-soft)', borderRadius: '12px' }}>
          No stock allocated on {date}. Use Distribution to allocate.
        </div>
      ) : rows.length === 0 ? (
        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 800 }}>No products for this van and date.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1040px', boxShadow: 'none' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="table-header" style={{ textAlign: 'left', padding: '0.5rem 0.75rem' }}>Product</th>
                <th className="table-header" style={{ textAlign: 'left', padding: '0.5rem 0.75rem' }}>Batch</th>
                <th className="table-header" style={{ textAlign: 'right', padding: '0.5rem 0.75rem' }}>Alloc</th>
                <th className="table-header" style={{ textAlign: 'right', padding: '0.5rem 0.75rem' }}>Sold</th>
                <th className="table-header" style={{ textAlign: 'right', padding: '0.5rem 0.75rem' }}>Ret</th>
                <th className="table-header" style={{ textAlign: 'right', padding: '0.5rem 0.75rem' }}>Dmg</th>
                <th className="table-header" style={{ textAlign: 'right', padding: '0.5rem 0.75rem' }}>On Van</th>
                <th className="table-header" style={{ textAlign: 'right', padding: '0.5rem 0.75rem' }}>Sell</th>
                <th className="table-header" style={{ textAlign: 'right', padding: '0.5rem 0.75rem' }}>Profit/Loss</th>
                <th className="table-header" style={{ textAlign: 'right', padding: '0.5rem 0.75rem' }}>Margin</th>
                <th className="table-header" style={{ textAlign: 'right', padding: '0.5rem 0.75rem' }}>Value</th>
                <th className="table-header" style={{ textAlign: 'right', padding: '0.5rem 0.75rem', width: '120px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const canAdjust = !!row.distributionLine;
                return (
                  <tr key={row.productId} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="table-cell" style={{ padding: '0.65rem 0.75rem', fontWeight: 800 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {row.name ?? row.productId}
                        {row.isDamagedStock && (
                          <span
                            title={`Salvaged stock — sells at ${formatBDT(row.unitPrice)} instead of the normal price`}
                            style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '6px', padding: '1px 6px' }}
                          >
                            Damaged
                          </span>
                        )}
                      </div>
                      {row.unit && <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 700 }}>{row.unit}</div>}
                    </td>
                    <td className="table-cell" style={{ padding: '0.65rem 0.75rem' }}>
                      {row.distributionLine?.batchId ? (
                        <span style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '11px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                          {row.distributionLine.batchId}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px', opacity: 0.5 }}>—</span>
                      )}
                    </td>
                    <td className="table-cell tabular-nums" style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>{formatInt(row.allocated)}</td>
                    <td className="table-cell tabular-nums" style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>{formatInt(row.sold)}</td>
                    <td className="table-cell tabular-nums" style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>{formatInt(row.returned)}</td>
                    <td className="table-cell tabular-nums" style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>{formatInt(row.damaged)}</td>
                    <td className="table-cell tabular-nums" style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 900 }}>{formatInt(row.available)}</td>
                    <td className="table-cell tabular-nums" style={{ padding: '0.65rem 0.75rem', textAlign: 'right', color: 'var(--primary)', fontWeight: 900 }}>{formatBDT(row.soldRevenue)}</td>
                    <td className="table-cell tabular-nums" style={{ padding: '0.65rem 0.75rem', textAlign: 'right', color: row.profit >= 0 ? '#10b981' : '#ef4444', fontWeight: 900 }}>{formatBDT(row.profit)}</td>
                    <td className="table-cell tabular-nums" style={{ padding: '0.65rem 0.75rem', textAlign: 'right', color: row.profitMargin >= 0 ? '#10b981' : '#ef4444', fontWeight: 900 }}>{row.profitMargin.toFixed(2).replace(/\.00$/, '')}%</td>
                    <td className="table-cell tabular-nums" style={{ padding: '0.65rem 0.75rem', textAlign: 'right', color: 'var(--primary)', fontWeight: 800 }}>{formatBDT(row.value)}</td>
                    <td className="table-cell" style={{ padding: '0.5rem 0.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.25rem' }}>
                        <RowActionBtn label="Fresh return — good stock back to warehouse" tone="default" disabled={!canAdjust} onClick={() => openAdjust(row, 'RETURN')}>
                          <Undo2 size={13} />
                        </RowActionBtn>
                        <RowActionBtn label="Damage — salvage at reduced price" tone="warning" disabled={!canAdjust} onClick={() => openAdjust(row, 'DAMAGE')}>
                          <AlertTriangle size={13} />
                        </RowActionBtn>
                        <RowActionBtn label="Wastage — write off as loss" tone="danger" disabled={!canAdjust} onClick={() => openAdjust(row, 'WASTAGE')}>
                          <Trash2 size={13} />
                        </RowActionBtn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Activity timeline */}
      {activityOpen && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <p style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Activity</p>
          {activityQ.isLoading && [0, 1, 2].map((i) => <div key={i} className="skeleton skeleton-line" />)}
          {!activityQ.isLoading && (activityQ.data?.events ?? []).length === 0 && <p style={{ color: 'var(--text-muted)', fontWeight: 800 }}>No activity for this date.</p>}
          {!activityQ.isLoading && [...(activityQ.data?.events ?? [])].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt)).map((event) => (
            <div key={event.id} style={{ display: 'grid', gridTemplateColumns: '22px 54px 1fr auto', gap: '0.75rem', alignItems: 'center', fontSize: '12px' }}>
              <span style={{ color: 'var(--primary)' }}>{eventIcon[event.type]}</span>
              <span style={{ color: 'var(--text-muted)', fontWeight: 800 }}>{formatTimeDhaka(event.occurredAt)}</span>
              <span style={{ fontWeight: 800 }}>{event.productName ?? event.productId} {event.productUnit ? `· ${event.productUnit}` : ''}</span>
              <span className="tabular-nums" style={{ fontWeight: 900 }}>{event.type === 'ALLOCATION' || event.type === 'CORRECTION' ? '+' : '-'}{formatInt(event.quantity)}</span>
            </div>
          ))}
        </div>
      )}
      {printOpen && <PrintPortal><VanDayPrintDocument van={van} date={date} rows={rows} revenue={todayRevenue} saleCount={todaySaleCount} /></PrintPortal>}
    </div>
  );
}

function VanDayPrintDocument({ van, date, rows, revenue, saleCount }: { van: Van; date: string; rows: Row[]; revenue: number; saleCount: number }) {
  const totals = rows.reduce(
    (acc, row) => ({
      allocated: acc.allocated + row.allocated,
      sold: acc.sold + row.sold,
      returned: acc.returned + row.returned,
      damaged: acc.damaged + row.damaged,
      available: acc.available + row.available,
      sell: acc.sell + row.soldRevenue,
      profit: acc.profit + row.profit,
      value: acc.value + row.value,
    }),
    { allocated: 0, sold: 0, returned: 0, damaged: 0, available: 0, sell: 0, profit: 0, value: 0 },
  );
  const margin = totals.sell > 0 ? (totals.profit / totals.sell) * 100 : 0;

  return (
    <div style={{ padding: '24px', color: '#111827', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #111827', paddingBottom: '12px', marginBottom: '18px' }}>
        <div>
          <h1 style={{ fontSize: '22px', margin: 0 }}>Van Sales Day Report</h1>
          <p style={{ margin: '6px 0 0', fontSize: '12px' }}>{van.vanName} · {van.driver}</p>
        </div>
        <div style={{ textAlign: 'right', fontSize: '12px', fontWeight: 700 }}>
          <div>Date: {date}</div>
          <div>Sales: {formatInt(saleCount)}</div>
          <div>Revenue: {formatBDT(revenue)}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '18px' }}>
        <PrintStat label="Allocated" value={formatInt(totals.allocated)} />
        <PrintStat label="Sold" value={formatInt(totals.sold)} />
        <PrintStat label="Sell" value={formatBDT(totals.sell)} />
        <PrintStat label="Profit/Loss" value={formatBDT(totals.profit)} />
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
        <thead>
          <tr>
            {['Product', 'Batch', 'Alloc', 'Sold', 'Ret', 'Dmg', 'On Van', 'Sell', 'Profit/Loss', 'Margin', 'Value'].map((h) => (
              <th key={h} style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: h === 'Product' || h === 'Batch' ? 'left' : 'right', background: '#f3f4f6' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.productId}>
              <td style={printCellLeft}>{row.name ?? row.productId}</td>
              <td style={printCellLeft}>{row.distributionLine?.batchId ?? '-'}</td>
              <td style={printCellRight}>{formatInt(row.allocated)}</td>
              <td style={printCellRight}>{formatInt(row.sold)}</td>
              <td style={printCellRight}>{formatInt(row.returned)}</td>
              <td style={printCellRight}>{formatInt(row.damaged)}</td>
              <td style={printCellRight}>{formatInt(row.available)}</td>
              <td style={printCellRight}>{formatBDT(row.soldRevenue)}</td>
              <td style={printCellRight}>{formatBDT(row.profit)}</td>
              <td style={printCellRight}>{row.profitMargin.toFixed(2).replace(/\.00$/, '')}%</td>
              <td style={printCellRight}>{formatBDT(row.value)}</td>
            </tr>
          ))}
          <tr>
            <td style={printCellLeft} colSpan={2}><strong>Total</strong></td>
            <td style={printCellRight}><strong>{formatInt(totals.allocated)}</strong></td>
            <td style={printCellRight}><strong>{formatInt(totals.sold)}</strong></td>
            <td style={printCellRight}><strong>{formatInt(totals.returned)}</strong></td>
            <td style={printCellRight}><strong>{formatInt(totals.damaged)}</strong></td>
            <td style={printCellRight}><strong>{formatInt(totals.available)}</strong></td>
            <td style={printCellRight}><strong>{formatBDT(totals.sell)}</strong></td>
            <td style={printCellRight}><strong>{formatBDT(totals.profit)}</strong></td>
            <td style={printCellRight}><strong>{margin.toFixed(2).replace(/\.00$/, '')}%</strong></td>
            <td style={printCellRight}><strong>{formatBDT(totals.value)}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function PrintStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: '1px solid #d1d5db', padding: '8px' }}>
      <div style={{ fontSize: '9px', textTransform: 'uppercase', color: '#6b7280', fontWeight: 800 }}>{label}</div>
      <div style={{ fontSize: '14px', fontWeight: 900 }}>{value}</div>
    </div>
  );
}

const printCellLeft: React.CSSProperties = { border: '1px solid #d1d5db', padding: '6px', textAlign: 'left' };
const printCellRight: React.CSSProperties = { border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' };

function IconBtn({ children, label, onClick, active, disabled }: { children: React.ReactNode; label: string; onClick: () => void; active?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '34px',
        height: '34px',
        borderRadius: '10px',
        border: '1px solid var(--border)',
        background: active ? 'var(--overlay-medium)' : 'var(--surface)',
        color: 'var(--text-muted)',
        cursor: disabled ? 'wait' : 'pointer',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {children}
    </button>
  );
}

function RowActionBtn({ children, label, tone, disabled, onClick }: { children: React.ReactNode; label: string; tone: 'default' | 'warning' | 'danger'; disabled?: boolean; onClick: () => void }) {
  const toneColor = tone === 'danger' ? '#ef4444' : tone === 'warning' ? '#f59e0b' : 'var(--primary)';
  const toneBg = tone === 'danger' ? 'rgba(239,68,68,0.08)' : tone === 'warning' ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)';
  const toneBorder = tone === 'danger' ? 'rgba(239,68,68,0.2)' : tone === 'warning' ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '28px',
        height: '28px',
        borderRadius: '8px',
        border: `1px solid ${disabled ? 'var(--border)' : toneBorder}`,
        background: disabled ? 'transparent' : toneBg,
        color: disabled ? 'var(--text-muted)' : toneColor,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  );
}
