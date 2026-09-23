'use client';

import React, { useMemo, useState } from 'react';
import { X, ShoppingCart, Undo2, AlertTriangle, Trash2, Wrench } from 'lucide-react';
import {
  useCreateSale,
  useCreateStockAdjustment,
  useSalvageDistributionLine,
  useUpdateDistributionLine,
} from '@/hooks/api';
import { formatBDT } from '@/lib/format';
import type { StockAdjustmentReason } from '@/lib/types';

export type VanAdjustmentType = 'SALE' | 'RETURN' | 'DAMAGE' | 'WASTAGE' | 'CORRECTION';

const TYPES: { value: VanAdjustmentType; label: string; icon: React.ComponentType<{ size?: number }>; tint: string }[] = [
  { value: 'SALE', label: 'Sale', icon: ShoppingCart, tint: '#10b981' },
  { value: 'RETURN', label: 'Fresh Return', icon: Undo2, tint: '#3b82f6' },
  { value: 'DAMAGE', label: 'Damage', icon: AlertTriangle, tint: '#f59e0b' },
  { value: 'WASTAGE', label: 'Wastage', icon: Trash2, tint: '#ef4444' },
  { value: 'CORRECTION', label: 'Correction', icon: Wrench, tint: '#a855f7' },
];

type Props = {
  vanId: string;
  date: string;
  distributionId: string | null;
  productId: string;
  productName: string;
  productUnit: string;
  available: number;
  currentReturned: number;
  currentDamage: number;
  distributionLineId: string | null;
  defaultPrice: number;
  initialType?: VanAdjustmentType;
  onClose: () => void;
  onSubmitted?: () => void;
};

