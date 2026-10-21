import pickle, numpy as np, sys
from PIL import Image
D=sys.argv[1]; K=int(sys.argv[2]) if len(sys.argv)>2 else 3
st=pickle.load(open(D+'/state.pkl','rb'))
fly=st['fly']
ys,xs=np.nonzero(np.stack([f[...,3] for f in fly]).max(0))
y0,y1,x0,x1=ys.min()-2,ys.max()+3,xs.min()-2,xs.max()+3
tiles=[]
for i,f in enumerate(fly):
    im=Image.fromarray(f[y0:y1,x0:x1],'RGBA')
    bg=Image.new('RGBA',im.size,(31,33,46,255)); bg.alpha_composite(im)
    tiles.append(bg.resize((im.width*K,im.height*K),Image.NEAREST))
W=tiles[0].width; H=tiles[0].height
cols=int(sys.argv[3]) if len(sys.argv)>3 else 4
rows=(len(tiles)+cols-1)//cols
out=Image.new('RGB',(cols*(W+6),rows*(H+6)),(70,70,70))
for i,t in enumerate(tiles):
    out.paste(t,((i%cols)*(W+6),(i//cols)*(H+6)))
out.save(D+'/strip.png')
