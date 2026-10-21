import { renderSprite } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_bed1fab7-89e-1/src/sprite/compose';
import { PARTS } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_bed1fab7-89e-1/src/sprite/raster';
const look = (body: string) => ({ version: 1, body, skin: '#f6d2b4', eyeShape: 'bright', eyeColor: '#3a7bd5', slots: { hair: { id: 'hair_none', colors: ['#f2cb52'] }, top: { id: 'top_highcollar', colors: ['#2c3448'] }, bottom: { id: 'bottom_shinobi', colors: ['#252b3a', '#252b3a'] }, feet: { id: 'feet_sandals', colors: [] } }, accessories: [], headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' }, chakra: { color: 'blue', onCharge: true, onCast: true, onVictory: false }, pixelEdits: [] } as any);
const near = new Set(['upperArmN', 'forearmN', 'handN'].map((p) => PARTS.indexOf(p as any)));
const cells: [string, string, number][] = [['female', 'idle', 0], ['slender', 'idle', 0], ['female', 'walk', 2], ['female', 'walk', 0], ['female', 'attack', 1], ['female', 'castBook', 0]];
for (const [body, pose, fr] of cells) {
  const f = renderSprite(look(body), pose as any, fr) as any;
  const k = f.rig.bp.headScale, hx = f.rig.head.x * 2, hy = f.rig.head.y * 2;
  const rows: string[] = [];
  for (let hl = 4; hl <= 22; hl += 2) {
    const fy = Math.round(hy + hl * k * 2);
    let mx = -99;
    for (let fx = 0; fx < hx + 6; fx++) if (near.has(f.part[fy * 128 + fx])) mx = fx;
    rows.push(`${hl}:${mx < 0 ? '-' : ((mx + 1 - hx) / 2 / k).toFixed(1)}`);
  }
  console.log(body, pose, fr, rows.join(' '));
}
