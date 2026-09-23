'use client';

import React, { useMemo, useState } from 'react';
import MainLayout from '@/components/MainLayout';
import {
  Search as SearchIcon,
  Calendar,
  Tag,
  Truck,
  Package,
  RefreshCcw,
  Download,
  Globe,
  X,
  ChevronDown,
} from 'lucide-react';

/* ─── Types & Data ─── */
type RecordKind = 'sales' | 'stock' | 'expenses' | 'returns';
type Status = 'completed' | 'stored' | 'processed' | 'pending';

interface Row {
  id: string;
  date: string;
  kind: RecordKind;
  info: string;
  category: string;
  source: string;
  amount: number;
  amountNegative?: boolean;
  status: Status;
}

const mockRows: Row[] = [
  { id: 'INV-1025', date: '2026-04-15', kind: 'sales',    info: 'Sales Entry · Tomato, Chili',       category: 'Sales',    source: 'Van 2 · South',      amount: 4500,  status: 'completed' },
  { id: 'STK-995',  date: '2026-04-15', kind: 'stock',    info: 'Stock Entry · Carrot 200kg',        category: 'Stock',    source: 'Gazipur Market',     amount: 12000, status: 'stored'    },
  { id: 'RET-442',  date: '2026-04-14', kind: 'returns',  info: 'Return · Cabbage (Damaged)',        category: 'Return',   source: 'Van 5 · Central',    amount: 850,   amountNegative: true, status: 'processed' },
  { id: 'EXP-334',  date: '2026-04-14', kind: 'expenses', info: 'Expense · Van 4 Fuel',              category: 'Expense',  source: 'Van 4 · West',       amount: 1200,  amountNegative: true, status: 'pending'   },
  { id: 'INV-1024', date: '2026-04-15', kind: 'sales',    info: 'Sales Entry · Potato, Onion',       category: 'Sales',    source: 'Van 1 · North',      amount: 25000, status: 'completed' },
  { id: 'STK-994',  date: '2026-04-14', kind: 'stock',    info: 'Stock Entry · Green Chili',         category: 'Stock',    source: 'Karwan Bazar',       amount: 8400,  status: 'stored'    },
  { id: 'EXP-331',  date: '2026-04-13', kind: 'expenses', info: 'Expense · Labor · Loading team',    category: 'Expense',  source: 'Warehouse A',        amount: 3500,  amountNegative: true, status: 'completed' },
  { id: 'RET-441',  date: '2026-04-13', kind: 'returns',  info: 'Return · Tomato (Over-ripe)',       category: 'Return',   source: 'Van 2 · South',      amount: 420,   amountNegative: true, status: 'processed' },
];

const kindMeta: Record<RecordKind | 'all', { label: string; color: string }> = {
  all:      { label: 'All Records',   color: 'var(--primary)' },
  sales:    { label: 'Sales',         color: '#10b981' },
  stock:    { label: 'Stock Entries', color: '#3b82f6' },
  expenses: { label: 'Expenses',      color: '#ef4444' },
  returns:  { label: 'Returns',       color: '#f59e0b' },
};

const statusColor: Record<Status, string> = {
  completed: '#10b981',
  stored:    '#3b82f6',
  processed: '#f59e0b',
  pending:   '#a1a1aa',
};

/* ─── Status Badge ─── */
function StatusBadge({ status }: { status: Status }) {
  const color = statusColor[status];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '4px 10px', borderRadius: '8px',
      fontSize: '9px', fontWeight: 900,
      textTransform: 'uppercase', letterSpacing: '0.12em',
      background: `${color}1a`, color,
      border: `1px solid ${color}40`,
    }}>
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'currentColor', boxShadow: '0 0 6px currentColor' }} />
      {status}
    </span>
  );
}

/* ─── Kind Badge ─── */
function KindBadge({ kind }: { kind: RecordKind }) {
  const color = kindMeta[kind].color;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '4px 10px', borderRadius: '999px',
      fontSize: '9px', fontWeight: 900,
      textTransform: 'uppercase', letterSpacing: '0.15em',
      background: `${color}14`, color,
      border: `1px solid ${color}30`,
    }}>
      {kindMeta[kind].label}
    </span>
  );
}

