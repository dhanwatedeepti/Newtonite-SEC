import React, { useEffect, useState, useId } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../api/tasks';
import { teamsApi } from '../api/teams';
import { useAuth } from '../context/AuthContext';
import { ConflictDialog } from '../components/ConflictDialog';
import { ApiResponseError } from '../api/client';
import { TaskType, TaskPriority } from '../types';
import {
  ArrowLeft,
  Save,
  PlusCircle,
  AlertCircle,
  Clock,
  Layers,
  User as UserIcon,
} from 'lucide-react';

const taskSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(255, 'Title too long'),
  description: z.string().optional().default(''),
  type: z.enum([
    'customer_issue',
    'engineering_problem',
    'payment_investigation',
    'production_incident',
    'compliance_request',
    'operational_task',
  ]),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  team_id: z.string().min(1, 'Please select a team'),
  assignee_id: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
});

type TaskFormData = z.infer<typeof taskSchema>;

export const TaskCreateEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Generate a client-side idempotency key for new tasks to protect against duplicate submissions
  const [idempotencyKey] = useState<string>(() =>
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `key-${Date.now()}`
  );

  const [conflictData, setConflictData] = useState<{
    isOpen: boolean;
    currentVersion?: number;
    expectedVersion?: number;
    message?: string;
  }>({ isOpen: false });

  const [formError, setFormError] = useState<string | null>(null);

  // Fetch task if editing
  const { data: existingTask, isLoading: isTaskLoading, refetch: refetchExistingTask } = useQuery({
    queryKey: ['task', id],
    queryFn: () => tasksApi.getTask(id!),
    enabled: isEditMode,
  });

  // Fetch available teams
  const { data: teams, isLoading: isTeamsLoading } = useQuery({
    queryKey: ['teamsList'],
    queryFn: teamsApi.getTeams,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      type: 'operational_task',
      priority: 'medium',
      team_id: '',
      assignee_id: '',
      due_date: '',
    },
  });

  const selectedTeamId = watch('team_id');

  // Fetch users eligible for the selected team
  const { data: eligibleUsers, isLoading: isUsersLoading } = useQuery({
    queryKey: ['usersList', selectedTeamId],
    queryFn: () => teamsApi.getUsers(selectedTeamId || undefined),
    enabled: Boolean(selectedTeamId),
  });

  // Populate form in edit mode
  useEffect(() => {
    if (existingTask) {
      reset({
        title: existingTask.title,
        description: existingTask.description,
        type: existingTask.type,
        priority: existingTask.priority,
        team_id: existingTask.team_id,
        assignee_id: existingTask.assignee_id || '',
        due_date: existingTask.due_date ? existingTask.due_date.substring(0, 10) : '',
      });
    } else if (!isEditMode && teams && teams.length > 0 && !selectedTeamId) {
      // Default to user's first team
      setValue('team_id', teams[0].id);
    }
  }, [existingTask, teams, isEditMode, reset, setValue, selectedTeamId]);

  // Create Task Mutation
  const createMutation = useMutation({
    mutationFn: (data: TaskFormData) =>
      tasksApi.createTask(
        {
          title: data.title,
          description: data.description,
          type: data.type,
          priority: data.priority,
          team_id: data.team_id,
          assignee_id: data.assignee_id || null,
          due_date: data.due_date ? new Date(data.due_date).toISOString() : null,
        },
        idempotencyKey
      ),
    onSuccess: (newTask) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      navigate(`/tasks/${newTask.id}`);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to create task.');
    },
  });

  // Edit Task Mutation
  const editMutation = useMutation({
    mutationFn: (data: TaskFormData) => {
      if (!existingTask) throw new Error('Existing task not loaded');
      return tasksApi.updateTask(existingTask.id, {
        version: existingTask.version, // Required for OCC!
        title: data.title,
        description: data.description,
        type: data.type,
        priority: data.priority,
        assignee_id: data.assignee_id === '' ? null : data.assignee_id,
        due_date: data.due_date ? new Date(data.due_date).toISOString() : null,
      });
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['taskActivity', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      navigate(`/tasks/${updated.id}`);
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
        setFormError(err.message || 'Failed to update task.');
      }
    },
  });

  const onSubmit = (data: TaskFormData) => {
    setFormError(null);
    if (isEditMode) {
      editMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  if (isEditMode && isTaskLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/4" />
        <div className="h-96 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        to={isEditMode ? `/tasks/${id}` : '/tasks'}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="w-4 h-4" />
        {isEditMode ? 'Cancel and back to task' : 'Back to Work Items'}
      </Link>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="mb-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {isEditMode ? `Edit Task: ${existingTask?.task_ref}` : 'Create New Work Item'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {isEditMode
                ? 'Update fields with automatic version concurrency checking.'
                : 'Create an operational incident or request for tracking.'}
            </p>
          </div>
          {isEditMode && existingTask && (
            <span className="font-mono text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded">
              v{existingTask.version}
            </span>
          )}
        </div>

        {formError && (
          <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              {...register('title')}
              placeholder="e.g. Warehouse dispatch synchronization failure"
              className={`w-full px-3.5 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${
                errors.title
                  ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/30'
                  : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-rose-600">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Detailed Description
            </label>
            <textarea
              rows={4}
              {...register('description')}
              placeholder="Provide background context, logs, affected services, or reproduction steps..."
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* 2-col Grid: Type & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Work Item Type <span className="text-rose-500">*</span>
              </label>
              <select
                {...register('type')}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="operational_task">Operational Task</option>
                <option value="production_incident">Production Incident</option>
                <option value="engineering_problem">Engineering Problem</option>
                <option value="customer_issue">Customer Issue</option>
                <option value="payment_investigation">Payment Investigation</option>
                <option value="compliance_request">Compliance Request</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Priority Level <span className="text-rose-500">*</span>
              </label>
              <select
                {...register('priority')}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* 2-col Grid: Team & Assignee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Owning Team <span className="text-rose-500">*</span>
              </label>
              <select
                disabled={isEditMode} // Team ownership cannot be arbitrarily changed
                {...register('team_id')}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
              >
                <option value="">Select Team</option>
                {teams?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {errors.team_id && (
                <p className="mt-1 text-xs text-rose-600">{errors.team_id.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Assignee
              </label>
              <select
                {...register('assignee_id')}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Unassigned</option>
                {eligibleUsers?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.email})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-slate-400">
                Filtered to eligible members of the selected team.
              </p>
            </div>
          </div>

          {/* Due date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Target Due Date (Optional)
            </label>
            <input
              type="date"
              {...register('due_date')}
              className="w-full sm:w-1/2 px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(isEditMode ? `/tasks/${id}` : '/tasks')}
              className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || createMutation.isPending || editMutation.isPending}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isEditMode ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>

      {/* OCC Conflict Dialog */}
      <ConflictDialog
        isOpen={conflictData.isOpen}
        currentVersion={conflictData.currentVersion}
        expectedVersion={conflictData.expectedVersion}
        message={conflictData.message}
        onClose={() => setConflictData({ isOpen: false })}
        onReloadLatest={() => {
          setConflictData({ isOpen: false });
          refetchExistingTask();
        }}
      />
    </div>
  );
};
