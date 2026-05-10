export enum UserRole {
  EMPLOYEE = 'EMPLOYEE',
  TEAM_LEAD = 'TEAM_LEAD',
  ADMIN = 'ADMIN',
}

export interface User {
  id: string;
  fullName: string;
  role: UserRole;
}
