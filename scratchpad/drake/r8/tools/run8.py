# exec'd inside drake() (w.py, DRAKE_TUNE). Renders the 8 fly frames from FLY (overridden by DRAKE_FLY json: a list of
# 8 entries, null = key frame) and reports the tail tip in every frame, silhouette changes, and saves a strip + onion.
import json as _json
from PIL import Image as _I, ImageDraw as _D
_out = os.environ['OUTP']
_fly = FLY
if os.environ.get('DRAKE_FLY'):
    _fly = _json.load(open(os.environ['DRAKE_FLY']))
    for _f in _fly:
        if _f and 'dust_at' in _f and _f['dust_at'] is not None:
            _f['dust_at'] = tuple(_f['dust_at'])
        if _f and _f.get('clod_at') is not None:
            _f['clod_at'] = tuple(_f['clod_at'])
_only = [int(v) for v in os.environ.get('ONLY', '0,1,2,3,4,5,6,7').split(',')]
def _rot(q, p, deg, sc=1.0):
    a = np.deg2rad(deg)
    rx, ry = q[0] - p[0], q[1] - p[1]
    return (p[0] + sc * (rx * np.cos(a) - ry * np.sin(a)), p[1] + sc * (rx * np.sin(a) + ry * np.cos(a)))
def _fwd(k, legs, pitch, bob, tx, scale):
    q = tail_tip(k, legs)
    e = to_work(k, EYE[k])
    q = (e[0] + scale * (q[0] - e[0]), e[1] + scale * (q[1] - e[1]))
    q = _rot(q, to_work(k, PITCH[k]), pitch)
    q = (q[0] + tx / S, q[1] + bob / S)
    return (oanchor[0] + (q[0] - WAX) * S - 20, oanchor[1] + (q[1] - WAY) * S - 12)  # sheet coords (crop 20, 12)
_frames, _tips = {}, {}
for _i in _only:
    _f = _fly[_i]
    if _f is None:
        _fr, _b, _t = key_frame(_i)
        _k, _legs, _p, _sc = _i, {}, 0.0, 1.0
    else:
        _fr, _b, _t = pose(_f['k'], _f['pitch'], _f.get('eye', 0.0), _f['legs'], _f.get('dust_at'), _f.get('scale', 1.0),
                           _f.get('hz', 0.0), _f.get('feet', False), _f.get('clod_at'))
        _k, _legs, _p, _sc = _f['k'], _f['legs'], _f['pitch'], _f.get('scale', 1.0)
    _frames[_i] = _fr
    _tips[_i] = _fwd(_k, _legs, _p, _b, _t, _sc)
    print(f'frame {_i}: bob {_b:+.1f} tx {_t:+.1f} tail tip (sheet) ({_tips[_i][0]:.1f}, {_tips[_i][1]:.1f})', flush=True)
_ks = sorted(_frames)
for _a, _b2 in zip(_ks, _ks[1:] + _ks[:1]):
    if _b2 != (_a + 1) % 8:
        continue
    A_, B_ = _frames[_a][..., 3] == 255, _frames[_b2][..., 3] == 255
    _dc = np.concatenate([DUST, DUST_A]).astype(np.uint8)
    def _nd(f):
        d = np.zeros(f.shape[:2], bool)
        for c in _dc:
            d |= (f[..., :3] == c).all(-1)
        return (f[..., 3] == 255) & ~d
    A2, B2 = _nd(_frames[_a]), _nd(_frames[_b2])
    print(f'{_a}->{_b2}: tail tip moves {np.hypot(_tips[_b2][0] - _tips[_a][0], _tips[_b2][1] - _tips[_a][1]):.1f} px; '
          f'opaque xor {float((A_ ^ B_).sum() / (A_ | B_).sum()) * 100:.1f}%, body-only xor {float((A2 ^ B2).sum() / (A2 | B2).sum()) * 100:.1f}%, body area {int(A2.sum())}->{int(B2.sum())}')
np.savez_compressed(_out + '.npz', **{f'f{i}': f for i, f in _frames.items()}, tips=np.array([_tips[i] for i in _ks]), ks=np.array(_ks))
# strip x3 on the panel colour, crop to the sheet window (20, 12, 307, 179)
Z = 3
_W, _H = 287, 167
_st = _I.new('RGB', ((_W * Z + 6) * len(_ks), _H * Z), (255, 255, 255))
for j, i in enumerate(_ks):
    im = _I.new('RGBA', (OW, OH), (34, 34, 44, 255))
    im.alpha_composite(_I.fromarray(_frames[i], 'RGBA'))
    im = im.crop((20, 12, 20 + _W, 12 + _H)).convert('RGB').resize((_W * Z, _H * Z), _I.NEAREST)
    d = _D.Draw(im)
    x, y = _tips[i]
    d.ellipse([x * Z - 6, y * Z - 6, x * Z + 6, y * Z + 6], outline=(255, 0, 255), width=2)
    d.text((4, 4), str(i), fill=(255, 255, 0))
    _st.paste(im, (j * (_W * Z + 6), 0))
_st.save(_out + '-strip.png')
