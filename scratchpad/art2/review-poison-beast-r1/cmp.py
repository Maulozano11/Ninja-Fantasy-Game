from PIL import Image
import sys
ref=Image.open('REF-poison-set-owner.jpg').convert('RGB')
sh=Image.open('staging/vfx_beasts_cobra/poison.png').convert('RGBA')
W,H=171,104; ax,ay=96,56
# panel bg estimate
px=ref.load()
bgs=[px[x,y] for x in range(210,220) for y in range(690,700)]
bg=tuple(sorted(c[i] for c in bgs)[len(bgs)//2] for i in range(3))
print('panel bg',bg)
def hiscrop(cx,cy):
    return ref.crop((cx-ax,cy-ay,cx-ax+W,cy-ay+H))
def ours(i):
    f=sh.crop((i*W,0,(i+1)*W,H))
    b=Image.new('RGBA',(W,H),bg+(255,)); b.alpha_composite(f); return b.convert('RGB')
S=3
rows=[('L',hiscrop(305,746),ours(0)),('R',hiscrop(477,745),ours(5))]
out=Image.new('RGB',(W*S*2+10,H*S*2+10),(0,0,0))
for r,(n,h,o) in enumerate(rows):
    out.paste(h.resize((W*S,H*S),Image.NEAREST),(0,r*(H*S+10)))
    out.paste(o.resize((W*S,H*S),Image.NEAREST),(W*S+10,r*(H*S+10)))
out.save('review-poison-beast-r1/his-vs-ours-x3.png')
for n,h,o in rows:
    h.save(f'review-poison-beast-r1/his-{n}-1x.png'); o.save(f'review-poison-beast-r1/ours-{n}-1x.png')
