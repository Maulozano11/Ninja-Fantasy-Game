import sys
sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-genjutsu-set-r3')
from cmp import *
def reach_from_border(clear):
    r=np.zeros_like(clear)
    r[0]=clear[0]; r[-1]=clear[-1]; r[:,0]=clear[:,0]; r[:,-1]=clear[:,-1]
    while True:
        d=r.copy()
        d[1:]|=r[:-1]; d[:-1]|=r[1:]; d[:,1:]|=r[:,:-1]; d[:,:-1]|=r[:,1:]
        d&=clear
        if (d==r).all(): return r
        r=d
def comps(mask):
    ys,xs=np.where(mask); seen=set(); out=[]
    S=set(zip(ys.tolist(),xs.tolist()))
    for p in S:
        if p in seen: continue
        st=[p]; seen.add(p); c=[]
        while st:
            y,x=st.pop(); c.append((y,x))
            for q in ((y+1,x),(y-1,x),(y,x+1),(y,x-1)):
                if q in S and q not in seen: seen.add(q); st.append(q)
        out.append(c)
    return out
if __name__=='__main__':
    thr=int(sys.argv[1]) if len(sys.argv)>1 else 128
    names=['bolt','stream','stream_head','breath','sphere','slash','multi','hit','blast','wall','aura','aura_back','wall_diag','wall_depth']
    for n in names:
        s=man[n]
        for an,a in s['anims'].items():
            res=[]
            for i in range(a['frames']):
                al=np.array(frame(n,an,i))[:,:,3]
                clear=al<thr
                holes=clear & ~reach_from_border(clear)
                cs=comps(holes)
                res.append(f'{len(cs)}/{int(holes.sum())}')
            print(n,an,' '.join(res))
