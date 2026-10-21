import sys; sys.path.insert(0, sys.argv[1])
from lib import *
from PIL import ImageDraw
char=np.array(Image.open(R+'/character.png').convert('RGBA'))
B=frames('aura_back','idle'); F=frames('aura','idle')
anc=M['sprites']['aura']['anchor']
def place(fr):
    H,W=fr.shape[:2]; c=np.zeros_like(fr); ox=anc[0]-64; oy=anc[1]-120
    ys=slice(max(0,oy),min(H,oy+char.shape[0])); xs=slice(max(0,ox),min(W,ox+char.shape[1]))
    c[ys,xs]=char[ys.start-oy:ys.stop-oy, xs.start-ox:xs.stop-ox]; return c
tiles={'panel':[],'grass':[],'magenta':[]}
comps=[]
for i in range(12):
    c=over(F[i],over(place(B[i]),B[i])); comps.append(c)
    h,w=c.shape[:2]; a=c[...,3:4]/255
    for bg,col in [('panel',(31,33,46)),('grass',None),('magenta',(255,0,255))]:
        base=grass(h,w) if col is None else np.broadcast_to(np.array(col),c[...,:3].shape)
        img=(c[...,:3]*a+base*(1-a)).astype(np.uint8)
        t=Image.fromarray(up(img,3)); ImageDraw.Draw(t).text((3,2),str(i),fill=(255,255,0)); tiles[bg].append(t)
for bg,ts in tiles.items():
    W,H=ts[0].size; o=Image.new('RGB',(6*(W+4),2*(H+4)),(255,255,255))
    for j,t in enumerate(ts): o.paste(t,((j%6)*(W+4),(j//6)*(H+4)))
    o.save(R+'/aura-composite-%s.png'%bg)
# enclosed see-through in composite and in the union of the layers
for i,c in enumerate(comps):
    al=c[...,3].astype(int)
    e128=enclosed(al,128); e32=enclosed(al,32)
    print(i,'composite enclosed <128: %d px, <32: %d px'%(e128.sum(),e32.sum()))
np.save(R+'/aura_comps.npy',np.array(comps))
