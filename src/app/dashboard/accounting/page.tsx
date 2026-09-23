'use client';

import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Award,
  Boxes,
  Calculator,
  DollarSign,
  Filter,
  Package,
  RefreshCcw,
  TrendingDown,
  TrendingUp,
  Truck,
  X,
} from 'lucide-react';
import MainLayout from '@/components/MainLayout';
import { DataTable } from '@/components/ui/DataTable';
import {
  useBatchProfitabilityDetail,
  useBatchVanProfitability,
  useLedger,
  useProducts,
  useVanProfitability,
} from '@/hooks/api';
import { formatBDT, formatDateDhaka, formatInt, todayInDhakaISO } from '@/lib/format';
import type { BatchProfitSummary, BatchVanProfitabilityRow, VanProfitabilityRow } from '@/lib/types';

const PAGE_SIZE = 12;

function currentMonthISO() {
  return todayInDhakaISO().slice(0, 7);
}

function pct(n: number | null | undefined) {
  const value = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return `${value.toFixed(2).replace(/\.00$/, '')}%`;
}

function profitColor(value: number) {
  return value >= 0 ? '#10b981' : '#ef4444';
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '9px',
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: '0.18em',
  color: 'var(--text-muted)',
  marginBottom: '4px',
};

export default function AccountingPage() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(currentMonthISO);
  const [page, setPage] = useState(1);
  const [vanId, setVanId] = useState('');
  const [productId, setProductId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  const ledgerQ = useLedger(month);
  const vanQ = useVanProfitability(month);
  const productsQ = useProducts({ status: 'Active', pageSize: 200, sort: 'name' });
  const batchVanQ = useBatchVanProfitability({
    month,
    page,
    pageSize: PAGE_SIZE,
    vanId: vanId || undefined,
    productId: productId || undefined,
    batchId: batchId.trim() || undefined,
  });

  const ledger = ledgerQ.data;
  const vans = useMemo(() => vanQ.data ?? [], [vanQ.data]);
  const rows = useMemo(() => batchVanQ.data?.data ?? [], [batchVanQ.data]);
  const totals = batchVanQ.data?.totals;
  const totalPages = Math.max(1, Math.ceil((batchVanQ.data?.total ?? 0) / PAGE_SIZE));
  const topVan = useMemo(() => [...vans].sort((a, b) => b.netProfit - a.netProfit)[0], [vans]);
  const activeFilters = Boolean(vanId || productId || batchId.trim());

  function resetPageAnd(action: () => void) {
    action();
    setPage(1);
  }

  function clearFilters() {
    setVanId('');
    setProductId('');
    setBatchId('');
    setPage(1);
  }

  function refresh() {
    qc.invalidateQueries({ queryKey: ['accounting'] });
  }

  const kpis = [
    {
      label: 'Total Sell',
      value: totals?.totalSell ?? ledger?.revenue ?? 0,
      sub: `${formatInt(totals?.soldQty ?? 0)} units sold`,
      icon: <DollarSign size={20} />,
      color: '#10b981',
    },
    {
      label: 'Total Cost',
      value: totals?.totalCost ?? ledger?.cost ?? 0,
      sub: `${formatInt(totals?.assignedQty ?? 0)} units assigned`,
      icon: <TrendingDown size={20} />,
      color: '#ef4444',
    },
    {
      label: 'Profit / Loss',
      value: totals?.grossProfit ?? ledger?.grossProfit ?? 0,
      sub: `${pct(totals?.profitMargin ?? 0)} gross margin`,
      icon: <Award size={20} />,
      color: profitColor(totals?.grossProfit ?? ledger?.grossProfit ?? 0),
    },
    {
      label: 'Net After Expenses',
      value: ledger?.netProfit ?? 0,
      sub: `${formatBDT(ledger?.expenses ?? 0)} expenses`,
      icon: <Calculator size={20} />,
      color: profitColor(ledger?.netProfit ?? 0),
    },
  ];

  return (
    <MainLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }} className="animate-fade-in">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                padding: '12px',
                background: 'rgba(16,185,129,0.1)',
                borderRadius: '14px',
                color: 'var(--primary)',
                border: '1px solid rgba(16,185,129,0.2)',
              }}
            >
              <Calculator size={26} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-main)', lineHeight: 1 }}>
                Accounting Profit Analysis
              </h1>
              <p style={{ marginTop: '6px', fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.22em' }}>
                Monthly sell, cost, batch margin, van assignment and loss
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="month"
              className="input-premium"
              value={month}
              max={currentMonthISO()}
              onChange={(e) => resetPageAnd(() => setMonth(e.target.value))}
              style={{ height: '40px' }}
            />
            <button className="btn-secondary" onClick={refresh} style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '40px' }}>
              <RefreshCcw size={14} /> Recalculate
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {kpis.map((kpi) => (
            <div key={kpi.label} className="card" style={{ position: 'relative', overflow: 'hidden', minHeight: '130px' }}>
              <div style={{ position: 'absolute', top: '18px', right: '18px', opacity: 0.08, color: kpi.color }}>{kpi.icon}</div>
              <p style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>{kpi.label}</p>
              <p style={{ marginTop: '1rem', fontSize: '1.65rem', fontWeight: 900, color: kpi.color, fontStyle: 'italic', fontVariantNumeric: 'tabular-nums' }}>
                {batchVanQ.isLoading || ledgerQ.isLoading ? '...' : formatBDT(kpi.value)}
              </p>
              <p style={{ marginTop: '6px', fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {kpi.sub}
              </p>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'end', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', alignSelf: 'center', marginRight: '0.25rem' }}>
            <Filter size={16} style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-main)' }}>Filters</span>
          </div>
          <div>
            <label style={labelStyle}>Van</label>
            <select className="input-premium" value={vanId} onChange={(e) => resetPageAnd(() => setVanId(e.target.value))}>
              <option value="">All vans</option>
              {vans.map((van) => (
                <option key={van.vanId} value={van.vanId}>
                  {van.vanName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Product</label>
            <select className="input-premium" value={productId} onChange={(e) => resetPageAnd(() => setProductId(e.target.value))}>
              <option value="">All products</option>
              {(productsQ.data?.data ?? []).map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Batch</label>
            <input
              className="input-premium"
              value={batchId}
              onChange={(e) => resetPageAnd(() => setBatchId(e.target.value.toUpperCase()))}
              placeholder="BAT-001"
              style={{ width: '150px' }}
            />
          </div>
          {activeFilters && (
            <button className="btn-action clear-filter-btn" onClick={clearFilters} style={{ height: '40px' }}>
              Clear
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(320px, 0.8fr)', gap: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}>
            <SectionHeader
              icon={<Boxes size={18} />}
              title="Batch Wise Monthly Profit"
              subtitle="Each row shows van assignment, sold quantity, sell, cost, loss and margin for the selected month"
            />
            <DataTable<BatchVanProfitabilityRow>
              columns={[
                {
                  key: 'batch',
                  label: 'Batch / Van',
                  render: (row) => (
                    <div>
                      <div style={{ fontWeight: 900, color: 'var(--text-main)', fontSize: '13px' }}>{row.batchId}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>
                        {formatDateDhaka(row.date)} · {row.source}
                      </div>
                      <div style={{ marginTop: '4px', fontSize: '10px', color: 'var(--primary)', fontWeight: 900 }}>
                        {row.vanName}
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'assigned',
                  label: 'Assigned',
                  render: (row) => (
                    <AmountStack top={`${formatInt(row.assignedQty)} units`} bottom={formatBDT(row.assignedCost)} />
                  ),
                },
                {
                  key: 'sold',
                  label: 'Sold / Sell',
                  render: (row) => (
                    <AmountStack top={`${formatInt(row.soldQty)} units`} bottom={formatBDT(row.soldRevenue)} />
                  ),
                },
                {
                  key: 'cost',
                  label: 'Cost',
                  render: (row) => <strong style={{ color: '#ef4444', fontVariantNumeric: 'tabular-nums' }}>{formatBDT(row.soldCogs)}</strong>,
                },
                {
                  key: 'loss',
                  label: 'Loss',
                  render: (row) => (
                    <AmountStack top={`${formatInt(row.lossQty)} units`} bottom={formatBDT(row.lossCost)} color={row.lossCost > 0 ? '#ef4444' : undefined} />
                  ),
                },
                {
                  key: 'profit',
                  label: 'Profit / Margin',
                  render: (row) => (
                    <div>
                      <div style={{ fontWeight: 900, color: profitColor(row.grossProfit), fontVariantNumeric: 'tabular-nums' }}>{formatBDT(row.grossProfit)}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800 }}>{pct(row.profitMargin)}</div>
                    </div>
                  ),
                },
                {
                  key: 'remaining',
                  label: 'Van Stock',
                  render: (row) => <strong>{formatInt(row.remainingQty)} units</strong>,
                },
              ]}
              data={rows}
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              totalItems={batchVanQ.data?.total ?? 0}
              pageSize={PAGE_SIZE}
              getId={(row) => `${row.batchId}-${row.vanId}`}
              onRowClick={(row) => setSelectedBatchId(row.batchId)}
              emptyMessage={batchVanQ.isLoading ? 'Loading accounting rows...' : 'No batch profit rows'}
              emptyDescription="Try another month, van, product or batch filter"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <SectionHeader icon={<Award size={18} />} title="Top Van" subtitle={`Best net profit in ${month}`} compact />
              {topVan ? (
                <>
                  <button
                    onClick={() => resetPageAnd(() => setVanId(topVan.vanId))}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.85rem',
                      padding: '0.9rem',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      background: 'var(--overlay-soft)',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <Truck size={22} style={{ color: '#f59e0b' }} />
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 900, color: 'var(--text-main)' }}>{topVan.vanName}</p>
                      <p style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)' }}>{formatBDT(topVan.netProfit)} net profit</p>
                    </div>
                  </button>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <MiniStat label="Revenue" value={formatBDT(topVan.revenue)} />
                    <MiniStat label="COGS" value={formatBDT(topVan.cogs)} color="#ef4444" />
                  </div>
                </>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 800 }}>No van activity this month.</p>
              )}
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--overlay-soft)' }}>
                <SectionHeader icon={<TrendingUp size={18} />} title="Van Profitability" subtitle="Click a van to filter batch rows" compact />
              </div>
              <div style={{ maxHeight: '520px', overflow: 'auto' }} className="custom-scrollbar">
                {vanQ.isLoading ? (
                  <p style={{ padding: '1.5rem', color: 'var(--text-muted)', fontWeight: 800 }}>Loading vans...</p>
                ) : (
                  vans.map((van) => <VanProfitRow key={van.vanId} van={van} active={van.vanId === vanId} onClick={() => resetPageAnd(() => setVanId(van.vanId))} />)
                )}
              </div>
            </div>

            <div className="card">
              <SectionHeader icon={<Package size={18} />} title="Batch Coverage" subtitle="Selected month summary" compact />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem' }}>
                <MiniStat label="Batches" value={formatInt(totals?.batchCount ?? 0)} />
                <MiniStat label="Assigned Cost" value={formatBDT(totals?.assignedCost ?? 0)} />
                <MiniStat label="Loss Qty" value={`${formatInt(totals?.lossQty ?? 0)} units`} color="#ef4444" />
                <MiniStat label="Loss Cost" value={formatBDT(totals?.lossCost ?? 0)} color="#ef4444" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedBatchId && (
        <BatchDetailSheet
          batchId={selectedBatchId}
          monthlyRows={rows.filter((row) => row.batchId === selectedBatchId)}
          onClose={() => setSelectedBatchId(null)}
        />
      )}
    </MainLayout>
  );
}

function SectionHeader({ icon, title, subtitle, compact = false }: { icon: React.ReactNode; title: string; subtitle: string; compact?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{ color: 'var(--primary)', display: 'flex' }}>{icon}</div>
      <div>
        <h2 style={{ fontSize: compact ? '12px' : '15px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-main)' }}>
          {title}
        </h2>
        <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.65 }}>
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function AmountStack({ top, bottom, color }: { top: string; bottom: string; color?: string }) {
  return (
    <div>
      <div style={{ fontWeight: 900, color: color ?? 'var(--text-main)', fontVariantNumeric: 'tabular-nums' }}>{top}</div>
      <div style={{ fontSize: '10px', color: color ?? 'var(--text-muted)', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{bottom}</div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ padding: '0.85rem', background: 'var(--overlay-soft)', border: '1px solid var(--border)', borderRadius: '8px' }}>
      <p style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: '5px' }}>{label}</p>
      <p style={{ fontSize: '13px', fontWeight: 900, color: color ?? 'var(--text-main)', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
    </div>
  );
}

