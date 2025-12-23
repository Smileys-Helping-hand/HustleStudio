import fs from 'fs';

const envVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_MEASUREMENT_ID',
  'VITE_BRAND_NAME',
  'VITE_CDN_DOMAIN',
  'VITE_ENCRYPTION_SECRET',
];

console.log('🔍 Checking environment variables:');
envVars.forEach(key => {
  const value = process.env[key];
  console.log(`  ${key}: ${value ? '✓ found' : '✗ missing'}`);
});

const lines = envVars
  .filter(key => process.env[key])
  .map(key => `${key}=${process.env[key]}`);

fs.writeFileSync('.env', lines.join('\n') + '\n');
console.log('✅ .env file created with', lines.length, 'variables');

if (lines.length < envVars.length) {
  console.warn('⚠️  Some variables are missing. Build may fail.');
}
