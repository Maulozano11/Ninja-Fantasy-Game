# usage: insert.py NEWFILE -- inserts the section before the BUILD banner (file must start with a banner and not end with one)
import sys
p='/home/user/Ninja-Fantasy-Game/tools/world-sprites/animals.ts'
s=open(p).read()
new=open(sys.argv[1]).read()
if new.rstrip().endswith('// ============================================================================================='):
    new=new.rstrip()
    new=new[:new.rfind('\n')+1]
i=s.index('// BUILD\n')
i=s.rfind('// ====',0,i)
s=s[:i]+new.rstrip()+'\n\n'+s[i:]
open(p,'w').write(s)
