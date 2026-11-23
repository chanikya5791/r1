/** Thin fetch wrapper for the three ShopLite APIs (proxied under /api/* by Vite in dev and nginx in prod). */

export const API = {
  users: '/api/users',
  catalog: '/api/catalog',
  orders: '/api/orders',
} as const;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export type Role = 'customer' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  priceCents: number;
  stock: number;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus = 'PENDING' | 'PROCESSED' | 'FAILED' | 'CANCELLED';

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  totalCents: number;
  currency: string;
  failureReason: string | null;
  items: { productId: string; sku: string; name: string; unitPriceCents: number; quantity: number; lineTotalCents: number }[];
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  orderId: string;
  type: string;
  message: string;
  data: Record<string, unknown>;
  createdAt: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface DailySummary {
  date: string;
  ordersByStatus: Record<string, number>;
  orderCount: number;
  revenueCents: number;
  generatedAt: string;
}

let token: string | null = null;
export const setToken = (t: string | null) => {
  token = t;
};

export async function request<T>(url: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  let body = init.body;
  if (init.json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(init.json);
  }
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers, body });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Check your connection and try again.');
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let data: any = undefined;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    // not JSON (e.g. a proxy error page)
  }
  if (!res.ok) {
    const err = data?.error;
    throw new ApiError(res.status, err?.code ?? 'HTTP_ERROR', err?.message ?? `Request failed (${res.status})`, err?.details);
  }
  return data as T;
}

const qs = (params: Record<string, string | number | undefined>) => {
  const s = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '') as [string, string][],
  ).toString();
  return s ? `?${s}` : '';
};

export const api = {
  register: (body: { email: string; password: string; name: string }) =>
    request<User>(`${API.users}/auth/register`, { method: 'POST', json: body }),
  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: User }>(`${API.users}/auth/login`, { method: 'POST', json: body }),
  me: () => request<User>(`${API.users}/users/me`),

  products: (p: { q?: string; category?: string; sort?: string; page?: number; limit?: number } = {}) =>
    request<Page<Product>>(`${API.catalog}/products${qs(p)}`),
  product: (id: string) => request<Product>(`${API.catalog}/products/${id}`),
  categories: () => request<{ items: { category: string; count: number }[] }>(`${API.catalog}/categories`),
  createProduct: (body: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) =>
    request<Product>(`${API.catalog}/products`, { method: 'POST', json: body }),
  updateProduct: (id: string, body: Partial<Product>) =>
    request<Product>(`${API.catalog}/products/${id}`, { method: 'PATCH', json: body }),
  deleteProduct: (id: string) => request<void>(`${API.catalog}/products/${id}`, { method: 'DELETE' }),
  activity: (orderId: string) => request<{ items: Activity[] }>(`${API.catalog}/activity${qs({ orderId })}`),
  dailyReport: (date?: string) => request<DailySummary>(`${API.catalog}/reports/daily${qs({ date })}`),

  placeOrder: (items: { productId: string; quantity: number }[], idempotencyKey: string) =>
    request<Order>(`${API.orders}/orders`, { method: 'POST', json: { items }, headers: { 'Idempotency-Key': idempotencyKey } }),
  orders: (p: { status?: string; page?: number; limit?: number } = {}) => request<Page<Order>>(`${API.orders}/orders${qs(p)}`),
  order: (id: string) => request<Order>(`${API.orders}/orders/${id}`),
  cancelOrder: (id: string) => request<Order>(`${API.orders}/orders/${id}/cancel`, { method: 'POST' }),
};
