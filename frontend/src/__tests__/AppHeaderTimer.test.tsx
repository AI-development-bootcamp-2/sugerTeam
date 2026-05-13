import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppHeader from '../pages/time-report/components/AppHeader';
import type { TimerState } from '../types/time-report';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const idle: TimerState = {
  isRunning:      false,
  timerId:        null,
  startedAt:      null,
  elapsedSeconds: 0,
};

const running: TimerState = {
  isRunning:      true,
  timerId:        'timer-1',
  startedAt:      new Date('2026-05-13T08:00:00.000Z'),
  elapsedSeconds: 150, // → "02:30"
};

const longRunning: TimerState = {
  ...running,
  elapsedSeconds: 30_000, // → "8:20:00", > 28_800 threshold
};

const onTimerClick = vi.fn();
const baseProps = {
  onLogout:     vi.fn(),
  onAddDay:     vi.fn(),
  onTimerClick,
};

beforeEach(() => { vi.clearAllMocks(); });

// ─── Idle state ───────────────────────────────────────────────────────────────

describe('idle state', () => {
  it('renders "הפעלת שעון" label', () => {
    render(<AppHeader {...baseProps} timerState={idle} />);
    expect(screen.getByText('הפעלת שעון')).toBeInTheDocument();
  });

  it('button has pink background (#EA7693)', () => {
    render(<AppHeader {...baseProps} timerState={idle} />);
    const btn = screen.getByRole('button', { name: 'הפעלת שעון' });
    expect(btn).toHaveStyle({ background: '#EA7693' });
  });

  it('does not render a stop icon (no <rect> inside button)', () => {
    render(<AppHeader {...baseProps} timerState={idle} />);
    const btn = screen.getByRole('button', { name: 'הפעלת שעון' });
    expect(btn.querySelector('rect')).toBeNull();
  });
});

// ─── Running state (elapsedSeconds = 150) ─────────────────────────────────────

describe('running state (elapsedSeconds = 150)', () => {
  it('renders "02:30" elapsed label', () => {
    render(<AppHeader {...baseProps} timerState={running} />);
    expect(screen.getByText('02:30')).toBeInTheDocument();
  });

  it('button has red background (#E7000B)', () => {
    render(<AppHeader {...baseProps} timerState={running} />);
    const btn = screen.getByRole('button', { name: '02:30' });
    expect(btn).toHaveStyle({ background: '#E7000B' });
  });

  it('renders a stop icon (<rect> inside button)', () => {
    render(<AppHeader {...baseProps} timerState={running} />);
    const btn = screen.getByRole('button', { name: '02:30' });
    expect(btn.querySelector('rect')).not.toBeNull();
  });
});

// ─── Long-running state (elapsedSeconds = 30_000) ─────────────────────────────

describe('long-running state (elapsedSeconds = 30_000)', () => {
  it('warning badge "!" is present in the DOM', () => {
    render(<AppHeader {...baseProps} timerState={longRunning} />);
    expect(screen.getByText('!')).toBeInTheDocument();
  });

  it('button title contains the warning text', () => {
    render(<AppHeader {...baseProps} timerState={longRunning} />);
    const btn = screen.getByRole('button', { name: '8:20:00' });
    expect(btn.title).toBe('השעון פועל מעל 8 שעות — שכחת לעצור?');
  });
});

// ─── Loading state ────────────────────────────────────────────────────────────

describe('loading state (isTimerLoading = true)', () => {
  it('button has disabled attribute', () => {
    render(<AppHeader {...baseProps} timerState={idle} isTimerLoading />);
    expect(screen.getByRole('button', { name: 'הפעלת שעון' })).toBeDisabled();
  });
});

// ─── Click behaviour ──────────────────────────────────────────────────────────

describe('click behaviour', () => {
  it('clicking idle button calls onTimerClick', async () => {
    render(<AppHeader {...baseProps} timerState={idle} />);
    await userEvent.click(screen.getByRole('button', { name: 'הפעלת שעון' }));
    expect(onTimerClick).toHaveBeenCalledOnce();
  });

  it('clicking running button calls onTimerClick', async () => {
    render(<AppHeader {...baseProps} timerState={running} />);
    await userEvent.click(screen.getByRole('button', { name: '02:30' }));
    expect(onTimerClick).toHaveBeenCalledOnce();
  });

  it('clicking while loading does NOT call onTimerClick (button disabled)', async () => {
    render(<AppHeader {...baseProps} timerState={idle} isTimerLoading />);
    await userEvent.click(screen.getByRole('button', { name: 'הפעלת שעון' }));
    expect(onTimerClick).not.toHaveBeenCalled();
  });
});
