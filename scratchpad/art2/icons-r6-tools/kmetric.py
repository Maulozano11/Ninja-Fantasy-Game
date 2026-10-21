import sys; sys.path.insert(0, sys.argv[1])
from lib import *
import numpy as np
from PIL import Image
A, out, iid = sys.argv[2], sys.argv[3], sys.argv[4]
src = load_his(A + '/staging/ui_icons/ref/' + iid + '.png'); H, Wd = src.shape[:2]
reg44 = [int(v) for v in sys.argv[5:9]]
reg = (int(reg44[0]*Wd/44), int(reg44[1]*H/44), int(reg44[2]*Wd/44), int(reg44[3]*H/44))
def up(im): return np.asarray(Image.fromarray(np.clip(im,0,255).astype(np.uint8)).resize((Wd,H), Image.NEAREST)).astype(float)
def d(a, s):
    la=oklab(gaussrgb(a,s)); lb=oklab(gaussrgb(src,s)); m=np.sqrt(((la-lb)**2).sum(-1))
    return m[reg[1]:reg[3], reg[0]:reg[2]].mean()*100
o44 = np.asarray(Image.open(out + '/' + iid + '.png').convert('RGB')).astype(float)
o88 = np.asarray(Image.open(out + '/' + iid + '@2x.png').convert('RGB')).astype(float)
print(f'44={d(up(o44),2.5):.2f} 88={d(up(o88),1.3):.2f}')
