import json, sys
from PIL import Image
ref=Image.open('art2/REF-phoenix-owner.jpg').convert('RGBA')
m=json.load(open('art2/staging/vfx_beasts/manifest.json'))['sprites']['fire']
sh=Image.open('art2/staging/vfx_beasts/fire.png').convert('RGBA')
fw,fh=m['frameW'],m['frameH']
bg=(0x5d,0x6b,0x57,255)
def frame(i,row=0):
    c=Image.new('RGBA',(fw,fh),bg); f=sh.crop((i*fw,row*fh,(i+1)*fw,(row+1)*fh)); c.alpha_composite(f); return c.resize((fw*3,fh*3),Image.NEAREST)
panels=[(14+ (i%4)*252, 212 + (i//4)*146) for i in range(8)]
sel=[int(v) for v in sys.argv[1].split(',')]
out=Image.new('RGBA',(len(sel)*(fw*3+8), 280+fh*3),(42,46,54,255))
for k,i in enumerate(sel):
    x,y=panels[i]
    r=ref.crop((x,y,x+242,y+134)).resize((484,268),Image.LANCZOS)
    out.paste(r,(k*(fw*3+8),0))
    out.paste(frame(i),(k*(fw*3+8),280))
out.save('raiju/cmp-phx.png')
