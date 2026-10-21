import json, sys
from PIL import Image, ImageDraw, ImageFont
M='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/approve/_work/06-09-tierra-genjutsu-chakra-veneno/'
S=M+'snap/'
F=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',14)
def frames(el,name,anim):
    s=json.load(open(S+'vfx_%s/manifest.json'%el))['sprites'][name]
    im=Image.open(S+'vfx_%s/'%el+s['file']).convert('RGBA'); a=s['anims'][anim]
    return [im.crop((f*s['frameW'],a['row']*s['frameH'],(f+1)*s['frameW'],(a['row']+1)*s['frameH'])) for f in range(a['frames'])]
def grid(rows, k, path, per_row=99, bg=(20,24,28,255)):
    # rows: list of (label, [frames])
    out_rows=[]
    for lab,frs in rows:
        for i in range(0,len(frs),per_row):
            out_rows.append((lab+(' (%d-)'%i if len(frs)>per_row else ''),frs[i:i+per_row],i))
    pad=6
    W=max(sum(f.width*k+pad*2 for f in r[1]) for r in out_rows)+pad
    H=sum(r[1][0].height*k+pad*2+18 for r in out_rows)+pad
    c=Image.new('RGBA',(W,H),bg); d=ImageDraw.Draw(c)
    y=pad
    for lab,frs,i0 in out_rows:
        d.text((pad,y),lab,font=F,fill=(220,220,220,255)); y+=18
        x=pad
        for j,f in enumerate(frs):
            up=f.resize((f.width*k,f.height*k),Image.NEAREST)
            d.rectangle([x-1,y-1,x+up.width,y+up.height],outline=(150,40,40,255))
            c.alpha_composite(up,(x,y))
            d.text((x+2,y+2),str(i0+j),font=F,fill=(120,120,120,255))
            x+=up.width+pad*2
        y+=frs[0].height*k+pad*2
    c.save(path); print(path,c.size)
if __name__=="__main__":
  el=sys.argv[1]
  grid([(n,frames(el,n,'fly')) for n in ['bolt','sphere','slash','multi']],4,M+'insp/%s_A.png'%el)
  grid([(n,frames(el,n,'fly')) for n in ['stream','stream_head']]+[('hit',frames(el,'hit','hit'))],4,M+'insp/%s_B.png'%el)
  grid([('breath',frames(el,'breath','fly'))],3,M+'insp/%s_C.png'%el,per_row=3)
  grid([('blast',frames(el,'blast','blast'))],2,M+'insp/%s_D.png'%el,per_row=4)
  grid([('wall rise',frames(el,'wall','rise')),('wall idle',frames(el,'wall','idle'))],2,M+'insp/%s_E.png'%el,per_row=3)
  grid([('aura',frames(el,'aura','idle'))],3,M+'insp/%s_F.png'%el)
