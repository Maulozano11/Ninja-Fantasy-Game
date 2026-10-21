exec(open('exp2.py').read().split("for v5 in")[0])
for v5 in (0.82, 0.86, 0.9):
    for deg in (-45, -30, -15, 0):
        TRACE.clear()
        f5 = compose([smoke(tail=0, dx=-8, dy=1)] + [sink('R3', 10), sink('R6', 6)] + [vortex(deg, v5)] +
                     feathers('R', 0, -9, 1) + feathers('L', -16, 4, -1) + [back(n) for n in BACK])
        cr = META[id(f5)]['crows']
        print(v5, deg, 'mass', (f5[..., 3] > 0).sum(), 'light', light_(f5), 'vio', [round(float(x), 3) for x in vio(f5)], {k: (round(1 - cr[k]['visible'], 2), round(cr[k]['behind_vortex'], 2)) for k in ('R3', 'R6')})
