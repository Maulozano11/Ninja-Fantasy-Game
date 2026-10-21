// npx tsx hashes.mts <src root> : one hash per render of every existing eye shape x face shape x body x
// pose x special eye (and a hair colour), printed as JSON lines, to compare two trees.
import { createHash } from 'node:crypto';

const root = process.argv[2];
const { renderSprite } = await import(`${root}/sprite/compose.ts`);
const EYES = ['standard', 'sharp', 'round', 'calm', 'fierce', 'bright', 'piercing', 'valiant'];
const FACES = ['tapered', 'soft', 'square', 'valiant'];
const BODIES = ['female', 'male', 'bulky', 'slender'];
const POSES: [string, number][] = [['idle', 0], ['read', 0], ['downed', 0], ['attack', 1], ['cast', 0]];
const SPECIAL = ['none', 'tomoe3', 'paleVeins', 'sage'];
let n = 0;
const h = createHash('sha256');
for (const eyeShape of EYES) for (const faceShape of FACES) for (const body of BODIES) for (const [pose, frame] of POSES) for (const sp of SPECIAL) {
  const look = {
    version: 1, body, skin: '#f6c7a6', eyeShape, faceShape, eyeColor: '#2f9e6a',
    slots: { hair: { id: 'hair_none', colors: ['#a0522d'] } }, accessories: [],
    headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' },
    chakra: { color: 'red', onCharge: false, onCast: false, onVictory: false }, pixelEdits: [],
  };
  const f = renderSprite(look, pose, frame, sp);
  const one = createHash('sha256').update(f.rgba).digest('hex').slice(0, 16);
  console.log(`${eyeShape} ${faceShape} ${body} ${pose}${frame} ${sp} ${one}`);
  h.update(one);
  n++;
}
console.error(n, 'renders, all:', h.digest('hex').slice(0, 16));
