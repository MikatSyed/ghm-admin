'use client';

import React, { useState } from 'react';
import MainLayout from '@/components/MainLayout';
import MetricCard from '@/components/MetricCard';
import {
  useDashboardMetrics,
  useDashboardSeries,
  useDashboardVans,
  useDashboardCategories,
  useDashboardLowStock,
  useDashboardActivity,
} from '@/hooks/api';
import type { Timeframe } from '@/lib/types';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Calculator,
  PackageOpen,
  AlertTriangle,
  FileText,
  TrendingUp,
  Download,
  RefreshCcw,
  Truck,
  Boxes,
  Loader2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const CATEGORY_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#6b7280', '#ef4444', '#06b6d4'];

const fmt = (n: number) => {
  if (n === undefined || n === null) return '৳0';
  return n >= 1_000_000
    ? `৳${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `৳${(n / 1_000).toFixed(0)}K`
    : `৳${n.toLocaleString()}`;
};

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ color: string; name: string; value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(10,10,10,0.95)',
      backdropFilter: 'blur(12px)',
      border: '1px solid var(--overlay-strong)',
      borderRadius: '14px',
      padding: '0.875rem 1rem',
      boxShadow: '0 16px 48px var(--overlay-shadow)',
    }}>
      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px', fontWeight: 900 }}>
        {label}
      </p>
      {payload.map((e, i) => (
        <p key={i} style={{ fontSize: '12px', color: e.color, fontWeight: 900, marginBottom: '2px' }}>
          {e.name}:{' '}
          <span style={{ color: 'var(--text-main)' }}>
            {e.name.toLowerCase().includes('stock') ? `${(e.value ?? 0).toLocaleString()} kg` : fmt(e.value)}
          </span>
        </p>
      ))}
    </div>
  );
}

const TIMEFRAMES: Timeframe[] = ['daily', 'weekly', 'monthly', 'yearly'];

export default function DashboardPage() {
  const [tf, setTf] = useState<Timeframe>('daily');

  const metricsQ = useDashboardMetrics();
  const seriesQ = useDashboardSeries(tf);
  const vansQ = useDashboardVans();
  const categoriesQ = useDashboardCategories();
  const lowStockQ = useDashboardLowStock();
  const activityQ = useDashboardActivity(8);

  const metrics = metricsQ.data;
  const series = seriesQ.data ?? [];
  const vanPerformance = vansQ.data ?? [];
  const categoryBreakdown = (categoriesQ.data ?? []).map((c, i) => ({ ...c, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }));
  const lowStockItems = lowStockQ.data ?? [];
  const recentTransactions = activityQ.data ?? [];

  const kpis = [
    {
      title: `${tf.charAt(0).toUpperCase() + tf.slice(1)} Revenue`,
      value: metrics ? fmt(metrics.todayRevenue) : '—',
      subtitle: 'Total sales today',
      icon: <ArrowUpRight size={22} />,
      color: '#10b981',
    },
    {
      title: `${tf.charAt(0).toUpperCase() + tf.slice(1)} Burn Rate`,
      value: metrics ? fmt(metrics.todayExpenses) : '—',
      subtitle: 'Total operating costs',
      icon: <ArrowDownLeft size={22} />,
      color: '#ef4444',
    },
    {
      title: `${tf.charAt(0).toUpperCase() + tf.slice(1)} Net Profit`,
      value: metrics ? fmt(metrics.todayProfit) : '—',
      subtitle: 'Net profit after expenses',
      icon: <Calculator size={22} />,
      color: '#3b82f6',
    },
    {
      title: 'Stock On Hand',
      value: metrics ? `${(metrics.stockOnHand ?? 0).toLocaleString()}` : '—',
      subtitle: `Low stock: ${metrics?.lowStockCount ?? 0} items`,
      icon: <PackageOpen size={22} />,
      color: '#f59e0b',
    },
  ];

  return (
    <MainLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }} className="animate-fade-in">

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              padding: '14px',
              background: 'rgba(16,185,129,0.1)',
              borderRadius: '18px',
              color: 'var(--primary)',
              border: '1px solid rgba(16,185,129,0.2)',
              boxShadow: '0 0 24px rgba(16,185,129,0.1)',
            }}>
              <TrendingUp size={28} />
            </div>
            <div>
              <h1 style={{
                fontSize: '2rem',
                fontWeight: 900,
                letterSpacing: '-0.03em',
                color: 'var(--text-main)',
                textTransform: 'uppercase',
                fontStyle: 'italic',
                lineHeight: 1.1,
              }}>
                Business<span style={{ color: 'var(--primary)' }}> Overview</span>
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981', animation: 'pulse 2s infinite' }} />
                <p style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3em', opacity: 0.6 }}>
                  Live Status Stream · {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              boxShadow: '0 4px 20px var(--overlay-shadow)',
            }}>
              {TIMEFRAMES.map((t) => (
                <button
                  key={t}
                  onClick={() => setTf(t)}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '10px',
                    fontSize: '10px',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    background: tf === t ? 'var(--primary)' : 'transparent',
                    color: tf === t ? 'white' : 'var(--text-muted)',
                    boxShadow: tf === t ? '0 4px 15px rgba(16,185,129,0.3)' : 'none',
                    transform: tf === t ? 'scale(1.02)' : 'scale(1)',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            <button
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
            >
              <Download size={14} />
              Export
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
          {kpis.map((kpi) => (
            <MetricCard key={kpi.title} {...kpi} />
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem' }}>
          <section className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '4px', height: '28px', background: 'var(--primary)', borderRadius: '99px', boxShadow: '0 0 12px rgba(16,185,129,0.5)' }} />
                <div>
                  <h3 style={{ fontSize: '13px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-main)' }}>
                    Revenue Breakdown
                  </h3>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.5, marginTop: '2px' }}>
                    Income growth over time
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {[{ c: '#10b981', l: 'Revenue' }, { c: '#3b82f6', l: 'Profit' }, { c: '#ef4444', l: 'Cost' }].map(x => (
                  <div key={x.l} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: x.c }} />
                    <span style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{x.l}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ height: '280px' }}>
              {seriesQ.isLoading ? <ChartLoading /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gCost" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" vertical={false} />
                    <XAxis dataKey="label" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} dy={8} fontWeight={700} />
                    <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} dx={-4} fontWeight={700} tickFormatter={(v) => fmt(v)} />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(16,185,129,0.3)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#gRev)" dot={false} activeDot={{ r: 5, fill: '#10b981', stroke: '#080808', strokeWidth: 2 }} />
                    <Area type="monotone" dataKey="profit" name="Profit" stroke="#3b82f6" strokeWidth={2.5} fill="url(#gProfit)" dot={false} activeDot={{ r: 5, fill: '#3b82f6', stroke: '#080808', strokeWidth: 2 }} />
                    <Area type="monotone" dataKey="cost" name="Cost" stroke="#ef4444" strokeWidth={2} fill="url(#gCost)" dot={false} activeDot={{ r: 4, fill: '#ef4444', stroke: '#080808', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <section className="card" style={{ padding: '1.5rem' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-main)' }}>
                Category Mix
              </h3>
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.5, marginTop: '2px' }}>
                Revenue distribution
              </p>
            </div>
            <div style={{ height: '200px', position: 'relative' }}>
              {categoriesQ.isLoading ? <ChartLoading /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {categoryBreakdown.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) =>
                        active && payload?.[0] ? (
                          <div style={{ background: 'rgba(10,10,10,0.95)', border: '1px solid var(--overlay-strong)', borderRadius: '12px', padding: '8px 12px' }}>
                            <p style={{ fontSize: '11px', fontWeight: 900, color: 'var(--text-main)', textTransform: 'uppercase' }}>
                              {payload[0].name}: <span style={{ color: 'var(--primary)' }}>{String(payload[0].value)}%</span>
                            </p>
                          </div>
                        ) : null
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-main)', lineHeight: 1, fontStyle: 'italic' }}>{categoryBreakdown.length}</p>
                  <p style={{ fontSize: '9px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.2em', marginTop: '2px', opacity: 0.5 }}>Classes</p>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '1rem' }}>
              {categoryBreakdown.map((item) => (
                <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--overlay-soft)', borderRadius: '10px', border: '1px solid var(--overlay-soft)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                    <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.name}</p>
                  </div>
                  <p style={{ fontSize: '11px', fontWeight: 900, color: 'var(--text-main)' }}>{item.value}%</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <section className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ width: '4px', height: '28px', background: '#8b5cf6', borderRadius: '99px', boxShadow: '0 0 12px rgba(139,92,246,0.5)' }} />
              <div>
                <h3 style={{ fontSize: '13px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-main)' }}>
                  Deployment Revenue
                </h3>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.5, marginTop: '2px' }}>
                  Per-van yield comparison
                </p>
              </div>
            </div>
            <div style={{ height: '240px' }}>
              {vansQ.isLoading ? <ChartLoading /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={vanPerformance} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" vertical={false} />
                    <XAxis dataKey="van" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} dy={8} fontWeight={700} />
                    <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} dx={-4} fontWeight={700} tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}K`} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--overlay-soft)' }} />
                    <Bar dataKey="revenue" name="Revenue" fill="#8b5cf6" radius={[6, 6, 0, 0]} maxBarSize={40}>
                      {vanPerformance.map((entry, i) => (
                        <Cell key={i} fill={entry.efficiency >= 90 ? '#10b981' : entry.efficiency >= 80 ? '#8b5cf6' : '#f59e0b'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <section className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ width: '4px', height: '28px', background: '#f59e0b', borderRadius: '99px', boxShadow: '0 0 12px rgba(245,158,11,0.5)' }} />
              <div>
                <h3 style={{ fontSize: '13px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-main)' }}>
                  Fleet Efficiency
                </h3>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.5, marginTop: '2px' }}>
                  Efficiency % · returned stock
                </p>
              </div>
            </div>
            <div style={{ height: '240px' }}>
              {vansQ.isLoading ? <ChartLoading /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={vanPerformance} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" vertical={false} />
                    <XAxis dataKey="van" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} dy={8} fontWeight={700} />
                    <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} dx={-4} fontWeight={700} />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(245,158,11,0.3)', strokeWidth: 1 }} />
                    <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: '16px' }} />
                    <Line type="monotone" dataKey="efficiency" name="Efficiency %" stroke="#10b981" strokeWidth={2.5} dot={{ r: 5, fill: '#10b981', stroke: '#080808', strokeWidth: 2 }} activeDot={{ r: 7 }} />
                    <Line type="monotone" dataKey="returned" name="Returned" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 4, fill: '#ef4444', stroke: '#080808', strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>
        </div>

        <section className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '4px', height: '28px', background: '#06b6d4', borderRadius: '99px', boxShadow: '0 0 12px rgba(6,182,212,0.5)' }} />
              <div>
                <h3 style={{ fontSize: '13px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-main)' }}>
                  Stock Inflow Timeline
                </h3>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.5, marginTop: '2px' }}>
                  Inventory arrival volume · {tf}
                </p>
              </div>
            </div>
            <button
              className="btn-secondary"
              onClick={() => seriesQ.refetch()}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '10px' }}
            >
              <RefreshCcw size={12} /> Refresh
            </button>
          </div>
          <div style={{ height: '200px' }}>
            {seriesQ.isLoading ? <ChartLoading /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" vertical={false} />
                  <XAxis dataKey="label" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} dy={8} fontWeight={700} />
                  <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} dx={-4} fontWeight={700} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(6,182,212,0.04)' }} />
                  <Bar dataKey="stock" name="Stock" fill="#06b6d4" radius={[4, 4, 0, 0]} maxBarSize={32} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem' }}>
          <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--overlay-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Truck size={16} style={{ color: 'var(--primary)' }} />
                <div>
                  <h3 style={{ fontSize: '13px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-main)' }}>
                    Van Performance
                  </h3>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.5, marginTop: '2px' }}>
                    Performance per Van
                  </p>
                </div>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Deployment Unit', 'Revenue', 'Returned', 'Efficiency'].map((h) => (
                      <th key={h} className="table-header">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vansQ.isLoading ? (
                    <tr><td colSpan={4} style={{ padding: '3rem', textAlign: 'center' }}><Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-muted)' }} /></td></tr>
                  ) : vanPerformance.map((van) => (
                    <tr key={van.van} className="table-row">
                      <td className="table-cell">
                        <div style={{ fontWeight: 900, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '-0.02em', fontSize: '13px' }}>{van.van}</div>
                      </td>
                      <td className="table-cell" style={{ fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>৳{(van.revenue ?? 0).toLocaleString()}</td>
                      <td className="table-cell">
                        <span style={{ fontWeight: 900, color: van.returned > 20 ? '#ef4444' : '#10b981' }}>
                          {van.returned}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ flex: 1, height: '5px', background: 'var(--overlay-medium)', borderRadius: '99px', overflow: 'hidden', minWidth: '60px' }}>
                            <div style={{
                              height: '100%',
                              width: `${van.efficiency}%`,
                              background: van.efficiency >= 95 ? '#10b981' : van.efficiency >= 80 ? '#f59e0b' : '#ef4444',
                              borderRadius: '99px',
                              boxShadow: `0 0 8px ${van.efficiency >= 95 ? 'rgba(16,185,129,0.4)' : van.efficiency >= 80 ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.4)'}`,
                              transition: 'width 1s ease',
                            }} />
                          </div>
                          <span style={{
                            fontSize: '9px',
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: van.efficiency >= 90 ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                            color: van.efficiency >= 90 ? '#10b981' : '#f59e0b',
                            border: `1px solid ${van.efficiency >= 90 ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
                          }}>
                            {van.efficiency}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <section className="card" style={{ background: 'rgba(239,68,68,0.02)', borderColor: 'rgba(239,68,68,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ padding: '10px', background: 'rgba(239,68,68,0.1)', borderRadius: '12px', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-main)' }}>Low Stock Alerts</h3>
                  <p style={{ fontSize: '9px', fontWeight: 900, color: 'rgba(239,68,68,0.6)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Items running low</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {lowStockItems.length === 0 && !lowStockQ.isLoading && (
                  <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', opacity: 0.5, textAlign: 'center', padding: '0.5rem' }}>
                    All stock levels healthy
                  </p>
                )}
                {lowStockItems.map((item) => (
                  <div
                    key={item.productId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: 'var(--background)',
                      border: '1px solid var(--border)',
                    }}
                    className="notif-item"
                  >
                    <span style={{ fontSize: '12px', fontWeight: 900, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>{item.name}</span>
                    <span style={{
                      fontSize: '9px',
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: 'rgba(239,68,68,0.1)',
                      color: '#ef4444',
                      border: '1px solid rgba(239,68,68,0.2)',
                    }}>
                      {item.stock} {item.unit}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="card" style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <Boxes size={16} style={{ color: 'var(--primary)' }} />
                <div>
                  <h3 style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-main)' }}>Recent Activity</h3>
                  <p style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', opacity: 0.5 }}>Latest records</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
                {recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      transition: 'background 0.2s ease',
                    }}
                    className="notif-item"
                  >
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: tx.type === 'sale' ? '#10b981' : tx.type === 'expense' ? '#ef4444' : '#3b82f6',
                      flexShrink: 0,
                      boxShadow: `0 0 6px ${tx.type === 'sale' ? 'rgba(16,185,129,0.5)' : tx.type === 'expense' ? 'rgba(239,68,68,0.5)' : 'rgba(59,130,246,0.5)'}`,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tx.description}
                      </p>
                      <p style={{ fontSize: '9px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.5 }}>
                        {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 900,
                      color: tx.amount < 0 ? '#ef4444' : '#10b981',
                      fontVariantNumeric: 'tabular-nums',
                      flexShrink: 0,
                    }}>
                      {tx.amount < 0 ? '-' : '+'}৳{Math.abs(tx.amount ?? 0).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border)',
            background: 'var(--overlay-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '8px', background: 'rgba(139,92,246,0.1)', borderRadius: '10px', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.2)' }}>
                <FileText size={16} />
              </div>
              <div>
                <h3 style={{ fontSize: '13px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-main)' }}>Transaction History</h3>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.5, marginTop: '2px' }}>
                  Full record of system activities
                </p>
              </div>
            </div>
            <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '10px' }}>
              <Download size={12} /> Export
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Audit ID', 'Observation', 'Timestamp', 'Magnitude', 'Status'].map((h) => (
                    <th key={h} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="table-row">
                    <td className="table-cell" style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', fontSize: '12px' }}>{tx.id}</td>
                    <td className="table-cell" style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '13px' }}>{tx.description}</td>
                    <td className="table-cell" style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="table-cell" style={{
                      fontWeight: 900,
                      fontVariantNumeric: 'tabular-nums',
                      color: tx.amount < 0 ? '#ef4444' : '#10b981',
                    }}>
                      {tx.amount < 0 ? '-' : '+'}৳{Math.abs(tx.amount ?? 0).toLocaleString()}
                    </td>
                    <td className="table-cell">
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '9px',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        background: tx.type === 'sale' ? 'rgba(16,185,129,0.1)' : tx.type === 'expense' ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)',
                        color: tx.type === 'sale' ? '#10b981' : tx.type === 'expense' ? '#ef4444' : '#3b82f6',
                        border: `1px solid ${tx.type === 'sale' ? 'rgba(16,185,129,0.2)' : tx.type === 'expense' ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)'}`,
                      }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'currentColor' }} />
                        {tx.type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </MainLayout>
  );
}

function ChartLoading() {
  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={24} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
    </div>
  );
}
