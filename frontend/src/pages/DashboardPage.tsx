import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../api/dashboard';
import { TaskStatusBadge } from '../components/TaskStatusBadge';
import { TaskPriorityBadge } from '../components/TaskPriorityBadge';
import { TaskTypeBadge } from '../components/TaskTypeBadge';
import { ActivityTimeline } from '../components/ActivityTimeline';
import {
  Layers,
  Clock,
  PlayCircle,
  AlertOctagon,
  Flame,
  CalendarX,
  ArrowRight,
  PlusCircle,
  Activity,
  AlertCircle,
  CheckSquare,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { data: metrics, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboardMetrics'],
    queryFn: dashboardApi.getMetrics,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/4" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 bg-slate-200 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-64 bg-slate-200 rounded-xl" />
          <div className="h-64 bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-center">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <h3 className="text-base font-semibold text-rose-800">Failed to load dashboard metrics</h3>
        <p className="text-sm text-rose-600 mt-1">{(error as any)?.message || 'Network error occurred'}</p>
        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-rose-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Active Tasks',
      value: metrics?.total_active_tasks ?? 0,
      icon: Layers,
      color: 'text-blue-600 bg-blue-50 border-blue-100',
    },
    {
      title: 'Open Tasks',
      value: metrics?.open_tasks ?? 0,
      icon: Clock,
      color: 'text-sky-600 bg-sky-50 border-sky-100',
    },
    {
      title: 'In Progress',
      value: metrics?.in_progress_tasks ?? 0,
      icon: PlayCircle,
      color: 'text-amber-600 bg-amber-50 border-amber-100',
    },
    {
      title: 'Blocked',
      value: metrics?.blocked_tasks ?? 0,
      icon: AlertOctagon,
      color: 'text-rose-600 bg-rose-50 border-rose-100',
    },
    {
      title: 'Urgent',
      value: metrics?.urgent_tasks ?? 0,
      icon: Flame,
      color: 'text-red-600 bg-red-50 border-red-100',
    },
    {
      title: 'Overdue',
      value: metrics?.overdue_tasks ?? 0,
      icon: CalendarX,
      color: 'text-purple-600 bg-purple-50 border-purple-100',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Operations Overview</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time status of active work items and operational incidents.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/tasks/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Create Work Item
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {card.title}
                </span>
                <div className={`p-1.5 rounded-lg border ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-bold text-slate-900 tracking-tight">
                {card.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Two columns: Urgent Work & Recently Updated Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Urgent Work Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-red-500" />
              <h2 className="text-base font-semibold text-slate-900">Urgent Attention Required</h2>
            </div>
            <Link
              to="/tasks?priority=urgent"
              className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 flex-1">
            {metrics?.urgent_work && metrics.urgent_work.length > 0 ? (
              metrics.urgent_work.map((task) => (
                <Link
                  key={task.id}
                  to={`/tasks/${task.id}`}
                  className="p-4 hover:bg-slate-50 block transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          {task.task_ref}
                        </span>
                        <TaskTypeBadge type={task.type} />
                      </div>
                      <h4 className="text-sm font-medium text-slate-900 line-clamp-1">{task.title}</h4>
                      <p className="text-xs text-slate-500">
                        Team: {task.team?.name || 'Unassigned Team'} • Assignee:{' '}
                        {task.assignee?.full_name || 'Unassigned'}
                      </p>
                    </div>
                    <TaskStatusBadge status={task.status} />
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-12 text-slate-500 text-sm">
                <CheckSquare className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
                No urgent tasks pending. Operations running smoothly!
              </div>
            )}
          </div>
        </div>

        {/* Recently Updated Work */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              <h2 className="text-base font-semibold text-slate-900">Recently Updated Tasks</h2>
            </div>
            <Link
              to="/tasks"
              className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 flex-1">
            {metrics?.recently_updated && metrics.recently_updated.length > 0 ? (
              metrics.recently_updated.map((task) => (
                <Link
                  key={task.id}
                  to={`/tasks/${task.id}`}
                  className="p-4 hover:bg-slate-50 block transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {task.task_ref}
                        </span>
                        <TaskPriorityBadge priority={task.priority} />
                      </div>
                      <h4 className="text-sm font-medium text-slate-900 line-clamp-1">{task.title}</h4>
                      <p className="text-xs text-slate-400 font-mono">
                        Updated {new Date(task.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <TaskStatusBadge status={task.status} />
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-12 text-slate-500 text-sm">
                No recent activity recorded.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Global Activity Timeline Stream */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="w-5 h-5 text-slate-700" />
          <h2 className="text-base font-semibold text-slate-900">Recent Operational Activity</h2>
        </div>
        <ActivityTimeline activities={metrics?.recent_activity || []} />
      </div>
    </div>
  );
};
