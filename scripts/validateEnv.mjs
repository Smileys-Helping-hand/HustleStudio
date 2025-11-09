import fs from 'fs';
import path from 'path';

const required = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_MEASUREMENT_ID',
  'VITE_BRAND_NAME',
  'VITE_CDN_DOMAIN',
];

const optional = [
  'VITE_AMPLIFY_MONITOR_KEY',
  'AMPLIFY_REGION',
  'AMPLIFY_APP_ID',
  'AMPLIFY_BRANCH',
];

const env = { ...process.env };

const envFilePath = path.resolve('.env');
if (fs.existsSync(envFilePath)) {
  const fileContent = fs.readFileSync(envFilePath, 'utf8');
  for (const line of fileContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex === -1) continue;
    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim();
    if (env[key] === undefined || env[key] === '') {
      env[key] = value;
    }
  }
}

const missing = required.filter((key) => !env[key]);

if (missing.length) {
  console.error('❌ Missing required env vars:', missing.join(', '));
  process.exit(1);
}

const missingOptional = optional.filter((key) => !env[key]);
if (missingOptional.length) {
  console.warn('[validateEnv] Optional environment variables not set:');
  for (const key of missingOptional) {
    console.warn(`  - ${key}`);
  }
  console.warn('[validateEnv] The build will continue, but optional features may be disabled.');
}

console.log('✅ Environment validated successfully.');
