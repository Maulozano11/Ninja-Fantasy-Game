from PIL import Image; import numpy as np, sys
im=np.array(Image.open(sys.argv[1])).astype(int)
g=im.sum(-1)
# border pixels: greyish lighter lines ~ (50,50,60)
b=(g>130)&(g<210)&(abs(im[...,0]-im[...,2])<25)
H,W=b.shape
# horizontal lines: rows with runs >=150
def runs(row):
    out=[];s=None
    for x,v in enumerate(list(row)+[False]):
        if v and s is None: s=x
        if not v and s is not None:
            if x-s>=120: out.append((s,x-1))
            s=None
    return out
hl=[]
for y in range(H):
    for r in runs(b[y]): hl.append((y,)+r)
vl=[]
for x in range(W):
    for r in runs(b[:,x]): vl.append((x,)+r)
print('H lines'); [print(l) for l in hl]
print('V lines'); [print(l) for l in vl]
