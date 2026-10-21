import json,sys
from PIL import Image
d=sys.argv[1]; out=sys.argv[2]; names=sys.argv[3].split(',') if len(sys.argv)>3 else None
bg=tuple(int(x) for x in (sys.argv[4] if len(sys.argv)>4 else '222,214,190').split(','))
sc=int(sys.argv[5]) if len(sys.argv)>5 else 2
m=json.load(open(d+'/manifest.json'))
for n,s in m['sprites'].items():
  if names and n not in names: continue
  im=Image.open(d+'/'+s['file']).convert('RGBA')
  fw,fh=s['frameW'],s['frameH']
  for an,a in s['anims'].items():
    k=a['frames']; per=max(1,1600//(fw*sc+4))
    rows=(k+per-1)//per
    W=min(k,per)*(fw*sc+4); H=rows*(fh*sc+4)
    c=Image.new('RGBA',(W,H),bg+(255,))
    for i in range(k):
      f=im.crop((i*fw,a['row']*fh,(i+1)*fw,(a['row']+1)*fh)).resize((fw*sc,fh*sc),Image.NEAREST)
      x=(i%per)*(fw*sc+4); y=(i//per)*(fh*sc+4)
      c.alpha_composite(f,(x,y))
    c.convert('RGB').save(f'{out}/st-{n}-{an}.png')
