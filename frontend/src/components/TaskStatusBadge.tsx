import React from 'react';
import { TaskStatus } from '../types';
import { Clock, PlayCircle, AlertOctagon, CheckCircle2, Archive } from 'lucide-react';

interface Props {
  status: TaskStatus;
  className?: string;
}

export const TaskStatusBadge: React.FC<Props> = ({ status, className = '' }) => {
  switch (status) {
    case 'open':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 ${className}`}>
          <Clock className="w-3.5 h-3.5" />
          Open
        </span>
      );
    case 'in_progress':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 ${className}`}>
          <PlayCircle className="w-3.5 h-3.5" />
          In Progress
        </span>
      );
    case 'blocked':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 ${className}`}>
          <AlertOctagon className="w-3.5 h-3.5" />
          Blocked
        </span>
      );
    case 'resolved':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          Resolved
        </span>
      );
    case 'closed':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 ${className}`}>
          <Archive className="w-3.5 h-3.5" />
          Closed
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 ${className}`}>
          {status}
        </span>
      );
  }
};
