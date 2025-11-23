#!/usr/bin/env node
import { fetchGlobalWarehouseSummary } from '../src/lib/analyticsCloud.js';

const dataset = process.env.VITE_BIGQUERY_DATASET || 'hustle_analytics';

const run = async () => {
  console.log('📦 Syncing analytics snapshots to warehouse dataset:', dataset);
  try {
    const snapshots = await fetchGlobalWarehouseSummary();
    console.log(`Prepared ${snapshots.length} snapshots for transfer.`);
    snapshots.forEach((item) => {
      console.log(` - ${item.id} (${item.capturedAt || 'unknown'})`);
    });
    console.log('Use your deployment pipeline to push these rows to BigQuery.');
  } catch (error) {
    console.error('Analytics warehouse sync failed:', error.message);
    process.exitCode = 1;
  }
};

run();
