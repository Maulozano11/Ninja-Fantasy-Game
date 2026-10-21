"""Review sheet and GIF for the fire-set phoenix (staging/vfx_beasts_phoenix/fire).

    python3 -I beasts-phoenix-v3.py     (paths relative to this file)

His BEAST panel (from REF-fire-set-owner.jpg) at the game scale on our anchor next to our frame 0,
every frame of every animation, and the phoenix next to our character for scale. Files are written
to a temp name and renamed.
"""
import json
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
K = 3
BG = (0x5D, 0x6B, 0x57, 255)
SHEET = (0x2A, 0x2E, 0x36, 255)
GROUND = (0x4A, 0x5A, 0x3C, 255)
INK = (0xE8, 0xE0, 0xC0, 255)
FONT = ImageFont.load_default(size=22)
SMALL = ImageFont.load_default(size=18)


def save_whole(img, name, **kw):
    path = os.path.join(HERE, name)
    tmp = path + '.part'
    img.save(tmp, **kw)
    os.replace(tmp, path)


meta = json.load(open(os.path.join(HERE, 'staging', 'vfx_beasts_phoenix', 'manifest.json')))['sprites']['fire']
sheet = Image.open(os.path.join(HERE, 'staging', 'vfx_beasts_phoenix', meta['file'])).convert('RGBA')
fw, fh = meta['frameW'], meta['frameH']
anims = {k: [sheet.crop((i * fw, a['row'] * fh, (i + 1) * fw, (a['row'] + 1) * fh)) for i in range(a['frames'])] for k, a in meta['anims'].items()}
info = json.load(open(os.path.join(HERE, 'beasts-ref-fire2.json')))
ref = Image.open(os.path.join(HERE, 'REF-fire-set-owner.jpg')).convert('RGBA')


def panel(f, bg=BG):
    c = Image.new('RGBA', f.size, bg)
    c.alpha_composite(f)
    return c.resize((f.width * K, f.height * K), Image.NEAREST)


def his_panel(cell):
    """His BEAST panel at the game scale (x K), placed so his anchor sits on ours."""
    x0, y0, x1, y1 = info['panel']
    s = info['scale'] * K
    crop = ref.crop((x0, y0, x1, y1))
    crop = crop.resize((round((x1 - x0) * s), round((y1 - y0) * s)), Image.LANCZOS)
    c = Image.new('RGBA', cell, (0x23, 0x21, 0x2C, 255))
    ax, ay = info['anchor'][0] - x0, info['anchor'][1] - y0
    c.paste(crop, (round(meta['anchor'][0] * K - ax * s), round(meta['anchor'][1] * K - ay * s)))
    return c


cell = (fw * K, fh * K)
cols = 4
W = 40 + cols * (cell[0] + 8)
out = Image.new('RGBA', (W, 5000), SHEET)
d = ImageDraw.Draw(out)
y = 16
fps = ', '.join(f"{k} {len(v)}@{meta['anims'][k]['fps']}{'' if meta['anims'][k]['loop'] else ' once'}" for k, v in anims.items())
d.text((20, y), f"Phoenix from the owner's FIRE SET BEAST panel (vfx_beasts_phoenix / fire): {fw}x{fh}, anchor {meta['anchor']}, {fps}", font=FONT, fill=INK)
y += 40
d.text((20, y), 'His BEAST panel (left, at the game scale, on our anchor) and our fly frame 0 (right), x3', font=FONT, fill=INK)
y += 32
out.paste(his_panel(cell), (20, y))
d.text((26, y + 4), 'his panel', font=SMALL, fill=INK)
out.paste(panel(anims['fly'][0]), (20 + cell[0] + 8, y))
d.text((26 + cell[0] + 8, y + 4), 'ours, fly 0', font=SMALL, fill=INK)
y += cell[1] + 24
notes = {
    'fly': 'fly: his picture is frame 0; both wings swing back and down (the far one behind the body) and come back up; the tail sways, embers drift',
    'dive': 'dive (loop): the whole bird tilted nose down, both wings swept back and fluttering, the tail swaying',
    'attack': 'attack (once): draws back, flares the wings, lunges with the talons swung forward, settles back to his picture',
}
for k, frames in anims.items():
    d.text((20, y), notes[k], font=FONT, fill=INK)
    y += 32
    for i, f in enumerate(frames):
        x = 20 + (i % cols) * (cell[0] + 8)
        yy = y + (i // cols) * (cell[1] + 8)
        out.paste(panel(f), (x, yy))
        d.text((x + 6, yy + 4), str(i), font=SMALL, fill=INK)
    y += ((len(frames) + cols - 1) // cols) * (cell[1] + 8) + 16
# Scale: the character on the ground, the phoenix at flight height (anchor 64 px above the feet).
d.text((20, y), 'Scale: our character and the phoenix (fly 0 and 4) at flight height', font=FONT, fill=INK)
y += 32
char = Image.open(os.path.join(HERE, 'beasts-character.png')).convert('RGBA')
feet, lift = (64, 120), 64
above = max(feet[1] + 6, lift + meta['anchor'][1] + 6)
h = (above + 14) * K
out.paste(Image.new('RGBA', (W - 40, h), BG), (20, y))
gy = y + above * K
out.paste(Image.new('RGBA', (W - 40, 14 * K), GROUND), (20, gy))
out.alpha_composite(char.resize((char.width * K, char.height * K), Image.NEAREST), (20 + 8 * K, gy - feet[1] * K))
x = 20 + (8 + 128 + 10) * K
for f in (anims['fly'][0], anims['fly'][4]):
    out.alpha_composite(f.resize((fw * K, fh * K), Image.NEAREST), (x, gy - (lift + meta['anchor'][1]) * K))
    x += (fw + 12) * K
y += h + 20
save_whole(out.crop((0, 0, W, y)), 'beasts-phoenix-v3.png', format='PNG')

seq = []
for f in anims['fly']:
    c = Image.new('RGBA', f.size, BG)
    c.alpha_composite(f)
    seq.append(c.resize((fw * K, fh * K), Image.NEAREST).convert('RGB'))
pal = seq[0].quantize(colors=255, method=Image.Quantize.MEDIANCUT)
q = [s.quantize(palette=pal, dither=Image.Dither.NONE) for s in seq]
dur = round(1000 / meta['anims']['fly']['fps'])
save_whole(q[0], 'beasts-phoenix-v3.gif', format='GIF', save_all=True, append_images=q[1:], duration=[dur] * len(q), loop=0, disposal=1, optimize=False)
print('ok', out.size)
