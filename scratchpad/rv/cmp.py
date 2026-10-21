import sys, json
import numpy as np
from PIL import Image, ImageDraw
A = sys.argv[1]
OUT = A + '/review-set-r2/earth-v3-r2/'
ref = Image.open(A + '/REF-earth-set-owner.jpg').convert('RGB')
man = json.load(open(A + '/staging/vfx_earth_v3/manifest.json'))['sprites']
char = Image.open(A + '/earth-v3-work/character.png').convert('RGBA')
PANEL = (35, 35, 46); PAGE = (23, 22, 30)
# name: (his area, s, key anim, key frame, bg)
CFG = {
 'bolt': ((28, 101, 267, 336), 2.35, 'fly', 0, PANEL),
 'breath': ((1317, 101, 1634, 362), 2.35, 'fly', 0, PANEL),
 'sphere': ((1664, 101, 1922, 348), 2.35, 'fly', 0, PANEL),
 'slash': ((25, 435, 267, 679), 2.35, 'fly', 0, PANEL),
 'multi': ((298, 435, 575, 679), 2.35, 'fly', 0, PANEL),
 'multi_hit': ((586, 425, 802, 660), 2.35, 'hit', 3, PAGE),
 'hit': ((811, 435, 1121, 679), 2.35, 'hit', 3, PANEL),
 'blast': ((1159, 435, 1668, 797), 2.39, 'blast', 4, PANEL),
 'wall': ((24, 867, 745, 1253), 2.34, 'rise', 11, PANEL),
 'wall_diag': ((1222, 867, 1840, 1490), 2.35, 'rise', 11, PANEL),
 'wall_depth': ((24, 1360, 320, 1974), 2.26, 'rise', 11, PANEL),
 'aura': ((929, 867, 1192, 1215), 2.41, 'idle', 0, PANEL),
 'stream_head': ((800, 101, 1287, 324), 158 / 64, 'fly', 0, PANEL),
 'stream': ((650, 101, 975, 324), 158 / 64, 'fly', 0, PANEL),
}
def frame(name, anim, f):
    m = man[name]; a = m['anims'][anim]
    im = Image.open(A + '/staging/vfx_earth_v3/' + m['file']).convert('RGBA')
    W, H = m['frameW'], m['frameH']
    return im.crop((f * W, a['row'] * H, (f + 1) * W, (a['row'] + 1) * H))
only = sys.argv[2:] or list(CFG)
for name in only:
    area, s, anim, f, bg = CFG[name]
    m = man[name]; W, H = m['frameW'], m['frameH']; ax, ay = m['anchor']
    fr = frame(name, anim, f)
    if name == 'aura':
        back = frame('aura_back', 'idle', 0)
        comp = Image.new('RGBA', (W, H), (0, 0, 0, 0)); comp.alpha_composite(back)
        c = Image.new('RGBA', (W, H), (0, 0, 0, 0)); c.paste(char, (ax - 64, ay - 120)); comp.alpha_composite(c)
        comp.alpha_composite(fr); fr = comp
    x0, y0, x1, y1 = area
    hw, hh = int(round((x1 - x0) / s)), int(round((y1 - y0) / s))
    his = np.asarray(ref.resize((hw, hh), Image.BOX, box=area)).astype(float)
    ours_rgba = np.asarray(fr).astype(float)
    al = ours_rgba[..., 3:] / 255
    on_bg = ours_rgba[..., :3] * al + np.array(bg) * (1 - al)
    # search the offset of our frame inside his downscaled crop (pad his crop with bg)
    P = 40
    hp = np.ones((hh + 2 * P, hw + 2 * P, 3)) * np.array(bg); hp[P:P + hh, P:P + hw] = his
    best = None
    for dy in range(0, hp.shape[0] - H + 1):
        for dx in range(0, hp.shape[1] - W + 1):
            e = np.abs(hp[dy:dy + H, dx:dx + W] - on_bg).mean()
            if best is None or e < best[0]: best = (e, dx, dy)
    e, dx, dy = best
    hisW = hp[dy:dy + H, dx:dx + W]
    diff = np.abs(hisW - on_bg).sum(-1)
    # his anchor in sheet coords
    hax = x0 + (dx - P + ax) * s; hay = y0 + (dy - P + ay) * s
    print('%-11s err %.2f  our anchor maps to his (%.0f,%.0f)  frame %dx%d' % (name, e, hax, hay, W, H))
    light = ours_rgba[..., :3] * al + np.array((214, 206, 188)) * (1 - al)
    dimg = np.clip(diff * 1.5, 0, 255)
    dimg = np.stack([dimg, dimg * 0.3, dimg * 0.3], -1)
    S = 3
    tiles = [hisW, on_bg, light, dimg]
    canvas = Image.new('RGB', (4 * W * S + 5 * 6, H * S + 30), (12, 12, 16))
    dr = ImageDraw.Draw(canvas)
    for i, t in enumerate(tiles):
        ti = Image.fromarray(np.clip(t, 0, 255).astype(np.uint8)).resize((W * S, H * S), Image.NEAREST)
        x = 6 + i * (W * S + 6)
        canvas.paste(ti, (x, 24))
        d2 = ImageDraw.Draw(canvas)
        cx, cy = x + ax * S + 1, 24 + ay * S + 1
        d2.line([(cx - 6, cy), (cx + 6, cy)], fill=(255, 0, 255)); d2.line([(cx, cy - 6), (cx, cy + 6)], fill=(255, 0, 255))
        dr.text((x, 6), ['HIS (box 1/%.2f)' % s, 'OURS key f%d on his bg' % f, 'OURS on light', 'abs diff'][i], fill=(230, 230, 230))
    canvas.save(OUT + 'c3-%s.png' % name)
