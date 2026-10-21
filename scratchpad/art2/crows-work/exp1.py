import sys, os
sys.argv = ['x', '/home/user/Ninja-Fantasy-Game/docs/reference/genjutsu-set-owner-reference.jpg', '/dev/null']
src = open('/home/user/Ninja-Fantasy-Game/tools/refs/crows-from-ref.py').read()
src = src[:src.index("frames = {'fly': fly(), 'summon': summon()}")]
ns = {'__name__': 'lib'}
import io, contextlib
with contextlib.redirect_stdout(io.StringIO()):
    exec(compile(src, 'conv', 'exec'), ns)
globals().update(ns)
import numpy as np


def vio(f):
    vm = META[id(f)]['vortex']
    c = f[..., :3].astype(np.int32)
    bg = c[..., 2] - c[..., 1]
    return vm.sum(), (vm & (bg > 45)).sum() / max(1, vm.sum()), (vm & (bg > 70)).sum() / max(1, vm.sum())


f0 = key_frame('L')
print('f0', vio(f0))
partner = None
for deg in (0, 10, 20, 30, 40):
    for sc in (0.85, 0.9):
        TRACE.clear()
        f2 = compose([at(n, swirl(VC, eye(n), 0.5), wings=wings(n, 2), dark=0.3) for n in EMERGE] +
                     [vortex(deg, sc)] +
                     feathers('L', 30, -10, 2, only=(2, 0)) + feathers('R', 0, 10, -2, only=(2, 1)) +
                     [at(n, swirl(eye(n), eye(PAIRS[n]), T_OUT[1]), mirror=BY[n]['face'] < 0, wings=wings(n, 2)) for n in ORDER['L']])
        a, v, b = vio(f2)
        print('f2', deg, sc, a, round(v, 3), round(b, 3), (f2[..., 3] > 0).sum())
for deg in (0, 10, 20, 30):
    TRACE.clear()
    f1 = compose([vortex(deg)] + feathers('L', 16, -4, 1) + [at(n, swirl(eye(n), eye(PAIRS[n]), T_OUT[0]), wings=wings(n, 1)) for n in ORDER['L']])
    a, v, b = vio(f1)
    print('f1', deg, a, round(v, 3), round(b, 3))
