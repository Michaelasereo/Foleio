import { retryPaymentOperation } from './retry/retry-manager';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;

if (!PAYSTACK_SECRET_KEY) {
  throw new Error('Missing PAYSTACK_SECRET_KEY environment variable');
}

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

interface InitializePaymentParams {
  email: string;
  amount: number; // in kobo
  metadata?: Record<string, unknown>;
  channels?: string[];
  subaccount?: string;
  callback_url?: string;
  plan?: string;
}

interface TransferParams {
  source: string;
  amount: number; // in kobo
  recipient: string;
  reason: string;
  reference?: string;
}

interface CreateSubaccountParams {
  business_name: string;
  settlement_bank: string;
  account_number: string;
  percentage_charge: number;
  primary_contact_email: string;
  primary_contact_name: string;
  primary_contact_phone: string;
  settlement_schedule?: 'auto' | 'manual';
}

interface UpdateSubaccountParams {
  subaccount_code: string;
  business_name?: string;
  settlement_bank?: string;
  account_number?: string;
  percentage_charge?: number;
  primary_contact_email?: string;
  primary_contact_name?: string;
  primary_contact_phone?: string;
  settlement_schedule?: 'auto' | 'manual';
}

interface CreateTransferRecipientParams {
  type: 'nuban';
  name: string;
  account_number: string;
  bank_code: string;
  currency?: string;
}

interface DisableSubscriptionParams {
  code: string;
  token?: string;
}

export const paystack = {
  /**
   * Initialize a payment transaction with retry logic
   */
  async initializePayment(params: InitializePaymentParams) {
    return retryPaymentOperation(async () => {
      const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: params.email,
          amount: params.amount,
          plan: params.plan,
          metadata: params.metadata,
          channels: params.channels || ['card', 'bank', 'ussd'],
          subaccount: params.subaccount,
          callback_url: params.callback_url,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Payment initialization failed' }));
        throw new Error(error.message || 'Failed to initialize payment');
      }

      return response.json();
    }, 'payment-initialization');
  },

  /**
   * Verify a payment transaction with retry logic
   */
  async verifyPayment(reference: string) {
    return retryPaymentOperation(async () => {
      const response = await fetch(
        `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Payment verification failed' }));
        throw new Error(error.message || 'Failed to verify payment');
      }

      return response.json();
    }, 'payment-verification');
  },

  /**
   * Create a transfer recipient
   */
  async createTransferRecipient(params: CreateTransferRecipientParams) {
    const response = await fetch(`${PAYSTACK_BASE_URL}/transferrecipient`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: params.type,
        name: params.name,
        account_number: params.account_number,
        bank_code: params.bank_code,
        currency: params.currency || 'NGN',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create transfer recipient');
    }

    return response.json();
  },

  /**
   * Initiate a transfer with retry logic
   */
  async transfer(params: TransferParams) {
    return retryPaymentOperation(async () => {
      const response = await fetch(`${PAYSTACK_BASE_URL}/transfer`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: params.source,
          amount: params.amount,
          recipient: params.recipient,
          reason: params.reason,
          reference: params.reference,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Transfer failed' }));
        throw new Error(error.message || 'Failed to initiate transfer');
      }

      return response.json();
    }, 'payout-transfer');
  },

  /**
   * Create a subaccount
   */
  async createSubaccount(params: CreateSubaccountParams) {
    const response = await fetch(`${PAYSTACK_BASE_URL}/subaccount`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        business_name: params.business_name,
        settlement_bank: params.settlement_bank,
        account_number: params.account_number,
        percentage_charge: params.percentage_charge,
        primary_contact_email: params.primary_contact_email,
        primary_contact_name: params.primary_contact_name,
        primary_contact_phone: params.primary_contact_phone,
        settlement_schedule: params.settlement_schedule || 'auto',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create subaccount');
    }

    return response.json();
  },

  /**
   * Update an existing subaccount (bank details, fee, settlement schedule)
   */
  async updateSubaccount(params: UpdateSubaccountParams) {
    const { subaccount_code, ...rest } = params;
    const response = await fetch(`${PAYSTACK_BASE_URL}/subaccount/${subaccount_code}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...rest,
        settlement_schedule: rest.settlement_schedule || 'auto',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update subaccount');
    }

    return response.json();
  },

  /**
   * Fetch a subaccount by code. Returns null when Paystack does not know the code
   * (common when a test-mode ACCT_… is used against live keys, or vice versa).
   */
  async getSubaccount(subaccountCode: string) {
    const response = await fetch(
      `${PAYSTACK_BASE_URL}/subaccount/${encodeURIComponent(subaccountCode)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.status) {
      return null;
    }
    return payload;
  },

  isTestMode() {
    return String(PAYSTACK_SECRET_KEY || '').startsWith('sk_test');
  },

  /**
   * Get public key
   */
  getPublicKey() {
    return PAYSTACK_PUBLIC_KEY;
  },

  /**
   * Fetch a subscription by code (includes email_token for disable/enable).
   */
  async fetchSubscription(code: string) {
    const response = await fetch(
      `${PAYSTACK_BASE_URL}/subscription/${encodeURIComponent(code)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: 'Failed to fetch subscription',
      }));
      throw new Error(error.message || 'Failed to fetch subscription');
    }

    return response.json();
  },

  /**
   * Disable a recurring subscription.
   * Paystack requires both the subscription code and that subscription's email_token.
   */
  async disableSubscription(params: DisableSubscriptionParams) {
    if (!params.token) {
      throw new Error('Subscription email_token is required to cancel');
    }

    const response = await fetch(`${PAYSTACK_BASE_URL}/subscription/disable`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: params.code,
        token: params.token,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to disable subscription' }));
      throw new Error(error.message || 'Failed to disable subscription');
    }

    return response.json();
  },
};

