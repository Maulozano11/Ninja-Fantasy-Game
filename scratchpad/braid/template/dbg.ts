import { renderSprite } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_bed1fab7-89e-3/src/sprite/compose';
const look = (body: string) => ({ version: 1, body, skin: '#f6d2b4', eyeShape: 'bright', eyeColor: '#3a7bd5', slots: { hair: { id: 'hair_charlotte', colors: ['#f2cb52'] }, top: { id: 'top_highcollar', colors: ['#2c3448'] }, bottom: { id: 'bottom_shinobi', colors: ['#252b3a', '#252b3a'] }, feet: { id: 'feet_sandals', colors: [] } }, accessories: [], headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' }, chakra: { color: 'blue', onCharge: true, onCast: true, onVictory: false }, pixelEdits: [] } as any);
for (const [body, pose, fr] of [['female', 'idle', 0], ['slender', 'idle', 0], ['female', 'walk', 2], ['female', 'attack', 1], ['female', 'castBook', 0]] as const) {
  const f = renderSprite(look(body), pose as any, fr);
  const r: any = f.rig;
  const b = r.bp;
  const p = (x: number, ty: number) => { const q = r.T(x, ty); return `(${(q.x * 2).toFixed(1)},${(q.y * 2).toFixed(1)})`; };
  console.log(body, pose, 'head', r.head.x * 2, r.head.y * 2, 'k', b.headScale, 'sh', b.shoulderHalf, 'ch', b.chestHalf, 'Lt', b.torsoLen, 'lean', r.lean,
    'T(0,Lt-9)', p(0, b.torsoLen - 9), 'T(-.55sh)', p(-b.shoulderHalf * 0.55, b.torsoLen - 9), 'T(-.2sh)', p(-b.shoulderHalf * 0.2, b.torsoLen - 9), 'T(-sh,Lt)', p(-b.shoulderHalf, b.torsoLen), Object.keys(r).join(','));
}
