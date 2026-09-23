'use client';

import React, { useMemo, useState } from 'react';
import MainLayout from '@/components/MainLayout';
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useRestoreProduct,
  useProductHistory,
  useCategories,
  type ProductCreateInput,
  type ProductUpdateInput,
} from '@/hooks/api';
import type { Product, Unit, ProductStatus } from '@/lib/types';
import { ApiError } from '@/lib/api';
import {
  Plus,
  Package,
  Search,
  Loader2,
  Edit2,
  Trash2,
  RotateCcw,
  History,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Layers,
  Tag,
  FileX,
  Coins,
  Activity,
  TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';

const UNITS: Unit[] = ['kg', 'piece', 'pcs', 'sack', 'crate', 'litre', 'bundle'];
const STATUSES: ProductStatus[] = ['Active', 'Inactive'];

type InUseCounts = {
  stockEntries?: number;
  distributionLines?: number;
  saleItems?: number;
  stockAdjustments?: number;
};

const ERROR_COPY: Record<string, string> = {
  INVALID_CATEGORY: 'The selected category does not exist or is inactive.',
  DUPLICATE_NAME: 'A product with this name already exists.',
  NOT_FOUND: 'Product not found — it may have already been removed.',
  IN_USE: 'Cannot delete — this product is referenced by other records.',
  NOT_DELETED: 'This product is not deleted, so it cannot be restored.',
  VALIDATION_ERROR: 'Please check the form — one or more fields are invalid.',
};

function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    const base = ERROR_COPY[err.code ?? ''] ?? err.message;
    if (err.fields) {
      const parts = Object.entries(err.fields).map(
        ([k, v]) => `${k}: ${(v || []).join(', ')}`
      );
      if (parts.length) return `${base} (${parts.join(' · ')})`;
    }
    return base;
  }
  return err instanceof Error ? err.message : 'Unexpected error';
}

