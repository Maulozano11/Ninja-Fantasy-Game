import sys
from PIL import Image, ImageDraw
D='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/vfx_fire/'
W='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/approve/_work/02-fuego-firmas/'
name,fw,fh,row,f,x0,y0,x1,y1,k,tag=sys.argv[1:12]
fw,fh,row,f,x0,y0,x1,y1,k=map(int,(fw,fh,row,f,x0,y0,x1,y1,k))
im=Image.open(D+name+'.png').convert('RGBA')
fr=im.crop((f*fw,row*fh,(f+1)*fw,(row+1)*fh))
# pad 4px magenta-ish border outside frame to show frame edge
pad=4
cv=Image.new('RGBA',(fw+2*pad,fh+2*pad),(90,0,90,255))
inner=Image.new('RGBA',(fw,fh),(20,24,28,255)); inner.alpha_composite(fr)
cv.paste(inner,(pad,pad))
c=cv.crop((x0+pad-pad if x0==0 else x0+pad, y0 if y0==0 else y0+pad, x1+pad + (pad if x1==fw else 0), y1+pad+(pad if y1==fh else 0)))
c=c.resize((c.width*k,c.height*k),Image.NEAREST)
c.save(W+f'zoom_{tag}.png'); print(c.size)
