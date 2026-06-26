import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { projectService } from '../api/projects';
import { extractErrorMessage } from '../utils/errors';

export default function EditProjectPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [form, setForm] = useState({
    name: '',
    key: '',
    description: '',
    start_date: '',
    end_date: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    projectService.getById(id)
      .then((data) => {
        setProject(data);
        setForm({
          name: data.name || '',
          key: data.key || '',
          description: data.description || '',
          start_date: data.start_date || '',
          end_date: data.end_date || '',
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleKeyChange = (e) => setForm({ ...form, key: e.target.value.toUpperCase().slice(0, 10) });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await projectService.update(id, form);
      navigate(`/projects/${id}`, { state: { successMessage: 'Project updated successfully!' } });
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to update project'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate(`/projects/${id}`);
  };

  if (loading) return <Layout><div className="text-center py-8">Loading project...</div></Layout>;
  if (!project) return <Layout><div className="text-center py-8 text-red-600">Project not found</div></Layout>;

  return (
    <Layout>
      <div className="mb-6">
        <button onClick={handleCancel} className="text-indigo-600 hover:underline text-sm">
          &larr; Back to Project
        </button>
      </div>
      <h1 className="text-2xl font-bold mb-6">Edit Project</h1>
      <div className="max-w-lg bg-white rounded-lg shadow p-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm whitespace-pre-line">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Project Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="mt-1 w-full border rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Project Key</label>
            <input
              name="key"
              value={form.key}
              onChange={handleKeyChange}
              required
              placeholder="e.g., PROJ"
              className="mt-1 w-full border rounded-md px-3 py-2 font-mono uppercase"
            />
            <p className="text-xs text-gray-500 mt-1">Used as prefix for issue IDs (e.g., PROJ-1001)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Start Date</label>
            <input
              name="start_date"
              type="date"
              value={form.start_date}
              onChange={handleChange}
              className="mt-1 w-full border rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">End Date</label>
            <input
              name="end_date"
              type="date"
              value={form.end_date}
              onChange={handleChange}
              className="mt-1 w-full border rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              className="mt-1 w-full border rounded-md px-3 py-2"
            />
          </div>
          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={submitting}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}