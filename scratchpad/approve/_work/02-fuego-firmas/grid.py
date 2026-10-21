import sys
from PIL import Image, ImageDraw
D='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/vfx_fire/'
W='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/approve/_work/02-fuego-firmas/'
name,fw,fh,row,n,cols=sys.argv[1],int(sys.argv[2]),int(sys.argv[3]),int(sys.argv[4]),int(sys.argv[5]),int(sys.argv[6])
im=Image.open(D+name+'.png').convert('RGBA')
rows=(n+cols-1)//cols
out=Image.new('RGBA',(cols*(fw+4)+4, rows*(fh+4)+4),(0,200,255,255))
for f in range(n):
    fr=im.crop((f*fw,row*fh,(f+1)*fw,(row+1)*fh))
    bg=Image.new('RGBA',fr.size,(20,24,28,255)); bg.alpha_composite(fr)
    out.paste(bg,(4+(f%cols)*(fw+4),4+(f//cols)*(fh+4)))
out.save(W+f'grid_{name}_r{row}.png'); print(out.size)
