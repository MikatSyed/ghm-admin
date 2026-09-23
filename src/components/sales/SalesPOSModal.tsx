'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { Minus, Plus, Search, ShoppingCart, X } from 'lucide-react';
import { useCategories, useCreateSale, useProducts, useVanStockSummary, useVans, qk } from '@/hooks/api';
import { ApiError } from '@/lib/api';
import { getCartTotals } from '@/lib/cart';
import { formatBDT, formatInt, todayInDhakaISO } from '@/lib/format';
import { useSalesCart } from '@/store/useSalesCart';
import type { Product, VanStockSummaryProduct } from '@/lib/types';

interface SalesPOSModalProps {
  vanId?: string | null;
  date?: string;
  onClose: () => void;
}

type SuccessState = { invoiceId: string; saleId: string | null } | null;

export default function SalesPOSModal({ vanId: initialVanId, date: initialDate, onClose }: SalesPOSModalProps) {
  const queryClient = useQueryClient();
  const searchRef = useRef<HTMLInputElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [alert, setAlert] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState>(null);
  const [lineErrors, setLineErrors] = useState<Record<string, string>>({});

  const cartVanId = useSalesCart((s) => s.vanId);
  const cartDate = useSalesCart((s) => s.date);
  const lines = useSalesCart((s) => s.lines);
  const setVan = useSalesCart((s) => s.setVan);
  const setDate = useSalesCart((s) => s.setDate);
  const upsertLine = useSalesCart((s) => s.upsertLine);
  const setQty = useSalesCart((s) => s.setQty);
  const setPrice = useSalesCart((s) => s.setPrice);
  const remove = useSalesCart((s) => s.remove);
  const clear = useSalesCart((s) => s.clear);

  const { data: vans } = useVans();
  const { data: categories } = useCategories();
  const productsQ = useProducts({ pageSize: 200, status: 'Active', q: searchQ || undefined });
  const stockQ = useVanStockSummary(cartVanId ?? null, cartDate);
  const createSale = useCreateSale();

  const activeVans = useMemo(() => (vans ?? []).filter((v) => v.isActive !== false), [vans]);
  const products = useMemo(() => productsQ.data?.data ?? [], [productsQ.data]);
  const cartLines = useMemo(() => Object.values(lines), [lines]);
  const stockMap = useMemo(() => new Map((stockQ.data?.products ?? []).map((p) => [p.productId, p])), [stockQ.data]);
  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const allocatedProducts = useMemo(() => products.filter((p) => stockMap.has(p.id)), [products, stockMap]);
  const allocatedCategoryIds = useMemo(() => new Set(allocatedProducts.map((p) => p.categoryId)), [allocatedProducts]);
  const effectiveCategoryId = allocatedCategoryIds.has(categoryId) ? categoryId : '';
  const visibleProducts = useMemo(() => (
    effectiveCategoryId ? allocatedProducts.filter((p) => p.categoryId === effectiveCategoryId) : allocatedProducts
  ), [allocatedProducts, effectiveCategoryId]);
  const visibleCategories = useMemo(() => (
    (categories ?? []).filter((c) => allocatedCategoryIds.has(c.id))
  ), [categories, allocatedCategoryIds]);
  const { itemCount, total } = getCartTotals(cartLines);
  const anyLineOverStock = cartLines.some((line) => line.qty > (stockMap.get(line.productId)?.available ?? 0));
  const canFinalize = !!cartVanId && cartLines.length > 0 && !anyLineOverStock && !createSale.isPending;

  const handleClose = useCallback(() => {
    clear();
    onClose();
  }, [clear, onClose]);

  const addProduct = useCallback((product: Product) => {
    // A damaged/salvage lot's discounted price always wins — never default a
    // driver back to the product's full price for redistributed damaged stock.
    const price = stockMap.get(product.id)?.unitPrice ?? product.tradePrice;
    upsertLine({ productId: product.id, price, qty: 1 });
    setLineErrors((prev) => {
      const next = { ...prev };
      delete next[product.id];
      return next;
    });
  }, [upsertLine, stockMap]);

  useEffect(() => {
    if (initialVanId !== undefined) setVan(initialVanId);
    if (initialDate) setDate(initialDate);
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
      clear();
    };
  }, [initialVanId, initialDate, setVan, setDate, clear]);

  useEffect(() => {
    if (!cartVanId && activeVans.length === 1) setVan(activeVans[0].id);
  }, [activeVans, cartVanId, setVan]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter' && document.activeElement === searchRef.current) {
        const first = visibleProducts[0];
        if (first) {
          addProduct(first);
          setSearchQ('');
        }
        return;
      }

      const active = document.activeElement;
      const editing =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement ||
        active?.hasAttribute('contenteditable');
      if (editing) return;

      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (cartLines.length > 0) {
          if (window.confirm('Clear cart?')) clear();
        } else {
          handleClose();
        }
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [visibleProducts, cartLines.length, clear, handleClose, addProduct]);

  async function finalizeSale() {
    if (!cartVanId || !canFinalize) return;
    setAlert(null);
    setLineErrors({});
    try {
      const result = await createSale.mutateAsync({ vanId: cartVanId, date: cartDate, items: cartLines });
      const raw = result as typeof result & { saleId?: string; sale?: { id?: string } };
      setSuccess({ invoiceId: result.id, saleId: raw.saleId ?? raw.sale?.id ?? null });
      clear();
      closeTimerRef.current = window.setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        const mapped: Record<string, string> = {};
        for (const [key, messages] of Object.entries(err.fields)) {
          const message = messages.join(', ');
          for (const line of cartLines) if (key.includes(line.productId)) mapped[line.productId] = message;
        }
        setLineErrors(mapped);
      }
      if (cartVanId) await queryClient.invalidateQueries({ queryKey: qk.vanStockSummary(cartVanId, cartDate) });
      setAlert(err instanceof Error ? err.message : 'Sale could not be recorded');
    }
  }

  const showCategoryTabs = visibleCategories.length > 1;
  const showSearch = allocatedProducts.length > 8;

  return (
    <div className="sheet-overlay" onClick={handleClose}>
      <div
        className="sheet-content animate-fade-in custom-scrollbar"
        style={{ maxWidth: '1180px', padding: 0, overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(16,185,129,0.04)', position: 'sticky', top: 0, zIndex: 3 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', background: 'rgba(16,185,129,0.1)', borderRadius: '10px', color: 'var(--primary)', display: 'flex' }}>
              <ShoppingCart size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-main)' }}>New Sale</h2>
              <p style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.18em', opacity: 0.6 }}>{cartDate}</p>
            </div>
          </div>
          <button type="button" onClick={handleClose} style={{ border: 'none', background: 'var(--overlay-medium)', color: 'var(--text-muted)', borderRadius: '10px', padding: '8px', cursor: 'pointer', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '7rem' }}>
          {success && (
            <div className="card" style={{ padding: '1rem', borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.05)', display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <strong style={{ color: 'var(--primary)' }}>Sale recorded · {success.invoiceId}</strong>
              {success.saleId ? (
                <Link href={`/dashboard/sales/${success.saleId}`} className="btn-secondary" style={{ textDecoration: 'none' }}>View receipt →</Link>
              ) : (
                // TODO(backend): return the created sale id from POST /sales so POS can link directly to the receipt.
                <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 800 }}>Receipt link unavailable</span>
              )}
            </div>
          )}

          {alert && <div className="card" style={{ padding: '1rem', color: '#ef4444', background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.2)', fontWeight: 800 }}>{alert}</div>}

          <div className="pos-toolbar" style={{ top: 0 }}>
            <Field label="Van">
              <select className="input-premium" value={cartVanId ?? ''} onChange={(e) => setVan(e.target.value || null)}>
                <option value="">Select van</option>
                {activeVans.map((v) => <option key={v.id} value={v.id}>{v.vanName} · {v.driver}</option>)}
              </select>
            </Field>
            <Field label="Date">
              <input type="date" className="input-premium" value={cartDate} max={todayInDhakaISO()} onChange={(e) => setDate(e.target.value)} />
            </Field>
            {cartLines.length > 0 && <button className="btn-secondary" onClick={clear}>Clear Cart</button>}
          </div>

          <div className="pos-grid">
            <section className="pos-product-pane">
              {cartVanId && (showCategoryTabs || showSearch) && (
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {showCategoryTabs && (
                    <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                      <Chip active={!effectiveCategoryId} onClick={() => setCategoryId('')}>All</Chip>
                      {visibleCategories.map((c) => <Chip key={c.id} active={effectiveCategoryId === c.id} onClick={() => setCategoryId(c.id)}>{c.name}</Chip>)}
                    </div>
                  )}
                  {showSearch && (
                    <div style={{ position: 'relative' }}>
                      <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input ref={searchRef} className="input-premium" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Search products" style={{ width: '100%', paddingLeft: '38px' }} />
                    </div>
                  )}
                </div>
              )}

              {!cartVanId && <EmptyCard text="Select a van to start a sale." />}
              {cartVanId && stockQ.isLoading && <ProductSkeleton />}
              {cartVanId && !stockQ.isLoading && allocatedProducts.length === 0 && <EmptyCard text="No stock allocated to this van for the selected date." />}
              {cartVanId && !stockQ.isLoading && allocatedProducts.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '0.75rem' }}>
                  {visibleProducts.map((product) => {
                    const stockInfo = stockMap.get(product.id);
                    const available = stockInfo?.available ?? 0;
                    const price = stockInfo?.unitPrice ?? product.tradePrice;
                    return (
                      <button key={product.id} type="button" className="card pos-product-card" onClick={() => addProduct(product)} style={{ textAlign: 'left', padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 900, color: 'var(--text-main)' }}>{product.name}</span>
                          {stockInfo?.isDamagedStock && (
                            <span
                              title="Salvaged stock — sells at the discounted price shown"
                              style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '6px', padding: '1px 6px' }}
                            >
                              Damaged
                            </span>
                          )}
                        </div>
                        <div style={{ marginTop: '0.35rem', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800 }}>{product.unit}</div>
                        <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center' }}>
                          <strong className="tabular-nums" style={{ color: 'var(--primary)', fontSize: '15px' }}>{formatBDT(price)}</strong>
                          <span className={`badge ${available > 0 ? 'badge-success' : 'badge-danger'}`}>{formatInt(available)} left</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <CartPane
              cartLines={cartLines}
              productMap={productMap}
              stockMap={stockMap}
              lineErrors={lineErrors}
              itemCount={itemCount}
              total={total}
              setQty={setQty}
              setPrice={setPrice}
              remove={remove}
            />
          </div>
        </div>

        <div className="pos-finalize-bar" style={{ position: 'sticky' }}>
          <button className="btn-primary" disabled={!canFinalize} onClick={finalizeSale} style={{ width: '100%', opacity: canFinalize ? 1 : 0.45, cursor: canFinalize ? 'pointer' : 'not-allowed' }}>
            {createSale.isPending ? 'Recording...' : 'Finalize Sale'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CartPane({
  cartLines,
  productMap,
  stockMap,
  lineErrors,
  itemCount,
  total,
  setQty,
  setPrice,
  remove,
}: {
  cartLines: Array<{ productId: string; price: number; qty: number }>;
  productMap: Map<string, Product>;
  stockMap: Map<string, VanStockSummaryProduct>;
  lineErrors: Record<string, string>;
  itemCount: number;
  total: number;
  setQty: (productId: string, qty: number) => void;
  setPrice: (productId: string, price: number) => void;
  remove: (productId: string) => void;
}) {
  return (
    <aside className="card pos-cart-pane" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '13px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em' }}>Cart</h2>
        <ShoppingCart size={18} color="var(--primary)" />
      </div>
      <div className="custom-scrollbar" style={{ overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {cartLines.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'var(--overlay-medium)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <ShoppingCart size={22} />
            </div>
            <div>
              <p style={{ color: 'var(--text-main)', fontWeight: 900, fontSize: '13px' }}>Cart is empty</p>
              <p style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: '11px', marginTop: '0.25rem' }}>Tap a product to add it to the sale.</p>
            </div>
          </div>
        )}
        {cartLines.map((line) => {
          const product = productMap.get(line.productId);
          const available = stockMap.get(line.productId)?.available ?? 0;
          const over = line.qty > available;
          return (
            <div key={line.productId} className={`card ${over ? 'pos-line-over-stock' : ''}`} style={{ padding: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                <strong style={{ fontSize: '13px' }}>{product?.name ?? line.productId}</strong>
                <button type="button" onClick={() => remove(line.productId)} style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={15} /></button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <button className="btn-secondary" style={{ padding: '7px' }} onClick={() => setQty(line.productId, line.qty - 1)}><Minus size={13} /></button>
                  <input className="input-premium" type="number" min={0} value={line.qty} onChange={(e) => setQty(line.productId, Number(e.target.value || 0))} style={{ width: '100%', padding: '0.5rem' }} />
                  <button className="btn-secondary" style={{ padding: '7px' }} onClick={() => setQty(line.productId, line.qty + 1)}><Plus size={13} /></button>
                </div>
                <input className="input-premium" type="number" min={0} value={line.price} onChange={(e) => setPrice(line.productId, Number(e.target.value || 0))} style={{ width: '100%', padding: '0.5rem' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.65rem', fontSize: '12px', fontWeight: 900 }}>
                <span style={{ color: over ? '#ef4444' : 'var(--text-muted)' }}>{over ? `Max ${available}` : `Available ${available}`}</span>
                <span className="tabular-nums" style={{ color: over ? '#ef4444' : 'var(--primary)' }}>{formatBDT(line.qty * line.price)}</span>
              </div>
              {lineErrors[line.productId] && <p style={{ marginTop: '0.5rem', color: '#ef4444', fontSize: '12px', fontWeight: 800 }}>{lineErrors[line.productId]}</p>}
            </div>
          );
        })}
      </div>
      <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', background: 'rgba(16,185,129,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>{formatInt(itemCount)} items</span>
          <span className="tabular-nums" style={{ color: 'var(--primary)', fontSize: '20px', fontWeight: 900 }}>{formatBDT(total)}</span>
        </div>
      </div>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <span style={{ fontSize: '9px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>{label}</span>
      {children}
    </label>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={{ borderRadius: '999px', padding: '6px 14px', border: active ? '1px solid var(--primary)' : '1px solid var(--border)', background: active ? 'var(--primary)' : 'var(--surface)', color: active ? 'white' : 'var(--text-main)', fontWeight: 900, cursor: 'pointer', whiteSpace: 'nowrap' }}>
      {children}
    </button>
  );
}

function EmptyCard({ text }: { text: string }) {
  return <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 900 }}>{text}</div>;
}

function ProductSkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '0.75rem' }}>
      {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="card"><div className="skeleton skeleton-line" /><div className="skeleton skeleton-line" style={{ width: '60%', marginTop: '0.75rem' }} /></div>)}
    </div>
  );
}
