import { pathToFileURL } from 'node:url';
const ROOT = '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_jutsu-tint-2';
const { tintVfx } = await import(pathToFileURL(ROOT + '/src/sprite/vfxTint.ts').href);
// synthetic: 600x73 random fire colours, half air
const W = 600, H = 73; const buf = new Uint8Array(W * H * 4);
let seed = 1; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
for (let i = 0; i < W * H; i++) if (rnd() < 0.5) buf.set([200 + (rnd() * 55) | 0, 80 + (rnd() * 100) | 0, 20, rnd() < 0.2 ? 100 : 255], i * 4);
for (const c of ['green', 'black']) { tintVfx(buf, 'fire', c, { width: W, height: H, frameW: 75, frameH: 73 }); const t = performance.now(); for (let k = 0; k < 5; k++) tintVfx(buf, 'fire', c, { width: W, height: H, frameW: 75, frameH: 73 }); console.log(c, ((performance.now() - t) / 5).toFixed(1)); }
