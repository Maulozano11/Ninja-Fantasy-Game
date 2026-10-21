// For each page-turn frame: pixels the turning page adds, and which of them sit over the head part or
// outside the book's rows/cols (above the book top). tsx page.mts <root>
const root = process.argv[2];
const { renderSprite } = await import(root + '/src/sprite/compose.ts');
const { getAppearance, dojutsuToEye } = await import(root + '/src/sprite/legacy.ts');
const { LEGENDARY_PRESETS } = await import(root + '/src/data/shinobiData.ts');
const { PARTS, GRID } = await import(root + '/src/sprite/raster.ts');
const art = await import(root + '/src/sprite/readArt.ts');
const HEAD = PARTS.indexOf('head');
const saved = art.READ_PAGE_TURN.map((p: any) => [...p.rows]);
for (const i of [0, 1, 2]) {
  const p = LEGENDARY_PRESETS[i];
  const base = getAppearance(p.character);
  const eye = dojutsuToEye(p.character.dojutsu);
  for (const body of ['male', 'female', 'bulky', 'slender']) {
    const look: any = { ...base, body, slots: { ...base.slots } };
    for (const f of [9, 10, 11]) {
      art.READ_PAGE_TURN.forEach((pg: any) => (pg.rows = pg.rows.map((r: string) => '.'.repeat(r.length))));
      const a = renderSprite(look, 'read', f, eye);
      art.READ_PAGE_TURN.forEach((pg: any, k: number) => (pg.rows = saved[k]));
      const b = renderSprite(look, 'read', f, eye);
      let n = 0, overHead = 0, minY = 999, cells: string[] = [];
      for (let k = 0; k < GRID * GRID; k++) {
        let d = false;
        for (let c = 0; c < 4; c++) if (a.rgba[k * 4 + c] !== b.rgba[k * 4 + c]) d = true;
        if (!d) continue;
        n++;
        const x = k % GRID, y = (k / GRID) | 0;
        minY = Math.min(minY, y);
        if (a.part[k] === HEAD && a.rgba[k * 4 + 3]) { overHead++; cells.push(`${x},${y}`); }
      }
      console.log(`p${i} ${body} f${f}: page px ${n}, top row ${minY}, over head ${overHead} ${cells.join(' ')}`);
    }
  }
}
