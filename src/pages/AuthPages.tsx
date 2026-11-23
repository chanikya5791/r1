import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ErrorMessage } from '../components/ui';
import { api } from '../lib/api';
import { useSession } from '../lib/session';

export function LoginPage() {
  const { login } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate((location.state as { from?: string } | null)?.from ?? '/');
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card form narrow" onSubmit={onSubmit} aria-label="Log in">
      <h1>Log in</h1>
      <ErrorMessage error={error} />
      <label>
        Email
        <input type="email" name="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>
        Password
        <input type="password" name="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      <button className="btn" type="submit" disabled={busy}>
        {busy ? 'Logging in…' : 'Log in'}
      </button>
      <p className="muted">
        No account? <Link to="/register">Sign up</Link>
      </p>
    </form>
  );
}

export function RegisterPage() {
  const { login } = useSession();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.register(form);
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card form narrow" onSubmit={onSubmit} aria-label="Sign up">
      <h1>Create an account</h1>
      <ErrorMessage error={error} />
      <label>
        Name
        <input name="name" required value={form.name} onChange={set('name')} />
      </label>
      <label>
        Email
        <input type="email" name="email" required autoComplete="email" value={form.email} onChange={set('email')} />
      </label>
      <label>
        Password <span className="muted">(at least 8 characters)</span>
        <input type="password" name="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={set('password')} />
      </label>
      <button className="btn" type="submit" disabled={busy}>
        {busy ? 'Creating account…' : 'Sign up'}
      </button>
    </form>
  );
}
