"""Decode a vfx-beasts-ref-chakra.ts module into RGBA numpy frames; helpers for zoom views."""
import re, sys
import numpy as np
from PIL import Image

def load(path):
    src = open(path, encoding='utf-8').read()
    size = [int(v) for v in re.search(r'SIZE: \[number, number\] = \[(\d+), (\d+)\]', src).groups()]
    anchor = [int(v) for v in re.search(r'ANCHOR: \[number, number\] = \[(\d+), (\d+)\]', src).groups()]
    alph = re.search(r"ALPHABET = '(.*)';", src).group(1)
    pal_block = src.split('PALETTE: string[] = [')[1].split('];')[0]
    pal = re.findall(r"'(#[0-9a-f]{8})'", pal_block)
    pal = [tuple(int(c[i:i+2], 16) for i in (1, 3, 5, 7)) for c in pal]
    fr_block = src.split('FRAMES: Record<string, string[][]> = {')[1]
    frames = []
    for fb in fr_block.split('    [\n')[1:]:
        rows = re.findall(r"^      '(.*)',$", fb.split('    ],')[0], re.M)
        img = np.zeros((size[1], size[0], 4), np.uint8)
        for y, row in enumerate(rows):
            x = 0
            for m in re.finditer(r'(\D)(\d*)', row):
                k = alph.index(m.group(1)); n = int(m.group(2)) if m.group(2) else 1
                if k: img[y, x:x+n] = pal[k]
                x += n
        frames.append(img)
    return frames, size, anchor, pal

def on(img, bg=(0x5d, 0x6b, 0x57)):
    b = Image.new('RGBA', (img.shape[1], img.shape[0]), bg + (255,))
    b.alpha_composite(Image.fromarray(img, 'RGBA'))
    return b.convert('RGB')

def zoom(im, k):
    return im.resize((im.width * k, im.height * k), Image.NEAREST)

if __name__ == '__main__':
    fr, size, anchor, pal = load(sys.argv[1])
    print(size, anchor, len(pal), len(fr))
