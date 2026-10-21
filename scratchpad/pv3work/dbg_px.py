exec(open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/pv3work/dbg.py').read())
dist=np.sqrt(((SMOOTH-BG)**2).sum(-1))
fam=family_of(SMOOTH)
for (x,y) in [(479,249),(487,254),(488,238),(490,238),(478,223),(479,224),(480,243),(476,250),(486,253),(488,255)]:
    print((x,y), SMOOTH[y,x].round(), 'dist', round(dist[y,x],1), 'fam', fam[y,x], 'L', round(lum(SMOOTH[y,x]),1))
