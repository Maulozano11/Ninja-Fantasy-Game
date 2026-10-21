import sys
sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-genjutsu-set-r3')
from cmp import *
from holes import reach_from_border, comps
bgc=np.array([32,32,42])
names=['bolt','stream','stream_head','breath','sphere','slash','multi','hit','blast','wall','aura','wall_diag','wall_depth']
for n in names:
    an,i=KEY.get(n,(None,0))
    fr=np.array(frame(n,an,i)).astype(int); his=np.array(hiscrop(n)).astype(int)
    d=np.abs(his-bgc).sum(2)
    art=d>45
    # eroded art (3x3 all art)
    e=art.copy()
    for dy in (-1,0,1):
        for dx in (-1,0,1):
            e&=np.roll(np.roll(art,dy,0),dx,1)
    clear=fr[:,:,3]<128
    holes=clear & ~reach_from_border(clear)
    bad=clear & e
    badh=holes & e
    print(f'{n:12s} clear-where-his-solid(eroded): {int(bad.sum()):4d}  of which enclosed: {int(badh.sum()):4d}  his-art px {int(art.sum())} ours-opaque {int((~clear).sum())}')
    # save a map
    vis=np.zeros(fr.shape[:2]+(3,),np.uint8)
    vis[art]=(70,70,90); vis[~clear]=(150,150,150); vis[bad]=(255,0,0)
    Image.fromarray(vis).resize((fr.shape[1]*3,fr.shape[0]*3),Image.NEAREST).save(R+f'kh_{n}.png')
