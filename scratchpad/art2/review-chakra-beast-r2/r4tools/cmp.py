from PIL import Image
import numpy as np
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
R=S+'/art2/review-chakra-beast-r2/'
ref=Image.open(S+'/art2/REF-chakra-set-owner.jpg').convert('RGB')
sheet=np.asarray(Image.open(S+'/art2/staging/vfx_beasts_griffin/chakra.png').convert('RGBA')).astype(float)
FW,FH=127,93
frames=[sheet[:, i*FW:(i+1)*FW] for i in range(8)]
sc=96/97.0
box=(114,38,246,139)
p=ref.crop(box)
gw,gh=round(p.width*sc),round(p.height*sc)
his=np.asarray(p.resize((gw,gh),Image.BOX)).astype(float)
bg=np.array([32,31,39.])
hm=(np.abs(his-bg).sum(2)>60)
om=frames[0][...,3]>128
best=None
for dy in range(-20,20):
  for dx in range(-20,20):
    # place his at offset (dx,dy) in our frame coords
    H=np.zeros((FH,FW),bool)
    ys0,xs0=max(0,dy),max(0,dx)
    ys1,xs1=min(FH,dy+gh),min(FW,dx+gw)
    if ys1<=ys0 or xs1<=xs0: continue
    H[ys0:ys1,xs0:xs1]=hm[ys0-dy:ys1-dy, xs0-dx:xs1-dx]
    iou=(H&om).sum()/(H|om).sum()
    if best is None or iou>best[0]: best=(iou,dx,dy)
print('best iou,dx,dy',best, 'his game size',gw,gh)
iou,dx,dy=best
hisF=np.zeros((FH,FW,3)); hisF[:]=bg
ys0,xs0=max(0,dy),max(0,dx); ys1,xs1=min(FH,dy+gh),min(FW,dx+gw)
hisF[ys0:ys1,xs0:xs1]=his[ys0-dy:ys1-dy, xs0-dx:xs1-dx]
np.save(R+'r4tools/hisF.npy',hisF)
def over(f,bgc):
    a=f[...,3:4]/255.
    return f[...,:3]*a+np.array(bgc)*(1-a)
def big(a,k=3): return Image.fromarray(np.uint8(np.clip(a,0,255))).resize((a.shape[1]*k,a.shape[0]*k),Image.NEAREST)
k=4
W=FW*k
canvas=Image.new('RGB',(W*3+40,FH*k+20),(60,60,60))
canvas.paste(big(hisF,k),(10,10)); canvas.paste(big(over(frames[0],bg),k),(W+20,10)); canvas.paste(big(over(frames[0],(70,120,60)),k),(2*W+30,10))
canvas.save(R+'r4-his-vs-f0-x4.png')
# diff mask image: red = ours only, blue= his only, gray = both
H=np.zeros((FH,FW),bool); H[ys0:ys1,xs0:xs1]=hm[ys0-dy:ys1-dy, xs0-dx:xs1-dx]
d=np.zeros((FH,FW,3)); d[H&om]=(120,120,120); d[om&~H]=(255,60,60); d[H&~om]=(60,140,255)
big(d,5).save(R+'r4-silhouette-diff-x5.png')
print('ours-only',(om&~H).sum(),'his-only',(H&~om).sum(),'both',(H&om).sum())
