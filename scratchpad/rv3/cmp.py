from PIL import Image, ImageDraw
import numpy as np, sys
R='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/'
O=R+'review-poison-beast-r2/'
ref=Image.open(R+'REF-poison-set-owner.jpg').convert('RGB')
sheet=Image.open(R+'staging/vfx_beasts_cobra/poison.png').convert('RGBA')
FW,FH=176,105; AX,AY=98,58
def frame(i): return sheet.crop((i*FW,0,(i+1)*FW,FH))
# his panel bg color
bg=tuple(int(v) for v in np.median(np.array(ref.crop((215,760,235,790))).reshape(-1,3),axis=0))
print('bg',bg)
for fi,(hx,hy) in [(0,(304,745)),(5,(477,745))]:
    his=ref.crop((hx-AX,hy-AY,hx-AX+FW,hy-AY+FH))
    ours=Image.new('RGBA',(FW,FH),bg+(255,)); ours.alpha_composite(frame(fi))
    # alpha mask outline overlay on his crop
    a=np.array(frame(fi))[:,:,3]>0
    ov=np.array(his).copy()
    edge=a & ~(np.roll(a,1,0)&np.roll(a,-1,0)&np.roll(a,1,1)&np.roll(a,-1,1))
    ov[edge]=[255,0,255]
    W=FW*3
    out=Image.new('RGB',(W*3+20,FH*3),(0,0,0))
    out.paste(his.resize((W,FH*3),Image.NEAREST),(0,0))
    out.paste(ours.convert('RGB').resize((W,FH*3),Image.NEAREST),(W+10,0))
    out.paste(Image.fromarray(ov).resize((W,FH*3),Image.NEAREST),(2*W+20,0))
    out.save(O+f'v3-cmp-f{fi}-x3.png')
