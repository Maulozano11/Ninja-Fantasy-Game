# usage: v3cmp.py <art2> <char.png> : vfx-fire-v3-compare.png and vfx-fire-v3.png from the built group
import sys, os, json
from PIL import Image, ImageDraw
Image.MAX_IMAGE_PIXELS = None
art2, charp = sys.argv[1], sys.argv[2]
st = os.path.join(art2, 'staging', 'vfx_fire')
man = json.load(open(os.path.join(st, 'manifest.json')))['sprites']
ref = Image.open(os.path.join(art2, 'REF-fire-set-owner.jpg')).convert('RGB')
ch = Image.open(charp).convert('RGBA')
FEET = (64, 120); BG = (31, 31, 40)
def frame(name, anim, i):
    s = man[name]; im = Image.open(os.path.join(st, s['file'])).convert('RGBA'); info = s['anims'][anim]; fw, fh = s['frameW'], s['frameH']
    return im.crop((i * fw, info['row'] * fh, (i + 1) * fw, (info['row'] + 1) * fh)), tuple(s['anchor'])
P = [
    ('BOLT', 'bolt', 'fly', 0, (16, 98, 252, 328), 0.28, (186, 200), None),
    ('BEAST (PHOENIX, UNCHANGED)', 'beast', 'fly', 0, (322, 98, 682, 328), 0.357, (502, 213), None),
    ('BREATH', 'breath', 'fly', 0, (1362, 98, 1682, 328), 0.29, (1540, 200), None),
    ('SPHERE', 'sphere', 'fly', 0, (1706, 98, 1942, 328), 0.28, (1823, 200), None),
    ('SLASH', 'slash', 'fly', 0, (16, 452, 252, 694), 0.28, (133, 571), None),
    ('MULTI', 'multi', 'fly', 0, (324, 452, 560, 694), 0.28, (441, 571), None),
    ('HIT (PEAK, FRAME #3 OF 12)', 'hit', 'hit', 3, (694, 452, 1018, 714), 0.27, (845, 585), None),
    ('BLAST (PEAK, FRAME #4 OF 16)', 'blast', 'blast', 4, (1086, 452, 1784, 832), 0.40, (1354, 758), (1690, 796)),
    ('WALL', 'wall', 'idle', 0, (16, 912, 850, 1292), 0.39, (415, 1236), (930, 1254)),
    ('WALL_DIAG', 'wall_diag', 'idle', 0, (1082, 882, 1750, 1328), 0.40, (1425, 1140), (1650, 1270)),
    ('WALL_DEPTH', 'wall_depth', 'idle', 0, (10, 1386, 316, 1982), 0.40, (70, 1830), (238, 1932)),
    ('AURA (+ AURA_BACK)', 'aura', 'idle', 0, (408, 1396, 664, 1764), 0.40, (530, 1728), (530, 1728)),
    ('FIREBALL (FLY)', 'fireball', 'fly', 0, (744, 1390, 1260, 1770), 0.39, (1195, 1612), None),
    ('FIREBALL_GREAT (FLY)', 'fireball_great', 'fly', 0, (1320, 1390, 1980, 1980), 0.45, (1680, 1715), None),
]
def ours(p):
    title, name, anim, i, box, k, his, feet = p
    x0, y0, x1, y1 = box
    g = Image.new('RGBA', (round((x1 - x0) * k), round((y1 - y0) * k)), BG + (255,))
    ax, ay = (his[0] - x0) * k, (his[1] - y0) * k
    f, anc = frame(name, anim, i)
    if name == 'aura':
        b, banc = frame('aura_back', anim, i); g.alpha_composite(b, (round(ax - banc[0]), round(ay - banc[1])))
    if feet:
        g.alpha_composite(ch, (round((feet[0] - x0) * k - FEET[0]), round((feet[1] - y0) * k - FEET[1])))
    g.alpha_composite(f, (round(ax - anc[0]), round(ay - anc[1])))
    return g.resize((x1 - x0, y1 - y0), Image.NEAREST).convert('RGB')
def stream_box():
    x0, y0, x1, y1 = (694, 98, 1342, 328); k = 0.28
    g = Image.new('RGBA', (round((x1 - x0) * k), round((y1 - y0) * k)), BG + (255,))
    tile, _ = frame('stream', 'fly', 0); head, _ = frame('stream_head', 'fly', 0)
    top = round((200 - y0) * k - 32); x = round((740 - x0) * k); hx = round((1071 - x0) * k)
    while x < hx:
        g.alpha_composite(tile.crop((0, 0, min(64, hx - x), 64)), (x, top)); x += 64
    g.alpha_composite(head, (hx, top))
    return g.resize((x1 - x0, y1 - y0), Image.NEAREST).convert('RGB')
