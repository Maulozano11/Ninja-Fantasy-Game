import { FONTS } from '/home/user/Ninja-Fantasy-Game/tools/ui/ui-font';
for (const [n, f] of Object.entries(FONTS)) console.log(n, Object.keys((f as any).glyphs).join(''));
