import pickle, numpy as np, re, json
from PIL import Image
s=open('/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-genjutsu-v3-refdata.ts').read()
pal=json.loads(re.search(r'GJ_PAL: GjPal\[\] = (\[.*?\]);',s).group(1))
ref=json.loads(re.search(r'GJ_REF: Record<string, GjSprite> = (\{.*\});',s,re.S).group(1))
import base64
P=np.array([[int(p['rgba'][i:i+2],16) for i in (1,3,5,7)] for p in pal],np.uint8)
def decode(sp):
    r=ref[sp]; W,H=r['w'],r['h']; out=np.zeros((H,W,4),np.uint8)
    for pn,pc in r['pieces'].items():
        b=base64.b64decode(pc['rle']); flat=[]
        for i in range(0,len(b),2): flat+= [b[i+1]]*b[i]
        a=np.array(flat).reshape(pc['h'],pc['w'])
        sub=out[pc['y']:pc['y']+pc['h'],pc['x']:pc['x']+pc['w']]
        m=a>0; sub[m]=P[a[m]-1]
    return Image.fromarray(out,'RGBA'), r['anchor']
back,an=decode('aura_back'); front,_=decode('aura')
ch=Image.open('char.png').convert('RGBA')
W,H=back.size
for bgc,name in [((32,32,42),'dark'),((84,110,70),'grass')]:
    im=Image.new('RGBA',(W,H),bgc+(255,))
    im.alpha_composite(back); 
    c=Image.new('RGBA',(W,H)); c.paste(ch,(an[0]-64,an[1]-120)); im.alpha_composite(c)
    im.alpha_composite(front)
    im.resize((W*4,H*4),Image.NEAREST).save('aura-comp-%s.png'%name)
