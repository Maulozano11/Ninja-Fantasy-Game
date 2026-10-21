import sys
from PIL import Image, ImageDraw
exec(open('cmp.py').read().split('stats={}')[0])
name,anim=sys.argv[1],sys.argv[2]; k=int(sys.argv[3]); per=int(sys.argv[4]); col=tuple(map(int,sys.argv[5].split(','))) if len(sys.argv)>5 else BG
m=M[name]; W,H=m['frameW'],m['frameH']; n=m['anims'][anim]['frames']
rows=(n+per-1)//per
out=Image.new('RGB',(per*(W*k+4),rows*(H*k+14)),(255,0,255)); d=ImageDraw.Draw(out)
for i in range(n):
    fr=frame(name,anim,i)
    if name=='aura':
        b=frame('aura_back',anim,i); c=Image.new('RGBA',(W,H),(0,0,0,0)); c.alpha_composite(b); c.alpha_composite(Image.open(S+'/earth-v3-work/character.png').convert('RGBA'),(m['anchor'][0]-64,m['anchor'][1]-120)); c.alpha_composite(fr); fr=c
    x=(i%per)*(W*k+4); y=(i//per)*(H*k+14)
    out.paste(up(on(fr,col),k),(x,y+14)); d.text((x+2,y+1),'%s %s %d'%(name,anim,i),fill=(255,255,255))
out.save(OUT+'/strip-%s-%s.png'%(name,anim)); print(out.size)
