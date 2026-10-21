# exec'd inside drake() of tunecopy.py: FLY, pose, key_frame, eye_at... are in scope.
import json as _json
import numpy as _np
from PIL import Image as _Image

_cfg = _json.load(open(os.environ['DRAKE_CFG']))
_fly = list(FLY)
for _i, _over in _cfg.get('fly', {}).items():
    _d = dict(_fly[int(_i)])
    _d.update(_over)
    _fly[int(_i)] = _d


def _render(i, dust=False):
    f = _fly[i]
    if f is None:
        fr, _, _ = pose(i) if i == 0 else pose(5, dust_at=(1, 1, 0, 1) if dust else None)
        return fr
    fr, b, t = pose(f['k'], f['pitch'], f.get('eye', 0.0), f['legs'], f.get('dust_at') if dust else None, f.get('scale', 1.0),
                    f.get('head', 1.0), f.get('feet', False), None)
    return fr


_need = sorted(set(sum(([a, b] for a, b in _cfg['pairs']), [])))
_fr = {i: _render(i) for i in _need}
_res = {}
for a, b in _cfg['pairs']:
    A = _fr[a][..., 3] == 255
    B = _fr[b][..., 3] == 255
    _res[f'{a}-{b}'] = round(float((A ^ B).sum() / (A | B).sum()), 4)
print('TUNE', _json.dumps(_res))
if _cfg.get('img'):
    tiles = []
    for a, b in _cfg['pairs']:
        A = _fr[a][..., 3] == 255
        B = _fr[b][..., 3] == 255
        v = _np.zeros(A.shape + (3,), _np.uint8)
        v[A & B] = (90, 90, 90)
        v[A & ~B] = (255, 60, 60)
        v[B & ~A] = (60, 220, 255)
        tiles.append(_Image.fromarray(v).resize((A.shape[1] * 2, A.shape[0] * 2), _Image.NEAREST))
    strip = [_Image.fromarray(_fr[i]) for i in _need]
    W = tiles[0].width
    o = _Image.new('RGB', (W * len(tiles) + 8 * len(tiles), tiles[0].height), (255, 255, 255))
    for j, t in enumerate(tiles):
        o.paste(t, (j * (W + 8), 0))
    o.save(_cfg['img'])
    s = _Image.new('RGBA', (OW * len(_need), OH), (52, 64, 48, 255))
    for j, i in enumerate(_need):
        s.alpha_composite(_Image.fromarray(_fr[i], 'RGBA'), (j * OW, 0))
    s.convert('RGB').resize((s.width * 2, s.height * 2), _Image.NEAREST).save(_cfg['img'].replace('.png', '-frames.png'))
