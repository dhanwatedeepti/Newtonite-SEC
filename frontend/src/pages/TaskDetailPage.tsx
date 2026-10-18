import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../api/tasks';
import { useAuth } from '../context/AuthContext';
import { TaskStatusBadge } from '../components/TaskStatusBadge';
import { TaskPriorityBadge } from '../components/TaskPriorityBadge';
import { TaskTypeBadge } from '../components/TaskTypeBadge';
import { ConflictDialog } from '../components/ConflictDialog';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { ApiResponseError } from '../api/client';
import {
  ArrowLeft,
  Edit,
  Clock,
  User as UserIcon,
  Users,
  Calendar,
  Layers,
  History,
  CheckCircle,
  PlayCircle,
  AlertOctagon,
  Archive,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import { TaskStatus } from '../types';

export const TaskDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [conflictData, setConflictData] = useState<{
    isOpen: boolean;
    currentVersion?: number;
    expectedVersion?: number;
    message?: string;
  }>({ isOpen: false });

  const [actionError, setActionError] = useState<string | null>(null);

  // Fetch task details
  const {
    data: task,
    isLoading,
    isError,
    error,
    refetch: refetchTask,
  } = useQuery({
    queryKey: ['task', id],
    queryFn: () => tasksApi.getTask(id!),
    enabled: Boolean(id),
  });

  // Fetch task activity history
  const { data: activities, isLoading: isActivityLoading } = useQuery({
    queryKey: ['taskActivity', id],
    queryFn: () => tasksApi.getTaskActivity(id!),
    enabled: Boolean(id),
  });

  // Status transition mutation
  const transitionMutation = useMutation({
    mutationFn: async (targetStatus: TaskStatus) => {
      if (!task) throw new Error('Task not loaded');
      return tasksApi.updateTask(task.id, {
        version: task.version,
        status: targetStatus,
      });
    },
    onSuccess: (updated) => {
      setActionError(null);
      queryClient.setQueryData(['task', id], updated);
      queryClient.invalidateQueries({ queryKey: ['taskActivity', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    },
    onError: (err: any) => {
      if (err instanceof ApiResponseError && err.status === 409) {
        setConflictData({
          isOpen: true,
          currentVersion: err.data.current_version,
          expectedVersion: err.data.expected_version,
          message: err.data.message,
        });
      } else {
        setActionError(err.message || 'Failed to update task status.');
      }
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/5" />
        <div className="h-10 bg-slate-200 rounded w-1/2" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-slate-200 rounded-xl" />
          <div className="h-96 bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !task) {
    return (
      <div className="p-8 bg-rose-50 border border-rose-200 rounded-xl text-center max-w-lg mx-auto mt-12">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-rose-900">Task Not Found or Access Denied</h2>
        <p className="text-sm text-rose-600 mt-1">
          {(error as any)?.message ||
            'You do not have permission to view this work item or it does not exist.'}
        </p>
        <Link
          to="/tasks"
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Work Items
        </Link>
      </div>
    );
  }

  // Determine permitted status transition actions based on workflow rules & user permissions
  const isAdmin = user?.global_role === 'admin';
  const isTeamLead = user?.teams.some((t) => t.team_id === task.team_id && t.role === 'team_lead');
  const isCreator = user?.id === task.created_by_id;
  const isAssignee = user?.id === task.assignee_id;
  const canUpdate = isAdmin || isTeamLead || isCreator || isAssignee;

  const renderWorkflowButtons = () => {
    if (!canUpdate) return null;

    const buttons = [];

    if (task.status === 'open') {
      buttons.push(
        <button
          key="in_progress"
          onClick={() => transitionMutation.mutate('in_progress')}
          disabled={transitionMutation.isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg shadow-sm transition-colors"
        >
          <PlayCircle className="w-4 h-4" />
          Start Progress
        </button>
      );
    } else if (task.status === 'in_progress') {
      buttons.push(
        <button
          key="resolved"
          onClick={() => transitionMutation.mutate('resolved')}
          disabled={transitionMutation.isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-sm transition-colors"
        >
          <CheckCircle className="w-4 h-4" />
          Mark Resolved
        </button>
      );
      buttons.push(
        <button
          key="blocked"
          onClick={() => transitionMutation.mutate('blocked')}
          disabled={transitionMutation.isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-lg shadow-sm transition-colors"
        >
          <AlertOctagon className="w-4 h-4" />
          Mark Blocked
        </button>
      );
    } else if (task.status === 'blocked') {
      buttons.push(
        <button
          key="in_progress_from_blocked"
          onClick={() => transitionMutation.mutate('in_progress')}
          disabled={transitionMutation.isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded-lg shadow-sm transition-colors"
        >
          <PlayCircle className="w-4 h-4" />
          Resume Progress
        </button>
      );
    } else if (task.status === 'resolved') {
      buttons.push(
        <button
          key="closed"
          onClick={() => transitionMutation.mutate('closed')}
          disabled={transitionMutation.isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg shadow-sm transition-colors"
        >
          <Archive className="w-4 h-4" />
          Close Task
        </button>
      );
      buttons.push(
        <button
          key="reopen_from_resolved"
          onClick={() => transitionMutation.mutate('in_progress')}
          disabled={transitionMutation.isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded-lg shadow-sm transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Reopen to In Progress
        </button>
      );
    } else if (task.status === 'closed') {
      if (isAdmin) {
        buttons.push(
          <button
            key="admin_reopen"
            onClick={() => transitionMutation.mutate('in_progress')}
            disabled={transitionMutation.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-300 rounded-lg shadow-sm transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reopen Task (Admin)
          </button>
        );
      } else {
        buttons.push(
          <span key="closed_note" className="text-xs text-slate-400 italic">
            Closed tasks are terminal and can only be reopened by an Administrator.
          </span>
        );
      }
    }

    return buttons;
  };

  return (
    <div className="space-y-6">
      {/* Top back navigation and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/tasks"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Work Items
        </Link>

        <div className="flex items-center gap-2">
          {canUpdate && (
            <Link
              to={`/tasks/${task.id}/edit`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm transition-colors"
            >
              <Edit className="w-3.5 h-3.5" />
              Edit Details
            </Link>
          )}
        </div>
      </div>

      {actionError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Main Grid: Details + Sidebar Meta */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Title, Description, Workflow Bar, Activity */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded">
                {task.task_ref}
              </span>
              <TaskTypeBadge type={task.type} />
              <TaskPriorityBadge priority={task.priority} />
              <TaskStatusBadge status={task.status} />
              <span className="text-xs font-mono text-slate-400 ml-auto">
                v{task.version}
              </span>
            </div>

            <h1 className="text-xl font-bold text-slate-900 leading-snug">{task.title}</h1>

            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Description
              </h3>
              <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {task.description ? task.description : <span className="italic text-slate-400">No description provided.</span>}
              </div>
            </div>

            {/* Workflow Action Bar */}
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Workflow Actions
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                {renderWorkflowButtons()}
              </div>
            </div>
          </div>

          {/* Activity Timeline Section */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <History className="w-5 h-5 text-slate-700" />
              <h2 className="text-base font-semibold text-slate-900">Activity History & Audit Trail</h2>
            </div>
            <ActivityTimeline activities={activities || []} isLoading={isActivityLoading} />
          </div>
        </div>

        {/* Right 1 Col: Metadata sidebar card */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 text-xs">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Task Attributes
            </h3>

            <div className="space-y-3.5">
              <div className="flex items-start justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Team:
                </span>
                <span className="font-medium text-slate-800">{task.team?.name || '—'}</span>
              </div>

              <div className="flex items-start justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5" /> Assignee:
                </span>
                <span className="font-medium text-slate-800">
                  {task.assignee?.full_name || <span className="italic text-slate-400">Unassigned</span>}
                </span>
              </div>

              <div className="flex items-start justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5" /> Created by:
                </span>
                <span className="font-medium text-slate-800">{task.creator?.full_name || '—'}</span>
              </div>

              <div className="flex items-start justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Due Date:
                </span>
                <span className="font-mono text-slate-800">
                  {task.due_date
                    ? new Date(task.due_date).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'None'}
                </span>
              </div>

              <div className="flex items-start justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Created:
                </span>
                <span className="font-mono text-slate-600">
                  {new Date(task.created_at).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              <div className="flex items-start justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Last Updated:
                </span>
                <span className="font-mono text-slate-600">
                  {new Date(task.updated_at).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Optimistic Concurrency Conflict Dialog */}
      <ConflictDialog
        isOpen={conflictData.isOpen}
        currentVersion={conflictData.currentVersion}
        expectedVersion={conflictData.expectedVersion}
        message={conflictData.message}
        onClose={() => setConflictData({ isOpen: false })}
        onReloadLatest={() => {
          setConflictData({ isOpen: false });
          refetchTask();
        }}
      />
    </div>
  );
};
