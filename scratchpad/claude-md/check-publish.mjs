// Opens a served build in Chromium, waits, screenshots it and reports console/request errors.
// node check-publish.mjs <url> <out.png>
const { chromium } = await import('/opt/node-tools/node_modules/playwright/index.mjs');
const [url, out] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const problems = [];
page.on('console', (m) => { if (m.type() === 'error') problems.push('console: ' + m.text()); });
page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
page.on('requestfailed', (r) => problems.push('requestfailed: ' + r.url()));
page.on('response', (r) => { if (r.status() >= 400) problems.push(`http ${r.status()}: ${r.url()}`); });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
await page.screenshot({ path: out });
const text = (await page.innerText('body')).slice(0, 400).replace(/\s+/g, ' ');
console.log(JSON.stringify({ title: await page.title(), text, problems }, null, 1));
await browser.close();
