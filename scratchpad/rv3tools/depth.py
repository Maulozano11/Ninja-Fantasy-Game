from PIL import Image, ImageDraw
import numpy as np
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
A=S+'/art2/'; O=A+'review-poison-set-r3/'
old=Image.open(A+'staging/vfx_poison/wall_depth.png').convert('RGBA')
new=Image.open(A+'staging/vfx_poison_v3/wall_depth.png').convert('RGBA')
W,H=112,304
on=np.array(old).astype(int); nn=np.array(new).astype(int)
# idle even frames == old idle
for k in range(4):
    a=on[H:2*H,k*W:(k+1)*W]; b=nn[H:2*H,2*k*W:(2*k+1)*W]
    print('idle old',k,'vs new',2*k,'identical',np.array_equal(a,b), np.abs(a-b).max())
for k in range(6):
    a=on[0:H,k*W:(k+1)*W]
    best=min(range(12),key=lambda j: np.abs(a-nn[0:H,j*W:(j+1)*W]).mean())
    print('rise old',k,'closest new',best, np.abs(a-nn[0:H,best*W:(best+1)*W]).mean())
def strip(img,row,n,tag,bg=(18,20,32)):
    Z=2
    out=Image.new('RGB',(n*(W*Z+4),H*Z+14),(255,0,255)); d=ImageDraw.Draw(out)
    for i in range(n):
        f=img.crop((i*W,row*H,(i+1)*W,(row+1)*H)); b=Image.new('RGBA',(W,H),bg+(255,)); b.alpha_composite(f)
        out.paste(b.convert('RGB').resize((W*Z,H*Z),Image.NEAREST),(i*(W*Z+4),14)); d.text((i*(W*Z+4)+2,1),f'{tag} f{i}',fill=(255,255,0))
    out.save(O+f'depth-{tag}.png')
strip(new,0,12,'rise'); strip(new,1,8,'idle'); strip(old,0,6,'oldrise')
