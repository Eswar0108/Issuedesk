import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import { issueService } from '../api/issues';
import { commentService } from '../api/comments';
import { userService } from '../api/users';
import { attachmentService } from '../api/attachments';
import { aiService } from '../api/ai';
import { useAuth } from '../contexts/useAuth';
import { extractErrorMessage } from '../utils/errors';

const STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
  reopened: 'Reopened',
};

const STATUS_COLORS = {
  open: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  in_progress: 'bg-sky-100 text-sky-800 border-sky-200',
  resolved: 'bg-purple-100 text-purple-800 border-purple-200',
  closed: 'bg-slate-100 text-slate-700 border-slate-200',
  reopened: 'bg-amber-100 text-amber-800 border-amber-200',
};

const formatToIST = (dateStr) => {
  if (!dateStr) return '';
  const utcStr = dateStr.endsWith('Z') ? dateStr : `${dateStr}Z`;
  return new Date(utcStr).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
};

const getInitials = (name) => {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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
  const [aiAssigneeRecommendation, setAiAssigneeRecommendation] = useState(null);
  const [aiAssigneeLoading, setAiAssigneeLoading] = useState(false);
  const location = useLocation();

  // ── Attachment state ──────────────────────────────────────
  const [attachments, setAttachments] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef(null);

  const loadIssue = useCallback(() => {
    issueService.getById(id)
      .then(setIssue)
      .catch(console.error);
    commentService.getByIssue(id)
      .then(setComments)
      .catch(console.error)
      .finally(() => setLoading(false));
    attachmentService.getForEntity('issue', id)
      .then(setAttachments)
      .catch(console.error);
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

  // ── Attachment handlers ───────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('File exceeds 10 MB limit.');
      return;
    }

    setError('');
    setSuccess('');
    setUploadingFile(true);
    try {
      await attachmentService.upload('issue', id, file);
      const updated = await attachmentService.getForEntity('issue', id);
      setAttachments(updated);
      setSuccess(`"${file.name}" uploaded successfully!`);
    } catch (err) {
      setError(extractErrorMessage(err, 'Upload failed'));
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async (attachmentId, fileName) => {
    if (!confirm(`Delete "${fileName}"?`)) return;
    setError('');
    setSuccess('');
    try {
      await attachmentService.delete(attachmentId);
      setAttachments(attachments.filter((a) => a.id !== attachmentId));
      setSuccess('Attachment deleted successfully!');
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to delete attachment'));
    }
  };

  const handleStatusChange = async (newStatus) => {
    setError('');
    setSuccess('');
    try {
      const updated = await issueService.update(id, { status: newStatus });
      setIssue(updated);
      setSuccess(`Status updated to ${STATUS_LABELS[newStatus] || newStatus}!`);
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
      setSuccess(`Priority updated to ${newPriority}!`);
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
      setSuccess(`Issue type updated to ${newType}!`);
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
      setAiAssigneeRecommendation(null);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to update assignee'));
    }
  };

  const handleSuggestAssignee = async () => {
    if (!issue) return;
    setAiAssigneeLoading(true);
    setAiAssigneeRecommendation(null);
    setError('');
    try {
      const res = await aiService.suggestAssignee(issue.project_id, issue.title, issue.description || '');
      setAiAssigneeRecommendation(res);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to get recommendation'));
    } finally {
      setAiAssigneeLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium">Loading ticket details...</span>
        </div>
      </Layout>
    );
  }

  if (!issue) {
    return (
      <Layout>
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-xs max-w-md mx-auto">
          <h3 className="text-lg font-bold text-slate-800">Ticket Not Found</h3>
          <Link to="/issues" className="mt-4 inline-block text-sm font-bold text-indigo-600 hover:underline">
            &larr; Back to Issues
          </Link>
        </div>
      </Layout>
    );
  }

  const STATUS_ACTIONS = {
    open: [{ label: 'Start Progress', status: 'in_progress', color: 'bg-sky-600 hover:bg-sky-700' }],
    in_progress: [
      { label: 'Resolve Ticket', status: 'resolved', color: 'bg-emerald-600 hover:bg-emerald-700' },
      { label: 'Reopen', status: 'open', color: 'bg-amber-600 hover:bg-amber-700' },
    ],
    resolved: [
      { label: 'Close Ticket', status: 'closed', color: 'bg-slate-700 hover:bg-slate-800' },
      { label: 'Reopen', status: 'reopened', color: 'bg-amber-600 hover:bg-amber-700' },
    ],
    closed: [{ label: 'Reopen Ticket', status: 'reopened', color: 'bg-amber-600 hover:bg-amber-700' }],
    reopened: [
      { label: 'Start Progress', status: 'in_progress', color: 'bg-sky-600 hover:bg-sky-700' },
      { label: 'Close Ticket', status: 'closed', color: 'bg-slate-700 hover:bg-slate-800' },
    ],
  };

  return (
    <Layout>
      {/* Back link */}
      <div className="mb-6">
        <Link to="/issues" className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition">
          &larr; Back to Issues Explorer
        </Link>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl mb-6 text-sm font-medium shadow-xs flex items-center justify-between">
          <span>✨ {success}</span>
          <button onClick={() => setSuccess('')} className="text-emerald-500 hover:text-emerald-800">&times;</button>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl mb-6 text-sm font-medium shadow-xs whitespace-pre-line">
          ⚠️ {error}
        </div>
      )}

      {/* Main 2-Column Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Main Details & Activity */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Header Card */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {issue.issue_code && (
                    <span className="text-xs bg-slate-100 text-slate-700 font-mono font-bold px-2.5 py-1 rounded-md border border-slate-200">
                      {issue.issue_code}
                    </span>
                  )}
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border ${STATUS_COLORS[issue.status] || 'bg-slate-100'}`}>
                    {STATUS_LABELS[issue.status] || issue.status}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                  {issue.title}
                </h1>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {STATUS_ACTIONS[issue.status]?.map((action) => (
                  <button
                    key={action.status}
                    onClick={() => handleStatusChange(action.status)}
                    className={`${action.color} text-white font-semibold px-3.5 py-2 rounded-xl text-xs shadow-xs transition`}
                  >
                    {action.label}
                  </button>
                ))}
                <Link
                  to={`/edit-issue/${issue.id}`}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-2 rounded-xl text-xs border border-slate-200 transition"
                >
                  Edit
                </Link>
              </div>
            </div>

            {/* Description Body */}
            <div className="mt-6 pt-6 border-t border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Description</h3>
              {issue.description ? (
                <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 sm:p-5 text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">
                  {issue.description}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">No description provided for this issue.</p>
              )}
            </div>
          </div>

          {/* Attachments Panel */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-extrabold text-slate-900">Attachments ({attachments.length})</h2>
              <label
                className={`cursor-pointer bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold px-3.5 py-2 rounded-xl text-xs shadow-xs hover:from-indigo-700 hover:to-violet-700 transition ${
                  uploadingFile ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                {uploadingFile ? 'Uploading...' : '+ Upload Attachment'}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploadingFile}
                />
              </label>
            </div>

            {attachments.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No files attached to this ticket.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {attachments.map((attachment) => (
                  <div key={attachment.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-lg">📎</span>
                      <div className="min-w-0">
                        <a
                          href={attachmentService.getDownloadUrl(attachment.file_path || `issue/${id}/${attachment.file_name}`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-indigo-600 hover:underline truncate block"
                        >
                          {attachment.file_name}
                        </a>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {attachmentService.formatFileSize(attachment.file_size)}
                        </span>
                      </div>
                    </div>
                    {attachment.uploader_username === user?.username && (
                      <button
                        onClick={() => handleDeleteAttachment(attachment.id, attachment.file_name)}
                        className="text-rose-500 hover:text-rose-700 text-xs font-semibold shrink-0"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comments Discussion Timeline */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 sm:p-8">
            <h2 className="text-lg font-extrabold text-slate-900 mb-6">Discussion ({comments.length})</h2>

            {/* Add Comment Box */}
            <form onSubmit={handleAddComment} className="mb-8">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Type your discussion comment or update..."
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all mb-3"
              />
              <button
                type="submit"
                disabled={!newComment.trim()}
                className="bg-indigo-600 text-white font-semibold px-4 py-2.5 rounded-xl text-xs hover:bg-indigo-700 disabled:opacity-40 shadow-xs transition"
              >
                Post Comment
              </button>
            </form>

            {/* Timeline Thread */}
            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No discussion comments yet. Start the conversation!</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="p-4 bg-slate-50/60 rounded-2xl border border-slate-100 flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                      {getInitials(comment.author_username)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-slate-900">{comment.author_username}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-slate-400">{formatToIST(comment.created_at)}</span>
                          {comment.user_id === user?.id && (
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-[10px] font-bold text-rose-500 hover:underline"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Column: Metadata Side Panel */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-3 border-b border-slate-100">
              Ticket Attributes
            </h3>

            {/* Priority Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Priority</label>
              <select
                value={issue.priority}
                onChange={(e) => handlePriorityChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase tracking-wider cursor-pointer"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {/* Type Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Issue Type</label>
              <select
                value={issue.issue_type}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase tracking-wider cursor-pointer"
              >
                <option value="bug">Bug</option>
                <option value="feature">Feature</option>
                <option value="task">Task</option>
                <option value="improvement">Improvement</option>
              </select>
            </div>

            {/* Assignee Selector & AI Widget */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-500">Assignee</label>
                <button
                  type="button"
                  onClick={handleSuggestAssignee}
                  disabled={aiAssigneeLoading}
                  className="text-[10px] text-indigo-600 font-bold bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md hover:bg-indigo-100/60 transition disabled:opacity-50"
                >
                  {aiAssigneeLoading ? '✨ Recommending...' : '✨ AI Suggest'}
                </button>
              </div>

              <select
                value={issue.assignee_id || ''}
                onChange={(e) => handleAssigneeChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.username}</option>
                ))}
              </select>

              {/* AI Recommendation Box */}
              {aiAssigneeRecommendation && (
                <div className="mt-3 bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl p-3.5 text-xs text-indigo-950 shadow-xs animate-fadeIn">
                  <div className="font-bold text-indigo-700 text-[11px] mb-1">AI Recommendation:</div>
                  <div className="font-extrabold text-slate-900 text-sm">
                    {aiAssigneeRecommendation.suggested_username || 'Unassigned'}
                  </div>
                  <p className="text-[11px] text-indigo-900 font-medium italic mt-1 leading-relaxed">
                    "{aiAssigneeRecommendation.reasoning}"
                  </p>
                  {aiAssigneeRecommendation.suggested_user_id && aiAssigneeRecommendation.suggested_user_id !== issue.assignee_id && (
                    <button
                      type="button"
                      onClick={() => handleAssigneeChange(aiAssigneeRecommendation.suggested_user_id)}
                      className="mt-2.5 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-1.5 rounded-lg shadow-xs transition"
                    >
                      Assign to {aiAssigneeRecommendation.suggested_username}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Reporter & Timestamps */}
            <div className="pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600 font-medium">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Reporter:</span>
                <strong className="text-slate-800">{issue.reporter_username || 'Unknown'}</strong>
              </div>
              {issue.start_date && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Start Date:</span>
                  <span className="text-slate-800">{new Date(issue.start_date).toLocaleDateString()}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Created:</span>
                <span className="text-slate-800">{new Date(issue.created_at).toLocaleDateString()}</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </Layout>
  );
}