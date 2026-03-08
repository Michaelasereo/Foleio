import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const requiredOutputs = [
  'apps/web/.next',
  'apps/web/.next/BUILD_ID',
];

const missing = requiredOutputs.filter((relativePath) => {
  const absolutePath = resolve(process.cwd(), relativePath);
  return !existsSync(absolutePath);
});

if (missing.length > 0) {
  console.error('Build verification failed. Missing required output files:');
  for (const file of missing) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

console.log('Build verification passed.');
