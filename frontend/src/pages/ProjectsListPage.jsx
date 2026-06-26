import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { projectService } from '../api/projects';

export default function ProjectsListPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    projectService.getAll()
      .then(setProjects)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Link to="/projects/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm">
          + New Project
        </Link>
      </div>
      {loading ? <div className="text-center py-8">Loading...</div> : projects.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">No projects yet.</p>
          <Link to="/projects/new" className="text-indigo-600 hover:underline mt-2 inline-block">Create your first project</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <Link key={p.id} to={`/projects/${p.id}`}
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-lg">{p.name}</h3>
                <span className="text-xs bg-gray-200 px-2 py-1 rounded font-mono">{p.key}</span>
              </div>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{p.description || 'No description'}</p>
              <div className="flex text-xs text-gray-500 space-x-4">
                <span>{p.member_count} members</span>
                <span>{p.issue_count} issues</span>
              </div>
              {(p.start_date || p.end_date) && (
                <div className="flex text-xs text-gray-500 mt-1 space-x-3">
                  {p.start_date && <span>Start: {new Date(p.start_date).toLocaleDateString()}</span>}
                  {p.end_date && <span>End: {new Date(p.end_date).toLocaleDateString()}</span>}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}