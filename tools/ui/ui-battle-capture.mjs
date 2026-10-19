// Captures the inputs of the battle UI mockup from a published build of the game:
//
//   capture/hud.png      the battle with its current HUD (Akira acting, round 1)
//   capture/minimap.png  the game's minimap canvas at its own pixels
//   capture/frame.png    the same moment with the web header and every HTML overlay hidden and the
//                        battle canvas filling the 1600x900 window
//
// Serve the build first (python3 -m http.server <port> --directory <build>), then:
//
//   PLAYWRIGHT=<path to playwright's index.mjs> node tools/ui/ui-battle-capture.mjs <port> <captureDir>
//
// Chromium is /opt/pw-browsers/chromium (PW_CHROMIUM overrides it). The turn order is rolled for
// each battle, so it reloads until Akira acts first, as in the current 1-turno.png. Files are
// written under a temporary name and renamed. Stop the server afterwards.

import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [port, out] = process.argv.slice(2);
if (!port || !out) {
  console.error('usage: node tools/ui/ui-battle-capture.mjs <port> <captureDir>');
  process.exit(2);
}
const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');
mkdirSync(out, { recursive: true });
const save = (name, buf) => {
  const p = join(out, name), tmp = `${p}.tmp-${process.pid}`;
  writeFileSync(tmp, buf);
  renameSync(tmp, p);
};

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1, locale: 'es-MX' });
await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });
await page.evaluate(() => (localStorage.setItem('shinobi.battleSpeed', '1'), localStorage.setItem('shinobi.tips.off', '1')));
for (let tries = 1; ; tries++) {
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByText('Renegados en el claro').click();
  await page.getByRole('button', { name: /Atacar/ }).first().waitFor({ timeout: 120000 });
  await page.waitForTimeout(2500);
  const akira = await page.evaluate(() => document.body.innerText.includes('Mirai · Bukijutsu Master'));
  console.log(`try ${tries}: Akira acting = ${akira}`);
  if (akira) break;
  if (tries >= 12) throw new Error('Akira never acted first');
}
save('hud.png', await page.screenshot());
const mini = await page.evaluate(() => {
  const m = [...document.querySelectorAll('canvas')].find((c) => c.width === 260);
  return m ? m.toDataURL('image/png') : null;
});
if (mini) save('minimap.png', Buffer.from(mini.split(',')[1], 'base64'));
// No web header in battle, no HTML overlays: only the battle canvas, filling the window.
await page.addStyleTag({
  content: `header { display: none !important; }
    body * { visibility: hidden !important; }
    canvas { visibility: visible !important; }
    canvas[width="260"] { visibility: hidden !important; }`,
});
await page.evaluate(() => {
  const c = [...document.querySelectorAll('canvas')].find((x) => x.width !== 260);
  for (let e = c.parentElement; e && e !== document.body; e = e.parentElement) {
    e.style.height = '900px';
    e.style.minHeight = '900px';
    e.style.maxHeight = 'none';
  }
});
await page.waitForTimeout(700);
save('frame.png', await page.screenshot());
await browser.close();
