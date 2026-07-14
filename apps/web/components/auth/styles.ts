export const authInputClass = 'foleio-auth-input';
export const authRowInputClass = 'foleio-auth-row-input';
export const authLabelClass = 'foleio-auth-label';
export const authButtonClass = 'foleio-auth-btn';
export const authLinkClass = 'foleio-auth-link';
export const authMutedClass = 'foleio-auth-muted';

export const authCss = `
.foleio-auth-root {
  min-height: 100vh;
  background: #1a1816;
  color: #ededed;
  font-family: var(--font-body), sans-serif;
  font-weight: 300;
}
.foleio-auth-title {
  color: #828282;
  font-family: var(--font-body), sans-serif;
  font-size: clamp(1.75rem, 3.5vw, 2.496rem);
  font-weight: 500;
  letter-spacing: -0.02em;
  line-height: 1.15;
}
.foleio-auth-sub { color: #8b8f9a; }
.foleio-auth-muted { color: #adadad; }
.foleio-auth-label {
  display: block;
  color: #adadad;
  font-size: 14px;
  font-weight: 500;
}
.foleio-auth-input {
  display: block;
  height: 38px;
  width: 100%;
  background: #212121;
  border: none;
  border-radius: 10px;
  padding: 0 14px;
  color: #f4f4f5;
  font-size: 16.642px;
  font-weight: 500;
  transition: background 0.15s ease;
}
.foleio-auth-input::placeholder { color: #5c6070; }
.foleio-auth-input:focus {
  outline: none;
  background: #212121;
}
.foleio-auth-input:-webkit-autofill,
.foleio-auth-input:-webkit-autofill:focus {
  -webkit-text-fill-color: #f4f4f5;
  -webkit-box-shadow: 0 0 0 1000px #212121 inset;
  caret-color: #f4f4f5;
}
.foleio-auth-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  min-height: 38px;
  height: 38px;
  padding: 0 12px;
  background: #212121;
  border: none;
  border-radius: 10px;
  transition: background 0.15s ease;
}
.foleio-auth-row:focus-within {
  background: #212121;
}
.foleio-auth-row-icon {
  color: #adadad;
  flex-shrink: 0;
}
.foleio-auth-row-input {
  flex: 1 1 auto;
  min-width: 0;
  width: 100%;
  height: 100%;
  background: transparent;
  border: none;
  color: #adadad;
  font-size: 16.642px;
  font-weight: 500;
}
.foleio-auth-row-input::placeholder { color: #adadad; }
.foleio-auth-row-input:focus { outline: none; color: #f4f4f5; }
.foleio-auth-row-input:-webkit-autofill,
.foleio-auth-row-input:-webkit-autofill:focus {
  -webkit-text-fill-color: #f4f4f5;
  -webkit-box-shadow: 0 0 0 1000px #212121 inset;
  caret-color: #f4f4f5;
}
.foleio-auth-row-tall {
  min-height: 60px;
  height: auto;
  align-items: flex-start;
  padding-top: 10px;
  padding-bottom: 10px;
  width: 100%;
  box-sizing: border-box;
}
.foleio-auth-row-field {
  flex: 1 1 auto;
  min-width: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.foleio-auth-row-tall .foleio-auth-row-input {
  height: auto;
  width: 100%;
}
.foleio-auth-username-hint {
  display: block;
  margin-top: 2px;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.28px;
  color: #adadad;
}
.foleio-auth-name-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
@media (max-width: 480px) {
  .foleio-auth-name-row {
    grid-template-columns: 1fr;
  }
}
.foleio-auth-security {
  background: #212121;
  border-radius: 10px;
  overflow: hidden;
}
.foleio-auth-security > * + * {
  position: relative;
}
.foleio-auth-security > * + *::before {
  content: '';
  position: absolute;
  top: 0;
  /* Align with text: 12px pad + 20px icon + 12px gap */
  left: 44px;
  right: 12px;
  height: 1px;
  background: rgba(255, 255, 255, 0.12);
}
.foleio-auth-security-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 40px;
  padding: 0 12px;
}
.foleio-auth-security-input {
  flex: 1;
  min-width: 0;
  height: 40px;
  background: transparent;
  border: none;
  color: #adadad;
  font-size: 16.026px;
  font-weight: 500;
  letter-spacing: 0.32px;
}
.foleio-auth-security-input::placeholder { color: #adadad; }
.foleio-auth-security-input:focus { outline: none; color: #f4f4f5; }
.foleio-auth-eye-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: #adadad;
  cursor: pointer;
}
.foleio-auth-eye-btn:hover { color: #f4f4f5; }
.foleio-auth-section-label {
  font-size: 14.64px;
  font-weight: 500;
  color: #ffffff;
  margin: 0 0 10px;
}
.foleio-auth-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  width: 100%;
  background: #ffffff;
  color: #001035;
  border: 1px solid #000000;
  border-radius: 9px;
  font-weight: 500;
  font-size: 18.03px;
  letter-spacing: 0.36px;
  transition: opacity 0.15s ease;
  margin-top: 8px;
}
.foleio-auth-btn:hover { opacity: 0.92; }
.foleio-auth-btn:disabled { opacity: 0.5; pointer-events: none; }
.foleio-auth-link {
  color: #adadad;
  font-weight: 500;
  text-underline-offset: 4px;
}
.foleio-auth-link:hover { text-decoration: underline; color: #fafafa; }

/* Hide global site footer on auth pages; keep in-layout legal footer */
body:has(.foleio-auth-root) footer:not(.foleio-auth-legal) {
  display: none !important;
}

.foleio-auth-legal {
  display: flex !important;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-top: auto;
  padding: 28px 16px 8px;
  text-align: center;
  position: relative;
  z-index: 10;
}
.foleio-auth-legal-links {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 6px 4px;
  font-size: 12px;
  line-height: 1.4;
}
.foleio-auth-legal-links a {
  color: rgba(250, 250, 250, 0.45);
  text-decoration: none;
  transition: color 0.15s ease;
}
.foleio-auth-legal-links a:hover {
  color: rgba(250, 250, 250, 0.85);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.foleio-auth-legal-sep {
  color: rgba(250, 250, 250, 0.25);
  user-select: none;
  padding: 0 4px;
}
.foleio-auth-legal-copy {
  margin: 0;
  font-size: 12px;
  color: rgba(250, 250, 250, 0.3);
}

/* Top bar + shell */
.foleio-auth-shell {
  width: 100%;
  max-width: 929px;
  margin: 0 auto;
  padding: 18px 24px 48px;
  box-sizing: border-box;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.foleio-auth-topbar {
  width: 100%;
  margin-bottom: 28px;
}
.foleio-auth-topbar-nav {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 16px;
  flex-wrap: wrap;
}
.foleio-auth-topbar-nav span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14.85px;
  font-weight: 500;
  color: #adadad;
  line-height: normal;
  white-space: nowrap;
}
.foleio-auth-topbar-nav svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

/* Two-column layout — always left-aligned inside the centered shell */
.foleio-auth-main {
  width: 100%;
  padding: 0;
}
.foleio-auth-columns {
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
  align-items: start;
  width: 100%;
}
@media (min-width: 900px) {
  .foleio-auth-columns {
    grid-template-columns: minmax(240px, 333px) minmax(0, 542px);
    gap: clamp(24px, 4vw, 54px);
  }
}

.foleio-auth-left {
  width: 100%;
  min-width: 0;
}
.foleio-auth-right {
  width: 100%;
  min-width: 0;
  max-width: 542px;
  display: flex;
  flex-direction: column;
}

.foleio-auth-right > .foleio-auth-legal {
  width: 100%;
  padding-left: 0;
  padding-right: 0;
}

@media (max-width: 899px) {
  .foleio-auth-left {
    max-width: 333px;
  }
}

/* Left column — business cover / skeleton preview */
.foleio-auth-preview {
  position: relative;
  width: 100%;
  aspect-ratio: 333 / 277;
  height: auto;
  min-height: 200px;
  border-radius: 12px;
  background: #212121;
  margin-bottom: 16px;
  padding: 43px 22px;
  box-sizing: border-box;
  overflow: hidden;
}
.foleio-auth-preview.has-image {
  padding: 0;
}
.foleio-auth-preview-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.foleio-auth-preview-bars {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-start;
}
.foleio-auth-preview-bar {
  background: #2b2b2b;
  border-radius: 9px;
  height: 55px;
}
.foleio-auth-preview-bar:nth-child(1) { width: 100%; }
.foleio-auth-preview-bar:nth-child(2) { width: 80%; }
.foleio-auth-preview-bar:nth-child(3) { width: 22%; }
.foleio-auth-preview-upload,
.foleio-auth-preview-remove {
  position: absolute;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 10px;
  background: rgba(26, 24, 22, 0.82);
  color: #f4f4f5;
  cursor: pointer;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: background 0.15s ease, color 0.15s ease;
}
.foleio-auth-preview-upload {
  right: 12px;
  bottom: 12px;
  width: 40px;
  height: 40px;
}
.foleio-auth-preview-remove {
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  color: #adadad;
}
.foleio-auth-preview-upload:hover,
.foleio-auth-preview-remove:hover {
  background: rgba(43, 43, 43, 0.95);
  color: #ffffff;
}
.foleio-auth-preview-upload:disabled {
  opacity: 0.7;
  cursor: wait;
}
.foleio-auth-preview.is-editable:not(.has-image)::after {
  content: '';
  pointer-events: none;
  position: absolute;
  inset: 0;
  border-radius: 12px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
}

.foleio-auth-stub {
  display: flex;
  align-items: center;
  gap: 7px;
}
.foleio-auth-stub-main {
  flex: 1;
  min-width: 0;
  height: 56px;
  background: #212121;
  border-radius: 9px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 13px;
}
.foleio-auth-stub-thumb {
  width: 42px;
  height: 33px;
  border-radius: 4px;
  background: #2b2b2b;
  flex-shrink: 0;
}
.foleio-auth-stub-lines {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.foleio-auth-stub-line {
  height: 10px;
  border-radius: 3px;
  background: #2b2b2b;
}
.foleio-auth-stub-line:nth-child(1) { width: 42px; }
.foleio-auth-stub-line:nth-child(2) { width: 100%; max-width: 188px; }
.foleio-auth-stub-line:nth-child(3) { width: 146px; }
.foleio-auth-stub-badge {
  width: 55px;
  height: 56px;
  border-radius: 9px;
  background: #212121;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #adadad;
}
.foleio-auth-stub-badge.is-pro {
  color: #3b82f6;
}

.foleio-auth-form-stack {
  display: flex;
  flex-direction: column;
  gap: 9px;
  width: 100%;
}
.foleio-auth-form-stack > *,
.foleio-auth-form-stack .space-y-2 {
  width: 100%;
  min-width: 0;
}
.foleio-auth-form-gap {
  margin-top: 18px;
}

/* Verification / status panels */
.foleio-auth-verify {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.foleio-auth-verify-card {
  background: #212121;
  border-radius: 10px;
  padding: 20px 16px;
  text-align: left;
}
.foleio-auth-verify-label {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.foleio-auth-verify-email {
  color: #f4f4f5;
  font-size: 16.642px;
  font-weight: 500;
  word-break: break-all;
}
.foleio-auth-verify-copy {
  color: #adadad;
  font-size: 14.85px;
  font-weight: 500;
  line-height: 1.45;
}
.foleio-auth-verify-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 8px;
}
.foleio-auth-otp {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px;
  margin: 16px 0 4px;
}
.foleio-auth-otp-digit {
  width: 100%;
  aspect-ratio: 1;
  max-height: 56px;
  background: #1a1816;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  color: #f4f4f5;
  font-size: 22px;
  font-weight: 500;
  text-align: center;
  caret-color: #f4f4f5;
}
.foleio-auth-otp-digit:focus {
  outline: none;
  border-color: rgba(255, 255, 255, 0.28);
}
.foleio-auth-resend-link {
  background: none;
  border: none;
  padding: 0;
  color: #adadad;
  font-size: 14.85px;
  font-weight: 500;
  cursor: pointer;
  text-align: center;
}
.foleio-auth-resend-link:hover:not(:disabled) {
  color: #fafafa;
  text-decoration: underline;
}
.foleio-auth-resend-link:disabled {
  opacity: 0.5;
  cursor: default;
}

/* Onboarding */
.foleio-onboard-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
}
.foleio-onboard-progress-seg {
  flex: 1;
  height: 3px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
}
.foleio-onboard-progress-seg.is-active {
  background: #ffffff;
}
.foleio-onboard-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.foleio-onboard-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #212121;
  color: #adadad;
  font-size: 14.85px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}
.foleio-onboard-chip:hover {
  color: #f4f4f5;
  border-color: rgba(255, 255, 255, 0.2);
}
.foleio-onboard-chip.is-selected {
  background: #ffffff;
  border-color: #ffffff;
  color: #001035;
}
.foleio-onboard-username {
  display: flex;
  align-items: center;
  gap: 0;
  min-height: 48px;
  background: #212121;
  border-radius: 10px;
  overflow: hidden;
}
.foleio-onboard-username-prefix {
  padding: 0 4px 0 14px;
  color: #adadad;
  font-size: 16.642px;
  font-weight: 500;
  flex-shrink: 0;
}
.foleio-onboard-username-input {
  flex: 1;
  min-width: 0;
  height: 48px;
  background: transparent;
  border: none;
  color: #f4f4f5;
  font-size: 16.642px;
  font-weight: 500;
  padding: 0 14px 0 0;
}
.foleio-onboard-username-input:focus { outline: none; }
.foleio-onboard-username-input::placeholder { color: #5c6070; }
.foleio-onboard-username-verified {
  color: #adadad;
  flex-shrink: 0;
  margin-right: 14px;
}
.foleio-onboard-hint {
  margin-top: 10px;
  color: #adadad;
  font-size: 13px;
  font-weight: 500;
}
.foleio-onboard-actions {
  display: flex;
  gap: 10px;
  margin-top: 24px;
}
.foleio-onboard-actions .foleio-auth-btn {
  margin-top: 0;
}
.foleio-onboard-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  min-width: 110px;
  padding: 0 18px;
  border-radius: 9px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: transparent;
  color: #adadad;
  font-size: 14.85px;
  font-weight: 500;
  cursor: pointer;
}
.foleio-onboard-back:hover {
  color: #fafafa;
  border-color: rgba(255, 255, 255, 0.24);
}
`;
