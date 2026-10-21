import json
from PIL import Image, ImageDraw
import numpy as np
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
A=S+'/art2'; R=A+'/review-poison-set-r1'; G=A+'/staging/vfx_poison_v3'
ref=Image.open(A+'/REF-poison-set-owner.jpg').convert('RGB')
man=json.load(open(G+'/manifest.json'))['sprites']
rm=json.load(open(A+'/vfx-poison-v3-src/refmap.json'))
for name,row,idx in [('blast',0,4),('wall_diag',1,0)]:
    m=man[name]; fw,fh=m['frameW'],m['frameH']; b=rm[name]['box']
    his=np.array(ref.crop((round(b[0]),round(b[1]),round(b[2]),round(b[3]))).resize((fw,fh),Image.BICUBIC)).astype(float)
    bgc=np.array([24,26,34.])
    f=Image.open(G+'/'+m['file']).convert('RGBA').crop((idx*fw,row*fh,(idx+1)*fw,(row+1)*fh))
    bg=Image.new('RGBA',(fw,fh),(24,26,34,255)); bg.alpha_composite(f)
    ours=np.array(bg.convert('RGB')).astype(float)
    def g(a): return np.clip(a[:,:,1]-bgc[1],0,255)
    hg,og=g(his),g(ours)
    mx=max(hg.max(),og.max())
    def heat(x):
        v=(x/mx*255).astype(np.uint8)
        return Image.fromarray(v).convert('L')
    Z=2
    out=Image.new('RGB',(fw*Z*2+10,fh*Z),(255,0,255))
    out.paste(heat(hg).resize((fw*Z,fh*Z),Image.NEAREST).convert('RGB'),(0,0))
    out.paste(heat(og).resize((fw*Z,fh*Z),Image.NEAREST).convert('RGB'),(fw*Z+10,0))
    out.save(R+'/lightmap-%s.png'%name)
    # row/col profiles of green in the light region
    if name=='blast':
        for y in range(20,170,10):
            print(y,'his',' '.join('%3d'%hg[y,x] for x in range(150,246,8)))
            print(y,'our',' '.join('%3d'%og[y,x] for x in range(150,246,8)))
