import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../context/session.js';
import { Brand } from '../components/ui.jsx';

export default function Auth({ mode }) {
  const register = mode === 'register';
  const { authenticate } = useSession();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [field, setField] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (pending) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    setField('');
    setError('');
    if (new TextEncoder().encode(values.password).length > 72) {
      setField('password');
      setError('Password must be at most 72 UTF-8 bytes.');
      return;
    }
    setPending(true);
    try {
      await authenticate(mode, values);
    } catch (error) {
      setField(error.field);
      setError(error.message);
      setPending(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <Brand />
        <h1>{register ? 'Create your account' : 'Welcome back'}</h1>
        <p className="muted">
          {register
            ? 'Start your personal glucose log.'
            : 'Log in to view your glucose log.'}
        </p>
        <form className="form-stack" onSubmit={submit}>
          {register && (
            <label>
              Name
              <input
                name="name"
                autoComplete="name"
                maxLength="100"
                required
                aria-invalid={field === 'name'}
              />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              name="email"
              autoComplete="email"
              maxLength="254"
              required
              aria-invalid={field === 'email'}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              autoComplete={register ? 'new-password' : 'current-password'}
              minLength={register ? 8 : undefined}
              required
              aria-invalid={field === 'password'}
            />
            {register && (
              <span className="field-hint">Use at least 8 characters.</span>
            )}
          </label>
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
          <button className="button primary" type="submit" disabled={pending}>
            {pending ? 'Please wait…' : register ? 'Create account' : 'Log in'}
          </button>
        </form>
        <p className="auth-switch">
          {register ? 'Already have an account?' : 'New to Sweety?'}{' '}
          <Link to={register ? '/login' : '/register'}>
            {register ? 'Log in' : 'Create an account'}
          </Link>
        </p>
      </div>
    </main>
  );
}