export default function ProductsPage({ hideLayout = false }: { hideLayout?: boolean }) {
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState<string>('all');
  const [status, setStatus] = useState<ProductStatus | 'all'>('all');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<Product | null>(null);
  const [inUse, setInUse] = useState<{ product: Product; counts: InUseCounts } | null>(null);
  const [historyFor, setHistoryFor] = useState<Product | null>(null);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(() => new Set());

  const categoriesQ = useCategories();
  const categories = categoriesQ.data ?? [];

  const listQ = useProducts({
    q: q || undefined,
    categoryId: categoryId === 'all' ? undefined : categoryId,
    status: status === 'all' ? undefined : status,
    includeDeleted: includeDeleted || undefined,
    page,
    pageSize,
    sort: 'name',
  });

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();
  const restoreMutation = useRestoreProduct();

  const rows = useMemo(() => listQ.data?.data ?? [], [listQ.data?.data]);
  const total = listQ.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const { activeCount, stockedCount } = useMemo(() => {
    let active = 0;
    let stocked = 0;
    for (const p of rows) {
      if (p.status === 'Active' && !p.deletedAt) active += 1;
      if ((p.stock ?? 0) > 0) stocked += 1;
    }
    return { activeCount: active, stockedCount: stocked };
  }, [rows]);

  const resetFilters = () => {
    setQ(''); setCategoryId('all'); setStatus('all'); setIncludeDeleted(false); setPage(1);
  };

  const openCreate = () => {
    setEditing(null);
    setErrorMsg(null);
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleSubmit = async (body: ProductCreateInput) => {
    setErrorMsg(null);
    try {
      if (editing) {
        const patch: ProductUpdateInput = {
          name: body.name,
          categoryId: body.categoryId,
          unit: body.unit,
          basePrice: body.basePrice,
          tradePrice: body.tradePrice,
          status: body.status,
        };
        await updateMutation.mutateAsync({ id: editing.id, body: patch });
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
      if (err instanceof ApiError && err.code === 'IN_USE') {
        const counts = (err.raw as { error?: { fields?: InUseCounts } })?.error?.fields ?? {};
        setInUse({ product: confirmDelete, counts });
        setConfirmDelete(null);
      } else {
        setErrorMsg(describeError(err));
      }
    }
  };

  const handleRestore = async () => {
    if (!confirmRestore) return;
    setErrorMsg(null);
    try {
      await restoreMutation.mutateAsync(confirmRestore.id);
      setConfirmRestore(null);
    } catch (err) {
      setErrorMsg(describeError(err));
      setConfirmRestore(null);
    }
  };

  const handleToggleStatus = async (p: Product) => {
    if (togglingIds.has(p.id)) return;
    const next: ProductStatus = p.status === 'Active' ? 'Inactive' : 'Active';
    setErrorMsg(null);
    setTogglingIds(s => {
      const ns = new Set(s);
      ns.add(p.id);
      return ns;
    });
    try {
      await updateMutation.mutateAsync({ id: p.id, body: { status: next } });
    } catch (err) {
      setErrorMsg(describeError(err));
    } finally {
      setTogglingIds(s => {
        const ns = new Set(s);
        ns.delete(p.id);
        return ns;
      });
    }
  };

  const hasFilters = q || categoryId !== 'all' || status !== 'all' || includeDeleted;

  const content = (
    <div
      className="animate-fade-in"
      style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '4rem' }}
    >
      {/* Header */}
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
              <Package size={28} />
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
                Product <span style={{ color: 'var(--primary)' }}>Catalog</span>
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
                Manage Your Products · {total} Items
              </p>
            </div>
          </div>

          <button
            onClick={openCreate}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <Plus size={18} />
            Add Product
          </button>
        </div>
      )}

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
        <StatCard
          label="Total Products"
          value={total.toLocaleString()}
          sub="Matching current filter"
          icon={<Package size={20} />}
        />
        <StatCard
          label="Active (this page)"
          value={activeCount.toLocaleString()}
          sub={`of ${rows.length} visible`}
          icon={<Activity size={20} />}
        />
        <StatCard
          label="Products With Stock"
          value={stockedCount.toLocaleString()}
          sub="Lot prices are set in purchase entry"
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
            style={{
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

      {/* Filters and Add button for Settings mode */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap'
        }}
      >
        <div
          className="card"
          style={{
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
            flex: 1
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
              placeholder="Search by name or code…"
              className="input-premium"
              style={{ width: '100%', paddingLeft: '44px' }}
              value={q}
              onChange={e => { setQ(e.target.value); setPage(1); }}
            />
          </div>

          <FilterSelect
            icon={<Filter size={12} />}
            label="Category"
            value={categoryId}
            onChange={v => { setCategoryId(v); setPage(1); }}
            options={[
              { value: 'all', label: 'All categories' },
              ...categories.map(c => ({ value: c.id, label: c.name })),
            ]}
          />

          <FilterSelect
            icon={<Activity size={12} />}
            label="Status"
            value={status}
            onChange={v => { setStatus(v as ProductStatus | 'all'); setPage(1); }}
            options={[
              { value: 'all', label: 'All' },
              { value: 'Active', label: 'Active' },
              { value: 'Inactive', label: 'Inactive' },
            ]}
          />

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--background)',
              padding: '8px 14px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: includeDeleted ? 'var(--primary)' : 'var(--text-muted)',
            }}
          >
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={e => { setIncludeDeleted(e.target.checked); setPage(1); }}
              style={{ accentColor: 'var(--primary)' }}
            />
            Show deleted
          </label>

          {hasFilters && (
            <button
              onClick={resetFilters}
              className="btn-secondary"
              style={{ padding: '0.5rem 1rem', fontSize: '10px' }}
            >
              Clear
            </button>
          )}
        </div>

        {hideLayout && (
          <button
            onClick={openCreate}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '54px', padding: '0 24px' }}
          >
            <Plus size={18} />
            Add Product
          </button>
        )}
      </div>

      {/* Table */}
      <div className="table-container shadow-lg">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Code', 'Name', 'Category', 'Unit', 'Stock', 'Buy / Sell', 'Status', 'Actions'].map(h => (
                <th key={h} className="table-header">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {listQ.isLoading ? (
              <SkeletonRows count={8} />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '5rem', textAlign: 'center' }}>
                  <FileX
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
                    No products match your filters
                  </p>
                </td>
              </tr>
            ) : (
              rows.map(p => {
                const deleted = !!p.deletedAt;
                return (
                  <tr key={p.id} className="table-row" style={{ opacity: deleted ? 0.55 : 1 }}>
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
                        {p.id}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div
                        style={{
                          fontWeight: 800,
                          color: 'var(--text-main)',
                          fontSize: '13px',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {p.name}
                        {deleted && (
                          <span
                            style={{
                              marginLeft: '8px',
                              padding: '2px 6px',
                              borderRadius: '6px',
                              background: 'rgba(239,68,68,0.12)',
                              color: '#ef4444',
                              fontSize: '8px',
                              fontWeight: 900,
                              textTransform: 'uppercase',
                              letterSpacing: '0.15em',
                            }}
                          >
                            Deleted
                          </span>
                        )}
                      </div>
                      {p.updatedAt && (
                        <div
                          style={{
                            fontSize: '9px',
                            color: 'var(--text-muted)',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            opacity: 0.55,
                          }}
                        >
                          Updated {format(new Date(p.updatedAt), 'MMM dd, yyyy')}
                        </div>
                      )}
                    </td>
                    <td className="table-cell">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Layers size={12} style={{ color: 'var(--text-muted)' }} />
                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-main)',
                            fontWeight: 700,
                          }}
                        >
                          {p.category?.name ?? '—'}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Tag size={11} style={{ color: 'var(--text-muted)', opacity: 0.6 }} />
                        <span
                          style={{
                            fontSize: '10px',
                            color: 'var(--text-muted)',
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                          }}
                        >
                          {p.unit}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: 950,
                          color: 'var(--text-main)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {(p.stock ?? 0).toLocaleString()}
                      </span>
                      <div
                        style={{
                          width: '60px',
                          height: '3px',
                          background: 'var(--border-soft)',
                          borderRadius: '99px',
                          marginTop: '6px',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(100, ((p.stock ?? 0) / 500) * 100)}%`,
                            background:
                              (p.stock ?? 0) < 50
                                ? '#ef4444'
                                : (p.stock ?? 0) < 150
                                ? '#f59e0b'
                                : '#10b981',
                            borderRadius: '99px',
                          }}
                        />
                      </div>
                    </td>
                    <td className="table-cell">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
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
                            Lot Pricing
                          </p>
                          <p
                            style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              color: 'var(--text-muted)',
                            }}
                          >
                            Set during purchase
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      {(() => {
                        const isToggling = togglingIds.has(p.id);
                        const isActive = p.status === 'Active';
                        const disabled = isToggling || deleted;
                        return (
                          <button
                            type="button"
                            title={
                              deleted
                                ? 'Deleted products cannot be toggled'
                                : `Click to set ${isActive ? 'Inactive' : 'Active'}`
                            }
                            disabled={disabled}
                            onClick={() => handleToggleStatus(p)}
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
                              background: isActive
                                ? 'rgba(16,185,129,0.1)'
                                : 'var(--border-soft)',
                              color: isActive ? '#10b981' : 'var(--text-muted)',
                              border: `1px solid ${
                                isActive ? 'rgba(16,185,129,0.2)' : 'var(--overlay-strong)'
                              }`,
                              cursor: disabled ? 'wait' : 'pointer',
                              opacity: disabled && !isToggling ? 0.5 : 1,
                              transition: 'all 0.18s',
                            }}
                          >
                            {isToggling ? (
                              <Loader2 className="animate-spin" size={11} />
                            ) : (
                              <span
                                style={{
                                  width: '5px',
                                  height: '5px',
                                  borderRadius: '50%',
                                  background: isActive ? 'currentColor' : '#888',
                                }}
                              />
                            )}
                            {isToggling ? 'Saving…' : p.status}
                          </button>
                        );
                      })()}
                    </td>
                    <td className="table-cell">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <IconBtn
                          title="History"
                          onClick={() => setHistoryFor(p)}
                          color="#94a3b8"
                        >
                          <History size={13} />
                        </IconBtn>
                        {deleted ? (
                          <IconBtn
                            title="Restore"
                            onClick={() => setConfirmRestore(p)}
                            color="var(--primary)"
                          >
                            <RotateCcw size={13} />
                          </IconBtn>
                        ) : (
                          <>
                            <IconBtn
                              title="Edit"
                              onClick={() => openEdit(p)}
                              color="#94a3b8"
                            >
                              <Edit2 size={13} />
                            </IconBtn>
                            <IconBtn
                              title="Delete"
                              onClick={() => setConfirmDelete(p)}
                              color="#ef4444"
                            >
                              <Trash2 size={13} />
                            </IconBtn>
                          </>
                        )}
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <span
            style={{
              fontSize: '10px',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              color: 'var(--text-muted)',
              opacity: 0.6,
            }}
          >
            Page {page} of {totalPages} · {total} records
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn-secondary"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              style={{
                padding: '0.5rem 0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: page <= 1 ? 0.4 : 1,
              }}
            >
              <ChevronLeft size={14} />
              Prev
            </button>
            <button
              className="btn-secondary"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              style={{
                padding: '0.5rem 0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: page >= totalPages ? 0.4 : 1,
              }}
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {modalOpen && (
        <ProductModal
          editing={editing}
          pending={createMutation.isPending || updateMutation.isPending}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSubmit={handleSubmit}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          tone="danger"
          title="Delete Product"
          message={`Remove "${confirmDelete.name}"? If it's referenced elsewhere this will fail, and you'll be shown where.`}
          confirmLabel={deleteMutation.isPending ? 'Deleting…' : 'Delete'}
          pending={deleteMutation.isPending}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={handleDelete}
        />
      )}

      {confirmRestore && (
        <ConfirmDialog
          tone="success"
          title="Restore Product"
          message={`Restore "${confirmRestore.name}"? It will appear in lists again.`}
          confirmLabel={restoreMutation.isPending ? 'Restoring…' : 'Restore'}
          pending={restoreMutation.isPending}
          onCancel={() => setConfirmRestore(null)}
          onConfirm={handleRestore}
        />
      )}

      {inUse && (
        <InUseDialog
          product={inUse.product}
          counts={inUse.counts}
          onClose={() => setInUse(null)}
        />
      )}

      {historyFor && (
        <HistoryModal
          product={historyFor}
          onClose={() => setHistoryFor(null)}
        />
      )}
    </div>
  );

  return hideLayout ? content : <MainLayout>{content}</MainLayout>;
}

/* ─── Skeleton rows (premium loading) ─────────────────────── */
function SkeletonRows({ count = 6 }: { count?: number }) {
  const widths = ['62%', '88%', '55%', '72%', '95%', '66%', '80%', '58%'];
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr
          key={i}
          className="table-row"
          style={{
            animation: `fade-in 0.5s ${i * 40}ms cubic-bezier(0.23, 1, 0.32, 1) both`,
          }}
        >
          {/* Code */}
          <td className="table-cell">
            <span className="skeleton skeleton-line" style={{ width: 74 }} />
          </td>

          {/* Name */}
          <td className="table-cell">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span className="skeleton skeleton-block" style={{ width: widths[i % widths.length] }} />
              <span className="skeleton skeleton-line" style={{ width: '40%', height: 7, opacity: 0.6 }} />
            </div>
          </td>

          {/* Category */}
          <td className="table-cell">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="skeleton" style={{ width: 12, height: 12, borderRadius: 4 }} />
              <span className="skeleton skeleton-line" style={{ width: 86 }} />
            </div>
          </td>

          {/* Unit */}
          <td className="table-cell">
            <span className="skeleton skeleton-pill" style={{ width: 54 }} />
          </td>

          {/* Stock */}
          <td className="table-cell">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span className="skeleton skeleton-block" style={{ width: 56 }} />
              <span
                className="skeleton"
                style={{ width: 60, height: 3, borderRadius: 99 }}
              />
            </div>
          </td>

          {/* Buy / Sell */}
          <td className="table-cell">
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span className="skeleton skeleton-line" style={{ width: 28, height: 7 }} />
                <span className="skeleton skeleton-block" style={{ width: 52 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span className="skeleton skeleton-line" style={{ width: 28, height: 7 }} />
                <span className="skeleton skeleton-block" style={{ width: 52 }} />
              </div>
            </div>
          </td>

          {/* Status */}
          <td className="table-cell">
            <span className="skeleton skeleton-pill" style={{ width: 72 }} />
          </td>

          {/* Actions */}
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
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        background: 'var(--background)',
        padding: '4px',
        borderRadius: '12px',
        border: '1px solid var(--border)',
      }}
    >
      <div
        style={{
          padding: '0 10px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--text-muted)',
        }}
      >
        {icon}
        <span
          style={{
            fontSize: '10px',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          {label}
        </span>
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
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ─── Icon button ─────────────────────────────────────────── */
function IconBtn({
  title,
  onClick,
  color,
  children,
}: {
  title: string;
  onClick: () => void;
  color: string;
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

/* ─── Product modal ───────────────────────────────────────── */
function ProductModal({
  editing,
  pending,
  onClose,
  onSubmit,
}: {
  editing: Product | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (body: ProductCreateInput) => void;
}) {
  const categoriesQ = useCategories();
  const categories = categoriesQ.data ?? [];
  const activeCategories = categories.filter(c => c.isActive !== false);

  const [form, setForm] = useState<ProductCreateInput>({
    name: editing?.name ?? '',
    categoryId: editing?.categoryId ?? activeCategories[0]?.id ?? '',
    unit: editing?.unit ?? 'kg',
    basePrice: editing?.basePrice ?? 0,
    tradePrice: editing?.tradePrice ?? 0,
    status: editing?.status ?? 'Active',
  });

  const canSubmit =
    form.name.trim().length > 0 &&
    !!form.categoryId;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...form,
      name: form.name.trim(),
    });
  };

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet-content animate-fade-in" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
        <div
          style={{
            padding: '1.5rem 2rem',
            borderBottom: '1px solid var(--border-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(16,185,129,0.03)',
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
              <Package size={20} />
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
                {editing ? 'Modify' : 'Register'} <span style={{ color: 'var(--primary)' }}>Product</span>
              </h2>
              <p
                style={{
                  fontSize: '10px',
                  fontWeight: 900,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.2em',
                  opacity: 0.5,
                  marginTop: '2px',
                }}
              >
                {editing ? `ID: ${editing.id}` : 'Product Identity'}
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
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '2.5rem 2rem', flex: 1, overflowY: 'auto' }} className="custom-scrollbar">
          <Field label="Name">
            <input
              type="text"
              className="input-premium"
              required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Fresh Tomato"
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Field label="Category">
              <select
                className="input-premium"
                required
                value={form.categoryId}
                onChange={e => setForm({ ...form, categoryId: e.target.value })}
              >
                <option value="">Select…</option>
                {activeCategories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Unit">
              <select
                className="input-premium"
                value={form.unit}
                onChange={e => setForm({ ...form, unit: e.target.value as Unit })}
              >
                {UNITS.map(u => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </Field>
          </div>



          {editing && (
            <Field label="Status">
              <select
                className="input-premium"
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value as ProductStatus })}
              >
                {STATUSES.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <p
            style={{
              fontSize: '10px',
              color: 'var(--text-muted)',
              fontWeight: 700,
              padding: '10px 14px',
              background: 'var(--overlay-soft)',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              lineHeight: 1.5,
            }}
          >
            Actual buy and sell prices are finalized during purchase entry from landed cost,
            tax, and profit. This product record only stores the name, category, unit, and status.
          </p>

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
              disabled={!canSubmit || pending}
            >
              {pending && <Loader2 className="animate-spin" size={16} />}
              {editing ? 'Commit Changes' : 'Register Asset'}
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

/* ─── In-use dialog ───────────────────────────────────────── */
function InUseDialog({
  product,
  counts,
  onClose,
}: {
  product: Product;
  counts: InUseCounts;
  onClose: () => void;
}) {
  const rows: { label: string; value: number }[] = [
    { label: 'Stock entries', value: counts.stockEntries ?? 0 },
    { label: 'Stock adjustments', value: counts.stockAdjustments ?? 0 },
    { label: 'Distribution lines', value: counts.distributionLines ?? 0 },
    { label: 'Sale items', value: counts.saleItems ?? 0 },
  ];
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
      onClick={onClose}
    >
      <div
        className="card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '480px',
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
            Cannot Delete
          </h3>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, lineHeight: 1.5 }}>
          <b style={{ color: 'var(--text-main)' }}>{product.name}</b> is referenced by other records and
          can&apos;t be removed. Setting it to <b style={{ color: 'var(--primary)' }}>Inactive</b> is
          usually the right move.
        </p>

        <div
          style={{
            marginTop: '1rem',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            overflow: 'hidden',
          }}
        >
          {rows.map((r, i) => (
            <div
              key={r.label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none',
                background: r.value > 0 ? 'rgba(239,68,68,0.04)' : 'transparent',
              }}
            >
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                }}
              >
                {r.label}
              </span>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 900,
                  color: r.value > 0 ? '#ef4444' : 'var(--text-muted)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {r.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <button type="button" onClick={onClose} className="btn-primary" style={{ minWidth: 120 }}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── History modal ───────────────────────────────────────── */
function HistoryModal({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const { data, isLoading, error } = useProductHistory(product.id);

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
      onClick={onClose}
    >
      <div
        className="card animate-fade-in custom-scrollbar"
        style={{
          width: '100%',
          maxWidth: '720px',
          padding: '2rem',
          border: '1px solid rgba(16,185,129,0.2)',
          maxHeight: '92vh',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem',
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
              <History size={16} />
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
                Product <span style={{ color: 'var(--primary)' }}>History</span>
              </h2>
              <p
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  marginTop: '2px',
                }}
              >
                {product.name} · {product.id}
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

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                style={{
                  borderRadius: '14px',
                  border: '1px solid var(--border)',
                  background: 'var(--overlay-soft)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: 'rgba(16,185,129,0.04)',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <span className="skeleton skeleton-block" style={{ width: 140 }} />
                  <span className="skeleton skeleton-pill" />
                </div>
                {[0, 1, 2].map(j => (
                  <div
                    key={j}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1.4fr 1fr',
                      gap: '1rem',
                      padding: '11px 14px',
                      borderBottom: '1px solid var(--overlay-soft)',
                    }}
                  >
                    <span className="skeleton skeleton-line" style={{ width: '70%' }} />
                    <span className="skeleton skeleton-line" />
                    <span className="skeleton skeleton-line" style={{ width: '60%', justifySelf: 'end' }} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : error ? (
          <p style={{ fontSize: '12px', color: '#ef4444', fontWeight: 700 }}>
            {error instanceof Error ? error.message : 'Failed to load history'}
          </p>
        ) : data ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <HistorySection
              title="Stock Entries"
              count={data.stockEntries.length}
              icon={<TrendingUp size={14} />}
            >
              {data.stockEntries.slice(0, 8).map(e => (
                <HistoryRow
                  key={e.id}
                  left={format(new Date(e.date), 'MMM dd, yyyy')}
                  mid={`+${e.quantity} @ ৳${e.basePrice}`}
                  right={e.source || '—'}
                />
              ))}
            </HistorySection>

            <HistorySection
              title="Adjustments"
              count={data.stockAdjustments.length}
              icon={<Activity size={14} />}
            >
              {data.stockAdjustments.slice(0, 8).map(a => (
                <HistoryRow
                  key={a.id}
                  left={format(new Date(a.date), 'MMM dd, yyyy')}
                  mid={`${a.quantity > 0 ? '+' : ''}${a.quantity} · ${a.reason}`}
                  right={a.location}
                />
              ))}
            </HistorySection>

            <HistorySection
              title="Distribution Lines"
              count={data.distributionLines.length}
              icon={<Layers size={14} />}
            >
              {data.distributionLines.slice(0, 8).map(l => (
                <HistoryRow
                  key={l.id}
                  left={l.id}
                  mid={`Allocated ${l.allocated}`}
                  right={`Returned ${l.returned}`}
                />
              ))}
            </HistorySection>

            <HistorySection
              title="Sale Items"
              count={data.saleItems.length}
              icon={<Coins size={14} />}
            >
              {data.saleItems.slice(0, 8).map(s => (
                <HistoryRow
                  key={s.id}
                  left={s.id}
                  mid={`${s.qty} × ৳${s.price}`}
                  right={`৳${s.subtotal}`}
                />
              ))}
            </HistorySection>

            <HistorySection
              title="Audit"
              count={data.audit.length}
              icon={<History size={14} />}
            >
              {data.audit.slice(0, 10).map(a => (
                <HistoryRow
                  key={a.id}
                  left={format(new Date(a.createdAt), 'MMM dd, HH:mm')}
                  mid={a.action}
                  right={a.actor ?? '—'}
                />
              ))}
            </HistorySection>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function HistorySection({
  title,
  count,
  icon,
  children,
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        borderRadius: '14px',
        border: '1px solid var(--border)',
        background: 'var(--overlay-soft)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderBottom: count > 0 ? '1px solid var(--border)' : 'none',
          background: 'rgba(16,185,129,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
          {icon}
          <span
            style={{
              fontSize: '10px',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              color: 'var(--text-main)',
            }}
          >
            {title}
          </span>
        </div>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 900,
            color: 'var(--primary)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {count}
        </span>
      </div>
      {count > 0 && <div>{children}</div>}
    </div>
  );
}

function HistoryRow({
  left,
  mid,
  right,
}: {
  left: string;
  mid: string;
  right: string;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.4fr 1fr',
        gap: '1rem',
        padding: '9px 14px',
        fontSize: '11px',
        color: 'var(--text-muted)',
        fontWeight: 700,
        borderBottom: '1px solid var(--overlay-soft)',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <span>{left}</span>
      <span style={{ color: 'var(--text-main)' }}>{mid}</span>
      <span style={{ textAlign: 'right', opacity: 0.7 }}>{right}</span>
    </div>
  );
}

/* ─── Confirm dialog ──────────────────────────────────────── */
function ConfirmDialog({
  tone = 'danger',
  title,
  message,
  confirmLabel,
  pending,
  onCancel,
  onConfirm,
}: {
  tone?: 'danger' | 'success';
  title: string;
  message: string;
  confirmLabel: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const accent = tone === 'danger' ? '#ef4444' : '#10b981';
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
          border: `1px solid ${accent}40`,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
          <div
            style={{
              padding: '10px',
              background: `${accent}1a`,
              border: `1px solid ${accent}33`,
              borderRadius: '12px',
              color: accent,
            }}
          >
            {tone === 'danger' ? <AlertTriangle size={16} /> : <RotateCcw size={16} />}
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
              background: accent,
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
