from PIL import Image as _I
base = dict(FLY[7])
tiles = []
for drop in (None, 'ff', 'nf', 'fh'):
    legs = dict(base['legs'])
    if drop:
        legs[drop] = 0
    fr, b, t = pose(5, base['pitch'], base['eye'], legs, None, base['scale'], base['hz'], False, None)
    im = _I.new('RGBA', (OW, OH), (52, 64, 48, 255))
    im.alpha_composite(_I.fromarray(fr, 'RGBA'))
    tiles.append(im.convert('RGB').crop((190, 110, 270, 175)).resize((80 * 5, 65 * 5), _I.NEAREST))
# the joint layer alone for ff in frame 7
o = _I.new('RGB', (80 * 5 * 2 + 4, (65 * 5 + 4) * 2), (255, 255, 255))
for i, t in enumerate(tiles):
    o.paste(t, ((i % 2) * (80 * 5 + 4), (i // 2) * (65 * 5 + 4)))
o.save(os.environ['OUT'])
masks, base_ = split[5]
import numpy as _np
ff = masks['ff']
print('ff px', int(ff.sum()), 'components', [len(c) for c in components(ff)])
nf = masks['nf']
print('nf components', [len(c) for c in components(nf)])
