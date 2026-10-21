from PIL import Image
import numpy as np, sys
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
R=S+'/art2/review-chakra-beast-r2/'
sheet=np.asarray(Image.open(S+'/art2/staging/vfx_beasts_griffin/chakra.png').convert('RGBA')).astype(float)
FW,FH=127,93
frames=[sheet[:, i*FW:(i+1)*FW] for i in range(8)]
def over(f,bgc):
    a=f[...,3:4]/255.
    return f[...,:3]*a+np.array(bgc,float)*(1-a)
def big(a,k): return Image.fromarray(np.uint8(np.clip(a,0,255))).resize((a.shape[1]*k,a.shape[0]*k),Image.NEAREST)
name=sys.argv[1]; x0,y0,x1,y1=map(int,sys.argv[2].split(',')); idx=list(map(int,sys.argv[3].split(','))); k=int(sys.argv[4]); bgn=sys.argv[5] if len(sys.argv)>5 else 'dark'
bgc=(32,31,39) if bgn=='dark' else (74,118,58)
cols=int(sys.argv[6]) if len(sys.argv)>6 else len(idx)
w=(x1-x0)*k; h=(y1-y0)*k
rows=(len(idx)+cols-1)//cols
c=Image.new('RGB',(cols*(w+8),rows*(h+8)),(200,60,200))
for j,i in enumerate(idx):
    c.paste(big(over(frames[i],bgc)[y0:y1,x0:x1],k),((j%cols)*(w+8),(j//cols)*(h+8)))
c.save(R+'r4-'+name+'.png'); print(c.size)
