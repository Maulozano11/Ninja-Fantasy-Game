const OUT = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/chakra-nature/review';
const { chromium } = await import('/opt/node-tools/node_modules/playwright/index.mjs');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const [w, h, lang] of [[1600, 900, 'es'], [1366, 768, 'es'], [1920, 1080, 'en']]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', (e) => console.log('ERR', e.message));
  await page.addInitScript((lang) => { localStorage.setItem('shinobi.lang', lang); localStorage.setItem('shinobi.tips.off', '1'); }, lang);
  await page.goto('http://127.0.0.1:5296/#creator');
  await page.waitForTimeout(1500);
  await page.getByText(lang === 'es' ? 'Apariencia' : 'Appearance').first().click();
  await page.waitForTimeout(400);
  await page.getByText('Chakra', { exact: true }).first().click();
  await page.waitForTimeout(800);
  const sec = page.locator('[data-nature]').first();
  const names = lang === 'es' ? ['Fuego', 'Agua', 'Viento', 'Rayo', 'Tierra', 'Sombra', 'Espíritu', 'Luz', 'Vacío'] : ['Fire', 'Water', 'Wind', 'Lightning', 'Earth', 'Shadow', 'Spirit', 'Light', 'Void'];
  // pose bar bounding box
  const pose = page.getByRole('button', { name: lang === 'es' ? 'Reposo' : 'Idle' }).first();
  const pb = await pose.boundingBox().catch(() => null);
  for (const n of names) {
    await sec.locator('button', { hasText: n }).first().click();
    await page.waitForTimeout(250);
    // the description element: the info box after the colour row
    const info = page.locator('div.border.border-slate-800.bg-slate-950\\/60.px-2\\.5.py-2').first();
    const ib = await info.boundingBox();
    const txt = (await info.innerText()).replace(/\n/g, ' / ');
    const covered = pb && ib && pb.x < ib.x + ib.width && pb.y < ib.y + ib.height && pb.y + pb.height > ib.y;
    // is the description hit-tested as the pose bar? sample the right end of the desc line
    const desc = info.locator('div').nth(1);
    const db = await desc.boundingBox();
    const hit = db ? await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? e.tagName + ':' + (e.textContent || '').slice(0, 20) : null; }, [db.x + db.width - 4, db.y + db.height / 2]) : null;
    console.log(w + 'x' + h, lang, n, '| info', ib && [Math.round(ib.x), Math.round(ib.y), Math.round(ib.width), Math.round(ib.height)], '| pose', pb && [Math.round(pb.x), Math.round(pb.y)], covered ? 'OVERLAP' : '', '| hit@descEnd', hit, '|', txt.slice(0, 90));
  }
  await sec.locator('button', { hasText: names[8] }).first().click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/ui-${w}-${lang}-void.png` });
  await page.close();
}
await browser.close();
