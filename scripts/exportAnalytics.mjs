#!/usr/bin/env node
import { queueAnalyticsExport } from '../src/lib/analyticsCloud.js';
import { readFile } from 'fs/promises';

const tenantId = process.argv[2] || process.env.TENANT_ID || null;

const banner = () => {
  console.log('🛰️  Hustle Analytics Export');
  console.log('--------------------------------');
};

const main = async () => {
  banner();
  try {
    await queueAnalyticsExport(tenantId);
    console.log(`Queued analytics export for ${tenantId || 'global warehouse'}.`);
  } catch (error) {
    console.error('Export queue failed:', error.message);
    process.exitCode = 1;
    return;
  }

  try {
    const latest = await readFile('reports/lighthouse.json', 'utf8').catch(() => null);
    if (latest) {
      console.log('Latest Lighthouse snapshot attached for context.');
    }
  } catch {
    // Ignore missing reports directory
  }
};

main();
