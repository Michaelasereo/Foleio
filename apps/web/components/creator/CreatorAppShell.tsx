'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BadgeCheck,
  BarChart3,
  Bell,
  CalendarDays,
  Copy,
  ImageOff,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Settings,
  UserRound,
  Wallet,
  X,
} from 'lucide-react';
import { AuthLegalFooter } from '@/components/auth/AuthLegalFooter';
import { authCss } from '@/components/auth/styles';
import {
  BusinessCoverCard,
  removeCreatorBanner,
} from '@/components/creator/BusinessCoverCard';
import { CreatorAvatar } from '@/components/creator/CreatorAvatar';
import { useToast } from '@/components/ui/use-toast';
import { INDUSTRY_OPTIONS } from '@/lib/constants/industries';
import { subscribeAvatarUpdated } from '@/lib/creator/profile-live';

const creatorShellCss = `
${authCss}

body:has(.foleio-creator-root) footer:not(.foleio-auth-legal) {
  display: none !important;
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
}
.foleio-auth-topbar-mobile-pop {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 50;
  min-width: 200px;
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
@media (max-width: 767px) {
  .foleio-auth-topbar-nav-links {
    display: none;
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
.foleio-dash-header + .foleio-dash-tabs {
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
  border: none;
  border-radius: 10px;
  background: #1a1816;
  color: #f4f4f5;
  font-family: var(--font-body), sans-serif;
  font-size: 14px;
  font-weight: 500;
  resize: vertical;
}
.foleio-dash-textarea:focus {
  outline: 1px solid rgba(255, 255, 255, 0.18);
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
  background: #212121;
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
  background: #212121;
  font-family: var(--font-body), sans-serif;
  box-shadow: -16px 0 40px rgba(0, 0, 0, 0.35);
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
  border-color: rgba(255, 255, 255, 0.08) !important;
}
.foleio-dash-availability .bg-white,
.foleio-dash-availability .bg-card,
.foleio-dash-availability .bg-background {
  background: #1a1816 !important;
  color: #f4f4f5 !important;
}
.foleio-dash-availability .text-muted-foreground {
  color: #adadad !important;
}
.foleio-dash-availability .border,
.foleio-dash-availability .border-border {
  border-color: rgba(255, 255, 255, 0.08) !important;
}

.foleio-dash-services {
  margin-top: 4px;
}
.foleio-dash-services .rounded-lg,
.foleio-dash-services .rounded-md,
.foleio-dash-services .rounded-xl,
.foleio-dash-services .rounded-2xl {
  border-color: rgba(255, 255, 255, 0.08) !important;
}
.foleio-dash-services .bg-white,
.foleio-dash-services .bg-card,
.foleio-dash-services .bg-background,
.foleio-dash-services [class*="bg-card"] {
  background: #212121 !important;
  color: #f4f4f5 !important;
}
.foleio-dash-services .text-muted-foreground,
.foleio-dash-services [class*="text-muted"] {
  color: #adadad !important;
}
.foleio-dash-services .border,
.foleio-dash-services .border-border {
  border-color: rgba(255, 255, 255, 0.08) !important;
}
.foleio-dash-services input,
.foleio-dash-services textarea,
.foleio-dash-services select {
  background: #1a1816 !important;
  border-color: rgba(255, 255, 255, 0.1) !important;
  color: #f4f4f5 !important;
}
.foleio-dash-services label {
  color: #adadad !important;
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
  background: #2b2b2b;
  cursor: pointer;
}
.foleio-avail-toggle span {
  display: block;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: #adadad;
  transition: transform 0.15s ease, background 0.15s ease;
}
.foleio-avail-toggle.is-on {
  background: hsl(var(--accent));
}
.foleio-avail-toggle.is-on span {
  transform: translateX(18px);
  background: #fff;
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
  } | null;
}

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, tourId: 'dashboard' },
  { href: '/bookings', label: 'Bookings', icon: CalendarDays, tourId: 'bookings' },
  { href: '/earnings', label: 'Earnings', icon: Wallet, tourId: 'earnings' },
  { href: '/analytics', label: 'Analytics', icon: BarChart3, tourId: 'analytics' },
] as const;

function categoryHashtag(category?: string | null) {
  const raw = category?.trim();
  if (!raw) return '';
  const match = INDUSTRY_OPTIONS.find((item) => item.value === raw);
  const label = match?.label || raw;
  const slug = label.replace(/[^a-zA-Z0-9]+/g, '');
  return slug ? `#${slug}` : '';
}

