import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await (await b.newContext({ locale: 'es-MX' })).newPage();
p.on('response', (r) => r.status() >= 400 && console.log(r.status(), r.url()));
await p.goto('http://127.0.0.1:5199/#missions'); await p.waitForTimeout(1500);
await b.close();
