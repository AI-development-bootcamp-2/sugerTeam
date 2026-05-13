import type { UserRole } from '../../../types/entities';

export const ROLE_LABELS: Record<UserRole, string> = {
  EMPLOYEE: 'עובד',
  TEAM_LEAD: 'ראש צוות',
  ADMIN: 'מנהל',
};

export const ALL_ROLES: UserRole[] = ['EMPLOYEE', 'TEAM_LEAD', 'ADMIN'];
