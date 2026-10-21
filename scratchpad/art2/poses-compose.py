"""Layout for the pose review images (not part of the repo).

  python3 -I poses-compose.py sheet <frames> <out.png> <looks> <poses> [scale] [crop x0,y0,x1,y1] [cols]
  python3 -I poses-compose.py gif   <frames> <out.gif> <looks> <pose> [scale] [crop]
  python3 -I poses-compose.py still <frames> <out.png> <looks> <poses> [scale] [crop]

<frames> is the output folder of poses-render.ts (PNG frames + meta.json). Every cell gets the
game's ground shadow (ShinobiSpriteCanvas.drawShadow) under the pelvis, on a dark green field.
"""
import json
import os
import sys

from PIL import Image, ImageDraw

BG = (30, 52, 36, 255)
GRID_LINE = (44, 72, 52, 255)
LABEL = (196, 214, 190, 255)


def safe(key):
    return ''.join(c if c.isalnum() or c in '_@=+.-' else '_' for c in key)


def shadow(img, cx, ground, rx=24):
    """The in-game drop shadow: a soft ellipse on the ground line (fine pixels); wider under a lying body."""
    px = img.load()
    cy = ground - 1
    for y in range(ground - 5, ground + 5):
        for x in range(int(cx - rx - 2), int(cx + rx + 3)):
            if not (0 <= x < img.width and 0 <= y < img.height):
                continue
            dx = (x + 0.5 - cx) / rx
            dy = (y + 0.5 - cy) / 4.5
            d = dx * dx + dy * dy
            if d > 1:
                continue
            a = 120 if d < 0.45 else 70
            r, g, b, _ = px[x, y]
            t = a / 255
            px[x, y] = (round(6 * t + r * (1 - t)), round(8 * t + g * (1 - t)), round(16 * t + b * (1 - t)), 255)


def cell(frames, meta, key, pose, f, scale, crop, show_ground=True):
    fr = meta[key][pose]['frames'][f]
    base = Image.new('RGBA', (128, 128), BG)
    if show_ground:
        d = ImageDraw.Draw(base)
        d.line([(0, fr['ground'] + 4), (127, fr['ground'] + 4)], fill=GRID_LINE)
        shadow(base, fr['pelvisX'], fr['ground'], 44 if fr.get('lying') else 24)
    spr = Image.open(os.path.join(frames, safe(key), f'{pose}_{f}.png')).convert('RGBA')
    base.alpha_composite(spr)
    if crop:
        base = base.crop(crop)
    return base.resize((base.width * scale, base.height * scale), Image.NEAREST)


def parse_crop(s):
    if not s or s == '-':
        return None
    return tuple(int(v) for v in s.split(','))


def main():
    mode, frames, out = sys.argv[1], sys.argv[2], sys.argv[3]
    looks = sys.argv[4].split(',')
    poses = sys.argv[5].split(',')
    scale = int(sys.argv[6]) if len(sys.argv) > 6 else 3
    crop = parse_crop(sys.argv[7]) if len(sys.argv) > 7 else None
    cols = int(sys.argv[8]) if len(sys.argv) > 8 else 8
    meta = json.load(open(os.path.join(frames, 'meta.json')))
    gap = 4
    label_h = 14

    if mode == 'sheet':
        rows = []
        for key in looks:
            for pose in poses:
                n = len(meta[key][pose]['frames'])
                cells = [cell(frames, meta, key, pose, f, scale, crop) for f in range(n)]
                for i in range(0, n, cols):
                    rows.append((f'{key}  {pose}  {i}-{min(n, i + cols) - 1}', cells[i:i + cols]))
        cw, ch = rows[0][1][0].size
        ncol = max(len(r[1]) for r in rows)
        W = ncol * (cw + gap) + gap
        H = len(rows) * (ch + gap + label_h) + gap
        img = Image.new('RGBA', (W, H), (16, 24, 18, 255))
        d = ImageDraw.Draw(img)
        y = gap
        for label, cs in rows:
            d.text((gap, y), label, fill=LABEL)
            y += label_h
            for i, c in enumerate(cs):
                img.paste(c, (gap + i * (cw + gap), y))
            y += ch + gap
        img.save(out)
    elif mode == 'gif':
        pose = poses[0]
        n = len(meta[looks[0]][pose]['frames'])
        fps = meta[looks[0]][pose]['fps']
        imgs = []
        for f in range(n):
            cs = [cell(frames, meta, key, pose, f % len(meta[key][pose]['frames']), scale, crop) for key in looks]
            cw, ch = cs[0].size
            img = Image.new('RGBA', (len(cs) * cw, ch), BG)
            for i, c in enumerate(cs):
                img.paste(c, (i * cw, 0))
            imgs.append(img.convert('RGB').quantize(colors=255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE))
        imgs[0].save(out, save_all=True, append_images=imgs[1:], duration=round(1000 / fps), loop=0, disposal=1, optimize=False)
    elif mode == 'still':
        rows = []
        for pose in poses:
            rows.append([cell(frames, meta, key, pose, 0, scale, crop) for key in looks])
        cw, ch = rows[0][0].size
        W = len(looks) * cw
        H = len(rows) * ch
        img = Image.new('RGBA', (W, H), BG)
        for r, cs in enumerate(rows):
            for i, c in enumerate(cs):
                img.paste(c, (i * cw, r * ch))
        img.convert('RGB').save(out)
    else:
        raise SystemExit(f'unknown mode {mode}')


main()
