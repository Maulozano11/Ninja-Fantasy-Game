# exec'd in drake(): small isolated components of his lunge's non-body pixels that are pale and unsaturated
crop5, body5, rest5, diff5, off5, _ = keys[5]
lum5 = crop5 @ np.array([0.3, 0.55, 0.15], np.float32)
r, g, b = crop5[..., 0], crop5[..., 1], crop5[..., 2]
fgp = (diff5 > 22)
cand = rest5 & ~pile & ~clod
comps = components(cand)
print('rest comps', len(comps))
n = 0
for p in comps:
    p = np.array(p)
    if len(p) > 80:
        continue
    c = crop5[p[:, 0], p[:, 1]]
    L = c @ np.array([0.3, 0.55, 0.15])
    top = c[L >= np.percentile(L, 70)].mean(0)
    sat = top[0] - top[2]
    if L.max() > 110 and sat < 50:
        n += 1
        print('  speck at his', (int(p[:, 1].mean() + off5[0]), int(p[:, 0].mean() + off5[1])), 'px', len(p), 'top colour', top.astype(int).tolist(), 'max lum', int(L.max()))
print('pale specks', n)
