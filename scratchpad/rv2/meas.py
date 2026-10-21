from PIL import Image; import numpy as np, sys
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2'
im=np.asarray(Image.open(S+'/REF-earth-set-owner.jpg').convert('RGB')).astype(float)
BG=np.array([34,34,45.])
def meas(name,x0,y0,x1,y1):
    c=im[y0:y1,x0:x1]; d=np.abs(c-BG).sum(-1)>40
    rows=np.nonzero(d.sum(1)>1)[0]; cols=np.nonzero(d.sum(0)>1)[0]
    print(name, 'rows',y0+rows.min(),y0+rows.max(),'h',rows.max()-rows.min()+1,'cols',x0+cols.min(),x0+cols.max())
# characters: blast (approx display 1585-1720 x 485-720) -> orig *1.035
meas('blast-char',1650,490,1785,770)
meas('wall-char',755,975,905,1215)
meas('diag-char',1820,1065,1965,1305)
meas('depth-char',330,1680,450,1960)
