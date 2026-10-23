// The joint the owner's Trunks read and sit frames are pinned to (tools/refs/trunks-read-from-ref.py,
// trunks-sit-from-ref.py): the pelvis of our male rig in every frame of the read and sit poses, in fine
// pixels of the frame (the same in every frame of a pose: his figure sits still). Paste the output into
// the scripts' PELVIS when the rig changes, then rerun them.
//
//   npx tsx tools/refs/trunks-pose-joints.mts

import { drawRig, frameCount, rigPoseFor } from '../../src/sprite/rig';
import { RES } from '../../src/sprite/raster';
import type { SpritePose } from '../../src/sprite/types';

for (const pose of ['read', 'sit'] as SpritePose[]) {
  const at = new Set<string>();
  for (let f = 0; f < frameCount(pose); f++) {
    const r = drawRig('male', rigPoseFor(pose), f);
    at.add(`(${(r.pelvis.x * RES).toFixed(6)}, ${(r.pelvis.y * RES).toFixed(6)})`);
  }
  console.log(`${pose}: ${[...at].join(' ')}`);
}
