"""Decode the crow data module (palette + RLE rows) into RGBA numpy frames."""
import re, sys
import numpy as np

def load(path):
    src = open(path, encoding='utf-8').read()
    W, H = map(int, re.search(r'SIZE: \[number, number\] = \[(\d+), (\d+)\]', src).groups())
    anchor = tuple(map(int, re.search(r'ANCHOR: \[number, number\] = \[(\d+), (\d+)\]', src).groups()))
    alph = re.search(r"ALPHABET = '(.*)';", src).group(1)
    pal_block = src[src.index('PALETTE: string[] = ['):src.index('];', src.index('PALETTE: string'))]
    pal = re.findall(r"'#([0-9a-f]{8})'", pal_block)
    pal = [tuple(int(c[i:i + 2], 16) for i in (0, 2, 4, 6)) for c in pal]
    frames = {}
    body = src[src.index('FRAMES: Record'):]
    for m in re.finditer(r'  (\w+): \[\n((?:    \[\n(?:      \'.*\',\n)+    \],\n)+)  \],', body):
        anim = m.group(1)
        fr = []
        for fm in re.finditer(r'    \[\n((?:      \'.*\',\n)+)    \],', m.group(2)):
            rows = re.findall(r"      '(.*)',", fm.group(1))
            img = np.zeros((H, W, 4), np.uint8)
            for y, row in enumerate(rows):
                x = 0
                for t in re.finditer(r'(\D)(\d*)', row):
                    i = alph.index(t.group(1)); n = int(t.group(2) or 1)
                    if i > 0:
                        img[y, x:x + n] = pal[i]
                    x += n
                assert x == W
            fr.append(img)
        frames[anim] = fr
    return (W, H), anchor, frames
