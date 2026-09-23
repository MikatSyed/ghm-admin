'use client';

import React, { useMemo, useState } from 'react';
import MainLayout from '@/components/MainLayout';
import {
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
} from '@/hooks/api';
import type { Customer, CustomerInput, CustomerType, EntityStatus } from '@/lib/types';
import { ApiError } from '@/lib/api';
import {
  Plus,
  Users,
  Search,
  Loader2,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Activity,
  Phone,
  MapPin,
  Store,
  UtensilsCrossed,
  Truck as DirectIcon,
  CircleDot,
} from 'lucide-react';

const TYPES: CustomerType[] = ['RESTAURANT', 'SHOP', 'DIRECT', 'OTHER'];
const STATUSES: EntityStatus[] = ['Active', 'Inactive'];

const TYPE_META: Record<CustomerType, { label: string; icon: React.ReactNode; color: string }> = {
  RESTAURANT: { label: 'Restaurant', icon: <UtensilsCrossed size={11} />, color: '#f59e0b' },
  SHOP: { label: 'Shop', icon: <Store size={11} />, color: '#3b82f6' },
  DIRECT: { label: 'Direct', icon: <DirectIcon size={11} />, color: '#10b981' },
  OTHER: { label: 'Other', icon: <CircleDot size={11} />, color: '#94a3b8' },
};

const ERROR_COPY: Record<string, string> = {
  IN_USE: 'Cannot delete — this customer has distribution orders, sales, or invoices.',
  NOT_FOUND: 'Customer not found — it may have already been removed.',
  VALIDATION_ERROR: 'Please check the form — one or more fields are invalid.',
};

function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    const base = ERROR_COPY[err.code ?? ''] ?? err.message;
    if (err.fields) {
      const parts = Object.entries(err.fields).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
      if (parts.length) return `${base} (${parts.join(' · ')})`;
    }
    return base;
  }
  return err instanceof Error ? err.message : 'Unexpected error';
}

