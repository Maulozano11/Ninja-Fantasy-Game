exec(open(os.environ['R7'] + '/tools/tips.py').read().split("T0 = _fwd")[0])
T0 = _fwd(0, _TT[0], {}, 0, 0, 0, 1)
import itertools
# 7 -> 0: f7 tip within reach of f0's tip
f = FLY[7]
res = []
for tail in range(-20, 81, 5):
    for tip in range(0, 151, 5):
        legs = dict(f['legs']); legs['tail'] = tail; legs['tip'] = tip
        x, y = tip_of(7, f, legs)
        d = float(np.hypot(x - T0[0], y - T0[1]))
        res.append((d, tail, tip, x, y))
res.sort()
print('f7 best (dist, tail, tip, x, y):')
for r in res[:5]:
    print('  ', [round(float(v), 1) for v in r])
for tail in (0, 20, 40, 60, 80):
    best = min((r for r in res if r[1] == tail), key=lambda r: r[0])
    print('  tail', tail, 'best tip', best[2], 'dist', round(best[0], 1), 'at', round(best[3], 1), round(best[4], 1))
# 2 -> 3
f2, f3 = FLY[2], FLY[3]
P2 = {}
for tail in range(-60, 21, 5):
    for tip in range(-160, 1, 10):
        legs = dict(f2['legs']); legs['tail'] = tail; legs['tip'] = tip
        P2[(tail, tip)] = tip_of(2, f2, legs)
P3 = {}
for tail in range(-60, 31, 5):
    for tip in range(-20, 121, 10):
        legs = dict(f3['legs']); legs['tail'] = tail; legs['tip'] = tip
        P3[(tail, tip)] = tip_of(3, f3, legs)
res = []
for a, pa in P2.items():
    for b, pb in P3.items():
        d = float(np.hypot(pa[0] - pb[0], pa[1] - pb[1]))
        if d <= 12:
            cost = (abs(a[0]) + abs(a[1]) * 0.5) + (abs(b[0] - f3['legs']['tail']) + abs(b[1]) * 0.5)
            res.append((cost, d, a, b, pa, pb))
res.sort(key=lambda r: r[0])
print('2->3 candidates (cost, dist, f2 tail/tip, f3 tail/tip, f2 tip, f3 tip):')
for r in res[:15]:
    print('  ', round(r[0]), round(r[1], 1), r[2], r[3], tuple(round(float(v)) for v in r[4]), tuple(round(float(v)) for v in r[5]))
