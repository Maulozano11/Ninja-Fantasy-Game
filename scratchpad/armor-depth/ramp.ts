import { makeRamp } from '/home/user/Ninja-Fantasy-Game/src/sprite/color';
for (const a of process.argv.slice(2)) { const [h, k] = a.split(':'); console.log(h, k || 'cloth', makeRamp('#' + h, (k || 'cloth') as any).join(' ')); }
