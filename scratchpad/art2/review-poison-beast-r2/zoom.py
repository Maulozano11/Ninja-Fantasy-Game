import sys
from PIL import Image
import numpy as np
S=sys.argv[1]; R=sys.argv[2]
ref=Image.open(S+'/art2/REF-poison-set-owner.jpg').convert('RGB')
sp=Image.open(S+'/art2/staging/vfx_beasts_cobra/poison.png').convert('RGBA')
W,H=172,107; ax,ay=96,58
bg=(31,33,46)
def frame(i): return sp.crop((i*W,0,(i+1)*W,H))
def onbg(f,c=bg):
  b=Image.new('RGBA',f.size,c+(255,)); b.alpha_composite(f); return b.convert('RGB')
anc={0:(304,745),5:(477,745)}
regions={'head':(110,0,172,60),'neck':(105,55,160,107),'tail':(0,35,70,100),'hump':(50,10,125,75)}
k=int(sys.argv[3]) if len(sys.argv)>3 else 6
for name,(x0,y0,x1,y1) in regions.items():
  rows=[]
  for i in (0,5):
    cx,cy=anc[i]
    his=ref.crop((cx-ax,cy-ay,cx-ax+W,cy-ay+H)).crop((x0,y0,x1,y1))
    ours=onbg(frame(i)).crop((x0,y0,x1,y1))
    w,h=(x1-x0)*k,(y1-y0)*k
    row=Image.new('RGB',(2*w+8,h),(255,255,255))
    row.paste(his.resize((w,h),Image.NEAREST),(0,0)); row.paste(ours.resize((w,h),Image.NEAREST),(w+8,0))
    rows.append(row)
  out=Image.new('RGB',(rows[0].width,rows[0].height*2+8),(255,255,255))
  out.paste(rows[0],(0,0)); out.paste(rows[1],(0,rows[0].height+8))
  out.save(R+'/zoom-%s.png'%name)
