"""Review sheet and GIF for the chakra griffin copied from the owner's chakra sheet.

    python3 -I beasts-griffin.py            (paths are relative to this file)

Reads the staged sheet (staging/vfx_beasts_griffin), his picture at the game scale on our grid and the
converter's numbers (griffin-ref/, written by tools/refs/griffin-from-ref.py with a debug dir), his sheet
itself (REF-chakra-set-owner.jpg), the old chakra fox (staging/vfx_beasts/chakra) and the character
(beasts-character.png). Writes beasts-griffin.png and beasts-griffin.gif (the fly loop at its fps, x3),
each to a temp name and renamed, so a reader never sees half a file.
"""
import json
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
STAGE = os.path.join(HERE, 'staging', 'vfx_beasts_griffin')
REFD = os.path.join(HERE, 'griffin-ref')
K = 3
BG = (0x5D, 0x6B, 0x57, 255)        # the battle map's grass, as in the other beast sheets
HISBG = (32, 31, 39, 255)            # his panel's background
SHEET = (0x2A, 0x2E, 0x36, 255)
GROUND = (0x4A, 0x5A, 0x3C, 255)
INK = (0xE8, 0xE0, 0xC0, 255)
TICK = (0xE8, 0xC0, 0x40, 255)
FONT = ImageFont.load_default(size=22)
SMALL = ImageFont.load_default(size=18)


def save_whole(img, name, **kw):
    path = os.path.join(HERE, name)
    tmp = path + '.part'
    img.save(tmp, format=kw.pop('format', 'PNG'), **kw)
    os.replace(tmp, path)


man = json.load(open(os.path.join(STAGE, 'manifest.json')))['sprites']['chakra']
sheet = Image.open(os.path.join(STAGE, man['file'])).convert('RGBA')
FW, FH = man['frameW'], man['frameH']
AX, AY = man['anchor']
A = man['anims']['fly']
FPS = A['fps']
FLY = [sheet.crop((i * FW, A['row'] * FH, (i + 1) * FW, (A['row'] + 1) * FH)) for i in range(A['frames'])]
info = json.load(open(os.path.join(REFD, 'griffin-ref.json')))
# His picture was written on the converter's grid; shift it onto the staged anchor.
DX, DY = AX - info['anchor'][0], AY - info['anchor'][1]


def his_game():
    src = Image.open(os.path.join(REFD, 'griffin-his-game.png')).convert('RGBA')
    out = Image.new('RGBA', (FW, FH), HISBG)
    out.paste(src, (DX, DY))
    return out


def his_raw():
    """His panel straight from his sheet (his own pixels, 1:1), cropped to the same box around our anchor."""
    ref = Image.open(os.path.join(HERE, 'REF-chakra-set-owner.jpg')).convert('RGBA')
    ax, ay = info['anchor_src']
    s = info['scale']
    x0, y0 = ax - AX / s, ay - AY / s
    c = ref.crop((round(x0), round(y0), round(x0 + FW / s), round(y0 + FH / s)))
    return c.resize((FW, FH), Image.LANCZOS)


def panel(frame, bg=BG, ticks=True):
    c = Image.new('RGBA', frame.size, bg)
    c.alpha_composite(frame)
    c = c.resize((frame.width * K, frame.height * K), Image.NEAREST)
    if ticks:  # the anchor, marked on the panel's edges
        d = ImageDraw.Draw(c)
        x, y = AX * K + K // 2, AY * K + K // 2
        d.line([(x, 0), (x, 8)], fill=TICK, width=2)
        d.line([(x, c.height - 9), (x, c.height - 1)], fill=TICK, width=2)
        d.line([(0, y), (8, y)], fill=TICK, width=2)
        d.line([(c.width - 9, y), (c.width - 1, y)], fill=TICK, width=2)
    return c


