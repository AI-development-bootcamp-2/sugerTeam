import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DailyReportDrawer from '../pages/time-report/components/DailyReportDrawer';
import { useUpsertDayReport, useDropdownData } from '../pages/time-report/hooks/useTimeEntries';
import { DailyReportStatus, CalendarDayType } from '../types/time-report';
import type { DayDto } from '../types/timeEntries';

// ─── Mock hooks ───────────────────────────────────────────────────────────────

vi.mock('../pages/time-report/hooks/useTimeEntries', () => ({
  useUpsertDayReport: vi.fn(),
  useDropdownData:    vi.fn(),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CLIENT_ID  = 'c0000001-0000-4000-8000-000000000001';
const PROJECT_ID = 'b0000002-0000-4000-8000-000000000001';
const TASK_ID    = 'd0000003-0000-4000-8000-000000000001';

const mockDropdownData = {
  clients: [{
    id:   CLIENT_ID,
    name: 'Acme Corp',
    projects: [{
      id:   PROJECT_ID,
      name: 'אתר אינטרנט',
      tasks: [{ id: TASK_ID, name: 'עיצוב UI' }],
    }],
  }],
};

const mockMutateAsync = vi.fn();

function setupMocks(opts: { isError?: boolean; errorStatus?: number } = {}) {
  vi.mocked(useUpsertDayReport).mockReturnValue({
    mutateAsync: mockMutateAsync,
    isError:     opts.isError ?? false,
    error:       opts.isError
      ? { response: { status: opts.errorStatus ?? 500 } } as never
      : null,
    isPending:   false,
  } as ReturnType<typeof useUpsertDayReport>);

  vi.mocked(useDropdownData).mockReturnValue({
    data: mockDropdownData,
  } as ReturnType<typeof useDropdownData>);
}

const defaultProps = {
  date:           '2026-01-05',
  isOpen:         true,
  onClose:        vi.fn(),
  existingReport: null,
  isMonthLocked:  false,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  setupMocks();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getEntrySelect(container: HTMLElement, fieldSuffix: string) {
  return container.querySelector(
    `[name="entries.0.${fieldSuffix}"]`,
  ) as HTMLSelectElement;
}

// ─── Read-only mode ───────────────────────────────────────────────────────────

describe('read-only mode', () => {
  it('allows editing when status is SUBMITTED', () => {
    const submittedReport: DayDto = {
      reportDate:    '2026-01-05',
      dayType:       CalendarDayType.REGULAR,
      isWorkingDay:  true,
      dailyReportId: 'r1',
      status:        DailyReportStatus.SUBMITTED,
      startTime:     '08:00',
      endTime:       '17:00',
      entries:       [],
    };

    render(<DailyReportDrawer {...defaultProps} existingReport={submittedReport} />);

    expect(screen.queryByText(/הדוח הוגש/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'שמור טיוטה' })).toBeInTheDocument();
    expect(screen.getByText('+ הוסף רשומה')).toBeInTheDocument();
  });

  it('shows the locked-month banner and hides action buttons when isMonthLocked is true', () => {
    render(<DailyReportDrawer {...defaultProps} isMonthLocked={true} />);

    expect(screen.getByText(/חודש זה נעול/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'שמור טיוטה' })).not.toBeInTheDocument();
  });
});

// ─── Entry management ─────────────────────────────────────────────────────────

describe('entry management', () => {
  it('renders one entry block by default (no delete button shown)', () => {
    render(<DailyReportDrawer {...defaultProps} />);
    expect(screen.queryByRole('button', { name: 'מחק רשומה' })).not.toBeInTheDocument();
  });

  it('clicking "+ הוסף רשומה" adds a second entry block and shows delete buttons', async () => {
    render(<DailyReportDrawer {...defaultProps} />);

    const addButton = screen.getByText('+ הוסף רשומה');
    await userEvent.click(addButton);

    const deleteButtons = screen.getAllByRole('button', { name: 'מחק רשומה' });
    expect(deleteButtons).toHaveLength(2);
  });

  it('clicking delete removes an entry and hides delete buttons when only one remains', async () => {
    render(<DailyReportDrawer {...defaultProps} />);

    // Add a second entry
    await userEvent.click(screen.getByText('+ הוסף רשומה'));
    const deleteButtons = screen.getAllByRole('button', { name: 'מחק רשומה' });
    expect(deleteButtons).toHaveLength(2);

    // Remove first entry
    await userEvent.click(deleteButtons[0]);
    expect(screen.queryByRole('button', { name: 'מחק רשומה' })).not.toBeInTheDocument();
  });
});

// ─── Cascading dropdowns ──────────────────────────────────────────────────────

describe('cascading client → project → task dropdowns', () => {
  it('selecting a client enables and populates the project dropdown', async () => {
    const { container } = render(<DailyReportDrawer {...defaultProps} />);

    const clientSelect  = getEntrySelect(container, 'clientId');
    const projectSelect = getEntrySelect(container, 'projectId');

    expect(projectSelect).toBeDisabled();

    await userEvent.selectOptions(clientSelect, CLIENT_ID);

    expect(projectSelect).not.toBeDisabled();
    expect(screen.getByRole('option', { name: 'אתר אינטרנט' })).toBeInTheDocument();
  });

  it('changing the client resets the project and task selections to empty', async () => {
    const { container } = render(<DailyReportDrawer {...defaultProps} />);

    const clientSelect  = getEntrySelect(container, 'clientId');
    const projectSelect = getEntrySelect(container, 'projectId');
    const taskSelect    = getEntrySelect(container, 'taskId');

    await userEvent.selectOptions(clientSelect, CLIENT_ID);
    await userEvent.selectOptions(projectSelect, PROJECT_ID);
    await userEvent.selectOptions(taskSelect, TASK_ID);

    expect(taskSelect).toHaveValue(TASK_ID);

    // Reset client → project and task should clear
    fireEvent.change(clientSelect, { target: { value: '' } });

    expect(projectSelect).toHaveValue('');
    expect(taskSelect).toHaveValue('');
  });
});

// ─── Submission confirmation dialog ──────────────────────────────────────────

describe('submission confirmation dialog', () => {
  it('clicking הגש opens the confirmation dialog', async () => {
    render(<DailyReportDrawer {...defaultProps} />);

    const submitButton = screen.getByRole('button', { name: 'הגש' });
    await userEvent.click(submitButton);

    expect(screen.getByText('הגשת דוח יומי')).toBeInTheDocument();
    expect(screen.getByText(/לאחר ההגשה לא ניתן יהיה לערוך/)).toBeInTheDocument();
  });

  it('clicking בטל in the dialog dismisses it without calling the API', async () => {
    render(<DailyReportDrawer {...defaultProps} />);

    await userEvent.click(screen.getByRole('button', { name: 'הגש' }));
    expect(screen.getByText('הגשת דוח יומי')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'בטל' }));
    expect(screen.queryByText('הגשת דוח יומי')).not.toBeInTheDocument();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });
});

