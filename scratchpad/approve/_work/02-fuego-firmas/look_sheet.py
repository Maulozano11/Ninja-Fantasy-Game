import sys, numpy as np
from PIL import Image, ImageDraw
D='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/vfx_fire/'
W='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/approve/_work/02-fuego-firmas/'
name, fw, fh, k = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
row = int(sys.argv[5]); f0=int(sys.argv[6]); f1=int(sys.argv[7])
im=Image.open(D+name+'.png').convert('RGBA')
crop=im.crop((f0*fw,row*fh,f1*fw,(row+1)*fh))
bg=Image.new('RGBA',crop.size,(20,24,28,255)); bg.alpha_composite(crop)
big=bg.resize((crop.width*k,crop.height*k),Image.NEAREST)
d=ImageDraw.Draw(big)
for i in range(f1-f0+1):
    d.line([(i*fw*k,0),(i*fw*k,big.height)],fill=(0,200,255,255),width=1)
d.rectangle([0,0,big.width-1,big.height-1],outline=(0,200,255,255))
big.save(W+f'insp_{name}_r{row}_{f0}-{f1}_x{k}.png')
print(big.size)
