import json, sys
from PIL import Image
W='approve/_work/11-arboles/'
NEW='art3/staging/trees'; OLD='/home/user/Ninja-Fantasy-Game/src/assets/world/trees'
def frame(d, name, anim, f):
    m=json.load(open(d+'/manifest.json'))['sprites'][name]
    im=Image.open(d+'/'+m['file']).convert('RGBA')
    a=m['anims'][anim]; fw,fh=m['frameW'],m['frameH']
    return im.crop((f*fw,a['row']*fh,(f+1)*fw,(a['row']+1)*fh)), m
def onbg(fr, col=(20,24,28,255), scale=1):
    bg=Image.new('RGBA',fr.size,col); bg.alpha_composite(fr)
    if scale>1: bg=bg.resize((fr.width*scale,fr.height*scale),Image.NEAREST)
    return bg
if __name__=='__main__':
    which=sys.argv[1]; name=sys.argv[2]; anim=sys.argv[3]; f=int(sys.argv[4]); sc=int(sys.argv[5]); out=sys.argv[6]
    box=None
    if len(sys.argv)>7: box=tuple(int(v) for v in sys.argv[7].split(','))
    fr,m=frame(NEW if which=='new' else OLD, name, anim, f)
    if box: fr=fr.crop(box)
    onbg(fr,(90,110,90,255),sc).save(W+out)
