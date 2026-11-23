# ShopLite UI (r1)

The web front end for ShopLite: product catalog, cart, checkout, order tracking, and admin pages. Built with
React, TypeScript and Vite, and served by nginx, which also proxies the three APIs so the browser talks to a
single origin. Part of the ShopLite test app; see the [infra repo (r5)](../r5) for the whole system.

## Pages

| Path | Who | What |
|---|---|---|
| `/` | everyone | Products with search, category filter, sorting and paging; add to cart. Admins also get Edit and Delete. |
| `/login`, `/register` | guests | Log in or sign up (Users API) |
| `/cart` | everyone | Change quantities and place the order. Each checkout sends an `Idempotency-Key`, so double clicks and retries cannot create two orders. |
| `/orders` | logged in | My orders (all orders for admins), filter by status, refreshes automatically |
| `/orders/:id` | owner or admin | Items, status, the activity timeline from the jobs worker, and Cancel. Polls while `PENDING`. |
| `/admin/products/new`, `/admin/products/:id` | admin | Create or edit products |
| `/admin/reports` | admin | Daily report built by the jobs worker |

Elements that tests use have `data-testid` attributes (`product-card`, `order-status`, `activity`, `cart-total`,
and others).

## API routing

| Browser path | Goes to |
|---|---|
| `/api/users/*` | Users API (r6) |
| `/api/catalog/*` | Catalog API (r3) |
| `/api/orders/*` | Orders API (r2) |

In development Vite proxies these (see `vite.config.ts`). In Docker, nginx does, using `USERS_API_URL`,
`CATALOG_API_URL` and `ORDERS_API_URL` (`nginx/default.conf.template`). nginx also adds an `X-Request-Id` header.

## Run

```bash
npm ci
npm run dev        # http://localhost:5173, with the APIs running on 3001-3003
npm run build      # production build in dist/
```

Docker: `docker build -t shoplite-ui .` serves on port 8080, with `/health` for health checks.

## Tests

```bash
npm test           # Vitest + Testing Library: cart rules, API client errors, login, products, checkout
```

The end-to-end browser tests are Playwright tests in r5 (`e2e/`).
