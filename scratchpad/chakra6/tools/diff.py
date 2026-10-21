import sys, os; sys.path.insert(0, os.path.dirname(__file__))
import numpy as np, json
from PIL import Image
A, B = sys.argv[1], sys.argv[2]
names = sys.argv[3].split(',') if len(sys.argv) > 3 else None
ma = json.load(open(f'{A}/manifest.json'))['sprites']; mb = json.load(open(f'{B}/manifest.json'))['sprites']
for n in mb:
    if names and n not in names: continue
    sa, sb = ma[n], mb[n]
    ia = np.array(Image.open(f'{A}/{sa["file"]}').convert('RGBA')).astype(int)
    ib = np.array(Image.open(f'{B}/{sb["file"]}').convert('RGBA')).astype(int)
    out = []
    for an, a in sb['anims'].items():
        W, H = sb['frameW'], sb['frameH']
        aa = sa['anims'][an]
        if (sa['frameW'], sa['frameH']) != (W, H): out.append(f'{an}: size differs'); continue
        d = []
        for i in range(a['frames']):
            fa = ia[aa['row']*H:(aa['row']+1)*H, i*W:(i+1)*W]; fb = ib[a['row']*H:(a['row']+1)*H, i*W:(i+1)*W]
            d.append(int((fa != fb).any(-1).sum()))
        out.append(f'{an}: {d}')
    print(n, ' | '.join(out))
