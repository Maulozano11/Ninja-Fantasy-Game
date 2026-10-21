import sys, numpy as np
from PIL import Image
R=sys.argv[1]; kind=sys.argv[2]; n=6
def A(i): return np.asarray(Image.open(f'{R}/v5-{kind}{i}.png'))[:,:,3]>0
pairs=[(i,(i+1)%n) for i in range(n)] if kind=='fly' else [(i,i+1) for i in range(n-1)]
tiles=[]
for a,b in pairs:
    pa,pb=A(a),A(b)
    img=np.zeros(pa.shape+(3,),np.uint8)
    img[pa&~pb]=[230,60,60]; img[pb&~pa]=[60,200,230]; img[pa&pb]=[110,110,110]
    tiles.append(img); tiles.append(np.zeros((167,3,3),np.uint8)+255)
row=np.concatenate(tiles[:-1],1)
im=Image.fromarray(row); im.resize((im.width*2,im.height*2),Image.NEAREST).save(f'{R}/v5-onion-{kind}.png')
