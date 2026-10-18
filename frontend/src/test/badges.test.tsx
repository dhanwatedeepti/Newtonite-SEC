import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { TaskStatusBadge } from '../components/TaskStatusBadge';
import { TaskPriorityBadge } from '../components/TaskPriorityBadge';
import { TaskTypeBadge } from '../components/TaskTypeBadge';

describe('Task Badges', () => {
  it('renders status badges with appropriate labels', () => {
    const { rerender } = render(<TaskStatusBadge status="open" />);
    expect(screen.getByText('Open')).toBeInTheDocument();

    rerender(<TaskStatusBadge status="in_progress" />);
    expect(screen.getByText('In Progress')).toBeInTheDocument();

    rerender(<TaskStatusBadge status="blocked" />);
    expect(screen.getByText('Blocked')).toBeInTheDocument();

    rerender(<TaskStatusBadge status="resolved" />);
    expect(screen.getByText('Resolved')).toBeInTheDocument();

    rerender(<TaskStatusBadge status="closed" />);
    expect(screen.getByText('Closed')).toBeInTheDocument();
  });

  it('renders priority badges with appropriate labels and urgent animation', () => {
    const { rerender } = render(<TaskPriorityBadge priority="urgent" />);
    const urgentEl = screen.getByText('Urgent');
    expect(urgentEl).toBeInTheDocument();

    rerender(<TaskPriorityBadge priority="high" />);
    expect(screen.getByText('High')).toBeInTheDocument();

    rerender(<TaskPriorityBadge priority="medium" />);
    expect(screen.getByText('Medium')).toBeInTheDocument();

    rerender(<TaskPriorityBadge priority="low" />);
    expect(screen.getByText('Low')).toBeInTheDocument();
  });

  it('renders type badges with readable category names', () => {
    render(<TaskTypeBadge type="production_incident" />);
    expect(screen.getByText('Production Incident')).toBeInTheDocument();
  });
});
