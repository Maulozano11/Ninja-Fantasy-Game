"""Decode a beasts-ref TS module into numpy RGBA frames."""
import re, numpy as np
def load(path):
    s = open(path).read()
    W, H = map(int, re.search(r'SIZE: \[number, number\] = \[(\d+), (\d+)\]', s).groups())
    A = tuple(map(int, re.search(r'ANCHOR: \[number, number\] = \[(\d+), (\d+)\]', s).groups()))
    alph = re.search(r"ALPHABET = '(.*)';", s).group(1)
    pal = re.findall(r"'#([0-9a-f]{8})'", s.split('PALETTE: string[] =')[1].split('];')[0])
    pal = np.array([[int(c[i:i+2], 16) for i in (0, 2, 4, 6)] for c in pal], np.uint8)
    body = s.split('FRAMES: Record')[1]
    anims = {}
    for m in re.finditer(r'  (\w+): \[\n(.*?)\n  \],', body, re.S):
        frames = []
        for fm in re.finditer(r'    \[\n(.*?)\n    \],', m.group(2), re.S):
            rows = re.findall(r"      '(.*)',", fm.group(1))
            img = np.zeros((H, W, 4), np.uint8)
            for y, row in enumerate(rows):
                x = 0
                for t in re.finditer(r'(\D)(\d*)', row):
                    n = int(t.group(2) or 1)
                    i = alph.index(t.group(1))
                    if i:
                        img[y, x:x+n] = pal[i]
                    x += n
                assert x == W, (y, x, W)
            frames.append(img)
        anims[m.group(1)] = frames
    return anims, (W, H), A
