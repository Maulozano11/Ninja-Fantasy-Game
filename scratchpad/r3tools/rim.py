from PIL import Image
import numpy as np, math
REF='/home/user/Ninja-Fantasy-Game/docs/reference/ui-battle-owner-reference.jpg'
ref=np.asarray(Image.open(REF).convert('RGB')).astype(int)
# his medallion approx center: in 1600 coords ~ (594,103) -> 1024: (380,66)
# find brightness of rim beads (light gold). Sample along rays.
def prof(img,cx,cy,maxr,step=0.25):
    out=[]
    for ang in range(0,360,15):
        a=math.radians(ang)
        best=None
        rs=np.arange(maxr*0.4,maxr,step)
        vals=[]
        for r in rs:
            x=cx+r*math.cos(a); y=cy-r*math.sin(a)
            p=img[int(round(y)),int(round(x))]
            vals.append(p.sum())
        vals=np.array(vals)
        # outermost bright pixel (lum>380)
        idx=np.where(vals>420)[0]
        out.append((ang, round(rs[idx[-1]],1) if len(idx) else None))
    return out
# locate his centre via dark disc: search
sub=ref[40:95,350:410]
print(prof(ref,380.5,66.5,30))
mk=np.asarray(Image.open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/ui_battle/round_medallion.png').convert('RGBA')).astype(int)
mk3=mk[:,:,:3]*(mk[:,:,3:4]>0)
print(prof(mk3,40,40,40,0.5))
