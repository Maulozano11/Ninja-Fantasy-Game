"""sheetview.py <sheet.png> <frameW> <out.png> <frames,csv> [crop x0,y0,x1,y1] [bg: dark|grass|magenta] [k]"""
import sys, os
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from holes import label4
sh = np.asarray(Image.open(sys.argv[1]).convert('RGBA')).astype(np.float64)
W = int(sys.argv[2]); out = sys.argv[3]; frs = [int(v) for v in sys.argv[4].split(',')]
crop = tuple(int(v) for v in sys.argv[5].split(',')) if len(sys.argv) > 5 and sys.argv[5] != '-' else None
bgname = sys.argv[6] if len(sys.argv) > 6 else 'dark'
K = int(sys.argv[7]) if len(sys.argv) > 7 else 3
BG = {'dark': (21, 21, 29), 'grass': (84, 110, 70), 'magenta': (255, 0, 255)}[bgname]
tiles = []
for i in frs:
    f = sh[:, i * W:(i + 1) * W]
    op = f[..., 3] < 128
    lab, n = label4(op)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])).tolist())
    enc = op & ~np.isin(lab, list(border))
    al = f[..., 3:4] / 255
    comp = f[..., :3] * al + np.array(BG) * (1 - al)
    comp[enc] = (255, 0, 255) if bgname != 'magenta' else (0, 255, 255)
    im = Image.fromarray(comp.astype(np.uint8))
    if crop: im = im.crop(crop)
    im = im.resize((im.width * K, im.height * K), Image.NEAREST)
    ImageDraw.Draw(im).text((3, 3), f'f{i} enc {int(enc.sum())}', fill=(255, 60, 60))
    tiles.append(im)
cols = min(len(tiles), int(sys.argv[8]) if len(sys.argv) > 8 else 4)
rows = (len(tiles) + cols - 1) // cols
tw, th = tiles[0].size
can = Image.new('RGB', (cols * tw + (cols - 1) * 4, rows * th + (rows - 1) * 4), (0, 0, 0))
for k, t in enumerate(tiles):
    can.paste(t, ((k % cols) * (tw + 4), (k // cols) * (th + 4)))
can.save(out)
