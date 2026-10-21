import { frameCount } from '/home/user/Ninja-Fantasy-Game/src/sprite/rig';
for (const p of ['idle','handsigns','attack','cast','castBook','castScript','castSphere','castLightning','castWave','castFlash','castEye','charge','throw','pierce','hurt','victory']) console.log(p, frameCount(p as any));
