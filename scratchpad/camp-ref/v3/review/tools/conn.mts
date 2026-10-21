// Per read frame: is the near hand joined to the near forearm, is the far hand joined to the far forearm
// or the book, hand bbox relative to the chin pixel (stability across frames). tsx conn.mts <root>
const root = process.argv[2];
const { renderSprite } = await import(root + '/src/sprite/compose.ts');
const { getAppearance, dojutsuToEye } = await import(root + '/src/sprite/legacy.ts');
const { LEGENDARY_PRESETS } = await import(root + '/src/data/shinobiData.ts');
const { PARTS, GRID } = await import(root + '/src/sprite/raster.ts');
const HN = PARTS.indexOf('handN'), FN = PARTS.indexOf('forearmN'), HEAD = PARTS.indexOf('head');
const hands = ['own', 'bare', 'hands_fingerless', 'hands_bracers', 'hands_gauntlets', 'hands_wraps', 'hands_crimson_gauntlets'];
for (const i of [0, 1, 2]) {
  const p = LEGENDARY_PRESETS[i];
  const base = getAppearance(p.character);
  const eye = dojutsuToEye(p.character.dojutsu);
  for (const body of ['male', 'female', 'bulky', 'slender'])
    for (const h of hands) {
      const look: any = { ...base, body, slots: { ...base.slots } };
      if (h === 'bare') delete look.slots.hands; else if (h !== 'own') look.slots.hands = { id: h, colors: [] };
      const rel = new Set<string>();
      const fn = new Set<number>();
      for (let f = 0; f < 12; f++) {
        const r = renderSprite(look, 'read', f, eye);
        let hx0 = 999, hy0 = 999, hx1 = -1, hy1 = -1, faceB = -1, touch = 0, nh = 0, nf = 0;
        for (let k = 0; k < GRID * GRID; k++) {
          if (!r.rgba[k * 4 + 3]) continue;
          const x = k % GRID, y = (k / GRID) | 0;
          if (r.part[k] === HEAD) faceB = Math.max(faceB, y);
          if (r.part[k] === FN) nf++;
          if (r.part[k] !== HN) continue;
          nh++;
          hx0 = Math.min(hx0, x); hy0 = Math.min(hy0, y); hx1 = Math.max(hx1, x); hy1 = Math.max(hy1, y);
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const kk = (y + dy) * GRID + x + dx;
            if (r.rgba[kk * 4 + 3] && r.part[kk] === FN) touch++;
          }
        }
        rel.add(`${hx0 - 0},${hy0 - faceB},${hx1 - hx0},${hy1 - hy0}`);
        fn.add(nf);
        if (!touch) console.log(`p${i} ${body} ${h} f${f}: near hand not touching forearm (hand px ${nh}, forearm px ${nf})`);
      }
      if (rel.size > 2) console.log(`p${i} ${body} ${h}: hand box vs face varies over frames: ${[...rel].join(' | ')}`);
    }
}
console.log('done');
