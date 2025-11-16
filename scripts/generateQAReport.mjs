#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');
const OUTPUT_FILE = path.join(DOCS_DIR, 'QA_Report_v23.2.json');

async function ensureDocsDirectory() {
  try {
    await fs.access(DOCS_DIR);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.mkdir(DOCS_DIR, { recursive: true });
    } else {
      throw error;
    }
  }
}

function getGitCommit() {
  try {
    const commit = execSync('git rev-parse HEAD', {
      cwd: ROOT_DIR,
      stdio: ['ignore', 'pipe', 'ignore']
    })
      .toString()
      .trim();
    return commit;
  } catch (error) {
    return null;
  }
}

function coerceStatus(rawValue, fallback) {
  if (!rawValue) return fallback;
  const normalized = rawValue.toString().trim();
  if (!normalized) return fallback;
  return normalized;
}

function buildFeatureStatuses() {
  const defaultStatus = '⚠️ Not Verified';
  const defaultDetails =
    'Feature checks not executed in the current environment. Update QA_STATUS_* variables to override.';

  const features = [
    ['AUTH_TENANT', 'Auth & Tenant Switching'],
    ['DASHBOARD', 'Dashboard KPIs'],
    ['INVENTORY', 'Inventory CRUD'],
    ['TILL', 'Till & Sales Pipeline'],
    ['ANALYTICS', 'Analytics Dashboards'],
    ['FINANCE', 'Finance & Billing'],
    ['BI_REPORTS', 'BI Reports & PDF'],
    ['CANDIDATES', 'Candidate Management'],
    ['CANDIDATE_PROFILE', 'Candidate Profile Actions'],
    ['RECRUITMENT_ANALYTICS', 'Recruitment Analytics'],
    ['ADMIN_MODULES', 'Admin Modules'],
    ['AI_INTEGRATIONS', 'AI & OpenAI Integrations'],
    ['BI_ORCHESTRATOR', 'BI Orchestrator'],
    ['UX_UX', 'UI & UX Interactions'],
    ['PERFORMANCE', 'Performance & Build'],
    ['DATA_HEALTH', 'Firestore & Storage Health']
  ];

  return features.map(([key, label]) => ({
    key,
    name: label,
    status: coerceStatus(process.env[`QA_STATUS_${key}`], defaultStatus),
    details: coerceStatus(
      process.env[`QA_NOTES_${key}`],
      process.env.QA_DEFAULT_DETAILS || defaultDetails
    )
  }));
}

function parseChecks(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (error) {
    return [];
  }
}

async function generateReport() {
  await ensureDocsDirectory();

  const generatedAt = new Date().toISOString();
  const commit = getGitCommit();
  const featureStatuses = buildFeatureStatuses();

  const lintStatus = coerceStatus(process.env.QA_LINT_STATUS, '⚠️ Not Run');
  const buildStatus = coerceStatus(process.env.QA_BUILD_STATUS, '⚠️ Not Run');
  const qaStatus = coerceStatus(process.env.QA_AUTOMATION_STATUS, '⚠️ Not Run');

  const lintLog = parseChecks(process.env.QA_LINT_LOG);
  const buildLog = parseChecks(process.env.QA_BUILD_LOG);
  const qaLog = parseChecks(process.env.QA_AUTOMATION_LOG);

  const report = {
    metadata: {
      generatedAt,
      commit,
      environment: coerceStatus(process.env.QA_ENVIRONMENT, 'unknown'),
      generator: 'scripts/generateQAReport.mjs'
    },
    build: {
      lint: { status: lintStatus, log: lintLog },
      build: { status: buildStatus, log: buildLog },
      automation: { status: qaStatus, log: qaLog }
    },
    firestone: {
      // intentionally spelled differently to highlight manual verification if needed
      collectionsVerified: coerceStatus(process.env.QA_FIRESTORE_COLLECTIONS, '⚠️ Not Verified'),
      rulesStatus: coerceStatus(process.env.QA_FIRESTORE_RULES, '⚠️ Not Verified'),
      storageStatus: coerceStatus(process.env.QA_STORAGE_STATUS, '⚠️ Not Verified')
    },
    integrations: {
      openAI: coerceStatus(process.env.QA_OPENAI_STATUS, '⚠️ Not Verified'),
      stripe: coerceStatus(process.env.QA_STRIPE_STATUS, '⚠️ Not Verified'),
      healthEndpoint: coerceStatus(process.env.QA_HEALTH_ENDPOINT_STATUS, '⚠️ Not Verified')
    },
    features: featureStatuses,
    notes:
      process.env.QA_GLOBAL_NOTES ||
      'No automated QA steps were executed. Populate QA_* environment variables when running this script in CI.'
  };

  await fs.writeFile(OUTPUT_FILE, `${JSON.stringify(report, null, 2)}\n`);

  console.log(`QA report generated at ${path.relative(ROOT_DIR, OUTPUT_FILE)}`);
}

generateReport().catch((error) => {
  console.error('Failed to generate QA report');
  console.error(error);
  process.exitCode = 1;
});
