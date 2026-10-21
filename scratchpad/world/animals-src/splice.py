# usage: splice.py START_MARKER END_MARKER NEWFILE  -- replaces text from the line containing START up to (not incl.) the line containing END
import sys
p='/home/user/Ninja-Fantasy-Game/tools/world-sprites/animals.ts'
start, end, newf = sys.argv[1], sys.argv[2], sys.argv[3]
s=open(p).read()
a=s.index(start); a=s.rfind('\n',0,a)+1
b=s.index(end, a); b=s.rfind('\n',0,b)+1
# keep the banner line above END (=== line) if END is a banner title
s=s[:a]+open(newf).read()+s[b:]
open(p,'w').write(s)
