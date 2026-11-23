import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Empty, ErrorMessage, Spinner, StatusBadge } from '../components/ui';
import { api, type Order, type Page } from '../lib/api';
import { formatDateTime, formatMoney, shortId } from '../lib/format';
import { useSession } from '../lib/session';

const STATUSES = ['', 'PENDING', 'PROCESSED', 'FAILED', 'CANCELLED'];

export function OrdersPage() {
  const { user } = useSession();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page<Order> | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let stop = false;
    const load = () =>
      api.orders({ status, page, limit: 20 }).then(
        (d) => !stop && setData(d),
        (e) => !stop && setError(e),
      );
    void load();
    // Keep statuses fresh while orders are being processed.
    const timer = setInterval(load, 3000);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [status, page]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <section>
      <div className="toolbar">
        <h1>{user?.role === 'admin' ? 'All orders' : 'My orders'}</h1>
        <select aria-label="Status" value={status} onChange={(e) => (setStatus(e.target.value), setPage(1))}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s || 'All statuses'}
            </option>
          ))}
        </select>
      </div>
      <ErrorMessage error={error} />
      {!data && !error && <Spinner />}
      {data && data.items.length === 0 && (
        <Empty>
          No orders yet. <Link to="/">Start shopping</Link>
        </Empty>
      )}
      {data && data.items.length > 0 && (
        <table className="table" data-testid="orders-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Placed</th>
              <th>Items</th>
              <th className="num">Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((o) => (
              <tr key={o.id} data-testid="order-row" data-order-id={o.id}>
                <td>
                  <Link to={`/orders/${o.id}`}>#{shortId(o.id)}</Link>
                </td>
                <td>{formatDateTime(o.createdAt)}</td>
                <td>{o.items.reduce((n, i) => n + i.quantity, 0)}</td>
                <td className="num">{formatMoney(o.totalCents)}</td>
                <td>
                  <StatusBadge status={o.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
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