// ─── Validation ───────────────────────────────────────────────────────────────

describe('form validation', () => {
  it('does not call upsertDayReport when required dropdowns are empty', async () => {
    render(<DailyReportDrawer {...defaultProps} />);

    // Click save draft without selecting client / project / task
    await userEvent.click(screen.getByRole('button', { name: 'שמור טיוטה' }));

    await waitFor(() => {
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });
  });

  it('shows validation errors for empty required entry fields', async () => {
    render(<DailyReportDrawer {...defaultProps} />);

    await userEvent.click(screen.getByRole('button', { name: 'שמור טיוטה' }));

    await waitFor(() => {
      // clientId error: "בחר לקוח" appears as both option placeholder and error p
      const instances = screen.getAllByText('בחר לקוח');
      expect(instances.length).toBeGreaterThanOrEqual(2);
    });
  });
});

// ─── Successful submission ────────────────────────────────────────────────────

describe('successful form submission', () => {
  it('calls upsertDayReport with DRAFT status and correct payload when saving a draft', async () => {
    mockMutateAsync.mockResolvedValue({});

    const { container } = render(<DailyReportDrawer {...defaultProps} />);

    // Fill in entry fields
    await userEvent.selectOptions(getEntrySelect(container, 'clientId'), CLIENT_ID);
    await userEvent.selectOptions(getEntrySelect(container, 'projectId'), PROJECT_ID);
    await userEvent.selectOptions(getEntrySelect(container, 'taskId'), TASK_ID);

    await userEvent.click(screen.getByRole('button', { name: 'שמור טיוטה' }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          reportDate: '2026-01-05',
          status:     DailyReportStatus.DRAFT,
          entries:    expect.arrayContaining([
            expect.objectContaining({
              clientId:  CLIENT_ID,
              projectId: PROJECT_ID,
              taskId:    TASK_ID,
            }),
          ]),
        }),
      );
    });
  });

  it('calls upsertDayReport with SUBMITTED status after confirming the dialog', async () => {
    mockMutateAsync.mockResolvedValue({});

    const { container } = render(<DailyReportDrawer {...defaultProps} />);

    await userEvent.selectOptions(getEntrySelect(container, 'clientId'), CLIENT_ID);
    await userEvent.selectOptions(getEntrySelect(container, 'projectId'), PROJECT_ID);
    await userEvent.selectOptions(getEntrySelect(container, 'taskId'), TASK_ID);

    // Open dialog and confirm
    await userEvent.click(screen.getByRole('button', { name: 'הגש' }));
    // There are now 2 "הגש" buttons: header + dialog. Click the dialog one.
    const submitButtons = screen.getAllByRole('button', { name: 'הגש' });
    await userEvent.click(submitButtons[submitButtons.length - 1]);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          status: DailyReportStatus.SUBMITTED,
        }),
      );
    });
  });
});

