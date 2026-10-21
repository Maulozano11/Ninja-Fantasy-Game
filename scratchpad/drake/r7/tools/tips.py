# exec'd inside drake(): tail-tip positions (sheet coords) for a grid of tail/tip angles, analytic (no render).
exec(open(os.environ['R7'] + '/tools/run8.py').read().split('_frames, _tips = {}, {}')[0])
BOB = {1: -3.4, 2: -6.7}


def tip_of(i, f, legs):
    k = f['k']
    if f.get('feet'):
        b, t = BOB[i], EYE0[0] - eye_at(k, f['pitch'])[0]
    else:
        t = EYE0[0] - eye_at(k, f['pitch'])[0]
        b = EYE0[1] + f.get('eye', 0.0) - eye_at(k, f['pitch'])[1]
    return _fwd(k, _TT[k], legs, f['pitch'], b, t, f.get('scale', 1.0))


T0 = _fwd(0, _TT[0], {}, 0, 0, 0, 1)
T5 = _fwd(5, _TT[5], {}, 0, 0, 0, 1)
print('f0 tip', T0, 'f5 tip', T5)
for i in (1, 2, 3, 4, 6, 7):
    f = FLY[i]
    print(f'frame {i}:')
    for tail in (-40, -30, -20, -10, 0, 10, 20):
        row = []
        for tip in ((-120, -100, -80, -60, -40, -20, 0) if f['k'] == 0 else (0, 20, 40, 60, 80, 100, 120)):
            legs = dict(f['legs']); legs['tail'] = tail; legs['tip'] = tip
            x, y = tip_of(i, f, legs)
            row.append(f'{tip:4d}:({x:5.1f},{y:5.1f})')
        print(f'  tail {tail:4d} ' + ' '.join(row))
