'use client';

import { BankSetupForm, type BankAccount } from '@/components/creator/BankSetupForm';
import { DojahKycWidget } from '@/components/creator/DojahKycWidget';

type PayoutSetupFlowProps = {
  creatorId: string;
  userId: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  identityVerified: boolean;
  requireDojahKyc?: boolean;
  bankAccount: BankAccount | null;
  editingBank: boolean;
  onIdentityVerified: () => void;
  onBankSaved: (bank: BankAccount) => void;
  onCancelBankEdit?: () => void;
};

export function PayoutSetupFlow({
  creatorId,
  userId,
  email,
  firstName,
  lastName,
  identityVerified,
  requireDojahKyc = false,
  bankAccount,
  editingBank,
  onIdentityVerified,
  onBankSaved,
  onCancelBankEdit,
}: PayoutSetupFlowProps) {
  const kycOk = !requireDojahKyc || identityVerified;
  const bankStepLabel = requireDojahKyc ? 'Step 2' : 'Payout setup';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {requireDojahKyc ? (
        <section>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: '#6b7280',
              }}
            >
              Step 1
            </span>
            <h3 className="foleio-dash-panel-title" style={{ margin: 0, fontSize: 16 }}>
              Identity (KYC)
            </h3>
          </div>
          <DojahKycWidget
            creatorId={creatorId}
            userId={userId}
            email={email}
            firstName={firstName}
            lastName={lastName}
            verified={identityVerified}
            onVerified={onIdentityVerified}
          />
        </section>
      ) : null}

      <section style={{ opacity: kycOk ? 1 : 0.45 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: '#6b7280',
            }}
          >
            {bankStepLabel}
          </span>
          <h3 className="foleio-dash-panel-title" style={{ margin: 0, fontSize: 16 }}>
            Bank account
          </h3>
        </div>
        <p className="foleio-dash-panel-meta" style={{ marginTop: 6 }}>
          {kycOk
            ? bankAccount && !editingBank
              ? 'Where we send your earnings'
              : 'Add a Nigerian bank account so clients can book and you can get paid'
            : 'Complete identity verification first'}
        </p>

        {!kycOk ? null : bankAccount && !editingBank ? (
          <div
            className="foleio-dash-booking-row"
            style={{ borderTop: 'none', paddingTop: 4 }}
          >
            <div className="foleio-dash-booking-main">
              <p className="foleio-dash-booking-name">{bankAccount.bankName}</p>
              <div className="foleio-dash-booking-meta">
                <span>{bankAccount.accountNumber}</span>
                <span>{bankAccount.accountName}</span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 8, maxWidth: 420 }}>
            <BankSetupForm onSaved={onBankSaved} onCancel={onCancelBankEdit} />
          </div>
        )}
      </section>
    </div>
  );
}
