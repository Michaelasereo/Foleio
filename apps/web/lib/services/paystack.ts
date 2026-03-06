const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;
const BASE = 'https://api.paystack.co';

const headers = {
  Authorization: `Bearer ${PAYSTACK_SECRET}`,
  'Content-Type': 'application/json',
};

export async function resolveAccountNumber(accountNumber: string, bankCode: string) {
  const res = await fetch(
    `${BASE}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
    { headers }
  );
  return res.json();
}

export async function getBankList() {
  const res = await fetch(`${BASE}/bank?country=nigeria&perPage=100`, { headers });
  return res.json();
}

export async function verifyBVNMatch(
  bvn: string,
  accountNumber: string,
  bankCode: string
) {
  const res = await fetch(`${BASE}/bvn/match`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      bvn,
      account_number: accountNumber,
      bank_code: bankCode,
      first_name: '',
      last_name: '',
    }),
  });
  return res.json();
}

export async function createTransferRecipient(
  accountName: string,
  accountNumber: string,
  bankCode: string
) {
  const res = await fetch(`${BASE}/transferrecipient`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      type: 'nuban',
      name: accountName,
      account_number: accountNumber,
      bank_code: bankCode,
      currency: 'NGN',
    }),
  });
  return res.json();
}

export async function initiateTransfer(
  amount: number,
  recipientCode: string,
  reference: string,
  reason: string
) {
  const res = await fetch(`${BASE}/transfer`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      source: 'balance',
      amount,
      recipient: recipientCode,
      reference,
      reason,
    }),
  });
  return res.json();
}

export async function verifyTransfer(reference: string) {
  const res = await fetch(`${BASE}/transfer/verify/${reference}`, { headers });
  return res.json();
}
