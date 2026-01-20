import puppeteer from 'puppeteer';

const PORT = process.env.PREVIEW_PORT || 4173;
const BASE = `http://localhost:${PORT}`;
const PAGES = ['/', '/dashboard', '/inventory', '/reports'];

async function run() {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(30000);

  const results = [];

  for (const path of PAGES) {
    const url = `${BASE}${path}`;
    const pageResult = { path, url, console: [], networkErrors: [], status: null };

    page.on('console', msg => {
      try {
        const text = msg.text();
        pageResult.console.push({ type: msg.type(), text });
      } catch (e) {}
    });

    page.on('response', resp => {
      const status = resp.status();
      if (status >= 400) {
        pageResult.networkErrors.push({ url: resp.url(), status, statusText: resp.statusText() });
      }
    });

    try {
      const resp = await page.goto(url, { waitUntil: 'networkidle2' });
      pageResult.status = resp ? resp.status() : null;
    } catch (err) {
      pageResult.console.push({ type: 'error', text: String(err) });
      pageResult.status = null;
    }

    // small delay to ensure all console messages arrive
    await new Promise((res) => setTimeout(res, 500));

    results.push(pageResult);

    // remove listeners to avoid duplicate logging on next iteration
    page.removeAllListeners('console');
    page.removeAllListeners('response');
  }

  await browser.close();

  const failures = results.filter(r => (r.status && r.status >= 400) || r.networkErrors.length || r.console.some(c => c.type === 'error'));

  const summary = { base: BASE, results, failuresCount: failures.length };
  console.log(JSON.stringify(summary, null, 2));

  if (failures.length) {
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}

run().catch(err => { console.error(err); process.exit(2); });
