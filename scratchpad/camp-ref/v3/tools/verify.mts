// Checks every read frame: the face is not covered by the hands, the chin hand touches the chin, the far
// hand lies on the book, no far forearm shows below the book. tsx verify.mts <root>
const root = process.argv[2];
const { renderSprite } = await import(root + '/src/sprite/compose.ts');
const { getAppearance, dojutsuToEye } = await import(root + '/src/sprite/legacy.ts');
const { LEGENDARY_PRESETS } = await import(root + '/src/data/shinobiData.ts');
const { PARTS, GRID } = await import(root + '/src/sprite/raster.ts');
const art = await import(root + '/src/sprite/readArt.ts');
const P = (n: string) => PARTS.indexOf(n);
const HEAD = P('head');
const HN = P('handN');
const HF = P('handF');
const FAF = P('forearmF');
const chinRows = [...art.HAND_CHIN.rows];
const bookRows = [...art.READ_BOOK.rows];
let bad = 0;
let n = 0;
const hands = ['own', 'bare', 'hands_fingerless', 'hands_bracers', 'hands_gauntlets', 'hands_wraps', 'hands_crimson_gauntlets'];
for (const i of [0, 1, 2]) {
  const p = LEGENDARY_PRESETS[i];
  const base = getAppearance(p.character);
  const eye = dojutsuToEye(p.character.dojutsu);
  for (const body of ['male', 'female', 'bulky', 'slender'])
    for (const w of ['held', 'none'])
      for (const h of hands) {
        if (h !== 'own' && w === 'none') continue;
        const look: any = { ...base, body, slots: { ...base.slots } };
        if (w === 'none') delete look.slots.held;
        if (h === 'bare') delete look.slots.hands;
        else if (h !== 'own') look.slots.hands = { id: h, colors: [] };
        for (let f = 0; f < 12; f++) {
          // without the chin hand and the book: where the face is
          (art.HAND_CHIN as any).rows = chinRows.map((r: string) => '.'.repeat(r.length));
          (art.READ_BOOK as any).rows = bookRows.map((r: string) => '.'.repeat(r.length));
          const bare = renderSprite(look, 'read', f, eye);
          (art.HAND_CHIN as any).rows = chinRows;
          (art.READ_BOOK as any).rows = bookRows;
          const fr = renderSprite(look, 'read', f, eye);
          n++;
          const msgs: string[] = [];
          let covered = 0;
          let faceBottom = -1;
          for (let k = 0; k < GRID * GRID; k++) {
            if (bare.part[k] === HEAD && bare.rgba[k * 4 + 3]) {
              faceBottom = Math.max(faceBottom, (k / GRID) | 0);
              const lum = 0.3 * bare.rgba[k * 4] + 0.59 * bare.rgba[k * 4 + 1] + 0.11 * bare.rgba[k * 4 + 2];
              if (fr.part[k] !== HEAD && lum > 70) covered++;
            }
          }
          // the chin hand's top and the book box
          let hTop = 999;
          let fh = 0;
          let fhOut = 0;
          let bx0 = 999, by0 = 999, bx1 = -1, by1 = -1;
          for (let k = 0; k < GRID * GRID; k++) {
            const x = k % GRID, y = (k / GRID) | 0;
            if (!fr.rgba[k * 4 + 3]) continue;
            if (fr.part[k] === HN) hTop = Math.min(hTop, y);
          }
          // book pixels: those that differ from the render without the book and are not hands
          for (let k = 0; k < GRID * GRID; k++) {
            const x = k % GRID, y = (k / GRID) | 0;
            const diff = fr.rgba[k * 4] !== bare.rgba[k * 4] || fr.rgba[k * 4 + 1] !== bare.rgba[k * 4 + 1] || fr.rgba[k * 4 + 2] !== bare.rgba[k * 4 + 2] || fr.rgba[k * 4 + 3] !== bare.rgba[k * 4 + 3];
            if (diff && fr.part[k] !== HN && fr.part[k] !== HF) {
              bx0 = Math.min(bx0, x); by0 = Math.min(by0, y); bx1 = Math.max(bx1, x); by1 = Math.max(by1, y);
            }
          }
          for (let k = 0; k < GRID * GRID; k++) {
            const x = k % GRID, y = (k / GRID) | 0;
            if (!fr.rgba[k * 4 + 3] || fr.part[k] !== HF) continue;
            fh++;
            if (x < bx0 || x > bx1 || y < by0 || y > by1 + 1) fhOut++;
          }
          let stub = 0;
          for (let k = 0; k < GRID * GRID; k++) {
            const y = (k / GRID) | 0;
            if (fr.rgba[k * 4 + 3] && fr.part[k] === FAF && y > by1) stub++;
          }
          if (covered) msgs.push(`face covered ${covered}`);
          if (hTop - faceBottom > 2) msgs.push(`chin hand ${hTop - faceBottom} rows below the face`);
          if (!fh) msgs.push('no far hand');
          if (fhOut) msgs.push(`far hand off the book ${fhOut}`);
          if (stub) msgs.push(`far forearm below the book ${stub}`);
          if (msgs.length) {
            bad++;
            console.log(`p${i} ${body} ${w} ${h} f${f}: ${msgs.join(', ')} (face bottom ${faceBottom}, hand top ${hTop}, book ${bx0},${by0}-${bx1},${by1})`);
          }
        }
      }
}
console.log(`${n} frames checked, ${bad} with problems`);
