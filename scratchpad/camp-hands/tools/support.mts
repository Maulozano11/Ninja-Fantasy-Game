// Prints the support-relevant joints (pelvis, hips, knees, ankles, head) of the camp poses, to compare trees.
const root = process.argv[2];
const { drawRig, CAMP_PROPS, frameCount } = await import(root + '/src/sprite/rig.ts');
const out: string[] = [JSON.stringify(CAMP_PROPS)];
for (const pose of ['lean', 'sit', 'read', 'train', 'trainPole', 'trainFist'])
  for (const body of ['male', 'female', 'bulky', 'slender'])
    for (let f = 0; f < frameCount(pose); f++) {
      const r = drawRig(body, pose, f);
      out.push([pose, body, f, ...['pelvis', 'hipN', 'hipF', 'kneeN', 'kneeF', 'ankleN', 'ankleF', 'head'].map((k) => `${r[k].x.toFixed(3)},${r[k].y.toFixed(3)}`)].join(' '));
    }
console.log(out.join('\n'));
