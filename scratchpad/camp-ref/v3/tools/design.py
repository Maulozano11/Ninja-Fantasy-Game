# The read pose's book, book hand and chin fist, designed on his lifted picture (his coords = our sprite
# frame of his figure). design.py out.png: draws them over his lift and shows his | ours-design | design alone.
import sys
import numpy as np
from PIL import Image, ImageDraw

D = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/camp-ref/v3/work/'
H = np.load(D + 'his_sprite.npy')

# his palette (cleaned from his clusters)
BOOK = {
    'o': '#1c0d0a',  # outline
    'k': '#2b130d',  # deep shadow
    'g': '#39231b',  # shadow
    'm': '#401714',  # reddish dark (right board panel)
    'n': '#532d24',  # panel
    'f': '#664234',  # frame
    'h': '#79584e',  # frame light
    'a': '#9e7668',  # lit edge
    'q': '#ae8f81',  # page shade
    'c': '#bfa696',  # page mid
    'p': '#d0ccc1',  # page
    'P': '#ebe8dd',  # page light
}
# Solen's skin ramp (o D s b l L = shades 0..5); ramp[0] mixed with ink like MaterialTable
SKIN = {'o': '#2a0f10', 'D': '#9f4c48', 's': '#d5846a', 'b': '#f3c39c', 'l': '#f4d4b3', 'L': '#f3e1cb', 'x': '#9f4c48'}


def grid(rows):
    """rows: {y: [(x, 'chars'), ...]} -> {(x, y): ch}"""
    out = {}
    for y, segs in rows.items():
        for x0, s in segs:
            for i, ch in enumerate(s):
                if ch != '.' and ch != ' ':
                    out[(x0 + i, y)] = ch
    return out


exec(open(sys.argv[2]).read())  # defines BOOK_ROWS, FIST_ROWS, HAND_ROWS (his coords)

book = grid(BOOK_ROWS)
fist = grid(FIST_ROWS)
hand = grid(HAND_ROWS)


def hexrgb(h):
    return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], float)


def paint(base, layers):
    a = base.copy()
    for g, pal in layers:
        for (x, y), ch in g.items():
            a[y, x] = hexrgb(pal[ch])
    return a


bg = np.tile(np.array([38, 42, 58.]), (256, 256, 1))
over = paint(H, [(fist, SKIN), (book, BOOK), (hand, SKIN)])
alone = paint(bg, [(fist, SKIN), (book, BOOK), (hand, SKIN)])
x0, y0, x1, y1 = 104, 150, 146, 182
k = 12


def pan(a):
    c = np.clip(a[y0:y1, x0:x1], 0, 255).astype(np.uint8)
    img = Image.fromarray(c).resize(((x1 - x0) * k, (y1 - y0) * k), Image.NEAREST)
    d = ImageDraw.Draw(img)
    for x in range(x0, x1):
        if x % 5 == 0:
            d.text(((x - x0) * k + 1, 1), str(x), fill=(255, 255, 0))
    for y in range(y0, y1):
        if y % 5 == 0:
            d.text((1, (y - y0) * k + 1), str(y), fill=(255, 255, 0))
    return img


ims = [pan(H), pan(over), pan(alone)]
out = Image.new('RGB', (sum(i.width for i in ims) + 20, ims[0].height), (0, 0, 0))
x = 0
for im in ims:
    out.paste(im, (x, 0))
    x += im.width + 10
out.save(sys.argv[1])
# 1x/3x preview of the design over his picture
s = 4
c = np.clip(over[130:200, 80:160], 0, 255).astype(np.uint8)
Image.fromarray(c).resize((80 * s, 70 * s), Image.NEAREST).save(sys.argv[1].replace('.png', '-4x.png'))
