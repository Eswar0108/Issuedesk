import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { issueService } from '../api/issues';
import { userService } from '../api/users';
import { projectService } from '../api/projects';
import { aiService } from '../api/ai';
import { extractErrorMessage } from '../utils/errors';

const STATUS_COLORS = {
  open: 'bg-green-100 text-green-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-purple-100 text-purple-700',
  closed: 'bg-gray-100 text-gray-700',
  reopened: 'bg-yellow-100 text-yellow-700',
};

const STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
  reopened: 'Reopened',
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Issues</h1>
        <Link to="/issues/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm">
          + New Issue
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4 items-center">
        <input placeholder="Search..." value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          className="border rounded px-3 py-1.5 text-sm flex-1 min-w-[200px]" />

        <select value={filters.project_id} onChange={(e) => handleFilterChange('project_id', e.target.value)}
          className="border rounded px-3 py-1.5 text-sm">
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name} ({p.key})</option>
          ))}
        </select>
        
        <label className="flex items-center gap-2 text-sm font-semibold select-none cursor-pointer bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-1.5 hover:bg-indigo-100/50 transition">
          <input
            type="checkbox"
            checked={useSemantic}
            onChange={(e) => setUseSemantic(e.target.checked)}
            className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
          />
          <span className="text-indigo-700">✨ AI Semantic</span>
        </label>
        
        <select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}
          className="border rounded px-3 py-1.5 text-sm">
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
          <option value="reopened">Reopened</option>
        </select>
        
        <select value={filters.priority} onChange={(e) => handleFilterChange('priority', e.target.value)}
          className="border rounded px-3 py-1.5 text-sm">
          <option value="">All priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>

        <select value={filters.assignee_id} onChange={(e) => handleFilterChange('assignee_id', e.target.value)}
          className="border rounded px-3 py-1.5 text-sm">
          <option value="">All Assignees</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.username}</option>
          ))}
        </select>

        <select 
          value={`${filters.sort_by}_${filters.sort_desc ? 'desc' : 'asc'}`} 
          onChange={handleSortChange}
          className="border rounded px-3 py-1.5 text-sm"
        >
          <option value="created_at_desc">Newest First</option>
          <option value="created_at_asc">Oldest First</option>
          <option value="priority_desc">Highest Priority</option>
          <option value="priority_asc">Lowest Priority</option>
          <option value="status_desc">Status (Z-A)</option>
          <option value="status_asc">Status (A-Z)</option>
        </select>
      </div>

      {useSemantic && (!filters.project_id || !filters.search) && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2.5 rounded-lg text-xs mb-6 font-medium">
          💡 <strong>AI Semantic Search Requirements:</strong> Please select a specific project and type a search term above.
        </div>
      )}

      {aiError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg text-xs mb-6 font-medium">
          ⚠️ <strong>AI Search Error:</strong> {aiError}
        </div>
      )}

      {loading ? <div className="text-center py-8">Loading...</div> : issues.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">No issues found.</p>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-gray-500">{total} issue{total !== 1 ? 's' : ''} found</p>
            <p className="text-sm text-gray-500">Page {currentPage} of {totalPages}</p>
          </div>

          <div className="bg-white rounded-lg shadow mb-6">
            {issues.map((issue) => (
              <Link key={issue.id} to={`/issues/${issue.id}`}
                className="block px-6 py-4 border-b last:border-b-0 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{issue.title}</span>
                      {issue.issue_code ? (
                        <span className="text-xs text-gray-400 font-mono">{issue.issue_code}</span>
                      ) : issue.project_key && (
                        <span className="text-xs text-gray-400 font-mono">{issue.project_key}-{issue.id}</span>
                      )}
                      {issue.similarity !== undefined && (
                        <span className="text-xs font-bold text-violet-600 bg-violet-50 border border-violet-100 rounded-full px-2.5 py-0.5 animate-pulse">
                          ✨ {Math.round(issue.similarity * 100)}% Match
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className={`px-2 py-0.5 rounded font-medium ${STATUS_COLORS[issue.status] || 'bg-gray-100'}`}>
                        {STATUS_LABELS[issue.status] || issue.status}
                      </span>
                      <span className="capitalize font-medium">{issue.priority} priority</span>
                      <span className="capitalize">{issue.issue_type.replace('_', ' ')}</span>
                      {issue.assignee_username ? (
                        <span>Assigned to: <strong className="text-gray-700">{issue.assignee_username}</strong></span>
                      ) : (
                        <span className="text-gray-400 italic">Unassigned</span>
                      )}
                      <span>{issue.comment_count} comment{issue.comment_count !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    {issue.created_at ? new Date(issue.created_at + (issue.created_at.endsWith('Z') ? '' : 'Z')).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : ''}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((c) => Math.max(1, c - 1))}
                className="bg-white border rounded px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                &larr; Previous
              </button>
              <span className="text-sm font-medium">Page {currentPage} of {totalPages}</span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((c) => Math.min(totalPages, c + 1))}
                className="bg-white border rounded px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
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