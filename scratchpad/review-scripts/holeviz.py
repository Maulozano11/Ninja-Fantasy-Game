import json, sys
sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/review-scripts')
from holes import frames, holes, man, A
from PIL import Image
import numpy as np
R=A+'/review-poison-set-r1'
ref=Image.open(A+'/REF-poison-set-owner.jpg').convert('RGB')
rm=json.load(open(A+'/vfx-poison-v3-src/refmap.json'))
for spec in sys.argv[1:]:
    name,an,idx,Z=spec.split(':'); idx=int(idx); Z=int(Z)
    f=[fr for a,i,fr in frames(name) if a==an and i==idx][0]
    hl=holes(f)
    h,w=hl.shape
    bg=np.zeros((h,w,4),np.uint8); bg[:]=(92,128,64,255)
    im=Image.fromarray(bg); im.alpha_composite(Image.fromarray(f))
    arr=np.array(im); arr[hl]=(255,0,255,255)
    b=rm[name]['box']
    his=ref.crop((round(b[0]),round(b[1]),round(b[2]),round(b[3]))).resize((w,h),Image.BICUBIC)
    out=Image.new('RGB',(w*Z*2+8,h*Z),(255,255,255))
    out.paste(his.resize((w*Z,h*Z),Image.NEAREST),(0,0))
    out.paste(Image.fromarray(arr).convert('RGB').resize((w*Z,h*Z),Image.NEAREST),(w*Z+8,0))
    out.save(R+'/holes-%s-%s%d.png'%(name,an,idx)); print(spec,out.size)
