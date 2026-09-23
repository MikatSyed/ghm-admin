'use client';

import React, { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Filter, PlusCircle, Store } from 'lucide-react';
import MainLayout from '@/components/MainLayout';
import VanAdjustmentPopup from '@/components/VanAdjustmentPopup';
import DirectSaleModal from '@/components/sales/DirectSaleModal';
import SalesPOSModal from '@/components/sales/SalesPOSModal';
import VanDayCard, { type VanDayAdjustArgs } from '@/components/sales/VanDayCard';
import { StatTile } from '@/components/ui/StatTile';
import { formatBDT, formatInt, todayInDhakaISO } from '@/lib/format';
import { useDashboardVans, useSales, useVans } from '@/hooks/api';

type ActiveAction =
  | { kind: 'pos'; vanId: string | null }
  | { kind: 'direct' }
  | ({ kind: 'adjust' } & VanDayAdjustArgs)
  | null;

export default function TodayPage() {
  return (
    <Suspense fallback={<TodayFallback />}>
      <TodayContent />
    </Suspense>
  );
}

function TodayContent() {
  const router = useRouter();
  const search = useSearchParams();
  const today = todayInDhakaISO();
  const date = search.get('date') || today;
  const isToday = date === today;
  const [activeAction, setActiveAction] = useState<ActiveAction>(null);
  const [vanFilter, setVanFilter] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'allocated' | 'empty'>('all');

  const vansQ = useVans();
  const salesQ = useSales({ dateFrom: date, dateTo: date, pageSize: 200, sort: '-date,-createdAt' });
  const vansPerfQ = useDashboardVans();

  const activeVans = useMemo(() => (vansQ.data ?? []).filter((v) => v.isActive !== false), [vansQ.data]);
  const perVan = useMemo(() => {
    const map = new Map<string, { revenue: number; count: number }>();
    for (const sale of salesQ.data?.data ?? []) {
      if (!sale.vanId) continue; // direct/customer sales aren't bucketed per van here
      const current = map.get(sale.vanId) ?? { revenue: 0, count: 0 };
      current.revenue += sale.total;
      current.count += 1;
      map.set(sale.vanId, current);
    }
    return map;
  }, [salesQ.data]);
  const visibleVans = useMemo(() => {
    return activeVans.filter((van) => {
      if (vanFilter && van.id !== vanFilter) return false;
      if (stockFilter === 'all') return true;
      const hasStock = (van.todaySummary?.allocated ?? 0) > 0 || perVan.has(van.id);
      return stockFilter === 'allocated' ? hasStock : !hasStock;
    });
  }, [activeVans, perVan, stockFilter, vanFilter]);

  // Derived from the same salesQ list that feeds perVan below, so this tile
  // can never disagree with the sum of the van cards on this page.
  const todayRevenue = useMemo(
    () => (salesQ.data?.data ?? []).reduce((sum, sale) => sum + sale.total, 0),
    [salesQ.data],
  );
  const todayInvoices = salesQ.data?.total ?? 0;
  const avgTicket = todayInvoices > 0 ? todayRevenue / todayInvoices : 0;
  const topVan = useMemo(() => [...(vansPerfQ.data ?? [])].sort((a, b) => b.revenue - a.revenue)[0], [vansPerfQ.data]);

  function setDate(nextDate: string) {
    router.replace(`/dashboard/sales?date=${nextDate}`);
  }

  return (
    <MainLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '30px', fontWeight: 900, color: 'var(--text-main)', textTransform: 'uppercase' }}>
              {isToday ? 'Today' : `Day · ${date}`}
            </h1>
            <p style={{ marginTop: '0.25rem', color: 'var(--text-muted)', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.24em' }}>
              Van sales · stock variance · returns · damage · wastage
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'end', gap: '0.75rem', flexWrap: 'wrap' }}>
            <SalesDatePicker value={date} max={today} onChange={setDate} />
            {isToday && (
              <>
                <button className="btn-secondary" onClick={() => setActiveAction({ kind: 'direct' })} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Store size={15} /> Direct Sale
                </button>
                <button className="btn-primary" onClick={() => setActiveAction({ kind: 'pos', vanId: null })} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                  <PlusCircle size={15} /> Quick Sale
                </button>
              </>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: '0.9rem 1rem', display: 'flex', alignItems: 'end', gap: '0.75rem', flexWrap: 'wrap', boxShadow: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', alignSelf: 'center', marginRight: '0.25rem' }}>
            <Filter size={15} style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-main)' }}>Filters</span>
          </div>
          <SelectField label="Van" value={vanFilter} onChange={setVanFilter} minWidth={190}>
            <option value="">All vans</option>
            {activeVans.map((van) => (
              <option key={van.id} value={van.id}>{van.vanName}</option>
            ))}
          </SelectField>
          <SelectField label="Stock" value={stockFilter} onChange={(value) => setStockFilter(value as typeof stockFilter)} minWidth={190}>
            <option value="all">All stock states</option>
            <option value="allocated">Allocated / sold</option>
            <option value="empty">No stock</option>
          </SelectField>
          {(vanFilter || stockFilter !== 'all') && (
            <button className="btn-action clear-filter-btn" onClick={() => { setVanFilter(''); setStockFilter('all'); }} style={{ height: '40px' }}>
              Clear
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <StatTile label="Today Revenue" value={formatBDT(todayRevenue, 'compact')} loading={salesQ.isLoading} />
          <StatTile label="Today Sales" value={formatInt(todayInvoices)} loading={salesQ.isLoading} accent="success" />
          <StatTile label="Avg Ticket" value={formatBDT(avgTicket)} loading={salesQ.isLoading} accent="warning" />
          <StatTile label="Top Van" value={topVan?.van ?? 'N/A'} hint={topVan ? formatBDT(topVan.revenue, 'compact') : undefined} loading={vansPerfQ.isLoading} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {vansQ.isLoading && [0, 1].map((i) => (
            <div key={i} className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="skeleton skeleton-line" style={{ width: '35%', height: '22px' }} />
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line" />
            </div>
          ))}
          {!vansQ.isLoading && visibleVans.map((van) => {
            const stats = perVan.get(van.id);
            return (
              <VanDayCard
                key={van.id}
                van={van}
                date={date}
                todayRevenue={stats?.revenue ?? 0}
                todaySaleCount={stats?.count ?? 0}
                onOpenPOS={(nextVanId) => setActiveAction({ kind: 'pos', vanId: nextVanId })}
                onOpenAdjust={(args) => setActiveAction({ kind: 'adjust', ...args })}
              />
            );
          })}
          {!vansQ.isLoading && visibleVans.length === 0 && (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 800, boxShadow: 'none' }}>
              No vans match the selected filters.
            </div>
          )}
        </div>
      </div>

      {activeAction?.kind === 'pos' && (
        <SalesPOSModal vanId={activeAction.vanId} date={date} onClose={() => setActiveAction(null)} />
      )}

      {activeAction?.kind === 'direct' && (
        <DirectSaleModal onClose={() => setActiveAction(null)} />
      )}

      {activeAction?.kind === 'adjust' && (
        <VanAdjustmentPopup
          vanId={activeAction.vanId}
          date={date}
          distributionId={activeAction.distributionId}
          productId={activeAction.productId}
          productName={activeAction.productName}
          productUnit={activeAction.productUnit}
          available={activeAction.available}
          currentReturned={activeAction.currentReturned}
          currentDamage={activeAction.currentDamage}
          distributionLineId={activeAction.distributionLineId}
          defaultPrice={activeAction.defaultPrice}
          initialType={activeAction.type}
          onClose={() => setActiveAction(null)}
          onSubmitted={() => setActiveAction(null)}
        />
      )}
    </MainLayout>
  );
}

