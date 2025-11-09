#!/usr/bin/env node
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

try {
  const hash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  const timestamp = new Date().toISOString();
  const versionLine = `v4.1 | ${timestamp} | ${hash}`;
  writeFileSync('VERSION.txt', `${versionLine}\n`);
  console.log('[Version] VERSION.txt updated:', versionLine);
} catch (error) {
  console.error('[Version] Failed to generate version file.', error);
  process.exit(1);
}
