import sys
sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-genjutsu-set-r4/py')
from cmp import *
exec(open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-genjutsu-set-r4/py/align.py').read().split('PANEL=')[0].split('from cmp import *')[1])
n=sys.argv[1]; S=int(sys.argv[2])
an,i=KEY.get(n,(None,0))
fr=frame(n,an,i); his=np.array(hiscrop(n)).astype(float); ours=np.array(onbg(fr,(32,32,42))).astype(float)
d=np.sqrt(((lab(ours)-lab(his))**2).sum(-1))
print('col-mean dE (per 4 cols):',[round(d[:,x:x+4].mean(),1) for x in range(0,d.shape[1],4)])
hm=np.clip(d/30,0,1)
img=np.stack([hm*255,(1-hm)*60,(1-hm)*60],-1).astype(np.uint8)
H,W=d.shape
out=Image.new('RGB',(W*S*3+12,H*S),(255,255,0))
for j,t in enumerate([Image.fromarray(his.astype(np.uint8)),Image.fromarray(ours.astype(np.uint8)),Image.fromarray(img)]):
    out.paste(t.resize((W*S,H*S),Image.NEAREST),(j*(W*S+6),0))
out.save(R+f'de_{n}.png'); print(R+f'de_{n}.png')
