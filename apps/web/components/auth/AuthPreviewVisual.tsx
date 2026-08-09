import { BadgeCheck } from 'lucide-react';

/** Shared Luma skeleton art used on auth and the marketing home hero. */
export function AuthPreviewVisual() {
  return (
    <div className="foleio-auth-left">
      <div className="foleio-auth-preview" aria-hidden>
        <div className="foleio-auth-preview-bars">
          <div className="foleio-auth-preview-bar" />
          <div className="foleio-auth-preview-bar" />
          <div className="foleio-auth-preview-bar" />
        </div>
      </div>
      <div className="foleio-auth-stub" aria-hidden>
        <div className="foleio-auth-stub-main">
          <div className="foleio-auth-stub-thumb" />
          <div className="foleio-auth-stub-lines">
            <div className="foleio-auth-stub-line" />
            <div className="foleio-auth-stub-line" />
            <div className="foleio-auth-stub-line" />
          </div>
        </div>
        <div className="foleio-auth-stub-badge">
          <BadgeCheck className="h-6 w-6" strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
}
