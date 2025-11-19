#!/usr/bin/env node
import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';

const reportsDir = path.resolve('reports');
if (!existsSync(reportsDir)) {
  mkdirSync(reportsDir, { recursive: true });
}

const run = (label, command, options = {}) => {
  try {
    const output = execSync(command, { stdio: 'pipe', encoding: 'utf8', ...options });
    if (options.report) {
      writeFileSync(path.join(reportsDir, options.report), output);
    }
    console.log(`[Diagnose] ${label} ✓`);
    return output;
  } catch (error) {
    if (options.report) {
      const combined = `${error.stdout ?? ''}${error.stderr ?? ''}`;
      writeFileSync(path.join(reportsDir, options.report), combined);
    }
    console.error(`[Diagnose] ${label} failed`);
    throw error;
  }
};

run('Lint', 'npx eslint src --ext .js,.jsx', { report: 'lint.txt' });
run('Prettier check', 'npx prettier --check "src/**/*.{js,jsx,json,css}"', { report: 'prettier.txt' });
run('Depcheck', 'npx depcheck', { report: 'depcheck.txt' });
run('Build', 'npm run build -- --sourcemap');
run(
  'Bundle analysis',
  'npx source-map-explorer "dist/assets/*.js" --json',
  { report: 'bundle-analysis.json' }
);

console.log('[Diagnose] Reports available in /reports');
