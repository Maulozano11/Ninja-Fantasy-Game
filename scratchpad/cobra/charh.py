import sys
from PIL import Image
import numpy as np
ref=np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(np.float32)
SHEET_BG=np.array([31,33,46],np.float32)
def char_height(x0,x1,y0,y1):
    c=ref[y0:y1,x0:x1]
    r,g,b=c[...,0],c[...,1],c[...,2]
    bg=np.median(np.concatenate([c[:3].reshape(-1,3),c[:, :3].reshape(-1,3), c[:, -3:].reshape(-1,3)]),0)
    on=(np.abs(c-bg).sum(2)>45)&~((r-g>20)&(b-g>20))&~((g>r+12)&(g>b+5))
    rows=on.sum(1)>=2
    best,run,start,span,gap=0,0,0,(0,0),0
    for y,v in enumerate(rows.tolist()+[False]*4):
        if v:
            if run==0: start=y
            run=y-start+1; gap=0
            if run>best: best,span=run,(start+y0,y+y0)
        else:
            gap+=1
            if gap>2: run=0
    return best,span,bg
CHARS={'blast':(528,598,192,302),'wall':(296,352,398,512),'aura':(368,432,392,505),'wall_diag':(698,758,472,588),'wall_depth':(124,188,798,908)}
for k,v in CHARS.items(): print(k,char_height(*v))
