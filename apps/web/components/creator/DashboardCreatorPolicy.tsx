'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { CreatorAgreementContent } from '@/components/legal/CreatorAgreementContent';
import {
  PLATFORM_FEE_PERCENT,
  PLATFORM_PLAN_AMOUNTS_KOBO,
  formatPlanPrice,
} from '@/lib/billing/platform-plans';

export function DashboardCreatorPolicy({
  growthEligible = false,
}: {
  growthEligible?: boolean;
}) {
  const [showFull, setShowFull] = useState(false);

  return (
    <div className="foleio-dash-policy">
      <h2>Platform &amp; service fees</h2>
      <p>
        Platform &amp; service fees are taken from bookings, shop sales, and other
        paid transactions based on your plan. The rate shown is the full fee —
        there is no separate processing fee on top.
      </p>

      <div className="foleio-dash-fee-grid">
        <div className="foleio-dash-fee-row">
          <div>
            <p className="foleio-dash-fee-plan">Free</p>
            <p className="foleio-dash-fee-price">₦0</p>
          </div>
          <div className="foleio-dash-fee-rate">
            <strong>{PLATFORM_FEE_PERCENT.free}%</strong>
            <span>platform &amp; service fees</span>
            <span className="foleio-dash-fee-note">
              ₦300 flat under ₦5,000
            </span>
          </div>
        </div>
        <div className="foleio-dash-fee-row is-pro">
          <div>
            <p className="foleio-dash-fee-plan">Pro</p>
            <p className="foleio-dash-fee-price">
              {formatPlanPrice(PLATFORM_PLAN_AMOUNTS_KOBO.pro.biannual)} / 6mo ·{' '}
              {formatPlanPrice(PLATFORM_PLAN_AMOUNTS_KOBO.pro.annual)} / yr
            </p>
          </div>
          <div className="foleio-dash-fee-rate">
            <strong>{PLATFORM_FEE_PERCENT.pro}%</strong>
            <span>platform &amp; service fees</span>
            <span className="foleio-dash-fee-note">Self-serve</span>
          </div>
        </div>
        {growthEligible ? (
          <div className="foleio-dash-fee-row is-pro">
            <div>
              <p className="foleio-dash-fee-plan">Growth</p>
              <p className="foleio-dash-fee-price">
                {formatPlanPrice(PLATFORM_PLAN_AMOUNTS_KOBO.growth.biannual)} / 6mo ·{' '}
                {formatPlanPrice(PLATFORM_PLAN_AMOUNTS_KOBO.growth.annual)} / yr
              </p>
            </div>
            <div className="foleio-dash-fee-rate">
              <strong>{PLATFORM_FEE_PERCENT.growth}%</strong>
              <span>platform &amp; service fees</span>
              <span className="foleio-dash-fee-note">Invite unlocked</span>
            </div>
          </div>
        ) : null}
      </div>

      <p>
        After platform &amp; service fees, you keep the rest. The ₦300 flat under
        ₦5,000 applies on Free only. You can upgrade in{' '}
        <Link href="/settings?tab=billing">Settings → Billing</Link>.
      </p>

      <h2>Settlement</h2>
      <p>
        Foleio does not use a separate &quot;withdraw&quot; or payout-request step.
        Your creator share settles <strong>directly to your linked Nigerian bank
        account</strong> through Paystack, on Paystack&apos;s normal settlement
        cycle (typically the <strong>next business day</strong> after a
        successful payment).
      </p>
      <ul>
        <li>
          <strong>How it works:</strong> customer pays → platform &amp; service
          fees are taken → your share is settled to the bank account on your
          Paystack subaccount.
        </li>
        <li>
          <strong>Bank account:</strong> must be a verified account in your name,
          linked in Earnings / payment settings.
        </li>
        <li>
          <strong>Timing:</strong> follows Paystack settlement (usually T+1
          business day). Weekends and bank holidays can delay credit.
        </li>
        <li>
          <strong>Holds:</strong> settlement may be delayed or held if there is a
          dispute, refund, fraud check, KYC issue, or a legal requirement — we
          will notify you if that happens.
        </li>
      </ul>
      <p>
        Manage your settlement bank account in{' '}
        <Link href="/earnings">Earnings</Link>.
      </p>

      <div className="foleio-dash-policy-more">
        <button
          type="button"
          className="foleio-dash-policy-more-btn"
          aria-expanded={showFull}
          onClick={() => setShowFull((open) => !open)}
        >
          {showFull ? 'Hide full policy' : 'View more'}
          {showFull ? (
            <ChevronUp strokeWidth={1.75} />
          ) : (
            <ChevronDown strokeWidth={1.75} />
          )}
        </button>
        {showFull ? (
          <div className="foleio-dash-policy-full">
            <p className="foleio-dash-panel-meta" style={{ marginBottom: 16 }}>
              Full Creator Agreement · Effective July 2026
            </p>
            <CreatorAgreementContent />
            <p style={{ marginTop: 16 }}>
              <Link href="/legal/creator-agreement">
                Open full agreement page
              </Link>
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
