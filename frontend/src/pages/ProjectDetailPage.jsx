import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import { projectService } from '../api/projects';
import { useAuth } from '../contexts/useAuth';
import { extractErrorMessage } from '../utils/errors';

const getInitials = (name) => {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

export default function ProjectDetailPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Member management state
  const { user } = useAuth();
  const [memberEmail, setMemberEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');
  const [memberError, setMemberError] = useState('');
  const [success, setSuccess] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const location = useLocation();

  useEffect(() => {
    projectService.getById(id)
      .then(setProject)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (location.state?.successMessage) {
      setSuccess(location.state.successMessage);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium">Loading project details...</span>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-xs max-w-md mx-auto">
          <h3 className="text-lg font-bold text-slate-800">Project Not Found</h3>
          <Link to="/projects" className="mt-4 inline-block text-sm font-bold text-indigo-600 hover:underline">
            &larr; Back to Projects
          </Link>
        </div>
      </Layout>
    );
  }

  const isOwnerOrAdmin = user?.id === project.owner_id || user?.role === 'admin';

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!memberEmail.trim()) return;
    setMemberError('');
    setSuccess('');
    setAddingMember(true);
    try {
      const newMember = await projectService.addMember(id, memberEmail.trim(), selectedRole);
      setProject({
        ...project,
        members: [...(project.members || []), newMember],
        member_count: (project.member_count || 0) + 1
      });
      setMemberEmail('');
      setSelectedRole('member');
      setSuccess('Team member added successfully!');
    } catch (err) {
      setMemberError(extractErrorMessage(err, 'Failed to add member'));
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    setMemberError('');
    setSuccess('');
    try {
      await projectService.removeMember(id, userId);
      setProject({
        ...project,
        members: project.members.filter((m) => m.user_id !== userId),
        member_count: Math.max(0, (project.member_count || 1) - 1)
      });
      setSuccess('Team member removed successfully!');
    } catch (err) {
      setMemberError(extractErrorMessage(err, 'Failed to remove member'));
    }
  };

  return (
    <Layout>
      {/* Back button */}
      <div className="mb-6">
        <Link to="/projects" className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition">
          &larr; Back to Projects Workspace
        </Link>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl mb-6 text-sm font-medium shadow-xs flex items-center justify-between">
          <span>✨ {success}</span>
          <button onClick={() => setSuccess('')} className="text-emerald-500 hover:text-emerald-800">&times;</button>
        </div>
      )}

      {/* Main Project Hero Card */}
      <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 p-6 sm:p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{project.name}</h1>
              <span className="text-xs bg-slate-100 text-slate-700 font-mono font-bold px-3 py-1 rounded-lg border border-slate-200">
                {project.key}
              </span>
            </div>
            <p className="text-slate-600 text-sm max-w-2xl leading-relaxed mt-2">
              {project.description || 'No description provided for this project.'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to={`/issues/new?project=${project.id}`}
              className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold px-4 py-2.5 rounded-xl hover:from-indigo-700 hover:to-violet-700 shadow-md shadow-indigo-500/20 transition text-sm flex items-center gap-1.5"
            >
              <span>+</span> New Ticket
            </Link>
            <Link
              to={`/projects/${project.id}/edit`}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-xl border border-slate-200 transition text-sm"
            >
              Settings
            </Link>
          </div>
        </div>

        {/* Stats strip */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap gap-6 text-xs text-slate-500 font-medium">
          <span className="flex items-center gap-1.5">
            👥 <strong>{project.member_count || 0}</strong> team members
          </span>
          <span className="flex items-center gap-1.5">
            🎯 <strong>{project.issue_count || 0}</strong> open issues
          </span>
          {project.start_date && (
            <span className="flex items-center gap-1.5">
              📅 Start: <strong>{new Date(project.start_date).toLocaleDateString()}</strong>
            </span>
          )}
          {project.end_date && (
            <span className="flex items-center gap-1.5">
              🏁 End: <strong>{new Date(project.end_date).toLocaleDateString()}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Grid: Team Members & Add Member Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* Members List */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 sm:p-8">
          <h2 className="text-lg font-extrabold text-slate-900 mb-6">Team Members</h2>
          
          {memberError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl mb-6 text-xs font-medium shadow-xs">
              ⚠️ {memberError}
            </div>
          )}

          <div className="divide-y divide-slate-100">
            {project.members?.map((m) => (
              <div key={m.id} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                    {getInitials(m.full_name || m.username)}
                  </div>
                  <div>
                    <span className="font-bold text-sm text-slate-900">{m.username}</span>
                    {m.full_name && <span className="text-xs text-slate-500 ml-2">({m.full_name})</span>}
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Joined {new Date(m.joined_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md border border-indigo-100">
                    {m.role}
                  </span>
                  {isOwnerOrAdmin && m.role !== 'owner' && (
                    <button
                      onClick={() => handleRemoveMember(m.user_id)}
                      className="text-xs font-semibold text-rose-500 hover:text-rose-700 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
            {(!project.members || project.members.length === 0) && (
              <p className="text-xs text-slate-400 italic py-4">No team members assigned to this project yet.</p>
            )}
          </div>
        </div>

        {/* Add Member Widget */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 sm:p-8">
          <h2 className="text-lg font-extrabold text-slate-900 mb-6">Manage Team</h2>
          {isOwnerOrAdmin ? (
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Add User by Username or Email
                </label>
                <input
                  type="text"
                  placeholder="e.g. developer@issuedesk.com"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Project Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="admin">Admin (Manage settings & issues)</option>
                  <option value="member">Member (Create & edit issues)</option>
                  <option value="viewer">Viewer (Read-only access)</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={addingMember}
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold py-2.5 px-4 rounded-xl hover:from-indigo-700 hover:to-violet-700 shadow-md shadow-indigo-500/20 transition text-xs disabled:opacity-50"
              >
                {addingMember ? 'Adding User...' : 'Add Team Member'}
              </button>
            </form>
          ) : (
            <p className="text-xs text-slate-500 italic">Only project owners or administrators can invite or manage team members.</p>
          )}
        </div>
      </div>

      {/* Quick Access Link */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md flex items-center justify-between">
        <div>
          <h3 className="font-extrabold text-base">Project Issue Backlog</h3>
          <p className="text-xs text-slate-400 mt-0.5">Explore, filter, and triage tickets created inside {project.name}.</p>
        </div>
        <Link
          to={`/issues?project_id=${project.id}`}
          className="bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-2.5 rounded-xl text-xs backdrop-blur-md transition border border-white/10 shrink-0"
        >
          View All Tickets &rarr;
        </Link>
      </div>
    </Layout>
  );
}