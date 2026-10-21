"""Our reduced Scarlet beside our Aiden render and his picture (cape-free) at 1x, 3x and 5x."""
import os, sys
import numpy as np
from PIL import Image

D = os.path.dirname(os.path.abspath(__file__))
ST = os.path.join(os.path.dirname(D), 'study')
red = Image.open(os.path.join(ST, 'reduced@1.png')).convert('RGBA')
box = (88, 116, 168, 224)
aiden = Image.open(os.path.join(D, 'aiden-idle.png')).convert('RGBA').crop(box)
bg = (236, 236, 240, 255)


def on(im):
    b = Image.new('RGBA', im.size, bg)
    b.alpha_composite(im)
    return b.convert('RGB')


out = Image.new('RGB', (80 * 2 + 10 + 80 * 6 + 10 + 80 * 10 + 10, 108 * 5), (255, 255, 255))
x = 0
for k in (1, 3, 5):
    for im in (red, aiden):
        o = on(im).resize((80 * k, 108 * k), Image.NEAREST)
        out.paste(o, (x, 0))
        x += 80 * k
    x += 10
out = out.crop((0, 0, x, 108 * 5))
out.save(os.path.join(D, 'lineup.png'))
