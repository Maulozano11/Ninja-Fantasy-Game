exec(open('exp1.py').read().split("f0 = key_frame('L')")[0])
f0 = key_frame('L')
print('f0', vio(f0), light(f0) if 'light' in dir() else '')
def light_(f):
    a = f[..., 3].astype(np.float32) / 255
    return round(float((a * lum(f)).sum()) / 1000, 1), round(float((a * lum(f)).sum() / max(1, (f[..., 3] > 0).sum())), 1)
print('f0 light', light_(f0), (f0[..., 3] > 0).sum())
def back(n):
    dest = eye(BACK[n])
    pos = eye(n) + (dest - eye(n)) * 0.5
    w = WHOLE_BACK.get(n, n)
    return at(w, pos, wings=wings(w, 5), mirror=(BY[BACK[n]]['face'] < 0) != (BY[w]['face'] < 0))
def sink(n, d):
    u = (VC - eye(n)) / np.linalg.norm(VC - eye(n))
    return at(n, eye(n) + u * d, wings=wings(n, 5), dark=0.3)
for v5 in (0.66, 0.72, 0.78):
    for sm in (-34, 0, 60):
        for r3 in (20,):
            TRACE.clear()
            f5 = compose([smoke(tail=sm, dx=-8, dy=1)] + [sink('R3', r3), sink('R6', 23)] + [vortex(-15, v5)] +
                         feathers('R', 0, -9, 1) + feathers('L', -16, 4, -1) + [back(n) for n in BACK])
            cr = META[id(f5)]['crows']
            print(v5, sm, r3, 'mass', (f5[..., 3] > 0).sum(), 'light', light_(f5), 'vio', [round(float(x), 3) for x in vio(f5)], {k: round(cr[k]['behind_vortex'], 2) for k in ('R3', 'R6')})
