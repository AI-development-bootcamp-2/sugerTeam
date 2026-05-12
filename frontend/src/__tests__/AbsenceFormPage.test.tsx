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

describe('AbsenceFormPage — multi-day panel', () => {
  it('renders the trigger button on the main page', () => {
    wrap(<AbsenceFormPage />);
    expect(
      screen.getByRole('button', { name: 'לדווח על העדרות יותר מיום אחד' }),
    ).toBeInTheDocument();
  });

  it('panel is hidden (translate-x-full) before clicking', () => {
    wrap(<AbsenceFormPage />);
    const dialog = screen.getByRole('dialog', { name: 'דיווח על מספר ימים' });
    expect(dialog.className).toContain('translate-x-full');
    expect(dialog.className).not.toContain('translate-x-0');
  });

  it('clicking the trigger opens the panel (translate-x-0)', () => {
    wrap(<AbsenceFormPage />);
    const trigger = screen.getByRole('button', { name: 'לדווח על העדרות יותר מיום אחד' });
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'דיווח על מספר ימים' });
    expect(dialog.className).toContain('translate-x-0');
    expect(dialog.className).not.toContain('translate-x-full');
  });

  it('open panel exposes all multi-day fields', () => {
    wrap(<AbsenceFormPage />);
    fireEvent.click(
      screen.getByRole('button', { name: 'לדווח על העדרות יותר מיום אחד' }),
    );
    expect(screen.getByText('תאריך התחלה')).toBeInTheDocument();
    expect(screen.getByText('תאריך סיום')).toBeInTheDocument();
    expect(screen.getByText('היעדרות חלקית')).toBeInTheDocument();
    expect(screen.getByText('סה״כ ימי היעדרות')).toBeInTheDocument();
    const saveButtons = screen.getAllByRole('button', { name: /^שמירה/ });
    expect(saveButtons.length).toBeGreaterThanOrEqual(2);
  });

  it('clicking the panel close button closes it', () => {
    wrap(<AbsenceFormPage />);
    fireEvent.click(
      screen.getByRole('button', { name: 'לדווח על העדרות יותר מיום אחד' }),
    );
    const dialog = screen.getByRole('dialog', { name: 'דיווח על מספר ימים' });
    const closeBtn = dialog.querySelector('button[aria-label="סגירה"]') as HTMLButtonElement;
    fireEvent.click(closeBtn);
    expect(dialog.className).toContain('translate-x-full');
  });
});
