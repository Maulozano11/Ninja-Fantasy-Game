"""After the hydra (the owner, 2026-10-30): the party stays where it fought; the loot fang glows
softly; the only way to take it is to walk up to it: a character close enough gets the choice
"Lootear" or "Seguir adelante" (both can be done: loot, then go on). Going on, the party leaps one by
one over the wall to the right, where Barrabás went, with his ninja leap (crouch, dust puff, flip,
afterimage trail). 30 fps, MP4 + GIF + storyboard frames."""
import math, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageEnhance

S, OUT = sys.argv[1], sys.argv[2]
sys.argv = [sys.argv[0], S, OUT]
exec(open(f'{S}/hydra/mount9.py').read())  # definitions only: P()
FD = OUT + '_frames'
os.makedirs(FD, exist_ok=True)
for f in os.listdir(FD):
    os.remove(os.path.join(FD, f))
ld = lambda p: Image.open(p).convert('RGB').resize((VW, VH), Image.LANCZOS)
DEAD = ld(f'{S}/hydra/col19/dead2_loot.png')
NOTOOTH = ld(f'{S}/hydra/col19/dead2_char.png')
TX, TY = 666.0 * VW / 1672, 789.0 * VH / 941  # the fang
TOOTH_ICON = Image.open(f'{S}/hydra/col19/dead2_loot.png').convert('RGBA').crop((655, 768, 676, 808))
_m = np.load(f'{S}/hydra/col19/tooth_mask.npy')[768:808, 655:676]
TOOTH_ICON.putalpha(Image.fromarray((_m * 255).astype(np.uint8)))
TOOTH_ICON = TOOTH_ICON.resize((TOOTH_ICON.width * 3, TOOTH_ICON.height * 3), Image.NEAREST)
FB = lambda s: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf', s)
UI = f'{S}/hydra/col12/ui'
PARTY = [('leg_solen', 3.2, 2.0), ('leg_romano', 2.6, 6.0), ('leg_aiden', 1.8, 4.5), ('leg_lyra', 3.6, 7.5), ('leg_aurelia', 1.6, 9.5)]
U = {}
for name, x, z in PARTY:
    sp = Image.open(f'{S}/cc/{name}.png').convert('RGBA')
    sp = sp.crop(sp.getbbox())
    sp = sp.resize((int(sp.width * 100 / sp.height), 100), Image.NEAREST)
    X, Y = P(x, z)
    U[name] = dict(sp=sp, x=float(X), y=float(Y), on=True, sx=1.0, sy=1.0, rot=0.0, trail=[], face=1)
N = [0]
STATE = dict(tooth=True, glow0=0, prompt=None, popup=None, puffs=[])


def glow(img, n):
    ph = (n - STATE['glow0']) / 30.0
    a = 0.75 + 0.25 * math.sin(ph * 2 * math.pi / 1.4)
    lay = Image.new('RGBA', img.size)
    d = ImageDraw.Draw(lay)
    for r, al in [(40, 30), (24, 60), (12, 100)]:
        d.ellipse([TX - r * 0.7, TY - r * 1.2, TX + r * 0.7, TY + r * 1.2], fill=(255, 225, 140, int(al * a)))
    img.alpha_composite(lay.filter(ImageFilter.GaussianBlur(8)))
    tw = 0.5 + 0.5 * math.sin(ph * 2 * math.pi / 0.9)
    L = int(6 + 9 * tw)
    sx, sy = TX + 1, TY + 14
    d = ImageDraw.Draw(img)
    c = (255, 250, 225, int(190 * a))
    d.line([(sx - L, sy), (sx + L, sy)], fill=c, width=2)
    d.line([(sx, sy - L), (sx, sy + L)], fill=c, width=2)


def button(name, label, w=300, bright=1.0):
    im = Image.open(f'{UI}/{name}.png').convert('RGBA')
    im = im.resize((w, int(im.height * w / im.width)), Image.LANCZOS)
    if bright != 1.0:
        a = im.split()[3]
        im = ImageEnhance.Brightness(im.convert('RGB')).enhance(bright).convert('RGBA')
        im.putalpha(a)
    d = ImageDraw.Draw(im)
    f = FB(22)
    tw = d.textlength(label, font=f)
    d.text(((im.width - tw) / 2, im.height / 2 - 15), label, font=f, fill=(250, 240, 215), stroke_width=3, stroke_fill=(20, 10, 10))
    return im


