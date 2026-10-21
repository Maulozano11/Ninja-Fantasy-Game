import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { baseLook } from '../shared/sheet';
for (const w of ['founder', 'base']) {
  const look = w === 'base' ? baseLook({ skin: '#f3c39c', slots: { hair: { id: 'hair_midnight', colors: ['#2f3c54'] }, top: { id: 'top_tee', colors: ['#22304d'] }, bottom: { id: 'bottom_shinobi', colors: [] } } } as any) : LEGENDARY_PRESETS[0].character.appearance!;
  for (const pose of ['idle', 'attack', 'cast', 'hurt', 'victory', 'charge', 'handsigns']) {
    const f = renderSprite(look, pose as any, pose === 'attack' ? 1 : 0);
    console.log(w, pose, 'handF', [f.rig.handF.x * 2, f.rig.handF.y * 2].map(Math.round), 'wristF', [f.rig.wristF.x * 2, f.rig.wristF.y * 2].map(Math.round), 'shapeF', f.rig.shapeF, 'handN', [f.rig.handN.x * 2, f.rig.handN.y * 2].map(Math.round), 'shapeN', f.rig.shapeN);
  }
}
