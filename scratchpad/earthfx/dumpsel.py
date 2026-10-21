import sys; sys.path.insert(0,sys.argv[1])
from refdec import *
import numpy as np
R=load(); r=R[sys.argv[2]]
groups=[g.split('+') for g in sys.argv[3].split(',')]
sc=int(sys.argv[5]) if len(sys.argv)>5 else 2
bgc=(222,214,190,255)
tiles=[]
for g in groups:
    L=np.zeros((r['h'],r['w']),np.int32)
    for n in g:
        if n.endswith('*'):
            for k in r['pieces']:
                if k.startswith(n[:-1]) and k[len(n)-1:].isdigit(): 
                    p=piece(r,k); L[p>0]=p[p>0]
        else:
            p=piece(r,n); L[p>0]=p[p>0]
    im=render(r,L); bg=Image.new('RGBA',im.size,bgc); bg.alpha_composite(im)
    tiles.append(bg.resize((im.width*sc,im.height*sc),Image.NEAREST))
W=tiles[0].width; H=tiles[0].height; cols=int(sys.argv[6]) if len(sys.argv)>6 else 2
c=Image.new('RGB',(cols*(W+6),((len(tiles)+cols-1)//cols)*(H+6)),(40,40,50))
for i,t in enumerate(tiles): c.paste(t.convert('RGB'),((i%cols)*(W+6),(i//cols)*(H+6)))
c.save(sys.argv[4])
