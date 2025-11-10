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
  'VITE_ENCRYPTION_SECRET',
];

const optional = [
  'VITE_AMPLIFY_MONITOR_KEY',
  'AMPLIFY_REGION',
  'AMPLIFY_APP_ID',
  'AMPLIFY_BRANCH',
  'VITE_OPENAI_API_KEY',
  'VITE_ANALYTICS_REFRESH_MS',
  'VITE_EMAIL_SERVICE_ID',
  'VITE_EMAIL_TEMPLATE_ID',
  'VITE_GOOGLE_SHEETS_API_KEY',
  'VITE_FIREBASE_REALTIME_DB_URL',
  'VITE_TENANT_PLAN_DEFAULT',
  'VITE_MAX_COLLAB_USERS',
  'VITE_MULTI_TENANT',
  'VITE_STRIPE_PUBLISHABLE_KEY',
  'VITE_STRIPE_SECRET_KEY',
  'VITE_PAYFAST_MERCHANT_ID',
  'VITE_PAYFAST_KEY',
  'VITE_PAYMENTS_ENDPOINT',
  'VITE_BACKUP_BUCKET',
  'STRIPE_WEBHOOK_SECRET',
  'VITE_MARKETING_AI_MODEL',
  'VITE_INSTAGRAM_CLIENT_ID',
  'VITE_TIKTOK_CLIENT_ID',
  'VITE_LINKEDIN_CLIENT_ID',
  'VITE_SENDGRID_KEY',
  'VITE_EMAIL_AUTOMATION_ENDPOINT',
  'VITE_AUTOMATION_INTERVAL_MS',
  'VITE_MARKETPLACE_API',
  'VITE_WHITE_LABEL_ENABLED',
  'VITE_AFFILIATE_COMMISSION_RATE',
  'VITE_AUTOTOPUP_ENABLED',
  'VITE_AUTOTOPUP_THRESHOLD',
  'VITE_PARTNER_ONBOARD_URL',
  'VITE_API_GATEWAY_URL',
  'VITE_GRAPHQL_ENDPOINT',
  'VITE_SLACK_BOT_TOKEN',
  'VITE_TWILIO_SID',
  'VITE_TWILIO_AUTH',
  'VITE_TWILIO_WHATSAPP_NUMBER',
  'VITE_ENTERPRISE_SSO_ENABLED',
  'VITE_APPSTORE_API',
  'VITE_BIGQUERY_DATASET',
  'VITE_FORECAST_MODEL',
  'VITE_ANALYTICS_EXPORT_BUCKET',
  'VITE_CDN_DISTRIBUTION_ID',
  'VITE_LB_ENABLED',
  'VITE_TELEMETRY_DASHBOARD_URL',
  'VITE_APP_URL',
  'VITE_MONITOR_INTERVAL_MIN',
  'VITE_TELEMETRY_ENABLED',
  'VITE_BACKUP_RETENTION_DAYS',
  'VITE_AI_AUDIT_RETENTION_DAYS',
  'VITE_AI_LOGGING_ENABLED',
  'VITE_AI_QUALITY_EVAL',
  'VITE_AI_METRICS_COLLECTION',
  'VITE_GLOBAL_INSIGHTS_ENABLED',
  'VITE_GLOBAL_INSIGHTS_COLLECTION',
  'VITE_BI_REPORTS_ENABLED',
  'VITE_BI_REPORTS_CRON',
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
