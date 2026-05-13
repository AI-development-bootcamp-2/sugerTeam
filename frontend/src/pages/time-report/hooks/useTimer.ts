import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ActiveTimerDto, StoppedTimerDto, TimerState } from '../../../types/time-report';
import {
  getActiveTimer,
  startTimer as apiStartTimer,
  stopTimer as apiStopTimer,
} from '../../../services/timerApi';

// ─── T006 — useActiveTimer ────────────────────────────────────────────────────

export function useActiveTimer(): UseQueryResult<ActiveTimerDto | null> {
  return useQuery({
    queryKey: ['timer', 'active'],
    queryFn: getActiveTimer,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

// ─── T007 — useStartTimer / useStopTimer ──────────────────────────────────────

export function useStartTimer() {
  const queryClient = useQueryClient();
  return useMutation<ActiveTimerDto, Error>({
    mutationFn: apiStartTimer,
    onSuccess: (data) => {
      queryClient.setQueryData(['timer', 'active'], data);
    },
  });
}

export function useStopTimer() {
  const queryClient = useQueryClient();
  return useMutation<StoppedTimerDto, Error>({
    mutationFn: apiStopTimer,
    onSuccess: () => {
      queryClient.setQueryData(['timer', 'active'], null);
    },
  });
}

// ─── T008 — useTimer composite ────────────────────────────────────────────────

export function useTimer(): {
  timerState: TimerState;
  startTimer: () => Promise<void>;
  stopTimer: () => Promise<StoppedTimerDto>;
  startError: Error | null;
  stopError: Error | null;
  isStarting: boolean;
  isStopping: boolean;
} {
  const { data: activeTimer } = useActiveTimer();
  const startMutation = useStartTimer();
  const stopMutation = useStopTimer();

  // tickAt is updated only inside the interval callback — no synchronous setState in effect body
  const [tickAt, setTickAt] = useState(() => Date.now());

  useEffect(() => {
    if (!activeTimer) return;
    const interval = setInterval(() => {
      setTickAt(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  const elapsedSeconds = useMemo(
    () =>
      activeTimer
        ? Math.max(0, Math.floor((tickAt - new Date(activeTimer.startedAt).getTime()) / 1000))
        : 0,
    [activeTimer, tickAt],
  );

  const timerState: TimerState = {
    isRunning: activeTimer != null,
    timerId: activeTimer?.timerId ?? null,
    startedAt: activeTimer ? new Date(activeTimer.startedAt) : null,
    elapsedSeconds,
  };

  return {
    timerState,
    startTimer: async () => { await startMutation.mutateAsync(); },
    stopTimer: () => stopMutation.mutateAsync(),
    startError: startMutation.error,
    stopError: stopMutation.error,
    isStarting: startMutation.isPending,
    isStopping: stopMutation.isPending,
  };
}
