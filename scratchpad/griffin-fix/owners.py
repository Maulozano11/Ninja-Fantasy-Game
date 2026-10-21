import sys; sys.path.insert(0, '.')
from partial import run
import numpy as np
from PIL import Image
g = run('if FAILS:\n    raise SystemExit')
frames = g['frames']; lab = g['speck_lab']; own = g['SPECK_OWNER']
tiles = []
for k in range(8):
    t = g['T'][k]; bob = g['bobs'][k]
    fields = {'near': g['wing_field']('near', t), 'far': g['wing_field']('far', t)} if k else {'near': (g['XX'] + 0.5, g['YY'] + 0.5), 'far': (g['XX'] + 0.5, g['YY'] + 0.5)}
    f = frames[k]
    b = Image.new('RGBA', (f.shape[1], f.shape[0]), (32, 31, 39, 255)); b.alpha_composite(Image.fromarray(f, 'RGBA'))
    a = np.asarray(b.convert('RGB')).copy().astype(np.float32)
    for who, colr in (('near', (255, 40, 40)), ('far', (40, 255, 40)), ('free', (255, 255, 0))):
        g['speck_lab'] = np.where(np.isin(lab, [i for i, o in enumerate(own) if o == who]), lab, -1)
        pa, pc, _ = g['specks_at'](t, bob, fields)
        m = pa > 0.16
        a[m] = a[m] * 0.3 + np.array(colr) * 0.7
    g['speck_lab'] = lab
    im = Image.fromarray(a.astype(np.uint8)).crop((0, 0, 110, 90))
    tiles.append(im.resize((im.width * 4, im.height * 4), Image.NEAREST))
w, h = tiles[0].size
o = Image.new('RGB', (4 * (w + 6), 2 * (h + 6)), (255, 0, 255))
for i, t_ in enumerate(tiles):
    o.paste(t_, ((i % 4) * (w + 6), (i // 4) * (h + 6)))
o.save('owners.png')
