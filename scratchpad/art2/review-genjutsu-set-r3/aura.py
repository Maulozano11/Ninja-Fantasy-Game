import sys
sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-genjutsu-set-r3')
from cmp import *
ch=Image.open(A+'vfx-genjutsu-v3-character.png').convert('RGBA')
def comp(i,bg):
    W,H=91,134
    c=Image.new('RGBA',(W,H),bg+(255,))
    c.alpha_composite(frame('aura_back','idle',i))
    tmp=Image.new('RGBA',(W,H),(0,0,0,0)); tmp.alpha_composite(ch,(47-64,116-120)) if False else None
    # paste character with offset (may be negative)
    big=Image.new('RGBA',(W+64,H+64),(0,0,0,0)); big.alpha_composite(ch,(47-64+32,116-120+32))
    c.alpha_composite(big.crop((32,32,32+W,32+H)))
    c.alpha_composite(frame('aura','idle',i))
    return c.convert('RGB')
if __name__=='__main__':
    his=hiscrop('aura')
    S=4
    tiles=[his,comp(0,(32,32,42)),comp(0,(76,110,58))]
    out=Image.new('RGB',(3*(91*S+6),134*S),(255,0,255))
    for j,t in enumerate(tiles): out.paste(t.resize((91*S,134*S),Image.NEAREST),(j*(91*S+6),0))
    out.save(R+'aura_cmp.png')
    idx=list(range(12))
    out=Image.new('RGB',(6*(91*2+4),2*(134*2+4)),(255,255,0))
    for j,i in enumerate(idx):
        out.paste(comp(i,(76,110,58)).resize((182,268),Image.NEAREST),((j%6)*186,(j//6)*272))
    out.save(R+'aura_strip_g.png')
