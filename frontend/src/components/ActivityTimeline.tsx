import React from 'react';
import { AuditEvent } from '../types';
import { Clock, User, ArrowRight, Activity, CheckCircle, FileEdit, Tag } from 'lucide-react';

interface Props {
  activities: AuditEvent[];
  isLoading?: boolean;
}

export const ActivityTimeline: React.FC<Props> = ({ activities, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="space-y-4 py-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-200 rounded w-1/3" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        <Activity className="w-8 h-8 mx-auto text-slate-300 mb-2" />
        No activity recorded yet for this task.
      </div>
    );
  }

  const formatActionName = (action: string) => {
    switch (action) {
      case 'task_created':
        return 'created this task';
      case 'status_changed':
        return 'changed status';
      case 'priority_changed':
        return 'updated priority';
      case 'assigned':
        return 'assigned task';
      case 'reassigned':
        return 'reassigned task';
      case 'task_closed':
        return 'closed this task';
      case 'task_reopened':
        return 'reopened this task';
      case 'task_updated':
        return 'updated task details';
      default:
        return action.replace(/_/g, ' ');
    }
  };

  const renderChanges = (details: Record<string, any>) => {
    if (!details) return null;

    if (details.changes) {
      return (
        <div className="mt-2 space-y-1.5 text-xs">
          {Object.entries(details.changes).map(([field, delta]: [string, any]) => (
            <div key={field} className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 rounded border border-slate-100">
              <span className="font-medium text-slate-600 capitalize">{field.replace(/_/g, ' ')}:</span>
              <span className="line-through text-slate-400 font-mono">
                {delta.from === null || delta.from === undefined ? '(empty)' : String(delta.from)}
              </span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span className="font-semibold text-slate-800 font-mono">
                {delta.to === null || delta.to === undefined ? '(empty)' : String(delta.to)}
              </span>
            </div>
          ))}
        </div>
      );
    }

    if (details.title && details.type) {
      return (
        <div className="mt-1 text-xs text-slate-500">
          Initial priority: <span className="font-medium text-slate-700 capitalize">{details.priority}</span> • Type:{' '}
          <span className="font-medium text-slate-700 capitalize">{details.type.replace(/_/g, ' ')}</span>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
      {activities.map((item) => (
        <div key={item.id} className="relative group">
          {/* Timeline node */}
          <div className="absolute -left-6 mt-1 w-5 h-5 rounded-full border-2 border-white bg-blue-600 shadow-sm flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-white" />
          </div>

          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold text-slate-900">
                  {item.user?.full_name || 'System / Automated'}
                </span>
                <span className="text-slate-500">{formatActionName(item.action)}</span>
              </div>
              <time className="text-xs text-slate-400 whitespace-nowrap flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3" />
                {new Date(item.created_at).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </time>
            </div>

            {renderChanges(item.details)}
          </div>
        </div>
      ))}
    </div>
  );
};
