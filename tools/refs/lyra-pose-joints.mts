// The joints the owner's Lyra frames are pinned to (tools/refs/lyra-read-from-ref.py, lyra-throw-from-ref.py,
// lyra_sit_ref.py): her preset's rig (the female body, her long arms and long neck) in the read pose's three
// keys (rig.ts READ_KEYS: frames 0, 2 and 8), the throw's frames 3 and 4 and the sit's one key (SIT_KEYS), in
// fine pixels of the frame. Paste the
// output into the scripts' JOINTS when the rig changes, then rerun them.
//
//   npx tsx tools/refs/lyra-pose-joints.mts

import { LEGENDARY_PRESETS } from '../../src/data/shinobiData';
import { spriteLayers } from '../../src/sprite/compose';
import { RES } from '../../src/sprite/raster';
import type { SpritePose } from '../../src/sprite/types';

const lyra = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_lyra')!.character.appearance!;
const names = ['head', 'neck', 'pelvis', 'shoulderN', 'shoulderF', 'elbowN', 'elbowF', 'wristN', 'wristF', 'handN', 'handF', 'hipN', 'hipF', 'kneeN', 'kneeF', 'ankleN', 'ankleF'] as const;
for (const [pose, frames] of [['read', [0, 2, 8]], ['throw', [3, 4]], ['sit', [0]]] as [SpritePose, number[]][]) {
  console.log(`# ${pose}`);
  for (const f of frames) {
    const { rig } = spriteLayers(lyra, pose, f);
    console.log(`    ${f}: {${names.map((n) => `'${n}': (${(rig[n].x * RES).toFixed(6)}, ${(rig[n].y * RES).toFixed(6)})`).join(', ')}},`);
  }
}