export default function CustomersPage() {
  const [q, setQ] = useState('');
  const [type, setType] = useState<CustomerType | 'all'>('all');
  const [status, setStatus] = useState<EntityStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Customer | null>(null);

  const listQ = useCustomers({ q: q || undefined, type, status, page, pageSize, sort: 'name' });
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const deleteMutation = useDeleteCustomer();

  const rows = listQ.data?.data ?? [];
  const total = listQ.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const { activeCount, restaurantShopCount } = useMemo(() => {
    let active = 0;
    let restaurantShop = 0;
    for (const c of rows) {
      if (c.status === 'Active') active += 1;
      if (c.type === 'RESTAURANT' || c.type === 'SHOP') restaurantShop += 1;
    }
    return { activeCount: active, restaurantShopCount: restaurantShop };
  }, [rows]);

  const hasFilters = q || type !== 'all' || status !== 'all';
  const resetFilters = () => {
    setQ('');
    setType('all');
    setStatus('all');
    setPage(1);
  };

  const openCreate = () => {
    setEditing(null);
    setErrorMsg(null);
    setModalOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleSubmit = async (body: CustomerInput) => {
    setErrorMsg(null);
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, body });
      } else {
        await createMutation.mutateAsync(body);
      }
      setModalOpen(false);
      setEditing(null);
    } catch (err) {
      setErrorMsg(describeError(err));
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setErrorMsg(null);
    try {
      await deleteMutation.mutateAsync(confirmDelete.id);
      setConfirmDelete(null);
    } catch (err) {
      setErrorMsg(describeError(err));
      setConfirmDelete(null);
    }
  };

  return (
    <MainLayout>
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '4rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                padding: '14px',
                background: 'rgba(16,185,129,0.1)',
                borderRadius: '18px',
                color: 'var(--primary)',
                border: '1px solid rgba(16,185,129,0.2)',
                boxShadow: '0 0 24px rgba(16,185,129,0.1)',
              }}
            >
              <Users size={28} />
            </div>
            <div>
              <h1
                style={{
                  fontSize: '2rem',
                  fontWeight: 900,
                  color: 'var(--text-main)',
                  textTransform: 'uppercase',
                  fontStyle: 'italic',
                  lineHeight: 1.1,
                  letterSpacing: '-0.03em',
                }}
              >
                Customer <span style={{ color: 'var(--primary)' }}>Directory</span>
              </h1>
              <p
                style={{
                  fontSize: '10px',
                  fontWeight: 900,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3em',
                  opacity: 0.6,
                  marginTop: '4px',
                }}
              >
                Restaurants · Shops · Direct Buyers · {total} Total
              </p>
            </div>
          </div>

          <button onClick={openCreate} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Plus size={18} />
            Add Customer
          </button>
        </div>

        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
          <StatCard label="Total Customers" value={total.toLocaleString()} sub="Matching current filter" icon={<Users size={20} />} />
          <StatCard label="Active (this page)" value={activeCount.toLocaleString()} sub={`of ${rows.length} visible`} icon={<Activity size={20} />} />
          <StatCard label="Restaurants / Shops (this page)" value={restaurantShopCount.toLocaleString()} sub={`of ${rows.length} visible`} icon={<Store size={20} />} />
        </div>

        {errorMsg && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '14px 18px',
              borderRadius: '14px',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              color: '#ef4444',
              fontSize: '12px',
              fontWeight: 800,
            }}
          >
            <AlertTriangle size={16} />
            <span style={{ flex: 1 }}>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* Filter bar */}
        <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={14} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', opacity: 0.5 }} />
            <input
              type="text"
              placeholder="Search by name or phone…"
              className="input-premium"
              style={{ width: '100%', paddingLeft: '44px' }}
              value={q}
              onChange={e => { setQ(e.target.value); setPage(1); }}
            />
          </div>

          <FilterSelect
            icon={<Filter size={12} />}
            label="Type"
            value={type}
            onChange={v => { setType(v as CustomerType | 'all'); setPage(1); }}
            options={[{ value: 'all', label: 'All types' }, ...TYPES.map(t => ({ value: t, label: TYPE_META[t].label }))]}
          />

          <FilterSelect
            icon={<Activity size={12} />}
            label="Status"
            value={status}
            onChange={v => { setStatus(v as EntityStatus | 'all'); setPage(1); }}
            options={[{ value: 'all', label: 'All' }, { value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }]}
          />

          {hasFilters && (
            <button onClick={resetFilters} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '10px' }}>
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="table-container shadow-lg">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['ID', 'Name', 'Type', 'Contact', 'Status', 'Actions'].map(h => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {listQ.isLoading ? (
                <SkeletonRows count={6} />
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '5rem', textAlign: 'center' }}>
                    <Users size={40} style={{ color: 'var(--text-muted)', opacity: 0.2, margin: '0 auto' }} />
                    <p style={{ marginTop: '1rem', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
                      {hasFilters ? 'No customers match your filters' : 'No customers yet — add your first'}
                    </p>
                  </td>
                </tr>
              ) : (
                rows.map(c => {
                  const meta = TYPE_META[c.type];
                  const active = c.status === 'Active';
                  return (
                    <tr key={c.id} className="table-row" style={{ opacity: active ? 1 : 0.55 }}>
                      <td className="table-cell">
                        <span style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '11px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                          {c.id}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '13px' }}>{c.name}</div>
                      </td>
                      <td className="table-cell">
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontSize: '9px',
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            background: `${meta.color}1a`,
                            color: meta.color,
                            border: `1px solid ${meta.color}40`,
                          }}
                        >
                          {meta.icon}
                          {meta.label}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {c.phone && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-main)', fontWeight: 700 }}>
                              <Phone size={11} style={{ color: 'var(--text-muted)' }} />
                              {c.phone}
                            </div>
                          )}
                          {c.address && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>
                              <MapPin size={11} style={{ opacity: 0.6 }} />
                              {c.address}
                            </div>
                          )}
                          {!c.phone && !c.address && <span style={{ fontSize: '10px', color: 'var(--text-muted)', opacity: 0.4 }}>—</span>}
                        </div>
                      </td>
                      <td className="table-cell">
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontSize: '9px',
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            background: active ? 'rgba(16,185,129,0.1)' : 'var(--border-soft)',
                            color: active ? '#10b981' : 'var(--text-muted)',
                            border: `1px solid ${active ? 'rgba(16,185,129,0.2)' : 'var(--overlay-strong)'}`,
                          }}
                        >
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: active ? 'currentColor' : '#888' }} />
                          {c.status}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <IconBtn title="Edit" onClick={() => openEdit(c)} color="#94a3b8">
                            <Edit2 size={13} />
                          </IconBtn>
                          <IconBtn title="Delete" onClick={() => setConfirmDelete(c)} color="#ef4444">
                            <Trash2 size={13} />
                          </IconBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-muted)', opacity: 0.6 }}>
              Page {page} of {totalPages} · {total} records
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                style={{ padding: '0.5rem 0.9rem', display: 'flex', alignItems: 'center', gap: '6px', opacity: page <= 1 ? 0.4 : 1 }}
              >
                <ChevronLeft size={14} />
                Prev
              </button>
              <button
                className="btn-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                style={{ padding: '0.5rem 0.9rem', display: 'flex', alignItems: 'center', gap: '6px', opacity: page >= totalPages ? 0.4 : 1 }}
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <CustomerModal
          editing={editing}
          pending={createMutation.isPending || updateMutation.isPending}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSubmit={handleSubmit}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete Customer"
          message={`Remove "${confirmDelete.name}" (${confirmDelete.id})? This will fail if the customer has distribution orders, sales, or invoices.`}
          confirmLabel={deleteMutation.isPending ? 'Deleting…' : 'Delete'}
          pending={deleteMutation.isPending}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={handleDelete}
        />
      )}
    </MainLayout>
  );
}

