# exec'd inside drake() of tunecopy.py. Coordinate descent on the cut-pair parameters.
import json as _json
import numpy as _np
import time as _time

_cfg = _json.load(open(os.environ['DRAKE_CFG']))
_side = _cfg['side']  # 'takeoff' (frames 1-4) or 'landing' (frames 6-7)
_EYE5 = eye_at(5)[1] - eye_at(0)[1]
_cache = {}


def _mask(fr):
    return fr[..., 3] == 255


def _key(d):
    return _json.dumps(d, sort_keys=True)


def _render(spec):
    kk = _key(spec)
    if kk not in _cache:
        fr, b, t = pose(spec['k'], spec.get('pitch', 0.0), spec.get('eye', 0.0), spec.get('legs', {}), None,
                        spec.get('scale', 1.0), spec.get('head', 1.0), spec.get('feet', False), None)
        _cache[kk] = (_mask(fr), eye_at(spec['k'], spec.get('pitch', 0.0), b, t))
    return _cache[kk]


_M0 = _mask(pose(0)[0])
_M5 = _mask(pose(5)[0])
LEGN = ['nf', 'ff', 'nh', 'fh', 'tail', 'tip']


def _spec(k, P, frac, feet=False, eye=None):
    d = {'k': k, 'pitch': round(P['pitch'] * frac, 3), 'scale': round(1 + (P['scale'] - 1) * frac, 4),
         'head': round(1 + (P['head'] - 1) * frac, 4), 'legs': {n: round(P[n] * frac, 3) for n in LEGN if P[n]}}
    if feet:
        d['feet'] = True
    else:
        d['eye'] = round(eye, 3)
    return d


def _x(A, B):
    return float((A ^ B).sum() / (A | B).sum())


def _frames(P):
    if _side == 'takeoff':
        P2, P3 = P['f2'], P['f3']
        f1 = _spec(0, P2, 0.5, feet=True)
        f2 = _spec(0, P2, 1.0, feet=True)
        f3 = _spec(5, P3, 1.0, eye=P3['eye'])
        f4 = _spec(5, P3, 0.5, eye=(P3['eye'] + _EYE5) / 2)
        return [_M0, _render(f1)[0], _render(f2)[0], _render(f3)[0], _render(f4)[0], _M5]
    P7 = P['f7']
    f6 = _spec(5, P7, 0.5, eye=P7['e6'])
    f7 = _spec(5, P7, 1.0, eye=P7['eye'])
    return [_M5, _render(f6)[0], _render(f7)[0], _M0]


def _score(P):
    fr = _frames(P)
    xs = [_x(fr[i], fr[i + 1]) for i in range(len(fr) - 1)]
    return max(xs) + 0.25 * sum(xs) / len(xs), xs


P = _cfg['start']
RANGES = _cfg['ranges']
best, xs = _score(P)
print('start', round(best, 4), [round(v, 3) for v in xs], flush=True)
t0 = _time.time()
for step_scale in _cfg['steps']:
    improved = True
    while improved:
        improved = False
        for fk, ranges in RANGES.items():
            for name, (lo, hi, st) in ranges.items():
                for sgn in (1, -1):
                    Q = _json.loads(_json.dumps(P))
                    v = Q[fk][name] + sgn * st * step_scale
                    if not (lo <= v <= hi):
                        continue
                    Q[fk][name] = round(v, 4)
                    sc, xq = _score(Q)
                    if sc < best - 1e-4:
                        best, xs, P = sc, xq, Q
                        improved = True
                        print(f'{_time.time() - t0:6.0f}s', round(best, 4), [round(v_, 3) for v_ in xs], fk, name, Q[fk][name], flush=True)
                        break
print('BEST', _json.dumps(P), round(best, 4), [round(v, 3) for v in xs], flush=True)
