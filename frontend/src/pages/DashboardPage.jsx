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

  if (loading) return <Layout><div className="text-center py-8">Loading...</div></Layout>;

  return (
    <Layout>
      {success && (
        <div className="bg-green-50 text-green-700 border border-green-200 p-3 rounded mb-6 text-sm">
          {success}
        </div>
      )}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {user?.full_name || user?.username}!
        </h1>
        <p className="text-gray-600 mt-1">Here's your IssueDesk overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900">Projects</h3>
          <p className="text-3xl font-bold text-indigo-600 mt-2">{projects.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900">Recent Issues</h3>
          <p className="text-3xl font-bold text-indigo-600 mt-2">{recentIssues.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
          <div className="mt-2 space-y-2">
            <Link to="/projects/new" className="block text-indigo-600 hover:underline text-sm">
              + New Project
            </Link>
            <Link to="/issues/new" className="block text-indigo-600 hover:underline text-sm">
              + New Issue
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Your Projects</h2>
          </div>
          <div className="p-6">
            {projects.length === 0 ? (
              <p className="text-gray-500 text-sm">No projects yet. Create your first project!</p>
            ) : (
              <div className="space-y-3">
                {projects.slice(0, 5).map((p) => (
                  <Link key={p.id} to={`/projects/${p.id}`}
                    className="block p-3 border rounded hover:bg-gray-50">
                    <span className="font-medium">{p.name}</span>
                    <span className="ml-2 text-xs bg-gray-200 px-2 py-1 rounded">{p.key}</span>
                    <span className="ml-2 text-sm text-gray-500">{p.issue_count} issues</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Recent Issues</h2>
          </div>
          <div className="p-6">
            {recentIssues.length === 0 ? (
              <p className="text-gray-500 text-sm">No issues yet.</p>
            ) : (
              <div className="space-y-3">
                {recentIssues.map((issue) => (
                  <Link key={issue.id} to={`/issues/${issue.id}`}
                    className="block p-3 border rounded hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm truncate">{issue.title}</span>
                      <span className={`text-xs px-2 py-1 rounded font-medium ${
                        issue.status === 'open' ? 'bg-green-100 text-green-700' :
                        issue.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>{STATUS_LABELS[issue.status] || issue.status}</span>
                    </div>
                    <div className="flex mt-1 text-xs text-gray-500">
                      <span className="mr-3 capitalize">{issue.priority}</span>
                      {issue.project_key && <span>{issue.project_key}-{issue.id}</span>}
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