"""Review sheets and GIFs for the raiju and the phoenix copied from the owner's references.

    python3 -I beasts-v2.py            (paths are relative to this file)

Reads the staged sheets (staging/vfx_beasts), the earlier raiju (beasts-raiju-v1.*), the old phoenix
(staging/vfx_fire/beast), the character (beasts-character.png, written by the generator), the owner's
references and where each frame came from in them (beasts-ref-*.json, written by beasts-from-ref.py).
His panels are shown at the same scale as the game frames, aligned on the same anchor. Every file is
written to a temp name and renamed, so a reader never sees half a file.
"""
import json
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
STAGE = os.path.join(HERE, 'staging')
K = 3
BG = (0x5D, 0x6B, 0x57, 255)
SHEET = (0x2A, 0x2E, 0x36, 255)
GROUND = (0x4A, 0x5A, 0x3C, 255)
INK = (0xE8, 0xE0, 0xC0, 255)
FONT = ImageFont.load_default(size=22)
SMALL = ImageFont.load_default(size=18)


def save_whole(img, name):
    path = os.path.join(HERE, name)
    tmp = path + '.part'
    img.save(tmp, format='PNG')
    os.replace(tmp, path)


def sheet_frames(png, meta, anim='fly'):
    img = Image.open(png).convert('RGBA')
    a = meta['anims'][anim]
    fw, fh = meta['frameW'], meta['frameH']
    return [img.crop((i * fw, a['row'] * fh, (i + 1) * fw, (a['row'] + 1) * fh)) for i in range(a['frames'])]


def staged(group, name):
    m = json.load(open(os.path.join(STAGE, group, 'manifest.json')))['sprites'][name]
    return m, os.path.join(STAGE, group, m['file'])


def panel(frame, bg=BG):
    c = Image.new('RGBA', frame.size, bg)
    c.alpha_composite(frame)
    return c.resize((frame.width * K, frame.height * K), Image.NEAREST)


def his(ref, src, scale, cell, anchor):
    """His panel at the game scale (x K), placed in a cell so his anchor sits on ours."""
    x0, y0, x1, y1 = src['box']
    crop = ref.crop((x0, y0, x1, y1))
    f = scale * K
    crop = crop.resize((round((x1 - x0) * f), round((y1 - y0) * f)), Image.LANCZOS)
    c = Image.new('RGBA', cell, BG)
    ax, ay = src['anchor'][0] - x0, src['anchor'][1] - y0
    c.paste(crop, (round(anchor[0] * K - ax * f), round(anchor[1] * K - ay * f)))
    return c


def text(d, xy, s, font=FONT, fill=INK):
    d.text(xy, s, font=font, fill=fill)


def pairs(out, d, y, ref, srcs, scale, frames, anchor, title, per_row=2, gap=8):
    """His frame next to ours, two pairs per row; returns the bottom y."""
    text(d, (20, y), title)
    y += 32
    fw, fh = frames[0].width * K, frames[0].height * K
    for i, f in enumerate(frames):
        src = srcs[i] if isinstance(srcs, list) else srcs
        col = i % per_row
        x = 20 + col * (2 * fw + 3 * gap)
        if col == 0 and i:
            y += fh + gap
        if src is not None:
            out.paste(his(ref, src, scale, (fw, fh), anchor), (x, y))
            text(d, (x + 6, y + 4), f'his {i}' if isinstance(srcs, list) else 'his key', SMALL)
        out.paste(panel(f), (x + fw + gap, y))
        text(d, (x + fw + gap + 6, y + 4), f'ours {i}', SMALL)
    return y + fh + gap * 2


def keyed(out, d, y, ref, src, scale, frames, anchor, title, key_at, W, gap=8):
    """His key frame, then all our frames of the animation; returns the bottom y."""
    text(d, (20, y), title)
    y += 32
    fw, fh = frames[0].width * K, frames[0].height * K
    s2 = dict(src)
    x0, y0, x1, y1 = src['box']
    s2['box'] = [x0, y0 + 16, x1, y1]  # his panel title cut off
    out.paste(his(ref, s2, scale, (fw, fh), anchor), (20, y))
    text(d, (26, y + 4), f'his key (our {key_at})', SMALL)
    x = 20 + fw + gap * 3
    for i, f in enumerate(frames):
        if x + fw > W:
            x = 20 + fw + gap * 3
            y += fh + gap
        out.paste(panel(f), (x, y))
        text(d, (x + 6, y + 4), f'ours {i}', SMALL)
        x += fw + gap
    return y + fh + gap * 2


