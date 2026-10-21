"""Review sheets for the camp poses (not part of the repo).

    python3 -I poses-camp-sheets.py <frames dir> <out prefix> <looks> [scale]

<frames dir> is what poses-render.ts wrote for the poses lean, sit, read and train. Each cell shows a
frame on a dark green ground with the pose's support drawn where the game puts it (CampScene.tsx,
from CAMP_PROPS in src/sprite/rig.ts): the stump seat under 'sit', the flat rock under 'read' and the
leaning rock behind 'lean', 18 and 32 px behind the feet (the feet anchor is 64,120).

Writes <prefix>sheet.png (each pose on every look), <prefix>strip-<pose>.png (every frame, one row per
look) and <prefix><pose>.gif (the looks side by side, looping at the pose's fps).
"""
import json
import os
import sys

from PIL import Image, ImageDraw

REPO = '/home/user/Ninja-Fantasy-Game'
CAMPSITE = os.path.join(REPO, 'src', 'assets', 'world', 'campsite')
BG = (30, 52, 36, 255)
SUPPORT = {'sit': ('seat_stump', 18), 'read': ('seat_rock', 18), 'lean': ('lean_rock', 32)}
POSES = ['lean', 'sit', 'read', 'train']
MARGIN = 40  # extra room on the left of each cell for the leaning rock
NAMES = {
    'preset_founder': 'Solen', 'companion_hana': 'Hana', 'companion_kenji': 'Kenji', 'preset_gentle': 'Shiori',
    'preset_reference_aiden': 'Aiden', 'preset_warlord': 'Raiga',
}


def safe(key):
    return ''.join(c if c.isalnum() or c in '_@=+.-' else '_' for c in key)


def support(name):
    man = json.load(open(os.path.join(CAMPSITE, 'manifest.json')))['sprites'][name]
    sheet = Image.open(os.path.join(CAMPSITE, man['file'])).convert('RGBA')
    a = list(man['anims'].values())[0]
    fw, fh = man['frameW'], man['frameH']
    return sheet.crop((0, a['row'] * fh, fw, (a['row'] + 1) * fh)), man['anchor']


def shadow(img, cx, ground, rx=24):
    px = img.load()
    for y in range(ground - 6, ground + 4):
        for x in range(int(cx - rx - 2), int(cx + rx + 3)):
            if not (0 <= x < img.width and 0 <= y < img.height):
                continue
            d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - ground + 1) / 4.5) ** 2
            if d > 1:
                continue
            t = (120 if d < 0.45 else 70) / 255
            r, g, b, _ = px[x, y]
            px[x, y] = (round(6 * t + r * (1 - t)), round(8 * t + g * (1 - t)), round(16 * t + b * (1 - t)), 255)


def cell(frames, key, pose, f):
    w = 128 + MARGIN
    img = Image.new('RGBA', (w, 128), BG)
    shadow(img, MARGIN + 64, 120)
    if pose in SUPPORT:
        spr, anc = support(SUPPORT[pose][0])
        x = MARGIN + 64 - SUPPORT[pose][1] - anc[0]
        img.alpha_composite(spr, (x, 120 - anc[1]))
    fr = Image.open(os.path.join(frames, safe(key), f'{pose}_{f}.png')).convert('RGBA')
    img.alpha_composite(fr, (MARGIN, 0))
    return img


def main():
    frames, prefix, looks = sys.argv[1], sys.argv[2], sys.argv[3].split(',')
    scale = int(sys.argv[4]) if len(sys.argv) > 4 else 2
    meta = json.load(open(os.path.join(frames, 'meta.json')))
    up = lambda im: im.resize((im.width * scale, im.height * scale), Image.NEAREST)
    label_h = 16
    # The sheet: one row per look, one column per pose (a telling frame of each).
    show = {'lean': 0, 'sit': 0, 'read': 10, 'train': 2}
    cw, ch = (128 + MARGIN) * scale, 128 * scale
    sheet = Image.new('RGBA', (len(POSES) * cw, label_h + len(looks) * ch), (16, 24, 18, 255))
    d = ImageDraw.Draw(sheet)
    for c, pose in enumerate(POSES):
        d.text((c * cw + 6, 2), f'{pose}  (frame {show[pose]})', fill=(196, 214, 190, 255))
    for r, key in enumerate(looks):
        for c, pose in enumerate(POSES):
            sheet.paste(up(cell(frames, key, pose, show[pose])), (c * cw, label_h + r * ch))
        d.text((4, label_h + r * ch + 4), NAMES.get(key.split('@')[0].split('+')[0], key), fill=(196, 214, 190, 255))
    sheet.save(prefix + 'sheet.png')
    # Strips and GIFs per pose.
    for pose in POSES:
        n = len(meta[looks[0]][pose]['frames'])
        fps = meta[looks[0]][pose]['fps']
        strip = Image.new('RGBA', (n * cw, len(looks) * ch), BG)
        for r, key in enumerate(looks):
            for f in range(n):
                strip.paste(up(cell(frames, key, pose, f)), (f * cw, r * ch))
        strip.save(prefix + f'strip-{pose}.png')
        gif = []
        for f in range(n):
            row = Image.new('RGBA', (len(looks) * cw, ch), BG)
            for i, key in enumerate(looks):
                row.paste(up(cell(frames, key, pose, f)), (i * cw, 0))
            gif.append(row.convert('RGB').quantize(colors=255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE))
        gif[0].save(prefix + f'{pose}.gif', save_all=True, append_images=gif[1:], duration=round(1000 / fps), loop=0, disposal=1)
    print('wrote', prefix + 'sheet.png', 'and the strips and gifs')


main()
