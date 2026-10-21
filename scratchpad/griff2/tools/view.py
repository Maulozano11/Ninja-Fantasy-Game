"""Views of the draft frames: python3 view.py <dbgdir> <out.png> [k] [x0 y0 x1 y1]"""
import sys, os
import numpy as np
from PIL import Image
d = np.load(os.path.join(sys.argv[1], 'draft.npz'))
F = d['frames']; S = d['solids']; H0 = d['holes0']; U = d['upper']; B = d['bobs']
mode = sys.argv[3] if len(sys.argv) > 3 else 'all'
box = [int(v) for v in sys.argv[4:8]] if len(sys.argv) > 7 else None
k = int(sys.argv[9]) if len(sys.argv) > 9 else 3
GR = (0x5d, 0x6b, 0x57)

def shift_rows(a, n):
    if n == 0: return a
    o = np.zeros_like(a)
    if n > 0: o[n:] = a[:-n]
    else: o[:n] = a[-n:]
    return o

def enclosed(m):
    from PIL import ImageDraw
    img = Image.fromarray(np.where(m, 1, 0).astype(np.uint8), 'L').copy()  # (a copy: fromarray's image is read-only)
    ImageDraw.floodfill(img, (0, 0), 2)
    return np.asarray(img) == 0

def tile(i, holes=False, zoom=3):
    f = F[i]
    b = Image.new('RGBA', (f.shape[1], f.shape[0]), GR + (255,))
    b.alpha_composite(Image.fromarray(f, 'RGBA'))
    a = np.asarray(b.convert('RGB')).copy()
    if holes:
        h = enclosed(S[i]) & ~shift_rows(H0, B[i]) & shift_rows(U, B[i])
        a[h] = (255, 0, 0)
        ue = shift_rows(U, B[i]); 
        # zone border
        e = ue & ~(np.roll(ue,1,0)&np.roll(ue,-1,0)&np.roll(ue,1,1)&np.roll(ue,-1,1))
        a[e] = (255, 0, 255)
    im = Image.fromarray(a)
    if box: im = im.crop(box)
    return im.resize((im.width * zoom, im.height * zoom), Image.NEAREST)

zoom = int(sys.argv[8]) if len(sys.argv) > 8 else 3
holes = mode == 'holes'
tiles = [tile(i, holes, zoom) for i in range(len(F))]
cols = 4
w, h = tiles[0].size
out = Image.new('RGB', (cols * (w + 6), 2 * (h + 6)), (40, 40, 40))
for i, t in enumerate(tiles):
    out.paste(t, ((i % cols) * (w + 6), (i // cols) * (h + 6)))
out.save(sys.argv[2])