def grid(tiles, labels, cols, gap=10):
    w = max(t.width for t in tiles)
    h = max(t.height for t in tiles)
    rows = (len(tiles) + cols - 1) // cols
    out = Image.new('RGBA', (cols * w + (cols - 1) * gap, rows * h + (rows - 1) * gap), SHEET)
    d = ImageDraw.Draw(out)
    for i, (t, lab) in enumerate(zip(tiles, labels)):
        x, y = (i % cols) * (w + gap), (i // cols) * (h + gap)
        out.paste(t, (x, y))
        d.text((x + 8, y + 6), lab, fill=INK, font=SMALL)
    return out


# The old chakra fox (what this replaces), if it is staged.
old = None
mp = os.path.join(HERE, 'staging', 'vfx_beasts', 'manifest.json')
if os.path.exists(mp):
    om = json.load(open(mp))['sprites'].get('chakra')
    if om:
        oi = Image.open(os.path.join(HERE, 'staging', 'vfx_beasts', om['file'])).convert('RGBA')
        old = (oi.crop((0, 0, om['frameW'], om['frameH'])), om['anchor'])

# Scale: the character, the griffin (fly 0 and 4) and the old fox, at flight height.
char = Image.open(os.path.join(HERE, 'beasts-character.png')).convert('RGBA')
LIFT = 64  # the renderer flies beasts about 64 px above the ground
items = [(FLY[0], (AX, AY)), (FLY[4], (AX, AY))] + ([old] if old else [])
above = max(120 + 4, max(LIFT + a[1] + 4 for _, a in items))
below = max(26, max(f.height - a[1] - LIFT + 4 for f, a in items))
SW = 8 + 128 + 16 + sum(f.width + 16 for f, _ in items)
scale = Image.new('RGBA', (SW, above + below), BG)
ImageDraw.Draw(scale).rectangle([0, above, SW, above + below], fill=GROUND)
scale.alpha_composite(char, (8, above - 120))
x = 8 + 128 + 16
for f, (ax, ay) in items:
    scale.alpha_composite(f, (x, above - LIFT - ay))
    x += f.width + 16
scale = scale.resize((SW * K, scale.height * K), Image.NEAREST)

LUMA = np.array([0.3, 0.55, 0.15])


def frame_light(f):
    """Mean alpha x luma over the frame, and the mean luma of what it covers."""
    a = np.asarray(f, np.float32)
    al = a[..., 3] / 255
    lu = (a[..., :3] @ LUMA) / 255
    return float((al * lu).mean()), float((al * lu).sum() / max(al.sum(), 1e-6))


L = [frame_light(f)[0] for f in FLY]
ML = [frame_light(f)[1] for f in FLY]
SOFT = [v / (FW * FH) for v in info['soft_light']]
deg = info['wing_deg']
bob = info['bob']
fly_labels = [f'{i}{" (his)" if i == 0 else ""}  wings {deg[i]:.0f}/{info["far_deg"][i]:.0f}  bob {bob[i]}  light {L[i]:.3f}' for i in range(len(FLY))]
steps = ', '.join(f'{L[(i + 1) % len(L)] / L[i]:.2f}' for i in range(len(L)))
soft_steps = ', '.join(f'{SOFT[(i + 1) % len(SOFT)] / SOFT[i]:.2f}' for i in range(len(SOFT)))


def zoom_row(tiles_src, labels, box, z, bg):
    """Crops of several images (RGBA, frame-sized) at zoom z, side by side, labelled."""
    tiles = []
    for im in tiles_src:
        c = Image.new('RGBA', im.size, bg)
        c.alpha_composite(im)
        c = c.crop(box)
        tiles.append(c.resize((c.width * z, c.height * z), Image.NEAREST))
    return grid(tiles, labels, len(tiles), gap=8)


HIS_G = his_game()
# (His frame-0 crops come from his picture at the game scale, on his panel; ours on the same panel colour.)
FDEG = info['far_deg']
FVIS = info['far_visible']
FSTEP = max(abs(FVIS[(i + 1) % len(FVIS)] - FVIS[i]) / max(FVIS[(i + 1) % len(FVIS)], FVIS[i]) for i in range(len(FVIS)))
fix_blocks = [
    ('far', zoom_row(FLY, [f'{i}{" (his)" if i == 0 else ""} far {FDEG[i]:.0f}, {FVIS[i]} px' for i in range(len(FLY))], (30, 4, 104, 46), 4, BG),
     'Far wing, x4, all frames: it beats with the near one (0, -6, -18, -36, -46 degrees and back, no lag) and always peeks above\n'
     f"the near wing's trim with its pointed tip; how much of it shows changes by at most {FSTEP:.0%} a frame (px: opaque far-wing px on top)"),
    ('root', zoom_row([FLY[i] for i in (0, 2, 3, 4, 6)], ['0 (his)', '2', '3', '4', '6'], (67, 11, 105, 39), 6, BG),
     "Neck and far-wing root, x6: the far wing pivots at the top of its rounded, gold-trimmed base, so the base stays his; no fin behind the crest"),
    ('wisps', zoom_row(FLY, [str(i) for i in range(len(FLY))], (0, 4, 66, 84), 3, BG),
     "Wing-tip wisps, x3: carried with the tip they trail from, never turned (no needles), fading out while the tips are down (frames 3-5)\n"
     'and kept off the light streak; his other specks stream back as cross-fading copies'),
    ('body', zoom_row([FLY[i] for i in (2, 3, 5, 6)], ['2', '3', '5', '6'], (13, 9, 93, 64), 4, BG),
     "Near wing over the body, x4: one unbroken edge in his mid blue (26, 87, 114) where it lies over the haunch and belly, not a dark crack;\n"
     "under the trim, the far wing's hidden part is an even shadow band (no comb)"),
    ('head', zoom_row([HIS_G, FLY[0], FLY[0]], ['his', 'ours (his panel)', 'ours (grass)'], (FW - 40, 18, FW, 64), 8, HISBG),
     'Head, x8: his mouth colours (dark red throat, pink tongue) only inside the beak; the outline sits on his edge, mid blue where he glows'),
]
fix_blocks[4] = ('head', grid([zoom_row([HIS_G], ['his'], (FW - 40, 18, FW, 64), 8, HISBG), zoom_row([FLY[0]], ['ours'], (FW - 40, 18, FW, 64), 8, HISBG),
                               zoom_row([FLY[0]], ['ours on the grass'], (FW - 40, 18, FW, 64), 8, BG)], ['', '', ''], 3, gap=8), fix_blocks[4][2])
OI = tuple(info.get('outline_indigo', info['outline']))
fix_blocks.append(('underside', grid([zoom_row([HIS_G], ['his'], (36, 50, FW - 15, FH), 5, HISBG), zoom_row([FLY[0]], ['ours'], (36, 50, FW - 15, FH), 5, HISBG),
                                      zoom_row([FLY[0]], ['ours on the grass'], (36, 50, FW - 15, FH), 5, BG)], ['', '', ''], 3, gap=8),
                   f'Underside, x5: his violet-indigo belly and far legs keep his indigo entries, rimmed in his own indigo rim colour {OI} (not the deep blue)'))
fix_blocks.append(('streak', grid([zoom_row([HIS_G], ['his'], (0, 52, 62, FH), 5, HISBG), zoom_row([FLY[0]], ['ours'], (0, 52, 62, FH), 5, HISBG),
                                   zoom_row([FLY[0]], ['ours on the grass'], (0, 52, 62, FH), 5, BG)], ['', '', ''], 3, gap=8),
                   'Light streak and specks, x5: one soft fan, 7 alpha levels (255 down to 50) in 6 of his colours; specks semi-transparent'))

blocks = [
    ('his', grid([panel(his_raw(), HISBG), panel(his_game(), HISBG), panel(FLY[0], HISBG), panel(FLY[0])],
                 ['his panel (his pixels, cropped round our anchor)', 'his picture at the game scale (box filter)', 'ours: fly 0 (on his background)', 'ours: fly 0 (on the grass)'], 2),
     f"His BEAST picture next to our frame 0, x3 (scale {info['scale']:.4f}: his character is {info['his_char']} px tall, ours 96). Ticks: our anchor"),
    ('fly', grid([panel(f) for f in FLY], fly_labels, 4),
     f'fly, {len(FLY)} frames at {FPS} fps, loop, x3. Light (mean alpha x luma) steps k->k+1: {steps}; mean luma {min(ML):.3f}-{max(ML):.3f}\n'
     f'Light outside the griffin (streak, wisps, specks) steps k->k+1: {soft_steps}'),
    ('scale', scale, 'Scale: our character, the griffin (fly 0 and 4) and the old chakra fox, at flight height, x3'),
] + fix_blocks
title = f"Chakra griffin (vfx_beasts_griffin/chakra) copied from the owner's chakra sheet: {FW}x{FH}, anchor [{AX}, {AY}], fly {len(FLY)}F {FPS}fps loop"
W = max(b.width for _, b, _ in blocks) + 40
W = max(W, 1400)
H = 60 + sum(b.height + 60 + 30 * cap.count('\n') for _, b, cap in blocks)
out = Image.new('RGBA', (W, H), SHEET)
d = ImageDraw.Draw(out)
d.text((20, 18), title, fill=INK, font=FONT)
y = 60
for _, b, cap in blocks:
    d.multiline_text((20, y + 8), cap, fill=INK, font=FONT, spacing=8)
    extra = 30 * cap.count('\n')
    out.paste(b, (20, y + 44 + extra))
    y += b.height + 60 + extra
save_whole(out, 'beasts-griffin.png')


def gif(frs, name, fps):
    """Frames x3 on the grass at the loop's fps, with an exact palette (no dithering)."""
    imgs = []
    for f in frs:
        c = Image.new('RGBA', f.size, BG)
        c.alpha_composite(f)
        imgs.append(c.convert('RGB').resize((f.width * K, f.height * K), Image.NEAREST))
    arrs = [np.asarray(im).reshape(-1, 3) for im in imgs]
    colours, inv = np.unique(np.concatenate(arrs), axis=0, return_inverse=True)
    assert len(colours) <= 256, len(colours)
    pal = colours.astype(np.uint8).flatten().tolist() + [0] * (768 - 3 * len(colours))
    ps = []
    off = 0
    for im, a in zip(imgs, arrs):
        p = Image.fromarray(inv[off:off + len(a)].reshape(im.height, im.width).astype(np.uint8), 'P')
        off += len(a)
        p.putpalette(pal)
        ps.append(p)
    durs = [round(1000 / fps)] * len(ps)
    path = os.path.join(HERE, name)
    tmp = path + '.part'
    ps[0].save(tmp, format='GIF', save_all=True, append_images=ps[1:], duration=durs, loop=0, disposal=1, optimize=False)
    os.replace(tmp, path)


gif(FLY, 'beasts-griffin.gif', FPS)
print('beasts-griffin.png', out.size, '| fly', len(FLY), '@', FPS, '| frame', (FW, FH), 'anchor', (AX, AY))
print('light (mean alpha x luma):', ' '.join(f'{v:.3f}' for v in L), '| steps', steps)
print('mean luma of covered px:', ' '.join(f'{v:.3f}' for v in ML))
print('light outside the griffin:', ' '.join(f'{v:.4f}' for v in SOFT), '| steps', soft_steps)
