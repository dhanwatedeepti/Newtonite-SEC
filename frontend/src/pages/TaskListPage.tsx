import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { tasksApi } from '../api/tasks';
import { teamsApi } from '../api/teams';
import { TaskStatusBadge } from '../components/TaskStatusBadge';
import { TaskPriorityBadge } from '../components/TaskPriorityBadge';
import { TaskTypeBadge } from '../components/TaskTypeBadge';
import {
  Search,
  PlusCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Inbox,
  RefreshCw,
} from 'lucide-react';

export const TaskListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const priority = searchParams.get('priority') || '';
  const teamId = searchParams.get('team_id') || '';
  const assigneeId = searchParams.get('assignee_id') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = 15;

  const [searchInput, setSearchInput] = useState(search);

  // Fetch teams for the filter dropdown
  const { data: teams } = useQuery({
    queryKey: ['teamsList'],
    queryFn: teamsApi.getTeams,
  });

  // Fetch users for assignee filter dropdown
  const { data: users } = useQuery({
    queryKey: ['usersList', teamId],
    queryFn: () => teamsApi.getUsers(teamId || undefined),
  });

  // Fetch paginated tasks from backend
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['tasks', { search, status, priority, teamId, assigneeId, page, pageSize }],
    queryFn: () =>
      tasksApi.getTasks({
        search: search || undefined,
        status: status || undefined,
        priority: priority || undefined,
        team_id: teamId || undefined,
        assignee_id: assigneeId || undefined,
        page,
        page_size: pageSize,
      }),
  });

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    next.set('page', '1'); // reset page on filter change
    setSearchParams(next);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam('search', searchInput);
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  };

  const totalPages = data?.total_pages || 1;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Work Items</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track, assign, prioritize and resolve operational requests and incident tickets.
          </p>
        </div>
        <Link
          to="/tasks/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          Create Task
        </Link>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by title or reference (e.g. OPS-1001)..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors"
          >
            Search
          </button>
        </form>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-100 items-center">
          {/* Status Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => updateParam('status', e.target.value)}
              className="w-full text-xs py-1.5 px-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="blocked">Blocked</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => updateParam('priority', e.target.value)}
              className="w-full text-xs py-1.5 px-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Team Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Team</label>
            <select
              value={teamId}
              onChange={(e) => updateParam('team_id', e.target.value)}
              className="w-full text-xs py-1.5 px-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Teams</option>
              {teams?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Assignee Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Assignee</label>
            <select
              value={assigneeId}
              onChange={(e) => updateParam('assignee_id', e.target.value)}
              className="w-full text-xs py-1.5 px-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Assignees</option>
              <option value="unassigned">Unassigned</option>
              {users?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          <div className="flex items-end">
            {(search || status || priority || teamId || assigneeId) && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs text-rose-600 hover:text-rose-800 font-medium py-2 flex items-center gap-1"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Task Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-slate-100 rounded" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
            <h3 className="text-base font-semibold text-slate-900">Failed to load tasks</h3>
            <p className="text-sm text-slate-500 mt-1">{(error as any)?.message || 'Network error'}</p>
            <button
              onClick={() => refetch()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="py-16 text-center">
            <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No work items found</h3>
            <p className="text-sm text-slate-500 mt-1">
              Try adjusting your search terms or filters to find what you're looking for.
            </p>
            {(search || status || priority || teamId || assigneeId) && (
              <button
                onClick={handleClearFilters}
                className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                Reset filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-6 py-3">
                    Ref
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Title & Type
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Priority
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Team
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Assignee
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Updated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {data.items.map((task) => (
                  <tr
                    key={task.id}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs font-semibold text-blue-700">
                      <Link to={`/tasks/${task.id}`} className="hover:underline">
                        {task.task_ref}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <Link
                          to={`/tasks/${task.id}`}
                          className="font-medium text-slate-900 group-hover:text-blue-600 line-clamp-1"
                        >
                          {task.title}
                        </Link>
                        <TaskTypeBadge type={task.type} />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <TaskPriorityBadge priority={task.priority} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <TaskStatusBadge status={task.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600">
                      {task.team?.name || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600">
                      {task.assignee?.full_name ? (
                        <span className="font-medium text-slate-800">{task.assignee.full_name}</span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400 font-mono">
                      {new Date(task.updated_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {data && data.total > 0 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <div>
              Showing <span className="font-medium">{(page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(page * pageSize, data.total)}
              </span>{' '}
              of <span className="font-medium">{data.total}</span> items
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || isFetching}
                onClick={() => updateParam('page', (page - 1).toString())}
                className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-2 font-mono">
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                disabled={page >= totalPages || isFetching}
                onClick={() => updateParam('page', (page + 1).toString())}
                className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
