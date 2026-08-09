'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Bell,
  CalendarDays,
  FileText,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShoppingBag,
  UserRound,
  Wallet,
  X,
} from 'lucide-react';
import { AuthLegalFooter } from '@/components/auth/AuthLegalFooter';
import { authCss } from '@/components/auth/styles';
import { CreatorSetupTourCard } from '@/components/creator/CreatorSetupTourCard';

const creatorShellCss = `
${authCss}

body:has(.foleio-creator-root) footer:not(.foleio-auth-legal) {
  display: none !important;
}

/* Duo-style frame: icon rail on soft canvas + floating light content panel */
.foleio-creator-root {
  height: 100dvh;
  min-height: 100dvh;
  overflow: hidden;
  background: #f5f3f4 !important;
  color: #1a1816;
}
.foleio-creator-root .foleio-auth-shell {
  max-width: none;
  width: 100%;
  height: 100%;
  min-height: 0;
  margin: 0;
  padding: 12px 12px 12px 0;
  box-sizing: border-box;
  flex: 1;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 0;
}
.foleio-creator-rail {
  display: none;
  flex-direction: column;
  align-items: stretch;
  justify-content: space-between;
  width: 220px;
  flex-shrink: 0;
  /* Match Creator Dashboard strip (32) + main gap (4) so Workspace lines up with the content panel */
  padding: 36px 14px 18px;
  box-sizing: border-box;
  transition: width 0.18s ease;
}
.foleio-creator-rail.is-collapsed {
  width: 72px;
  padding: 36px 10px 16px;
  align-items: center;
}
.foleio-creator-rail-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s ease, color 0.15s ease;
}
.foleio-creator-rail-toggle:hover {
  color: #111827;
  background: rgba(17, 24, 39, 0.06);
}
.foleio-creator-rail-toggle svg {
  width: 16px;
  height: 16px;
}
.foleio-creator-rail-section-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 28px;
  margin: 0 4px 8px;
  box-sizing: border-box;
}
.foleio-creator-rail.is-collapsed .foleio-creator-rail-section-row {
  justify-content: center;
  margin: 0 0 8px;
  width: 100%;
}
.foleio-creator-rail.is-collapsed .foleio-creator-rail-section,
.foleio-creator-rail.is-collapsed .foleio-creator-rail-link-label {
  display: none;
}
.foleio-creator-rail.is-collapsed .foleio-creator-rail-nav,
.foleio-creator-rail.is-collapsed .foleio-creator-rail-footer,
.foleio-creator-rail.is-collapsed .foleio-creator-rail-top {
  align-items: center;
  width: 100%;
}
.foleio-creator-rail.is-collapsed .foleio-creator-rail-link {
  justify-content: center;
  width: 44px;
  min-height: 40px;
  padding: 0;
  gap: 0;
}
.foleio-creator-rail-nav,
.foleio-creator-rail-footer {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 2px;
}
.foleio-creator-rail-top {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.foleio-creator-rail-nav {
  flex: 1;
}
.foleio-creator-rail-section {
  margin: 0;
  color: #9ca3af;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.foleio-creator-rail-footer > .foleio-creator-rail-section {
  margin: 14px 10px 6px;
}
.foleio-creator-rail-link {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 36px;
  padding: 7px 10px;
  border-radius: 6px;
  color: #6b7280;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.2;
  text-decoration: none;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
  box-sizing: border-box;
}
.foleio-creator-rail-link:hover {
  color: #374151;
  background: rgba(17, 24, 39, 0.04);
}
.foleio-creator-rail-link.is-active {
  color: #1f2937;
  background: #eceaef;
  font-weight: 500;
}
.foleio-creator-rail-link.is-active:hover {
  color: #1f2937;
  background: #eceaef;
}
.foleio-creator-rail-link svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}
.foleio-creator-rail-link-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.foleio-creator-root .foleio-auth-topbar-nav a,
.foleio-creator-root .foleio-auth-topbar-icon {
  color: #6b7280;
}
.foleio-creator-root .foleio-auth-topbar-nav a:hover,
.foleio-creator-root .foleio-auth-topbar-nav a.is-active,
.foleio-creator-root .foleio-auth-topbar-icon:hover,
.foleio-creator-root .foleio-auth-topbar-icon.is-active {
  color: #111827;
  background: rgba(17, 24, 39, 0.06);
}
.foleio-creator-root .foleio-auth-topbar-mobile-pop {
  background: #ffffff;
  border: 1px solid rgba(17, 24, 39, 0.1);
  box-shadow: 0 12px 32px rgba(17, 24, 39, 0.12);
}
.foleio-creator-root .foleio-auth-topbar-mobile-pop a {
  color: #4b5563;
}
.foleio-creator-root .foleio-auth-topbar-mobile-pop a:hover,
.foleio-creator-root .foleio-auth-topbar-mobile-pop a.is-active {
  color: #111827;
  background: rgba(17, 24, 39, 0.06);
}
.foleio-creator-root .foleio-auth-main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0;
}
.foleio-creator-root .foleio-creator-content-surface {
  flex: 1;
  width: 100%;
  min-height: 0;
  overflow: hidden;
}
.foleio-creator-root .foleio-auth-columns {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
}
@media (min-width: 900px) {
  .foleio-creator-rail {
    display: flex;
  }
  .foleio-creator-root .foleio-auth-topbar {
    display: none !important;
  }
}
@media (max-width: 899px) {
  .foleio-creator-root {
    height: auto;
    min-height: 100dvh;
    overflow: auto;
  }
  .foleio-creator-root .foleio-auth-shell {
    flex-direction: column;
    height: auto;
    min-height: 100dvh;
    padding: 12px;
    gap: 12px;
  }
}

/* Mobile tool pages: hide cover + name/verified; keep on /dashboard only */
@media (max-width: 899px) {
  .foleio-creator-root .foleio-auth-left.is-hide-on-mobile {
    display: none;
  }
}

/* Narrow phones only: center cover + profile under full-width content */
@media (max-width: 409px) {
  .foleio-creator-root .foleio-auth-left:not(.is-hide-on-mobile) {
    max-width: 333px;
    margin-left: auto;
    margin-right: auto;
  }
}

/* Tablet / wide phone: center cover/profile and main content columns */
@media (min-width: 410px) and (max-width: 899px) {
  .foleio-creator-root .foleio-auth-columns {
    justify-items: center;
  }
  .foleio-creator-root .foleio-auth-left:not(.is-hide-on-mobile) {
    max-width: 333px;
    width: 100%;
    margin-left: auto;
    margin-right: auto;
  }
  .foleio-creator-root .foleio-auth-right {
    width: 100%;
    max-width: 542px;
    margin-left: auto;
    margin-right: auto;
  }
}

.foleio-auth-stub-thumb.is-avatar {
  background: transparent;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.foleio-auth-stub-thumb.is-avatar > * {
  width: 100% !important;
  height: 100% !important;
  border-radius: 4px !important;
  background: #2b2b2b !important;
}
.foleio-auth-stub-thumb.is-avatar span {
  color: #adadad !important;
  font-weight: 500 !important;
}
.foleio-auth-stub-name {
  color: #f4f4f5;
  font-size: 16px;
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  margin: 0;
}
.foleio-auth-stub-meta {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  justify-content: center;
}
.foleio-auth-stub-category {
  color: #828282;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
}
.foleio-auth-stub-menu {
  position: relative;
  flex-shrink: 0;
  margin-left: auto;
}
.foleio-auth-stub-menu-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: #adadad;
  cursor: pointer;
}
.foleio-auth-stub-menu-btn:hover,
.foleio-auth-stub-menu-btn[aria-expanded='true'] {
  background: rgba(255, 255, 255, 0.06);
  color: #f4f4f5;
}
.foleio-auth-stub-menu-btn svg {
  width: 16px;
  height: 16px;
}
.foleio-auth-stub-menu-pop {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 40;
  min-width: 188px;
  padding: 4px;
  border-radius: 10px;
  background: #2a2a2a;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45);
}
.foleio-auth-stub-menu-item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: #f4f4f5;
  font-family: var(--font-body), sans-serif;
  font-size: 13px;
  font-weight: 500;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
}
.foleio-auth-stub-menu-item:hover {
  background: rgba(255, 255, 255, 0.06);
}
.foleio-auth-stub-menu-item svg {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  color: #adadad;
}

.foleio-auth-topbar-nav a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14.85px;
  font-weight: 500;
  color: #adadad;
  line-height: normal;
  white-space: nowrap;
  text-decoration: none;
}
.foleio-auth-topbar-nav a:hover,
.foleio-auth-topbar-nav a.is-active {
  color: #fafafa;
}
.foleio-creator-root .foleio-auth-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  overflow: visible;
  z-index: 40;
}
.foleio-creator-root .foleio-auth-topbar-nav {
  flex: 1;
  min-width: 0;
  position: relative;
}
.foleio-auth-topbar-nav-links {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 16px;
  flex-wrap: wrap;
}
.foleio-auth-topbar-mobile-menu {
  display: none;
  position: relative;
  z-index: 70;
}
.foleio-auth-topbar-mobile-pop {
  position: fixed;
  z-index: 80;
  min-width: 220px;
  max-width: min(280px, calc(100vw - 24px));
  padding: 6px;
  border-radius: 12px;
  background: #2b2b2b;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.foleio-auth-topbar-mobile-pop a {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  color: #adadad;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
}
.foleio-auth-topbar-mobile-pop a:hover,
.foleio-auth-topbar-mobile-pop a.is-active {
  color: #fafafa;
  background: rgba(255, 255, 255, 0.06);
}
.foleio-auth-topbar-mobile-pop a svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}
@media (max-width: 899px) {
  .foleio-auth-topbar-nav-links {
    display: none !important;
  }
  .foleio-auth-topbar-mobile-menu {
    display: block;
  }
}
.foleio-auth-topbar-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.foleio-auth-topbar-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  color: #adadad;
  text-decoration: none;
  background: transparent;
  border: none;
  cursor: pointer;
}
.foleio-auth-topbar-icon:hover,
.foleio-auth-topbar-icon.is-active {
  color: #fafafa;
  background: rgba(255, 255, 255, 0.06);
}
.foleio-auth-topbar-icon svg {
  width: 20px;
  height: 20px;
}

/*
 * Merchant main content surface: light rounded panel on the page canvas.
 * Title + notifications sit on the canvas above the panel (not inside it).
 */
.foleio-creator-root .foleio-creator-content-surface {
  display: flex;
  flex-direction: column;
  background: #fcfafb;
  color: #1a1816;
  border-radius: 6px;
  padding: 0;
  box-sizing: border-box;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.65) inset,
    0 12px 40px rgba(80, 60, 90, 0.12);
  border: 1px solid #e5e3e6;
}
.foleio-creator-root .foleio-creator-content-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
  height: 32px;
  min-height: 32px;
  padding: 0 4px 0 2px;
  box-sizing: border-box;
  background: transparent;
  border: none;
}
.foleio-creator-root .foleio-creator-content-title {
  margin: 0;
  color: #111827;
  font-family: var(--font-body), sans-serif;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: -0.01em;
  line-height: 1.2;
}
.foleio-creator-root .foleio-creator-content-actions {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}
.foleio-creator-root .foleio-creator-content-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  color: #6b7280;
  text-decoration: none;
  background: transparent;
  border: none;
  transition: background 0.15s ease, color 0.15s ease;
}
.foleio-creator-root .foleio-creator-content-action:hover {
  color: #111827;
  background: rgba(17, 24, 39, 0.06);
}
.foleio-creator-root .foleio-creator-content-action svg {
  width: 16px;
  height: 16px;
}
.foleio-creator-root .foleio-creator-content-body {
  flex: 1;
  align-self: center;
  min-height: 0;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding: 22px 20px 20px;
  box-sizing: border-box;
  width: 100%;
  max-width: 720px;
  margin-left: auto;
  margin-right: auto;
}
.foleio-creator-root .foleio-creator-content-body::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}
@media (min-width: 900px) {
  .foleio-creator-root .foleio-creator-content-header {
    height: 32px;
    min-height: 32px;
    padding: 0 4px 0 2px;
  }
  .foleio-creator-root .foleio-creator-content-body {
    padding: 24px 32px 28px;
  }
}
.foleio-creator-root .foleio-creator-content-surface .foleio-auth-title {
  color: #1a1816;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-header .foleio-auth-title {
  font-size: 24px;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1.25;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-auth-muted,
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-panel-meta,
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-empty,
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-stat-label,
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-stat-icon,
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-stat-change,
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-sub-date,
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-field-hint {
  color: #6b7280;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-auth-label,
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-field > span,
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-sub-name,
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-panel-title,
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-stat-value {
  color: #111827;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-panel,
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-stat,
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-tabs {
  background: #ffffff;
  border: 1px solid rgba(17, 24, 39, 0.08);
  box-shadow: 0 1px 2px rgba(17, 24, 39, 0.04);
}
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-sub-row {
  border-top-color: rgba(17, 24, 39, 0.08);
}
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-sub-badge,
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-badge.is-muted {
  background: rgba(17, 24, 39, 0.06);
  color: #4b5563;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-badge {
  background: rgba(17, 24, 39, 0.06);
  color: #4b5563;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-badge.is-info {
  background: rgba(37, 99, 235, 0.1);
  color: #1d4ed8;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-badge.is-success {
  background: rgba(22, 163, 74, 0.12);
  color: #15803d;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-badge.is-warning {
  background: rgba(217, 119, 6, 0.12);
  color: #b45309;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-badge.is-danger {
  background: rgba(220, 38, 38, 0.1);
  color: #b91c1c;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-underline-tabs {
  border-bottom-color: rgba(17, 24, 39, 0.1);
}
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-underline-tab {
  color: #6b7280;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-underline-tab:hover,
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-underline-tab.is-active,
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-tab.is-active {
  color: #111827;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-tab {
  color: #6b7280;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-tab.is-active {
  background: rgba(17, 24, 39, 0.06);
  color: #111827;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-tab-count {
  background: rgba(17, 24, 39, 0.08);
  color: #4b5563;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-tab.is-active .foleio-dash-tab-count {
  background: rgba(17, 24, 39, 0.14);
  color: #111827;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-btn-primary {
  border-color: #111827;
  background: #111827;
  color: #f9fafb;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-btn-outline {
  border-color: rgba(17, 24, 39, 0.16);
  background: #ffffff;
  color: #111827;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-btn-ghost {
  background: rgba(17, 24, 39, 0.05);
  color: #4b5563;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-withdraw {
  border-color: #111827;
  background: #111827;
  color: #f9fafb;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-input,
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-textarea,
.foleio-creator-root .foleio-creator-content-surface .foleio-auth-input,
.foleio-creator-root .foleio-creator-content-surface .foleio-auth-row,
.foleio-creator-root .foleio-creator-content-surface select.foleio-dash-input {
  background: #ffffff !important;
  color: #111827 !important;
  border: 1px solid rgba(17, 24, 39, 0.12);
}
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-input:focus,
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-textarea:focus,
.foleio-creator-root .foleio-creator-content-surface .foleio-auth-input:focus {
  outline: 1px solid rgba(17, 24, 39, 0.28);
  border-color: rgba(17, 24, 39, 0.28);
}
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-input::placeholder,
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-textarea::placeholder {
  color: #9ca3af;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-booking-row {
  border-color: rgba(17, 24, 39, 0.08);
}
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-booking-notes,
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-booking-meta,
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-booking-details {
  color: #6b7280;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-drawer-close {
  background: rgba(17, 24, 39, 0.06);
  color: #4b5563;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-drawer-close:hover {
  color: #111827;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-auth-legal-links a {
  color: rgba(17, 24, 39, 0.45);
}
.foleio-creator-root .foleio-creator-content-surface .foleio-auth-legal-links a:hover {
  color: rgba(17, 24, 39, 0.85);
}
.foleio-creator-root .foleio-creator-content-surface .foleio-auth-legal-sep {
  color: rgba(17, 24, 39, 0.25);
}
.foleio-creator-root .foleio-creator-content-surface .foleio-auth-legal-copy {
  color: rgba(17, 24, 39, 0.35);
}
.foleio-creator-root .foleio-creator-content-surface .foleio-dev-support-banner {
  background: rgba(217, 119, 6, 0.12);
  color: #92400e;
  border: 1px solid rgba(217, 119, 6, 0.25);
}
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-booking-amount {
  color: #111827;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-booking-contacts,
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-booking-contacts span {
  color: #6b7280;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-drawer {
  background: #fcfafb;
  box-shadow: -16px 0 40px rgba(0, 0, 0, 0.2);
}
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-modal {
  background: #ffffff;
  color: #111827;
  border: 1px solid rgba(17, 24, 39, 0.08);
}
.foleio-creator-root .foleio-creator-content-surface a {
  color: inherit;
}

.foleio-creator-root .foleio-creator-content-surface .foleio-auth-stub-badge {
  background: rgba(17, 24, 39, 0.06);
  color: #6b7280;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-auth-stub-badge.is-pro {
  color: #2563eb;
  background: rgba(37, 99, 235, 0.12);
}
.foleio-creator-root .foleio-creator-content-surface .foleio-auth-stub-category {
  color: #6b7280;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-auth-stub-menu-btn {
  color: #6b7280;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-auth-stub-menu-btn:hover,
.foleio-creator-root .foleio-creator-content-surface .foleio-auth-stub-menu-btn[aria-expanded='true'] {
  background: rgba(17, 24, 39, 0.06);
  color: #111827;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-auth-stub-menu-pop {
  background: #ffffff;
  border: 1px solid rgba(17, 24, 39, 0.1);
  box-shadow: 0 12px 32px rgba(17, 24, 39, 0.12);
}
.foleio-creator-root .foleio-creator-content-surface .foleio-auth-stub-menu-item {
  color: #374151;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-auth-stub-menu-item:hover {
  background: rgba(17, 24, 39, 0.05);
  color: #111827;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-auth-stub-thumb.is-avatar > * {
  background: #e5e7eb !important;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-auth-right {
  max-width: none;
}
.foleio-creator-root .foleio-creator-content-surface > .foleio-auth-legal {
  width: 100%;
  max-width: 720px;
  margin-left: auto;
  margin-right: auto;
}


/* Light theme: availability, settings chrome, fees, policy inside content surface */
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-availability-legend,
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-tz-sep,
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-title,
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-pick-hint,
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-mgmt-hint,
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-time-field,
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-time-to,
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-time-full-hint,
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-cal-weekdays,
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-legend,
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-saved-meta,
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-fee-price,
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-fee-note,
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-fee-rate span {
  color: #6b7280;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-tz,
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-card,
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-saved-row {
  background: #ffffff;
  color: #111827;
  border: 1px solid rgba(17, 24, 39, 0.08);
}
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-mgmt-date,
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-option-left,
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-option-value,
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-capacity-input,
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-time-mode {
  color: #6b7280;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-mgmt-label,
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-cal-month,
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-section-label,
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-fee-plan,
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-fee-rate strong,
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-policy-more-btn,
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-policy a,
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-policy h2,
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-policy strong,
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-avatar-meta button {
  color: #111827;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-policy {
  color: #374151;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-policy-full {
  border-top-color: rgba(17, 24, 39, 0.08);
}
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-policy-more-btn:hover {
  color: #000;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-mgmt-row,
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-option,
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-fee-row {
  border-color: rgba(17, 24, 39, 0.08);
}
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-time-modes {
  background: #f3f1f4;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-time-mode.is-active {
  background: #ffffff;
  color: #111827;
  box-shadow: 0 1px 2px rgba(17, 24, 39, 0.08);
}
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-time-field input[type='time'],
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-capacity-input input,
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-select,
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-url-strip,
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-link-row {
  background: #ffffff !important;
  color: #111827 !important;
  border: 1px solid rgba(17, 24, 39, 0.12);
  color-scheme: light;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-time-field input[type='time']:focus,
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-capacity-input input:focus {
  outline: 1px solid rgba(17, 24, 39, 0.28);
}
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-cal-nav {
  background: #f3f1f4;
  color: #111827;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-cal-nav:hover {
  background: #ebe8eb;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-cal-day {
  background: #f3f1f4;
  color: #111827;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-cal-day:hover:not(:disabled) {
  border-color: rgba(17, 24, 39, 0.2);
}
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-cal-day.is-today:not(.is-selected) {
  border-color: rgba(17, 24, 39, 0.35);
}
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-cal-day.is-active:not(.is-selected):not(.is-off) {
  border-color: rgba(17, 24, 39, 0.45);
  background: #ebe8eb;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-cal-day.is-selected {
  background: #111827;
  color: #ffffff;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-cal-day.is-booked:not(.is-selected) {
  border-color: rgba(17, 24, 39, 0.35);
  background: #ebe8eb;
  box-shadow: inset 0 -2px 0 0 #111827;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-legend-dot {
  background: #d1d5db;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-legend-dot.is-booked {
  background: #111827;
  box-shadow: 0 0 0 2px #ebe8eb;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-legend-dot.is-selected {
  background: #111827;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-legend-dot.is-past {
  background: #9ca3af;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-toggle {
  background: #d1d5db;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-toggle span,
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-toggle-knob {
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(17, 24, 39, 0.18);
}
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-toggle.is-on {
  background: #22c55e;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-toggle.is-on span,
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-toggle.is-on .foleio-avail-toggle-knob {
  background: #ffffff;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-submit {
  border-color: #111827;
  background: #111827;
  color: #f9fafb;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-message.is-ok { color: #15803d; }
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-message.is-err { color: #b91c1c; }
.foleio-creator-root .foleio-creator-content-surface .foleio-avail-saved-row.is-off { color: #b91c1c; }
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-avatar {
  background: #e5e7eb;
  border: 1px solid rgba(17, 24, 39, 0.08);
}
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-url-strip svg,
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-icon-btn svg {
  color: #6b7280;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-icon-btn {
  background: rgba(17, 24, 39, 0.06);
  color: #6b7280;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-icon-btn:hover {
  color: #111827;
  background: rgba(17, 24, 39, 0.1);
}
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-share-thumb {
  background: #f3f1f4;
  border: 1px solid rgba(17, 24, 39, 0.08);
}
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-select option {
  background: #ffffff;
  color: #111827;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-underline-tab.is-active {
  border-bottom-color: #111827;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-btn-danger {
  border-color: rgba(185, 28, 28, 0.25);
  background: rgba(185, 28, 28, 0.08);
  color: #b91c1c;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-dash-fee-row.is-pro .foleio-dash-fee-rate strong {
  color: #15803d;
}
.foleio-creator-root .foleio-dash-modal {
  background: #ffffff;
  color: #111827;
  border: 1px solid rgba(17, 24, 39, 0.08);
  box-shadow: 0 20px 50px rgba(17, 24, 39, 0.18);
}
.foleio-creator-root .foleio-dash-drawer {
  background: #fcfafb;
  box-shadow: -16px 0 40px rgba(17, 24, 39, 0.16);
}
.foleio-creator-root .foleio-dash-drawer-close {
  background: rgba(17, 24, 39, 0.06);
  color: #4b5563;
}
.foleio-creator-root .foleio-dash-drawer-close:hover {
  color: #111827;
}

/* Light theme: merchant product list cards */
.foleio-creator-root .foleio-creator-content-surface .foleio-product-card {
  background: #ffffff;
  border: 1px solid rgba(17, 24, 39, 0.08);
  color: #111827;
  border-radius: 6px;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-product-card-media {
  background: #f3f1f4;
  border-radius: 6px;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-product-card-title,
.foleio-creator-root .foleio-creator-content-surface .foleio-product-card-price {
  color: #111827;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-product-card-desc,
.foleio-creator-root .foleio-creator-content-surface .foleio-product-card-price .is-compare {
  color: #6b7280;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-product-card-stock {
  background: rgba(22, 163, 74, 0.12);
  color: #15803d;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-product-card-stock.is-out {
  background: rgba(17, 24, 39, 0.06);
  color: #6b7280;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-product-card-icon-btn {
  background: #111827;
  color: #f9fafb;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-product-card-icon-btn.is-ghost {
  background: rgba(17, 24, 39, 0.06);
  color: #6b7280;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-product-card-icon-btn.is-ghost:hover {
  color: #111827;
  background: rgba(17, 24, 39, 0.1);
}
.foleio-creator-root .foleio-creator-content-surface .foleio-product-card-icon-btn.is-danger {
  background: rgba(185, 28, 28, 0.08);
  color: #b91c1c;
}
.foleio-creator-root .foleio-creator-content-surface .foleio-product-card-shop-btn {
  background: #111827;
  color: #f9fafb;
}

.foleio-dash-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}
.foleio-dash-header .foleio-auth-title {
  margin: 0;
}
.foleio-dash-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 12px;
}
.foleio-dash-stat {
  background: #212121;
  border-radius: 10px;
  padding: 14px;
  min-height: 88px;
}
.foleio-dash-stat-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}
.foleio-dash-stat-label {
  color: #adadad;
  font-size: 13px;
  font-weight: 500;
}
.foleio-dash-stat-icon {
  color: #adadad;
  flex-shrink: 0;
}
.foleio-dash-stat-value {
  color: #f4f4f5;
  font-size: 22px;
  font-weight: 500;
  letter-spacing: -0.02em;
  line-height: 1.2;
}
.foleio-dash-stat-change {
  margin-top: 4px;
  color: #adadad;
  font-size: 12px;
  font-weight: 500;
}
.foleio-dash-stat-change.is-up { color: #86efac; }
.foleio-dash-stat-change.is-down { color: #fca5a5; }

.foleio-dash-panel {
  background: #212121;
  border-radius: 10px;
  padding: 16px;
  font-family: var(--font-body), sans-serif;
}
.foleio-dash-panel-title {
  color: #f4f4f5;
  font-family: var(--font-body), sans-serif;
  font-size: 16.642px;
  font-weight: 500;
  letter-spacing: -0.01em;
  margin: 0 0 4px;
}
.foleio-dash-panel-meta {
  color: #adadad;
  font-family: var(--font-body), sans-serif;
  font-size: 13px;
  font-weight: 500;
  margin: 0 0 14px;
}
.foleio-dash-sub-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.foleio-dash-sub-row:first-of-type {
  border-top: none;
  padding-top: 0;
}
.foleio-dash-sub-name {
  color: #f4f4f5;
  font-family: var(--font-body), sans-serif;
  font-size: 14.85px;
  font-weight: 500;
}
.foleio-dash-sub-badge {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  color: #adadad;
  font-family: var(--font-body), sans-serif;
  font-size: 12px;
  font-weight: 500;
}
.foleio-dash-sub-date {
  color: #adadad;
  font-family: var(--font-body), sans-serif;
  font-size: 12px;
  font-weight: 500;
  flex-shrink: 0;
}
.foleio-dash-empty {
  color: #adadad;
  font-family: var(--font-body), sans-serif;
  font-size: 14.85px;
  font-weight: 500;
  padding: 8px 0;
  margin: 0;
}
.foleio-dash-withdraw {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 40px;
  padding: 0 14px;
  border-radius: 9px;
  border: 1px solid #ffffff;
  background: #ffffff;
  color: #001035;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  flex-shrink: 0;
}
.foleio-dash-withdraw:hover { opacity: 0.92; }
.foleio-dash-withdraw:disabled {
  opacity: 0.45;
  pointer-events: none;
}

.foleio-dash-tabs {
  display: inline-flex;
  flex-wrap: wrap;
  width: fit-content;
  max-width: 100%;
  gap: 4px;
  margin: 4px 0 12px;
  padding: 4px;
  background: #212121;
  border-radius: 10px;
}
.foleio-dash-underline-tabs {
  display: flex;
  flex-wrap: wrap;
  width: fit-content;
  max-width: 100%;
  gap: 4px;
  margin: 0 0 14px;
  padding: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: transparent;
}
.foleio-dash-underline-tab {
  display: inline-flex;
  align-items: center;
  height: 36px;
  padding: 0 12px;
  margin-bottom: -1px;
  border: none;
  border-bottom: 2px solid transparent;
  border-radius: 0;
  background: transparent;
  color: #828282;
  font-family: var(--font-body), sans-serif;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}
.foleio-dash-underline-tab:hover {
  color: #fafafa;
}
.foleio-dash-underline-tab.is-active {
  color: #fafafa;
  border-bottom-color: #fafafa;
  background: transparent;
}
.foleio-dash-header + .foleio-dash-tabs,
.foleio-dash-header + .foleio-dash-underline-tabs {
  margin-top: 0;
  margin-bottom: 16px;
}
.foleio-dash-tabs + .foleio-dash-stats {
  margin-top: 0;
}
.foleio-dash-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #adadad;
  font-family: var(--font-body), sans-serif;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.foleio-dash-tab:hover { color: #fafafa; }
.foleio-dash-tab.is-active {
  background: rgba(255, 255, 255, 0.08);
  color: #fafafa;
}
.foleio-dash-tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: #adadad;
  font-size: 11px;
  font-weight: 500;
}
.foleio-dash-tab.is-active .foleio-dash-tab-count {
  color: #fafafa;
}

.foleio-dash-booking-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  font-family: var(--font-body), sans-serif;
}
.foleio-dash-booking-row:first-of-type {
  border-top: none;
  padding-top: 2px;
}
.foleio-dash-booking-main {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.foleio-dash-booking-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.foleio-dash-booking-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.foleio-dash-booking-contacts {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: #adadad;
  font-size: 12px;
  font-weight: 500;
}
.foleio-dash-booking-contacts span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.foleio-dash-booking-notes {
  margin: 0;
  color: #adadad;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
}
.foleio-dash-booking-amount {
  color: #f4f4f5;
  font-size: 14.85px;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.foleio-dash-booking-amount .foleio-dash-booking-details {
  display: inline-flex;
  margin-top: 10px;
  padding: 0;
  border: none;
  background: transparent;
  color: #adadad;
  font-family: var(--font-body), sans-serif;
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
}
.foleio-dash-booking-amount .foleio-dash-booking-details:hover {
  color: #fafafa;
}
.foleio-dash-booking-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 2px;
}
.foleio-dash-badge {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border-radius: 6px;
  font-family: var(--font-body), sans-serif;
  font-size: 11px;
  font-weight: 500;
  background: rgba(255, 255, 255, 0.06);
  color: #adadad;
}
.foleio-dash-badge.is-info {
  background: rgba(147, 197, 253, 0.12);
  color: #93c5fd;
}
.foleio-dash-badge.is-success {
  background: rgba(134, 239, 172, 0.12);
  color: #86efac;
}
.foleio-dash-badge.is-warning {
  background: rgba(250, 204, 21, 0.18);
  color: #facc15;
}
.foleio-dash-badge.is-danger {
  background: rgba(252, 165, 165, 0.12);
  color: #fca5a5;
}
.foleio-dash-badge.is-muted {
  background: rgba(255, 255, 255, 0.06);
  color: #828282;
}
.foleio-dash-dispute {
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(252, 165, 165, 0.08);
}
.foleio-dash-dispute-label {
  margin: 0 0 4px;
  color: #fca5a5;
  font-size: 12px;
  font-weight: 500;
}
.foleio-dash-btn-primary,
.foleio-dash-btn-outline,
.foleio-dash-btn-ghost,
.foleio-dash-btn-danger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border-radius: 8px;
  font-family: var(--font-body), sans-serif;
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
}
.foleio-dash-btn-primary {
  border: 1px solid #ffffff;
  background: #ffffff;
  color: #001035;
}
.foleio-dash-btn-outline {
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: transparent;
  color: #f4f4f5;
}
.foleio-dash-btn-ghost {
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.06);
  color: #adadad;
}
.foleio-dash-btn-danger {
  border: 1px solid rgba(252, 165, 165, 0.35);
  background: rgba(252, 165, 165, 0.12);
  color: #fca5a5;
}
.foleio-dash-btn-primary:hover,
.foleio-dash-btn-outline:hover,
.foleio-dash-btn-ghost:hover,
.foleio-dash-btn-danger:hover { opacity: 0.9; }
.foleio-dash-btn-primary:disabled,
.foleio-dash-btn-outline:disabled,
.foleio-dash-btn-ghost:disabled,
.foleio-dash-btn-danger:disabled {
  opacity: 0.45;
  pointer-events: none;
}

.foleio-dash-textarea {
  display: block;
  width: 100%;
  margin-top: 8px;
  padding: 12px 14px;
  border: 1px solid rgba(17, 24, 39, 0.12);
  border-radius: 10px;
  background: #ffffff;
  color: #111827;
  font-family: var(--font-body), sans-serif;
  font-size: 14px;
  font-weight: 500;
  resize: vertical;
}
.foleio-dash-textarea:focus {
  outline: 1px solid rgba(17, 24, 39, 0.28);
}
.foleio-dash-textarea::placeholder { color: #5c6070; }

.foleio-dash-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.62);
}
.foleio-dash-modal {
  width: 100%;
  max-width: 440px;
  max-height: min(90vh, 720px);
  overflow: auto;
  padding: 20px;
  border-radius: 12px;
  background: #ffffff;
  color: #111827;
  border: 1px solid rgba(17, 24, 39, 0.08);
  font-family: var(--font-body), sans-serif;
}
.foleio-dash-drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.55);
}
.foleio-dash-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 101;
  display: flex;
  flex-direction: column;
  width: min(420px, 100vw);
  background: #fcfafb;
  font-family: var(--font-body), sans-serif;
  box-shadow: -16px 0 40px rgba(17, 24, 39, 0.16);
  animation: foleio-dash-drawer-in 180ms ease-out;
}
@keyframes foleio-dash-drawer-in {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
.foleio-dash-drawer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 20px 0;
  flex-shrink: 0;
}
.foleio-dash-drawer-body {
  flex: 1;
  overflow: auto;
  padding: 16px 20px 24px;
}
.foleio-dash-drawer-close {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: #adadad;
  cursor: pointer;
}
.foleio-dash-drawer-close:hover {
  color: #f4f4f5;
  opacity: 0.9;
}
.foleio-dash-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #adadad;
  font-size: 13px;
  font-weight: 500;
}
.foleio-dash-input {
  display: block;
  width: 100%;
  padding: 12px 14px;
  border: none;
  border-radius: 10px;
  background: #1a1816;
  color: #f4f4f5;
  font-family: var(--font-body), sans-serif;
  font-size: 14px;
  font-weight: 500;
  outline: none;
}
.foleio-dash-input:focus {
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.16);
}
.foleio-dash-input::placeholder {
  color: #5c6070;
}

.foleio-dash-availability {
  margin-top: 4px;
}
.foleio-dash-availability-legend {
  display: flex;
  gap: 14px;
  margin-bottom: 12px;
  color: #adadad;
  font-size: 12px;
  font-weight: 500;
}
.foleio-dash-availability-legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.foleio-dash-availability-legend i {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 999px;
}
.foleio-dash-availability-legend i.is-available { background: #86efac; }
.foleio-dash-availability-legend i.is-unavailable { background: #fca5a5; }
.foleio-dash-availability .rounded-lg,
.foleio-dash-availability .rounded-md,
.foleio-dash-availability .rounded-xl,
.foleio-dash-availability .rounded-2xl {
  border-color: rgba(17, 24, 39, 0.1) !important;
}
.foleio-dash-availability .bg-white,
.foleio-dash-availability .bg-card,
.foleio-dash-availability .bg-background {
  background: #ffffff !important;
  color: #111827 !important;
}
.foleio-dash-availability .text-muted-foreground {
  color: #6b7280 !important;
}
.foleio-dash-availability .border,
.foleio-dash-availability .border-border {
  border-color: rgba(17, 24, 39, 0.1) !important;
}

.foleio-dash-services {
  margin-top: 4px;
}
.foleio-dash-services .rounded-lg,
.foleio-dash-services .rounded-md,
.foleio-dash-services .rounded-xl,
.foleio-dash-services .rounded-2xl {
  border-color: rgba(17, 24, 39, 0.1) !important;
}
.foleio-dash-services .bg-white,
.foleio-dash-services .bg-card,
.foleio-dash-services .bg-background,
.foleio-dash-services [class*="bg-card"] {
  background: #ffffff !important;
  color: #111827 !important;
}
.foleio-dash-services .text-muted-foreground,
.foleio-dash-services [class*="text-muted"] {
  color: #6b7280 !important;
}
.foleio-dash-services .border,
.foleio-dash-services .border-border {
  border-color: rgba(17, 24, 39, 0.1) !important;
}
.foleio-dash-services input,
.foleio-dash-services textarea,
.foleio-dash-services select {
  background: #ffffff !important;
  border-color: rgba(17, 24, 39, 0.12) !important;
  color: #111827 !important;
}
.foleio-dash-services label {
  color: #6b7280 !important;
}

.foleio-avail {
  font-family: var(--font-body), sans-serif;
}
.foleio-avail-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 28px;
}
.foleio-avail-tz {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 31px;
  padding: 0 12px;
  border-radius: 8px;
  background: #212121;
  color: #fafafa;
  font-size: 14.5px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
}
.foleio-avail-tz-sep {
  color: #828282;
}
.foleio-avail-title {
  margin: 0 0 18px;
  color: #828282;
  font-family: var(--font-body), sans-serif;
  font-size: clamp(1.75rem, 3.2vw, 2.496rem);
  font-weight: 500;
  letter-spacing: -0.02em;
  line-height: 1.15;
}
.foleio-avail-card {
  background: #212121;
  border-radius: 10px;
}
.foleio-avail-mgmt {
  padding: 14px 16px 16px;
  margin-bottom: 18px;
}
.foleio-avail-mgmt-date {
  margin: 0 0 12px;
  color: #adadad;
  font-size: 13px;
  font-weight: 500;
}
.foleio-avail-pick-hint {
  margin: 0 0 18px;
  color: #828282;
  font-size: 13px;
  font-weight: 500;
}
.foleio-avail-mgmt-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.foleio-avail-mgmt-copy {
  min-width: 0;
}
.foleio-avail-mgmt-label {
  margin: 0;
  color: #fafafa;
  font-size: 15px;
  font-weight: 500;
}
.foleio-avail-mgmt-hint {
  margin: 4px 0 0;
  color: #828282;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.35;
}
.foleio-avail-time-block {
  padding-top: 14px;
}
.foleio-avail-time-block > .foleio-avail-mgmt-label {
  margin-bottom: 10px;
}
.foleio-avail-time-modes {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border-radius: 10px;
  background: #1a1816;
  width: fit-content;
}
.foleio-avail-time-mode {
  height: 32px;
  padding: 0 14px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #adadad;
  font-family: var(--font-body), sans-serif;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.foleio-avail-time-mode.is-active {
  background: #2b2b2b;
  color: #fff;
}
.foleio-avail-time-range {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  margin-top: 12px;
  flex-wrap: wrap;
}
.foleio-avail-time-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 120px;
  color: #828282;
  font-size: 12px;
  font-weight: 500;
}
.foleio-avail-time-field input[type='time'] {
  height: 38px;
  padding: 0 10px;
  border: none;
  border-radius: 8px;
  background: #2b2b2b;
  color: #fafafa;
  font-family: var(--font-body), sans-serif;
  font-size: 14px;
  font-weight: 500;
  color-scheme: dark;
}
.foleio-avail-time-field input[type='time']:focus {
  outline: 1px solid rgba(255, 255, 255, 0.18);
}
.foleio-avail-time-to {
  color: #828282;
  font-size: 13px;
  font-weight: 500;
  padding-bottom: 10px;
}
.foleio-avail-time-full-hint {
  margin: 12px 0 0;
  color: #828282;
  font-size: 12px;
  font-weight: 500;
}
.foleio-avail-calendar {
  padding: 14px 14px 12px;
  margin-bottom: 12px;
}
.foleio-avail-cal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.foleio-avail-cal-month {
  margin: 0;
  color: #fafafa;
  font-family: var(--font-body), sans-serif;
  font-size: 16px;
  font-weight: 500;
}
.foleio-avail-cal-nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: #2b2b2b;
  color: #fafafa;
  cursor: pointer;
}
.foleio-avail-cal-nav:hover { background: #333; }
.foleio-avail-cal-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 6px;
  color: #828282;
  font-size: 11px;
  font-weight: 600;
  text-align: center;
  letter-spacing: 0.02em;
}
.foleio-avail-cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}
.foleio-avail-cal-pad { min-height: 38px; }
.foleio-avail-cal-day {
  min-height: 38px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: #2b2b2b;
  color: #fafafa;
  font-family: var(--font-body), sans-serif;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
}
.foleio-avail-cal-day:hover:not(:disabled) {
  border-color: rgba(255, 255, 255, 0.16);
}
.foleio-avail-cal-day.is-today:not(.is-selected) {
  border-color: rgba(255, 255, 255, 0.28);
}
.foleio-avail-cal-day.is-active:not(.is-selected):not(.is-off) {
  border-color: rgba(255, 255, 255, 0.55);
  background: #333;
}
.foleio-avail-cal-day.is-selected {
  background: #fff;
  color: #111;
}
.foleio-avail-cal-day.is-off {
  background: transparent;
  border-color: rgba(252, 165, 165, 0.22);
  color: #826868;
  text-decoration: line-through;
}
.foleio-avail-cal-day.is-past,
.foleio-avail-cal-day:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}
.foleio-avail-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 12px;
  color: #828282;
  font-size: 12px;
  font-weight: 500;
}
.foleio-avail-legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.foleio-avail-cal-day.is-booked:not(.is-selected) {
  border-color: rgba(255, 255, 255, 0.45);
  background: #333;
  box-shadow: inset 0 -2px 0 0 #fff;
}
.foleio-avail-legend-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #2b2b2b;
}
.foleio-avail-legend-dot.is-booked {
  background: #fff;
  box-shadow: 0 0 0 2px #333;
}
.foleio-avail-legend-dot.is-selected { background: #fff; }
.foleio-avail-legend-dot.is-off { background: #826868; }
.foleio-avail-legend-dot.is-past { background: #3a3a3a; }
.foleio-avail-section-label {
  margin: 18px 0 10px;
  color: #fafafa;
  font-size: 14.64px;
  font-weight: 500;
}
.foleio-avail-options {
  padding: 8px 14px 10px;
  margin-bottom: 18px;
}
.foleio-avail-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 40px;
  padding: 8px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.foleio-avail-option:first-child { border-top: none; }
.foleio-avail-option-left {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: #adadad;
  font-size: 16px;
  font-weight: 500;
}
.foleio-avail-option-value {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  color: #adadad;
  font-family: var(--font-body), sans-serif;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
}
.foleio-avail-toggle {
  width: 40px;
  height: 22px;
  padding: 2px;
  border: none;
  border-radius: 999px;
  background: #d1d5db;
  cursor: pointer;
}
.foleio-avail-toggle span,
.foleio-avail-toggle-knob {
  display: block;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(17, 24, 39, 0.18);
  transition: transform 0.15s ease, background 0.15s ease;
}
.foleio-avail-toggle.is-on {
  background: #22c55e;
}
.foleio-avail-toggle.is-on span,
.foleio-avail-toggle.is-on .foleio-avail-toggle-knob {
  transform: translateX(18px);
  background: #ffffff;
}
.foleio-avail-capacity-input {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 0 8px;
  color: #adadad;
  font-size: 13px;
  font-weight: 500;
}
.foleio-avail-capacity-input input {
  width: 88px;
  height: 34px;
  border: none;
  border-radius: 8px;
  background: #1a1816;
  color: #f4f4f5;
  padding: 0 10px;
  font-family: var(--font-body), sans-serif;
  font-size: 14px;
  font-weight: 500;
}
.foleio-avail-capacity-input input:focus {
  outline: 1px solid rgba(255, 255, 255, 0.18);
}
.foleio-avail-submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 44px;
  border: 1px solid #fff;
  border-radius: 9px;
  background: #fff;
  color: #001035;
  font-family: var(--font-body), sans-serif;
  font-size: 18px;
  font-weight: 500;
  letter-spacing: 0.02em;
  cursor: pointer;
}
.foleio-avail-submit:hover { opacity: 0.94; }
.foleio-avail-submit:disabled {
  opacity: 0.5;
  pointer-events: none;
}
.foleio-avail-message {
  margin: 12px 0 0;
  font-size: 13px;
  font-weight: 500;
}
.foleio-avail-message.is-ok { color: #86efac; }
.foleio-avail-message.is-err { color: #fca5a5; }
.foleio-avail-saved { margin-top: 22px; }
.foleio-avail-saved-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.foleio-avail-saved-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #212121;
  color: #f4f4f5;
  font-size: 14px;
  font-weight: 500;
}
.foleio-avail-saved-row.is-off {
  color: #fca5a5;
}
.foleio-avail-saved-meta {
  margin-left: auto;
  color: #adadad;
  font-size: 12px;
}

.foleio-dash-settings {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 560px;
}
.foleio-dash-settings-stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.foleio-dash-avatar-row {
  display: flex;
  align-items: center;
  gap: 16px;
}
.foleio-dash-avatar {
  position: relative;
  width: 88px;
  height: 88px;
  flex-shrink: 0;
  border-radius: 999px;
  overflow: hidden;
  cursor: pointer;
  background: #2b2b2b;
}
.foleio-dash-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.foleio-dash-avatar-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: rgba(0, 0, 0, 0.5);
  opacity: 0;
  transition: opacity 0.15s ease;
  color: #fff;
  font-size: 11px;
  font-weight: 500;
}
.foleio-dash-avatar:hover .foleio-dash-avatar-overlay,
.foleio-dash-avatar.is-busy .foleio-dash-avatar-overlay {
  opacity: 1;
}
.foleio-dash-avatar-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.foleio-dash-avatar-meta button {
  align-self: flex-start;
  padding: 0;
  border: none;
  background: none;
  color: #f4f4f5;
  font-family: var(--font-body), sans-serif;
  font-size: 13px;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}
.foleio-dash-avatar-meta button:hover { opacity: 0.85; }
.foleio-dash-url-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.foleio-dash-url-strip {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 10px;
  background: #1a1816;
  color: #f4f4f5;
  font-size: 13px;
  font-weight: 500;
}
.foleio-dash-url-strip span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.foleio-dash-url-strip svg,
.foleio-dash-icon-btn svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: #adadad;
}
.foleio-dash-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border: none;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  color: #adadad;
  cursor: pointer;
  text-decoration: none;
}
.foleio-dash-icon-btn:hover {
  color: #f4f4f5;
  opacity: 0.92;
}
.foleio-dash-share-thumb {
  position: relative;
  width: 160px;
  max-width: 100%;
  aspect-ratio: 9 / 16;
  overflow: hidden;
  border-radius: 14px;
  cursor: pointer;
  background: #1a1816;
}
.foleio-dash-share-thumb-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
  opacity: 0;
  transition: opacity 0.15s ease;
}
.foleio-dash-share-thumb:hover .foleio-dash-share-thumb-overlay {
  opacity: 1;
}
.foleio-dash-share-thumb-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 8px;
  background: #fff;
  color: #001035;
  font-size: 11px;
  font-weight: 600;
}
.foleio-dash-select {
  display: block;
  width: 100%;
  padding: 12px 14px;
  border: none;
  border-radius: 10px;
  background: #1a1816;
  color: #f4f4f5;
  font-family: var(--font-body), sans-serif;
  font-size: 14px;
  font-weight: 500;
  outline: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23adadad' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 40px;
}
.foleio-dash-select:focus {
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.16);
}
.foleio-dash-select option {
  background: #212121;
  color: #f4f4f5;
}
.foleio-dash-field-hint {
  margin: 0;
  color: #828282;
  font-size: 12px;
  font-weight: 500;
}
.foleio-dash-link-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border-radius: 10px;
  background: #1a1816;
}
.foleio-dash-link-row.is-off {
  opacity: 0.55;
}
.foleio-dash-link-main {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  color: #f4f4f5;
}
.foleio-dash-link-main svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: #adadad;
}
.foleio-dash-link-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.foleio-dash-link-copy strong {
  font-size: 14px;
  font-weight: 500;
  color: #f4f4f5;
}
.foleio-dash-link-copy span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 220px;
  color: #828282;
  font-size: 12px;
  font-weight: 500;
}
.foleio-dash-link-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.foleio-dev-support-banner {
  margin-bottom: 14px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(147, 197, 253, 0.12);
  color: #93c5fd;
  font-family: var(--font-body), sans-serif;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.45;
}
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 60;
  width: min(240px, calc(100vw - 24px));
  padding: 10px;
  border-radius: 12px;
  background: #2b2b2b;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.4);
  pointer-events: auto;
}
.foleio-setup-tour-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}
.foleio-setup-tour-title {
  margin: 0;
  color: #fafafa;
  font-family: var(--font-body), sans-serif;
  font-size: 12px;
  font-weight: 600;
}
.foleio-setup-tour-meta {
  margin: 2px 0 0;
  color: #828282;
  font-family: var(--font-body), sans-serif;
  font-size: 11px;
  font-weight: 500;
}
.foleio-setup-tour-actions {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}
.foleio-setup-tour-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #adadad;
  cursor: pointer;
  flex-shrink: 0;
}
.foleio-setup-tour-close:hover {
  color: #fafafa;
  background: rgba(255, 255, 255, 0.06);
}
.foleio-setup-tour-close svg {
  width: 14px;
  height: 14px;
}
.foleio-setup-tour-next {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 8px;
  margin-bottom: 4px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  text-decoration: none;
  color: #f4f4f5;
}
.foleio-setup-tour-next:hover {
  background: rgba(255, 255, 255, 0.08);
}
.foleio-setup-tour-next-label {
  flex: 1;
  min-width: 0;
  font-family: var(--font-body), sans-serif;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.3;
}
.foleio-setup-tour-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  padding: 4px 4px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #828282;
  font-family: var(--font-body), sans-serif;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
}
.foleio-setup-tour-toggle:hover {
  color: #fafafa;
}
.foleio-setup-tour-toggle svg {
  width: 14px;
  height: 14px;
}
.foleio-setup-tour-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 4px;
  max-height: 180px;
  overflow: auto;
}
.foleio-setup-tour-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border-radius: 8px;
  text-decoration: none;
  color: #f4f4f5;
  transition: background 0.15s ease;
}
.foleio-setup-tour-item:hover {
  background: rgba(255, 255, 255, 0.06);
}
.foleio-setup-tour-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: #adadad;
  font-family: var(--font-body), sans-serif;
  font-size: 10px;
  font-weight: 600;
  flex-shrink: 0;
}
.foleio-setup-tour-check {
  width: 18px;
  height: 18px;
  color: #86efac;
  flex-shrink: 0;
}
.foleio-setup-tour-item.is-done .foleio-setup-tour-label {
  color: #adadad;
}
.foleio-setup-tour-label {
  flex: 1;
  min-width: 0;
  font-family: var(--font-body), sans-serif;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.3;
}
.foleio-setup-tour-arrow {
  width: 14px;
  height: 14px;
  color: #828282;
  flex-shrink: 0;
}
.foleio-setup-tour-item:hover .foleio-setup-tour-arrow,
.foleio-setup-tour-next:hover .foleio-setup-tour-arrow {
  color: #fafafa;
}
.foleio-setup-tour-fab {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 60;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  background: #2b2b2b;
  color: #f4f4f5;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.4);
  cursor: pointer;
}
.foleio-setup-tour-fab:hover {
  background: #333;
  color: #fff;
}
.foleio-setup-tour-fab svg {
  width: 18px;
  height: 18px;
}
.foleio-setup-tour-fab-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: #86efac;
  color: #14532d;
  font-family: var(--font-body), sans-serif;
  font-size: 10px;
  font-weight: 700;
  line-height: 16px;
  text-align: center;
}
@media (max-width: 640px) {
  .foleio-setup-tour,
  .foleio-setup-tour-fab {
    right: 10px;
    bottom: 10px;
  }
}

.foleio-dash-policy {
  color: #adadad;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.6;
}
.foleio-dash-policy h2 {
  margin: 22px 0 8px;
  color: #fafafa;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.02em;
}
.foleio-dash-policy-fee-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 8px;
  flex-wrap: wrap;
}
.foleio-dash-policy-fee-heading h2 {
  margin: 0;
}
.foleio-dash-policy-fee-heading .foleio-dash-btn-outline {
  flex-shrink: 0;
  padding: 8px 12px;
  font-size: 13px;
}
.foleio-dash-policy h2:first-child {
  margin-top: 0;
}
.foleio-dash-policy p {
  margin: 0 0 12px;
}
.foleio-dash-policy ul {
  margin: 0 0 12px;
  padding-left: 18px;
}
.foleio-dash-policy li {
  margin-bottom: 6px;
}
.foleio-dash-policy strong {
  color: #f4f4f5;
  font-weight: 600;
}
.foleio-dash-policy a {
  color: #f4f4f5;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.foleio-dash-fee-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 16px 0 18px;
}
.foleio-dash-fee-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.foleio-dash-fee-row:last-child {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.foleio-dash-fee-plan {
  margin: 0;
  color: #fafafa;
  font-size: 15px;
  font-weight: 600;
}
.foleio-dash-fee-price {
  margin: 4px 0 0;
  color: #828282;
  font-size: 13px;
  font-weight: 500;
}
.foleio-dash-fee-rate {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  text-align: right;
  gap: 2px;
}
.foleio-dash-fee-rate strong {
  color: #fafafa;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.02em;
}
.foleio-dash-fee-row.is-pro .foleio-dash-fee-rate strong {
  color: #86efac;
}
.foleio-dash-fee-rate span {
  color: #adadad;
  font-size: 12px;
  font-weight: 500;
}
.foleio-dash-fee-note {
  color: #828282 !important;
}
.foleio-dash-policy-more {
  margin-top: 8px;
  padding-top: 4px;
}
.foleio-dash-policy-more-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: none;
  background: transparent;
  color: #fafafa;
  font-family: var(--font-body), sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.foleio-dash-policy-more-btn:hover {
  color: #fff;
}
.foleio-dash-policy-more-btn svg {
  width: 16px;
  height: 16px;
}
.foleio-dash-policy-full {
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
`;

