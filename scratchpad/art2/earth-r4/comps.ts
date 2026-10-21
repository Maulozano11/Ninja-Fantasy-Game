import { EV3_REF } from '../../../../../../../home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-earth-v3-refdata';
for (const name of ['wall', 'wall_diag', 'wall_depth']) {
  const r = (EV3_REF as any)[name];
  const pc = r.pieces.main;
  const W = r.w, H = r.h;
  const a = new Uint8Array(W * H);
  const b = Buffer.from(pc.rle, 'base64');
  let i = 0;
  for (let k = 0; k + 1 < b.length; k += 2) { const n = b[k], v = b[k + 1]; if (v) for (let j = 0; j < n; j++) a[(pc.y + Math.floor((i + j) / pc.w)) * W + pc.x + ((i + j) % pc.w)] = 1; i += n; }
  const seen = new Uint8Array(W * H); const sizes: string[] = [];
  for (let s = 0; s < W * H; s++) if (a[s] && !seen[s]) {
    let n = 0, x0 = W, y0 = H, x1 = 0, y1 = 0; const st = [s]; seen[s] = 1;
    while (st.length) { const j = st.pop()!; n++; const x = j % W, y = (j / W) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const u = x + dx, v = y + dy; if (u < 0 || v < 0 || u >= W || v >= H) continue; const q = v * W + u; if (a[q] && !seen[q]) { seen[q] = 1; st.push(q); } } }
    sizes.push(`${n}@[${x0},${y0}-${x1},${y1}]`);
  }
  console.log(name, W, H, r.anchor, sizes.length, sizes.slice(0, 40).join(' '));
}
