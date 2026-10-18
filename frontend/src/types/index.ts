export type GlobalRole = 'admin' | 'user';
export type TeamRole = 'team_lead' | 'member';

export type TaskType =
  | 'customer_issue'
  | 'engineering_problem'
  | 'payment_investigation'
  | 'production_incident'
  | 'compliance_request'
  | 'operational_task';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskStatus = 'open' | 'in_progress' | 'blocked' | 'resolved' | 'closed';

export interface UserSimple {
  id: string;
  email: string;
  full_name: string;
  global_role: GlobalRole;
}

export interface TeamMembershipSimple {
  team_id: string;
  team_name: string;
  role: TeamRole;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  global_role: GlobalRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  teams: TeamMembershipSimple[];
}

export interface TeamMember {
  user_id: string;
  email: string;
  full_name: string;
  role: TeamRole;
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  members: TeamMember[];
}

export interface TeamSimple {
  id: string;
  name: string;
  description: string | null;
}

export interface Task {
  id: string;
  task_ref: string;
  title: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  team_id: string;
  created_by_id: string;
  assignee_id: string | null;
  due_date: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  team?: TeamSimple;
  creator?: UserSimple;
  assignee?: UserSimple | null;
}

export interface TaskListResponse {
  items: Task[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AuditEvent {
  id: string;
  task_id: string;
  user_id: string | null;
  action: string;
  details: Record<string, any>;
  created_at: string;
  user?: UserSimple | null;
}

export interface DashboardMetrics {
  total_active_tasks: number;
  open_tasks: number;
  in_progress_tasks: number;
  blocked_tasks: number;
  urgent_tasks: number;
  overdue_tasks: number;
  urgent_work: Task[];
  recently_updated: Task[];
  recent_activity: AuditEvent[];
}

export interface ApiError {
  error?: string;
  message?: string;
  detail?: string | Record<string, any>;
  current_version?: number;
  expected_version?: number;
  allowed_statuses?: string[];
}
