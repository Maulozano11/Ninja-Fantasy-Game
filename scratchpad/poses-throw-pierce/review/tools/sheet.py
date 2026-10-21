import json,sys
from PIL import Image, ImageDraw
D='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/poses-throw-pierce/review/'
man=json.load(open(D+'raw/manifest.json'))
def bbox_all():
  x0=y0=999;x1=y1=-1
  for m in man:
    b=Image.open(D+'raw/'+m['file']).getbbox()
    if b: x0=min(x0,b[0]);y0=min(y0,b[1]);x1=max(x1,b[2]);y1=max(y1,b[3])
  return x0,y0,x1,y1
if __name__=='__main__':
  print(bbox_all())
