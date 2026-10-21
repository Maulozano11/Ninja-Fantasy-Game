import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { readFileSync } from 'node:fs';
const [OUT, PREFIX, LANG = 'es'] = process.argv.slice(2);
const D = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errors = [];
async function page(file, width) {
  const ctx = await browser.newContext({ viewport: { width, height: 1000 } });
  await ctx.addInitScript(([run, lang]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('shinobi5e.mission.v1', run); localStorage.setItem('shinobi.lang', lang); sessionStorage.setItem('seeded', '1'); } }, [readFileSync(file, 'utf8'), LANG]);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto('http://127.0.0.1:5231/#missions'); await p.waitForTimeout(1500);
  return p;
}
const shotSection = async (p, name) => {
  // from the camp header to the end of the camp grid
  const top = await p.evaluate(() => { const h = [...document.querySelectorAll('h2')].find((e) => e.closest('.space-y-4')); return h ? h.getBoundingClientRect().top + scrollY - 40 : 0; });
  const h = await p.evaluate(() => document.documentElement.scrollHeight);
  await p.screenshot({ path: `${OUT}/${PREFIX}-${name}.png`, fullPage: true, clip: { x: 0, y: top, width: p.viewportSize().width, height: Math.min(1300, h - top) } });
};
const W = Number(process.env.W ?? 1360);
let p = await page(`${D}/art3/ui/camp-fire.json`, W);
await shotSection(p, 'fire');
await p.context().close();
p = await page(`${D}/i18n/camp.json`, W);
// keyboard focus on the dinner scroll
const dinner = p.getByRole('button', { name: LANG === 'es' ? 'Ir a cenar' : 'Go to dinner' });
await p.getByRole('button', { name: LANG === 'es' ? /Fabricar material/ : /Make material/ }).focus();
await p.keyboard.press('Tab');
await dinner.scrollIntoViewIfNeeded();
const box = await dinner.boundingBox();
await p.screenshot({ path: `${OUT}/${PREFIX}-focus.png`, clip: { x: Math.max(0, box.x - 300), y: box.y - 40, width: Math.min(W, box.width + 340), height: box.height + 80 } });
await dinner.click(); await p.waitForTimeout(400);
await shotSection(p, 'food');
await p.getByRole('button', { name: LANG === 'es' ? /Comida caliente/ : /Hot meal/ }).click(); await p.waitForTimeout(400);
await shotSection(p, 'night');
await p.getByRole('button', { name: LANG === 'es' ? 'Dormir' : 'Sleep' }).click(); await p.waitForTimeout(600);
await shotSection(p, 'after-sleep');
const wake = p.getByRole('button', { name: LANG === 'es' ? 'Despertar' : 'Wake up' });
if (await wake.count()) { await wake.click(); await p.waitForTimeout(500); await shotSection(p, 'done'); }
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