/* ─── Skeleton rows ───────────────────────────────────────── */
function SkeletonRows({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} className="table-row" style={{ animation: `fade-in 0.5s ${i * 40}ms cubic-bezier(0.23, 1, 0.32, 1) both` }}>
          <td className="table-cell"><span className="skeleton skeleton-line" style={{ width: 60 }} /></td>
          <td className="table-cell"><span className="skeleton skeleton-block" style={{ width: '70%' }} /></td>
          <td className="table-cell"><span className="skeleton skeleton-pill" style={{ width: 80 }} /></td>
          <td className="table-cell"><span className="skeleton skeleton-line" style={{ width: '60%' }} /></td>
          <td className="table-cell"><span className="skeleton skeleton-pill" style={{ width: 70 }} /></td>
          <td className="table-cell">
            <div style={{ display: 'flex', gap: '6px' }}>
              <span className="skeleton" style={{ width: 28, height: 28, borderRadius: 9 }} />
              <span className="skeleton" style={{ width: 28, height: 28, borderRadius: 9 }} />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

/* ─── StatCard ────────────────────────────────────────────── */
function StatCard({ label, value, sub, icon }: { label: string; value: string | number; sub: string; icon: React.ReactNode }) {
  return (
    <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', background: 'var(--primary)', boxShadow: '0 0 12px var(--primary)' }} />
      <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.05, transform: 'scale(2)' }}>{icon}</div>
      <p style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</p>
      <p style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-main)', fontStyle: 'italic', letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
      <p style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 700, marginTop: '4px' }}>{sub}</p>
    </div>
  );
}

/* ─── Filter select ───────────────────────────────────────── */
function FilterSelect({
  icon,
  label,
  value,
  onChange,
  options,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--background)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border)' }}>
      <div style={{ padding: '0 10px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
        {icon}
        <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
      </div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-main)',
          fontSize: '11px',
          fontWeight: 900,
          textTransform: 'uppercase',
          padding: '8px 14px 8px 0',
          cursor: 'pointer',
          outline: 'none',
          fontFamily: 'inherit',
          maxWidth: '180px',
        }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

