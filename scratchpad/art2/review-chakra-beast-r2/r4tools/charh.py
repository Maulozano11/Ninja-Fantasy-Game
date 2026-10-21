from PIL import Image
import numpy as np, sys
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
im=np.asarray(Image.open(S+'/art2/REF-chakra-set-owner.jpg').convert('RGB')).astype(int)
R=S+'/art2/review-chakra-beast-r2/'
for name,box in [('wall',(278,405,345,525)),('wallv',(125,805,185,925)),('blast',(515,195,580,315)),('diag',(700,475,765,595)),('aura',(350,395,420,520))]:
    x0,y0,x1,y1=box
    c=im[y0:y1,x0:x1]
    # bg estimate: median of corners
    bg=np.median(np.concatenate([c[:3,:3].reshape(-1,3),c[-3:,-3:].reshape(-1,3),c[:3,-3:].reshape(-1,3)]),axis=0)
    d=np.abs(c-bg).sum(2)
    m=d>40
    rows=np.where(m.sum(1)>=2)[0]; cols=np.where(m.sum(0)>=2)[0]
    print(name,'bg',bg,'rows',y0+rows.min(),y0+rows.max(),'h',rows.max()-rows.min()+1,'cols',x0+cols.min(),x0+cols.max())
    Image.fromarray(np.uint8(c)).resize(((x1-x0)*5,(y1-y0)*5),Image.NEAREST).save(R+'r4-his-char-%s-x5.png'%name)
