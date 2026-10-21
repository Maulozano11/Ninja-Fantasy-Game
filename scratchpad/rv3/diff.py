from PIL import Image
import numpy as np
R='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/'
ref=Image.open(R+'REF-poison-set-owner.jpg').convert('RGB')
sheet=Image.open(R+'staging/vfx_beasts_cobra/poison.png').convert('RGBA')
FW,FH=176,105; AX,AY=98,58
tiles=[]
for fi,(hx,hy) in [(0,(304,745)),(5,(477,745))]:
    his=np.array(ref.crop((hx-AX,hy-AY,hx-AX+FW,hy-AY+FH))).astype(int)
    bgc=np.median(his[0:6,20:60].reshape(-1,3),axis=0)
    o=Image.new('RGBA',(FW,FH),tuple(int(v) for v in bgc)+(255,)); o.alpha_composite(sheet.crop((fi*FW,0,(fi+1)*FW,FH)))
    ours=np.array(o.convert('RGB')).astype(int)
    d=np.abs(his-ours).sum(axis=2)
    # blur-ish compare: 3x3 mean to ignore 1px JPEG offsets
    def box(a):
        p=np.pad(a,((1,1),(1,1),(0,0)),mode='edge').astype(float)
        return sum(p[dy:dy+FH,dx:dx+FW] for dy in range(3) for dx in range(3))/9
    db=np.abs(box(his)-box(ours)).sum(axis=2)
    a=np.array(sheet.crop((fi*FW,0,(fi+1)*FW,FH)))[:,:,3]>0
    hisfg=np.abs(his-bgc).sum(axis=2)>45
    print(fi,'bg',bgc,'mean |diff| on union fg',d[a|hisfg].mean().round(1),'3x3-blurred',db[a|hisfg].mean().round(1),
          'his fg not ours',int((hisfg&~a).sum()),'ours not his fg',int((a&~hisfg).sum()))
    hm=np.clip(db*1.5,0,255).astype(np.uint8)
    tiles.append(Image.fromarray(hm).resize((FW*3,FH*3),Image.NEAREST))
    # mask mismatch image
    mm=np.zeros((FH,FW,3),np.uint8); mm[hisfg&a]=[90,90,90]; mm[hisfg&~a]=[255,60,60]; mm[a&~hisfg]=[60,160,255]
    tiles.append(Image.fromarray(mm).resize((FW*3,FH*3),Image.NEAREST))
out=Image.new('RGB',(2*(FW*3+6),2*(FH*3+6)),(255,255,255))
for k,t in enumerate(tiles): out.paste(t,((k%2)*(FW*3+6),(k//2)*(FH*3+6)))
out.save(R+'review-poison-beast-r2/v3-keyframe-diff-x3.png')
