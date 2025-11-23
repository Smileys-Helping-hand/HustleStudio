import fs from 'node:fs';
import path from 'node:path';
import fetch from 'node-fetch';

const cdnDomain = (process.env.VITE_CDN_DOMAIN || '').trim() || 'https://cdn.hustlestudio.io';
const uploadEndpoint = `${cdnDomain.replace(/\/$/, '')}/upload`;
const assetsRoot = path.resolve('public/assets');

if (!fs.existsSync(assetsRoot)) {
  console.warn('[upload:assets] No assets directory found at', assetsRoot);
  process.exit(0);
}

const allowedExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.mp4', '.mov', '.webm', '.webp']);

function listAssetFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return listAssetFiles(entryPath);
    }
    if (!allowedExtensions.has(path.extname(entry.name).toLowerCase())) {
      return [];
    }
    return [entryPath];
  });
}

const files = listAssetFiles(assetsRoot);

if (!files.length) {
  console.log('[upload:assets] No binary assets found to upload.');
  process.exit(0);
}

(async () => {
  for (const absolutePath of files) {
    const relativePath = path.relative('public', absolutePath).replace(/\\/g, '/');
    const body = fs.readFileSync(absolutePath);

    const response = await fetch(uploadEndpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/octet-stream',
        'x-file-path': relativePath,
      },
      body,
    });

    if (!response.ok) {
      const text = await response.text();
      console.warn(`[upload:assets] Failed to upload ${relativePath} → ${response.status}`, text);
    } else {
      console.log(`[upload:assets] Uploaded ${relativePath} → ${response.status}`);
    }
  }
})();
