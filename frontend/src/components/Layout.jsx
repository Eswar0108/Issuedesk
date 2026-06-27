import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login', { state: { successMessage: 'Logged out successfully!' } });
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Sticky Glassmorphic Navigation */}
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            {/* Brand Logo & Main Nav Links */}
            <div className="flex items-center space-x-8">
              <Link to="/" className="flex items-center gap-2.5 group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-purple-600 text-white flex items-center justify-center font-extrabold shadow-md shadow-indigo-500/20 group-hover:scale-105 transition duration-200">
                  ⚡
                </div>
                <span className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-800 tracking-tight">
                  IssueDesk
                </span>
              </Link>

              <nav className="hidden md:flex items-center space-x-1">
                <Link
                  to="/"
                  className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive('/') && location.pathname === '/'
                      ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/projects"
                  className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive('/projects')
                      ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  Projects
                </Link>
                <Link
                  to="/issues"
                  className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive('/issues')
                      ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  Issues
                </Link>
                <Link
                  to="/ai-chat"
                  className={`ml-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 shadow-xs ${
                    isActive('/ai-chat')
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25'
                      : 'bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-700 border border-indigo-100/80 hover:bg-indigo-100/80 hover:shadow-sm'
                  }`}
                >
                  <span className="text-base">✨</span> Ask AI
                </Link>
              </nav>
            </div>

            {/* User Profile & Actions */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center gap-3 bg-slate-100/80 pl-2.5 pr-3.5 py-1.5 rounded-full border border-slate-200/60">
                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                  {getInitials(user?.full_name || user?.username)}
                </div>
                <span className="text-xs font-semibold text-slate-700 max-w-[120px] truncate">
                  {user?.full_name || user?.username}
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="text-xs font-semibold text-slate-500 hover:text-rose-600 px-3 py-2 rounded-xl hover:bg-rose-50 transition duration-150"
              >
                Logout
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/60 py-6 text-center text-xs text-slate-400">
        IssueDesk Bug Tracker &copy; {new Date().getFullYear()} &bull; Built with FastAPI &amp; React
      </footer>
    </div>
  );
}