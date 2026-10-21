import json as _j
for nhf in (25, 15, 8, 0):
    f = dict(FLY[7]); legs = dict(f['legs']); legs['nhf'] = nhf
    fr, b, t = pose(f['k'], f['pitch'], f.get('eye', 0.0), legs, None, f.get('scale', 1.0), f.get('hz', 0.0), f.get('feet', False), None)
    a = fr[..., 3] == 255
    rows = np.nonzero(a.any(1))[0]
    # lowest per column band: near hind (x<150 canvas) vs front (x>=150)
    lowL = np.nonzero(a[:, :150].any(1))[0].max(); lowR = np.nonzero(a[:, 150:].any(1))[0].max()
    print('nhf', nhf, 'lowest body y (canvas)', rows.max(), 'hind side', lowL, 'front side', lowR)
