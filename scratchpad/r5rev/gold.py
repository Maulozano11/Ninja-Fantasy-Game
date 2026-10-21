from PIL import Image
import numpy as np, colorsys
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2'
ref=np.asarray(Image.open('/home/user/Ninja-Fantasy-Game/docs/reference/icons-owner-reference-1.jpg').convert('RGB')).astype(float)
def goldmask(a):
    r,g,b=a[...,0],a[...,1],a[...,2]
    return (r>g)&(g>b)&(r-b>35)&(r>90)
allg=[]
for sx in (14,266,518,770):
    for (x0,y0) in ((sx,256),(sx+240-50,256),(sx,501-50),(sx+240-50,501-50)):
        blk=ref[y0:y0+50,x0:x0+50]; m=goldmask(blk); allg.append(blk[m])
g=np.concatenate(allg)
print('his gold px',len(g),'mean',g.mean(0).round(),'p10',np.percentile(g,10,axis=0).round(),'p50',np.median(g,0).round(),'p90',np.percentile(g,90,axis=0).round())
fr=np.asarray(Image.open(f'{S}/staging/ui_icons/skill_slot_steel.png').convert('RGB')).astype(float)
m=goldmask(fr); o=fr[m]
print('our gold px',len(o),'mean',o.mean(0).round(),'p10',np.percentile(o,10,axis=0).round(),'p50',np.median(o,0).round(),'p90',np.percentile(o,90,axis=0).round())
# share of gold px in a slot area: his slot 240x245 scaled, ours 56x56
his_share=np.mean([goldmask(ref[256:501,sx:sx+240]).mean() for sx in (14,266,518,770)])
print('gold area share his %.3f ours %.3f'%(his_share, m.mean()))
# steel bar colour: his top bar middle
for sx in (14,):
    bar=ref[258:270,sx+80:sx+160]; print('his steel bar rows mean', bar.mean(1).round().tolist())
print('our steel rows', fr[0:6,28].round().tolist())
