import json, sys
from PIL import Image, ImageDraw
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
A=S+'/art2'; R=A+'/review-poison-set-r1'; G=A+'/staging/vfx_poison_v3'
ref=Image.open(A+'/REF-poison-set-owner.jpg').convert('RGB')
man=json.load(open(G+'/manifest.json'))['sprites']
rm=json.load(open(A+'/vfx-poison-v3-src/refmap.json'))
# args: name row idx x0 y0 x1 y1 zoom out [bg]
name,row,idx,x0,y0,x1,y1,Z,out=sys.argv[1],int(sys.argv[2]),int(sys.argv[3]),*map(int,sys.argv[4:9]),sys.argv[9]
bgs=[(28,30,38),(92,128,64),(200,190,160)]
m=man[name]; fw,fh=m['frameW'],m['frameH']
im=Image.open(G+'/'+m['file']).convert('RGBA').crop((idx*fw,row*fh,(idx+1)*fw,(row+1)*fh)).crop((x0,y0,x1,y1))
b=rm[name]['box'] if name in rm else None
w,h=x1-x0,y1-y0
panels=[]
if b:
    his=ref.crop((round(b[0]),round(b[1]),round(b[2]),round(b[3]))).resize((fw,fh),Image.BICUBIC).crop((x0,y0,x1,y1))
    panels.append(his.convert('RGBA'))
for bg in bgs:
    p=Image.new('RGBA',(w,h),bg+(255,)); p.alpha_composite(im); panels.append(p)
# alpha view
a=im.getchannel('A'); panels.append(Image.merge('RGBA',(a,a,a,Image.new('L',(w,h),255))))
outI=Image.new('RGB',((w*Z+8)*len(panels),h*Z),(255,0,255))
for i,p in enumerate(panels): outI.paste(p.convert('RGB').resize((w*Z,h*Z),Image.NEAREST),(i*(w*Z+8),0))
outI.save(R+'/'+out)
print(outI.size)