function SelectField({ label, value, onChange, children, minWidth }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode; minWidth: number }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <span style={{ fontSize: '9px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>{label}</span>
      <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            appearance: 'none',
            WebkitAppearance: 'none',
            height: '42px',
            minWidth,
            border: '1px solid var(--border)',
            borderRadius: '12px',
            background: 'var(--surface)',
            color: 'var(--text-main)',
            padding: '0 2.4rem 0 0.9rem',
            fontSize: '13px',
            fontWeight: 850,
            boxShadow: 'inset 0 1px 2px rgba(15,23,42,0.04)',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          {children}
        </select>
        <ChevronDown size={15} style={{ position: 'absolute', right: '0.85rem', pointerEvents: 'none', color: 'var(--text-muted)' }} />
      </span>
    </label>
  );
}

function SalesDatePicker({ value, max, onChange }: { value: string; max: string; onChange: (date: string) => void }) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => value.slice(0, 7));
  const monthDate = new Date(`${cursor}-01T00:00:00`);
  const monthLabel = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const firstDay = monthDate.getDay();
  const gridStart = new Date(monthDate);
  gridStart.setDate(1 - firstDay);
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { date: d, iso, inMonth: d.getMonth() === monthDate.getMonth() };
  });
  const nextMonth = new Date(monthDate);
  nextMonth.setMonth(monthDate.getMonth() + 1);
  const nextMonthISO = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
  const canGoNext = nextMonthISO <= max.slice(0, 7);

  function moveMonth(delta: number) {
    const next = new Date(monthDate);
    next.setMonth(monthDate.getMonth() + delta);
    setCursor(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  }

  return (
    <div style={{ position: 'relative' }}>
      <span style={{ display: 'block', fontSize: '9px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '0.35rem' }}>Date</span>
      <button
        type="button"
        className="input-premium"
        onClick={() => setOpen((v) => !v)}
        style={{ height: '40px', minWidth: '146px', display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem', background: 'var(--surface)' }}
      >
        <span>{value.split('-').reverse().join('/')}</span>
        <CalendarDays size={14} />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            width: '284px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            boxShadow: '0 18px 50px rgba(15,23,42,0.14)',
            padding: '0.85rem',
            zIndex: 80,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <button type="button" onClick={() => moveMonth(-1)} aria-label="Previous month" style={calendarIconButtonStyle}>
              <ChevronLeft size={15} />
            </button>
            <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>{monthLabel}</strong>
            <button type="button" onClick={() => moveMonth(1)} disabled={!canGoNext} aria-label="Next month" style={{ ...calendarIconButtonStyle, opacity: canGoNext ? 1 : 0.35 }}>
              <ChevronRight size={15} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => (
              <div key={d} style={{ height: '24px', display: 'grid', placeItems: 'center', fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {days.map((day) => {
              const selected = day.iso === value;
              const disabled = day.iso > max;
              return (
                <button
                  key={day.iso}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(day.iso);
                    setCursor(day.iso.slice(0, 7));
                    setOpen(false);
                  }}
                  style={{
                    height: '30px',
                    border: '1px solid transparent',
                    borderRadius: '8px',
                    background: selected ? 'var(--primary)' : day.inMonth ? 'transparent' : 'var(--overlay-soft)',
                    color: selected ? '#fff' : day.inMonth ? 'var(--text-main)' : 'var(--text-muted)',
                    fontWeight: selected ? 900 : 700,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.3 : day.inMonth ? 1 : 0.55,
                  }}
                >
                  {day.date.getDate()}
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.85rem' }}>
            <button type="button" onClick={() => setOpen(false)} style={calendarTextButtonStyle}>Close</button>
            <button type="button" onClick={() => { onChange(max); setCursor(max.slice(0, 7)); setOpen(false); }} style={calendarTextButtonStyle}>Today</button>
          </div>
        </div>
      )}
    </div>
  );
}

const calendarIconButtonStyle: React.CSSProperties = {
  width: '30px',
  height: '30px',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  background: 'var(--overlay-soft)',
  color: 'var(--text-main)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};

const calendarTextButtonStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: 'var(--primary)',
  fontSize: '12px',
  fontWeight: 900,
  cursor: 'pointer',
};

function TodayFallback() {
  return (
    <MainLayout>
      <div className="card" style={{ padding: '1.25rem' }}>
        <div className="skeleton skeleton-line" style={{ width: '35%', height: '24px' }} />
      </div>
    </MainLayout>
  );
}
