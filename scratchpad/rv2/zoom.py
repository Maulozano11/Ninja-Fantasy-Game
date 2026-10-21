import sys
from PIL import Image
exec(open('cmp.py').read().split('stats={}')[0])
name=sys.argv[1]; x0,y0,x1,y1=map(int,sys.argv[2].split(',')); k=int(sys.argv[3]); 
fi_over = int(sys.argv[4]) if len(sys.argv)>4 else None
anim,fi,(hx,hy),s=CFG[name]; m=M[name]; W,H=m['frameW'],m['frameH']; ax,ay=m['anchor']
if fi_over is not None: fi=fi_over
h=his(name,W,H,ax,ay,hx,hy,s).crop((x0,y0,x1,y1)); fr=frame(name,anim,fi)
if name=='aura':
    back=frame('aura_back',anim,fi); comp=Image.new('RGBA',(W,H),(0,0,0,0)); comp.alpha_composite(back)
    if len(sys.argv)<=5: comp.alpha_composite(Image.open(S+'/earth-v3-work/character.png').convert('RGBA'),(ax-64,ay-120))
    comp.alpha_composite(fr); fr=comp
o=on(fr,BG).crop((x0,y0,x1,y1))
# also his at native res
bx=(hx-(ax-x0)*s, hy-(ay-y0)*s, hx+(x1-ax)*s, hy+(y1-ay)*s)
nat=REF.crop(tuple(int(round(v)) for v in bx)).resize(((x1-x0)*k,(y1-y0)*k),Image.LANCZOS)
ps=[nat,up(h,k),up(o,k)]
out=Image.new('RGB',(sum(p.width+4 for p in ps),ps[0].height),(255,0,255)); x=0
for p in ps: out.paste(p,(x,0)); x+=p.width+4
out.save(OUT+'/zoom-%s-%d_%d.png'%(name,x0,y0)); print(out.size)
