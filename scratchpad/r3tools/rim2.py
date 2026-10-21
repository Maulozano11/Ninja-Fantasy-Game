from PIL import Image, ImageDraw
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2'
REF='/home/user/Ninja-Fantasy-Game/docs/reference/ui-battle-owner-reference.jpg'
ref=Image.open(REF).convert('RGB')
K=1600/1024; z=6
# his medallion region in 1024: ~ (352,38)-(408,94)
h=ref.crop((352,38,408,94)).resize((int(56*K*z),int(56*K*z)),Image.BICUBIC)
m=Image.open(S+'/staging/ui_battle/round_medallion.png').convert('RGBA')
bg=Image.new('RGBA',m.size,(60,90,60,255)); bg.alpha_composite(m)
m=bg.resize((80*z,80*z),Image.NEAREST).convert('RGB')
W=max(h.width,m.width)
out=Image.new('RGB',(h.width+m.width+10,W),(255,0,255))
out.paste(h,(0,0)); out.paste(m,(h.width+10,0))
d=ImageDraw.Draw(out)
# circles through the gem centres guide
for (cx,cy,r) in [(h.width/2,h.height/2,0)]:
    pass
out.save(S+'/review-ui-r3/z_round_shape.png')
print(h.size,m.size)
