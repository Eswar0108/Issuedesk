import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { projectService } from '../api/projects';
import { extractErrorMessage } from '../utils/errors';

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', key: '', description: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleKeyChange = (e) => setForm({ ...form, key: e.target.value.toUpperCase().slice(0, 10) });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const project = await projectService.create(form);
      navigate(`/projects/${project.id}`, { state: { successMessage: 'Project created successfully!' } });
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to create project'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Create Project</h1>
      <div className="max-w-lg bg-white rounded-lg shadow p-6">
        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm whitespace-pre-line">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Project Name</label>
            <input name="name" value={form.name} onChange={handleChange} required
              className="mt-1 w-full border rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Project Key</label>
            <input name="key" value={form.key} onChange={handleKeyChange} required placeholder="e.g., PROJ"
              className="mt-1 w-full border rounded-md px-3 py-2 font-mono uppercase" />
            <p className="text-xs text-gray-500 mt-1">Used as prefix for issue IDs (e.g., PROJ-1001)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={3}
              className="mt-1 w-full border rounded-md px-3 py-2" />
          </div>
          <button type="submit" disabled={loading}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50">
            {loading ? 'Creating...' : 'Create Project'}
          </button>
        </form>
      </div>
    </Layout>
  );
}