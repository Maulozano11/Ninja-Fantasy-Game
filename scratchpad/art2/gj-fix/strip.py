# strip.py <name> <anim> <frames e.g. 0,1,2> <Z> [bg: dark|green] [crop x0,y0,x1,y1]
import sys, json
from PIL import Image
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2'
G=S+'/staging/vfx_genjutsu_v3'
man=json.load(open(G+'/manifest.json'))['sprites']
name,an=sys.argv[1],sys.argv[2]; fl=[int(v) for v in sys.argv[3].split(',')]; Z=int(sys.argv[4])
bg=(32,32,42) if (len(sys.argv)<6 or sys.argv[5]=='dark') else (78,104,64)
m=man[name]; sheet=Image.open(G+'/'+m['file']).convert('RGBA'); fw,fh=m['frameW'],m['frameH']; row=m['anims'][an]['row']
crop=tuple(map(int,sys.argv[6].split(','))) if len(sys.argv)>6 else (0,0,fw,fh)
tiles=[]
for i in fl:
    f=sheet.crop((i*fw,row*fh,(i+1)*fw,(row+1)*fh)).crop(crop)
    b=Image.new('RGBA',f.size,bg+(255,)); b.alpha_composite(f)
    tiles.append(b.convert('RGB').resize((f.width*Z,f.height*Z),Image.NEAREST))
out=Image.new('RGB',(sum(t.width+4 for t in tiles),tiles[0].height),(255,0,255))
x=0
for t in tiles: out.paste(t,(x,0)); x+=t.width+4
out.save(S+f'/gj-fix/s_{name}_{an}.png'); print(out.size)
