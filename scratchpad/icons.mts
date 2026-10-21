// Which hotbar buttons have an icon painted by the owner.
const root = '/home/user/Ninja-Fantasy-Game';
const { JUTSU } = await import(`${root}/src/battle/jutsu.ts`);
const fs = await import('node:fs');
const have = new Set(fs.readdirSync(`${root}/src/assets/ui_icons`).filter((f: string) => f.endsWith('.png') && !f.includes('@2x')).map((f: string) => f.replace('.png', '')));
let jutsuShort: any = null;
try { jutsuShort = (await import(`${root}/src/components/battle/battleLog.ts`)).jutsuName; } catch (e) { console.error(String(e)); }
const rows: any[] = [];
for (const [id, j] of Object.entries(JUTSU) as any) rows.push({ id, name: j.name ?? j.nameEs ?? '', es: jutsuShort ? (() => { try { return jutsuShort(id, 'es'); } catch { return ''; } })() : '', kind: j.passive ? 'pasiva' : j.reaction ? 'reaccion' : 'jutsu', element: j.element ?? '', rank: j.rank ?? '', icon: have.has(id) });
console.log(JSON.stringify(rows));
