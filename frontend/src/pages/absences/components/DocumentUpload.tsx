import { useRef, useState } from 'react';
import axios from 'axios';
import { useUploadDocument, useDeleteDocument } from '../../../services/absences.service';

interface Props {
  absenceId: string;
  hasDocument: boolean;
  fileName?: string;
  onChange?: (hasDocument: boolean) => void;
}

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.heic';

export function DocumentUpload({ absenceId, hasDocument, fileName, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string | undefined>(fileName);

  const uploadMutation = useUploadDocument();
  const deleteMutation = useDeleteDocument();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);
    setProgress(0);

    uploadMutation.mutate(
      {
        absenceId,
        file,
        onProgress: (pct) => setProgress(pct),
      },
      {
        onSuccess: (data) => {
          setProgress(100);
          setSuccess('המסמך הועלה בהצלחה');
          setCurrentFileName(data.fileName);
          onChange?.(true);
        },
        onError: (err: unknown) => {
          setProgress(null);
          if (axios.isAxiosError(err)) {
            if (err.response?.status === 413) {
              setError('הקובץ גדול מדי (מקסימום 10MB)');
            } else if (err.response?.status === 400) {
              setError('סוג קובץ לא נתמך');
            } else {
              setError('שגיאה בהעלאת המסמך, נסו שנית');
            }
          } else {
            setError('שגיאה בהעלאת המסמך, נסו שנית');
          }
        },
      },
    );

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleDelete = () => {
    setError(null);
    setSuccess(null);
    deleteMutation.mutate(absenceId, {
      onSuccess: () => {
        setCurrentFileName(undefined);
        setProgress(null);
        onChange?.(false);
      },
      onError: () => {
        setError('שגיאה במחיקת המסמך, נסו שנית');
      },
    });
  };

  const isUploading = uploadMutation.isPending;
  const isDeleting = deleteMutation.isPending;
  const showAttachedBadge = hasDocument && !isUploading;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-gray-700">מסמך תומך</span>
        {showAttachedBadge ? (
          <span className="rounded-full bg-green-100 px-3 py-0.5 text-xs font-medium text-green-700">
            מסמך מצורף
          </span>
        ) : (
          <span className="rounded-full bg-amber-100 px-3 py-0.5 text-xs font-medium text-amber-700">
            נדרש מסמך
          </span>
        )}
      </div>

      {currentFileName && (
        <p className="truncate text-xs text-gray-600" title={currentFileName}>
          {currentFileName}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        onChange={handleFileSelect}
        className="block w-full text-sm text-gray-700 file:ml-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700"
        disabled={isUploading || isDeleting}
      />

      {isUploading && progress !== null && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full bg-blue-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {success && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{success}</p>
      )}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {hasDocument && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={isUploading || isDeleting}
          className="self-start rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          {isDeleting ? 'מוחק...' : 'מחק מסמך'}
        </button>
      )}
    </div>
  );
}
