import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { AuditEvent } from '../types';

describe('ActivityTimeline Component', () => {
  it('renders empty message when no activities exist', () => {
    render(<ActivityTimeline activities={[]} />);
    expect(screen.getByText('No activity recorded yet for this task.')).toBeInTheDocument();
  });

  it('renders audit events with user names and before/after changes', () => {
    const mockEvents: AuditEvent[] = [
      {
        id: 'event-1',
        task_id: 'task-1',
        user_id: 'user-1',
        action: 'status_changed',
        details: {
          changes: {
            status: { from: 'open', to: 'in_progress' },
          },
        },
        created_at: new Date().toISOString(),
        user: {
          id: 'user-1',
          email: 'david@newtonite.com',
          full_name: 'David Chen',
          global_role: 'user',
        },
      },
    ];

    render(<ActivityTimeline activities={mockEvents} />);
    expect(screen.getByText('David Chen')).toBeInTheDocument();
    expect(screen.getByText('changed status')).toBeInTheDocument();
    expect(screen.getByText('open')).toBeInTheDocument();
    expect(screen.getByText('in_progress')).toBeInTheDocument();
  });
});
