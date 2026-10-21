// Renders the mockup's characters to RGBA PNGs (128x128) plus anchors (feet x/y, head) in sprites.json.
import { writeFileSync } from 'node:fs';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { getAppearance } from '/home/user/Ninja-Fantasy-Game/src/sprite/legacy';
import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { baseLook, writePng } from '../shared/sheet';
const OUT = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/mockup/sprites';
const it = (id: string, ...colors: string[]) => ({ id, colors });
const band = { position: 'forehead', slashed: true, tails: true, emblem: 'crescent', cloth: '#262a36', plate: '#9aa3b5' };
const preset = (name: string) => getAppearance(LEGENDARY_PRESETS.find((p) => p.character.name.startsWith(name))!.character);
const looks: Record<string, any> = {
  charlotte: baseLook({ body: 'female', skin: '#f6d2b4', eyeShape: 'bright', eyeColor: '#3a7bd5', slots: {
    hair: it('hair_charlotte', '#f2cb52'), armor: it('armor_rose', '#1f1c26', '#ecebf2', '#26222f'), cape: it('cape_rose', '#2f62b8', '#1b2f66', '#d9a93a'),
    feet: it('feet_leather', '#2a2430'), held: it('held_katana') } } as any),
  solen: preset('Solen'),
  saber: baseLook({ body: 'female', skin: '#f3d1b5', eyeShape: 'bright', eyeColor: '#3f8f5a', slots: {
    hair: it('hair_crown', '#e3c25a', '#2a4aa6'), armor: it('armor_lionheart', '#2a4aa6', '#c9cdd8', '#d4a531'), feet: it('feet_greaves'), held: it('held_katana') } } as any),
  ren: preset('Ren'),
  rogue1: baseLook({ body: 'male', skin: '#e2b58f', eyeShape: 'sharp', eyeColor: '#b91c1c', headband: band, slots: {
    hair: it('hair_raven', '#1a1d33'), top: it('top_mesh'), bottom: it('bottom_shinobi', '#262a36', '#262a36'), face: it('face_clothmask', '#262a36'),
    feet: it('feet_shinobi'), hands: it('hands_wraps'), held: it('held_kunai') } } as any),
  rogue2: baseLook({ body: 'male', skin: '#d9a77f', eyeShape: 'sharp', eyeColor: '#f59e0b', headband: band, slots: {
    hair: it('hair_lowtail', '#2b2230'), top: it('top_jacket', '#33402c'), bottom: it('bottom_cargo', '#2a3326', '#2a3326'), face: it('face_foxmask'),
    feet: it('feet_shinobi'), held: it('held_kunai') }, accessories: [it('acc_giant_shuriken')] } as any),
  brute: baseLook({ body: 'bulky', skin: '#c98c5f', eyeShape: 'sharp', eyeColor: '#f59e0b', headband: band, slots: {
    hair: it('hair_bristle', '#5a4636'), top: it('top_sleeveless', '#3a2c2a'), armor: it('armor_shadowops'), bottom: it('bottom_hakama', '#2a2226', '#cfc8b6'),
    feet: it('feet_wraps'), held: it('held_naginata') } } as any),
  rogue3: baseLook({ body: 'male', skin: '#e8c09a', eyeShape: 'sharp', eyeColor: '#7c3aed', headband: band, slots: {
    hair: it('hair_crop', '#2a2230'), top: it('top_highcollar', '#2b2f3c'), armor: it('armor_flak'), bottom: it('bottom_shinobi', '#2b2f3c', '#2b2f3c'),
    face: it('face_catmask'), feet: it('feet_shinobi'), held: it('held_katana') } } as any),
};
const shots: [string, string, string, number][] = [
  ['charlotte', 'charlotte', 'idle', 0], ['charlotte_walk', 'charlotte', 'walk', 1], ['charlotte_cast', 'charlotte', 'cast', 1],
  ['solen', 'solen', 'idle', 0], ['saber', 'saber', 'idle', 1], ['ren', 'ren', 'idle', 2],
  ['rogue1', 'rogue1', 'idle', 0], ['rogue2', 'rogue2', 'idle', 1], ['brute', 'brute', 'idle', 0], ['rogue3', 'rogue3', 'walk', 2],
  ['solen_sign', 'solen', 'handsigns', 0], ['ren_crouch', 'ren', 'charge', 0],
];
const meta: Record<string, any> = {};
for (const [name, who, pose, fr] of shots) {
  const f = renderSprite(looks[who], pose as any, fr);
  writePng(`${OUT}/${name}.png`, 128, 128, f.rgba);
  meta[name] = { feetX: Math.round(f.rig.head.x * 2), feetY: 120, headX: Math.round(f.rig.head.x * 2), headY: Math.round(f.rig.head.y * 2) };
}
writeFileSync(`${OUT}/sprites.json`, JSON.stringify(meta, null, 1));
console.log(Object.keys(meta).join(' '));
