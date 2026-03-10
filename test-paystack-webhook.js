#!/usr/bin/env node

/**
 * Test script for Paystack webhook setup
 * Run this to test your webhook endpoint with a sample booking payment
 */

const crypto = require('crypto');

// Replace with your actual values
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';
const WEBHOOK_URL = 'http://localhost:3000/api/webhooks/paystack';

// Sample booking payment webhook payload
const sampleWebhookPayload = {
  event: 'charge.success',
  data: {
    id: 123456789,
    reference: `booking_test_${Date.now()}`,
    amount: 50000, // 500 NGN in kobo
    currency: 'NGN',
    status: 'success',
    paid_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    customer: {
      id: 12345,
      email: 'customer@example.com',
      customer_code: 'CUS_test123'
    },
    metadata: {
      type: 'booking',
      bookingId: process.argv[3] || '550e8400-e29b-41d4-a716-446655440000', // Use command line arg or default
      creatorId: process.argv[4] || 'f28260f6-40fe-41d0-9f5f-4c439f64e5f9', // Use command line arg or default
      service: 'Test Service'
    }
  }
};

function generateSignature(payload, secret) {
  const hash = crypto
    .createHmac('sha512', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return hash;
}

async function testWebhook() {
  console.log('🧪 Testing Paystack webhook...\n');

  const signature = generateSignature(sampleWebhookPayload, PAYSTACK_SECRET_KEY);

  console.log('📡 Webhook URL:', WEBHOOK_URL);
  console.log('🔐 Signature:', signature.substring(0, 20) + '...');
  console.log('📦 Payload:', JSON.stringify(sampleWebhookPayload, null, 2));

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paystack-signature': signature,
        'User-Agent': 'Paystack-Webhook/1.0'
      },
      body: JSON.stringify(sampleWebhookPayload)
    });

    const result = await response.text();
    console.log('\n📨 Response Status:', response.status);
    console.log('📨 Response Body:', result);

    if (response.ok) {
      console.log('\n✅ Webhook test successful!');
    } else {
      console.log('\n❌ Webhook test failed!');
    }
  } catch (error) {
    console.error('\n❌ Webhook test error:', error.message);
  }
}

// Instructions
console.log('🚀 Paystack Webhook Setup Instructions\n');
console.log('1. Go to your Paystack Dashboard: https://dashboard.paystack.com/');
console.log('2. Navigate to Settings > Webhooks');
console.log('3. Add webhook URL:', WEBHOOK_URL);
console.log('4. Select events to listen for:');
console.log('   - charge.success');
console.log('   - transfer.success');
console.log('   - transfer.failed');
console.log('   - subscription.create');
console.log('   - invoice.payment_succeeded');
console.log('\n5. Copy your webhook secret key and set it as PAYSTACK_SECRET_KEY in your .env\n');

console.log('🔧 Environment Variables Needed:');
console.log('NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=<your_paystack_public_key>');
console.log('PAYSTACK_SECRET_KEY=<your_paystack_secret_key>\n');

if (!PAYSTACK_SECRET_KEY) {
  console.error('❌ PAYSTACK_SECRET_KEY is not set. Export it in your environment before running this script.');
  process.exit(1);
}

// Run test if requested
if (process.argv.includes('--test')) {
  testWebhook();
} else {
  console.log('💡 Run with --test flag to test the webhook endpoint');
  console.log('Example: node test-paystack-webhook.js --test\n');
}