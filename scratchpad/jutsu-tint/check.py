# Checks, on its own, that every "Tu dibujo" picture in the sample is his drawing pixel for pixel:
# each one is cut again from his sheet in src/assets/world (not from make.mts's frames), scaled the
# same way, laid on the same cell colour, and compared with the saved PNG or GIF frame.
#   python3 -I check.py <worktree root>
import json, os, re, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = sys.argv[1]
W = os.path.join(ROOT, 'src/assets/world')
CELL = (30, 33, 39, 255)
BG = (21, 23, 27, 255)
placed = json.load(open(os.path.join(HERE, 'work/placed.json')))
sheets, man = {}, {}
bad = 0
counts = {}
gifs = {}
for p in placed:
    m = re.match(r'(vfx_\w+)\.(\w+)\.(\w+)\.(\d+)\.orig\.png$', os.path.basename(p['src']))
    g, s, anim, f = m.group(1), m.group(2), m.group(3), int(m.group(4))
    if g not in man:
        man[g] = json.load(open(os.path.join(W, g, 'manifest.json')))['sprites']
    sp = man[g][s]
    key = (g, s)
    if key not in sheets:
        sheets[key] = Image.open(os.path.join(W, g, sp['file'])).convert('RGBA')
    fw, fh, row = sp['frameW'], sp['frameH'], sp['anims'][anim]['row']
    fr = sheets[key].crop((f * fw, row * fh, f * fw + fw, row * fh + fh)).crop(tuple(p['box']))
    fr = fr.resize((fr.width * p['k'], fr.height * p['k']), Image.NEAREST)
    exp = Image.new('RGBA', fr.size, CELL)
    exp.alpha_composite(fr)
    out = p['out']
    if out.endswith('.gif'):
        if out not in gifs:
            im = Image.open(os.path.join(HERE, out))
            gifs[out] = []
            for i in range(im.n_frames):
                im.seek(i)
                gifs[out].append(im.convert('RGB').copy())
        got = gifs[out][p['frame']]
    else:
        got = Image.open(os.path.join(HERE, out)).convert('RGB')
    x, y = p['at']
    a = np.asarray(exp.convert('RGB'))
    b = np.asarray(got.crop((x, y, x + fr.width, y + fr.height)))
    diff = int((a != b).any(axis=2).sum())
    counts[out] = counts.get(out, 0) + 1
    if diff:
        bad += 1
        print('DIFFERS', out, p.get('frame', ''), os.path.basename(p['src']), diff, 'px')
for out, n in sorted(counts.items()):
    print(out, n, 'of his pictures checked')
print('all exact' if not bad else f'{bad} differ')
