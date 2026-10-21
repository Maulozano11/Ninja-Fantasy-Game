// Head crops of the female idle with 'shade' eyes in many eye colours, special eyes and hairstyles: <dir>/v<i>.png + labels.json
import { mkdirSync, writeFileSync } from 'node:fs';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_7487bce9-1b7-2/src/sprite/compose';
import { GRID } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_7487bce9-1b7-2/src/sprite/raster';
import { writePng } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_7487bce9-1b7-2/tools/world-sprites/kit';

const dir = process.argv[2];
mkdirSync(dir, { recursive: true });
type V = { label: string; eyeColor?: string; special?: string; hair?: string; hairColor?: string; skin?: string; eyeShape?: string; pose?: string };
const vs: V[] = [
  { label: 'azul (el suyo)' },
  { label: 'verde', eyeColor: '#22c55e' },
  { label: 'rojo', eyeColor: '#d81b2a' },
  { label: 'café', eyeColor: '#5b3a29' },
  { label: 'violeta', eyeColor: '#7c3aed' },
  { label: 'gris', eyeColor: '#e5e7eb' },
  { label: 'ojos pálidos', special: 'pale' },
  { label: 'tres aspas', special: 'tomoe3' },
  { label: 'sabio', special: 'sage' },
  { label: 'pelo largo', hair: 'hair_long', hairColor: '#f6d886' },
  { label: 'pelo cinta', hair: 'hair_ribbon', hairColor: '#f6d886' },
  { label: 'pelo melena', hair: 'hair_bob', hairColor: '#f6d886' },
  { label: 'piel morena', skin: '#a86b43' },
  { label: 'piel oscura', skin: '#5a3220' },
  { label: 'cara Aiden', eyeShape: 'shade' },
];
const labels: string[] = [];
vs.forEach((v, i) => {
  const look: any = {
    version: 1, body: 'female', skin: v.skin ?? '#f4c8a5', eyeShape: v.eyeShape ?? 'shade', eyeColor: v.eyeColor ?? '#088cce',
    faceShape: v.label === 'cara Aiden' ? 'valiant' : undefined,
    slots: v.hair ? { hair: { id: v.hair, colors: [v.hairColor ?? '#f6d886'] } } : {},
    accessories: [],
    headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' },
    chakra: { color: 'red', onCharge: false, onCast: false, onVictory: false },
    pixelEdits: [],
  };
  const f = renderSprite(look, (v.pose ?? 'idle') as any, 0, (v.special ?? 'none') as any);
  const w = 30, h = 30, x0 = 112, y0 = 124;
  const out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const s = ((y0 + y) * GRID + (x0 + x)) * 4;
    out.set(f.rgba.subarray(s, s + 4), (y * w + x) * 4);
  }
  writePng(`${dir}/v${i}.png`, w, h, out);
  labels.push(v.label);
});
writeFileSync(`${dir}/labels.json`, JSON.stringify(labels));
