import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { AbsenceFormPage } from '../pages/absences/AbsenceFormPage';

vi.mock('../services/api', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../store/authStore', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({ user: { id: 'user-1', fullName: 'בדיקה', role: 'EMPLOYEE' }, accessToken: 't' }),
}));

function wrap(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AbsenceFormPage — inline form', () => {
  it('renders start and end date fields inline', () => {
    wrap(<AbsenceFormPage />);
    expect(screen.getByText('תאריך התחלה')).toBeInTheDocument();
    expect(screen.getByText('תאריך סיום')).toBeInTheDocument();
  });

  it('renders the day count summary inline', () => {
    wrap(<AbsenceFormPage />);
    expect(screen.getByText('סה״כ ימי היעדרות')).toBeInTheDocument();
  });

  it('renders the partial absence checkbox inline', () => {
    wrap(<AbsenceFormPage />);
    expect(screen.getByText('היעדרות חלקית')).toBeInTheDocument();
  });

  it('shows partial hours field when partial absence checkbox is checked', () => {
    wrap(<AbsenceFormPage />);
    expect(screen.queryByText('שעות היעדרות')).not.toBeInTheDocument();
    const checkbox = screen.getByRole('checkbox', { name: 'היעדרות חלקית' });
    fireEvent.click(checkbox);
    expect(screen.getByText('שעות היעדרות')).toBeInTheDocument();
  });

  it('does not render the legacy multi-day trigger or panel', () => {
    wrap(<AbsenceFormPage />);
    expect(
      screen.queryByRole('button', { name: 'לדווח על העדרות יותר מיום אחד' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('dialog', { name: 'דיווח על מספר ימים' }),
    ).not.toBeInTheDocument();
  });
});
