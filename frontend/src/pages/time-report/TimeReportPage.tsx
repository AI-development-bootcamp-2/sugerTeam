import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useTimeReportData } from './hooks/useTimeReportData';
import AppHeader from './components/AppHeader';
import MonthPager from './components/MonthPager';
import KpiStrip from './components/KpiStrip';
import DayList from './components/DayList';
import DayCardSkeleton from './components/DayCardSkeleton';
import MonthlySummaryDrawer from './components/MonthlySummaryDrawer';
import LockedMonthBanner from './components/LockedMonthBanner';

// ─── T008 — Month navigation state ───────────────────────────────────────────

function useMonthNavigation() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1–12

  function handlePrevMonth() {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  }

  function handleNextMonth() {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  }

  return { selectedYear, selectedMonth, handlePrevMonth, handleNextMonth };
}

// ─── T010 — Drawer open state ─────────────────────────────────────────────────

function useDrawer() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openDrawer = () => setDrawerOpen(true);
  const closeDrawer = () => setDrawerOpen(false);

  useEffect(() => {
    if (!drawerOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeDrawer();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  return { drawerOpen, openDrawer, closeDrawer };
}

// ─── T014 — Hebrew month label for subtitle ───────────────────────────────────

function getMonthName(month: number, year: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString('he-IL', { month: 'long' });
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function TimeReportPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const { selectedYear, selectedMonth, handlePrevMonth, handleNextMonth } =
    useMonthNavigation();
  const { drawerOpen, openDrawer, closeDrawer } = useDrawer();

  const {
    dayEntries,
    monthlySummary,
    isLocked,
    isLoading,
    isError,
    hasAbsenceError,
    refetch,
  } = useTimeReportData(user?.id ?? '', selectedYear, selectedMonth);

  // T034 — dismissible absence-error banner; resets whenever a new absence error appears.
  const [absenceBannerDismissed, setAbsenceBannerDismissed] = useState(false);
  const dismissAbsenceBanner = useCallback(() => setAbsenceBannerDismissed(true), []);
  useEffect(() => {
    if (hasAbsenceError) setAbsenceBannerDismissed(false);
  }, [hasAbsenceError]);

  function handleLogout() {
    clearAuth();
    void navigate('/login');
  }

  return (
    <>
      <AppHeader onLogout={handleLogout} />

      <main
        dir="rtl"
        style={{
          background: '#F2F2F7',
          minHeight: '100vh',
          paddingTop: 80, // clear fixed header
        }}
      >
        {isError ? (
          /* ── T033 error state (Phase 8) ──────────────────────────────────── */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              padding: '80px 24px',
              textAlign: 'center',
            }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#848891"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p style={{ fontSize: 18, color: '#53575B', margin: 0 }}>
              לא ניתן לטעון את הדיווחים. אנא נסה שוב.
            </p>
            <button
              type="button"
              onClick={refetch}
              style={{
                height: 44,
                padding: '0 24px',
                borderRadius: 1000,
                border: '1px solid #E1E7F3',
                background: 'transparent',
                fontSize: 16,
                fontWeight: 600,
                color: '#212525',
                cursor: 'pointer',
              }}
            >
              נסה שוב
            </button>
          </div>
        ) : (
          /* ── Normal page grid ────────────────────────────────────────────── */
          <div
            style={{
              maxWidth: 1120,
              margin: '0 auto',
              padding: '32px 16px 80px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <LockedMonthBanner isLocked={isLocked} />

            {/* T034 — Partial failure: absence data degradation banner */}
            {hasAbsenceError && !absenceBannerDismissed && (
              <div
                style={{
                  background: '#FFF6DB',
                  borderRadius: 8,
                  padding: '10px 16px',
                  display: 'flex',
                  flexDirection: 'row-reverse',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 14,
                  color: '#B8860B',
                }}
              >
                <span>חלק מהנתונים לא נטענו — מידע על היעדרויות אינו זמין</span>
                <button
                  type="button"
                  onClick={dismissAbsenceBanner}
                  aria-label="סגור"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 16,
                    color: '#B8860B',
                    lineHeight: 1,
                    padding: '0 4px',
                  }}
                >
                  ×
                </button>
              </div>
            )}

            {/* T014 — Title row */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'row-reverse',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <MonthPager
                month={selectedMonth}
                year={selectedYear}
                onPrev={handlePrevMonth}
                onNext={handleNextMonth}
                disabled={isLoading}
              />
              <div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: 24,
                    fontWeight: 700,
                    color: '#212525',
                  }}
                >
                  דיווח שעות
                </h1>
                <p
                  style={{
                    margin: '4px 0 0',
                    fontSize: 16,
                    fontWeight: 500,
                    color: '#848891',
                  }}
                >
                  רשימת הדיווחים החודשיים — לחודש{' '}
                  {getMonthName(selectedMonth, selectedYear)} {selectedYear}
                </p>
              </div>
            </div>

            {/* KPI strip */}
            <KpiStrip
              reportedMinutes={monthlySummary.reportedMinutes}
              standardMinutes={monthlySummary.standardMinutes}
              completionPct={monthlySummary.completionPct}
              isLoading={isLoading}
              onOpen={openDrawer}
            />

            {/* T031 — Day list or skeleton while loading */}
            {isLoading ? (
              <DayCardSkeleton />
            ) : (
              <DayList dayEntries={dayEntries} isLocked={isLocked} />
            )}
          </div>
        )}
      </main>

      {/* Monthly summary drawer */}
      <MonthlySummaryDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        month={selectedMonth}
        year={selectedYear}
        summary={monthlySummary}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
      />
    </>
  );
}