export default function VanAdjustmentPopup({
  vanId,
  date,
  distributionId,
  productId,
  productName,
  productUnit,
  available,
  currentReturned,
  currentDamage,
  distributionLineId,
  defaultPrice,
  initialType = 'SALE',
  onClose,
  onSubmitted,
}: Props) {
  const [type, setType] = useState<VanAdjustmentType>(initialType);
  const [qtyStr, setQtyStr] = useState('');
  const [priceStr, setPriceStr] = useState(String(defaultPrice ?? 0));
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Damage salvage price can be entered as a percent-off-normal-price, or a custom absolute price.
  const [damagePriceMode, setDamagePriceMode] = useState<'percent' | 'custom'>('percent');
  const [percentOffStr, setPercentOffStr] = useState('20');

  const createSale = useCreateSale();
  const createAdjustment = useCreateStockAdjustment();
  const updateLine = useUpdateDistributionLine(vanId);
  const salvageLine = useSalvageDistributionLine(vanId);
  const submitting =
    createSale.isPending || createAdjustment.isPending || updateLine.isPending || salvageLine.isPending;

  const qty = Number(qtyStr || 0);
  const percentOff = Number(percentOffStr || 0);
  const percentDerivedPrice = Math.max(0, Math.round(defaultPrice * (1 - percentOff / 100)));
  const price = type === 'DAMAGE' && damagePriceMode === 'percent' ? percentDerivedPrice : Number(priceStr || 0);
  const needsPrice = type === 'SALE' || type === 'DAMAGE';

  const exceedsAvailable = qty > available && type !== 'CORRECTION';
  const canSubmit = qty > 0 && !exceedsAvailable && (!needsPrice || price >= 0);

  const helper = useMemo(() => {
    if (type === 'RETURN') return `Returnable: ${available} ${productUnit} (already returned: ${currentReturned})`;
    return `On-van: ${available} ${productUnit}`;
  }, [type, available, currentReturned, productUnit]);

  const typeHint = useMemo(() => {
    if (type === 'RETURN') return 'Good stock goes back to the warehouse at full value.';
    if (type === 'DAMAGE') return 'Moves to the warehouse as a DAMAGED lot — sellable at the reduced price below.';
    if (type === 'WASTAGE') return 'Unsellable — written off as a loss.';
    return null;
  }, [type]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (type === 'SALE') {
        await createSale.mutateAsync({
          vanId,
          date,
          items: [{ productId, price, qty }],
        });
      } else if (type === 'RETURN') {
        if (!distributionId || !distributionLineId) {
          throw new Error('No distribution line for this product on the selected date.');
        }
        await updateLine.mutateAsync({
          distributionId,
          lineId: distributionLineId,
          body: { returned: currentReturned + qty },
        });
      } else if (type === 'DAMAGE') {
        if (!distributionId || !distributionLineId) {
          throw new Error('No distribution line for this product on the selected date.');
        }
        await salvageLine.mutateAsync({
          distributionId,
          lineId: distributionLineId,
          body: { quantity: qty, salvagePrice: price, notes: notes || undefined },
        });
      } else if (type === 'WASTAGE' && distributionId && distributionLineId) {
        await updateLine.mutateAsync({
          distributionId,
          lineId: distributionLineId,
          body: { damageReturned: currentDamage + qty },
        });
      } else {
        await createAdjustment.mutateAsync({
          date,
          productId,
          quantity: qty,
          reason: type as StockAdjustmentReason,
          location: 'VAN',
          vanId,
          notes: notes || undefined,
        });
      }
      onSubmitted?.();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Submit failed';
      setError(msg);
    }
  }

  const active = TYPES.find((t) => t.value === type)!;
  const ActiveIcon = active.icon;

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div
        className="sheet-content animate-fade-in"
        style={{ maxWidth: '640px', height: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: `${active.tint}10`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', background: `${active.tint}1a`, borderRadius: '10px', color: active.tint }}>
              <ActiveIcon size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-main)' }}>
                Van Adjustment
              </h2>
              <p style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', opacity: 0.5 }}>
                {productName} · {date}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ padding: '8px', borderRadius: '10px', background: 'var(--overlay-medium)', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto' }} className="custom-scrollbar">
          <div>
            <label style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
              Type
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
              {TYPES.map((t) => {
                const Icon = t.icon;
                const isActive = t.value === type;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={isActive ? undefined : 'adjust-type-tile'}
                    style={{
                      transition: 'all 0.2s ease',
                      padding: '10px 6px',
                      borderRadius: '10px',
                      border: `1px solid ${isActive ? t.tint : 'var(--border)'}`,
                      background: isActive ? `${t.tint}1a` : 'transparent',
                      color: isActive ? t.tint : 'var(--text-muted)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                      cursor: 'pointer',
                      fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}
                  >
                    <Icon size={14} />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {typeHint && (
            <div style={{ padding: '0.65rem 0.9rem', borderRadius: '10px', background: `${active.tint}0d`, border: `1px solid ${active.tint}33`, color: active.tint, fontSize: '12px', fontWeight: 700 }}>
              {typeHint}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: needsPrice ? '1fr 1fr' : '1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-muted)' }}>
                Quantity ({productUnit})
              </label>
              <input
                required
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                className="input-premium"
                placeholder="0"
                value={qtyStr}
                onChange={(e) => setQtyStr(e.target.value)}
                autoFocus
              />
              <span style={{ fontSize: '10px', color: exceedsAvailable ? '#ef4444' : 'var(--text-muted)', opacity: 0.7 }}>
                {exceedsAvailable ? `Exceeds on-van stock (${available})` : helper}
              </span>
            </div>

            {needsPrice && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <label style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-muted)' }}>
                    {type === 'DAMAGE' ? 'Salvage price' : 'Unit price (৳)'}
                  </label>
                  {type === 'DAMAGE' && (
                    <div style={{ display: 'inline-flex', borderRadius: 999, border: '1px solid var(--border)', overflow: 'hidden' }}>
                      {(['percent', 'custom'] as const).map((m) => {
                        const isActive = damagePriceMode === m;
                        return (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setDamagePriceMode(m)}
                            style={{
                              padding: '3px 10px',
                              fontSize: 9,
                              fontWeight: 900,
                              textTransform: 'uppercase',
                              letterSpacing: '0.08em',
                              border: 'none',
                              cursor: 'pointer',
                              background: isActive ? 'rgba(245,158,11,0.15)' : 'transparent',
                              color: isActive ? '#f59e0b' : 'var(--text-muted)',
                            }}
                          >
                            {m === 'percent' ? '% Off' : 'Custom'}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {type === 'DAMAGE' && damagePriceMode === 'percent' ? (
                  <>
                    <div style={{ position: 'relative' }}>
                      <input
                        required
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={100}
                        step="any"
                        className="input-premium"
                        placeholder="20"
                        value={percentOffStr}
                        onChange={(e) => setPercentOffStr(e.target.value)}
                        style={{ paddingRight: '32px' }}
                      />
                      <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 800, fontSize: '13px' }}>%</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>
                      ৳{defaultPrice.toLocaleString()} → <strong className="tabular-nums" style={{ color: '#f59e0b', fontWeight: 900 }}>৳{price.toLocaleString()}</strong>
                    </span>
                  </>
                ) : (
                  <input
                    required
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    className="input-premium"
                    placeholder="0"
                    value={priceStr}
                    onChange={(e) => setPriceStr(e.target.value)}
                  />
                )}

                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>
                  {type === 'DAMAGE' ? 'Salvage value' : 'Total'}: <strong className="tabular-nums" style={{ color: 'var(--primary)', fontWeight: 900 }}>{formatBDT(qty * price)}</strong>
                </span>
              </div>
            )}
          </div>

          {type !== 'SALE' && type !== 'RETURN' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-muted)' }}>
                Notes
              </label>
              <textarea
                className="input-premium"
                placeholder="Optional context (e.g. crushed in transit)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          )}

          {error && (
            <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: '12px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-soft)' }}>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1, height: '44px' }} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" style={{ flex: 2, height: '44px' }} disabled={!canSubmit || submitting}>
              {submitting ? 'Saving…' : `Record ${active.label}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
