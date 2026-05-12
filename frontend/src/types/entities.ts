export type UserRole = 'EMPLOYEE' | 'TEAM_LEAD' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'INACTIVE';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  passwordChangedAt: string;
  deletedAt: string | null;
}

export interface Client {
  id: string;
  name: string;
  description: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Project {
  id: string;
  clientId: string;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  primaryManagerId: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Manager {
  id: string;
  fullName: string;
  role: string;
}

export interface ProjectWithRelations extends Project {
  primaryManager: Manager | null;
}

export interface Task {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  deletedAt: string | null;
}

export type TaskWithRelations = Task;