/* ─── Filter Select ─── */
function FilterSelect({
  icon, label, value, onChange, options,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const active = value !== options[0].value;
  const color = active ? 'var(--primary)' : 'var(--text-muted)';
  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
        color, pointerEvents: 'none', zIndex: 1, display: 'flex',
      }}>
        {icon}
      </div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          appearance: 'none',
          padding: '0.625rem 2.25rem 0.625rem 2.5rem',
          borderRadius: '12px',
          fontSize: '11px', fontWeight: 900,
          textTransform: 'uppercase', letterSpacing: '0.1em',
          background: active ? 'rgba(16,185,129,0.05)' : 'var(--surface)',
          border: `1px solid ${active ? 'rgba(16,185,129,0.3)' : 'var(--overlay-medium)'}`,
          color,
          cursor: 'pointer',
        }}
        aria-label={label}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={12} style={{
        position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
        pointerEvents: 'none', color, opacity: 0.7,
      }} />
    </div>
  );
}

/* ─── Page ─── */
export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<'all' | RecordKind>('all');
  const [dateRange, setDateRange] = useState('30');
  const [van, setVan] = useState('all');
  const [category, setCategory] = useState('all');
  const [payment, setPayment] = useState('all');

  const vans = useMemo(() => Array.from(new Set(mockRows.map(r => r.source))), []);

  const filtered = useMemo(() => mockRows.filter(r => {
    const q = query.trim().toLowerCase();
    const matchQ = !q || r.id.toLowerCase().includes(q) || r.info.toLowerCase().includes(q) || r.source.toLowerCase().includes(q);
    const matchKind = kind === 'all' || r.kind === kind;
    const matchVan = van === 'all' || r.source === van;
    const matchCat = category === 'all' || r.category.toLowerCase() === category;
    const matchPay = payment === 'all' || r.status === payment;
    return matchQ && matchKind && matchVan && matchCat && matchPay;
  }), [query, kind, van, category, payment]);

  const tabs: ('all' | RecordKind)[] = ['all', 'sales', 'stock', 'expenses', 'returns'];
  const counts = useMemo(() => {
    const base = mockRows.filter(r => {
      const q = query.trim().toLowerCase();
      return !q || r.id.toLowerCase().includes(q) || r.info.toLowerCase().includes(q) || r.source.toLowerCase().includes(q);
    });
    return {
      all: base.length,
      sales: base.filter(r => r.kind === 'sales').length,
      stock: base.filter(r => r.kind === 'stock').length,
      expenses: base.filter(r => r.kind === 'expenses').length,
      returns: base.filter(r => r.kind === 'returns').length,
    } as Record<'all' | RecordKind, number>;
  }, [query]);

  const hasActiveFilters = query || kind !== 'all' || dateRange !== '30' || van !== 'all' || category !== 'all' || payment !== 'all';

  return (
    <MainLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }} className="animate-fade-in">

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '14px', background: 'rgba(59,130,246,0.1)', borderRadius: '18px', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)', boxShadow: '0 0 24px rgba(59,130,246,0.08)' }}>
              <Globe size={26} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-main)', textTransform: 'uppercase', fontStyle: 'italic' }}>
                Global<span style={{ color: '#3b82f6' }}>.Search</span>
              </h1>
              <p style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3em', opacity: 0.55, marginTop: '3px' }}>
                Search & Filter · Search across all records
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Download size={14} /> Download CSV
            </button>
          </div>
        </div>

        {/* ── Query Card ── */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Big search */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ position: 'relative', flex: 1 }} className="search-group">
              <div style={{ position: 'absolute', inset: 0, background: '#3b82f6', filter: 'blur(20px)', opacity: 0, borderRadius: '14px', transition: 'opacity 0.3s', pointerEvents: 'none' }} className="search-glow" />
              <SearchIcon size={16} style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none', zIndex: 1 }} className="search-icon" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                type="text"
                placeholder="Search by invoice #, product, van, driver, or category…"
                className="input-premium"
                style={{ width: '100%', height: '52px', paddingLeft: '48px', fontSize: '0.95rem' }}
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  style={{
                    position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                    width: '24px', height: '24px', borderRadius: '8px',
                    background: 'var(--border-soft)', border: '1px solid var(--border)',
                    color: 'var(--text-muted)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
            <button className="btn-primary" style={{ padding: '0 1.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <SearchIcon size={13} /> Search
            </button>
          </div>

          {/* Filter row */}
          <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <FilterSelect
              icon={<Calendar size={12} />}
              label="Date Range"
              value={dateRange}
              onChange={setDateRange}
              options={[
                { value: '30',  label: 'Last 30 Days' },
                { value: '7',   label: 'Last 7 Days' },
                { value: '90',  label: 'Last 90 Days' },
                { value: 'ytd', label: 'Year to Date' },
              ]}
            />
            <FilterSelect
              icon={<Truck size={12} />}
              label="Van"
              value={van}
              onChange={setVan}
              options={[
                { value: 'all', label: 'All Vans' },
                ...vans.map(v => ({ value: v, label: v })),
              ]}
            />
            <FilterSelect
              icon={<Package size={12} />}
              label="Category"
              value={category}
              onChange={setCategory}
              options={[
                { value: 'all',     label: 'All Categories' },
                { value: 'sales',   label: 'Sales' },
                { value: 'stock',   label: 'Stock' },
                { value: 'expense', label: 'Expense' },
                { value: 'return',  label: 'Return' },
              ]}
            />
            <FilterSelect
              icon={<Tag size={12} />}
              label="Payment Status"
              value={payment}
              onChange={setPayment}
              options={[
                { value: 'all',       label: 'Any Status' },
                { value: 'completed', label: 'Completed' },
                { value: 'stored',    label: 'Stored' },
                { value: 'processed', label: 'Processed' },
                { value: 'pending',   label: 'Pending' },
              ]}
            />

            <div style={{ flex: 1 }} />

            {hasActiveFilters && (
              <button
                onClick={() => { setQuery(''); setKind('all'); setDateRange('30'); setVan('all'); setCategory('all'); setPayment('all'); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '0.625rem 1rem',
                  fontSize: '10px', fontWeight: 900,
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                  color: 'var(--text-muted)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer', borderRadius: '12px',
                }}
                className="clear-filter-btn"
              >
                <RefreshCcw size={12} /> Reset
              </button>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.375rem', borderTop: '1px solid var(--overlay-soft)', paddingTop: '1rem', flexWrap: 'wrap' }}>
            {tabs.map(t => {
              const active = kind === t;
              const meta = kindMeta[t];
              return (
                <button
                  key={t}
                  onClick={() => setKind(t)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '0.5rem 0.875rem',
                    borderRadius: '10px',
                    fontSize: '10px', fontWeight: 900,
                    textTransform: 'uppercase', letterSpacing: '0.15em',
                    background: active ? `${meta.color}14` : 'transparent',
                    border: `1px solid ${active ? `${meta.color}40` : 'transparent'}`,
                    color: active ? meta.color : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {meta.label}
                  <span style={{
                    fontSize: '9px', fontWeight: 900,
                    padding: '2px 6px', borderRadius: '999px',
                    background: active ? `${meta.color}25` : 'var(--overlay-soft)',
                    color: active ? meta.color : 'var(--text-muted)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {counts[t]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Results Meta ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <p style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-muted)' }}>
            Found <span style={{ color: 'var(--primary)' }}>{filtered.length.toLocaleString()}</span> matching record{filtered.length !== 1 ? 's' : ''}
            {kind !== 'all' && (
              <>
                {' · '}
                <span style={{ color: kindMeta[kind].color }}>{kindMeta[kind].label}</span>
              </>
            )}
          </p>
        </div>

        {/* ── Table ── */}
        <div className="table-container" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Date', 'Record', 'Category', 'Van / Source', 'Amount', 'Status'].map(h => (
                    <th key={h} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '5rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', opacity: 0.35 }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'var(--overlay-soft)', border: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <SearchIcon size={24} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
                        </div>
                        <p style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', color: 'var(--text-main)' }}>No records match your query</p>
                        <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)' }}>Try adjusting filters or clearing your search.</p>
                      </div>
                    </td>
                  </tr>
                ) : filtered.map(r => (
                  <tr key={r.id} className="table-row">
                    <td className="table-cell">
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{r.date}</span>
                    </td>
                    <td className="table-cell">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--text-main)' }}>{r.id}</span>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>{r.info}</span>
                      </div>
                    </td>
                    <td className="table-cell"><KindBadge kind={r.kind} /></td>
                    <td className="table-cell">
                      <span style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-main)' }}>{r.source}</span>
                    </td>
                    <td className="table-cell">
                      <span style={{
                        fontSize: '14px', fontWeight: 900,
                        fontVariantNumeric: 'tabular-nums', fontStyle: 'italic',
                        color: r.amountNegative ? '#ef4444' : 'var(--primary)',
                      }}>
                        {r.amountNegative ? '-' : ''}৳{r.amount.toLocaleString()}
                      </span>
                    </td>
                    <td className="table-cell"><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--overlay-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(10,10,10,0.3)' }}>
            <p style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>
              Showing <span style={{ color: 'var(--primary)' }}>{filtered.length}</span> of <span style={{ color: 'var(--text-main)' }}>{mockRows.length}</span> indexed records
            </p>
            <p style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-muted)', opacity: 0.5 }}>
              Search results updated
            </p>
          </div>
        </div>

      </div>
    </MainLayout>
  );
}
