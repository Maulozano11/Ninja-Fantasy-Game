const repo = process.argv[2];
const { frameCount, rigPoseFor } = await import(repo + '/src/sprite/rig.ts');
for (const p of ['idle','handsigns','attack','cast','hurt','victory','charge','walk','run','crouch','sneak','downed','lean','sit','read','train']) console.log(p, frameCount(rigPoseFor(p)));
