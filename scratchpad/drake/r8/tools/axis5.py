# exec'd in drake(): centre line of the lunge tail (eroded, so spikes don't pull it), and of the prowl tail along my guess
m = split[5][0]['tail'] | split[5][0]['tip']
ox, oy = keys[5][4]
core = erode(m, 7)
ys, xs = np.nonzero(core)
d = np.array([-154.0, 95.0]); d /= np.hypot(*d)
nrm = np.array([-d[1], d[0]])
r = np.array([1340 - ox, 1765 - oy], float)
u = (xs - r[0]) * d[0] + (ys - r[1]) * d[1]
v = (xs - r[0]) * nrm[0] + (ys - r[1]) * nrm[1]
for uu in range(-10, 200, 15):
    sel = np.abs(u - uu) < 3
    if sel.sum() < 3:
        print(uu, 'none'); continue
    vm = float(np.median(v[sel])); vmin, vmax = float(v[sel].min()), float(v[sel].max())
    p = r + uu * d + vm * nrm
    print(uu, 'centre his', (round(p[0] + ox, 1), round(p[1] + oy, 1)), 'v', round(vmin, 1), round(vm, 1), round(vmax, 1))
# full (uneroded) extent along v
ys, xs = np.nonzero(m)
u = (xs - r[0]) * d[0] + (ys - r[1]) * d[1]
v = (xs - r[0]) * nrm[0] + (ys - r[1]) * nrm[1]
print('u range', u.min(), u.max())
for uu in range(-10, 200, 15):
    sel = np.abs(u - uu) < 3
    if sel.sum():
        print(uu, 'full v', round(float(v[sel].min()), 1), round(float(v[sel].max()), 1))
