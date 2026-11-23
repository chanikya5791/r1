import { describe, expect, it, vi } from 'vitest';
import { api, ApiError, setToken } from '../src/lib/api';
import { formatMoney } from '../src/lib/format';
import { mockFetch } from './helpers';

describe('api client', () => {
  it('sends the bearer token and JSON body', async () => {
    const calls = mockFetch({ 'POST /api/orders/orders': () => ({ status: 201, body: { id: 'o1' } }) });
    setToken('tok-123');
    await api.placeOrder([{ productId: 'p', quantity: 2 }], 'key-1');
    setToken(null);
    expect(calls[0].headers.get('authorization')).toBe('Bearer tok-123');
    expect(calls[0].headers.get('idempotency-key')).toBe('key-1');
    expect(calls[0].body).toEqual({ items: [{ productId: 'p', quantity: 2 }] });
  });

  it('turns API errors into ApiError with code and details', async () => {
    mockFetch({
      'POST /api/orders/orders': () => ({
        status: 409,
        body: { error: { code: 'INSUFFICIENT_STOCK', message: 'Not enough stock', details: { items: [] } } },
      }),
    });
    const err = await api.placeOrder([], 'k').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 409, code: 'INSUFFICIENT_STOCK', message: 'Not enough stock', details: { items: [] } });
  });

  it('handles non-JSON error pages and network failures', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>Bad gateway</html>', { status: 502 })));
    await expect(api.me()).rejects.toMatchObject({ status: 502, code: 'HTTP_ERROR' });
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    await expect(api.me()).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });

  it('builds query strings without empty values', async () => {
    const calls = mockFetch({ 'GET /api/catalog/products': () => ({ body: { items: [], total: 0, page: 1, limit: 12 } }) });
    await api.products({ q: 'mug', category: '', page: 2 });
    expect(calls[0].url).toBe('/api/catalog/products?q=mug&page=2');
  });
});

describe('formatMoney', () => {
  it('formats cents as dollars', () => {
    expect(formatMoney(123456)).toBe('$1,234.56');
    expect(formatMoney(5)).toBe('$0.05');
  });
});
