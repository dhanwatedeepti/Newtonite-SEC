import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onReloadLatest: () => void;
  currentVersion?: number;
  expectedVersion?: number;
  message?: string;
}

export const ConflictDialog: React.FC<Props> = ({
  isOpen,
  onClose,
  onReloadLatest,
  currentVersion,
  expectedVersion,
  message,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-amber-200 overflow-hidden transform animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-100 rounded-full text-amber-600 flex-shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-900">
                Concurrent Update Detected (409 Conflict)
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                {message ||
                  'Another team member has modified this work item while you were viewing it. Your changes cannot be saved over the newer version.'}
              </p>

              {(expectedVersion !== undefined || currentVersion !== undefined) && (
                <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs font-mono text-slate-700 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Your loaded version:</span>
                    <span className="font-semibold text-amber-700">v{expectedVersion}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Current server version:</span>
                    <span className="font-semibold text-blue-700">v{currentVersion}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onReloadLatest}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Latest Version
          </button>
        </div>
      </div>
    </div>
  );
};
