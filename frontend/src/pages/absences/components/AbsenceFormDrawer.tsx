import { useEffect } from 'react';
import { AbsenceFormCard } from './AbsenceFormCard';
import type { AbsenceWithDocumentsDto } from '../../../services/absences.service';

interface AbsenceFormDrawerProps {
  open: boolean;
  onClose: () => void;
  initialAbsence?: AbsenceWithDocumentsDto;
  onMutationSuccess?: () => void;
}

export function AbsenceFormDrawer({ open, onClose, initialAbsence, onMutationSuccess }: AbsenceFormDrawerProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(20,30,62,0.5)',
            zIndex: 100,
          }}
        />
      )}

      <div
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-label={initialAbsence ? 'עריכת היעדרות' : 'דיווח ידני'}
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          width: 'min(480px, 100vw)',
          zIndex: 101,
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease',
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        {open && (
          <AbsenceFormCard
            key={initialAbsence?.id ?? 'new'}
            onClose={onClose}
            flush
            initialAbsence={initialAbsence}
            onMutationSuccess={onMutationSuccess}
          />
        )}
      </div>
    </>
  );
}
