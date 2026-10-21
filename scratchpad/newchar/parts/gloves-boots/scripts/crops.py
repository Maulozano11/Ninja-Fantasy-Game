"""Crops of his native pixels and of the reduced reference's layers, side by side, with a grid."""
import sys, os
sys.path.insert(0, os.path.join(os.getcwd(), 'tools/refs'))
import scarlet_ref as R, numpy as np
from PIL import Image, ImageDraw

WD = sys.argv[1]
N = np.load(WD + '/native.npy').astype(np.uint8)
bg = R.background(N.astype(np.int32))


def native_img(x0, y0, x1, y1, k):
    a = np.concatenate([N[y0:y1, x0:x1], np.full((y1 - y0, x1 - x0, 1), 255, np.uint8)], 2)
    a[bg[y0:y1, x0:x1]] = [235, 235, 240, 255]
    im = Image.fromarray(a, 'RGBA').resize(((x1 - x0) * k, (y1 - y0) * k), Image.NEAREST)
    d = ImageDraw.Draw(im)
    for x in range(x0, x1):
        if x % 5 == 0:
            d.line([((x - x0) * k, 0), ((x - x0) * k, im.height)], fill=(0, 160, 255, 255) if x % 10 == 0 else (0, 90, 140, 255))
    for y in range(y0, y1):
        if y % 5 == 0:
            d.line([(0, (y - y0) * k), (im.width, (y - y0) * k)], fill=(0, 160, 255, 255) if y % 10 == 0 else (0, 90, 140, 255))
    return im


def layer_img(src, x0, y0, x1, y1, k):
    P = R.rgb()
    a = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
    a[...] = [235, 235, 240, 255]
    s = src[y0:y1, x0:x1]
    m = s != 255
    a[m, :3] = P[s[m]]
    im = Image.fromarray(a, 'RGBA').resize(((x1 - x0) * k, (y1 - y0) * k), Image.NEAREST)
    d = ImageDraw.Draw(im)
    for x in range(x0, x1):
        if x % 5 == 0:
            d.line([((x - x0) * k, 0), ((x - x0) * k, im.height)], fill=(0, 160, 255, 255) if x % 10 == 0 else (0, 90, 140, 255))
    for y in range(y0, y1):
        if y % 5 == 0:
            d.line([(0, (y - y0) * k), (im.width, (y - y0) * k)], fill=(0, 160, 255, 255) if y % 10 == 0 else (0, 90, 140, 255))
    return im


what = sys.argv[2]
if what == 'native':
    x0, y0, x1, y1, k = [int(a) for a in sys.argv[3:8]]
    native_img(x0, y0, x1, y1, k).save(sys.argv[8])
else:
    lay = R.reduced_index() if what == 'all' else R.reduced_layers()[what]
    x0, y0, x1, y1, k = [int(a) for a in sys.argv[3:8]]
    layer_img(lay, x0, y0, x1, y1, k).save(sys.argv[8])
