# Dead-space check for vfx_fire/annihilation_enh against the owner's picture.
#   python3 -I gaps.py <annihilation_enh.png> <manifest.json> <REF-s-tier-fire-annihilation.jpg> [out_overlay_dir]
# Per frame, in x150-960 / y400-900 (under and around the dragon):
#   enclosed : transparent px boxed in by opaque px (not reachable from the region's edge)
#   sandwich : transparent px with opaque px above AND below in the same column (a gap under something)
#   excess   : sandwich px where his picture is painted (not night sky) -> dead space he does not have
#   hisfire  : in burn frames, transparent px where his picture is painted at all
#   black    : opaque px darker than lum 35
import sys, json, os
import numpy as np
from PIL import Image, ImageFilter
sheet, man, ref = sys.argv[1], sys.argv[2], sys.argv[3]
outdir = sys.argv[4] if len(sys.argv) > 4 else None
m = json.load(open(man))['sprites']['annihilation_enh']
FW, FH = m['frameW'], m['frameH']
im = np.array(Image.open(sheet).convert('RGBA'))
X0, X1, Y0, Y1 = 150, 960, 400, 900
# his picture in our frame coordinates (extractor mapping: frame = (-2 + (x-57)*1.08, 780 + (y-922)*1.08))
R = Image.open(ref).convert('RGB').filter(ImageFilter.MedianFilter(3))
ra = np.array(R).astype(float)
fy, fx = np.mgrid[0:FH, 0:FW]
hx = np.clip(np.round(57 + (fx + 2) / 1.08).astype(int), 0, R.width - 1)
hy = np.clip(np.round(922 + (fy - 780) / 1.08).astype(int), 0, R.height - 1)
his = ra[hy, hx]
lum = 0.3 * his[..., 0] + 0.59 * his[..., 1] + 0.11 * his[..., 2]
his_sky = (lum < 75) & (his[..., 2] >= his[..., 0] - 6)
his_painted = ~his_sky
def sandwich(op):
    above = np.maximum.accumulate(op, axis=0)
    below = np.maximum.accumulate(op[::-1], axis=0)[::-1]
    return (~op) & above & below
def enclosed(op):
    clear = ~op
    reach = np.zeros_like(clear)
    reach[0] = clear[0]; reach[-1] = clear[-1]; reach[:, 0] |= clear[:, 0]; reach[:, -1] |= clear[:, -1]
    while True:
        g = reach.copy()
        g[1:] |= reach[:-1]; g[:-1] |= reach[1:]; g[:, 1:] |= reach[:, :-1]; g[:, :-1] |= reach[:, 1:]
        g &= clear
        if (g == reach).all(): return clear & ~reach
        reach = g
his_sub_op = his_painted[Y0:Y1, X0:X1]
his_sand = int(sandwich(his_sub_op).sum())
print(f'his picture: sandwiched sky px under/around the dragon = {his_sand}')
rows = sorted(m['anims'].items(), key=lambda kv: kv[1]['row'])
res = {}
for name, a in rows:
    for i in range(a['frames']):
        f = im[a['row'] * FH:(a['row'] + 1) * FH, i * FW:(i + 1) * FW]
        op = f[..., 3] >= 128
        sub = op[Y0:Y1, X0:X1]
        sw = sandwich(sub)
        enc = enclosed(sub)
        ex = sw & his_sub_op
        rgb = f[Y0:Y1, X0:X1, :3].astype(float)
        l = 0.3 * rgb[..., 0] + 0.59 * rgb[..., 1] + 0.11 * rgb[..., 2]
        black = int((sub & (l < 35)).sum())
        hf = int(((~sub) & his_sub_op).sum()) if name == 'burn' else -1
        res[f'{name}{i}'] = dict(enclosed=int(enc.sum()), sandwich=int(sw.sum()), excess=int(ex.sum()), hisfire=hf, black=black)
        print(f'{name}{i:02d}: enclosed {int(enc.sum()):6d}  sandwich {int(sw.sum()):6d}  excess(his painted) {int(ex.sum()):6d}  black {black:6d}' + (f'  transparent-where-his-painted {hf}' if hf >= 0 else ''))
        if outdir:
            os.makedirs(outdir, exist_ok=True)
            vis = f.copy()
            bg = np.array([21, 21, 29, 255], np.uint8)
            a_ = vis[..., 3:4].astype(float) / 255
            vis = (vis[..., :4].astype(float) * a_ + bg * (1 - a_)).astype(np.uint8); vis[..., 3] = 255
            mk = np.zeros((FH, FW), bool); mk[Y0:Y1, X0:X1] = ex
            vis[mk] = [255, 0, 255, 255]
            Image.fromarray(vis).save(os.path.join(outdir, f'{name}{i:02d}.png'))
json.dump(res, open(os.path.join(outdir or '.', 'gaps.json') if outdir else os.devnull, 'w'), indent=1)
