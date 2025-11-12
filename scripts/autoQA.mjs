#!/usr/bin/env node
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');
const HISTORY_DIR = path.join(DOCS_DIR, 'history');
const BASE_REPORT = path.join(DOCS_DIR, 'QA_Report_v23.2.json');
const LATEST_REPORT = path.join(DOCS_DIR, 'QA_Report_latest.json');

function runCommand(command) {
  return new Promise((resolve) => {
    const start = Date.now();
    const child = exec(command, {
      cwd: ROOT_DIR,
      env: process.env,
      shell: true,
      maxBuffer: 1024 * 1024 * 5,
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (chunk) => {
      stdout += chunk;
    });

    child.stderr?.on('data', (chunk) => {
      stderr += chunk;
    });

    child.on('close', (code) => {
      resolve({
        command,
        code,
        success: code === 0,
        durationMs: Date.now() - start,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
  });
}

async function ensureDirectories() {
  await fs.mkdir(DOCS_DIR, { recursive: true });
  await fs.mkdir(HISTORY_DIR, { recursive: true });
}

function numericOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function booleanOrUnknown(value) {
  if (value === undefined || value === null) return 'unknown';
  const normalized = value.toString().trim().toLowerCase();
  if (['true', 'yes', '1'].includes(normalized)) return true;
  if (['false', 'no', '0'].includes(normalized)) return false;
  return 'unknown';
}

function safeIsoString(date = new Date()) {
  return new Date(date).toISOString();
}

function safeFileTimestamp(date = new Date()) {
  return safeIsoString(date).replace(/[:]/g, '-').replace(/\..+/, '');
}

async function readBaseReport() {
  try {
    const raw = await fs.readFile(BASE_REPORT, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {
        metadata: {
          generatedAt: safeIsoString(),
          generator: 'scripts/autoQA.mjs',
        },
      };
    }
    throw error;
  }
}

function deriveOverallStatus(commands, metrics) {
  if (commands.some((item) => !item.success)) {
    return '🔴 Issues detected';
  }

  if (
    [metrics.firestoreLatencyMs, metrics.aiLatencyMs]
      .filter((value) => value !== null)
      .some((value) => value > 1500)
  ) {
    return '🟡 Elevated latency';
  }

  return '🟢 Healthy';
}

async function writeReport(report) {
  const timestamp = safeFileTimestamp(report.metadata.lastAutoQA ?? new Date());
  const historyPath = path.join(HISTORY_DIR, `QA_Report_${timestamp}.json`);
  await fs.writeFile(historyPath, JSON.stringify(report, null, 2));
  await fs.writeFile(LATEST_REPORT, JSON.stringify(report, null, 2));
  return historyPath;
}

async function maybeSendDigest(report, historyPath) {
  try {
    const module = await import('../src/lib/webhookManager.js');
    if (module?.sendDigestNotification) {
      await module.sendDigestNotification({
        status: report.summary.status,
        lastAudit: report.metadata.lastAutoQA,
        commands: report.automation.commands.map((item) => ({
          command: item.command,
          success: item.success,
          durationMs: item.durationMs,
        })),
        metrics: report.summary.metrics,
        reportPath: historyPath.replace(ROOT_DIR + path.sep, ''),
      });
    }
  } catch (error) {
    console.warn('[autoQA] Unable to send webhook digest', error.message);
  }
}

function collectMetrics() {
  return {
    firestoreLatencyMs: numericOrNull(process.env.QA_FIRESTORE_LATENCY_MS),
    aiLatencyMs: numericOrNull(process.env.QA_AI_LATENCY_MS),
    stripeHealthy: booleanOrUnknown(process.env.QA_STRIPE_HEALTHY),
    storageHealthy: booleanOrUnknown(process.env.QA_STORAGE_HEALTHY),
    uptimePercentage: numericOrNull(process.env.QA_UPTIME_PERCENTAGE),
    cvGeneratorErrors: numericOrNull(process.env.QA_CV_GENERATOR_ERRORS) ?? 0,
  };
}

async function main() {
  await ensureDirectories();

  const commands = [];
  for (const command of ['npm run validate:env', 'npm run generate:qa']) {
    // eslint-disable-next-line no-await-in-loop
    const result = await runCommand(command);
    commands.push(result);
  }

  const metrics = collectMetrics();
  const baseReport = await readBaseReport();
  const executedAt = safeIsoString();
  const summaryStatus = deriveOverallStatus(commands, metrics);

  const report = {
    ...baseReport,
    metadata: {
      ...(baseReport.metadata || {}),
      lastAutoQA: executedAt,
    },
    automation: {
      executedAt,
      commands,
      metrics,
    },
    summary: {
      status: summaryStatus,
      metrics,
    },
  };

  const historyPath = await writeReport(report);
  await maybeSendDigest(report, historyPath);

  if (commands.some((item) => !item.success) && process.env.AUTO_QA_STRICT !== 'false') {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[autoQA] Fatal error', error);
  process.exitCode = 1;
});
