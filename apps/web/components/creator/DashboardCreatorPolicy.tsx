'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { CreatorAgreementContent } from '@/components/legal/CreatorAgreementContent';

export function DashboardCreatorPolicy() {
  const [showFull, setShowFull] = useState(false);

  return (
    <div className="foleio-dash-policy">
      <h2>Platform fees</h2>
      <p>
        Foleio takes a small platform fee from bookings, shop sales, and other
        paid transactions based on your plan. Paystack processing fees are
        separate and always apply.
      </p>

      <div className="foleio-dash-fee-grid">
        <div className="foleio-dash-fee-row">
          <div>
            <p className="foleio-dash-fee-plan">Free</p>
            <p className="foleio-dash-fee-price">₦0 / month</p>
          </div>
          <div className="foleio-dash-fee-rate">
            <strong>5%</strong>
            <span>per transaction</span>
            <span className="foleio-dash-fee-note">
              ₦300 flat under ₦5,000
            </span>
          </div>
        </div>
        <div className="foleio-dash-fee-row is-pro">
          <div>
            <p className="foleio-dash-fee-plan">Pro</p>
            <p className="foleio-dash-fee-price">₦10,000 / month</p>
          </div>
          <div className="foleio-dash-fee-rate">
            <strong>0%</strong>
            <span>Foleio platform fee</span>
            <span className="foleio-dash-fee-note">
              Paystack fees still apply
            </span>
          </div>
        </div>
      </div>

      <p>
        After the Foleio fee, you keep the rest (95% on Free for standard-sized
        charges, or 100% on Pro) before Paystack&apos;s cut. You can upgrade
        anytime in <Link href="/settings?tab=billing">Settings → Billing</Link>.
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
          <strong>How it works:</strong> customer pays → Paystack splits the
          Foleio fee and your share → your share is settled to the bank account
          on your Paystack subaccount.
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
