import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import { projectService } from '../api/projects';
import { useAuth } from '../contexts/useAuth';
import { extractErrorMessage } from '../utils/errors';

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

  if (loading) return <Layout><div className="text-center py-8">Loading...</div></Layout>;
  if (!project) return <Layout><div className="text-center py-8 text-red-600">Project not found</div></Layout>;

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
      {success && (
        <div className="bg-green-50 text-green-700 border border-green-200 p-3 rounded mb-6 text-sm">
          {success}
        </div>
      )}
      <div className="mb-6">
        <Link to="/projects" className="text-indigo-600 hover:underline text-sm">&larr; Back to Projects</Link>
      </div>
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <span className="text-sm bg-gray-200 px-2 py-1 rounded font-mono">{project.key}</span>
          </div>
          <div className="flex space-x-2">
            <Link to={`/issues/new?project=${project.id}`}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700">
              + New Issue
            </Link>
            <Link to={`/projects/${project.id}/edit`}
              className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700">
              + Edit Project
            </Link>
          </div>
        </div>
        <p className="text-gray-600 mb-4">{project.description || 'No description'}</p>
        <div className="flex text-sm text-gray-500 space-x-6">
          <span>Owner ID: {project.owner_id}</span>
          <span>{project.member_count} members</span>
          <span>{project.issue_count} open issues</span>
        </div>
        {(project.start_date || project.end_date) && (
          <div className="flex text-sm text-gray-500 mt-2 space-x-4">
            {project.start_date && <span>Start: {new Date(project.start_date).toLocaleDateString()}</span>}
            {project.end_date && <span>End: {new Date(project.end_date).toLocaleDateString()}</span>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Members List */}
        <div className="md:col-span-2 bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Team Members</h2>
          {memberError && (
            <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm whitespace-pre-line">
              {memberError}
            </div>
          )}
          <div className="space-y-2">
            {project.members?.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-2 border rounded">
                <div>
                  <span className="font-medium">{m.username}</span>
                  {m.full_name && <span className="text-sm text-gray-500 ml-2">({m.full_name})</span>}
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-400">
                    Joined {new Date(m.joined_at).toLocaleDateString()}
                  </span>
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">{m.role}</span>
                  {isOwnerOrAdmin && m.role !== 'owner' && (
                    <button
                      onClick={() => handleRemoveMember(m.user_id)}
                      className="text-xs text-red-600 hover:text-red-800 hover:underline border-l pl-2 border-gray-300 ml-2"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
            {(!project.members || project.members.length === 0) && (
              <p className="text-sm text-gray-500">No members registered in this project.</p>
            )}
          </div>
        </div>

        {/* Add Member panel for owners/admins */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Manage Team</h2>
          {isOwnerOrAdmin ? (
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Add User by Username or Email</label>
                <input
                  type="text"
                  placeholder="Enter username or email address"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  required
                  className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Project Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  required
                  className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
                >
                  <option value="admin">Admin (Manage settings & issues)</option>
                  <option value="member">Member (Create & edit issues)</option>
                  <option value="viewer">Viewer (Read-only access)</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={addingMember}
                className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {addingMember ? 'Adding...' : 'Add Team Member'}
              </button>
            </form>
          ) : (
            <p className="text-sm text-gray-500">Only the project owner or administrators can add/remove members.</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Issues</h2>
        <Link to={`/issues?project_id=${project.id}`}
          className="text-indigo-600 hover:underline text-sm">
          View all issues in this project &rarr;
        </Link>
      </div>
    </Layout>
  );
}