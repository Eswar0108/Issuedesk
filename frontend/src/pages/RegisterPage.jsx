import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { extractErrorMessage } from '../utils/errors';

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', email: '', password: '', full_name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form.username, form.email, form.password, form.full_name);
      navigate('/login', { state: { successMessage: 'User account created successfully! Please sign in.' } });
    } catch (err) {
      setError(extractErrorMessage(err, 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center text-indigo-600 mb-6">IssueDesk</h1>
        <h2 className="text-xl font-semibold mb-4">Create account</h2>
        {error && (
          <div className="bg-red-100 border-l-4 border-red-600 text-red-800 p-4 rounded mb-4 flex items-start gap-3 shadow-sm">
            <span className="text-lg shrink-0 mt-0.5">⚠️</span>
            <div className="flex-1 whitespace-pre-line text-sm font-medium">{error}</div>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 text-lg leading-none shrink-0" title="Dismiss">&times;</button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input name="full_name" placeholder="Full name" value={form.full_name} onChange={handleChange}
            className="w-full border rounded-md px-3 py-2" />
          <input name="username" placeholder="Username" value={form.username} onChange={handleChange} required
            className="w-full border rounded-md px-3 py-2" />
          <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required
            className="w-full border rounded-md px-3 py-2" />
          <input name="password" type="password" placeholder="Password (8+ chars, upper, lower, number)"
            value={form.password} onChange={handleChange} required
            className="w-full border rounded-md px-3 py-2" />
          <button type="submit" disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50">
            {loading ? 'Creating...' : 'Create account'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm">
          Already have an account? <Link to="/login" className="text-indigo-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}