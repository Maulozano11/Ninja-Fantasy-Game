import json, sys
from PIL import Image
G='art2/staging/vfx_genjutsu_v3/'
man=json.load(open(G+'manifest.json'))['sprites']
name, an = sys.argv[1], sys.argv[2]; z=int(sys.argv[3]) if len(sys.argv)>3 else 3
s=man[name]; a=s['anims'][an]
sheet=Image.open(G+s['file']).convert('RGBA')
fw,fh=s['frameW'],s['frameH']
idx=[int(v) for v in sys.argv[4].split(',')] if len(sys.argv)>4 else range(a['frames'])
idx=list(idx)
out=Image.new('RGBA',((fw+2)*len(idx),fh),(32,32,42,255))
for j,i in enumerate(idx):
    f=sheet.crop((i*fw,a['row']*fh,(i+1)*fw,(a['row']+1)*fh))
    bg=Image.new('RGBA',(fw,fh),(32,32,42,255)); bg.alpha_composite(f); out.paste(bg,(j*(fw+2),0))
out.resize((out.width*z,out.height*z),Image.NEAREST).save('gj/strip-%s-%s.png'%(name,an))
