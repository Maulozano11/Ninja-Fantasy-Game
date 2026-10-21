"""The four patch files as tools/refs/heroine_paint.py's PAINT (each block cropped to what it paints)."""
import importlib.util
import os
import sys

W = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('study', 'tools/refs/heroine-study.py')
S = importlib.util.module_from_spec(spec)
spec.loader.exec_module(S)


def blocks(path):
    out, cur = [], None
    for line in open(path):
        line = line.rstrip('\n')
        if line.startswith('@'):
            name, x, y = line[1:].split()
            cur = [None if name == 'None' else name, int(x), int(y), []]
            out.append(cur)
        elif line.strip():
            cur[3].append(line)
    res = []
    for name, x, y, rows in out:
        ys = [i for i, r in enumerate(rows) if r.strip('.')]
        if not ys:
            continue
        xs = [j for r in rows for j, ch in enumerate(r) if ch != '.']
        a, b = min(xs), max(xs) + 1
        rows = [r[a:b] for r in rows[ys[0]:ys[-1] + 1]]
        res.append((name, x + a, y + ys[0], rows))
    return res


HEAD = '''"""The hand-drawn part of the reduced references (tools/refs/heroine-study.py paints it).

Drawn by hand at our scale after the owner's four heroines, in each picture's own colours: what the
reduction of her pixels loses at a third of her size or her picture hides. For each picture, blocks of
(part, x0, y0, rows) in our 256 x 256 frame, painted in order (back to front) over the reduced figure;
each character one of KEY[which] (her colours), '.' keeps the pixel, '_' clears it. A block with a part
name makes its pixels that part's (heroine_ref.PART_NAMES); with None they stay the part they were.

What is drawn: everything below her head (the reduced head and long hair are kept, with her eyes,
brows and mouth drawn on): her torso and its trims, buckles, belts and pouches; her arms, sleeves,
bracers and gloves; her hands (the near one round the grip); her skirt with its pleats, stripes and
hem; her coat's tails or her skirt's panels and the lining behind her legs (hidden in her picture
behind her legs: continued from what shows); her legs with their cuffs, knee cops, leg bands and
shoes, each sole on ours; her weapon (the blade at her own angle, the hilt, Saya's second blade and
scabbard, Aurelia's staff) and its light. Elise's long hair is redrawn too.
"""

'''


def main():
    out = [HEAD, '# The colours of hers the hand-drawn PAINT uses, one character each.', 'KEY = {']
    for w, keys in S.KEY.items():
        out.append(f"    '{w}': {{")
        items = list(keys.items())
        for i in range(0, len(items), 6):
            out.append('        ' + ' '.join(f"'{c}': '{h}'," for c, h in items[i:i + 6]))
        out.append('    },')
    out.append('}')
    out.append('')
    out.append('PAINT = {')
    for w in ('lyra', 'elise', 'saya', 'aurelia'):
        out.append(f"    '{w}': [")
        for name, x, y, rows in blocks(os.path.join(W, f'{w}.patch')):
            out.append(f"        ({name!r}, {x}, {y}, [")
            for r in rows:
                out.append(f"            '{r}',")
            out.append('        ]),')
        out.append('    ],')
    out.append('}')
    open(sys.argv[1], 'w').write('\n'.join(out) + '\n')


main()
