import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { cartCount } from '../lib/cart';
import { useSession } from '../lib/session';

export function Layout() {
  const { user, logout, cart } = useSession();
  const navigate = useNavigate();
  const count = cartCount(cart);

  return (
    <>
      <header className="topbar">
        <div className="container topbar-inner">
          <Link to="/" className="brand">
            <img src="/favicon.svg" alt="" width={24} height={24} /> ShopLite
          </Link>
          <nav className="nav">
            <NavLink to="/" end>
              Products
            </NavLink>
            {user && <NavLink to="/orders">Orders</NavLink>}
            {user?.role === 'admin' && <NavLink to="/admin/products/new">New product</NavLink>}
            {user?.role === 'admin' && <NavLink to="/admin/reports">Reports</NavLink>}
            <NavLink to="/cart" data-testid="nav-cart">
              Cart{count > 0 && <span className="pill" data-testid="cart-count">{count}</span>}
            </NavLink>
          </nav>
          <div className="account">
            {user ? (
              <>
                <span className="muted" data-testid="current-user">
                  {user.email}
                  {user.role === 'admin' && ' (admin)'}
                </span>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost">
                  Log in
                </Link>
                <Link to="/register" className="btn">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="container main">
        <Outlet />
      </main>
    </>
  );
}
