import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { issueService } from '../api/issues';
import { userService } from '../api/users';
import { projectService } from '../api/projects';
import { aiService } from '../api/ai';
import { extractErrorMessage } from '../utils/errors';

const STATUS_COLORS = {
  open: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  in_progress: 'bg-sky-100 text-sky-800 border-sky-200',
  resolved: 'bg-purple-100 text-purple-800 border-purple-200',
  closed: 'bg-slate-100 text-slate-700 border-slate-200',
  reopened: 'bg-amber-100 text-amber-800 border-amber-200',
};

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

export default function IssuesListPage() {
  const [searchParams] = useSearchParams();
  const [issues, setIssues] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [useSemantic, setUseSemantic] = useState(false);
  const [aiError, setAiError] = useState('');
  const [filters, setFilters] = useState({
    project_id: searchParams.get('project') || searchParams.get('project_id') || '',
    status: '',
    priority: '',
    assignee_id: '',
    search: '',
    sort_by: 'created_at',
    sort_desc: true,
  });

  useEffect(() => {
    userService.getAll()
      .then((data) => setUsers(data.items || []))
      .catch(console.error);
      
    projectService.getAll()
      .then(setProjects)
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (useSemantic && filters.search && filters.project_id) {
      setLoading(true);
      setAiError('');
      aiService.semanticSearch(parseInt(filters.project_id), filters.search, 15)
        .then((data) => {
          setIssues(data || []);
          setTotal(data.length || 0);
          setTotalPages(1);
        })
        .catch((err) => {
          const errMsg = extractErrorMessage(err, 'AI search failed');
          setAiError(errMsg);
          setIssues([]);
          setTotal(0);
          setTotalPages(1);
        })
        .finally(() => setLoading(false));
    } else {
      setAiError('');
      setLoading(true);
      const params = {
        page: currentPage,
        page_size: 10,
        sort_by: filters.sort_by,
        sort_desc: filters.sort_desc,
      };
      if (filters.project_id) params.project_id = filters.project_id;
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.assignee_id) params.assignee_id = filters.assignee_id;
      if (filters.search) params.search = filters.search;

      issueService.getAll(params)
        .then((data) => {
          setIssues(data.items || []);
          setTotal(data.total || 0);
          setTotalPages(data.total_pages || 1);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [filters, currentPage, useSemantic]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleSortChange = (e) => {
    const value = e.target.value;
    if (value === 'created_at_desc') {
      setFilters((prev) => ({ ...prev, sort_by: 'created_at', sort_desc: true }));
    } else if (value === 'created_at_asc') {
      setFilters((prev) => ({ ...prev, sort_by: 'created_at', sort_desc: false }));
    } else if (value === 'priority_desc') {
      setFilters((prev) => ({ ...prev, sort_by: 'priority', sort_desc: true }));
    } else if (value === 'priority_asc') {
      setFilters((prev) => ({ ...prev, sort_by: 'priority', sort_desc: false }));
    } else if (value === 'status_desc') {
      setFilters((prev) => ({ ...prev, sort_by: 'status', sort_desc: true }));
    } else if (value === 'status_asc') {
      setFilters((prev) => ({ ...prev, sort_by: 'status', sort_desc: false }));
    }
    setCurrentPage(1);
  };

  return (
    <Layout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Issues Explorer</h1>
          <p className="text-sm text-slate-500 mt-1">Search, filter, and track tickets across your projects.</p>
        </div>
        <Link
          to="/issues/new"
          className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold px-4 py-2.5 rounded-xl hover:from-indigo-700 hover:to-violet-700 shadow-md shadow-indigo-500/20 transition text-sm shrink-0"
        >
          <span>+</span> Create New Issue
        </Link>
      </div>

      {/* Control Panel / Filters */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-4 sm:p-5 mb-8 space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Text Search Input */}
          <div className="flex-1 min-w-[240px]">
            <input
              type="text"
              placeholder="Search by title or description..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Project Filter */}
          <select
            value={filters.project_id}
            onChange={(e) => handleFilterChange('project_id', e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.key})</option>
            ))}
          </select>
          
          {/* AI Semantic Toggle */}
          <label className={`flex items-center gap-2 text-sm font-semibold select-none cursor-pointer px-3.5 py-2 rounded-xl border transition duration-150 ${
            useSemantic
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-transparent shadow-md shadow-indigo-500/20'
              : 'bg-indigo-50/70 border-indigo-100 text-indigo-700 hover:bg-indigo-100/70'
          }`}>
            <input
              type="checkbox"
              checked={useSemantic}
              onChange={(e) => setUseSemantic(e.target.checked)}
              className="sr-only"
            />
            <span>✨ AI Semantic</span>
          </label>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
            <option value="reopened">Reopened</option>
          </select>
          
          {/* Priority Filter */}
          <select
            value={filters.priority}
            onChange={(e) => handleFilterChange('priority', e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>

          {/* Assignee Filter */}
          <select
            value={filters.assignee_id}
            onChange={(e) => handleFilterChange('assignee_id', e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Assignees</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.username}</option>
            ))}
          </select>

          {/* Sort selector */}
          <select 
            value={`${filters.sort_by}_${filters.sort_desc ? 'desc' : 'asc'}`} 
            onChange={handleSortChange}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="created_at_desc">Newest First</option>
            <option value="created_at_asc">Oldest First</option>
            <option value="priority_desc">Highest Priority</option>
            <option value="priority_asc">Lowest Priority</option>
          </select>
        </div>
      </div>

      {/* AI Semantic Notice banner */}
      {useSemantic && (!filters.project_id || !filters.search) && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-2xl text-xs mb-6 font-medium flex items-center gap-2 shadow-xs">
          <span>💡</span>
          <span><strong>AI Semantic Search Requirements:</strong> Please select a specific project and type a query above to rank by vector similarity.</span>
        </div>
      )}

      {aiError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl text-xs mb-6 font-medium shadow-xs">
          ⚠️ <strong>AI Search Error:</strong> {aiError}
        </div>
      )}

      {/* Table & Results */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium">Fetching tickets...</span>
        </div>
      ) : issues.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 shadow-xs max-w-md mx-auto">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
            🔍
          </div>
          <h3 className="text-lg font-bold text-slate-800">No tickets found</h3>
          <p className="text-sm text-slate-500 mt-1">Try adjusting your search keywords or filter dropdowns.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4 px-1 text-xs font-semibold text-slate-500">
            <span>Showing <strong>{issues.length}</strong> of <strong>{total}</strong> issues</span>
            <span>Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong></span>
          </div>

          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden mb-6">
            <div className="divide-y divide-slate-100">
              {issues.map((issue) => (
                <Link
                  key={issue.id}
                  to={`/issues/${issue.id}`}
                  className="block px-6 py-4 hover:bg-indigo-50/20 transition duration-150 group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition">
                          {issue.title}
                        </span>
                        {issue.issue_code ? (
                          <span className="text-xs bg-slate-100 text-slate-600 font-mono font-semibold px-2 py-0.5 rounded border border-slate-200">
                            {issue.issue_code}
                          </span>
                        ) : issue.project_key && (
                          <span className="text-xs bg-slate-100 text-slate-600 font-mono font-semibold px-2 py-0.5 rounded border border-slate-200">
                            {issue.project_key}-{issue.id}
                          </span>
                        )}
                        {issue.similarity !== undefined && (
                          <span className="text-xs font-bold text-violet-700 bg-violet-50 border border-violet-200 rounded-full px-2.5 py-0.5 animate-pulse">
                            ✨ {Math.round(issue.similarity * 100)}% Match
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border text-[10px] ${STATUS_COLORS[issue.status] || 'bg-slate-100'}`}>
                          {STATUS_LABELS[issue.status] || issue.status}
                        </span>
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${PRIORITY_BADGES[issue.priority] || ''}`}>
                          {issue.priority}
                        </span>
                        <span className="capitalize text-slate-600 font-medium">
                          {issue.issue_type ? issue.issue_type.replace('_', ' ') : 'issue'}
                        </span>
                        {issue.assignee_username ? (
                          <span>Assigned: <strong className="text-slate-700">{issue.assignee_username}</strong></span>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                        <span>💬 {issue.comment_count || 0}</span>
                      </div>
                    </div>

                    <span className="text-xs text-slate-400 shrink-0 font-medium">
                      {issue.created_at ? new Date(issue.created_at + (issue.created_at.endsWith('Z') ? '' : 'Z')).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : ''}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-6">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((c) => Math.max(1, c - 1))}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition shadow-xs"
              >
                &larr; Previous
              </button>
              <span className="text-xs font-bold text-slate-600 px-3">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((c) => Math.min(totalPages, c + 1))}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition shadow-xs"
              >
                Next &rarr;
              </button>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}