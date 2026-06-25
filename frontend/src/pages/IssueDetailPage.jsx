import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import { issueService } from '../api/issues';
import { commentService } from '../api/comments';
import { userService } from '../api/users';
import { useAuth } from '../contexts/useAuth';
import { extractErrorMessage } from '../utils/errors';

const STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
  reopened: 'Reopened',
};

const formatToIST = (dateStr) => {
  if (!dateStr) return '';
  const utcStr = dateStr.endsWith('Z') ? dateStr : `${dateStr}Z`;
  return new Date(utcStr).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
};

export default function IssueDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [issue, setIssue] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const location = useLocation();

  const loadIssue = useCallback(() => {
    issueService.getById(id)
      .then(setIssue)
      .catch(console.error);
    commentService.getByIssue(id)
      .then(setComments)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    loadIssue();
    userService.getAll()
      .then((data) => setUsers(data.items || []))
      .catch(console.error);
    if (location.state?.successMessage) {
      setSuccess(location.state.successMessage);
      window.history.replaceState({}, document.title);
    }
  }, [loadIssue, location]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setError('');
    setSuccess('');
    try {
      await commentService.create(id, newComment);
      setNewComment('');
      setSuccess('Comment added successfully!');
      commentService.getByIssue(id).then(setComments);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to add comment'));
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('Delete this comment?')) return;
    setError('');
    setSuccess('');
    try {
      await commentService.delete(id, commentId);
      setComments(comments.filter((c) => c.id !== commentId));
      setSuccess('Comment deleted successfully!');
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to delete comment'));
    }
  };

  const handleStatusChange = async (newStatus) => {
    setError('');
    setSuccess('');
    try {
      const updated = await issueService.update(id, { status: newStatus });
      setIssue(updated);
      setSuccess(`Issue status updated to ${STATUS_LABELS[newStatus] || newStatus} successfully!`);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to update status'));
    }
  };

  const handlePriorityChange = async (newPriority) => {
    setError('');
    setSuccess('');
    try {
      const updated = await issueService.update(id, { priority: newPriority });
      setIssue(updated);
      setSuccess(`Priority updated to ${newPriority} successfully!`);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to update priority'));
    }
  };

  const handleTypeChange = async (newType) => {
    setError('');
    setSuccess('');
    try {
      const updated = await issueService.update(id, { issue_type: newType });
      setIssue(updated);
      setSuccess(`Issue type updated to ${newType} successfully!`);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to update issue type'));
    }
  };

  const handleAssigneeChange = async (newAssigneeId) => {
    setError('');
    setSuccess('');
    try {
      const val = newAssigneeId ? parseInt(newAssigneeId) : null;
      const updated = await issueService.update(id, { assignee_id: val });
      setIssue(updated);
      setSuccess('Assignee updated successfully!');
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to update assignee'));
    }
  };

  if (loading) return <Layout><div className="text-center py-8">Loading...</div></Layout>;
  if (!issue) return <Layout><div className="text-center py-8 text-red-600">Issue not found</div></Layout>;

  const STATUS_ACTIONS = {
    open: [{ label: 'Start Progress', status: 'in_progress', color: 'bg-blue-600' }],
    in_progress: [
      { label: 'Resolve', status: 'resolved', color: 'bg-green-600' },
      { label: 'Reopen', status: 'open', color: 'bg-yellow-600' },
    ],
    resolved: [
      { label: 'Close', status: 'closed', color: 'bg-gray-600' },
      { label: 'Reopen', status: 'reopened', color: 'bg-yellow-600' },
    ],
    closed: [{ label: 'Reopen', status: 'reopened', color: 'bg-yellow-600' }],
    reopened: [
      { label: 'Start Progress', status: 'in_progress', color: 'bg-blue-600' },
      { label: 'Close', status: 'closed', color: 'bg-gray-600' },
    ],
  };

  return (
    <Layout>
      {success && (
        <div className="bg-green-50 text-green-700 border border-green-200 p-3 rounded mb-6 text-sm">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded mb-6 text-sm whitespace-pre-line">
          {error}
        </div>
      )}
      <div className="mb-4">
        <Link to="/issues" className="text-indigo-600 hover:underline text-sm">&larr; Back to Issues</Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">{issue.title}</h1>
            <span className="text-sm text-gray-500">
              {issue.project_key && <span className="font-mono mr-2">{issue.project_key}-{issue.id}</span>}
              Created {new Date(issue.created_at).toLocaleDateString()}
            </span>
          </div>
          <div className="flex gap-2">
            {STATUS_ACTIONS[issue.status]?.map((action) => (
              <button key={action.status} onClick={() => handleStatusChange(action.status)}
                className={`${action.color} text-white px-3 py-1.5 rounded text-sm hover:opacity-90`}>
                {action.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mb-4 text-sm">
          <span className={`px-2 py-1 rounded font-medium ${
            issue.status === 'open' ? 'bg-green-100 text-green-700' :
            issue.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
            issue.status === 'resolved' ? 'bg-purple-100 text-purple-700' :
            'bg-gray-100 text-gray-700'
          }`}>{STATUS_LABELS[issue.status] || issue.status}</span>
          
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500">Priority:</span>
            <select
              value={issue.priority}
              onChange={(e) => handlePriorityChange(e.target.value)}
              className="px-2 py-1 bg-gray-100 rounded border border-gray-200 text-xs font-semibold uppercase tracking-wider text-gray-700 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-gray-500">Type:</span>
            <select
              value={issue.issue_type}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="px-2 py-1 bg-gray-100 rounded border border-gray-200 text-xs font-semibold uppercase tracking-wider text-gray-700 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="bug">Bug</option>
              <option value="feature">Feature</option>
              <option value="task">Task</option>
              <option value="improvement">Improvement</option>
            </select>
          </div>

          {issue.reporter_username && <span>Reported by: <strong>{issue.reporter_username}</strong></span>}
          
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500">Assignee:</span>
            <select
              value={issue.assignee_id || ''}
              onChange={(e) => handleAssigneeChange(e.target.value)}
              className="px-2 py-1 bg-gray-100 rounded border border-gray-200 text-xs font-semibold text-gray-700 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.username}</option>
              ))}
            </select>
          </div>
        </div>

        {issue.description && (
          <div className="mt-4 p-4 bg-gray-50 rounded">
            <p className="text-gray-700 whitespace-pre-wrap">{issue.description}</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Comments ({comments.length})</h2>

        <form onSubmit={handleAddComment} className="mb-6">
          <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..." rows={3}
            className="w-full border rounded-md px-3 py-2 mb-2" />
          <button type="submit" disabled={!newComment.trim()}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50">
            Add Comment
          </button>
        </form>

        <div className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-gray-500 text-sm">No comments yet.</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{comment.author_username}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {formatToIST(comment.created_at)}
                    </span>
                    {comment.user_id === user?.id && (
                      <button onClick={() => handleDeleteComment(comment.id)}
                        className="text-xs text-red-600 hover:underline">Delete</button>
                    )}
                  </div>
                </div>
                <p className="text-gray-700 text-sm whitespace-pre-wrap">{comment.content}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}