import React from 'react';
import { TaskPriority } from '../types';
import { Flame, ArrowUp, ArrowRight, ArrowDown } from 'lucide-react';

interface Props {
  priority: TaskPriority;
  className?: string;
}

export const TaskPriorityBadge: React.FC<Props> = ({ priority, className = '' }) => {
  switch (priority) {
    case 'urgent':
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-300 animate-pulse ${className}`}>
          <Flame className="w-3.5 h-3.5 text-red-600" />
          Urgent
        </span>
      );
    case 'high':
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200 ${className}`}>
          <ArrowUp className="w-3.5 h-3.5" />
          High
        </span>
      );
    case 'medium':
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 ${className}`}>
          <ArrowRight className="w-3.5 h-3.5" />
          Medium
        </span>
      );
    case 'low':
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 ${className}`}>
          <ArrowDown className="w-3.5 h-3.5" />
          Low
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 ${className}`}>
          {priority}
        </span>
      );
  }
};