def scale_row(out, d, x0, y0, width, items, lift=64):
    """Character on a ground strip and beasts at flight height (anchor `lift` px above the feet), K x."""
    char = Image.open(os.path.join(HERE, 'beasts-character.png')).convert('RGBA')
    feet = (64, 120)
    above = max([feet[1] + 6] + [lift + a[1] + 6 for _, a in items])
    h = (above + 14) * K
    out.paste(Image.new('RGBA', (width, h), BG), (x0, y0))
    gy = y0 + above * K
    out.paste(Image.new('RGBA', (width, 14 * K), GROUND), (x0, gy))
    out.alpha_composite(char.resize((char.width * K, char.height * K), Image.NEAREST), (x0 + 8 * K, gy - feet[1] * K))
    x = x0 + (8 + 128 + 10) * K
    for f, (ax, ay) in items:
        out.alpha_composite(f.resize((f.width * K, f.height * K), Image.NEAREST), (x, gy - (lift + ay) * K))
        x += (f.width + 12) * K
    return y0 + h


def his_scale_row(out, d, y, ref, box, W):
    text(d, (20, y), "His scale row, for comparison")
    y += 32
    x0, y0, x1, y1 = box
    c = ref.crop((x0, y0, x1, y1))
    k = min((W - 40) / c.width, 1.0)
    c = c.resize((round(c.width * k), round(c.height * k)), Image.LANCZOS)
    out.paste(c, (20, y))
    return y + c.height + 20


def gif(frames, name, fps=12):
    w = max(f.width for f in frames)
    h = max(f.height for f in frames)
    seq = []
    for f in frames:
        c = Image.new('RGBA', (w, h), BG)
        c.alpha_composite(f)
        seq.append(c.resize((w * K, h * K), Image.NEAREST).convert('RGB'))
    pal = seq[0].quantize(colors=255, method=Image.Quantize.MEDIANCUT)
    q = [s.quantize(palette=pal, dither=Image.Dither.NONE) for s in seq]
    path = os.path.join(HERE, name)
    tmp = path + '.part'
    q[0].save(tmp, format='GIF', save_all=True, append_images=q[1:], duration=[round(1000 / fps)] * len(q), loop=0, disposal=1, optimize=False)
    os.replace(tmp, path)