def prompt(img, alpha, hover, looted):
    lay = Image.new('RGBA', img.size)
    px, py, pw, ph = int(TX - 330), int(TY - 300), 660, 190
    p = Image.open(f'{UI}/panel_wide.png').convert('RGBA').resize((pw, ph), Image.LANCZOS)
    lay.alpha_composite(p, (px, py))
    d = ImageDraw.Draw(lay)
    t = 'Diente de basilisco' if not looted else 'Ya lo tienes'
    d.text((px + (pw - d.textlength(t, font=FB(28))) / 2, py + 26), t, font=FB(28), fill=(246, 214, 140), stroke_width=3, stroke_fill=(10, 6, 6))
    b1 = button('btn_off' if looted else 'btn_gold', 'Lootear', 290, 1.25 if hover == 'loot' else 1.0)
    b2 = button('btn_blue_hover' if hover == 'go' else 'btn_blue', 'Seguir adelante', 290)
    lay.alpha_composite(b1, (px + 30, py + 82))
    lay.alpha_composite(b2, (px + pw - 30 - b2.width, py + 82))
    # a little pointer down to the fang
    d.polygon([(TX - 14, py + ph - 4), (TX + 14, py + ph - 4), (TX, py + ph + 22)], fill=(60, 40, 30, 230))
    if alpha < 1:
        lay.putalpha(lay.getchannel('A').point(lambda v: int(v * alpha)))
    img.alpha_composite(lay)


def draw_unit(img, u):
    if not u['on']:
        return
    for x, y, r, a in u['trail']:
        g = u['sp'].rotate(r, resample=Image.NEAREST, expand=True)
        al = np.array(g)
        al[..., :3] = (al[..., :3] * 0.4 + np.array([200, 225, 255]) * 0.6).astype(np.uint8)
        al[..., 3] = (al[..., 3] * a).astype(np.uint8)
        g = Image.fromarray(al, 'RGBA')
        img.alpha_composite(g, (int(x - g.width / 2), int(y - g.height / 2)))
    sp = u['sp'].resize((max(1, int(u['sp'].width * u['sx'])), max(1, int(u['sp'].height * u['sy']))), Image.NEAREST)
    if u['rot']:
        sp = sp.rotate(u['rot'], resample=Image.NEAREST, expand=True)
        img.alpha_composite(sp, (int(u['x'] - sp.width / 2), int(u['y'] - 50 - sp.height / 2)))
    else:
        img.alpha_composite(sp, (int(u['x'] - sp.width / 2), int(u['y'] - sp.height)))


def emit():
    img = (DEAD if STATE['tooth'] else NOTOOTH).convert('RGBA')
    if STATE['tooth']:
        glow(img, N[0])
    if STATE['puffs']:
        lay = Image.new('RGBA', img.size)
        d = ImageDraw.Draw(lay)
        for p in STATE['puffs']:
            if p[3] > 0.05:
                d.ellipse([p[0] - p[2], p[1] - p[2] * 0.7, p[0] + p[2], p[1] + p[2] * 0.7], fill=(170, 160, 150, int(170 * p[3])))
            p[2] += (26 - p[2]) * 0.25
            p[3] *= 0.84
            p[0] += p[4]
            p[1] -= 1.4
        img.alpha_composite(lay.filter(ImageFilter.GaussianBlur(3)))
    for u in sorted(U.values(), key=lambda u: u['y']):
        draw_unit(img, u)
    if STATE['prompt']:
        prompt(img, *STATE['prompt'])
    if STATE['popup']:
        k, = STATE['popup']
        a = min(1, k / 6) * min(1, (40 - k) / 10)
        ic = TOOTH_ICON.copy()
        ic.putalpha(ic.getchannel('A').point(lambda v: int(v * a)))
        x, y = U['leg_aiden']['x'], U['leg_aiden']['y'] - 150 - k * 1.5
        img.alpha_composite(ic, (int(x - ic.width / 2 - 70), int(y - ic.height / 2)))
        d = ImageDraw.Draw(img)
        d.text((x - 40, y - 16), '+1 Diente de basilisco', font=FB(24), fill=(255, 235, 170, int(255 * a)), stroke_width=3, stroke_fill=(10, 6, 6, int(255 * a)))
    img.convert('RGB').save(f'{FD}/f{N[0]:04d}.png')
    N[0] += 1


