'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { formatNaira, koboToNaira } from '@foleio/utils';
import { platformFeeFromGross } from '@/lib/billing/platform-fee-calc';
import {
  PLATFORM_FEE_PERCENT,
  formatProFeeLabel,
} from '@/lib/billing/platform-plans';

type FeeCalculatorDrawerProps = {
  open: boolean;
  onClose: () => void;
};

const drawerCss = `
.foleio-fee-calc-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(0, 0, 0, 0.55);
}
.foleio-fee-calc-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 81;
  display: flex;
  flex-direction: column;
  width: min(420px, 100vw);
  background: #212121;
  color: #f4f4f5;
  font-family: var(--font-body), sans-serif;
  box-shadow: -12px 0 40px rgba(0, 0, 0, 0.35);
  animation: foleio-fee-calc-in 180ms ease-out;
}
@keyframes foleio-fee-calc-in {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
.foleio-fee-calc-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 20px 0;
  flex-shrink: 0;
}
.foleio-fee-calc-title {
  margin: 0;
  color: #f4f4f5;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.2;
}
.foleio-fee-calc-meta {
  margin: 6px 0 0;
  color: #828282;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
}
.foleio-fee-calc-close {
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
.foleio-fee-calc-close:hover {
  color: #f4f4f5;
}
.foleio-fee-calc-body {
  flex: 1;
  overflow: auto;
  padding: 16px 20px 24px;
}
.foleio-fee-calc-label {
  display: block;
  margin: 0 0 8px;
  color: #adadad;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.foleio-fee-calc-input-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  background: #151515;
  padding: 0 12px;
}
.foleio-fee-calc-currency {
  color: #828282;
  font-size: 15px;
  font-weight: 600;
}
.foleio-fee-calc-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  color: #fafafa;
  font-size: 18px;
  font-weight: 600;
  padding: 12px 0;
  outline: none;
}
.foleio-fee-calc-input::placeholder {
  color: #555;
  font-weight: 500;
}
.foleio-fee-calc-table-wrap {
  margin-top: 18px;
  overflow-x: auto;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}
.foleio-fee-calc-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.foleio-fee-calc-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.foleio-fee-calc-table th,
.foleio-fee-calc-table td {
  padding: 12px 14px;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.foleio-fee-calc-table th {
  color: #828282;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  background: rgba(255, 255, 255, 0.03);
}
.foleio-fee-calc-table th:not(:first-child),
.foleio-fee-calc-table td:not(:first-child) {
  text-align: right;
}
.foleio-fee-calc-table th.is-pro {
  color: #fb923c;
}
.foleio-fee-calc-table tbody tr:last-child th,
.foleio-fee-calc-table tbody tr:last-child td {
  border-bottom: none;
}
.foleio-fee-calc-table th[scope="row"] {
  color: #adadad;
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0;
  font-size: 13px;
  background: transparent;
}
.foleio-fee-calc-table td {
  color: #fafafa;
  font-weight: 600;
}
.foleio-fee-calc-table td.is-pro {
  color: #fdba74;
}
.foleio-fee-calc-table .foleio-fee-calc-rate {
  display: block;
  margin-top: 4px;
  color: #828282;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.35;
}
.foleio-fee-calc-table .foleio-fee-calc-note {
  display: block;
  margin-top: 4px;
  color: #828282;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.35;
}
.foleio-fee-calc-placeholder {
  margin: 18px 0 0;
  color: #828282;
  font-size: 13px;
  line-height: 1.5;
}
.foleio-fee-calc-footer {
  flex-shrink: 0;
  padding: 12px 20px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.foleio-fee-calc-upgrade {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 40px;
  padding: 8px 14px;
  border: none;
  border-radius: 8px;
  background: #fafafa;
  color: #151515 !important;
  font-family: var(--font-body), sans-serif;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  text-decoration: none !important;
}
.foleio-fee-calc-upgrade:hover {
  background: #e4e4e7;
  color: #151515 !important;
  opacity: 1;
}
.foleio-fee-calc-save-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  border-radius: 999px;
  background: #166534;
  color: #dcfce7;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.3;
  white-space: nowrap;
}
`;

