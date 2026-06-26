import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { issueService } from '../api/issues';
import { projectService } from '../api/projects';
import { aiService } from '../api/ai';
import { extractErrorMessage } from '../utils/errors';

export default function EditIssuePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    issue_type: 'bug',
    project_id: searchParams.get('project') || '',
    issue_code: '',
    start_date: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [enhancing, setEnhancing] = useState(false);

  const handleEnhance = async () => {
    if (!form.title) {
      setError('Please enter a Title first before using AI Auto-Enhance.');
      return;
    }
    setError('');
    setEnhancing(true);
    try {
      const res = await aiService.enhanceDescription(form.title, form.description);
      setForm((prev) => ({
        ...prev,
        title: res.enhanced_title || prev.title,
        description: res.enhanced_description || prev.description,
        priority: res.suggested_priority || prev.priority,
        issue_type: res.suggested_type || prev.issue_type,
      }));
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to auto-enhance description'));
    } finally {
      setEnhancing(false);
    }
  };

  useEffect(() => {
    if (id) {
      issueService.getById(id).then((issue) => {
        setForm({
          title: issue.title || '',
          description: issue.description || '',
          priority: issue.priority || 'medium',
          issue_type: issue.issue_type || 'bug',
          project_id: issue.project_id || '',
          issue_code: issue.issue_code || '',
          start_date: issue.start_date ? issue.start_date.split('T')[0] : '',
        });
      }).catch(console.error);
    }
  }, [id]);


  useEffect(() => {
    projectService.getAll().then(setProjects).catch(console.error);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.project_id) { setError('Please select a project'); return; }
    
    // Validate start date against project start date
    const selectedProj = projects.find(p => p.id === parseInt(form.project_id));
    if (form.start_date && selectedProj?.start_date && new Date(form.start_date) < new Date(selectedProj.start_date)) {
      setError(`Issue start date cannot be before project start date (${new Date(selectedProj.start_date).toLocaleDateString()})`);
      return;
    }
    
    setError('');
    setLoading(true);
    try {
      await issueService.update(id, {
        ...form,
        project_id: parseInt(form.project_id),
      });
      navigate(`/issues/${id}`, { state: { successMessage: 'Issue updated successfully!' } });
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to update issue'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Edit Issue</h1>
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
            <label className="block text-sm font-medium text-gray-700">Issue Code *</label>
            <input name="issue_code" value={form.issue_code} onChange={(e) => setForm({ ...form, issue_code: e.target.value })}
              required className="mt-1 w-full border rounded-md px-3 py-2" />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <button
                type="button"
                onClick={handleEnhance}
                disabled={enhancing}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded transition hover:bg-indigo-100/50 disabled:opacity-50"
              >
                {enhancing ? '✨ Enhancing...' : '✨ AI Auto-Enhance'}
              </button>
            </div>
            <textarea name="description" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} rows={6}
              placeholder="Provide a brief outline of the bug/ticket, then use the AI Auto-Enhance button to structure it professionally with reproduction steps, expected behavior, and recommended priority!"
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Date</label>
              <input
                type="date"
                name="start_date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="mt-1 w-full border rounded-md px-3 py-2"
              />
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </Layout>
  );
}