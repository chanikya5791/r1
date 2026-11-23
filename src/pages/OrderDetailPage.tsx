import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ErrorMessage, Spinner, StatusBadge } from '../components/ui';
import { api, type Activity, type Order } from '../lib/api';
import { formatDateTime, formatMoney, shortId } from '../lib/format';

export function OrderDetailPage() {
  const { id = '' } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [o, a] = await Promise.all([api.order(id), api.activity(id).catch(() => ({ items: [] as Activity[] }))]);
      setOrder(o);
      setActivity(a.items);
      setError(null);
      return o;
    } catch (err) {
      setError(err);
      return null;
    }
  }, [id]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    // Poll while the jobs worker is still working on the order.
    const tick = async () => {
      const o = await load();
      if (!stopped && o?.status === 'PENDING') timer = setTimeout(tick, 1000);
    };
    void tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [load]);

  async function cancel() {
    if (!confirm('Cancel this order?')) return;
    setBusy(true);
    try {
      setOrder(await api.cancelOrder(id));
      // The jobs worker writes the cancellation to the timeline shortly after.
      setTimeout(() => void load(), 1500);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  if (!order) return error ? <ErrorMessage error={error} /> : <Spinner />;

  return (
    <section>
      <p>
        <Link to="/orders">← All orders</Link>
      </p>
      <div className="toolbar">
        <h1>Order #{shortId(order.id)}</h1>
        <StatusBadge status={order.status} />
        {(order.status === 'PENDING' || order.status === 'PROCESSED') && (
          <button className="btn btn-danger" onClick={cancel} disabled={busy}>
            Cancel order
          </button>
        )}
      </div>
      <ErrorMessage error={error} />
      {order.status === 'PENDING' && <p className="alert">Processing your order…</p>}
      {order.failureReason && (
        <p className="alert alert-error" data-testid="failure-reason">
          This order failed: {order.failureReason === 'INSUFFICIENT_STOCK' ? 'not enough stock' : order.failureReason}
        </p>
      )}
      <div className="columns">
        <div className="card">
          <h2>Items</h2>
          <table className="table">
            <tbody>
              {order.items.map((i) => (
                <tr key={i.productId}>
                  <td>
                    {i.name} <span className="muted small">{i.sku}</span>
                  </td>
                  <td className="num">
                    {i.quantity} × {formatMoney(i.unitPriceCents)}
                  </td>
                  <td className="num">{formatMoney(i.lineTotalCents)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>Total</td>
                <td className="num" data-testid="order-total">
                  {formatMoney(order.totalCents)}
                </td>
              </tr>
            </tfoot>
          </table>
          <p className="muted small">Placed {formatDateTime(order.createdAt)}</p>
        </div>
        <div className="card">
          <h2>Activity</h2>
          {activity.length === 0 ? (
            <p className="muted">Nothing yet.</p>
          ) : (
            <ol className="timeline" data-testid="activity">
              {activity.map((a) => (
                <li key={a.id} data-type={a.type}>
                  <strong>{a.type.replace(/_/g, ' ').toLowerCase()}</strong>
                  <span>{a.message}</span>
                  <time className="muted small">{formatDateTime(a.createdAt)}</time>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}
