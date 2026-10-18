import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Layers,
  LayoutDashboard,
  CheckSquare,
  Shield,
  LogOut,
  User as UserIcon,
  PlusCircle,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const navLinkClass = (path: string) =>
    `inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
      isActive(path)
        ? 'bg-blue-50 text-blue-700 shadow-sm'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    }`;

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo and Nav links */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-slate-900 text-base tracking-tight leading-none block">
                  Newtonite
                </span>
                <span className="text-[10px] uppercase font-semibold text-blue-600 tracking-wider">
                  Operations
                </span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1.5">
              <Link to="/" className={navLinkClass('/')}>
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
              <Link to="/tasks" className={navLinkClass('/tasks')}>
                <CheckSquare className="w-4 h-4" />
                Work Items
              </Link>
              {user.global_role === 'admin' && (
                <Link to="/admin" className={navLinkClass('/admin')}>
                  <Shield className="w-4 h-4" />
                  Administration
                </Link>
              )}
            </nav>
          </div>

          {/* Right actions & User Profile */}
          <div className="flex items-center gap-3">
            <Link
              to="/tasks/new"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              Create Task
            </Link>

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold text-slate-900 leading-none">
                  {user.full_name}
                </div>
                <div className="text-xs text-slate-500 mt-1 flex items-center justify-end gap-1.5">
                  <span className="capitalize font-medium text-slate-600">
                    {user.global_role === 'admin' ? 'Administrator' : 'Team Member'}
                  </span>
                  {user.teams.length > 0 && (
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={logout}
                title="Sign out"
                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
