import sys
sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-genjutsu-set-r4/py')
from cmp import *

def label(mask):
    H,W=mask.shape; lab=np.zeros((H,W),int); n=0
    for y in range(H):
        for x in range(W):
            if mask[y,x] and lab[y,x]==0:
                n+=1; st=[(y,x)]; lab[y,x]=n
                while st:
                    cy,cx=st.pop()
                    for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
                        ny,nx=cy+dy,cx+dx
                        if 0<=ny<H and 0<=nx<W and mask[ny,nx] and lab[ny,nx]==0:
                            lab[ny,nx]=n; st.append((ny,nx))
    return lab,n
tot=0; bad=[]; holes=[]
for n,s in man.items():
    if n=='beast': continue
    im=np.array(Image.open(A+'staging/vfx_genjutsu_v3/'+s['file']).convert('RGBA'))
    W,H=s['frameW'],s['frameH']
    print(n, im.shape[1],im.shape[0], 'expected rows', 1+max(a['row'] for a in s['anims'].values()), 'cols', max(a['frames'] for a in s['anims'].values()))
    for an,a in s['anims'].items():
        for i in range(a['frames']):
            f=im[a['row']*H:(a['row']+1)*H, i*W:(i+1)*W]
            al=f[:,:,3]
            tot+=1
            if al.sum()==0: print('  EMPTY',n,an,i)
            e={'top':al[0,:],'bot':al[-1,:],'left':al[:,0],'right':al[:,-1]}
            for k,v in e.items():
                if n=='stream' and k in('left','right'): continue
                if n=='stream_head' and k=='left': continue
                if (v>0).any(): bad.append((n,an,i,k,int((v>0).sum()),int(v.max())))
            # holes: clear components not touching border, size<=12... measure any enclosed clear
            clear=al==0
            lab,nl=label(clear)
            edge=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))
            sizes=np.bincount(lab.ravel(),minlength=nl+1)[1:]
            enc=[(j+1,int(sizes[j])) for j in range(nl) if (j+1) not in edge]
            if enc:
                holes.append((n,an,i,len(enc),sum(z for _,z in enc),max(z for _,z in enc)))
            # near-clear: alpha<40 enclosed by alpha>200
print('frames',tot)
print('border violations',len(bad)); [print(' ',b) for b in bad[:40]]
print('frames with enclosed fully-clear regions',len(holes))
for h in holes: print(' ',h)
