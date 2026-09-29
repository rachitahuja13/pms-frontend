import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);
    if (result.ok) {
      navigate('/', { replace: true });
    } else {
      setError(result.message || 'Invalid email or password.');
    }
  }

  return (
    <div className="login-screen">
      <div className="login-screen__brand-panel">
        <div className="login-screen__brand-mark">ND</div>
        <h2>The New Dimensionz — Project Manager</h2>
        <p>Track tasks, deadlines, and who's carrying what — updated the moment your team moves something forward.</p>
      </div>

      <div className="login-screen__form-panel">
        <div className="login-card">
          <div className="login-card__title">Sign in</div>
          <div className="login-card__sub">Use your company account.</div>

          {error && (
            <div className="error-banner">
              <AlertCircle size={15} strokeWidth={2} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn--primary"
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={submitting}
            >
              {submitting ? (
                'Signing in…'
              ) : (
                <>
                  Sign in <ArrowRight size={15} strokeWidth={2} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
