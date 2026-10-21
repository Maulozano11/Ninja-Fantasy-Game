import sys, json
from PIL import Image
g='art2/staging/vfx_lightning_v3/'
name, anim, k = sys.argv[1], sys.argv[2], int(sys.argv[3])
out = sys.argv[4]
m=json.load(open(g+'manifest.json'))['sprites'][name]
sh=Image.open(g+m['file']).convert('RGBA')
a=m['anims'][anim]; fw,fh=m['frameW'],m['frameH']
crop = [int(v) for v in sys.argv[5].split(',')] if len(sys.argv)>5 else [0,0,fw,fh]
cw,chh=crop[2]-crop[0],crop[3]-crop[1]
S=Image.new('RGB',((cw*k+6)*a['frames'],chh*k),(0,0,0))
for i in range(a['frames']):
    f=sh.crop((i*fw,a['row']*fh,(i+1)*fw,(a['row']+1)*fh)).crop(crop)
    bg=Image.new('RGBA',f.size,(32,32,42,255)); bg.alpha_composite(f)
    S.paste(bg.convert('RGB').resize((cw*k,chh*k),Image.NEAREST),(i*(cw*k+6),0))
S.save(out)