sheet = ref.copy()
for p in P: sheet.paste(ours(p), (p[4][0], p[4][1]))
sheet.paste(stream_box(), (694, 98))
out = os.path.join(art2, 'vfx-fire-v3.png'); sheet.save(out + '.part', format='PNG'); os.replace(out + '.part', out)
rows = [(p[0], ref.crop(p[4]), ours(p)) for p in P]
rows.insert(1, ('STREAM x2 + STREAM_HEAD', ref.crop((694, 98, 1342, 328)), stream_box()))
RH = 300
fit = lambda im: im.resize((round(im.width * RH / im.height), RH), Image.NEAREST)
items = [(t, fit(a), fit(b)) for t, a, b in rows]
colW = max(a.width + b.width + 30 for _, a, b in items); cols = 2
c = Image.new('RGB', (cols * colW + 40, 90 + ((len(items) + 1) // 2) * (RH + 60)), (12, 13, 19))
def label(text, x, y, s=3):
    t = Image.new('RGB', (len(text) * 7 + 4, 14), (12, 13, 19)); ImageDraw.Draw(t).text((1, 1), text, fill=(225, 225, 232))
    c.paste(t.resize((t.width * s, t.height * s), Image.NEAREST), (x, y))
label('FIRE SET V3 - HIS PANEL (LEFT) | OUR FRAME (RIGHT), SAME SCALE', 20, 20, 4)
for n, (t, a, b) in enumerate(items):
    cx, cy = 20 + (n % cols) * colW, 90 + (n // cols) * (RH + 60)
    label(t, cx, cy, 2); c.paste(a, (cx, cy + 30)); c.paste(b, (cx + a.width + 10, cy + 30))
out = os.path.join(art2, 'vfx-fire-v3-compare.png'); c.save(out + '.part', format='PNG'); os.replace(out + '.part', out)
def gif(frames_, out, pick, durations):
    mont = Image.new('RGB', (frames_[0].width, frames_[0].height * len(pick)))
    for n, j in enumerate(pick): mont.paste(frames_[j], (0, n * frames_[0].height))
    pal = mont.quantize(colors=255, method=Image.Quantize.MEDIANCUT)
    q = [f.quantize(palette=pal, dither=Image.Dither.NONE) for f in frames_]
    q[0].save(out + '.part', format='GIF', save_all=True, append_images=q[1:], duration=durations, loop=0, disposal=1); os.replace(out + '.part', out)
    print(os.path.basename(out), len(q), 'frames')
# The aura GIF: back layer, character, front layer, 3x, at its own fps.
s = man['aura']; n = s['anims']['idle']['frames']; fps = s['anims']['idle']['fps']
fr = []
for i in range(n):
    f, anc = frame('aura', 'idle', i); b, banc = frame('aura_back', 'idle', i)
    g = Image.new('RGBA', f.size, (27, 28, 38, 255))
    g.alpha_composite(b); g.alpha_composite(ch, (anc[0] - FEET[0], anc[1] - FEET[1])); g.alpha_composite(f)
    fr.append(g.convert('RGB').resize((f.width * 3, f.height * 3), Image.NEAREST))
gif(fr, os.path.join(art2, 'vfx-fire-v3-aura.gif'), list(range(0, n, 3)), round(1000 / fps))
# The blast and hit GIFs with the character beside them, holding on an empty frame at the end.
for name, anim, k, out in [('blast', 'blast', 2, 'vfx-fire-v3-blast.gif'), ('hit', 'hit', 3, 'vfx-fire-v3-hit.gif')]:
    s = man[name]; n = s['anims'][anim]['frames']; fps = s['anims'][anim]['fps']
    fr = []
    for i in range(n + 1):
        f, anc = frame(name, anim, min(i, n - 1))
        if i == n: f = Image.new('RGBA', f.size)
        g = Image.new('RGBA', (f.width + 60, f.height), (27, 28, 38, 255))
        g.alpha_composite(f); g.alpha_composite(ch, (f.width + 30 - FEET[0], anc[1] - FEET[1]))
        fr.append(g.convert('RGB').resize((g.width * k, g.height * k), Image.NEAREST))
    gif(fr, os.path.join(art2, out), [0, n // 4, n // 2, 3 * n // 4, n - 1], [round(1000 / fps)] * n + [500])
print('ok')
