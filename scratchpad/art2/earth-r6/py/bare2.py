from fr import *
import sys
fs,_=frames('blast','blast',sys.argv[1])
for i in [int(v) for v in sys.argv[2].split(',')]:
    a=fs[i][:,:,3].astype(int)
    below=np.zeros_like(a); below[:-1]=a[1:]
    bare=(a==255)&(below<60)
    ys,xs=np.nonzero(bare[:,:45])
    print(i, sorted(zip(xs.tolist(),ys.tolist())))
