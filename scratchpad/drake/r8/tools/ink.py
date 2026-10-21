As, _ = shrink(crop5, spray_a, (WAX, WAY), S, size, oanchor)
Ap, _ = shrink(crop5, pebble_f, (WAX, WAY), S, size, oanchor)
fr = key_frame(5)[0]
SPR = set(map(tuple, np.concatenate([SPRAY, SPRAY_A[None], PEBBLE]).astype(int).tolist()))
# our spray: pixels outside the pile's solid region that carry a spray or pebble colour
A_, _ = shrink(crop5, pile_f, (WAX, WAY), S, size, oanchor)
cols = fr[..., :3].reshape(-1, 3)
isspr = np.array([tuple(c) in SPR for c in cols.tolist()]).reshape(fr.shape[:2]) & (fr[..., 3] > 0) & (A_ < 0.22)
ours = float((fr[..., 3][isspr] / 255.0).sum())
print('his stroke ink (game px)', round(float(As.sum()), 1), 'his pebble ink', round(float(Ap.sum()), 1), 'ours (alpha-weighted spray/pebble px off the pile)', round(ours, 1), 'ratio', round(ours / float(As.sum() + Ap.sum()), 3))