/* ─── Icon button ─────────────────────────────────────────── */
function IconBtn({ title, onClick, color, children }: { title: string; onClick: () => void; color: string; children: React.ReactNode }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        padding: '7px',
        borderRadius: '9px',
        background: 'var(--overlay-soft)',
        border: '1px solid var(--border)',
        color,
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </button>
  );
}

/* ─── Customer modal ──────────────────────────────────────── */
function CustomerModal({
  editing,
  pending,
  onClose,
  onSubmit,
}: {
  editing: Customer | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (body: CustomerInput) => void;
}) {
  const [form, setForm] = useState<CustomerInput>({
    name: editing?.name ?? '',
    type: editing?.type ?? 'RESTAURANT',
    phone: editing?.phone ?? '',
    address: editing?.address ?? '',
    status: editing?.status ?? 'Active',
  });

  const canSubmit = form.name.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...form,
      name: form.name.trim(),
      phone: form.phone?.trim() || undefined,
      address: form.address?.trim() || undefined,
    });
  };

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet-content animate-fade-in custom-scrollbar" style={{ maxWidth: '560px', padding: '2rem' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', color: 'var(--primary)' }}>
              <Users size={16} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', color: 'var(--text-main)' }}>
                {editing ? 'Edit' : 'New'} <span style={{ color: 'var(--primary)' }}>Customer</span>
              </h2>
              <p style={{ fontSize: '9px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.5, marginTop: '2px' }}>
                {editing ? editing.id : 'Add a restaurant, shop, or direct buyer'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '8px', borderRadius: '10px', background: 'var(--overlay-soft)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <Field label="Name">
            <input
              type="text"
              className="input-premium"
              required
              placeholder="e.g. Cafe Delta"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </Field>

          <Field label="Type">
            <select className="input-premium" value={form.type} onChange={e => setForm({ ...form, type: e.target.value as CustomerType })}>
              {TYPES.map(t => (
                <option key={t} value={t}>{TYPE_META[t].label}</option>
              ))}
            </select>
          </Field>

          <Field label="Phone (optional)">
            <input
              type="text"
              className="input-premium"
              placeholder="e.g. 01XXXXXXXXX"
              value={form.phone ?? ''}
              onChange={e => setForm({ ...form, phone: e.target.value })}
            />
          </Field>

          <Field label="Address (optional)">
            <input
              type="text"
              className="input-premium"
              placeholder="e.g. Road 4, Banani, Dhaka"
              value={form.address ?? ''}
              onChange={e => setForm({ ...form, address: e.target.value })}
            />
          </Field>

          {editing && (
            <Field label="Status">
              <select className="input-premium" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as EntityStatus })}>
                {STATUSES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              disabled={!canSubmit || pending}
            >
              {pending && <Loader2 className="animate-spin" size={16} />}
              {editing ? 'Save Changes' : 'Create Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-muted)' }}>{label}</label>
      {children}
    </div>
  );
}

/* ─── Confirm dialog ──────────────────────────────────────── */
function ConfirmDialog({
  title,
  message,
  confirmLabel,
  pending,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'var(--modal-backdrop)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1010, padding: '2rem' }}
      onClick={onCancel}
    >
      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '440px', padding: '1.75rem', border: '1px solid rgba(239,68,68,0.25)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
          <div style={{ padding: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', color: '#ef4444' }}>
            <AlertTriangle size={16} />
          </div>
          <h3 style={{ fontSize: '14px', fontWeight: 900, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</h3>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          <button type="button" onClick={onCancel} className="btn-secondary" style={{ flex: 1 }}>
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            style={{
              flex: 1,
              padding: '0.75rem 1.5rem',
              borderRadius: '0.75rem',
              fontSize: '0.75rem',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              background: '#ef4444',
              color: 'var(--text-main)',
              border: 'none',
              cursor: pending ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: pending ? 0.7 : 1,
            }}
          >
            {pending && <Loader2 className="animate-spin" size={14} />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
