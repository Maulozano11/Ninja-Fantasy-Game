# exec'd inside drake() of tunecopy.py. Coordinate descent on the in-between body parameters around the two
# switches between his drawings; the head follows ZREL (analytic) and the eye path is kept monotonic.
import json as _json
import time as _time

_cfg = _json.load(open(os.environ['DRAKE_CFG']))
_side = _cfg['side']
_E0 = eye_at(0)[1]
_E5 = eye_at(5)[1] - _E0
_cache = {}
_LEGN = ['nf', 'ff', 'nh', 'fh', 'tail']


def _render(spec):
    kk = _json.dumps(spec, sort_keys=True)
    if kk not in _cache:
        fr, b, t = pose(spec['k'], spec['pitch'], spec.get('eye', 0.0), spec['legs'], None, spec['scale'], spec['hz'],
                        spec.get('feet', False), None)
        _cache[kk] = (fr[..., 3] == 255, eye_at(spec['k'], spec['pitch'], b, t)[1] - _E0)
    return _cache[kk]


_M0 = (pose(0)[0][..., 3] == 255)
_M5 = (pose(5)[0][..., 3] == 255)


def _spec(k, P, frac, hz, **kw):
    d = {'k': k, 'pitch': round(P['pitch'] * frac, 3), 'scale': round(1 + (P['scale'] - 1) * frac, 4), 'hz': hz,
         'legs': {n: round(P[n] * frac, 3) for n in _LEGN if P.get(n)}}
    for a, v in kw.items():
        d[a] = round(v, 3) if isinstance(v, float) else v
    return d


def _x(A, B):
    return float((A ^ B).sum() / (A | B).sum())


def _frames(P):
    if _side == 'takeoff':
        P2, P3 = P['f2'], P['f3']
        m1, e1 = _render(_spec(0, P2, 0.5, -0.25, feet=True))
        m2, e2 = _render(_spec(0, P2, 1.0, -0.5, feet=True))
        e3 = e2 + P3['t3'] * (_E5 - e2)
        m3, _ = _render(_spec(5, P3, 1.0, 0.5, eye=e3))
        m4, _ = _render(_spec(5, P3, 0.5, 0.25, eye=(e3 + _E5) / 2))
        return [_M0, m1, m2, m3, m4, _M5], [0.0, e1, e2, e3, (e3 + _E5) / 2, _E5]
    P7 = P['f7']
    e7 = P7['e7']
    e6 = _E5 + P7['t6'] * (e7 - _E5)
    m6, _ = _render(_spec(5, P7, 0.5, 0.5, eye=e6))
    m7, _ = _render(_spec(5, P7, 1.0, 1.0, eye=e7))
    return [_M5, m6, m7, _M0], [_E5, e6, e7, 0.0]


def _score(P):
    fr, ey = _frames(P)
    xs = [_x(fr[i], fr[i + 1]) for i in range(len(fr) - 1)]
    pen = 0.0
    if _side == 'takeoff':
        # the eye rises every step (no hitch at the switch)
        pen += sum(max(0.0, ey[i + 1] - ey[i] + 1.5) for i in range(5)) * 0.02
    return max(xs) + 0.25 * sum(xs) / len(xs) + pen, xs, ey


P = _cfg['start']
RANGES = _cfg['ranges']
best, xs, ey = _score(P)
print('start', round(best, 4), [round(v, 3) for v in xs], [round(v, 1) for v in ey], flush=True)
t0 = _time.time()
for step_scale in _cfg['steps']:
    improved = True
    while improved:
        improved = False
        for fk, ranges in RANGES.items():
            for name, (lo, hi, st) in ranges.items():
                for sgn in (1, -1):
                    Q = _json.loads(_json.dumps(P))
                    v = round(Q[fk][name] + sgn * st * step_scale, 4)
                    if not (lo <= v <= hi):
                        continue
                    Q[fk][name] = v
                    sc, xq, eq = _score(Q)
                    if sc < best - 1e-4:
                        best, xs, ey, P = sc, xq, eq, Q
                        improved = True
                        print(f'{_time.time() - t0:6.0f}s', round(best, 4), [round(v_, 3) for v_ in xs], [round(v_, 1) for v_ in ey], fk, name, v, flush=True)
                        break
print('BEST', _json.dumps(P), round(best, 4), [round(v, 3) for v in xs], [round(v, 1) for v in ey], flush=True)
