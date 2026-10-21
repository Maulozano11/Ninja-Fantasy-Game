from common import *
brief={'fly':(8,(10,12)),'hit':(12,(12,12)),'blast':(16,(12,12)),'rise':(12,(12,12)),'idle':(8,(10,10))}
tot=0;bad=[]
for n,sp in MAN['sprites'].items():
    sheet=Image.open(ST+'/'+sp['file']).convert('RGBA')
    fw,fh=sp['frameW'],sp['frameH']
    rows=max(a['row'] for a in sp['anims'].values())+1
    maxf=max(a['frames'] for a in sp['anims'].values())
    print(n,'sheet',sheet.size,'expect',(fw*maxf,fh*rows),'anchor',sp['anchor'],'frame',fw,fh)
    for an,a in sp['anims'].items():
        exp=brief.get(an)
        if n.startswith('aura'): exp=(12,(10,12))
        ok = exp is None or (a['frames']==exp[0] and exp[1][0]<=a['fps']<=exp[1][1])
        fr=frames(n,an)
        L=[light(f) for f in fr]; pk=max(L)
        steps=[abs(L[i+1]-L[i])/pk*100 for i in range(len(L)-1)]
        if a['loop']: steps.append(abs(L[0]-L[-1])/pk*100)
        bord=[]
        for i,f in enumerate(fr):
            al=np.asarray(f)[...,3]
            e=[al[0].max(),al[-1].max(),al[:,0].max(),al[:,-1].max()]
            tot+=1
            if max(e)>0: bord.append((i,e))
        empty=[i for i,f in enumerate(fr) if np.asarray(f)[...,3].max()==0]
        print('  ',an,a['frames'],'@',a['fps'],'loop' if a['loop'] else 'once','BRIEF-OK' if ok else 'BRIEF-MISMATCH',
              'light',' '.join('%d'%x for x in L),'maxstep %.1f%%'%max(steps),'at',int(np.argmax(steps)),'border',bord if bord else 0,'empty',empty)
print('frames',tot)
