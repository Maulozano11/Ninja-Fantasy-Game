import pickle, numpy as np, sys
from PIL import Image
D=sys.argv[1]
st=pickle.load(open(D+'/state.pkl','rb'))
C=st['C']; fly=st['fly']
bg=np.array([31,33,46.])
def up(a,k): return np.repeat(np.repeat(a,k,0),k,1)
rows=[]
for fi,k in ((0,'L'),(5,'R')):
    c=C[k]; f=fly[fi].astype(float)
    a=f[...,3:4]/255; ours=f[...,:3]*a+bg*(1-a)
    his=c['col']
    y0,y1,x0,x1=30,72,130,190
    row=np.concatenate([his[y0:y1,x0:x1],np.full((y1-y0,1,3),200.),ours[y0:y1,x0:x1]],1)
    rows.append(up(row.clip(0,255).astype(np.uint8),9))
Image.fromarray(np.concatenate(rows,0)).save(D+'/headviz.png')
