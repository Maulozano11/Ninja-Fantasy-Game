# Preview pixel templates: python3 tpl.py out.png file1 [file2 ...]; each file holds quoted rows.
import re
import sys
from PIL import Image, ImageDraw

C = {
    'o': (34, 16, 12), 'k': (74, 36, 24), 'd': (74, 36, 24), 'm': (101, 50, 34), 'c': (101, 50, 34),
    'C': (122, 63, 44), 'b': (154, 92, 62), 'q': (196, 182, 150), 'p': (221, 210, 178), 'P': (240, 232, 206),
    'g': (232, 192, 80), 'G': (138, 106, 28), 'x': (90, 70, 60), 'e': (180, 160, 120),
}
S = 14
imgs = []
for f in sys.argv[2:]:
    rows = re.findall(r"'([^']*)'", open(f).read())
    w = max(len(r) for r in rows)
    im = Image.new('RGB', (w * S + 2, len(rows) * S + 2), (38, 42, 58))
    d = ImageDraw.Draw(im)
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch in C:
                d.rectangle([x * S + 1, y * S + 1, x * S + S, y * S + S], fill=C[ch])
    imgs.append(im)
W = sum(i.width for i in imgs) + 20 * len(imgs)
H = max(i.height for i in imgs)
out = Image.new('RGB', (W, H), (20, 20, 28))
x = 0
for i in imgs:
    out.paste(i, (x, 0))
    x += i.width + 20
out.save(sys.argv[1])
