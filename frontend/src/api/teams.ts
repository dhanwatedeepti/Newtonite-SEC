import { apiClient } from './client';
import { Team, User } from '../types';

export const teamsApi = {
  getTeams: async (): Promise<Team[]> => {
    return apiClient<Team[]>('/api/v1/teams');
  },

  getUsers: async (teamId?: string): Promise<User[]> => {
    const qs = teamId ? `?team_id=${teamId}` : '';
    return apiClient<User[]>(`/api/v1/users${qs}`);
  },

  createTeam: async (name: string, description?: string): Promise<Team> => {
    return apiClient<Team>('/api/v1/teams', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  },

  addTeamMember: async (teamId: string, userId: string, role: string = 'member'): Promise<void> => {
    return apiClient<void>(`/api/v1/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, role }),
    });
  },

  createUser: async (userData: { email: string; full_name: string; password: string; global_role: string }): Promise<User> => {
    return apiClient<User>('/api/v1/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },
};
