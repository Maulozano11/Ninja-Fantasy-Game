import json
from PIL import Image, ImageChops
plan = json.load(open('work/plan.json'))
CELL = (30, 33, 39, 255); S = 2
def load(p): return Image.open(p).convert('RGBA')
def bbox_union(imgs, pad):
    box = None
    for im in imgs:
        b = im.getchannel('A').getbbox()
        if not b: continue
        box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
    w, h = imgs[0].size
    return (max(0, box[0] - pad), max(0, box[1] - pad), min(w, box[2] + pad), min(h, box[3] + pad))
up = lambda im: im.resize((im.width * S, im.height * S), Image.NEAREST)
for g in plan['gifs']:
    gif = Image.open(g['file'])
    parts = [(p, [load(f) for f in p['orig']['files']]) for p in g['parts']]
    tparts = [[load(f) for f in p['tinted']['files']] for p in g['parts']]
    boxes = [bbox_union(o + t, 4) for (_, o), t in zip(parts, tparts)]
    cw = max((b[2] - b[0]) * S for b in boxes); chh = max((b[3] - b[1]) * S for b in boxes)
    gap, head = 20, 64
    k = 0; worst = 0; tot = 0; badpx = 0
    for ((p, o), b) in zip(parts, boxes):
        for fo in o:
            gif.seek(k); fr = gif.convert('RGB'); k += 1
            c = up(fo.crop(b)); x = gap
            px, py = x + (cw - c.width) // 2, head + (chh - c.height) // 2
            exp = Image.new('RGBA', c.size, CELL); exp.alpha_composite(c)
            d = ImageChops.difference(exp.convert('RGB'), fr.crop((px, py, px + c.width, py + c.height)))
            px_bad = sum(1 for v in d.getdata() if max(v) > 0); badpx += px_bad; tot += c.width * c.height
            worst = max(worst, max(max(v) for v in d.getdata()))
    print(g['file'], 'his half: pixels changed by GIF palette', badpx, 'of', tot, f'({100*badpx/tot:.1f}%)', 'max channel error', worst)