function VanProfitRow({ van, active, onClick }: { van: VanProfitabilityRow; active: boolean; onClick: () => void }) {
  const margin = van.revenue > 0 ? (van.netProfit / van.revenue) * 100 : 0;
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        border: 'none',
        borderBottom: '1px solid var(--border)',
        background: active ? 'rgba(16,185,129,0.08)' : 'transparent',
        padding: '1rem 1.25rem',
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: '0.75rem',
        textAlign: 'left',
        cursor: 'pointer',
      }}
    >
      <div>
        <p style={{ fontSize: '12px', fontWeight: 900, color: 'var(--text-main)' }}>{van.vanName}</p>
        <p style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)' }}>
          Sell {formatBDT(van.revenue)} · Cost {formatBDT(van.cogs)}
        </p>
      </div>
      <div style={{ textAlign: 'right' }}>
        <p style={{ fontSize: '13px', fontWeight: 900, color: profitColor(van.netProfit), fontVariantNumeric: 'tabular-nums' }}>{formatBDT(van.netProfit)}</p>
        <p style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)' }}>{pct(margin)}</p>
      </div>
    </button>
  );
}

function BatchDetailSheet({ batchId, monthlyRows, onClose }: { batchId: string; monthlyRows: BatchVanProfitabilityRow[]; onClose: () => void }) {
  const { data: batch, isLoading } = useBatchProfitabilityDetail(batchId);
  const monthly = monthlyRows.reduce(
    (acc, row) => ({
      sell: acc.sell + row.soldRevenue,
      cost: acc.cost + row.soldCogs,
      profit: acc.profit + row.grossProfit,
      assignedQty: acc.assignedQty + row.assignedQty,
      soldQty: acc.soldQty + row.soldQty,
      lossCost: acc.lossCost + row.lossCost,
    }),
    { sell: 0, cost: 0, profit: 0, assignedQty: 0, soldQty: 0, lossCost: 0 },
  );

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet-content animate-fade-in custom-scrollbar" style={{ maxWidth: '920px', padding: 0 }} onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            padding: '1.35rem 2rem',
            borderBottom: '1px solid var(--overlay-medium)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface)',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <SectionHeader icon={<Package size={22} />} title={`${batchId} Batch Detail`} subtitle={batch ? `${formatDateDhaka(batch.date)} · ${batch.source}` : 'Loading...'} />
          <button onClick={onClose} style={{ padding: '8px', borderRadius: '10px', background: 'var(--overlay-soft)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {isLoading || !batch ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 800 }}>Loading batch...</div>
        ) : (
          <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.85rem' }}>
              <MiniStat label="Month Sell" value={formatBDT(monthly.sell)} color="#10b981" />
              <MiniStat label="Month Cost" value={formatBDT(monthly.cost)} color="#ef4444" />
              <MiniStat label="Month Profit" value={formatBDT(monthly.profit)} color={profitColor(monthly.profit)} />
              <MiniStat label="Month Loss Cost" value={formatBDT(monthly.lossCost)} color="#ef4444" />
              <MiniStat label="Assigned" value={`${formatInt(monthly.assignedQty)} units`} />
              <MiniStat label="Sold" value={`${formatInt(monthly.soldQty)} units`} />
            </div>

            <BatchLifecycleSummary batch={batch} />

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--overlay-soft)' }}>
                <SectionHeader icon={<Boxes size={16} />} title="Per Product Lifecycle" subtitle="Total batch cost, sales, remaining and potential revenue" compact />
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Product', 'Received', 'Cost', 'Sold', 'Sell', 'COGS', 'Remaining', 'Potential'].map((h) => (
                        <th key={h} className="table-header" style={{ background: 'transparent' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {batch.products.map((product) => (
                      <tr key={product.productId} className="table-row">
                        <td className="table-cell">
                          <strong>{product.productName}</strong>
                        </td>
                        <td className="table-cell">{formatInt(product.receivedQty)}</td>
                        <td className="table-cell">{formatBDT(product.cost)}</td>
                        <td className="table-cell">{formatInt(product.soldQty)}</td>
                        <td className="table-cell">{formatBDT(product.soldRevenue)}</td>
                        <td className="table-cell">{formatBDT(product.realizedCogs)}</td>
                        <td className="table-cell">{formatInt(product.remainingQty)}</td>
                        <td className="table-cell" style={{ color: '#3b82f6', fontWeight: 800 }}>
                          {formatBDT(product.potentialRevenue)}
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
    </div>
  );
}

function BatchLifecycleSummary({ batch }: { batch: BatchProfitSummary }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.85rem' }}>
      <MiniStat label="Total Batch Cost" value={formatBDT(batch.totalCost)} />
      <MiniStat label="Realized Sell" value={formatBDT(batch.soldRevenue)} color="#10b981" />
      <MiniStat label="Realized Profit" value={formatBDT(batch.realizedProfit)} color={profitColor(batch.realizedProfit)} />
      <MiniStat label="Remaining" value={`${formatInt(batch.remainingQty)} units`} />
      <MiniStat label="Total Loss Cost" value={formatBDT(batch.totalLossCost)} color="#ef4444" />
      <MiniStat label="Projected Total" value={formatBDT(batch.projectedProfitIfAllSold)} color={profitColor(batch.projectedProfitIfAllSold)} />
    </div>
  );
}
