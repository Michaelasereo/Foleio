'use client';

import { AlertCircle, CheckCircle2, Loader2, Video, X } from 'lucide-react';

type UploadState = 'uploading' | 'processing' | 'complete' | 'error';

interface UploadProgressProps {
  state: UploadState;
  progress: number;
  fileName: string;
  fileSize: number;
  error?: string;
  onCancel: () => void;
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes > 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function UploadProgress({
  state,
  progress,
  fileName,
  fileSize,
  error,
  onCancel,
}: UploadProgressProps) {
  return (
    <div className="w-full rounded-2xl border border-border bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Video className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="max-w-[220px] truncate text-sm font-semibold text-foreground">
              {fileName || 'Uploading video'}
            </p>
            <p className="text-xs text-muted-foreground">{formatFileSize(fileSize)}</p>
          </div>
        </div>

        {state === 'uploading' && (
          <button
            onClick={onCancel}
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-red-500"
          >
            <X className="h-3.5 w-3.5" />
            Cancel
          </button>
        )}
      </div>

      <div className="relative mb-3 h-2.5 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            state === 'complete'
              ? 'bg-green-500'
              : state === 'error'
                ? 'bg-red-500'
                : 'bg-primary'
          }`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {state === 'uploading' && <span className="text-xs text-muted-foreground">Uploading...</span>}
          {state === 'processing' && (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
              <span className="text-xs font-medium text-amber-600">Processing video...</span>
            </>
          )}
          {state === 'complete' && (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              <span className="text-xs font-medium text-green-600">Upload complete!</span>
            </>
          )}
          {state === 'error' && (
            <>
              <AlertCircle className="h-3.5 w-3.5 text-red-500" />
              <span className="text-xs font-medium text-red-600">Upload failed</span>
            </>
          )}
        </div>
        <span className="text-sm font-bold text-foreground">
          {state === 'processing' ? '100%' : `${Math.min(100, Math.max(0, progress))}%`}
        </span>
      </div>

      {state === 'error' && error ? (
        <div className="mt-3 rounded-xl bg-red-50 p-3">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      ) : null}
    </div>
  );
}
