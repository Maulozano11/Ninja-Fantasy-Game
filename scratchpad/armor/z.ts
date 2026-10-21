import { sheet, baseLook } from '../tools/sheet';
const [out, armor, skirt, body, pose, frame] = process.argv.slice(2);
const slots: any = {
  hair: { id: 'hair_raven', colors: ['#2a2230'] },
  top: { id: 'top_highcollar', colors: ['#1e2433', '#1e2433'] },
  bottom: { id: 'bottom_shinobi', colors: [] },
  feet: { id: 'feet_leather', colors: [] },
};
if (armor && armor !== '-') slots.armor = { id: armor, colors: [] };
if (skirt && skirt !== '-') slots.skirt = { id: skirt, colors: [] };
sheet(out, [{ look: baseLook({ body: (body || 'male') as any, slots }), pose: (pose || 'idle') as any, frame: +(frame || 0) }], 1, 6);
