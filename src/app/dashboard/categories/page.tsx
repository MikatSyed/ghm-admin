'use client';

import React, { useMemo, useState } from 'react';
import MainLayout from '@/components/MainLayout';
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useCategoryStats,
} from '@/hooks/api';
import type { Category, CategoryInput } from '@/lib/types';
import { ApiError } from '@/lib/api';
import {
  Plus,
  Layers,
  BarChart3,
  Package,
  Calendar,
  Loader2,
  Activity,
  Info,
  Search,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  Power,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';

type ModalState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; category: Category };

const todayISO = () => format(new Date(), 'yyyy-MM-dd');

export default function CategoriesPage({ hideLayout = false }: { hideLayout?: boolean }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statsDate, setStatsDate] = useState<string>(todayISO());
  const [modal, setModal] = useState<ModalState>({ mode: 'closed' });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Category | null>(null);

  const categoriesQ = useCategories();
  const statsQ = useCategoryStats(statsDate);
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const categories = categoriesQ.data ?? [];
  const stats = statsQ.data ?? [];

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        (c.description ?? '').toLowerCase().includes(q),
    );
  }, [categories, searchTerm]);

  const activeCount = categories.filter(c => c.isActive !== false).length;
  const inactiveCount = categories.length - activeCount;
  const totalKgToday = stats.reduce((s, x) => s + (x.totalKg ?? 0), 0);

  const handleSave = async (input: CategoryInput) => {
    setErrorMsg(null);
    try {
      if (modal.mode === 'create') {
        await createMutation.mutateAsync(input);
      } else if (modal.mode === 'edit') {
        await updateMutation.mutateAsync({ id: modal.category.id, body: input });
      }
      setModal({ mode: 'closed' });
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Unexpected error';
      setErrorMsg(message);
    }
  };

  const handleToggle = async (c: Category) => {
    setErrorMsg(null);
    try {
      await updateMutation.mutateAsync({
        id: c.id,
        body: { isActive: !(c.isActive !== false) },
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
    }
  };

  const content = (
    <div
      className="animate-fade-in"
      style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '4rem' }}
    >
      {/* ── Header ───────────────────────────────────────── */}
      {!hideLayout && (
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
              <Layers size={28} />
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
                Product <span style={{ color: 'var(--primary)' }}>Categories</span>
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
                Manage Product Categories · {categories.length} Total
              </p>
            </div>
          </div>

          <button
            onClick={() => setModal({ mode: 'create' })}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <Plus size={18} />
            New Category
          </button>
        </div>
      )}

        {/* ── KPI row ─────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
          {[
            {
              label: 'Total Categories',
              value: categories.length,
              sub: 'All defined categories',
              color: 'var(--primary)',
              icon: <Layers size={20} />,
            },
            {
              label: 'Active Categories',
              value: activeCount,
              sub: `${inactiveCount} inactive`,
              color: 'var(--primary)',
              icon: <CheckCircle2 size={20} />,
            },
            {
              label: 'Today Volume (KG)',
              value: totalKgToday.toLocaleString(),
              sub: `${stats.length} categories reporting`,
              color: 'var(--primary)',
              icon: <BarChart3 size={20} />,
            },
          ].map(k => (
            <div key={k.label} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
              <div
                style={{
                  position: 'absolute',
                  top: '-10px',
                  right: '-10px',
                  opacity: 0.05,
                  transform: 'scale(2)',
                }}
              >
                {k.icon}
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
                {k.label}
              </p>
              <p
                style={{
                  fontSize: '1.75rem',
                  fontWeight: 900,
                  color: 'var(--text-main)',
                  fontStyle: 'italic',
                  letterSpacing: '-0.04em',
                }}
              >
                {k.value}
              </p>
              <p style={{ fontSize: '10px', color: k.color, fontWeight: 700, marginTop: '4px' }}>{k.sub}</p>
            </div>
          ))}
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
            {errorMsg}
            <button
              onClick={() => setErrorMsg(null)}
              style={{
                marginLeft: 'auto',
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
              }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── Main grid ───────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem' }}>
          {/* LEFT — categories table + stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Search + table */}
            <div className="card space-y-6">
              <div className="flex flex-wrap gap-4 items-center" style={{ marginBottom: '1.25rem' }}>
                <div className="relative flex-1 min-w-[280px]">
                  <Search
                    size={18}
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
                    placeholder="Search categories by name or description..."
                    className="input-premium"
                    style={{ width: '100%', paddingLeft: '44px' }}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
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
                  Showing {filtered.length} of {categories.length}
                </span>
                {hideLayout && (
                  <button
                    onClick={() => setModal({ mode: 'create' })}
                    className="btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 20px', height: '48px' }}
                  >
                    <Plus size={18} />
                    New Category
                  </button>
                )}
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Category', 'Description', 'Status', 'Updated', 'Actions'].map(h => (
                        <th key={h} className="table-header">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {categoriesQ.isLoading ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '4rem', textAlign: 'center' }}>
                          <Loader2
                            size={32}
                            className="animate-spin"
                            style={{ color: 'var(--primary)', margin: '0 auto' }}
                          />
                          <p
                            style={{
                              marginTop: '1rem',
                              fontSize: '11px',
                              fontWeight: 900,
                              textTransform: 'uppercase',
                              color: 'var(--text-muted)',
                              letterSpacing: '0.2em',
                            }}
                          >
                            Loading categories…
                          </p>
                        </td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '4rem', textAlign: 'center' }}>
                          <Layers
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
                            {searchTerm ? 'No matches found' : 'No categories defined yet'}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filtered.map(c => {
                        const active = c.isActive !== false;
                        return (
                          <tr key={c.id} className="table-row">
                            <td className="table-cell">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div
                                  style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '10px',
                                    background: 'rgba(16,185,129,0.08)',
                                    border: '1px solid rgba(16,185,129,0.15)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--primary)',
                                  }}
                                >
                                  <Package size={16} />
                                </div>
                                <div>
                                  <div
                                    style={{
                                      fontWeight: 900,
                                      color: 'var(--text-main)',
                                      fontSize: '13px',
                                      textTransform: 'uppercase',
                                      letterSpacing: '-0.01em',
                                    }}
                                  >
                                    {c.name}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: '9px',
                                      color: 'var(--text-muted)',
                                      fontWeight: 700,
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.05em',
                                      opacity: 0.5,
                                    }}
                                  >
                                    ID: {c.id}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="table-cell">
                              <p
                                style={{
                                  fontSize: '12px',
                                  color: 'var(--text-muted)',
                                  fontWeight: 600,
                                  lineHeight: 1.4,
                                  maxWidth: '320px',
                                }}
                              >
                                {c.description || (
                                  <span style={{ opacity: 0.4, fontStyle: 'italic' }}>
                                    No description provided
                                  </span>
                                )}
                              </p>
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
                                  background: active ? 'rgba(16,185,129,0.1)' : 'var(--overlay-soft)',
                                  color: active ? 'var(--primary)' : 'var(--text-muted)',
                                  border: `1px solid ${active ? 'rgba(16,185,129,0.2)' : 'var(--border)'}`,
                                }}
                              >
                                <span
                                  style={{
                                    width: '5px',
                                    height: '5px',
                                    borderRadius: '50%',
                                    background: 'currentColor',
                                  }}
                                />
                                {active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="table-cell">
                              <span
                                style={{
                                  fontSize: '11px',
                                  color: 'var(--text-muted)',
                                  fontWeight: 700,
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              >
                                {c.updatedAt
                                  ? format(new Date(c.updatedAt), 'MMM dd, yyyy')
                                  : c.createdAt
                                    ? format(new Date(c.createdAt), 'MMM dd, yyyy')
                                    : '—'}
                              </span>
                            </td>
                            <td className="table-cell">
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  title={active ? 'Deactivate' : 'Activate'}
                                  onClick={() => handleToggle(c)}
                                  disabled={updateMutation.isPending}
                                  style={{
                                    padding: '8px',
                                    borderRadius: '10px',
                                    background: active
                                      ? 'rgba(16,185,129,0.1)'
                                      : 'var(--overlay-soft)',
                                    border: `1px solid ${active ? 'rgba(16,185,129,0.2)' : 'var(--border)'}`,
                                    color: active ? 'var(--primary)' : 'var(--text-muted)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                  }}
                                >
                                  <Power size={13} />
                                </button>
                                <button
                                  title="Edit"
                                  onClick={() => setModal({ mode: 'edit', category: c })}
                                  style={{
                                    padding: '8px',
                                    borderRadius: '10px',
                                    background: 'rgba(16,185,129,0.08)',
                                    border: '1px solid rgba(16,185,129,0.15)',
                                    color: 'var(--primary)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                  }}
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  title="Delete"
                                  onClick={() => setConfirmDelete(c)}
                                  style={{
                                    padding: '8px',
                                    borderRadius: '10px',
                                    background: 'rgba(239,68,68,0.08)',
                                    border: '1px solid rgba(239,68,68,0.2)',
                                    color: '#ef4444',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                  }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Daily stats */}
            <div className="card" style={{ padding: '2rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.5rem',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <BarChart3 size={20} style={{ color: 'var(--primary)' }} />
                  <h2
                    style={{
                      fontSize: '14px',
                      fontWeight: 900,
                      color: 'var(--text-main)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                    }}
                  >
                    Daily Category Analytics
                  </h2>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'var(--overlay-soft)',
                    padding: '4px 10px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <Calendar size={12} style={{ color: 'var(--primary)' }} />
                  <input
                    type="date"
                    value={statsDate}
                    onChange={e => setStatsDate(e.target.value)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-main)',
                      fontSize: '11px',
                      fontWeight: 700,
                      outline: 'none',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
              </div>

              {statsQ.isLoading ? (
                <div style={{ padding: '3rem', textAlign: 'center' }}>
                  <Loader2
                    size={28}
                    className="animate-spin"
                    style={{ color: 'var(--primary)', margin: '0 auto' }}
                  />
                </div>
              ) : stats.length === 0 ? (
                <div
                  style={{
                    padding: '3rem',
                    textAlign: 'center',
                    border: '1px dashed var(--border)',
                    borderRadius: '20px',
                    background: 'var(--overlay-soft)',
                  }}
                >
                  <Activity
                    size={32}
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
                    No transactional data for {format(new Date(statsDate), 'MMM dd, yyyy')}
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: '1rem',
                  }}
                >
                  {stats.map((s, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '1.25rem',
                        background: 'rgba(16,185,129,0.03)',
                        borderRadius: '16px',
                        border: '1px solid rgba(16,185,129,0.12)',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
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
                      <h3
                        style={{
                          fontSize: '14px',
                          fontWeight: 900,
                          color: 'var(--text-main)',
                          marginBottom: '14px',
                          textTransform: 'uppercase',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {s.categoryName}
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '9px',
                              fontWeight: 900,
                              color: 'var(--text-muted)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.15em',
                            }}
                          >
                            Weight
                          </span>
                          <span
                            style={{
                              fontSize: '13px',
                              fontWeight: 950,
                              color: 'var(--primary)',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {(s.totalKg ?? 0).toLocaleString()} KG
                          </span>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '9px',
                              fontWeight: 900,
                              color: 'var(--text-muted)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.15em',
                            }}
                          >
                            Units
                          </span>
                          <span
                            style={{
                              fontSize: '13px',
                              fontWeight: 950,
                              color: 'var(--text-main)',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {(s.totalPcs ?? 0).toLocaleString()} PCS
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — info panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div
              className="card"
              style={{
                padding: '1.75rem',
                background:
                  'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.02) 60%, transparent)',
                border: '1px solid rgba(16,185,129,0.2)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '1.5rem',
                }}
              >
                <Info size={16} style={{ color: 'var(--primary)' }} />
                <h3
                  style={{
                    fontSize: '12px',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    color: 'var(--text-main)',
                  }}
                >
                  About Categories
                </h3>
              </div>
              <p
                style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                  lineHeight: 1.6,
                }}
              >
                Categories group products for organized stock, sales, and distribution tracking. Daily
                analytics aggregate volume across sales and distribution cycles in real time. Deactivating
                a category keeps historical records intact but hides it from new product entries.
              </p>
              <div
                style={{
                  marginTop: '1.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                {[
                  'Live integration with products',
                  'Auto-linked to sales & distribution',
                  'Deactivate to hide without deleting',
                ].map(t => (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        boxShadow: '0 0 8px var(--primary)',
                      }}
                    />
                    <span style={{ fontSize: '11px', color: 'var(--text-main)', fontWeight: 700 }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: '1.5rem' }}>
              <h4
                style={{
                  fontSize: '10px',
                  fontWeight: 900,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.2em',
                  marginBottom: '1rem',
                }}
              >
                API Endpoints
              </h4>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                }}
              >
                {[
                  ['GET', '/categories'],
                  ['POST', '/categories'],
                  ['PATCH', '/categories/:id'],
                  ['DELETE', '/categories/:id'],
                  ['GET', '/categories/stats/daily'],
                ].map(([m, p]) => (
                  <div key={`${m}-${p}`} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: 'rgba(16,185,129,0.1)',
                        color: 'var(--primary)',
                        fontSize: '9px',
                        fontWeight: 900,
                        minWidth: '48px',
                        textAlign: 'center',
                      }}
                    >
                      {m}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>{p}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Create / edit modal ─────────────────────────── */}
        {modal.mode !== 'closed' && (
          <CategoryModal
            initial={modal.mode === 'edit' ? modal.category : undefined}
            pending={createMutation.isPending || updateMutation.isPending}
            onClose={() => setModal({ mode: 'closed' })}
            onSave={handleSave}
          />
        )}

        {/* ── Confirm delete ──────────────────────────────── */}
        {confirmDelete && (
          <ConfirmDialog
            title="Delete Category"
            message={`Remove "${confirmDelete.name}"? This action cannot be undone.`}
            confirmLabel={deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            pending={deleteMutation.isPending}
            onCancel={() => setConfirmDelete(null)}
            onConfirm={handleDelete}
          />
        )}
    </div>
  );

  return hideLayout ? content : <MainLayout>{content}</MainLayout>;
}

/* ─── Modal: create/edit category ─────────────────────────── */
function CategoryModal({
  initial,
  pending,
  onClose,
  onSave,
}: {
  initial?: Category;
  pending: boolean;
  onClose: () => void;
  onSave: (input: CategoryInput) => void;
}) {
  const isEdit = !!initial;
  const [form, setForm] = useState<CategoryInput>({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    isActive: initial?.isActive ?? true,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: CategoryInput = {
      name: form.name.trim(),
      description: form.description?.trim() || undefined,
      isActive: form.isActive,
    };
    onSave(payload);
  };

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div
        className="sheet-content animate-fade-in"
        style={{ maxWidth: '520px' }}
        onClick={e => e.stopPropagation()}
      >
        <div
          style={{
            padding: '1.5rem 2rem',
            borderBottom: '1px solid var(--border-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--overlay-soft)',
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
              {isEdit ? <Edit2 size={16} /> : <Plus size={16} />}
            </div>
            <div>
              <h2
                style={{
                  fontSize: '15px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  color: 'var(--text-main)',
                  letterSpacing: '0.05em',
                }}
              >
                {isEdit ? 'Modify' : 'Register'} <span style={{ color: 'var(--primary)' }}>Category</span>
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
                {isEdit ? `Editing · ${initial?.id}` : 'New Category'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px',
              borderRadius: '10px',
              background: 'var(--surface)',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '2rem', flex: 1, overflowY: 'auto' }} className="custom-scrollbar">
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
              Category Name
            </label>
            <input
              className="input-premium"
              required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Organic Vegetables"
            />
          </div>

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
              Description (optional)
            </label>
            <textarea
              className="input-premium"
              value={form.description ?? ''}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the scope of this category…"
              style={{ minHeight: '96px', paddingTop: '12px', paddingBottom: '12px', resize: 'vertical' }}
            />
          </div>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              background: 'var(--overlay-soft)',
              cursor: 'pointer',
            }}
          >
            <div>
              <p
                style={{
                  fontSize: '11px',
                  fontWeight: 900,
                  color: 'var(--text-main)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                Active
              </p>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
                Available for new product entries
              </p>
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, isActive: !form.isActive })}
              aria-pressed={!!form.isActive}
              style={{
                position: 'relative',
                width: '44px',
                height: '24px',
                borderRadius: '999px',
                border: 'none',
                background: form.isActive ? 'var(--primary)' : 'var(--overlay-strong)',
                transition: 'background 0.2s',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: '3px',
                  left: form.isActive ? '23px' : '3px',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: 'white',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                }}
              />
            </button>
          </label>

          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-soft)' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              style={{ flex: 1, height: '52px' }}
              disabled={pending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{
                flex: 1,
                height: '52px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
              disabled={pending || !form.name.trim()}
            >
              {pending ? (
                <Loader2 className="animate-spin" size={16} />
              ) : isEdit ? (
                'Commit Changes'
              ) : (
                'Register Category'
              )}
            </button>
          </div>
        </form>
      </div>
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
