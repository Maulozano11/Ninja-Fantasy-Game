# Independent check: his sheet cut with Pillow vs the 'orig' frames, and vs the Original cells in the sheets.
import json, os, re, glob
from PIL import Image, ImageChops
ROOT = '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_e42ad7ec-457-2'
plan = json.load(open('work/plan.json'))
man = {}
def spec(g, n):
    if g not in man: man[g] = json.load(open(f'{ROOT}/src/assets/world/{g}/manifest.json'))['sprites']
    return man[g][n]
def cut(g, n, anim, f):
    s = spec(g, n); sh = Image.open(f'{ROOT}/src/assets/world/{g}/{s["file"]}').convert('RGBA')
    r = s['anims'][anim]['row']; w, h = s['frameW'], s['frameH']
    return sh.crop((f * w, r * h, f * w + w, r * h + h))
bad = 0; n = 0
for p in sorted(glob.glob('work/frames/vfx_*.png')):
    b = os.path.basename(p)[:-4].split('.')
    g, name, anim, f, col = b[0], b[1], b[2], int(b[3]), b[4]
    if col != 'orig': continue
    a = cut(g, name, anim, f); o = Image.open(p).convert('RGBA'); n += 1
    if a.tobytes() != o.tobytes():
        bad += 1; print('DIFF orig frame', b)
print('orig frames checked', n, 'diffs', bad)
# natural cells equal orig frames byte for byte
for m in plan['muestras']:
    for c in m['cols']:
        for rid in c['natural']:
            a = Image.open(c['cells']['orig']).convert('RGBA').tobytes(); t = Image.open(c['cells'][rid]).convert('RGBA').tobytes()
            print(m['file'], c['label'], rid, 'natural identical' if a == t else 'NATURAL DIFFERS')
