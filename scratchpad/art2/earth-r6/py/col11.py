from fr import *
fs,(ax,ay)=frames('wall_depth','rise')
f=fs[11]; a=f[:,:,3]
for y in range(225,266):
    print('%3d '%y+''.join('#' if a[y,x]==255 else ('+' if a[y,x]>=128 else ('.' if a[y,x]>0 else ' ')) for x in range(0,132)))
