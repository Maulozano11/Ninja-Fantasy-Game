import sys
from PIL import Image, ImageDraw
AX = {0: [(650, 1766), (620, 1768), (590, 1770), (565, 1770), (547, 1762), (538, 1748), (537, 1732), (541, 1718), (550, 1707), (562, 1699), (575, 1693), (585, 1690)],
      5: [(1340, 1765), (1300, 1790), (1260, 1814), (1222, 1836), (1186, 1860)]}
OFF = {0: (372, 1540), 5: (1028, 1540)}
for k in (0, 5):
    im = Image.open(f'dbg0/drake-pieces-{k}.png').convert('RGB')
    ox, oy = OFF[k]
    box = (100, 120, 360, 360) if k == 0 else (100, 160, 360, 400)
    d = ImageDraw.Draw(im)
    pts = [(x - ox, y - oy) for x, y in AX[k]]
    d.line(pts, fill=(255, 255, 255), width=1)
    for p in pts:
        d.point(p, fill=(255, 0, 0))
    im.crop(box).resize(((box[2] - box[0]) * 3, (box[3] - box[1]) * 3), Image.NEAREST).save(f'x/axis-{k}.png')
