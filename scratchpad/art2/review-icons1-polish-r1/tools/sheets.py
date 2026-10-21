import sys; sys.path.insert(0,'.')
from common import *
from PIL import ImageDraw
for i,n in enumerate(IDS):
    h=his_crop(i)
    hb44=box(h,44); hb88=box(h,88)
    o=ours(i).convert('RGB'); o2=ours(i,True).convert('RGB')
    W=352; pad=8
    # row 1 at 44 scale x8: his crop (lanczos to 352), his box44 x8, ours44 x8
    s1=Image.new('RGB',(3*W+4*pad,W+2*pad),(20,22,28))
    s1.paste(h.resize((W,W),Image.LANCZOS),(pad,pad))
    s1.paste(zoom(hb44,8),(2*pad+W,pad))
    s1.paste(zoom(o,8),(3*pad+2*W,pad))
    s1.save(OUT+f'{n}-44-x8.png')
    s2=Image.new('RGB',(3*W+4*pad,W+2*pad),(20,22,28))
    s2.paste(h.resize((W,W),Image.LANCZOS),(pad,pad))
    s2.paste(zoom(hb88,4),(2*pad+W,pad))
    s2.paste(zoom(o2,4),(3*pad+2*W,pad))
    s2.save(OUT+f'{n}-88-x4.png')
print('ok')
