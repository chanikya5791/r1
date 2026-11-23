import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { SessionProvider } from '../src/lib/session';

/** Mocks fetch with a handler keyed by "METHOD path" (query string ignored). */
export function mockFetch(routes: Record<string, (body: any, init: RequestInit) => { status?: number; body?: unknown }>) {
  const calls: { method: string; url: string; body: any; headers: Headers }[] = [];
  const fn = vi.fn(async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET';
    const path = url.split('?')[0];
    const body = init.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method, url, body, headers: new Headers(init.headers) });
    const handler = routes[`${method} ${path}`];
    const res = handler ? handler(body, init) : { status: 404, body: { error: { code: 'NOT_FOUND', message: 'not mocked' } } };
    const status = res.status ?? 200;
    return new Response(status === 204 ? null : JSON.stringify(res.body ?? {}), { status, headers: { 'content-type': 'application/json' } });
  });
  vi.stubGlobal('fetch', fn);
  return calls;
}

export function renderAt(path: string, element: ReactElement, routePath = path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SessionProvider>
        <Routes>
          <Route path={routePath} element={element} />
          <Route path="*" element={<div data-testid="navigated" />} />
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  );
}

export const product = (over: Record<string, unknown> = {}) => ({
  id: '64b000000000000000000001',
  sku: 'MUG-1',
  name: 'Coffee Mug',
  description: 'Holds coffee',
  category: 'kitchen',
  priceCents: 1200,
  stock: 3,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...over,
});
