import sys, json
from PIL import Image, ImageDraw
R = sys.argv[1]
tiles = []
for s in ['8', '9', '10', '11']:
    crops = json.load(open(f'{R}/stage/s{s}/ref/crops.json'))
    sheet = Image.open(f'{R}/../../icons-review/docs/reference/icons-owner-reference-{s}.jpg').convert('RGB')
    for jid, ic in crops['icons'].items():
        sb = ic['sheetBox']; ss = ic['sheetSlot']
        im = sheet.crop((ss[0] - 4, ss[1] - 4, ss[2] + 4, ss[3] + 4))
        ox, oy = ss[0] - 4, ss[1] - 4
        # zoom corners: TL and BR, 60x60 sheet px each at 5x
        for (cx, cy, tag) in ((sb[0], sb[1], 'TL'), (sb[2], sb[3], 'BR')):
            c = sheet.crop((cx - 30, cy - 30, cx + 30, cy + 30)).resize((300, 300), Image.NEAREST)
            d = ImageDraw.Draw(c)
            # window edge line
            if tag == 'TL':
                d.line([(150, 150), (300, 150)], fill=(0, 255, 0)); d.line([(150, 150), (150, 300)], fill=(0, 255, 0))
            else:
                d.line([(0, 150), (150, 150)], fill=(0, 255, 0)); d.line([(150, 0), (150, 150)], fill=(0, 255, 0))
            tiles.append(c)
W = 6
out = Image.new('RGB', (W * 304, ((len(tiles) + W - 1) // W) * 304), (255, 255, 255))
for i, t in enumerate(tiles):
    out.paste(t, ((i % W) * 304, (i // W) * 304))
out.save(f'{R}/corners.png')
print(len(tiles))