MARK = {}
# 1. the battle is over: everyone where they ended it; the fang glows
for _ in range(30):
    emit()
MARK['fin'] = N[0] - 1
# 2. Aiden walks up to the head (the choice only shows close to it)
a = U['leg_aiden']
x0, y0 = a['x'], a['y']
x1, y1 = TX - 75, TY + 40
T = 54
for i in range(T):
    t = (i + 1) / T
    e = t * t * (3 - 2 * t)
    a['x'] = x0 + (x1 - x0) * e
    a['y'] = y0 + (y1 - y0) * e - 4 * abs(math.sin(i * math.pi / 6))
    emit()
a['y'] = y1
MARK['walk'] = N[0] - 20
# 3. close enough: the choice appears
for i in range(10):
    STATE['prompt'] = ((i + 1) / 10, None, False)
    emit()
for i in range(26):
    STATE['prompt'] = (1, 'loot' if i > 12 else None, False)
    emit()
MARK['choice'] = N[0] - 1
# 4. Lootear: the fang comes out of the jaw into his hands
STATE['prompt'] = None
STATE['tooth'] = False
for k in range(40):
    STATE['popup'] = (k,)
    emit()
    if k == 14:
        MARK['loot'] = N[0] - 1
STATE['popup'] = None
# 5. the choice again: looting is done, going on is left
for i in range(30):
    STATE['prompt'] = (1, 'go' if i > 12 else None, True)
    emit()
MARK['go'] = N[0] - 1
STATE['prompt'] = None
# 6. Seguir adelante: one by one they leap over the wall to the right, after Barrabás
ORDER = ['leg_aiden', 'leg_lyra', 'leg_solen', 'leg_romano', 'leg_aurelia']
START = {n: 6 * k for k, n in enumerate(ORDER)}
XT, YT = VW + 120, 40.0
JT = 22
for f in range(6 * len(ORDER) + 5 + JT + 8):
    for n in ORDER:
        u = U[n]
        j = f - START[n]
        if j < 0 or not u['on']:
            continue
        if j < 5:  # the crouch
            c = math.sin(math.pi * j / 4 * 0.5)
            u.update(sx=1 + 0.1 * c, sy=1 - 0.16 * c)
            if j == 4:
                u['x0'], u['y0'] = u['x'], u['y']
                STATE['puffs'] += [[u['x'] + dx, u['y'] - 4, 6, 0.9, dx * 0.1] for dx in (-36, -18, 0, 18, 36)]
        elif j < 5 + JT:
            uu = (j - 4) / JT
            u['trail'] = ([(u['x'], u['y'] - 50, u['rot'], 0.45)] + [(x, y, r, al * 0.6) for x, y, r, al in u['trail']])[:4]
            u.update(sx=1.0, sy=1.0, rot=-360 * min(1, uu * 1.1) if uu > 0.12 else 0.0,
                     x=u['x0'] + (XT - u['x0']) * uu, y=u['y0'] + (YT - u['y0']) * uu - 380 * 4 * uu * (1 - uu))
        else:
            u['on'] = False
    emit()
    if f == 14:
        MARK['leap'] = N[0] - 1
for _ in range(20):
    emit()
MARK['gone'] = N[0] - 1
print('frames', N[0], MARK)
import json
json.dump(MARK, open(OUT + '_marks.json', 'w'))
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', '30', '-i', f'{FD}/f%04d.png', '-vf', 'scale=1280:720:flags=lanczos', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', OUT + '.mp4'], check=True)
print('ok')
