import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layers, LogIn, AlertCircle, Check, Shield, UserCheck, Users } from 'lucide-react';

interface DemoUser {
  email: string;
  role: string;
  name: string;
  team: string;
}

const DEMO_ACCOUNTS: DemoUser[] = [
  { email: 'admin@newtonite.com', role: 'Administrator', name: 'Sarah Admin', team: 'Global Admin' },
  { email: 'lead.ops@newtonite.com', role: 'Team Lead', name: 'David Chen', team: 'Operations' },
  { email: 'lead.eng@newtonite.com', role: 'Team Lead', name: 'Elena Rostova', team: 'Engineering' },
  { email: 'member.ops@newtonite.com', role: 'Member', name: 'Marcus Vance', team: 'Operations' },
  { email: 'member.eng@newtonite.com', role: 'Member', name: 'Priya Sharma', team: 'Engineering' },
  { email: 'member.multi@newtonite.com', role: 'Member', name: 'Alex Rivera', team: 'Ops & Engineering' },
];

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectDemoUser = (account: DemoUser) => {
    setEmail(account.email);
    setPassword('Password123!');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
          <Layers className="w-7 h-7" />
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
          Newtonite Operations
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Operations Under Pressure Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-xl sm:px-10">
          {error && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700 flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@newtonite.com"
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign in
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Accounts Selection */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              One-Click Demo Accounts (Password: Password123!)
            </div>
            <div className="space-y-1.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleSelectDemoUser(acc)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between border transition-all ${
                    email === acc.email
                      ? 'bg-blue-50 border-blue-300 text-blue-900 font-medium'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {acc.role === 'Administrator' ? (
                      <Shield className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                    ) : acc.role === 'Team Lead' ? (
                      <UserCheck className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                    ) : (
                      <Users className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    )}
                    <span>{acc.name}</span>
                    <span className="text-slate-400">({acc.team})</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">{acc.role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
