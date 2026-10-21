import sys,pickle,numpy as np
from PIL import Image
S=sys.argv[1]
d=pickle.load(open(S+'/gj-fix/dump.pkl','rb'))['wall_diag']
kind=d['kind']; H,W=kind.shape
gr=kind=='ground'
near=np.zeros_like(gr)
for dy in range(-2,3):
    for dx in range(-2,3):
        near|=np.roll(np.roll(gr,dy,0),dx,1)
for kd in ('dark','outline','smoke','body','glow','weed'):
    m=(kind==kd)&near&~gr; print(kd,m.sum())
ys,xs=np.nonzero(gr); print('ground bbox',xs.min(),ys.min(),xs.max(),ys.max())
# picture: ground=violet, dark near ground=red, outline=yellow, body=grey
img=np.zeros((H,W,3),np.uint8)+30
img[gr]=(140,60,200); img[(kind=='body')]=(150,150,150); img[(kind=='dark')]=(255,0,0); img[kind=='outline']=(255,255,0); img[kind=='smoke']=(0,160,255); img[kind=='weed']=(80,140,40); img[kind=='glow']=(70,70,90)
Image.fromarray(img).resize((W*4,H*4),Image.NEAREST).save(S+'/gj-fix/diag_kinds.png')
