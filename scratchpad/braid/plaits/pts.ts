import { renderSprite } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_bed1fab7-89e-1/src/sprite/compose';
const look = (body: string) => ({ version: 1, body, skin: '#f6d2b4', eyeShape: 'bright', eyeColor: '#3a7bd5', slots: { hair: { id: 'hair_charlotte', colors: ['#f2cb52'] }, top: { id: 'top_highcollar', colors: ['#2c3448'] }, bottom: { id: 'bottom_shinobi', colors: ['#252b3a', '#252b3a'] }, feet: { id: 'feet_sandals', colors: [] } }, accessories: [], headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' }, chakra: { color: 'blue', onCharge: true, onCast: true, onVictory: false }, pixelEdits: [] } as any);
const cells: [string, string, number][] = [['female', 'idle', 0], ['slender', 'idle', 0], ['female', 'walk', 2], ['female', 'attack', 1], ['female', 'castBook', 0]];
for (const [body, pose, fr] of cells) {
  const { rig } = renderSprite(look(body), pose as any, fr) as any;
  const b = rig.bp;
  const k = b.headScale;
  const th = (p: any) => [((p.x - rig.head.x) / k).toFixed(1), ((p.y - rig.head.y) / k).toFixed(1)].join(',');
  console.log(body, pose, fr, 'head', rig.head.x.toFixed(1), rig.head.y.toFixed(1), 'k', k, 'Lt', b.torsoLen, 'sh', b.shoulderHalf, 'ch', b.chestHalf, 'lean', rig.lean?.toFixed?.(2), 'right', rig.right.x.toFixed(2), rig.right.y.toFixed(2));
  console.log('  shoulderN', th(rig.shoulderN), 'elbowN', th(rig.elbowN), 'nearTip', th(rig.T(-b.shoulderHalf * 0.55, b.torsoLen - 8)), 'T(-2,Lt-4)', th(rig.T(-2, b.torsoLen - 4)), 'T(-3,Lt-10)', th(rig.T(-3, b.torsoLen - 10)), 'T(0,Lt)', th(rig.T(0, b.torsoLen)));
}
