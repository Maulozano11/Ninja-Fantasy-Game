import { createHash } from 'node:crypto';
import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_729c8c69-486-3/src/data/shinobiData';
import { renderSpriteCached } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_729c8c69-486-3/src/sprite/compose';
import { defaultAppearance } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_729c8c69-486-3/src/sprite/legacy';
import { renderChakra } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_729c8c69-486-3/src/sprite/chakra';
const h = createHash('sha256');
const bursts = ['red','orange','yellow','green','blue','indigo','violet','white','black','brown'];
const tints = [undefined, 'black', 'white', 'red', '#000000', '#ffffff', '#b45cff', '#123456'];
const bodies = ['male','female','bulky','slender'];
let n = 0;
for (const body of bodies) {
  const look = defaultAppearance(); look.body = body as any;
  for (const pose of ['idle','charge','cast','victory','walk','downed'] as const) {
    const spr = renderSpriteCached(look, pose, 1);
    h.update(Buffer.from(spr.rgba));
    for (const b of bursts) for (const mode of ['aura','charge','cast','victory'] as const) for (const tint of tints) for (const t of [0, 5, 13]) {
      const fx = renderChakra(b as any, mode, t, spr.rgba, spr.rig, tint);
      h.update(Buffer.from(fx.back)); h.update(Buffer.from(fx.front)); n++;
    }
  }
}
// also: the Aiden preset sprite
const a = LEGENDARY_PRESETS.find((p: any) => p.character.id === 'preset_reference_aiden')!.character.appearance;
for (const pose of ['idle','cast','charge'] as const) h.update(Buffer.from(renderSpriteCached(a, pose, 0).rgba));
console.log(n, h.digest('hex'));
