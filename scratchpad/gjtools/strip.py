# strip.py <out.png> <name> <anim> <frames e.g. 0,1,2 or all> <Z> [bg dark|green] [per-row] [crop x0,y0,x1,y1]
import sys, json
from PIL import Image
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2'
G=S+'/staging/vfx_genjutsu_v3'
man=json.load(open(G+'/manifest.json'))['sprites']
out_path,name,an=sys.argv[1],sys.argv[2],sys.argv[3]
m=man[name]; n=m['anims'][an]['frames']
fl=list(range(n)) if sys.argv[4]=='all' else [int(v) for v in sys.argv[4].split(',')]
Z=int(sys.argv[5])
bg=(32,32,42) if (len(sys.argv)<7 or sys.argv[6]=='dark') else (78,104,64)
per=int(sys.argv[7]) if len(sys.argv)>7 else len(fl)
sheet=Image.open(G+'/'+m['file']).convert('RGBA'); fw,fh=m['frameW'],m['frameH']; row=m['anims'][an]['row']
crop=tuple(map(int,sys.argv[8].split(','))) if len(sys.argv)>8 else (0,0,fw,fh)
tiles=[]
for i in fl:
    f=sheet.crop((i*fw,row*fh,(i+1)*fw,(row+1)*fh)).crop(crop)
    b=Image.new('RGBA',f.size,bg+(255,)); b.alpha_composite(f)
    tiles.append(b.convert('RGB').resize((f.width*Z,f.height*Z),Image.NEAREST))
tw,th=tiles[0].size; rows=(len(tiles)+per-1)//per
out=Image.new('RGB',(per*(tw+4),rows*(th+4)),(255,0,255))
for j,t in enumerate(tiles): out.paste(t,((j%per)*(tw+4),(j//per)*(th+4)))
out.save(out_path); print(out.size)
