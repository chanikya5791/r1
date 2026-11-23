import type { Product } from './api';

export interface CartLine {
  productId: string;
  sku: string;
  name: string;
  priceCents: number;
  quantity: number;
  maxQuantity: number;
}

export type CartAction =
  | { type: 'add'; product: Product; quantity?: number }
  | { type: 'setQuantity'; productId: string; quantity: number }
  | { type: 'remove'; productId: string }
  | { type: 'clear' };

export const MAX_PER_LINE = 100;

/** Pure cart reducer. Quantities are clamped to 1..min(stock, 100). */
export function cartReducer(lines: CartLine[], action: CartAction): CartLine[] {
  switch (action.type) {
    case 'add': {
      const { product } = action;
      const max = Math.min(product.stock, MAX_PER_LINE);
      if (max < 1) return lines;
      const existing = lines.find((l) => l.productId === product.id);
      const add = action.quantity ?? 1;
      if (existing) {
        return lines.map((l) =>
          l.productId === product.id ? { ...l, maxQuantity: max, quantity: Math.min(l.quantity + add, max) } : l,
        );
      }
      return [
        ...lines,
        { productId: product.id, sku: product.sku, name: product.name, priceCents: product.priceCents, quantity: Math.min(add, max), maxQuantity: max },
      ];
    }
    case 'setQuantity':
      return lines.map((l) =>
        l.productId === action.productId ? { ...l, quantity: Math.max(1, Math.min(Math.floor(action.quantity) || 1, l.maxQuantity)) } : l,
      );
    case 'remove':
      return lines.filter((l) => l.productId !== action.productId);
    case 'clear':
      return [];
  }
}

export const cartTotal = (lines: CartLine[]) => lines.reduce((sum, l) => sum + l.priceCents * l.quantity, 0);
export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.quantity, 0);
