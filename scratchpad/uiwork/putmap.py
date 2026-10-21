# usage: putmap.py CONSTNAME painter.py  -> replaces the const array in ui-battle-pieces.ts
import sys,subprocess
name,painter=sys.argv[1],sys.argv[2]
p='/home/user/Ninja-Fantasy-Game/tools/ui/ui-battle-pieces.ts'
s=open(p).read()
a=s.index('const %s = [\n'%name); b=s.index('];\n',a)
rows=subprocess.run(['python3',painter],capture_output=True,text=True,check=True).stdout
s=s[:a]+'const %s = [\n'%name+rows+s[b:]
open(p,'w').write(s)