function formatKobo(kobo: number) {
  return formatNaira(koboToNaira(kobo));
}

export function FeeCalculatorDrawer({ open, onClose }: FeeCalculatorDrawerProps) {
  const [amountNaira, setAmountNaira] = useState('');

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) setAmountNaira('');
  }, [open]);

  const splits = useMemo(() => {
    const naira = Number(String(amountNaira).replace(/,/g, ''));
    if (!Number.isFinite(naira) || naira <= 0) return null;
    const grossKobo = Math.round(naira * 100);
    if (grossKobo <= 0) return null;
    const free = platformFeeFromGross(grossKobo, PLATFORM_FEE_PERCENT.free);
    const pro = platformFeeFromGross(grossKobo, PLATFORM_FEE_PERCENT.pro);
    const saveKobo = Math.max(0, free.platformFee - pro.platformFee);
    return { free, pro, saveKobo, grossKobo };
  }, [amountNaira]);

  if (!open) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: drawerCss }} />
      <div
        className="foleio-fee-calc-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className="foleio-fee-calc-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fee-calculator-title"
      >
        <div className="foleio-fee-calc-header">
          <div>
            <h2 id="fee-calculator-title" className="foleio-fee-calc-title">
              Fee calculator
            </h2>
            <p className="foleio-fee-calc-meta">
              See platform &amp; service fees on Free vs Pro for a charge amount.
            </p>
          </div>
          <button
            type="button"
            className="foleio-fee-calc-close"
            onClick={onClose}
            aria-label="Close fee calculator"
          >
            <X strokeWidth={1.75} />
          </button>
        </div>

        <div className="foleio-fee-calc-body">
          <label className="foleio-fee-calc-label" htmlFor="fee-calc-amount">
            Customer pays
          </label>
          <div className="foleio-fee-calc-input-wrap">
            <span className="foleio-fee-calc-currency">₦</span>
            <input
              id="fee-calc-amount"
              className="foleio-fee-calc-input"
              type="text"
              inputMode="decimal"
              placeholder="50,000"
              value={amountNaira}
              onChange={(event) => setAmountNaira(event.target.value)}
              autoFocus
            />
          </div>

          {splits ? (
            <div className="foleio-fee-calc-table-wrap">
              <table className="foleio-fee-calc-table">
                <caption className="foleio-fee-calc-sr-only">
                  Free vs Pro platform and service fees
                </caption>
                <thead>
                  <tr>
                    <th scope="col" />
                    <th scope="col">
                      Free
                      <span className="foleio-fee-calc-rate">
                        {PLATFORM_FEE_PERCENT.free}% · or ₦300 under ₦5,000
                      </span>
                    </th>
                    <th scope="col" className="is-pro">
                      Pro
                      <span className="foleio-fee-calc-rate">
                        {formatProFeeLabel()}
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">Fee</th>
                    <td>
                      {formatKobo(splits.free.platformFee)}
                      {splits.free.feeType === 'flat' ? (
                        <span className="foleio-fee-calc-note">
                          ₦300 flat (under ₦5,000)
                        </span>
                      ) : null}
                    </td>
                    <td className="is-pro">
                      {formatKobo(splits.pro.platformFee)}
                      {splits.pro.feeType === 'percent_plus_flat' ? (
                        <span className="foleio-fee-calc-note">
                          {formatProFeeLabel()} on every charge
                        </span>
                      ) : null}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">You keep</th>
                    <td>{formatKobo(splits.free.creatorEarnings)}</td>
                    <td className="is-pro">
                      {formatKobo(splits.pro.creatorEarnings)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p className="foleio-fee-calc-placeholder">
              Enter a booking or shop amount to compare fees on Free and Pro.
            </p>
          )}
        </div>

        <div className="foleio-fee-calc-footer">
          <Link
            href="/settings?tab=billing"
            className="foleio-fee-calc-upgrade"
            onClick={onClose}
          >
            Upgrade to Pro
            {splits && splits.saveKobo > 0 ? (
              <span className="foleio-fee-calc-save-badge">
                Save {formatKobo(splits.saveKobo)}
              </span>
            ) : null}
          </Link>
        </div>
      </aside>
    </>
  );
}
