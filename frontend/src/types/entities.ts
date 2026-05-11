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
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Project {
  id: string;
  clientId: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
