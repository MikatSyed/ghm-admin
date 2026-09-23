'use client';

import { create } from 'zustand';
import { todayInDhakaISO } from '@/lib/format';

export interface CartLine {
  productId: string;
  price: number;
  qty: number;
}

interface SalesCartState {
  vanId: string | null;
  date: string;
  lines: Record<string, CartLine>;
  setVan: (id: string | null) => void;
  setDate: (d: string) => void;
  upsertLine: (line: CartLine) => void;
  setQty: (productId: string, qty: number) => void;
  setPrice: (productId: string, price: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

// Intentionally not persisted — reload clears cart by design.
export const useSalesCart = create<SalesCartState>((set) => ({
  vanId: null,
  date: todayInDhakaISO(),
  lines: {},
  setVan: (vanId) => set({ vanId }),
  setDate: (date) => set({ date }),
  upsertLine: (line) => set((state) => {
    const existing = state.lines[line.productId];
    return {
      lines: {
        ...state.lines,
        [line.productId]: existing ? { ...existing, qty: existing.qty + line.qty } : line,
      },
    };
  }),
  setQty: (productId, qty) => set((state) => {
    const existing = state.lines[productId];
    if (!existing) return state;
    if (qty <= 0) {
      const next = { ...state.lines };
      delete next[productId];
      return { lines: next };
    }
    return { lines: { ...state.lines, [productId]: { ...existing, qty } } };
  }),
  setPrice: (productId, price) => set((state) => {
    const existing = state.lines[productId];
    if (!existing) return state;
    return { lines: { ...state.lines, [productId]: { ...existing, price } } };
  }),
  remove: (productId) => set((state) => {
    const next = { ...state.lines };
    delete next[productId];
    return { lines: next };
  }),
  clear: () => set({ lines: {} }),
}));
