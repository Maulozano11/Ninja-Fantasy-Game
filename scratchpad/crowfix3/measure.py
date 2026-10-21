import sys, json
import numpy as np
from PIL import Image
sys.path.insert(0, '.')
from decode import load
ts, dbg = sys.argv[1], sys.argv[2]
size, anchor, frames = load(ts)
info = json.load(open(f'{dbg}/crows-ref.json'))
L601 = np.array([0.299, 0.587, 0.114])
def stats(img, mask, name):
    rgb = img[..., :3].astype(float)
    lu = rgb @ L601
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    red = (r > 150) & (g < 110)  # eyes
    m = mask & ~red
    bmg = (b - g)
    vort = m & (bmg > 80)
    print(f'{name}: px luma>100 (no eyes) {int((m & (lu > 100)).sum())}, >90 {int((m & (lu > 90)).sum())}, max luma {lu[m].max():.0f};'
          f' vortex b-g>80 {int(vort.sum())}, peak b-g {bmg[m].max():.0f}')
for k, i in (('L', 0), ('R', 4)):
    his = np.asarray(Image.open(f'{dbg}/crows-his-{k}.png').convert('RGBA'))
    # his picture: pixels that differ from his background
    hm = (his[..., 3] > 0) & (np.abs(his[..., :3].astype(int) - [31, 31, 41]).sum(2) > 24)
    stats(his, hm, f'his {k}')
    f = frames['fly'][i]
    stats(f, f[..., 3] > 0, f'ours fly {i}')
for i, f in enumerate(frames['fly']):
    rgb = f[..., :3].astype(float); a = f[..., 3] > 0
    bmg = rgb[..., 2] - rgb[..., 1]
    print('fly', i, 'vortex px b-g>80', int((a & (bmg > 80)).sum()), 'b-g>60', int((a & (bmg > 60)).sum()))
for i, f in enumerate(frames['summon']):
    rgb = f[..., :3].astype(float); a = f[..., 3] > 0
    bmg = rgb[..., 2] - rgb[..., 1]
    print('summon', i, 'vortex px b-g>80', int((a & (bmg > 80)).sum()), 'b-g>60', int((a & (bmg > 60)).sum()))
