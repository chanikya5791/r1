import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Empty, ErrorMessage } from '../components/ui';
import { api } from '../lib/api';
import { cartTotal } from '../lib/cart';
import { formatMoney } from '../lib/format';
import { useSession } from '../lib/session';

export function CartPage() {
  const { cart, dispatchCart, user } = useSession();
  const navigate = useNavigate();
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  // One key per checkout attempt, so a double click or a retry after a timeout cannot create two orders.
  const idempotencyKey = useRef(crypto.randomUUID());

  async function checkout() {
    setBusy(true);
    setError(null);
    try {
      const order = await api.placeOrder(
        cart.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        idempotencyKey.current,
      );
      dispatchCart({ type: 'clear' });
      idempotencyKey.current = crypto.randomUUID();
      navigate(`/orders/${order.id}`);
    } catch (err) {
      setError(err);
      // A definite rejection (bad input, stock) means the next attempt is a new order.
      if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status < 500) {
        idempotencyKey.current = crypto.randomUUID();
      }
    } finally {
      setBusy(false);
    }
  }

  if (cart.length === 0) {
    return (
      <section>
        <h1>Cart</h1>
        <Empty>
          Your cart is empty. <Link to="/">Browse products</Link>
        </Empty>
      </section>
    );
  }

  return (
    <section>
      <h1>Cart</h1>
      <ErrorMessage error={error} />
      <table className="table" data-testid="cart-table">
        <thead>
          <tr>
            <th>Product</th>
            <th className="num">Price</th>
            <th className="num">Quantity</th>
            <th className="num">Total</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {cart.map((l) => (
            <tr key={l.productId} data-testid="cart-line">
              <td>
                {l.name} <span className="muted small">{l.sku}</span>
              </td>
              <td className="num">{formatMoney(l.priceCents)}</td>
              <td className="num">
                <input
                  type="number"
                  min={1}
                  max={l.maxQuantity}
                  aria-label={`Quantity of ${l.name}`}
                  className="qty"
                  value={l.quantity}
                  onChange={(e) => dispatchCart({ type: 'setQuantity', productId: l.productId, quantity: Number(e.target.value) })}
                />
              </td>
              <td className="num">{formatMoney(l.priceCents * l.quantity)}</td>
              <td className="num">
                <button className="link danger" onClick={() => dispatchCart({ type: 'remove', productId: l.productId })}>
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3}>Total</td>
            <td className="num" data-testid="cart-total">
              {formatMoney(cartTotal(cart))}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
      <div className="actions">
        <button className="btn btn-ghost" onClick={() => dispatchCart({ type: 'clear' })}>
          Clear cart
        </button>
        {user ? (
          <button className="btn" onClick={checkout} disabled={busy}>
            {busy ? 'Placing order…' : 'Place order'}
          </button>
        ) : (
          <Link className="btn" to="/login" state={{ from: '/cart' }}>
            Log in to place your order
          </Link>
        )}
      </div>
    </section>
  );
}
