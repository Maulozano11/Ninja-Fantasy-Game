import json, numpy as np
from PIL import Image
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
ST=S+'/art2/staging/vfx_chakra_v3'
R=S+'/art2/review-chakra-set-r1'
MAN=json.load(open(ST+'/manifest.json'))
REF=Image.open(S+'/art2/REF-chakra-set-owner.jpg').convert('RGB')
HM=json.load(open(S+'/chakra3/rev/his-map.json'))
def frames(name, anim):
    sp=MAN['sprites'][name]; a=sp['anims'][anim]
    sheet=Image.open(ST+'/'+sp['file']).convert('RGBA')
    fw,fh=sp['frameW'],sp['frameH']
    return [sheet.crop((i*fw,a['row']*fh,(i+1)*fw,(a['row']+1)*fh)) for i in range(a['frames'])]
def up(im,k=3): return im.resize((im.width*k,im.height*k),Image.NEAREST)
def over(im,bg=(30,29,37)):
    b=Image.new('RGBA',im.size,bg+(255,)); b.alpha_composite(im); return b.convert('RGB')
def light(im):
    a=np.asarray(im).astype(float)/255
    lum=(0.299*a[...,0]+0.587*a[...,1]+0.114*a[...,2])
    return float((a[...,3]*lum).mean()*1000)
