'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { authCss } from '@/components/auth/styles';

const statusCss = `
${authCss}

body:has(.foleio-status-root) footer:not(.foleio-auth-legal) {
  display: none !important;
}

.foleio-status-root {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 32px 20px;
  box-sizing: border-box;
}

.foleio-status-brand {
  display: inline-flex;
  margin-bottom: 28px;
}

.foleio-status-brand img {
  height: 28px;
  width: auto;
}

.foleio-status-card {
  width: 100%;
  max-width: 420px;
  background: #212121;
  border-radius: 12px;
  padding: 28px 24px;
  text-align: center;
}

.foleio-status-card .foleio-auth-title {
  margin: 0;
  color: #f4f4f5;
  font-size: clamp(1.5rem, 3vw, 1.85rem);
}

.foleio-status-desc {
  margin: 12px 0 0;
  color: #adadad;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
}

.foleio-status-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 24px;
}

.foleio-status-btn,
.foleio-status-btn-outline,
.foleio-status-btn-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 44px;
  border-radius: 9px;
  font-family: var(--font-body), sans-serif;
  font-size: 15px;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.foleio-status-btn:hover,
.foleio-status-btn-outline:hover,
.foleio-status-btn-ghost:hover {
  opacity: 0.92;
}

.foleio-status-btn {
  border: 1px solid #ffffff;
  background: #ffffff;
  color: #001035;
}

.foleio-status-btn-outline {
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: transparent;
  color: #f4f4f5;
}

.foleio-status-btn-ghost {
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.06);
  color: #adadad;
}

.foleio-status-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  margin: 0 auto 16px;
  border-radius: 999px;
  background: #2b2b2b;
  color: #f4f4f5;
}

.foleio-status-icon.is-ok {
  background: rgba(134, 239, 172, 0.12);
  color: #86efac;
}

.foleio-status-icon.is-err {
  background: rgba(252, 165, 165, 0.12);
  color: #fca5a5;
}
`;

export type StatusAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'outline' | 'ghost';
};

interface FoleioStatusPageProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  iconTone?: 'neutral' | 'ok' | 'err';
  primaryAction?: StatusAction;
  secondaryAction?: StatusAction;
  children?: ReactNode;
}

function ActionButton({ action }: { action: StatusAction }) {
  const className =
    action.variant === 'outline'
      ? 'foleio-status-btn-outline'
      : action.variant === 'ghost'
        ? 'foleio-status-btn-ghost'
        : 'foleio-status-btn';

  if (action.href) {
    return (
      <Link href={action.href} className={className}>
        {action.label}
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={action.onClick}>
      {action.label}
    </button>
  );
}

export function FoleioStatusPage({
  title,
  description,
  icon,
  iconTone = 'neutral',
  primaryAction,
  secondaryAction,
  children,
}: FoleioStatusPageProps) {
  return (
    <div className="foleio-auth-root foleio-status-root">
      <style dangerouslySetInnerHTML={{ __html: statusCss }} />
      <Link href="/" className="foleio-status-brand" aria-label="Foleio home">
        <img
          src="/brand/foleio-wordmark-white.svg"
          alt="Foleio"
          width={120}
          height={28}
        />
      </Link>
      <div className="foleio-status-card">
        {icon ? (
          <div
            className={`foleio-status-icon${
              iconTone === 'ok' ? ' is-ok' : iconTone === 'err' ? ' is-err' : ''
            }`}
          >
            {icon}
          </div>
        ) : null}
        <h1 className="foleio-auth-title">{title}</h1>
        {description ? <p className="foleio-status-desc">{description}</p> : null}
        {children}
        {primaryAction || secondaryAction ? (
          <div className="foleio-status-actions">
            {primaryAction ? <ActionButton action={primaryAction} /> : null}
            {secondaryAction ? <ActionButton action={secondaryAction} /> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
