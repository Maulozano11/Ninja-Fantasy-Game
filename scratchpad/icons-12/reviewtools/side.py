import sys, os, json
import numpy as np
from PIL import Image, ImageDraw
S = sys.argv[1]   # stage dir
A = sys.argv[2]   # assets dir (branch)
O = sys.argv[3]   # out dir
ids = ['lightning_hound_raidon', 'crescent_moon_dance', 'temple_of_nirvana']
crops = json.load(open(os.path.join(S, 'ref', 'crops.json')))
def box(a, n):
    a = a.astype(float); h, w = a.shape[:2]
    o = np.zeros((n, n, 3))
    s = h / n
    for y in range(n):
        for x in range(n):
            y0, y1, x0, x1 = y*s, (y+1)*s, x*s, (x+1)*s
            acc = np.zeros(3); wt = 0
            for yy in range(int(y0), int(np.ceil(y1))):
                wy = min(y1, yy+1) - max(y0, yy)
                for xx in range(int(x0), int(np.ceil(x1))):
                    wx = min(x1, xx+1) - max(x0, xx)
                    acc += a[yy, xx] * wx * wy; wt += wx * wy
            o[y, x] = acc / wt
    return o
def up(a, k): return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).resize((a.shape[1]*k, a.shape[0]*k), Image.NEAREST)
for jid in ids:
    win = np.asarray(Image.open(os.path.join(S, 'ref', jid + '@window.png')).convert('RGB'))
    sq = np.asarray(Image.open(os.path.join(S, 'ref', jid + '.png')).convert('RGB'))
    o88 = np.asarray(Image.open(os.path.join(A, jid + '@2x.png')).convert('RGB'))
    o44 = np.asarray(Image.open(os.path.join(A, jid + '.png')).convert('RGB'))
    b88 = box(sq, 88); b44 = box(sq, 44)
    np.save(os.path.join(O, jid + '_b88.npy'), b88); np.save(os.path.join(O, jid + '_b44.npy'), b44)
    c = crops['icons'][jid]; s0 = c['squareInWindow'][0]
    # panel 1: whole window at 4x with square outline
    W = up(win, 4); d = ImageDraw.Draw(W); d.rectangle([s0*4, 0, (s0+115)*4-1, 115*4-1], outline=(255, 0, 0), width=2)
    panels = [W, up(sq, 4), up(b88, 5), up(o88, 5), up(b44, 10), up(o44, 10)]
    tw = sum(p.size[0] for p in panels) + 10*(len(panels)+1)
    im = Image.new('RGB', (tw, 480), (40, 40, 40)); x = 10
    for p in panels:
        im.paste(p, (x, 10)); x += p.size[0] + 10
    im.save(os.path.join(O, jid + '-side.png'))
    # zoom pair 88: his box 88 vs ours at 8x, side by side
    im2 = Image.new('RGB', (88*8*2+30, 88*8+20), (40, 40, 40)); im2.paste(up(b88, 8), (10, 10)); im2.paste(up(o88, 8), (88*8+20, 10)); im2.save(os.path.join(O, jid + '-88zoom.png'))
    im3 = Image.new('RGB', (44*12*2+30, 44*12+20), (40, 40, 40)); im3.paste(up(b44, 12), (10, 10)); im3.paste(up(o44, 12), (44*12+20, 10)); im3.save(os.path.join(O, jid + '-44zoom.png'))
    print(jid, 'mean abs diff 88', np.abs(b88 - o88).mean(axis=(0, 1)).round(1), 'mean 88 his', b88.mean(axis=(0, 1)).round(1), 'ours', o88.mean(axis=(0, 1)).round(1))
    print(jid, 'mean abs diff 44', np.abs(b44 - o44).mean(axis=(0, 1)).round(1), 'mean 44 his', b44.mean(axis=(0, 1)).round(1), 'ours', o44.mean(axis=(0, 1)).round(1))
