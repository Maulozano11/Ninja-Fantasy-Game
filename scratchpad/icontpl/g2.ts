import { FONTS, textWidth } from '/home/user/Ninja-Fantasy-Game/tools/ui/ui-font';
for (const n of ['title','label'] as const) { const f:any = FONTS[n]; console.log(n, f.rows, f.base, JSON.stringify(f.glyphs.o), JSON.stringify(f.glyphs['ó']), JSON.stringify(f.glyphs['ñ']), JSON.stringify(f.glyphs.O)); }
console.log(textWidth('Arquitectura Modular:', 'label'), textWidth('Concentrar chakra', 'label'), textWidth('Katon: Llama Persecutoria','label'));
