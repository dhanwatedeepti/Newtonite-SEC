import React from 'react';
import { TaskType } from '../types';
import { AlertTriangle, Wrench, CreditCard, ShieldCheck, CheckSquare, Bug } from 'lucide-react';

interface Props {
  type: TaskType;
  className?: string;
}

export const TaskTypeBadge: React.FC<Props> = ({ type, className = '' }) => {
  switch (type) {
    case 'production_incident':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200 ${className}`}>
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
          Production Incident
        </span>
      );
    case 'engineering_problem':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-800 border border-indigo-200 ${className}`}>
          <Wrench className="w-3.5 h-3.5 text-indigo-600" />
          Engineering Problem
        </span>
      );
    case 'customer_issue':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-cyan-50 text-cyan-800 border border-cyan-200 ${className}`}>
          <Bug className="w-3.5 h-3.5 text-cyan-600" />
          Customer Issue
        </span>
      );
    case 'payment_investigation':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 ${className}`}>
          <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
          Payment Investigation
        </span>
      );
    case 'compliance_request':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-800 border border-purple-200 ${className}`}>
          <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
          Compliance Request
        </span>
      );
    case 'operational_task':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200 ${className}`}>
          <CheckSquare className="w-3.5 h-3.5 text-slate-600" />
          Operational Task
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 ${className}`}>
          {type}
        </span>
      );
  }
};
