import json, sys
from PIL import Image
A='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2'
G=A+'/staging/vfx_genjutsu_v3'
man=json.load(open(G+'/manifest.json'))['sprites']; rm=json.load(open(A+'/vfx-genjutsu-v3-refmap.json'))
REF=Image.open(A+'/REF-genjutsu-set-owner.jpg').convert('RGB')
CH=Image.open(A+'/vfx-genjutsu-v3-character.png').convert('RGBA')
s=man['aura']; r=rm['aura']; k=r['k']; W,H=s['frameW'],s['frameH']; ax,ay=s['anchor']
ox=r['origin'][0]-(ax-r['anchor'][0])/k; oy=r['origin'][1]-(ay-r['anchor'][1])/k
his=REF.resize((W,H),Image.BOX,box=(ox,oy,ox+W/k,oy+H/k)).convert('RGBA')
tiles=[]
for dx,dy in [(0,0),(-3,0),(3,0),(0,-3),(0,3)]:
    cl=Image.new('RGBA',(W,H)); cl.paste(CH,(ax-64+dx,ay-120+dy))
    t=his.copy(); m=cl.copy(); m.putalpha(cl.split()[3].point(lambda v: v//2)); t.alpha_composite(m)
    tiles.append(t.resize((W*4,H*4),Image.NEAREST))
out=Image.new('RGB',(len(tiles)*(W*4+6),H*4),(255,0,255))
for i,t in enumerate(tiles): out.paste(t,(i*(W*4+6),0))
out.save(A+'/gj-fix2/onion.png')
