import runpy, sys, numpy as np
from PIL import Image, ImageDraw
SP = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
sys.argv = ['x', SP + '/art2/REF-wind-set-owner.jpg', SP + '/wv3/refdata.ts']
g = runpy.run_path('/home/user/Ninja-Fantasy-Game/tools/refs/wind-from-ref.py')
cfg = g['SPRITES']['aura']
c, B, gone, cr = g['prep'](cfg)
h, s = g['hue'](c); L = g['lum'](c)
ribbon = (L >= 125) & (c[..., 1] - c[..., 0] >= 30) & (h >= 135) & (h <= 185)
sx0, sy0 = cfg['src'][:2]
H, W = L.shape
bm = g['poly_mask'](H, W, sx0, sy0, [g['pg_to_his'](cfg, p) for p in cfg['body']])
vis = cr.copy().astype(np.uint8)
vis[ribbon & bm] = (255, 0, 255)
im = Image.fromarray(vis).resize((W * 5, H * 5), Image.NEAREST)
d = ImageDraw.Draw(im)
pts = [((x - sx0) * 5, (y - sy0) * 5) for x, y in g['pg_to_his'](cfg, cfg['body'][0])]
d.line(pts + [pts[0]], fill=(255, 255, 0))
im.save(SP + '/wv3/look/dbg7.png')
print(c[(bm)].shape, ribbon[bm].sum())
