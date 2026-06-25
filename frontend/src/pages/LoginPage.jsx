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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center text-indigo-600 mb-6">IssueDesk</h1>
        <h2 className="text-xl font-semibold mb-4">Sign in</h2>
        {error && (
          <div className="bg-red-100 border-l-4 border-red-600 text-red-800 p-4 rounded mb-4 flex items-start gap-3 shadow-sm">
            <span className="text-lg shrink-0 mt-0.5">⚠️</span>
            <div className="flex-1 whitespace-pre-line text-sm font-medium">{error}</div>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 text-lg leading-none shrink-0" title="Dismiss">&times;</button>
          </div>
        )}
        {success && (
          <div className="bg-green-100 border-l-4 border-green-600 text-green-800 p-4 rounded mb-4 flex items-start gap-3 shadow-sm">
            <span className="text-lg shrink-0 mt-0.5">✓</span>
            <div className="flex-1 text-sm font-medium">{success}</div>
            <button onClick={() => setSuccess('')} className="text-green-400 hover:text-green-600 text-lg leading-none shrink-0" title="Dismiss">&times;</button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Username or Email</label>
            <input
              type="text"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Don't have an account? <Link to="/register" className="text-indigo-600 hover:underline">Register</Link>
        </p>
      </div>
    </div>
  );
}