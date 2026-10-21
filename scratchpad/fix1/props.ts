import '/home/user/Ninja-Fantasy-Game/src/battle/maps';
import { getMap, propRules, gridFor, waterAtPt, cellCenter } from '/home/user/Ninja-Fantasy-Game/src/battle/map';
const m = getMap('river_forest');
m.props.forEach((p, i) => { const r = propRules(p); if (r.hp !== undefined) console.log(i, p.kind ?? (p as any).type, p.x, p.z, r.hp, r.radius, r.explosive); });
console.log('size', m.widthM);
const g = gridFor('river_forest');
// water rows near x=8..20
const fake: any = { mapId: 'river_forest', walls: [], props: m.props.map(() => ({})) };
for (let z = 0; z < 24; z += 0.5) { let row = ''; for (let x = 0; x < 40; x += 0.5) row += ['.', '~', '#'][waterAtPt(fake, { x, z })]; console.log(z.toFixed(1).padStart(5), row); }
