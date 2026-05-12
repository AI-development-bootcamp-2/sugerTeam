import type { CSSProperties } from 'react';

const SKELETON_COUNT = 12;

function shimmer(): CSSProperties {
  return {
    background: '#ECECEC',
    borderRadius: 4,
    animation: 'pulse 1.5s ease-in-out infinite',
  };
}

function SkeletonCard() {
  return (
    <div
      style={{
        height: 72,
        background: '#FFFFFF',
        border: '1px solid #ECECEC',
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 16px',
      }}
    >
      {/* Right block — represents date */}
      <span style={{ ...shimmer(), width: 200, height: 20 }} />
      {/* Left block — represents status tag */}
      <span style={{ ...shimmer(), width: 80, height: 20 }} />
    </div>
  );
}

export default function DayCardSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: SKELETON_COUNT }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
