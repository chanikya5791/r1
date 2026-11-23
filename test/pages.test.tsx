import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LoginPage } from '../src/pages/AuthPages';
import { CartPage } from '../src/pages/CartPage';
import { ProductsPage } from '../src/pages/ProductsPage';
import { mockFetch, product, renderAt } from './helpers';

const user = { id: 'u1', email: 'alice@test.local', name: 'Alice', role: 'customer', createdAt: '2026-01-01T00:00:00Z' };

describe('LoginPage', () => {
  it('logs in and navigates away', async () => {
    const calls = mockFetch({ 'POST /api/users/auth/login': () => ({ body: { token: 't', user } }) });
    renderAt('/login', <LoginPage />);
    await userEvent.type(screen.getByLabelText('Email'), 'alice@test.local');
    await userEvent.type(screen.getByLabelText('Password'), 'Password1!');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    await screen.findByTestId('navigated');
    expect(calls[0].body).toEqual({ email: 'alice@test.local', password: 'Password1!' });
    expect(JSON.parse(localStorage.getItem('shoplite.user')!)).toMatchObject({ email: 'alice@test.local' });
  });

  it('shows the API error message', async () => {
    mockFetch({ 'POST /api/users/auth/login': () => ({ status: 401, body: { error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } } }) });
    renderAt('/login', <LoginPage />);
    await userEvent.type(screen.getByLabelText('Email'), 'x@test.local');
    await userEvent.type(screen.getByLabelText('Password'), 'nope');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
  });
});

describe('ProductsPage', () => {
  it('lists products and adds them to the cart', async () => {
    mockFetch({
      'GET /api/catalog/products': () => ({ body: { items: [product(), product({ id: 'x', sku: 'OUT-1', name: 'Sold Out', stock: 0 })], total: 2, page: 1, limit: 12 } }),
      'GET /api/catalog/categories': () => ({ body: { items: [{ category: 'kitchen', count: 2 }] } }),
    });
    renderAt('/', <ProductsPage />);
    const cards = await screen.findAllByTestId('product-card');
    expect(cards).toHaveLength(2);
    expect(screen.getAllByText('$12.00')).toHaveLength(2);
    expect(screen.getByText('Out of stock')).toBeInTheDocument();
    const [addMug, addSoldOut] = screen.getAllByRole('button', { name: /Add/ });
    expect(addSoldOut).toBeDisabled();
    await userEvent.click(addMug);
    expect(screen.getByRole('button', { name: 'Add another (1)' })).toBeInTheDocument();
    await waitFor(() => expect(JSON.parse(localStorage.getItem('shoplite.cart')!)).toHaveLength(1));
  });

  it('shows an error when the catalog is down', async () => {
    mockFetch({ 'GET /api/catalog/products': () => ({ status: 503, body: { error: { code: 'X', message: 'Catalog unavailable' } } }) });
    renderAt('/', <ProductsPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Catalog unavailable');
  });
});

describe('CartPage', () => {
  it('asks guests to log in', async () => {
    localStorage.setItem('shoplite.cart', JSON.stringify([{ productId: 'p', sku: 'S', name: 'Mug', priceCents: 500, quantity: 2, maxQuantity: 5 }]));
    renderAt('/cart', <CartPage />);
    expect(screen.getByTestId('cart-total')).toHaveTextContent('$10.00');
    expect(screen.getByRole('link', { name: 'Log in to place your order' })).toBeInTheDocument();
  });

  it('places the order with an idempotency key and clears the cart', async () => {
    localStorage.setItem('shoplite.token', JSON.stringify('t'));
    localStorage.setItem('shoplite.user', JSON.stringify(user));
    localStorage.setItem('shoplite.cart', JSON.stringify([{ productId: 'p', sku: 'S', name: 'Mug', priceCents: 500, quantity: 2, maxQuantity: 5 }]));
    const calls = mockFetch({
      'GET /api/users/users/me': () => ({ body: user }),
      'POST /api/orders/orders': () => ({ status: 201, body: { id: 'order-1' } }),
    });
    renderAt('/cart', <CartPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Place order' }));
    await screen.findByTestId('navigated');
    const post = calls.find((c) => c.method === 'POST')!;
    expect(post.body).toEqual({ items: [{ productId: 'p', quantity: 2 }] });
    expect(post.headers.get('idempotency-key')).toMatch(/^[0-9a-f-]{36}$/);
    expect(JSON.parse(localStorage.getItem('shoplite.cart')!)).toEqual([]);
  });

  it('shows stock errors from the Orders API', async () => {
    localStorage.setItem('shoplite.token', JSON.stringify('t'));
    localStorage.setItem('shoplite.user', JSON.stringify(user));
    localStorage.setItem('shoplite.cart', JSON.stringify([{ productId: 'p', sku: 'S', name: 'Mug', priceCents: 500, quantity: 2, maxQuantity: 5 }]));
    mockFetch({
      'GET /api/users/users/me': () => ({ body: user }),
      'POST /api/orders/orders': () => ({ status: 409, body: { error: { code: 'INSUFFICIENT_STOCK', message: 'Not enough stock for one or more products' } } }),
    });
    renderAt('/cart', <CartPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Place order' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Not enough stock');
    expect(screen.getAllByTestId('cart-line')).toHaveLength(1);
  });
});
