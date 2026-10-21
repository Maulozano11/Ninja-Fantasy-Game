const root = process.argv[2];
const { makeRamp } = await import(root + '/src/sprite/color.ts');
for (const hex of process.argv.slice(3)) console.log(hex, makeRamp(hex, 'skin').join(' '));
