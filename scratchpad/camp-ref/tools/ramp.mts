const root = process.argv[2];
const { makeRamp } = await import(root + '/src/sprite/color.ts');
for (const a of process.argv.slice(3)) {
  const [h, k] = a.split(':');
  console.log(a, makeRamp(h, k || 'leather').join(' '));
}
