# view.py out.png scale group/sprite:anim:frame ... -> his frames side by side on a dark cell
import sys, json
from PIL import Image
R='/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_jutsu-tint-2/src/assets/world/'
out, k = sys.argv[1], int(sys.argv[2])
ims=[]
for spec in sys.argv[3:]:
    gs, anim, f = spec.split(':'); g, s = gs.split('/')
    m = json.load(open(R+g+'/manifest.json'))['sprites'][s]
    sh = Image.open(R+g+'/'+m['file']).convert('RGBA')
    row = m['anims'][anim]['row']; w, h = m['frameW'], m['frameH']; f=int(f)
    fr = sh.crop((f*w, row*h, f*w+w, row*h+h))
    bg = Image.new('RGBA', fr.size, (30,33,39,255)); bg.alpha_composite(fr)
    ims.append(bg.resize((w*k, h*k), Image.NEAREST))
W = sum(i.width for i in ims)+8*len(ims); H=max(i.height for i in ims)
c = Image.new('RGB',(W,H),(10,10,10)); x=0
for i in ims: c.paste(i,(x,0)); x+=i.width+8
c.save(out)
