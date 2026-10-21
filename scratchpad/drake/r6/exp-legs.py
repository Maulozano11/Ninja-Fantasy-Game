# frame 7 with one leg's turn removed at a time; crops of the front legs
from PIL import Image as _I
base = dict(FLY[7])
tiles = []
for drop in (None, 'ff', 'nf', 'fh', 'nh'):
    legs = dict(base['legs'])
    if drop:
        legs[drop] = 0
    fr, b, t = pose(5, base['pitch'], base['eye'], legs, None, base['scale'], base['hz'], False, None)
    im = _I.new('RGBA', (OW, OH), (52, 64, 48, 255))
    im.alpha_composite(_I.fromarray(fr, 'RGBA'))
    tiles.append(im.convert('RGB').crop((150, 110, 290, 185)).resize((140 * 4, 75 * 4), _I.NEAREST))
o = _I.new('RGB', (140 * 4, (75 * 4 + 4) * len(tiles)), (255, 255, 255))
for i, t in enumerate(tiles):
    o.paste(t, (0, i * (75 * 4 + 4)))
o.save(os.environ['OUT'])
