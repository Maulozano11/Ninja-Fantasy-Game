# Contact sheet of the rows the 12 mockups use (one row of frames per sheet), for checking.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vfxlib import *
want = [('vfx_chakra','breath','fly'),('vfx_chakra','slash','fly'),('vfx_chakra','stream','fly'),('vfx_chakra','stream_head','fly'),
        ('vfx_chakra','hit','hit'),('vfx_chakra','blast','blast'),('vfx_fire','slash','fly'),('vfx_earth','multi','fly'),('vfx_earth','multi_hit','hit'),
        ('vfx_lightning','breath','fly'),('vfx_lightning','bolt','fly'),('vfx_wind','slash','fly'),('vfx_wind','hit','hit'),
        ('vfx_water','stream','fly'),('vfx_water','stream_head','fly'),('vfx_beasts','fire','fly'),('vfx_beasts','fire','dive'),('vfx_beasts','fire','attack'),
        ('vfx_beasts','genjutsu','summon'),('vfx_beasts','genjutsu','fly'),('vfx_beasts','water','fly'),('vfx_earth','blast','blast'),('vfx_water','blast','blast'),('vfx_wind','blast','blast'),('vfx_lightning','hit','hit')]
rows = []
for g, n, a in want:
    s = sheet(g, n)
    an = s.anim(a)
    k = 1
    fr = [s.frame(a, i) for i in range(an['frames'])]
    fr = fr[:16]
    w = sum(f.width + 4 for f in fr) + 220
    h = max(f.height for f in fr) + 4
    im = Image.new('RGB', (w, h), (60, 90, 60))
    d = ImageDraw.Draw(im)
    d.text((4, 4), f'{g[4:]}/{n}/{a}', font=font(14, True), fill=(255, 255, 255))
    x = 220
    for f in fr:
        im.paste(f, (x, 2), f)
        x += f.width + 4
    rows.append(im)
W = max(r.width for r in rows)
H = sum(r.height + 4 for r in rows)
out = Image.new('RGB', (W, H), (20, 20, 20))
y = 0
for r in rows:
    out.paste(r, (0, y)); y += r.height + 4
out.save(HERE + '/look/sheets.png')
print(out.size)
