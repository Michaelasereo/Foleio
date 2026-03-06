#!/usr/bin/env node

/**
 * Push environment variables to Netlify using the API
 * Requires: NETLIFY_AUTH_TOKEN and NETLIFY_SITE_ID environment variables
 * 
 * Usage:
 *   export NETLIFY_AUTH_TOKEN=your_token
 *   export NETLIFY_SITE_ID=your_site_id
 *   node scripts/push-env-netlify-api.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ENV_FILE = path.join(__dirname, '../apps/web/.env.local');
const AUTH_TOKEN = process.env.NETLIFY_AUTH_TOKEN;
const SITE_ID = process.env.NETLIFY_SITE_ID;

if (!AUTH_TOKEN) {
  console.error('Error: NETLIFY_AUTH_TOKEN environment variable is required');
  console.error('Get your token from: https://app.netlify.com/user/applications');
  process.exit(1);
}

if (!SITE_ID) {
  console.error('Error: NETLIFY_SITE_ID environment variable is required');
  console.error('Find your site ID in the Netlify dashboard URL or site settings');
  process.exit(1);
}

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`Error: ${filePath} not found`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const envVars = {};

  content.split('\n').forEach((line) => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;

    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      let key = match[1].trim();
      let value = match[2].trim();
      
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      if (key && value && !value.includes('your-') && value !== 'your_webhook_secret') {
        envVars[key] = value;
      }
    }
  });

  return envVars;
}

function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function setEnvVar(key, value, context = 'production') {
  const options = {
    hostname: 'api.netlify.com',
    path: `/api/v1/sites/${SITE_ID}/env`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
  };

  const data = {
    key,
    values: [{
      value,
      context,
    }],
  };

  try {
    const response = await makeRequest(options, data);
    if (response.status >= 200 && response.status < 300) {
      return true;
    } else {
      console.error(`Failed to set ${key}:`, response.data);
      return false;
    }
  } catch (error) {
    console.error(`Error setting ${key}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('📦 Reading environment variables from:', ENV_FILE);
  const envVars = readEnvFile(ENV_FILE);
  
  console.log(`\n🔑 Found ${Object.keys(envVars).length} environment variables`);
  console.log(`🌐 Site ID: ${SITE_ID}`);
  console.log('\nSetting environment variables...\n');

  // Update NEXT_PUBLIC_APP_URL to production URL
  if (envVars.NEXT_PUBLIC_APP_URL === 'http://localhost:3000') {
    envVars.NEXT_PUBLIC_APP_URL = 'https://foleio.com';
    console.log('⚠️  Updated NEXT_PUBLIC_APP_URL to production URL\n');
  }

  let success = 0;
  let failed = 0;

  for (const [key, value] of Object.entries(envVars)) {
    process.stdout.write(`Setting ${key}... `);
    
    // Set for all contexts
    const contexts = ['production', 'deploy-preview', 'branch-deploy'];
    let allSuccess = true;
    
    for (const context of contexts) {
      const result = await setEnvVar(key, value, context);
      if (!result) allSuccess = false;
    }
    
    if (allSuccess) {
      console.log('✅');
      success++;
    } else {
      console.log('❌');
      failed++;
    }
  }

  console.log(`\n✅ Successfully set ${success} variables`);
  if (failed > 0) {
    console.log(`❌ Failed to set ${failed} variables`);
  }
  
  console.log('\nTo verify, visit: https://app.netlify.com/sites/' + SITE_ID + '/configuration/env');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});

