import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ConflictDialog } from '../components/ConflictDialog';

describe('ConflictDialog Component', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <ConflictDialog
        isOpen={false}
        onClose={() => {}}
        onReloadLatest={() => {}}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders conflict details and triggers onReloadLatest when clicked', () => {
    const handleReload = vi.fn();
    const handleClose = vi.fn();

    render(
      <ConflictDialog
        isOpen={true}
        onClose={handleClose}
        onReloadLatest={handleReload}
        currentVersion={3}
        expectedVersion={2}
        message="Task was modified concurrently."
      />
    );

    expect(screen.getByText('Concurrent Update Detected (409 Conflict)')).toBeInTheDocument();
    expect(screen.getByText('Task was modified concurrently.')).toBeInTheDocument();
    expect(screen.getByText('v2')).toBeInTheDocument();
    expect(screen.getByText('v3')).toBeInTheDocument();

    const reloadButton = screen.getByRole('button', { name: /Reload Latest Version/i });
    fireEvent.click(reloadButton);
    expect(handleReload).toHaveBeenCalledTimes(1);

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
