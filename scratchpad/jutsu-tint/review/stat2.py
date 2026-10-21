import sys, glob, os, colorsys
from PIL import Image
D = 'work/frames'
def load(f):
    im = Image.open(f).convert('RGBA'); return list(im.getdata() if not hasattr(im,'get_flattened_data') else im.get_flattened_data())
for g in sys.argv[1:]:
    orig = load(f'{D}/{g}.orig.png')
    idx = [i for i, p in enumerate(orig) if p[3] >= 200]
    lo = sorted(0.299*orig[i][0]+0.587*orig[i][1]+0.114*orig[i][2] for i in idx)
    n = len(lo); q = lambda a, f: round(a[int(f*(n-1))])
    print(f'== {g}  orig luma p5/50/95={q(lo,.05)}/{q(lo,.5)}/{q(lo,.95)} colours={len(set(orig[i] for i in idx))}')
    for f in sorted(glob.glob(f'{D}/{g}.*.png')):
        col = f.split('.')[-2]
        if col == 'orig': continue
        t = load(f)
        changed = [i for i in idx if t[i] != orig[i]]
        so = len(set(orig[i] for i in changed)); st = len(set(t[i] for i in changed))
        L = sorted(0.299*t[i][0]+0.587*t[i][1]+0.114*t[i][2] for i in idx)
        print(f'  {col:7s} luma p5/50/95={q(L,.05)}/{q(L,.5)}/{q(L,.95)}  changed colours {so}->{st}')
