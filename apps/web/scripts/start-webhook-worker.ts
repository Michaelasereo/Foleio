#!/usr/bin/env tsx

/**
 * Webhook Worker Startup Script
 * This script starts the BullMQ webhook worker that processes Paystack webhooks
 */

import '../lib/queue/workers/webhook-worker';

console.log('🚀 Starting Foleio Webhook Worker...');
console.log('📋 Worker will process webhooks from the "webhooks" queue');
console.log('📊 Monitoring Redis connection and queue health...');

// Keep the process running
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down webhook worker...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Shutting down webhook worker...');
  process.exit(0);
});
