import { frameCount, POSE_FPS } from '/home/user/Ninja-Fantasy-Game/src/sprite/rig';
for (const p of ['idle','handsigns','attack','cast','castBook','castScript','castSphere','castLightning','castWave','castFlash','castEye','charge','throw','pierce','hurt','victory'] as const)
  console.log(p, frameCount(p as any), (POSE_FPS as any)[p] ?? '(cast fps 5)');
