interface LockedMonthBannerProps {
  isLocked: boolean;
}

function LockIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export default function LockedMonthBanner({ isLocked }: LockedMonthBannerProps) {
  if (!isLocked) return null;

  return (
    <div
      style={{
        background: '#FCE3D6',
        borderRadius: 8,
        padding: '12px 24px',
        color: '#E7000B',
        fontSize: 16,
        fontWeight: 600,
        display: 'flex',
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 8,
      }}
    >
      <LockIcon />
      חודש נעול — לא ניתן לערוך דיווחים
    </div>
  );
}
