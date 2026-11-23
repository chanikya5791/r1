import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Empty, ErrorMessage, Spinner } from '../components/ui';
import { api, type Page, type Product } from '../lib/api';
import { formatMoney } from '../lib/format';
import { useSession } from '../lib/session';

export function ProductsPage() {
  const { user, dispatchCart, cart } = useSession();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('name');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page<Product> | null>(null);
  const [categories, setCategories] = useState<{ category: string; count: number }[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    api.categories().then((r) => setCategories(r.items), () => undefined);
  }, [reload]);

  useEffect(() => {
    const t = setTimeout(() => {
      api.products({ q, category, sort, page, limit: 12 }).then(
        (d) => {
          setData(d);
          setError(null);
        },
        setError,
      );
    }, 200);
    return () => clearTimeout(t);
  }, [q, category, sort, page, reload]);

  async function remove(p: Product) {
    if (!confirm(`Delete ${p.name}?`)) return;
    try {
      await api.deleteProduct(p.id);
      setReload((n) => n + 1);
    } catch (err) {
      setError(err);
    }
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <section>
      <div className="toolbar">
        <h1>Products</h1>
        <input
          type="search"
          placeholder="Search products"
          aria-label="Search products"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <select aria-label="Category" value={category} onChange={(e) => (setCategory(e.target.value), setPage(1))}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.category} value={c.category}>
              {c.category} ({c.count})
            </option>
          ))}
        </select>
        <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="name">Name</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="newest">Newest</option>
        </select>
      </div>
      <ErrorMessage error={error} />
      {!data && !error && <Spinner />}
      {data && data.items.length === 0 && <Empty>No products match.</Empty>}
      <div className="grid">
        {data?.items.map((p) => {
          const inCart = cart.find((l) => l.productId === p.id)?.quantity ?? 0;
          return (
            <article key={p.id} className="card product" data-testid="product-card" data-sku={p.sku}>
              <div className="product-head">
                <h2>{p.name}</h2>
                <span className="price">{formatMoney(p.priceCents)}</span>
              </div>
              <p className="muted small">
                {p.sku} · {p.category}
              </p>
              <p className="desc">{p.description}</p>
              <div className="product-foot">
                <span className={p.stock > 0 ? 'stock' : 'stock out'} data-testid="product-stock">
                  {p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}
                </span>
                <button
                  className="btn"
                  disabled={p.stock === 0 || inCart >= p.stock}
                  onClick={() => dispatchCart({ type: 'add', product: p })}
                >
                  {inCart > 0 ? `Add another (${inCart})` : 'Add to cart'}
                </button>
              </div>
              {user?.role === 'admin' && (
                <div className="admin-actions">
                  <Link to={`/admin/products/${p.id}`}>Edit</Link>
                  <button className="link danger" onClick={() => remove(p)}>
                    Delete
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
      {pages > 1 && (
        <div className="pager">
          <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {pages}
          </span>
          <button className="btn btn-ghost" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            Next
          </button>
        </div>
      )}
    </section>
  );
}
