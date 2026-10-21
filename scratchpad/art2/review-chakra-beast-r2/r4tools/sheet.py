from PIL import Image, ImageDraw
import numpy as np
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
R=S+'/art2/review-chakra-beast-r2/'
hisF=np.load(R+'r4tools/hisF.npy')
sheet=np.asarray(Image.open(S+'/art2/staging/vfx_beasts_griffin/chakra.png').convert('RGBA')).astype(float)
FW,FH=127,93
fr=[sheet[:,i*FW:(i+1)*FW] for i in range(8)]
def over(f,bgc): a=f[...,3:4]/255.; return f[...,:3]*a+np.array(bgc,float)*(1-a)
def big(a,k): return Image.fromarray(np.uint8(np.clip(a,0,255))).resize((a.shape[1]*k,a.shape[0]*k),Image.NEAREST)
k=3; W=FW*k; H=FH*k; pad=8; lab=16
c=Image.new('RGB',(4*(W+pad)+pad, 4*(H+lab+pad)+pad),(45,45,52)); d=ImageDraw.Draw(c)
def put(img,col,row,text):
    x=pad+col*(W+pad); y=pad+row*(H+lab+pad); d.text((x,y),text,fill=(240,240,240)); c.paste(img,(x,y+lab))
put(big(hisF,k),0,0,'HIS beast panel at game scale (96/97)')
put(big(over(fr[0],(32,31,39)),k),1,0,'OURS f0 on his bg')
put(big(over(fr[0],(74,118,58)),k),2,0,'OURS f0 on grass')
d.text((pad+3*(W+pad),pad+lab),'tail px visible per frame:\n335 334 209 65 249 242 38 328\n(f3 and f6: tail+tuft hidden\n by near wing for 1 frame)\nlight/frame (mean a*luma):\n.280 .272 .250 .223 .213 .222 .240 .270\nmax step 10.7% of peak\nborder: 0 px on edge, all frames',fill=(240,240,240))
for i in range(8):
    put(big(over(fr[i],(74,118,58)),k),i%4,1+i//4,'f%d'%i)
# tail blink row
x=pad; y=pad+3*(H+lab+pad)
for j,i in enumerate([2,3,4,5,6,7]):
    crop=over(fr[i],(32,31,39))[25:80,0:60]
    im=big(crop,3); d.text((x,y),'f%d tail'%i,fill=(255,200,120)); c.paste(im,(x,y+lab)); x+=im.width+6
c.save(R+'REVIEW-chakra-griffin-r4.png'); print(c.size)
