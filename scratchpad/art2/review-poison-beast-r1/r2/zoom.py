import sys
from PIL import Image
R=sys.argv[1]; name=sys.argv[2]; box=tuple(int(v) for v in sys.argv[3].split(',')); Z=int(sys.argv[4])
ims=[]
for k in (0,5):
    for who in ('his','ours'):
        ims.append(Image.open(R+'/%s-k%d-1x.png'%(who,k)).crop(box))
w,h=ims[0].size
out=Image.new('RGB',(w*Z*2+10,h*Z*2+10),(255,255,255))
for i,im in enumerate(ims):
    out.paste(im.resize((w*Z,h*Z),Image.NEAREST),((i%2)*(w*Z+10),(i//2)*(h*Z+10)))
out.save(R+'/z-%s.png'%name)
