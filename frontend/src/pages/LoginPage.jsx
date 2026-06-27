import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { extractErrorMessage } from '../utils/errors';

export default function LoginPage() {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.successMessage) {
      setSuccess(location.state.successMessage);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await login(usernameOrEmail, password);
      navigate('/', { state: { successMessage: 'Logged in successfully!' } });
    } catch (err) {
      const msg = extractErrorMessage(err, 'Login failed');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-900 font-sans">
      {/* Hero Brand Panel (Left on Desktop) */}
      <div className="md:w-1/2 gradient-mesh p-8 md:p-16 flex flex-col justify-between text-white relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-xl shadow-lg">
              ⚡
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-white">IssueDesk</span>
          </div>

          <div className="max-w-lg mt-12 space-y-6">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
              AI-Powered Bug Tracking &amp; Team Collaboration.
            </h1>
            <p className="text-slate-300 text-lg leading-relaxed">
              Manage issues, track project workloads, and leverage instant RAG AI assistance directly on your codebase.
            </p>
          </div>
        </div>

        <div className="relative z-10 mt-12 pt-8 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <span>&copy; {new Date().getFullYear()} IssueDesk Inc.</span>
          <span className="flex items-center gap-1.5 text-indigo-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Enterprise Ready
          </span>
        </div>
      </div>

      {/* Form Credentials Panel (Right on Desktop) */}
      <div className="md:w-1/2 bg-slate-50 p-6 sm:p-12 md:p-16 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 sm:p-10 border border-slate-100 animate-fadeIn">
          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-slate-900">Welcome Back</h2>
            <p className="text-sm text-slate-500 mt-1">Please enter your credentials to access your dashboard.</p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl mb-6 text-sm flex items-start gap-3 shadow-xs">
              <span className="text-base shrink-0 mt-0.5">⚠️</span>
              <div className="flex-1 font-medium leading-relaxed">{error}</div>
              <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-700 font-bold text-lg leading-none shrink-0" title="Dismiss">&times;</button>
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl mb-6 text-sm flex items-start gap-3 shadow-xs">
              <span className="text-base shrink-0 mt-0.5">✓</span>
              <div className="flex-1 font-medium">{success}</div>
              <button onClick={() => setSuccess('')} className="text-emerald-500 hover:text-emerald-800 font-bold text-lg leading-none shrink-0" title="Dismiss">&times;</button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Username or Email
              </label>
              <input
                type="text"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                placeholder="e.g. developer@issuedesk.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold py-3.5 px-4 rounded-xl hover:from-indigo-700 hover:to-violet-700 shadow-md shadow-indigo-500/25 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Signing in...</span>
                </>
              ) : (
                'Sign in to Account'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              Don't have an account yet?{' '}
              <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}