function CreatorShellProfile({
  creator,
  avatarUrl,
  hasBanner,
  onBannerRemoved,
}: {
  creator?: CreatorAppShellProps['creator'];
  avatarUrl?: string | null;
  hasBanner?: boolean;
  onBannerRemoved?: () => void;
}) {
  const { toast } = useToast();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [removingBanner, setRemovingBanner] = useState(false);
  const displayName = creator?.displayName?.trim() || creator?.username || '';
  const hashtag = categoryHashtag(creator?.category);

  const profileUrl = (() => {
    if (!creator?.username) return '';
    const base =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '') ||
      (typeof window !== 'undefined' ? window.location.origin.replace(/\/+$/, '') : '');
    return base ? `${base}/creator/${creator.username}` : `/creator/${creator.username}`;
  })();

  useEffect(() => {
    if (!menuOpen) return undefined;

    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  async function copyProfileUrl() {
    if (!profileUrl) return;
    try {
      const absolute =
        profileUrl.startsWith('http') || typeof window === 'undefined'
          ? profileUrl
          : `${window.location.origin}${profileUrl}`;
      await navigator.clipboard.writeText(absolute);
      toast({ title: 'Profile URL copied' });
    } catch {
      toast({
        title: 'Could not copy',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setMenuOpen(false);
    }
  }

  async function handleRemoveBanner() {
    if (removingBanner) return;
    setRemovingBanner(true);
    try {
      await removeCreatorBanner();
      onBannerRemoved?.();
      toast({ title: 'Banner removed' });
    } catch (error) {
      toast({
        title: 'Could not remove',
        description:
          error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setRemovingBanner(false);
      setMenuOpen(false);
    }
  }

  return (
    <div className="foleio-auth-stub" data-tour="creator-profile">
      <div className="foleio-auth-stub-main">
        <div
          className={
            creator ? 'foleio-auth-stub-thumb is-avatar' : 'foleio-auth-stub-thumb'
          }
        >
          {creator ? (
            <CreatorAvatar
              src={avatarUrl ?? creator.avatarUrl}
              name={displayName}
              size={42}
            />
          ) : null}
        </div>
        {displayName ? (
          <div className="foleio-auth-stub-meta">
            <p className="foleio-auth-stub-name">{displayName}</p>
            {hashtag ? (
              <p className="foleio-auth-stub-category">{hashtag}</p>
            ) : null}
          </div>
        ) : null}
        {creator ? (
          <div className="foleio-auth-stub-menu" ref={menuRef}>
            <button
              type="button"
              className="foleio-auth-stub-menu-btn"
              aria-label="Profile actions"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <MoreHorizontal strokeWidth={1.75} />
            </button>
            {menuOpen ? (
              <div className="foleio-auth-stub-menu-pop" role="menu">
                <button
                  type="button"
                  className="foleio-auth-stub-menu-item"
                  role="menuitem"
                  onClick={copyProfileUrl}
                >
                  <Copy strokeWidth={1.75} />
                  Copy profile URL
                </button>
                {hasBanner ? (
                  <button
                    type="button"
                    className="foleio-auth-stub-menu-item"
                    role="menuitem"
                    disabled={removingBanner}
                    onClick={() => void handleRemoveBanner()}
                  >
                    <ImageOff strokeWidth={1.75} />
                    {removingBanner ? 'Removing…' : 'Remove banner image'}
                  </button>
                ) : null}
                <Link
                  href="/settings"
                  className="foleio-auth-stub-menu-item"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                >
                  <UserRound strokeWidth={1.75} />
                  Go to profile settings
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <div
        className={`foleio-auth-stub-badge${
          Boolean(creator?.platformSubscriptionActive) &&
          ['PRO', 'PREMIUM'].includes((creator?.platformPlan || '').toUpperCase())
            ? ' is-pro'
            : ''
        }`}
        aria-label={
          Boolean(creator?.platformSubscriptionActive) &&
          ['PRO', 'PREMIUM'].includes((creator?.platformPlan || '').toUpperCase())
            ? 'Pro verified'
            : 'Verified'
        }
      >
        <BadgeCheck className="h-6 w-6" strokeWidth={1.5} />
      </div>
    </div>
  );
}

export function CreatorAppShell({ children, creator }: CreatorAppShellProps) {
  const pathname = usePathname();
  const navMenuRef = useRef<HTMLDivElement>(null);
  const [navMenuOpen, setNavMenuOpen] = useState(false);
  const [bannerUrl, setBannerUrl] = useState<string | null>(
    creator?.bannerUrl ?? null
  );
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    creator?.avatarUrl ?? null
  );

  useEffect(() => {
    setBannerUrl(creator?.bannerUrl ?? null);
  }, [creator?.bannerUrl]);

  useEffect(() => {
    setAvatarUrl(creator?.avatarUrl ?? null);
  }, [creator?.avatarUrl]);

  useEffect(() => {
    return subscribeAvatarUpdated(setAvatarUrl);
  }, []);

  useEffect(() => {
    setNavMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!navMenuOpen) return undefined;

    function onPointerDown(event: MouseEvent) {
      if (!navMenuRef.current?.contains(event.target as Node)) {
        setNavMenuOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setNavMenuOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [navMenuOpen]);

  return (
    <div className="foleio-auth-root foleio-creator-root relative flex min-h-screen flex-col">
      <style dangerouslySetInnerHTML={{ __html: creatorShellCss }} />

      <div className="foleio-auth-shell">
        <header className="foleio-auth-topbar relative z-30">
          <nav className="foleio-auth-topbar-nav" aria-label="Creator">
            <div className="foleio-auth-topbar-nav-links">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active =
                  item.href === '/dashboard'
                    ? pathname === '/dashboard'
                    : pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
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

            <div className="foleio-auth-topbar-mobile-menu" ref={navMenuRef}>
              <button
                type="button"
                className="foleio-auth-topbar-icon"
                aria-label={navMenuOpen ? 'Close menu' : 'Open menu'}
                aria-haspopup="menu"
                aria-expanded={navMenuOpen}
                onClick={() => setNavMenuOpen((open) => !open)}
              >
                {navMenuOpen ? (
                  <X strokeWidth={1.5} />
                ) : (
                  <Menu strokeWidth={1.5} />
                )}
              </button>
              {navMenuOpen ? (
                <div className="foleio-auth-topbar-mobile-pop" role="menu">
                  {NAV.map((item) => {
                    const Icon = item.icon;
                    const active =
                      item.href === '/dashboard'
                        ? pathname === '/dashboard'
                        : pathname === item.href ||
                          pathname.startsWith(`${item.href}/`);
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
          <div className="foleio-auth-columns">
            <div className="foleio-auth-left">
              <BusinessCoverCard
                bannerUrl={bannerUrl}
                editable={Boolean(creator)}
                onBannerChange={setBannerUrl}
              />
              <CreatorShellProfile
                creator={creator}
                avatarUrl={avatarUrl}
                hasBanner={Boolean(bannerUrl)}
                onBannerRemoved={() => setBannerUrl(null)}
              />
            </div>

            <div className="foleio-auth-right">
              {children}
              <AuthLegalFooter />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
