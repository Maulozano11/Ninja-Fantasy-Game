import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { baseLook } from '../tools/sheet';
for (const withPants of [false, true]) {
  const slots: any = { top: { id: 'top_royalcoat', colors: ['#22304d', '#d4af37'] }, waist: { id: 'waist_sash', colors: ['#2f6fd6'] } };
  if (withPants) slots.bottom = { id: 'bottom_shinobi', colors: ['#22304d', '#22304d'] };
  const f = renderSprite(baseLook({ slots }), 'idle', 0);
  const y = 92;
  let row = '';
  for (let x = 40; x < 100; x++) { const i = (y * 128 + x) * 4; const b = f.rgba[i + 2], r = f.rgba[i]; row += !f.rgba[i+3] ? '.' : b > 150 && r < 120 ? 'S' : 'o'; }
  console.log(withPants, row);
}
