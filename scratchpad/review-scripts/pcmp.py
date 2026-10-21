import json, sys
from PIL import Image, ImageDraw
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
A=S+'/art2'; R=A+'/review-poison-set-r1'; G=A+'/staging/vfx_poison_v3'
ref=Image.open(A+'/REF-poison-set-owner.jpg').convert('RGB')
man=json.load(open(G+'/manifest.json'))['sprites']
rm=json.load(open(A+'/vfx-poison-v3-src/refmap.json'))
ch=Image.open(A+'/vfx-poison-v3-character.png').convert('RGBA')
BG=(28,30,38)
def frame(name,row,idx):
    m=man[name]; im=Image.open(G+'/'+m['file']).convert('RGBA')
    fw,fh=m['frameW'],m['frameH']
    return im.crop((idx*fw,row*fh,(idx+1)*fw,(row+1)*fh))
peaks={'bolt':(0,0),'stream':(0,0),'stream_head':(0,0),'breath':(0,0),'sphere':(0,0),'slash':(0,0),'multi':(0,0),'hit':(0,3),'blast':(0,4),'wall':(1,0),'wall_diag':(1,0),'aura':(0,0)}
Z=3
for name,(row,idx) in peaks.items():
    m=man[name]; fw,fh=m['frameW'],m['frameH']
    b=rm[name]['box']
    his=ref.crop((round(b[0]),round(b[1]),round(b[2]),round(b[3]))).resize((fw,fh),Image.BICUBIC)
    # panel bg of his: sample corner median
    ours=Image.new('RGBA',(fw,fh),BG+(255,))
    if name=='aura':
        back=frame('aura_back',0,0); front=frame('aura',0,0)
        ours.alpha_composite(back)
        ax,ay=m['anchor']; ours.alpha_composite(ch,(ax-64,ay-120))
        ours.alpha_composite(front)
    else:
        ours.alpha_composite(frame(name,row,idx))
    grass=Image.new('RGBA',(fw,fh),(92,128,64,255))
    if name=='aura': grass.alpha_composite(frame('aura_back',0,0)); grass.alpha_composite(ch,(m["anchor"][0]-64,m["anchor"][1]-120)); grass.alpha_composite(frame('aura',0,0))
    else: grass.alpha_composite(frame(name,row,idx))
    W=fw*Z; out=Image.new('RGB',(W*3+40,fh*Z+20),(60,60,60))
    out.paste(his.resize((W,fh*Z),Image.NEAREST),(0,20))
    out.paste(ours.convert('RGB').resize((W,fh*Z),Image.NEAREST),(W+20,20))
    out.paste(grass.convert('RGB').resize((W,fh*Z),Image.NEAREST),(2*W+40,20))
    d=ImageDraw.Draw(out); d.text((2,2),name+' HIS',fill=(255,255,0)); d.text((W+22,2),'OURS f%d row%d'%(idx,row),fill=(255,255,0))
    ax,ay=m['anchor']
    for ox in (0,W+20):
        d.ellipse([ox+ax*Z-3,20+ay*Z-3,ox+ax*Z+3,20+ay*Z+3],outline=(255,0,0))
    out.save(R+'/cmp-'+name+'.png')
    print(name, out.size)
