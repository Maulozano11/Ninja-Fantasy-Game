import sys, colorsys
from PIL import Image
import numpy as np
REF='/home/user/Ninja-Fantasy-Game/docs/reference/ui-battle-owner-reference.jpg'
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2'
ref=np.asarray(Image.open(REF).convert('RGB')).astype(float)
mk=np.asarray(Image.open(S+'/ui-battle-mockup.png').convert('RGB')).astype(float)
K=1600/1024
def stats(a,label):
    a=a.reshape(-1,3)
    lum=a.mean(1)
    # bright ornament pixels: top 15% luminance
    th=np.percentile(lum,85)
    b=a[lum>=th]
    m=b.mean(0)
    h,l,s=colorsys.rgb_to_hls(*(m/255))
    print(label,'bright mean',m.round(), 'hue %.0f sat %.2f'%(h*360,s))
    th2=np.percentile(lum,60); mid=a[(lum>=th2)&(lum<th)].mean(0); h,l,s=colorsys.rgb_to_hls(*(mid/255))
    print(label,'mid mean',mid.round(),'hue %.0f sat %.2f'%(h*360,s))
x,y,w,h=[int(v) for v in sys.argv[1:5]]
stats(ref[int(y/K):int((y+h)/K), int(x/K):int((x+w)/K)],'his ')
stats(mk[y:y+h,x:x+w],'ours')
