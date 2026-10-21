import re, json, sys
p='/home/user/Ninja-Fantasy-Game/src/data/shinobiData.ts'
s=open(p).read()
N=json.load(open(sys.argv[1]))
q=lambda t: t.replace("'","\\'")
for jid,(en,es,desc) in N.items():
    m=re.search(r"\n    id: '%s',\n"%jid, s)
    assert m, jid
    start=m.start(); end=s.index("\n  },", start)
    block=s[start:end]
    b2,n=re.subn(r"\n    name: '(?:[^'\\]|\\.)*',", lambda _: "\n    name: '%s',"%q(en), block, count=1)
    assert n==1, jid
    b2,n=re.subn(r"\n    nameEs: '(?:[^'\\]|\\.)*',", lambda _: "\n    nameEs: '%s',"%q(es), b2, count=1)
    if n==0:
        b2=b2.replace("\n    name: '%s',"%q(en), "\n    name: '%s',\n    nameEs: '%s',"%(q(en),q(es)),1)
    dm=re.search(r"\n    description: (?:'(?:[^'\\]|\\.)*'|\"(?:[^\"\\]|\\.)*\"|`[^`]*`)(?: \+\n(?:      [^\n]*))*,", b2)
    assert dm, jid
    b2=b2[:dm.end()]+"\n    descriptionEs: '%s',"%q(desc)+b2[dm.end():]
    s=s[:start]+b2+s[end:]
s=s.replace("nameEnh: 'Great Fireball',","nameEnh: 'Fire Technique: Great Fireball',",1)
s=s.replace("nameEnhEs: 'Gran bola de fuego',","nameEnhEs: 'Técnica de Fuego: Gran bola de fuego',",1)
open(p,'w').write(s)
print('ok', len(N))
