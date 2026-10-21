"""Smooth zoomed view of a box of his sheet with a 5 px grid (labels every 10) and optional polygons."""
import sys, json
from PIL import Image, ImageDraw
im = Image.open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/REF-genjutsu-set-owner.jpg').convert('RGB')
def view(out, box, k=6, polys=(), smooth=True, grid=True):
    c = im.crop(box).resize(((box[2]-box[0])*k, (box[3]-box[1])*k), Image.LANCZOS if smooth else Image.NEAREST)
    d = ImageDraw.Draw(c, 'RGBA')
    if grid:
        for gx in range(box[0] - box[0] % 5 + 5, box[2], 5):
            X = (gx-box[0])*k + k//2
            d.line([(X,0),(X,c.height)], fill=(0,255,0,70) if gx % 10 == 0 else (0,255,0,28))
            if gx % 10 == 0: d.text((X+2,2), str(gx), fill=(0,255,0,255))
        for gy in range(box[1] - box[1] % 5 + 5, box[3], 5):
            Y = (gy-box[1])*k + k//2
            d.line([(0,Y),(c.width,Y)], fill=(0,255,0,70) if gy % 10 == 0 else (0,255,0,28))
            if gy % 10 == 0: d.text((2,Y+2), str(gy), fill=(0,255,0,255))
    cols = [(255,60,60,255),(60,200,255,255),(255,220,0,255),(255,120,255,255),(120,255,120,255),(255,160,60,255),(200,200,255,255)]
    for i, p in enumerate(polys):
        pts = [((x-box[0])*k + k//2, (y-box[1])*k + k//2) for x, y in p]
        d.line(pts + [pts[0]], fill=cols[i % len(cols)], width=2)
    c.save(out)
if __name__ == '__main__':
    box = tuple(int(v) for v in sys.argv[2:6])
    polys = json.load(open(sys.argv[6])) if len(sys.argv) > 6 else []
    k = int(sys.argv[7]) if len(sys.argv) > 7 else 6
    view(sys.argv[1], box, k, [p for p in polys.values()] if isinstance(polys, dict) else polys)