interface CreatorAppShellProps {
  children: React.ReactNode;
  creator?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    bannerUrl?: string | null;
    category?: string | null;
    platformPlan?: string | null;
    platformSubscriptionActive?: boolean | null;
    fixedBookingsEnabled?: boolean | null;
    customQuotesEnabled?: boolean | null;
    shopEnabled?: boolean | null;
  } | null;
  supportMode?: boolean;
  title?: string | null;
}

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, tourId: 'dashboard' },
  { href: '/bookings', label: 'Bookings', icon: CalendarDays, tourId: 'bookings' },
  { href: '/invoices', label: 'Quotes & Invoice', icon: FileText, tourId: 'invoices' },
  { href: '/shop', label: 'Shop', icon: ShoppingBag, tourId: 'shop' },
  { href: '/earnings', label: 'Earnings', icon: Wallet, tourId: 'earnings' },
] as const;

function isCreatorNavActive(pathname: string, href: string) {
  if (href === '/dashboard') {
    return pathname === '/dashboard' || pathname.startsWith('/dashboard/');
  }
  if (href === '/shop') {
    return pathname === '/shop' || pathname.startsWith('/services/shop');
  }
  if (href === '/earnings') {
    return pathname.startsWith('/earnings') || pathname.startsWith('/analytics');
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function CreatorContentHeader() {
  return (
    <header className="foleio-creator-content-header">
      <h1 className="foleio-creator-content-title">Creator Dashboard</h1>
      <div className="foleio-creator-content-actions">
        <Link
          href="/settings?tab=notifications"
          className="foleio-creator-content-action"
          aria-label="Notifications"
          data-tour="notifications"
        >
          <Bell strokeWidth={1.5} />
        </Link>
      </div>
    </header>
  );
}

export function CreatorAppShell({
  children,
  creator,
  supportMode = false,
  title: _title,
}: CreatorAppShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const navMenuRef = useRef<HTMLDivElement>(null);
  const navMenuButtonRef = useRef<HTMLButtonElement>(null);
  const [navMenuOpen, setNavMenuOpen] = useState(false);
  const [navMenuPos, setNavMenuPos] = useState<{ top: number; left: number } | null>(
    null
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('foleio-creator-sidebar-collapsed');
      if (stored === '1') setSidebarCollapsed(true);
    } catch {
      // ignore
    }
  }, []);

  function toggleSidebarCollapsed() {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(
          'foleio-creator-sidebar-collapsed',
          next ? '1' : '0'
        );
      } catch {
        // ignore
      }
      return next;
    });
  }
  const visibleNav = NAV.filter((item) => {
    if (item.href === '/shop') return creator?.shopEnabled !== false;
    return true;
  });
  const settingsTab = searchParams.get('tab');
  const onSettings =
    pathname === '/settings' || pathname.startsWith('/settings/');
  const profileActive = onSettings && (!settingsTab || settingsTab === 'profile');
  const settingsActive =
    onSettings && Boolean(settingsTab) && settingsTab !== 'profile';

  useEffect(() => {
    setNavMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!navMenuOpen) {
      setNavMenuPos(null);
      return undefined;
    }

    function placeMenu() {
      const button = navMenuButtonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const width = 220;
      const left = Math.min(
        Math.max(12, rect.left),
        window.innerWidth - width - 12
      );
      setNavMenuPos({
        top: rect.bottom + 8,
        left,
      });
    }

    placeMenu();

    let removeOutside: (() => void) | undefined;
    // Defer outside-close so the opening tap doesn't immediately dismiss.
    const timer = window.setTimeout(() => {
      function onPointerDown(event: PointerEvent) {
        const target = event.target as Node | null;
        if (!target) return;
        if (navMenuRef.current?.contains(target)) return;
        if (navMenuButtonRef.current?.contains(target)) return;
        setNavMenuOpen(false);
      }
      document.addEventListener('pointerdown', onPointerDown);
      removeOutside = () => document.removeEventListener('pointerdown', onPointerDown);
    }, 0);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setNavMenuOpen(false);
    }

    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', placeMenu);
    window.addEventListener('scroll', placeMenu, true);

    return () => {
      window.clearTimeout(timer);
      removeOutside?.();
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', placeMenu);
      window.removeEventListener('scroll', placeMenu, true);
    };
  }, [navMenuOpen]);

  return (
    <div className="foleio-auth-root foleio-creator-root relative flex min-h-screen flex-col">
      <style
        // Large inline CSS can disagree between SSR and the client chunk during HMR;
        // styles are static and safe to skip attribute reconciliation.
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: creatorShellCss }}
      />

      <div className="foleio-auth-shell">
        <aside
          className={`foleio-creator-rail${sidebarCollapsed ? ' is-collapsed' : ''}`}
          aria-label="Creator navigation"
        >
          <div className="foleio-creator-rail-top">
            <nav className="foleio-creator-rail-nav">
              <div className="foleio-creator-rail-section-row">
                {!sidebarCollapsed ? (
                  <div className="foleio-creator-rail-section">Workspace</div>
                ) : null}
                <button
                  type="button"
                  className="foleio-creator-rail-toggle"
                  aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  aria-expanded={!sidebarCollapsed}
                  onClick={toggleSidebarCollapsed}
                >
                  {sidebarCollapsed ? (
                    <PanelLeftOpen strokeWidth={1.5} />
                  ) : (
                    <PanelLeftClose strokeWidth={1.5} />
                  )}
                </button>
              </div>
              {visibleNav.map((item) => {
                const Icon = item.icon;
                const active = isCreatorNavActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-tour={item.tourId}
                    className={`foleio-creator-rail-link${active ? ' is-active' : ''}`}
                    aria-label={item.label}
                    title={item.label}
                  >
                    <Icon strokeWidth={1.5} />
                    <span className="foleio-creator-rail-link-label">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="foleio-creator-rail-footer">
            {!sidebarCollapsed ? (
              <div className="foleio-creator-rail-section">Account</div>
            ) : null}
            <Link
              href="/settings"
              className={`foleio-creator-rail-link${profileActive ? ' is-active' : ''}`}
              data-tour="profile"
              aria-label="Profile"
              title="Profile"
            >
              <UserRound strokeWidth={1.5} />
              <span className="foleio-creator-rail-link-label">Profile</span>
            </Link>
            <Link
              href="/settings?tab=offerings"
              className={`foleio-creator-rail-link${settingsActive ? ' is-active' : ''}`}
              data-tour="settings"
              aria-label="Settings"
              title="Settings"
            >
              <Settings strokeWidth={1.5} />
              <span className="foleio-creator-rail-link-label">Settings</span>
            </Link>
          </div>
        </aside>

        <header className="foleio-auth-topbar relative z-30">
          <nav className="foleio-auth-topbar-nav" aria-label="Creator">
            <div className="foleio-auth-topbar-nav-links">
              {visibleNav.map((item) => {
                const Icon = item.icon;
                const active = isCreatorNavActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-tour={item.tourId}
                    className={active ? 'is-active' : undefined}
                  >
                    <Icon strokeWidth={1.5} />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="foleio-auth-topbar-mobile-menu">
              <button
                ref={navMenuButtonRef}
                type="button"
                className="foleio-auth-topbar-icon"
                aria-label={navMenuOpen ? 'Close menu' : 'Open menu'}
                aria-haspopup="menu"
                aria-expanded={navMenuOpen}
                onClick={(event) => {
                  event.stopPropagation();
                  event.preventDefault();
                  if (navMenuOpen) {
                    setNavMenuOpen(false);
                    return;
                  }
                  const button = event.currentTarget;
                  const rect = button.getBoundingClientRect();
                  const width = 220;
                  setNavMenuPos({
                    top: rect.bottom + 8,
                    left: Math.min(
                      Math.max(12, rect.left),
                      window.innerWidth - width - 12
                    ),
                  });
                  setNavMenuOpen(true);
                }}
              >
                {navMenuOpen ? (
                  <X strokeWidth={1.5} />
                ) : (
                  <Menu strokeWidth={1.5} />
                )}
              </button>
              {navMenuOpen ? (
                <div
                  ref={navMenuRef}
                  className="foleio-auth-topbar-mobile-pop"
                  role="menu"
                  style={{
                    top: navMenuPos?.top ?? 56,
                    left: navMenuPos?.left ?? 12,
                  }}
                >
                  {visibleNav.map((item) => {
                    const Icon = item.icon;
                    const active = isCreatorNavActive(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        role="menuitem"
                        data-tour={item.tourId}
                        className={active ? 'is-active' : undefined}
                        onClick={() => setNavMenuOpen(false)}
                      >
                        <Icon strokeWidth={1.5} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </nav>
          <div className="foleio-auth-topbar-actions">
            <Link
              href="/settings?tab=notifications"
              className="foleio-auth-topbar-icon"
              aria-label="Notifications"
              data-tour="notifications"
            >
              <Bell strokeWidth={1.5} />
            </Link>
            <Link
              href="/settings"
              className={`foleio-auth-topbar-icon${
                pathname === '/settings' || pathname.startsWith('/settings/')
                  ? ' is-active'
                  : ''
              }`}
              aria-label="Settings"
              data-tour="settings"
            >
              <Settings strokeWidth={1.5} />
            </Link>
          </div>
        </header>

        <main className="foleio-auth-main relative flex-1">
          <CreatorContentHeader />
          <div className="foleio-creator-content-surface">
            <div className="foleio-creator-content-body">
              {supportMode ? (
                <div className="foleio-dev-support-banner" role="status">
                  Developer support mode — earnings, payouts, billing, and security are blocked.
                  Access expires 7 days after accept.
                </div>
              ) : null}
              {children}
              <AuthLegalFooter tone="light" />
            </div>
          </div>
        </main>
      </div>
      <CreatorSetupTourCard creatorId={creator?.id} />
    </div>
  );
}
