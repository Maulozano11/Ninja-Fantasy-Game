import { sFrame, sStates } from './ws2/vfx-a-fire-s';
const st = sStates();
let t0 = Date.now();
sFrame(st.burn[0]); console.log('first frame (with caches)', Date.now() - t0);
t0 = Date.now(); sFrame(st.burn[1]).save(process.argv[2] + '/burn1.png'); console.log('second frame', Date.now() - t0);
t0 = Date.now(); sFrame(st.burn[0]).save(process.argv[2] + '/burn0.png'); console.log('third frame', Date.now() - t0);
