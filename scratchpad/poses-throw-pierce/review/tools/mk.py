import json,sys
from PIL import Image, ImageDraw
D='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/poses-throw-pierce/review/'
man=json.load(open(D+'raw/manifest.json'))
CROP=(40,78,222,222)
def frame(file,scale,bg=(70,78,90)):
  im=Image.open(D+'raw/'+file).crop(CROP)
  out=Image.new('RGBA',im.size,bg+(255,))
  out.alpha_composite(im)
  return out.resize((im.size[0]*scale,im.size[1]*scale),Image.NEAREST)
def sheet(keys,pose,scale,out,ground=True):
  rows=[]
  for k in keys:
    fr=[m for m in man if m['key']==k and m['pose']==pose]
    rows.append((k,[frame(m['file'],scale) for m in fr]))
  fw=(CROP[2]-CROP[0])*scale; fh=(CROP[3]-CROP[1])*scale
  ncol=max(len(r[1]) for r in rows)
  S=Image.new('RGB',(120+ncol*(fw+4),len(rows)*(fh+4)),(30,30,30))
  d=ImageDraw.Draw(S)
  for i,(k,fs) in enumerate(rows):
    d.text((4,i*(fh+4)+fh//2),k,fill=(255,255,255))
    for j,f in enumerate(fs):
      S.paste(f,(120+j*(fw+4),i*(fh+4)))
  S.save(out)
if __name__=='__main__':
  pose=sys.argv[1]; scale=int(sys.argv[2]); out=sys.argv[3]; keys=sys.argv[4:]
  sheet(keys,pose,scale,D+out)
