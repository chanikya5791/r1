import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ErrorMessage, Spinner } from '../components/ui';
import { api, type DailySummary } from '../lib/api';
import { formatDateTime, formatMoney } from '../lib/format';

interface FormState {
  sku: string;
  name: string;
  description: string;
  category: string;
  price: string;
  stock: string;
}

const empty: FormState = { sku: '', name: '', description: '', category: '', price: '', stock: '0' };

export function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState | null>(id ? null : empty);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.product(id).then(
      (p) => setForm({ sku: p.sku, name: p.name, description: p.description, category: p.category, price: (p.priceCents / 100).toFixed(2), stock: String(p.stock) }),
      setError,
    );
  }, [id]);

  if (!form) return error ? <ErrorMessage error={error} /> : <Spinner />;
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = {
      name: form!.name,
      description: form!.description,
      category: form!.category,
      priceCents: Math.round(Number(form!.price) * 100),
      stock: Number(form!.stock),
    };
    try {
      if (id) await api.updateProduct(id, body);
      else await api.createProduct({ ...body, sku: form!.sku });
      navigate('/');
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card form narrow" onSubmit={onSubmit} aria-label="Product">
      <h1>{id ? 'Edit product' : 'New product'}</h1>
      <ErrorMessage error={error} />
      <label>
        SKU
        <input name="sku" required disabled={!!id} value={form.sku} onChange={set('sku')} />
      </label>
      <label>
        Name
        <input name="name" required value={form.name} onChange={set('name')} />
      </label>
      <label>
        Description
        <textarea name="description" rows={3} value={form.description} onChange={set('description')} />
      </label>
      <label>
        Category
        <input name="category" required value={form.category} onChange={set('category')} />
      </label>
      <div className="row">
        <label>
          Price (USD)
          <input name="price" type="number" min="0.01" step="0.01" required value={form.price} onChange={set('price')} />
        </label>
        <label>
          Stock
          <input name="stock" type="number" min="0" step="1" required value={form.stock} onChange={set('stock')} />
        </label>
      </div>
      <button className="btn" type="submit" disabled={busy}>
        {busy ? 'Saving…' : 'Save product'}
      </button>
    </form>
  );
}

export function ReportsPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    setSummary(null);
    setError(null);
    api.dailyReport(date).then(setSummary, setError);
  }, [date]);

  return (
    <section>
      <div className="toolbar">
        <h1>Daily report</h1>
        <input type="date" aria-label="Date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <ErrorMessage error={error} />
      {summary && (
        <div className="stats" data-testid="daily-report">
          <div className="card stat">
            <span className="muted">Orders</span>
            <strong>{summary.orderCount}</strong>
          </div>
          <div className="card stat">
            <span className="muted">Revenue (processed)</span>
            <strong>{formatMoney(summary.revenueCents)}</strong>
          </div>
          {Object.entries(summary.ordersByStatus).map(([s, n]) => (
            <div className="card stat" key={s}>
              <span className="muted">{s.toLowerCase()}</span>
              <strong>{n}</strong>
            </div>
          ))}
          <p className="muted small">Generated {formatDateTime(summary.generatedAt)} by the jobs worker.</p>
        </div>
      )}
    </section>
  );
}
