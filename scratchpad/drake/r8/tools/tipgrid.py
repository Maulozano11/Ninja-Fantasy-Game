exec(open(os.environ['R8'] + '/tools/run8.py').read().split('_frames, _tips = {}, {}')[0])
BOB = {1: -3.4, 2: -6.7}
def tip_of(i, f, legs):
    k = f['k']
    t = EYE0[0] - eye_at(k, f['pitch'])[0]
    b = BOB[i] if f.get('feet') else EYE0[1] + f.get('eye', 0.0) - eye_at(k, f['pitch'])[1]
    return _fwd(k, legs, f['pitch'], b, t, f.get('scale', 1.0))
T0 = _fwd(0, {}, 0, 0, 0, 1)
T5 = _fwd(5, {}, 0, 0, 0, 1)
print('f0 tip', [round(v, 1) for v in T0], 'f5 tip', [round(v, 1) for v in T5])
for i in (1, 2, 3, 4, 6, 7):
    f = _fly[i]
    print(f'frame {i} (k {f["k"]}):')
    for curl in (0, 0.25, 0.5, 0.75, 1.0):
        row = []
        for tail in (-40, -30, -20, -10, 0, 10, 20, 30):
            legs = dict(f['legs']); legs['tail'] = tail; legs['curl'] = curl
            x, y = tip_of(i, f, legs)
            row.append(f'{tail:3d}:({x:5.1f},{y:5.1f})')
        print(f'  curl {curl:4.2f} ' + ' '.join(row))
