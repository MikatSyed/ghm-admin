'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  useVans,
  useCreateVan,
  useUpdateVan,
  useDeleteVan,
} from '@/hooks/api';
import type { Van, VanInput } from '@/lib/types';
import { ApiError } from '@/lib/api';
import {
  Plus,
  Truck,
  Search,
  Loader2,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  Coins,
  Package,
  ArrowRight,
  User,
  Power,
} from 'lucide-react';

type ModalState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; van: Van };

export default function FleetSection() {
  const [q, setQ] = useState('');
  const [modal, setModal] = useState<ModalState>({ mode: 'closed' });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Van | null>(null);

  const vansQ = useVans();
  const createMutation = useCreateVan();
  const updateMutation = useUpdateVan();
  const deleteMutation = useDeleteVan();

  const vans = vansQ.data ?? [];

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return vans;
    return vans.filter(
      v =>
        v.id.toLowerCase().includes(term) ||
        v.vanName.toLowerCase().includes(term) ||
        v.driver.toLowerCase().includes(term),
    );
  }, [vans, q]);

  const activeCount = vans.filter(v => v.isActive !== false).length;
  const totalRevenue = vans.reduce((s, v) => s + (v.todaySummary?.revenue ?? 0), 0);
  const totalSold = vans.reduce((s, v) => s + (v.todaySummary?.sold ?? 0), 0);

  const handleSave = async (input: VanInput) => {
    setErrorMsg(null);
    try {
      if (modal.mode === 'create') {
        await createMutation.mutateAsync(input);
      } else if (modal.mode === 'edit') {
        await updateMutation.mutateAsync({ id: modal.van.id, body: input });
      }
      setModal({ mode: 'closed' });
    } catch (err) {
      setErrorMsg(
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Unexpected error',
      );
    }
  };

  const handleToggle = async (v: Van) => {
    setErrorMsg(null);
    try {
      await updateMutation.mutateAsync({
        id: v.id,
        body: { isActive: !(v.isActive !== false) },
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Toggle failed');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setErrorMsg(null);
    try {
      await deleteMutation.mutateAsync(confirmDelete.id);
      setConfirmDelete(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Delete failed');
      setConfirmDelete(null);
    }
  };

  return (
    <div
      className="animate-fade-in"
      style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.25rem',
        }}
      >
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
            <Truck size={28} />
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
              Van <span style={{ color: 'var(--primary)' }}>Fleet</span>
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
              Fleet Management · {vans.length} Vans
            </p>
          </div>
        </div>

        <button
          onClick={() => setModal({ mode: 'create' })}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          <Plus size={18} />
          Add Van
        </button>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
        <StatCard
          label="Total Vans"
          value={vans.length}
          sub={`${activeCount} active · ${vans.length - activeCount} inactive`}
          icon={<Truck size={20} />}
        />
        <StatCard
          label="Sold Today (units)"
          value={totalSold.toLocaleString()}
          sub="Across all vans"
          icon={<Package size={20} />}
        />
        <StatCard
          label="Revenue Today"
          value={`৳${totalRevenue.toLocaleString()}`}
          sub={`${vans.filter(v => (v.todaySummary?.revenue ?? 0) > 0).length} reporting`}
          icon={<Coins size={20} />}
        />
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
          <button
            onClick={() => setErrorMsg(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filter bar */}
      <div
        className="card"
        style={{
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              opacity: 0.5,
            }}
          />
          <input
            type="text"
            placeholder="Search by van name, driver, or ID…"
            className="input-premium"
            style={{ width: '100%', paddingLeft: '44px' }}
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            color: 'var(--text-muted)',
            opacity: 0.5,
          }}
        >
          {filtered.length} of {vans.length}
        </span>
      </div>

      {/* Table */}
      <div className="table-container shadow-lg">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['ID', 'Van / Driver', 'Status', 'Today Summary', 'Actions'].map(h => (
                <th key={h} className="table-header">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vansQ.isLoading ? (
              <SkeletonRows count={5} />
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '5rem', textAlign: 'center' }}>
                  <Truck
                    size={40}
                    style={{ color: 'var(--text-muted)', opacity: 0.2, margin: '0 auto' }}
                  />
                  <p
                    style={{
                      marginTop: '1rem',
                      fontSize: '11px',
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      color: 'var(--text-muted)',
                      letterSpacing: '0.1em',
                    }}
                  >
                    {q ? 'No vans match your search' : 'No vans yet — add your first'}
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map(v => {
                const active = v.isActive !== false;
                const summary = v.todaySummary;
                return (
                  <tr key={v.id} className="table-row" style={{ opacity: active ? 1 : 0.55 }}>
                    <td className="table-cell">
                      <span
                        style={{
                          fontWeight: 900,
                          color: 'var(--primary)',
                          fontSize: '11px',
                          letterSpacing: '-0.02em',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {v.id}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '13px' }}>
                        {v.vanName}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '10px',
                          fontWeight: 700,
                          color: 'var(--text-muted)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          marginTop: '3px',
                        }}
                      >
                        <User size={11} style={{ opacity: 0.6 }} />
                        {v.driver}
                      </div>
                    </td>
                    <td className="table-cell">
                      <button
                        onClick={() => handleToggle(v)}
                        disabled={updateMutation.isPending}
                        title={active ? 'Deactivate' : 'Activate'}
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
                          cursor: 'pointer',
                        }}
                      >
                        <span
                          style={{
                            width: '5px',
                            height: '5px',
                            borderRadius: '50%',
                            background: active ? 'currentColor' : '#888',
                          }}
                        />
                        {active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="table-cell">
                      {summary ? (
                        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                          <SummaryStat label="Alloc" value={summary.allocated} />
                          <SummaryStat label="Sold" value={summary.sold} />
                          <SummaryStat
                            label="৳"
                            value={summary.revenue}
                            highlight
                          />
                        </div>
                      ) : (
                        <span
                          style={{
                            fontSize: '10px',
                            color: 'var(--text-muted)',
                            opacity: 0.4,
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            fontWeight: 700,
                          }}
                        >
                          No data
                        </span>
                      )}
                    </td>
                    <td className="table-cell">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Link
                          href={`/dashboard/distribution?van=${v.id}`}
                          title="Open distribution"
                          style={{
                            padding: '7px',
                            borderRadius: '9px',
                            background: 'rgba(16,185,129,0.06)',
                            border: '1px solid rgba(16,185,129,0.15)',
                            color: 'var(--primary)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <ArrowRight size={13} />
                        </Link>
                        <IconBtn title="Edit" onClick={() => setModal({ mode: 'edit', van: v })}>
                          <Edit2 size={13} />
                        </IconBtn>
                        <IconBtn
                          title="Delete"
                          onClick={() => setConfirmDelete(v)}
                          color="#ef4444"
                        >
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

      {modal.mode !== 'closed' && (
        <VanModal
          editing={modal.mode === 'edit' ? modal.van : null}
          pending={createMutation.isPending || updateMutation.isPending}
          onClose={() => setModal({ mode: 'closed' })}
          onSubmit={handleSave}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete Van"
          message={`Remove "${confirmDelete.vanName}" (${confirmDelete.id})? This will fail if the van is referenced by distributions or sales.`}
          confirmLabel={deleteMutation.isPending ? 'Deleting…' : 'Delete'}
          pending={deleteMutation.isPending}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

/* ─── Skeleton rows ───────────────────────────────────────── */
function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr
          key={i}
          className="table-row"
          style={{ animation: `fade-in 0.5s ${i * 40}ms cubic-bezier(0.23, 1, 0.32, 1) both` }}
        >
          <td className="table-cell">
            <span className="skeleton skeleton-line" style={{ width: 42 }} />
          </td>
          <td className="table-cell">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span className="skeleton skeleton-block" style={{ width: '70%' }} />
              <span className="skeleton skeleton-line" style={{ width: '40%', height: 7 }} />
            </div>
          </td>
          <td className="table-cell">
            <span className="skeleton skeleton-pill" style={{ width: 70 }} />
          </td>
          <td className="table-cell">
            <div style={{ display: 'flex', gap: '14px' }}>
              <span className="skeleton skeleton-block" style={{ width: 40 }} />
              <span className="skeleton skeleton-block" style={{ width: 40 }} />
              <span className="skeleton skeleton-block" style={{ width: 54 }} />
            </div>
          </td>
          <td className="table-cell">
            <div style={{ display: 'flex', gap: '6px' }}>
              <span className="skeleton" style={{ width: 28, height: 28, borderRadius: 9 }} />
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
function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '3px',
          height: '100%',
          background: 'var(--primary)',
          boxShadow: '0 0 12px var(--primary)',
        }}
      />
      <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.05, transform: 'scale(2)' }}>
        {icon}
      </div>
      <p
        style={{
          fontSize: '9px',
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          color: 'var(--text-muted)',
          marginBottom: '4px',
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: '1.75rem',
          fontWeight: 900,
          color: 'var(--text-main)',
          fontStyle: 'italic',
          letterSpacing: '-0.04em',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </p>
      <p style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 700, marginTop: '4px' }}>{sub}</p>
    </div>
  );
}

/* ─── Summary chip ────────────────────────────────────────── */
function SummaryStat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div>
      <p
        style={{
          fontSize: '8px',
          fontWeight: 900,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          marginBottom: '2px',
          letterSpacing: '0.1em',
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: highlight ? '13px' : '12px',
          fontWeight: highlight ? 950 : 800,
          color: highlight ? 'var(--primary)' : 'var(--text-main)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value.toLocaleString()}
      </p>
    </div>
  );
}

/* ─── Icon button ─────────────────────────────────────────── */
function IconBtn({
  title,
  onClick,
  color = 'var(--text-muted)',
  children,
}: {
  title: string;
  onClick: () => void;
  color?: string;
  children: React.ReactNode;
}) {
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

/* ─── Van modal ───────────────────────────────────────────── */
function VanModal({
  editing,
  pending,
  onClose,
  onSubmit,
}: {
  editing: Van | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (body: VanInput) => void;
}) {
  const [form, setForm] = useState<VanInput>({
    id: editing?.id ?? '',
    vanName: editing?.vanName ?? '',
    driver: editing?.driver ?? '',
    isActive: editing?.isActive ?? true,
  });

  const canSubmit = form.vanName.trim().length > 0 && form.driver.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: VanInput = {
      vanName: form.vanName.trim(),
      driver: form.driver.trim(),
      isActive: form.isActive,
    };
    if (!editing && form.id?.trim()) payload.id = form.id.trim();
    onSubmit(payload);
  };

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div
        className="sheet-content animate-fade-in custom-scrollbar"
        style={{ maxWidth: '520px', padding: '2rem' }}
        onClick={e => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                padding: '10px',
                background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: '12px',
                color: 'var(--primary)',
              }}
            >
              <Truck size={16} />
            </div>
            <div>
              <h2
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  fontStyle: 'italic',
                  color: 'var(--text-main)',
                }}
              >
                {editing ? 'Edit' : 'New'} <span style={{ color: 'var(--primary)' }}>Van</span>
              </h2>
              <p
                style={{
                  fontSize: '9px',
                  fontWeight: 900,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.2em',
                  opacity: 0.5,
                  marginTop: '2px',
                }}
              >
                {editing ? editing.id : 'Add a new delivery vehicle'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px',
              borderRadius: '10px',
              background: 'var(--overlay-soft)',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {!editing && (
            <Field label="Van ID (optional)">
              <input
                type="text"
                className="input-premium"
                placeholder="e.g. V3 — leave blank to auto-generate"
                value={form.id ?? ''}
                onChange={e => setForm({ ...form, id: e.target.value })}
              />
            </Field>
          )}

          <Field label="Van Name">
            <input
              type="text"
              className="input-premium"
              required
              placeholder="e.g. Van 3 · North Zone"
              value={form.vanName}
              onChange={e => setForm({ ...form, vanName: e.target.value })}
            />
          </Field>

          <Field label="Driver">
            <input
              type="text"
              className="input-premium"
              required
              placeholder="Driver name"
              value={form.driver}
              onChange={e => setForm({ ...form, driver: e.target.value })}
            />
          </Field>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 14px',
              background: form.isActive ? 'rgba(16,185,129,0.06)' : 'var(--overlay-soft)',
              border: `1px solid ${form.isActive ? 'rgba(16,185,129,0.2)' : 'var(--border)'}`,
              borderRadius: '12px',
              cursor: 'pointer',
              color: form.isActive ? 'var(--primary)' : 'var(--text-muted)',
            }}
          >
            <input
              type="checkbox"
              checked={form.isActive ?? true}
              onChange={e => setForm({ ...form, isActive: e.target.checked })}
              style={{ accentColor: 'var(--primary)' }}
            />
            <Power size={13} />
            <span
              style={{
                fontSize: '11px',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
              }}
            >
              Active (eligible for distribution)
            </span>
          </label>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
              disabled={!canSubmit || pending}
            >
              {pending && <Loader2 className="animate-spin" size={16} />}
              {editing ? 'Save Changes' : 'Create Van'}
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
      <label
        style={{
          fontSize: '9px',
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          color: 'var(--text-muted)',
        }}
      >
        {label}
      </label>
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
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--modal-backdrop)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1010,
        padding: '2rem',
      }}
      onClick={onCancel}
    >
      <div
        className="card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '1.75rem',
          border: '1px solid rgba(239,68,68,0.25)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
          <div
            style={{
              padding: '10px',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '12px',
              color: '#ef4444',
            }}
          >
            <AlertTriangle size={16} />
          </div>
          <h3
            style={{
              fontSize: '14px',
              fontWeight: 900,
              color: 'var(--text-main)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {title}
          </h3>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, lineHeight: 1.5 }}>
          {message}
        </p>
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
