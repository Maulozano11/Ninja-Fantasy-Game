import { sheet, baseLook, Cell } from '../tools/sheet';
const dir = process.argv[2];
const base = (body: any) => ({ hair: { id: 'hair_sunburst', colors: ['#2a2f45'] }, top: { id: 'top_highcollar', colors: [] }, bottom: { id: 'bottom_shinobi', colors: [] }, feet: { id: 'feet_leather', colors: [] } });
const poses: [any, number][] = [['idle', 0], ['attack', 0], ['attack', 1], ['cast', 0], ['hurt', 0], ['victory', 0], ['charge', 1]];
const bodies = ['male', 'female', 'bulky'] as const;
// 1) capes: each cape row = body cycles, poses as columns
let cells: Cell[] = [];
const capes = ['cape_shadow', 'cape_haori', 'cape_knight', 'cape_rogue', 'cape_traveler', 'cape_scarf'];
capes.forEach((id, i) => { const body = bodies[i % 3]; for (const [pose, frame] of poses) cells.push({ look: baseLook({ body, slots: { ...base(body), cape: { id, colors: [] } } as any }), pose, frame }); });
sheet(`${dir}/final_capes.png`, cells, poses.length, 2);
// 2) held
cells = [];
const held = ['held_katana', 'held_crystal', 'held_kunai', 'held_naginata', 'held_spiral', 'held_lightning', 'held_palm'];
held.forEach((id, i) => { const body = bodies[i % 3]; for (const [pose, frame] of poses) cells.push({ look: baseLook({ body, slots: { ...base(body), held: { id, colors: [] } } as any }), pose, frame }); });
sheet(`${dir}/final_held.png`, cells, poses.length, 2);
// 3) faces + accessories: idle on each body + attack frame on one
cells = [];
const faces = ['face_beast', 'face_scar', 'face_sage', 'face_warpaint', 'face_clothmask', 'face_foxmask', 'face_catmask'];
faces.forEach((id, i) => cells.push({ look: baseLook({ body: bodies[i % 3], slots: { ...base(bodies[i % 3]), face: { id, colors: [] } } as any }), pose: 'idle', frame: 0 }));
const accs = [['acc_kunai_leg', 'acc_kunai_shoulder'], ['acc_giant_shuriken', 'acc_shield'], ['acc_twin_swords', 'acc_shoulder_pad'], ['acc_back_katana', 'acc_hip_katana', 'acc_pouch'], ['acc_scroll_back', 'acc_scroll_waist'], ['acc_scarf', 'acc_chest_strap'], ['acc_shield', 'acc_back_katana', 'acc_kunai_leg']];
accs.forEach((ids, i) => { for (const [pose, frame] of [['idle', 0], ['attack', 1]] as [any, number][]) cells.push({ look: baseLook({ body: bodies[i % 3], slots: base(bodies[i % 3]) as any, accessories: ids.map((id) => ({ id, colors: [] })) }), pose, frame }); });
sheet(`${dir}/final_face_acc.png`, cells, 7, 2);