// ─── Error banner ─────────────────────────────────────────────────────────────

describe('mutation error banner', () => {
  it('shows a locked-month error message on 423', () => {
    setupMocks({ isError: true, errorStatus: 423 });
    render(<DailyReportDrawer {...defaultProps} />);

    expect(screen.getByText('חודש זה נעול. לא ניתן לשמור דוחות.')).toBeInTheDocument();
  });

  it('shows a conflict error message on 409', () => {
    setupMocks({ isError: true, errorStatus: 409 });
    render(<DailyReportDrawer {...defaultProps} />);

    expect(screen.getByText('הדוח כבר הוגש. פנה לאחראי לעריכה.')).toBeInTheDocument();
  });

  it('shows the generic error message for other errors', () => {
    setupMocks({ isError: true, errorStatus: 500 });
    render(<DailyReportDrawer {...defaultProps} />);

    expect(screen.getByText('שגיאה בשמירת הדוח. נסה שנית.')).toBeInTheDocument();
  });
});

// ─── Populates existing DRAFT report ─────────────────────────────────────────

describe('pre-population from existing DRAFT report', () => {
  it('fills in day start/end times from an existing DRAFT report', () => {
    const draftReport: DayDto = {
      reportDate:    '2026-01-05',
      dayType:       CalendarDayType.REGULAR,
      isWorkingDay:  true,
      dailyReportId: 'r1',
      status:        DailyReportStatus.DRAFT,
      startTime:     '09:00',
      endTime:       '18:00',
      entries:       [],
    };

    render(<DailyReportDrawer {...defaultProps} existingReport={draftReport} />);

    const startInput = screen.getByDisplayValue('09:00');
    const endInput   = screen.getByDisplayValue('18:00');
    expect(startInput).toBeInTheDocument();
    expect(endInput).toBeInTheDocument();
  });
});
