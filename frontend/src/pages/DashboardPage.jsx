import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/useAuth';
import { projectService } from '../api/projects';
import { issueService } from '../api/issues';

const STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
  reopened: 'Reopened',
};

const PRIORITY_BADGES = {
  critical: 'bg-rose-100 text-rose-800 border-rose-200',
  high: 'bg-amber-100 text-amber-800 border-amber-200',
  medium: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  low: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [recentIssues, setRecentIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const location = useLocation();

  useEffect(() => {
    if (location.state?.successMessage) {
      setSuccess(location.state.successMessage);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    Promise.all([
      projectService.getAll(),
      issueService.getAll({ limit: 5, sort_by: 'created_at', sort_desc: true }),
    ])
      .then(([projectsData, issuesData]) => {
        setProjects(projectsData);
        setRecentIssues(issuesData.items || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium">Loading workspace dashboard...</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl mb-6 text-sm font-medium shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>✨</span>
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess('')} className="text-emerald-500 hover:text-emerald-800">&times;</button>
        </div>
      )}

      {/* Header Banner */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Welcome back, <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">{user?.full_name || user?.username}</span>! 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Here is what's happening across your active projects and issues today.
          </p>
        </div>
      </div>

      {/* Top Stat Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Stat Card 1 */}
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/80 hover:shadow-md transition-all duration-200 group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500"></div>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Projects</h3>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl font-bold group-hover:scale-110 transition duration-200">
              📁
            </div>
          </div>
          <p className="text-4xl font-extrabold text-slate-900 mt-3">{projects.length}</p>
        </div>

        {/* Stat Card 2 */}
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/80 hover:shadow-md transition-all duration-200 group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-500"></div>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Recent Tickets</h3>
            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center text-xl font-bold group-hover:scale-110 transition duration-200">
              🎯
            </div>
          </div>
          <p className="text-4xl font-extrabold text-slate-900 mt-3">{recentIssues.length}</p>
        </div>

        {/* Stat Card 3 - Quick Actions */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md relative overflow-hidden flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-300">Quick Actions</h3>
            <p className="text-xs text-slate-400 mt-1">Create items or query the AI assistant.</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/issues/new"
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white backdrop-blur-md transition border border-white/10 flex items-center gap-1"
            >
              <span>+</span> New Issue
            </Link>
            <Link
              to="/projects/new"
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white backdrop-blur-md transition border border-white/10 flex items-center gap-1"
            >
              <span>+</span> New Project
            </Link>
            <Link
              to="/ai-chat"
              className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-sm transition flex items-center gap-1"
            >
              <span>✨</span> Ask AI
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Projects Panel */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="text-base font-extrabold text-slate-900">Your Projects</h2>
            <Link to="/projects" className="text-xs font-bold text-indigo-600 hover:text-indigo-800">
              View All &rarr;
            </Link>
          </div>
          <div className="p-6">
            {projects.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p className="text-sm">No projects created yet.</p>
                <Link to="/projects/new" className="inline-block mt-2 text-xs font-bold text-indigo-600 hover:underline">
                  + Create your first project
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.slice(0, 5).map((p) => (
                  <Link
                    key={p.id}
                    to={`/projects/${p.id}`}
                    className="block p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/20 transition duration-150 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition">
                          {p.name}
                        </span>
                        <span className="text-[11px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                          {p.key}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 font-medium">
                        {p.issue_count || 0} issues
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Issues Panel */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="text-base font-extrabold text-slate-900">Recent Issues</h2>
            <Link to="/issues" className="text-xs font-bold text-indigo-600 hover:text-indigo-800">
              View All &rarr;
            </Link>
          </div>
          <div className="p-6">
            {recentIssues.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p className="text-sm">No issues found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentIssues.map((issue) => (
                  <Link
                    key={issue.id}
                    to={`/issues/${issue.id}`}
                    className="block p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/20 transition duration-150 group"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-semibold text-slate-800 text-sm truncate group-hover:text-indigo-600 transition">
                        {issue.title}
                      </span>
                      <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                        issue.status === 'open' ? 'bg-emerald-100 text-emerald-800' :
                        issue.status === 'in_progress' ? 'bg-sky-100 text-sky-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {STATUS_LABELS[issue.status] || issue.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${PRIORITY_BADGES[issue.priority] || ''}`}>
                        {issue.priority}
                      </span>
                      {issue.issue_code && (
                        <span className="font-mono text-slate-400">{issue.issue_code}</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}