import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { projectService } from '../api/projects';
import { extractErrorMessage } from '../utils/errors';

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', key: '', description: '', start_date: '', end_date: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleKeyChange = (e) => setForm({ ...form, key: e.target.value.toUpperCase().slice(0, 10) });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanKey = form.key.trim().toUpperCase();
    if (cleanKey.length < 2) {
      setError('Project key must have at least 2 uppercase letters (e.g., PROJ)');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        key: cleanKey,
        description: form.description?.trim() || null,
        start_date: form.start_date ? form.start_date : null,
        end_date: form.end_date ? form.end_date : null,
      };
      const project = await projectService.create(payload);
      navigate(`/projects/${project.id}`, { state: { successMessage: 'Project created successfully!' } });
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to create project'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="mb-6">
        <Link to="/projects" className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition">
          &larr; Back to Projects
        </Link>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Create Project Workspace</h1>
          <p className="text-sm text-slate-500 mt-1">Setup a new workspace to organize your issues and collaborate with your team.</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 p-6 sm:p-10">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl mb-6 text-sm font-medium shadow-xs whitespace-pre-line">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Project Name *
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. IssueDesk Mobile App"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Project Key *
              </label>
              <input
                name="key"
                value={form.key}
                onChange={handleKeyChange}
                placeholder="e.g. IDM"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase transition-all"
              />
              <p className="text-xs text-slate-400 mt-1.5">Used as prefix for ticket codes (e.g. IDM-101)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Start Date
                </label>
                <input
                  name="start_date"
                  type="date"
                  value={form.start_date}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  End Date
                </label>
                <input
                  name="end_date"
                  type="date"
                  value={form.end_date}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={4}
                placeholder="Briefly describe the scope or goal of this project workspace..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all leading-relaxed"
              />
            </div>

            <div className="pt-4 flex items-center justify-end gap-3">
              <Link
                to="/projects"
                className="px-5 py-3 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-indigo-700 hover:to-violet-700 shadow-md shadow-indigo-500/20 transition text-sm disabled:opacity-50"
              >
                {loading ? 'Creating Project...' : 'Create Project'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}