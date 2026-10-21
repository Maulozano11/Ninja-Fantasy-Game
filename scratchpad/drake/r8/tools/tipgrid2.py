exec(open(os.environ['R8'] + '/tools/tipgrid.py').read().split("for i in (1, 2, 3, 4, 6, 7):")[0])
T0 = _fwd(0, {}, 0, 0, 0, 1)
f = _fly[7]
res = []
for curl in np.arange(0.8, 1.31, 0.05):
    for tail in range(0, 41, 2):
        legs = dict(f['legs']); legs['tail'] = tail; legs['curl'] = float(curl)
        x, y = tip_of(7, f, legs)
        res.append((float(np.hypot(x - T0[0], y - T0[1])), round(float(curl), 2), tail, round(x, 1), round(y, 1)))
res.sort()
print('f7 -> f0 tip', [round(v, 1) for v in T0])
for r in res[:8]:
    print('  ', r)
for c in (0.9, 1.0, 1.1, 1.2):
    b = min((r for r in res if abs(r[1] - c) < 1e-6), key=lambda r: r[0])
    print('  curl', c, 'best', b)
# 2 -> 3
f2, f3 = _fly[2], _fly[3]
res = []
for c2 in np.arange(0.5, 1.01, 0.1):
    for t2 in range(-40, 1, 5):
        l2 = dict(f2['legs']); l2['tail'] = t2; l2['curl'] = float(c2)
        p2 = tip_of(2, f2, l2)
        for c3 in np.arange(0.0, 0.61, 0.1):
            for t3 in range(-25, 6, 5):
                l3 = dict(f3['legs']); l3['tail'] = t3; l3['curl'] = float(c3)
                p3 = tip_of(3, f3, l3)
                d = float(np.hypot(p2[0] - p3[0], p2[1] - p3[1]))
                res.append((d, round(float(c2), 1), t2, round(float(c3), 1), t3, tuple(round(v) for v in p2), tuple(round(v) for v in p3)))
res.sort()
print('2->3 best')
for r in res[:25]:
    print('  ', r)
