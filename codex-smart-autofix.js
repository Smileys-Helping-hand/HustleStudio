import { promises as fs } from 'fs';
import path from 'path';
import prettier from 'prettier';

const rootDir = path.resolve('src');
const extensions = new Set(['.js', '.jsx']);
let fixedCount = 0;

async function autofixFile(filePath) {
  const original = await fs.readFile(filePath, 'utf8');
  let updated = original;

  // Ensure native button elements declare a safe default type
  updated = updated.replace(/<button(?![^>]*type=)/g, "<button type='button'");
  // Ensure image tags declare an alt attribute for accessibility
  updated = updated.replace(/<img(?![^>]*alt=)/g, '<img alt="" ');

  // Deduplicate identical import statements while preserving order
  const lines = updated.split('\n');
  const seenImports = new Set();
  const dedupedLines = [];
  let importsChanged = false;
  for (const line of lines) {
    if (line.startsWith('import ')) {
      if (seenImports.has(line)) {
        importsChanged = true;
        continue;
      }
      seenImports.add(line);
    }
    dedupedLines.push(line);
  }
  if (importsChanged) {
    updated = dedupedLines.join('\n');
  }

  const prettierConfig = (await prettier.resolveConfig(filePath)) ?? {};
  const formatted = await prettier.format(updated, {
    ...prettierConfig,
    filepath: filePath,
  });

  if (formatted !== original) {
    await fs.writeFile(filePath, formatted);
    fixedCount += 1;
    console.log(`✨ Auto-fixed: ${path.relative(process.cwd(), filePath)}`);
  }
}

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath);
    } else if (extensions.has(path.extname(entry.name))) {
      await autofixFile(fullPath);
    }
  }
}

await walk(rootDir);
console.log(`✅ Codex Smart Auto-Fix complete — ${fixedCount} file(s) formatted.`);
