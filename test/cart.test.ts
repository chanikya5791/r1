import { describe, expect, it } from 'vitest';
import type { Product } from '../src/lib/api';
import { cartCount, cartReducer, cartTotal } from '../src/lib/cart';
import { product } from './helpers';

const mug = product() as Product;
const book = product({ id: 'b', sku: 'BOOK-1', name: 'Book', priceCents: 999, stock: 200 }) as Product;

describe('cartReducer', () => {
  it('adds a product and increments on re-add', () => {
    let s = cartReducer([], { type: 'add', product: mug });
    s = cartReducer(s, { type: 'add', product: mug });
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({ productId: mug.id, quantity: 2, maxQuantity: 3 });
  });

  it('never exceeds stock or 100 per line', () => {
    let s = cartReducer([], { type: 'add', product: mug, quantity: 10 });
    expect(s[0].quantity).toBe(3);
    s = cartReducer([], { type: 'add', product: book, quantity: 500 });
    expect(s[0].quantity).toBe(100);
  });

  it('ignores out-of-stock products', () => {
    expect(cartReducer([], { type: 'add', product: { ...mug, stock: 0 } })).toEqual([]);
  });

  it('clamps setQuantity to 1..max and handles junk input', () => {
    const s = cartReducer([], { type: 'add', product: mug });
    expect(cartReducer(s, { type: 'setQuantity', productId: mug.id, quantity: 0 })[0].quantity).toBe(1);
    expect(cartReducer(s, { type: 'setQuantity', productId: mug.id, quantity: 99 })[0].quantity).toBe(3);
    expect(cartReducer(s, { type: 'setQuantity', productId: mug.id, quantity: Number.NaN })[0].quantity).toBe(1);
    expect(cartReducer(s, { type: 'setQuantity', productId: mug.id, quantity: 2.7 })[0].quantity).toBe(2);
  });

  it('removes and clears', () => {
    let s = cartReducer([], { type: 'add', product: mug });
    s = cartReducer(s, { type: 'add', product: book });
    expect(cartReducer(s, { type: 'remove', productId: mug.id }).map((l) => l.productId)).toEqual(['b']);
    expect(cartReducer(s, { type: 'clear' })).toEqual([]);
  });

  it('totals and counts', () => {
    let s = cartReducer([], { type: 'add', product: mug, quantity: 2 });
    s = cartReducer(s, { type: 'add', product: book });
    expect(cartTotal(s)).toBe(2 * 1200 + 999);
    expect(cartCount(s)).toBe(3);
  });
});
