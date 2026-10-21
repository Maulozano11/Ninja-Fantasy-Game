from fr import *
B=A+'/earth-r6'
for g,label in [(B+'/before/vfx_earth_v3','before'),(os.environ.get('G'),'now')]:
    fs,_=frames('blast','blast',g)
    t=[];b=[]
    for f in fs:
        a=f[:,:,3].astype(int); H,W=a.shape
        op=a==255
        below=np.zeros_like(a); below[:-1]=a[1:]
        l=np.zeros_like(a); l[:,1:]=a[:,:-1]; r=np.zeros_like(a); r[:,:-1]=a[:,1:]
        # 1-px tooth: opaque px whose left and right are not opaque (<200) and that has opaque px above it
        above=np.zeros_like(a); above[1:]=a[:-1]
        tooth=op&(l<200)&(r<200)&(above==255)
        t.append(int(tooth.sum()))
        b.append(int((op&(below<60)).sum()))
    print(label,'1px teeth:',t); print(label,'bare bottom (all x):',b)
