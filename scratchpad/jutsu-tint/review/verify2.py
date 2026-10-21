import json
from PIL import Image
plan = json.load(open('work/plan.json'))
BG = (21, 23, 27, 255); CELL = (30, 33, 39, 255); S = 2
def load(p): return Image.open(p).convert('RGBA')
def bbox_union(imgs, pad=3):
    box = None
    for im in imgs:
        b = im.getchannel('A').getbbox()
        if not b: continue
        box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
    w, h = imgs[0].size
    return (max(0, box[0] - pad), max(0, box[1] - pad), min(w, box[2] + pad), min(h, box[3] + pad))
up = lambda im, k=S: im.resize((im.width * k, im.height * k), Image.NEAREST)
for m in plan['muestras']:
    sheet = Image.open(m['file']).convert('RGB')
    rows, cols = m['rows'], m['cols']
    imgs = [{rid: load(c['cells'][rid]) for rid, _ in rows} for c in cols]
    boxes = [bbox_union(list(ci.values())) for ci in imgs]
    cw = [max(190, (b[2] - b[0]) * S) for b in boxes]; ch = [(b[3] - b[1]) * S for b in boxes]
    gap, labw, head = 14, 360, 200; rowh = max(ch) + 16
    for ri, (rid, _) in enumerate(rows):
        y = head + ri * (rowh + gap); x = labw + gap
        for i, c in enumerate(cols):
            im = up(imgs[i]['orig' if rid == 'orig' else rid].crop(boxes[i]))
            px, py = x + (cw[i] - im.width) // 2, y + (rowh - im.height) // 2
            exp = Image.new('RGBA', im.size, CELL); exp.alpha_composite(im)
            got = sheet.crop((px, py, px + im.width, py + im.height))
            # the '= tu dibujo' tag covers the top-left corner of natural cells: skip that strip
            e, g = exp.convert('RGB'), got
            if rid in c['natural']:
                top = max(0, (y + 31) - py)
                e, g = e.crop((0, top, e.width, e.height)), g.crop((0, top, g.width, g.height))
            if rid == 'orig' or rid in c['natural']:
                same = e.tobytes() == g.tobytes()
                if not same or rid != 'orig':
                    print(m['file'], rid, c['label'], 'IDENTICAL' if same else 'DIFFERS')
            x += cw[i] + gap
    print(m['file'], 'orig row checked')

# where does the blue Rayo cell differ?
from PIL import ImageChops
m = [m for m in plan['muestras'] if m['file'] == 'muestra-rayo.png'][0]
sheet = Image.open(m['file']).convert('RGB')
rows, cols = m['rows'], m['cols']
imgs = [{rid: load(c['cells'][rid]) for rid, _ in rows} for c in cols]
boxes = [bbox_union(list(ci.values())) for ci in imgs]
cw = [max(190, (b[2] - b[0]) * S) for b in boxes]; ch = [(b[3] - b[1]) * S for b in boxes]
gap, labw, head = 14, 360, 200; rowh = max(ch) + 16
ri = [r for r, _ in rows].index('blue'); y = head + ri * (rowh + gap)
x = labw + gap + cw[0] + gap + cw[1] + gap
im = up(imgs[2]['blue'].crop(boxes[2])); px, py = x + (cw[2] - im.width) // 2, y + (rowh - im.height) // 2
exp = Image.new('RGBA', im.size, CELL); exp.alpha_composite(im)
d = ImageChops.difference(exp.convert('RGB'), sheet.crop((px, py, px + im.width, py + im.height)))
print('diff bbox', d.getbbox(), 'cell origin', px, py, 'tag box rel', x - px, y + 4 - py, 'to', y + 30 - py)
