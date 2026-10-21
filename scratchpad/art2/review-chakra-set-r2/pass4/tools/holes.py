import sys; sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-chakra-set-r2/pass4/tools')
from c import *

def label(mask):
    h,w=mask.shape; lab=np.zeros((h,w),int); n=0
    for y in range(h):
        for x in range(w):
            if mask[y,x] and not lab[y,x]:
                n+=1; st=[(y,x)]; lab[y,x]=n
                while st:
                    cy,cx=st.pop()
                    for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
                        ny,nx=cy+dy,cx+dx
                        if 0<=ny<h and 0<=nx<w and mask[ny,nx] and not lab[ny,nx]:
                            lab[ny,nx]=n; st.append((ny,nx))
    return lab,n
def stats(f):
    a=np.asarray(f)[...,3].astype(int)
    op=a>=160
    # pinholes: low alpha pixel whose 4-neighbours are all opaque
    lo=a<90
    p=np.pad(op,1)
    n4=p[:-2,1:-1]&p[2:,1:-1]&p[1:-1,:-2]&p[1:-1,2:]
    pin=(lo&n4).sum()
    # enclosed transparent regions (alpha<40) not connected to border, size<=12
    tr=a<40
    lab,nl=label(tr)
    border=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])).tolist())
    sizes=np.bincount(lab.ravel(),minlength=nl+1)
    enc=sum(int(sizes[i]) for i in range(1,nl+1) if i not in border and sizes[i]<=40)
    # isolated opaque pixels (no opaque 8-neighbour)
    q=np.pad(op.astype(int),1); k=sum(q[1+dy:1+dy+op.shape[0],1+dx:1+dx+op.shape[1]] for dy in (-1,0,1) for dx in (-1,0,1))-op
    iso=(op&(k==0)).sum()
    return pin,enc,iso
if __name__=='__main__':
    for n,sp in MAN['sprites'].items():
        if n=='beast': continue
        for an in sp['anims']:
            fr=frames(n,an)
            st=[stats(f) for f in fr]
            print('%-11s %-5s pin %s | enclosed %s | iso %s'%(n,an,' '.join(str(s[0]) for s in st),' '.join(str(s[1]) for s in st),' '.join(str(s[2]) for s in st)))
