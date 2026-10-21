from PIL import Image, ImageDraw
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
ST=S+'/art2/staging/vfx_poison_v3/'; O=S+'/art2/review-poison-set-r3/'
s=Image.open(ST+'stream.png').convert('RGBA'); h=Image.open(ST+'stream_head.png').convert('RGBA')
Z=3; W=64*2+70+8
out=Image.new('RGB',(W*Z, 8*76*Z),(255,0,255))
for i in range(8):
    c=Image.new('RGBA',(W,76),(18,20,32,255))
    t=s.crop((i*64,0,(i+1)*64,64))
    for k in range(2): c.alpha_composite(t,(4+k*64,6))
    # head anchor (32,36) at stream end x=4+128 + 32? anchor means head x=32 is 32px past tile end -> head x0 at tile end
    c.alpha_composite(h.crop((i*70,0,(i+1)*70,72)),(4+128,6+32-36))
    out.paste(c.convert('RGB').resize((W*Z,76*Z),Image.NEAREST),(0,i*76*Z))
    ImageDraw.Draw(out).text((2,i*76*Z+2),f'f{i}',fill=(255,255,0))
out.save(O+'stream-chain.png')
