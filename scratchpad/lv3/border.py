import numpy as np
from PIL import Image
im=np.asarray(Image.open('../art2/REF-lightning-set-owner.jpg').convert('RGB')).astype(int)
P = {'bolt':(8,37,84,102),'stream':(259,37,528,102),'breath':(539,37,646,151),'sphere':(658,37,736,115),
'slash':(8,178,74,252),'multi':(118,177,191,242),'hit':(226,178,303,254),'blast':(335,176,683,464),
'wall':(10,490,374,616),'wall_diag':(386,491,679,731),'wall_depth':(9,715,137,1017),'aura':(207,715,289,843)}
B = np.array([0x2b,0x2b,0x35])
def score_col(x,y0,y1): return np.abs(im[y0:y1,x]-B).sum(1).mean()
def score_row(y,x0,x1): return np.abs(im[y,x0:x1]-B).sum(1).mean()
for k,(x0,y0,x1,y1) in P.items():
    my0,my1 = y0+(y1-y0)//4, y1-(y1-y0)//4; mx0,mx1 = x0+(x1-x0)//4, x1-(x1-x0)//4
    L = min(range(x0-4,x0+5), key=lambda x: score_col(x,my0,my1))
    R = min(range(x1-4,x1+5), key=lambda x: score_col(x,my0,my1))
    T = min(range(y0-4,y0+5), key=lambda y: score_row(y,mx0,mx1))
    Bt = min(range(y1-4,y1+5), key=lambda y: score_row(y,mx0,mx1))
    print(k, 'border L',L,'R',R,'T',T,'B',Bt,' inner',L+1,T+1,'size',R-L-1,Bt-T-1, 'scores %.0f %.0f %.0f %.0f'%(score_col(L,my0,my1),score_col(R,my0,my1),score_row(T,mx0,mx1),score_row(Bt,mx0,mx1)))
