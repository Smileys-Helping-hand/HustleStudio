#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const bannedTerms = ['nasheed', 'invite', 'wedding', 'duah', 'RSVP', 'parcel'];
const allowExtensions = new Set(['.js', '.jsx', '.json', '.md', '.css', '.html']);
const scannedRoots = ['src', 'public', 'README.md'];
const violations = [];

const scanFile = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  if (!allowExtensions.has(ext) && ext) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const matches = bannedTerms
    .map((term) => ({ term, index: content.toLowerCase().indexOf(term.toLowerCase()) }))
    .filter(({ index }) => index !== -1);
  if (matches.length) {
    violations.push({ file: filePath, terms: matches.map((m) => m.term) });
  }
};

const walk = (target) => {
  if (!fs.existsSync(target)) return;
  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(target)) {
      if (entry.startsWith('.git')) continue;
      walk(path.join(target, entry));
    }
  } else if (stat.isFile()) {
    scanFile(target);
  }
};

for (const rel of scannedRoots) {
  walk(path.resolve(process.cwd(), rel));
}

if (violations.length) {
  console.error('\n[BrandConsistencyGuard] Banned terminology detected:');
  for (const violation of violations) {
    console.error(` - ${path.relative(process.cwd(), violation.file)}: ${[...new Set(violation.terms)].join(', ')}`);
  }
  console.error('Please remove the listed terms before building.');
  process.exit(1);
}

console.log('[BrandConsistencyGuard] Scan complete — no banned language detected.');
