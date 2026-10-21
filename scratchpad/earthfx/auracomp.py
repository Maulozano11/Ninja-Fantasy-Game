import sys,json
from PIL import Image
d,charp,out=sys.argv[1:4]; frames=[int(v) for v in sys.argv[4].split(',')]; k=int(sys.argv[5]) if len(sys.argv)>5 else 3
m=json.load(open(d+'/manifest.json'))['sprites']
ch=Image.open(charp).convert('RGBA')
def fr(name,i):
    s=m[name]; im=Image.open(d+'/'+s['file']).convert('RGBA'); fw,fh=s['frameW'],s['frameH']
    return im.crop((i*fw,0,(i+1)*fw,fh)), s['anchor']
tiles=[]
for bg in [(34,34,45),(222,214,190),(96,124,72)]:
  for i in frames:
    b,an=fr('aura_back',i); f,_=fr('aura',i)
    c=Image.new('RGBA',b.size,bg+(255,)); c.alpha_composite(b)
    c2=Image.new('RGBA',b.size,(0,0,0,0)); 
    c2.alpha_composite(ch,(an[0]-64,an[1]-120)) if an[0]>=64 and an[1]>=120 else None
    if not (an[0]>=64 and an[1]>=120):
        big=Image.new('RGBA',(b.width+256,b.height+256),(0,0,0,0)); big.alpha_composite(ch,(an[0]-64+128,an[1]-120+128)); c2=big.crop((128,128,128+b.width,128+b.height))
    c.alpha_composite(c2); c.alpha_composite(f)
    tiles.append(c.convert('RGB'))
W,H=tiles[0].size; n=len(frames)
o=Image.new('RGB',(n*(W*k+6),3*(H*k+6)))
for j,t in enumerate(tiles): o.paste(t.resize((W*k,H*k),Image.NEAREST),((j%n)*(W*k+6),(j//n)*(H*k+6)))
o.save(out); print(o.size)