def raiju_sheet():
    info = json.load(open(os.path.join(HERE, 'beasts-ref-lightning.json')))
    ref = Image.open(os.path.join(HERE, info['ref'])).convert('RGBA')
    meta, png = staged('vfx_beasts', 'lightning')
    new = sheet_frames(png, meta)
    old_meta = json.load(open(os.path.join(HERE, 'beasts-raiju-v1.json')))
    old = sheet_frames(os.path.join(HERE, 'beasts-raiju-v1.png'), old_meta)
    fw = meta['frameW'] * K
    W = 40 + 4 * fw + 3 * 8 + 8
    out = Image.new('RGBA', (W, 5000), SHEET)
    d = ImageDraw.Draw(out)
    y = 16
    text(d, (20, y), f"Raiju (vfx_beasts/lightning) copied from the owner's paint-over: {meta['frameW']}x{meta['frameH']}, anchor {meta['anchor']}, 8-frame fly loop at 12 fps")
    y += 40
    y = pairs(out, d, y, ref, info['fly'], info['scale'], new, meta['anchor'], 'Fly loop: his panel (left, at the game scale, on his anchor ticks) and our frame (right), x3')
    text(d, (20, y), f"Before (the yellow raiju he painted over): {old_meta['frameW']}x{old_meta['frameH']}")
    y += 32
    ow = old[0].width * K
    for i, f in enumerate(old):
        out.paste(panel(f), (20 + (i % 4) * (ow + 8), y + (i // 4) * (old[0].height * K + 8)))
    y += 2 * (old[0].height * K + 8) + 16
    text(d, (20, y), 'Scale: character, our raiju (frame 3) at flight height')
    y = scale_row(out, d, 20, y + 32, W - 40, [(new[3], meta['anchor'])]) + 12
    y = his_scale_row(out, d, y, ref, info['scaleRow'], W)
    save_whole(out.crop((0, 0, W, y)), 'beasts-raiju-v2.png')
    gif(new, 'beasts-raiju-v2.gif')


def phoenix_sheet():
    info = json.load(open(os.path.join(HERE, 'beasts-ref-fire.json')))
    ref = Image.open(os.path.join(HERE, info['ref'])).convert('RGBA')
    sref = Image.open(os.path.join(HERE, 'REF-raiju-owner.jpg')).convert('RGBA')
    meta, png = staged('vfx_beasts', 'fire')
    fly, dive, attack = (sheet_frames(png, meta, a) for a in ('fly', 'dive', 'attack'))
    om, opng = staged('vfx_fire', 'beast')
    old = sheet_frames(opng, om)
    fw = meta['frameW'] * K
    W = 40 + 4 * fw + 3 * 8 + 8
    out = Image.new('RGBA', (W, 9000), SHEET)
    d = ImageDraw.Draw(out)
    y = 16
    text(d, (20, y), f"Phoenix (vfx_beasts/fire) copied from the owner's sheet: {meta['frameW']}x{meta['frameH']}, anchor {meta['anchor']}: fly 8f loop, dive 5f loop, attack 6f once, 12 fps")
    y += 40
    y = pairs(out, d, y, ref, info['fly'], info['scale'], fly, meta['anchor'], 'Fly loop: his panel (left, at the game scale, on his anchor ticks) and our frame (right), x3')
    y = keyed(out, d, y, ref, info['dive'], info['scale'], dive, meta['anchor'], 'Dive (loop): his DIVE FRAME 0 is our frame 0; frames 1-4 sway the wings and tail from it', 0, W)
    y = keyed(out, d, y, ref, info['attack'], info['scale'], attack, meta['anchor'], 'Attack (once): his ATTACK FRAME 3 is our frame 3; the fireball grows out of the beak (1-2) and flies on (4)', 3, W)
    text(d, (20, y), 'Scale: character, OLD phoenix (vfx_fire/beast), NEW phoenix (fly 0 and 7), at flight height')
    y = scale_row(out, d, 20, y + 32, W - 40, [(old[0], om['anchor']), (fly[0], meta['anchor']), (fly[7], meta['anchor'])]) + 12
    y = his_scale_row(out, d, y, sref, [20, 1030, 1000, 1470], W)
    save_whole(out.crop((0, 0, W, y)), 'beasts-phoenix-v2.png')
    gif(fly, 'beasts-phoenix-v2.gif')
    gif(dive, 'beasts-phoenix-v2-dive.gif')
    gif(attack + [attack[-1]] * 6, 'beasts-phoenix-v2-attack.gif')


def crane_sheet():
    info = json.load(open(os.path.join(HERE, 'beasts-ref-wind.json')))
    ref = Image.open(os.path.join(HERE, info['ref'])).convert('RGBA')
    meta, png = staged('vfx_beasts', 'wind')
    fly = sheet_frames(png, meta)
    fw, fh = meta['frameW'] * K, meta['frameH'] * K
    W = 40 + 4 * fw + 3 * 8 + 8
    out = Image.new('RGBA', (W, 4000), SHEET)
    d = ImageDraw.Draw(out)
    y = 16
    text(d, (20, y), f"Wind crane (vfx_beasts/wind) copied from the owner's wind sheet: {meta['frameW']}x{meta['frameH']}, anchor {meta['anchor']}, 6-frame fly loop at 12 fps")
    y += 40
    text(d, (20, y), 'His BEAST (WIND CRANE, NEWER) frames (left, at the game scale, on our anchor) and our frames 0 and 3 (right), x3')
    y += 32
    x0, y0, x1, y1 = info['panel']
    halves = {'0': [x0, y0, 516, y1], '3': [516, y0, x1, y1]}
    for col, k in enumerate(('0', '3')):
        src = {'box': halves[k], 'anchor': info['keys'][k]['anchor']}
        x = 20 + col * (2 * fw + 24)
        out.paste(his(ref, src, info['scale'], (fw, fh), meta['anchor']), (x, y))
        text(d, (x + 6, y + 4), f'his {k}', SMALL)
        out.paste(panel(fly[int(k)]), (x + fw + 8, y))
        text(d, (x + fw + 14, y + 4), f'ours {k}', SMALL)
    y += fh + 24
    text(d, (20, y), 'The whole loop: his frames are 0 and 3; 1, 2 swing his raised wings back on the way down, 4, 5 on the way up')
    y += 32
    for i, f in enumerate(fly):
        x = 20 + (i % 3) * (fw + 8)
        yy = y + (i // 3) * (fh + 8)
        out.paste(panel(f), (x, yy))
        text(d, (x + 6, yy + 4), str(i) + (' (his)' if i in (0, 3) else ''), SMALL)
    y += 2 * (fh + 8) + 16
    text(d, (20, y), 'Scale: character and the crane (frames 0 and 3) at flight height')
    y = scale_row(out, d, 20, y + 32, W - 40, [(fly[0], meta['anchor']), (fly[3], meta['anchor'])]) + 20
    save_whole(out.crop((0, 0, W, y)), 'beasts-crane-v2.png')
    gif(fly, 'beasts-crane-v2.gif')


import sys
which = sys.argv[1:] or ['raiju', 'phoenix', 'crane']
if 'raiju' in which:
    raiju_sheet()
if 'phoenix' in which:
    phoenix_sheet()
if 'crane' in which:
    crane_sheet()
print('ok')
