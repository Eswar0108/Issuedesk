import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams, Link } from 'react-router-dom';
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
    
    const selectedProj = projects.find(p => p.id === parseInt(form.project_id));
    if (form.start_date && selectedProj?.start_date && new Date(form.start_date) < new Date(selectedProj.start_date)) {
      setError(`Issue start date cannot be before project start date (${new Date(selectedProj.start_date).toLocaleDateString()})`);
      return;
    }
    
    setError('');
    setLoading(true);
    try {
      const payload = {
        ...form,
        project_id: parseInt(form.project_id),
        start_date: form.start_date ? form.start_date : null,
        description: form.description?.trim() || null,
      };
      await issueService.update(id, payload);
      navigate(`/issues/${id}`, { state: { successMessage: 'Issue updated successfully!' } });
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to update issue'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="mb-6">
        <Link to={`/issues/${id}`} className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition">
          &larr; Back to Ticket Details
        </Link>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Edit Ticket</h1>
          <p className="text-sm text-slate-500 mt-1">Update details, priority, or dates for ticket #{id}.</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 p-6 sm:p-10">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl mb-6 text-sm font-medium shadow-xs whitespace-pre-line">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Project Workspace *
                </label>
                <select
                  name="project_id"
                  value={form.project_id}
                  onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                >
                  <option value="">Select target project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.key})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Issue Code *
                </label>
                <input
                  name="issue_code"
                  value={form.issue_code}
                  onChange={(e) => setForm({ ...form, issue_code: e.target.value })}
                  placeholder="e.g. BUG-101"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Title *
              </label>
              <input
                name="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Detailed Description
                </label>
                <button
                  type="button"
                  onClick={handleEnhance}
                  disabled={enhancing}
                  className="text-xs text-indigo-700 font-bold flex items-center gap-1.5 bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 px-3 py-1 rounded-xl transition hover:bg-indigo-100/60 shadow-xs disabled:opacity-50"
                >
                  {enhancing ? '✨ Enhancing...' : '✨ AI Auto-Enhance'}
                </button>
              </div>
              <textarea
                name="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={6}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Issue Type
                </label>
                <select
                  name="issue_type"
                  value={form.issue_type}
                  onChange={(e) => setForm({ ...form, issue_type: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all capitalize"
                >
                  <option value="bug">Bug</option>
                  <option value="feature">Feature</option>
                  <option value="task">Task</option>
                  <option value="improvement">Improvement</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Priority
                </label>
                <select
                  name="priority"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all capitalize"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3">
              <Link
                to={`/issues/${id}`}
                className="px-5 py-3 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-indigo-700 hover:to-violet-700 shadow-md shadow-indigo-500/20 transition text-sm disabled:opacity-50"
              >
                {loading ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}