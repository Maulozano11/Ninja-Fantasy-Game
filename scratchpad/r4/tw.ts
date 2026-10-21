import { renderText } from '/home/user/Ninja-Fantasy-Game/tools/ui/ui-font';
import { hex } from '/home/user/Ninja-Fantasy-Game/tools/ui/ui-img';
for (const f of ['title', 'label'] as const) for (const t of ['Acción', 'Adicional', 'Reacción', 'Mov.', '9,0/9 m']) { const im = renderText(t, f, { color: hex('#ffffff'), outline: hex('#000000') }); console.log(f, t, im.w, im.h); }
