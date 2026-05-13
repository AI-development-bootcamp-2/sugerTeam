interface MonthPagerProps {
  month: number;   // 1–12
  year: number;
  onPrev: () => void;
  onNext: () => void;
  disabled?: boolean;
}

function ChevronIcon({ direction }: { direction: 'right' | 'left' }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {direction === 'right' ? (
        <polyline points="9 18 15 12 9 6" />
      ) : (
        <polyline points="15 18 9 12 15 6" />
      )}
    </svg>
  );
}

function getMonthLabel(month: number, year: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString('he-IL', { month: 'long' });
}

export default function MonthPager({
  month,
  year,
  onPrev,
  onNext,
  disabled = false,
}: MonthPagerProps) {
  const chevronStyle: React.CSSProperties = {
    width: 24,
    height: 24,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    borderRadius: 4,
    cursor: disabled ? 'default' : 'pointer',
    color: disabled ? '#C4C4C4' : '#212525',
    transition: 'background 0.15s',
    flexShrink: 0,
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 44,
        minWidth: 192,
        background: '#FFFFFF',
        borderRadius: 1000,
        border: '1px solid #ECECEC',
        padding: '0 8px',
        gap: 4,
      }}
    >
      {/* In RTL context the right chevron (›) navigates to the previous month */}
      <button
        type="button"
        onClick={disabled ? undefined : onPrev}
        style={chevronStyle}
        aria-label="חודש קודם"
        onMouseEnter={(e) => {
          if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = '#F0F4FA';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
        }}
      >
        <ChevronIcon direction="right" />
      </button>

      <span
        style={{
          flex: 1,
          textAlign: 'center',
          fontSize: 18,
          fontWeight: 700,
          color: '#141E3E',
          userSelect: 'none',
        }}
      >
        {getMonthLabel(month, year)}
      </span>

      <button
        type="button"
        onClick={disabled ? undefined : onNext}
        style={chevronStyle}
        aria-label="חודש הבא"
        onMouseEnter={(e) => {
          if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = '#F0F4FA';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
        }}
      >
        <ChevronIcon direction="left" />
      </button>
    </div>
  );
}
