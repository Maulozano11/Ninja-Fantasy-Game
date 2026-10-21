from fr import *
B=A+'/earth-r6'
import sys
for g,label in [(B+'/before/vfx_earth_v3','before'),(sys.argv[1],'now')]:
    fs,_=frames('blast','blast',g)
    L=[];R=[];T=[];C=[]
    for f in fs:
        a=f[:,:,3].astype(int); H,W=a.shape
        op=a==255
        below=np.zeros_like(a); below[:-1]=a[1:]
        bare=op&(below<60)
        L.append(int(bare[:, :45].sum())); R.append(int(bare[:, 185:].sum()))
        l=np.zeros_like(a); l[:,1:]=a[:,:-1]; r=np.zeros_like(a); r[:,:-1]=a[:,1:]
        above=np.zeros_like(a); above[1:]=a[:-1]
        # 1px column: opaque with left/right <200, and below <60 (hanging tooth)
        tooth=op&(l<200)&(r<200)&(below<60)
        T.append(int(tooth.sum()))
    print(label,'bare bottom x<45:',L); print(label,'bare bottom x>=185:',R); print(label,'1px hanging teeth:',T)
