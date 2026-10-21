from fr import *
import sys
for g in [A+'/earth-r6/before/vfx_earth_v3', sys.argv[1]]:
    fs,_=frames('blast','blast',g)
    print(g.split('/')[-2])
    for i in range(8,16):
        a=fs[i][:,:,3].astype(int)
        s=a[143:153,121:123]; n=np.concatenate([a[143:153,117:121].ravel(),a[143:153,123:127].ravel()])
        n=n[n>0]
        lum=fs[i][143:153,121:123,:3].mean()
        print(i,'stick alpha',s.min(),s.max(),'mean %.0f'%s.mean(),'neigh',(n.min() if len(n) else 0),(n.max() if len(n) else 0),'mean %.0f'%(n.mean() if len(n) else 0))
