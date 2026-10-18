import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamsApi } from '../api/teams';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  Users,
  PlusCircle,
  UserPlus,
  AlertCircle,
  CheckCircle,
  FolderPlus,
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'teams' | 'users' | 'assign'>('teams');

  // Form states
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [teamFormMsg, setTeamFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [assignUserId, setAssignUserId] = useState('');
  const [assignTeamId, setAssignTeamId] = useState('');
  const [assignRole, setAssignRole] = useState<'member' | 'team_lead'>('member');
  const [assignMsg, setAssignMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Queries
  const { data: teams, isLoading: isTeamsLoading } = useQuery({
    queryKey: ['adminTeams'],
    queryFn: teamsApi.getTeams,
  });

  const { data: users, isLoading: isUsersLoading } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: () => teamsApi.getUsers(),
  });

  // Mutations
  const createTeamMutation = useMutation({
    mutationFn: () => teamsApi.createTeam(newTeamName, newTeamDesc),
    onSuccess: () => {
      setTeamFormMsg({ type: 'success', text: `Team '${newTeamName}' created successfully!` });
      setNewTeamName('');
      setNewTeamDesc('');
      queryClient.invalidateQueries({ queryKey: ['adminTeams'] });
      queryClient.invalidateQueries({ queryKey: ['teamsList'] });
    },
    onError: (err: any) => {
      setTeamFormMsg({ type: 'error', text: err.message || 'Failed to create team.' });
    },
  });

  const assignMemberMutation = useMutation({
    mutationFn: () => teamsApi.addTeamMember(assignTeamId, assignUserId, assignRole),
    onSuccess: () => {
      setAssignMsg({ type: 'success', text: 'Team membership updated successfully!' });
      queryClient.invalidateQueries({ queryKey: ['adminTeams'] });
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    },
    onError: (err: any) => {
      setAssignMsg({ type: 'error', text: err.message || 'Failed to update membership.' });
    },
  });

  if (user?.global_role !== 'admin') {
    return (
      <div className="p-8 bg-rose-50 border border-rose-200 rounded-xl text-center max-w-md mx-auto mt-12">
        <Shield className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-rose-900">Access Denied</h2>
        <p className="text-sm text-rose-600 mt-1">
          This administration section requires Global Administrator privileges.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Administration</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage operational teams, organizational users, and role permissions.
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('teams')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'teams'
              ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FolderPlus className="w-4 h-4" />
          Teams ({teams?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'users'
              ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          Users ({users?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('assign')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'assign'
              ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          Assign Membership
        </button>
      </div>

      {/* TAB 1: TEAMS */}
      {activeTab === 'teams' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Teams List (2 cols) */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Configured Teams</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {teams?.map((team) => (
                <div key={team.id} className="p-6 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-bold text-slate-900">{team.name}</h4>
                    <span className="text-xs font-mono text-slate-400">
                      {team.members.length} members
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{team.description || 'No description'}</p>
                  <div className="pt-2 flex flex-wrap gap-1.5">
                    {team.members.map((m) => (
                      <span
                        key={m.user_id}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                          m.role === 'team_lead'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200 font-semibold'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {m.full_name} ({m.role.replace('_', ' ')})
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Create Team Form (1 col) */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 h-fit">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-blue-600" />
              Add New Team
            </h3>

            {teamFormMsg && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                  teamFormMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {teamFormMsg.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                )}
                <span>{teamFormMsg.text}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newTeamName.trim()) {
                  createTeamMutation.mutate();
                }
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-medium text-slate-700 mb-1">Team Name</label>
                <input
                  type="text"
                  required
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g. Infrastructure Security"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={newTeamDesc}
                  onChange={(e) => setNewTeamDesc(e.target.value)}
                  placeholder="Purpose of this team..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={createTeamMutation.isPending || !newTeamName.trim()}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50 text-sm"
              >
                Create Team
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: USERS */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Full Name</th>
                  <th className="px-6 py-3">Email Address</th>
                  <th className="px-6 py-3">Global Role</th>
                  <th className="px-6 py-3">Assigned Teams</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users?.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{u.full_name}</td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-xs">{u.email}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          u.global_role === 'admin'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {u.global_role.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {u.teams.length > 0 ? (
                          u.teams.map((tm) => (
                            <span
                              key={tm.team_id}
                              className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-xs"
                            >
                              {tm.team_name} ({tm.role})
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic text-xs">No team assigned</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ASSIGN MEMBERSHIP */}
      {activeTab === 'assign' && (
        <div className="max-w-md mx-auto bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-blue-600" />
            Assign User to Team
          </h3>

          {assignMsg && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                assignMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {assignMsg.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              )}
              <span>{assignMsg.text}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (assignTeamId && assignUserId) {
                assignMemberMutation.mutate();
              }
            }}
            className="space-y-4 text-xs"
          >
            <div>
              <label className="block font-medium text-slate-700 mb-1">Select User</label>
              <select
                required
                value={assignUserId}
                onChange={(e) => setAssignUserId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Choose a user...</option>
                {users?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Select Team</label>
              <select
                required
                value={assignTeamId}
                onChange={(e) => setAssignTeamId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Choose a team...</option>
                {teams?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Team Role</label>
              <select
                value={assignRole}
                onChange={(e) => setAssignRole(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="member">Member</option>
                <option value="team_lead">Team Lead</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={assignMemberMutation.isPending || !assignUserId || !assignTeamId}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50 text-sm"
            >
              Confirm Membership Assignment
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
