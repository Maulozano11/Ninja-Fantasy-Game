import { chromium } from '../pw/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: undefined }).catch(async () => chromium.launch());
for (const [w, h, scheme, name] of [[1280, 900, 'light', 'desk'], [390, 844, 'dark', 'phone']]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, colorScheme: scheme });
  await p.goto('file://' + process.cwd() + '/descansos.html');
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `shot-${name}-top.png` });
  await p.click('#recAll');
  await p.locator('#preguntas').scrollIntoViewIfNeeded();
  await p.waitForTimeout(300);
  await p.screenshot({ path: `shot-${name}-q.png` });
  const sw = await p.evaluate(() => document.documentElement.scrollWidth);
  console.log(name, 'scrollWidth', sw, 'answers', await p.textContent('#answers'));
}
await b.close();
