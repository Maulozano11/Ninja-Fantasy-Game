import pickle, numpy as np, sys
from PIL import Image
D=sys.argv[1]; idx=[int(x) for x in sys.argv[2].split(',')]; K=int(sys.argv[3]); out=sys.argv[4]
box=None if len(sys.argv)<6 else [int(x) for x in sys.argv[5].split(',')]
st=pickle.load(open(D+'/state.pkl','rb'))
fly=st['fly']
if box is None:
    ys,xs=np.nonzero(np.stack([f[...,3] for f in fly]).max(0))
    x0,y0,x1,y1=xs.min()-2,ys.min()-2,xs.max()+3,ys.max()+3
else:
    x0,y0,x1,y1=box
tiles=[]
for i in idx:
    im=Image.fromarray(fly[i][y0:y1,x0:x1],'RGBA')
    bg=Image.new('RGBA',im.size,(31,33,46,255)); bg.alpha_composite(im)
    tiles.append(bg.resize((im.width*K,im.height*K),Image.NEAREST))
W=tiles[0].width; H=tiles[0].height
o=Image.new('RGB',(len(tiles)*(W+6),H),(90,90,90))
for i,t in enumerate(tiles): o.paste(t,(i*(W+6),0))
o.save(out)
