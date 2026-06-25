import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { issueService } from '../api/issues';
import { projectService } from '../api/projects';
import { extractErrorMessage } from '../utils/errors';

export default function CreateIssuePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    issue_type: 'bug',
    project_id: searchParams.get('project') || '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    projectService.getAll().then(setProjects).catch(console.error);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.project_id) { setError('Please select a project'); return; }
    setError('');
    setLoading(true);
    try {
      const issue = await issueService.create({
        ...form,
        project_id: parseInt(form.project_id),
      });
      navigate(`/issues/${issue.id}`, { state: { successMessage: 'Issue created successfully!' } });
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to create issue'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Create Issue</h1>
      <div className="max-w-2xl bg-white rounded-lg shadow p-6">
        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm whitespace-pre-line">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Project *</label>
            <select name="project_id" value={form.project_id}
              onChange={(e) => setForm({ ...form, project_id: e.target.value })} required
              className="mt-1 w-full border rounded-md px-3 py-2">
              <option value="">Select a project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.key})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Title *</label>
            <input name="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              required className="mt-1 w-full border rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea name="description" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4}
              className="mt-1 w-full border rounded-md px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <select name="issue_type" value={form.issue_type}
                onChange={(e) => setForm({ ...form, issue_type: e.target.value })}
                className="mt-1 w-full border rounded-md px-3 py-2">
                <option value="bug">Bug</option>
                <option value="feature">Feature</option>
                <option value="task">Task</option>
                <option value="improvement">Improvement</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Priority</label>
              <select name="priority" value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="mt-1 w-full border rounded-md px-3 py-2">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50">
            {loading ? 'Creating...' : 'Create Issue'}
          </button>
        </form>
      </div>
    </Layout>
  );
}