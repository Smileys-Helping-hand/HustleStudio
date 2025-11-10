#!/usr/bin/env node
import { spawnSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const log = (msg) => console.log(`\n[HS QA] ${msg}`);
const warn = (msg) => console.warn(`\n[HS QA] ${msg}`);
const error = (msg) => console.error(`\n[HS QA] ${msg}`);

const runCommand = (title, command, args, options = {}) => {
  log(`${title}...`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: false,
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(`${title} failed`);
  }
};

const ensureDirectory = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const optimiseLocalAssets = async () => {
  const assetRoot = path.resolve('public/assets');
  const groups = ['backgrounds', 'logos', 'media', 'patterns'];
  const existingGroups = groups.filter((group) => fs.existsSync(path.join(assetRoot, group)));

  if (!existingGroups.length) {
    warn('No local asset folders found. Assets are assumed to be served from the CDN — skipping optimisation.');
    return;
  }

  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch (err) {
    warn('The `sharp` package is not installed. Skipping image optimisation.');
  }

  for (const group of existingGroups) {
    const groupPath = path.join(assetRoot, group);
    const entries = fs.readdirSync(groupPath).filter((file) => fs.statSync(path.join(groupPath, file)).isFile());
    if (!entries.length) continue;

    if (sharp && (group === 'backgrounds' || group === 'patterns')) {
      for (const file of entries.filter((name) => name.toLowerCase().endsWith('.webp'))) {
        const filePath = path.join(groupPath, file);
        try {
          const buffer = await sharp(filePath).resize({ width: 1920, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
          fs.writeFileSync(filePath, buffer);
          log(`Optimised ${path.relative(process.cwd(), filePath)}`);
        } catch (err) {
          warn(`Failed to optimise ${file}: ${err.message}`);
        }
      }
    }
  }

  const mediaPath = path.join(assetRoot, 'media');
  if (fs.existsSync(mediaPath)) {
    const ffmpegCheck = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    if (ffmpegCheck.status !== 0) {
      warn('FFmpeg not available. Skipping video/audio optimisation.');
    } else {
      const mediaEntries = fs.readdirSync(mediaPath);
      for (const file of mediaEntries) {
        const src = path.join(mediaPath, file);
        if (!fs.statSync(src).isFile()) continue;
        const ext = path.extname(file).toLowerCase();
        if (ext === '.mp4') {
          const target = path.join(mediaPath, file.replace(/\.mp4$/, '-optimized.mp4'));
          spawnSync('ffmpeg', ['-i', src, '-vcodec', 'libx264', '-crf', '28', '-preset', 'veryfast', target, '-y'], {
            stdio: 'inherit',
          });
        }
        if (ext === '.mp3') {
          const target = path.join(mediaPath, file.replace(/\.mp3$/, '-optimized.mp3'));
          spawnSync('ffmpeg', ['-i', src, '-b:a', '128k', target, '-y'], {
            stdio: 'inherit',
          });
        }
      }
    }
  }
};

const runLighthouseIfRequested = async () => {
  if (process.env.HS_RUN_LIGHTHOUSE !== 'true') {
    warn('Skipping Lighthouse audit (set HS_RUN_LIGHTHOUSE=true to enable).');
    return;
  }

  log('Starting preview server for Lighthouse audit...');
  const preview = spawn('npm', ['run', 'preview', '--', '--host', '0.0.0.0', '--port', '4173'], { stdio: 'inherit' });

  await new Promise((resolve) => setTimeout(resolve, 4000));

  try {
    ensureDirectory('reports');
    const lighthouseResult = spawnSync('npx', [
      'lighthouse',
      'http://127.0.0.1:4173',
      '--preset=desktop',
      '--output=json',
      '--output-path=reports/lighthouse.json',
      '--quiet',
    ], {
      stdio: 'inherit',
    });

    if (lighthouseResult.status !== 0) {
      warn('Lighthouse reported warnings or failed to run. Check terminal output for details.');
    }
  } finally {
    preview.kill('SIGINT');
  }
};

const updateReadmeSummary = () => {
  const readmePath = path.resolve('README.md');
  const startMarker = '<!-- QA_DEPLOYMENT_SUMMARY:START -->';
  const endMarker = '<!-- QA_DEPLOYMENT_SUMMARY:END -->';
  const original = fs.readFileSync(readmePath, 'utf8');
  const startIndex = original.indexOf(startMarker);
  const endIndex = original.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1) {
    warn('README markers not found. Skipping deployment summary update.');
    return;
  }

  const reportPath = path.resolve('reports/lighthouse.json');
  let performance = 'Pending';
  if (fs.existsSync(reportPath)) {
    try {
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      if (report?.categories?.performance?.score != null) {
        performance = `${Math.round(report.categories.performance.score * 100)}%`;
      }
    } catch (err) {
      warn(`Could not parse Lighthouse report: ${err.message}`);
    }
  } else {
    warn('Lighthouse report not found. Performance score will be marked as pending.');
  }

  const commit = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).stdout.trim() || 'unknown';
  const dirty = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout.trim().length > 0;
  const commitLabel = dirty ? `${commit} (dirty)` : commit;
  const date = new Date().toISOString();

  const summary = [
    `**Commit:** ${commitLabel}`,
    `**Generated:** ${date}`,
    `**Performance Score:** ${performance}`,
    `**Amplify Domain:** https://hustlestudio.co.za`,
    `**Firebase Backup:** https://side-hustle-studio.web.app`,
    '',
    'Environment validated, brand guard passed, and build artefacts generated with sourcemaps.',
  ].join('\n');

  const before = original.slice(0, startIndex + startMarker.length);
  const after = original.slice(endIndex);
  const nextContent = `${before}\n${summary}\n${after}`;

  fs.writeFileSync(readmePath, nextContent, 'utf8');
  log('README deployment summary updated.');
};

(async () => {
  try {
    runCommand('Validating environment variables', 'node', ['scripts/validateEnv.mjs']);
    runCommand('Running brand consistency guard', 'node', ['scripts/BrandConsistencyGuard.js']);

    await optimiseLocalAssets();

    runCommand('Building project with sourcemaps', 'npm', ['run', 'build', '--', '--sourcemap']);

    await runLighthouseIfRequested();

    updateReadmeSummary();

    log('Final QA complete. Ready for deployment.');
  } catch (err) {
    error(err.message);
    process.exitCode = 1;
  }
})();
