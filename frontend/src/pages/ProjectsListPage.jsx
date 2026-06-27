import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { projectService } from '../api/projects';

export default function ProjectsListPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    projectService.getAll()
      .then(setProjects)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Projects</h1>
          <p className="text-sm text-slate-500 mt-1">Manage and collaborate across all team workspaces.</p>
        </div>
        <Link
          to="/projects/new"
          className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold px-4 py-2.5 rounded-xl hover:from-indigo-700 hover:to-violet-700 shadow-md shadow-indigo-500/20 transition text-sm shrink-0"
        >
          <span>+</span> Create New Project
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <div className="mb-8 max-w-md">
        <div className="relative">
          <input
            type="text"
            placeholder="Search projects by name or key..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
          />
          <span className="absolute left-3.5 top-3 text-slate-400 text-sm">🔍</span>
        </div>
      </div>

      {/* Grid Display */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium">Loading projects...</span>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 shadow-xs max-w-md mx-auto">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
            📂
          </div>
          <h3 className="text-lg font-bold text-slate-800">No projects found</h3>
          <p className="text-sm text-slate-500 mt-1 px-4">
            {searchQuery ? 'No projects match your search criteria.' : 'Get started by creating your team’s first project workspace!'}
          </p>
          {!searchQuery && (
            <Link to="/projects/new" className="mt-4 inline-block text-sm font-bold text-indigo-600 hover:underline">
              + Create New Project
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((p) => (
            <Link
              key={p.id}
              to={`/projects/${p.id}`}
              className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/80 hover:border-indigo-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between group relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 opacity-0 group-hover:opacity-100 transition duration-200"></div>
              
              <div>
                <div className="flex items-center justify-between mb-3 gap-2">
                  <h3 className="font-extrabold text-lg text-slate-900 group-hover:text-indigo-600 transition truncate">
                    {p.name}
                  </h3>
                  <span className="text-xs bg-slate-100 text-slate-700 font-mono font-bold px-2.5 py-1 rounded-md border border-slate-200 shrink-0">
                    {p.key}
                  </span>
                </div>
                
                <p className="text-sm text-slate-600 mb-4 line-clamp-2 leading-relaxed">
                  {p.description || 'No description provided for this project.'}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    👥 <strong>{p.member_count || 0}</strong> members
                  </span>
                  <span className="flex items-center gap-1">
                    🎯 <strong>{p.issue_count || 0}</strong> issues
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}