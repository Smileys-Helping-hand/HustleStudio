import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';

const PORT = process.env.PREVIEW_PORT || 4173;
const DIST = path.resolve(process.cwd(), 'dist');
const PAGES = ['/', '/dashboard', '/inventory', '/reports', '/cv-generator'];

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html';
    case '.js': return 'application/javascript';
    case '.css': return 'text/css';
    case '.json': return 'application/json';
    case '.svg': return 'image/svg+xml';
    case '.png': return 'image/png';
    case '.jpg': case '.jpeg': return 'image/jpeg';
    default: return 'application/octet-stream';
  }
}

async function serveFile(req, res) {
  try {
    let reqPath = decodeURIComponent(new URL(req.url, `http://localhost`).pathname);
    let filePath = path.join(DIST, reqPath);

    // If path is directory or doesn't exist, serve index.html (SPA fallback)
    try {
      const stat = await fs.stat(filePath);
      if (stat.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }
    } catch (e) {
      // file doesn't exist -> fallback to index.html
      filePath = path.join(DIST, 'index.html');
    }

    const data = await fs.readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentType(filePath) });
    res.end(data);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
}

async function runSmoke() {
  const server = http.createServer((req, res) => {
    serveFile(req, res);
  });

  await new Promise((res, rej) => server.listen(PORT, (err) => err ? rej(err) : res()));
  console.log(`Serving dist on http://localhost:${PORT}`);

  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(30000);

  const results = [];

  for (const pathUrl of PAGES) {
    const url = `http://localhost:${PORT}${pathUrl}`;
    const pageResult = { path: pathUrl, url, console: [], networkErrors: [], status: null };

    page.on('console', msg => {
      try { pageResult.console.push({ type: msg.type(), text: msg.text() }); } catch (e) {}
    });
    page.on('response', resp => {
      const status = resp.status();
      if (status >= 400) pageResult.networkErrors.push({ url: resp.url(), status, statusText: resp.statusText() });
    });

    try {
      const resp = await page.goto(url, { waitUntil: 'networkidle2' });
      pageResult.status = resp ? resp.status() : null;
    } catch (err) {
      pageResult.console.push({ type: 'error', text: String(err) });
      pageResult.status = null;
    }

    await new Promise(r => setTimeout(r, 500));

    results.push(pageResult);

    page.removeAllListeners('console');
    page.removeAllListeners('response');
  }

  await browser.close();
  server.close();

  const failures = results.filter(r => (r.status && r.status >= 400) || r.networkErrors.length || r.console.some(c => c.type === 'error'));
  const summary = { base: `http://localhost:${PORT}`, results, failuresCount: failures.length };
  console.log(JSON.stringify(summary, null, 2));

  process.exitCode = failures.length ? 1 : 0;
}

runSmoke().catch(err => { console.error(err); process.exit(2); });
