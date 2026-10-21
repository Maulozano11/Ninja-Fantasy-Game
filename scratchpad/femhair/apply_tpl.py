"""Replace TPL fronts/backs in hair.ts from a JSON {id: {f, fa, b?, ba?}}. Usage: apply_tpl.py styles.json [ids...]"""
import json, re, sys
HAIR = '/home/user/Ninja-Fantasy-Game/src/sprite/items/hair.ts'
src = open(HAIR).read()
data = json.load(open(sys.argv[1]))
only = [a.split(':')[0] for a in sys.argv[2:]]

def block(rows, ind):
    return '[\n' + ''.join(f"{ind}  '{r}',\n" for r in rows) + f'{ind}]'

for sid, d in data.items():
    if only and sid not in only:
        continue
    m = re.search(r'\n  ' + sid + r': \{\n(.*?)\n  \},\n', src, re.S)
    assert m, sid
    body = m.group(1)
    def put(body, key, rows, anchor):
        # replace or insert `key: [...]` and `keya: [x, y]`
        ka = key + 'a'
        if re.search(r'\n?    ' + ka + r': \[[^\]]*\],', body):
            body = re.sub(r'    ' + ka + r': \[[^\]]*\],', f'    {ka}: [{anchor[0]}, {anchor[1]}],', body)
        else:
            body = body + f'\n    {ka}: [{anchor[0]}, {anchor[1]}],'
        if re.search(r'    ' + key + r': \[\n.*?\n    \],', body, re.S):
            body = re.sub(r'    ' + key + r': \[\n.*?\n    \],', lambda _: f'    {key}: ' + block(rows, '    ') + ',', body, flags=re.S)
        else:
            body = body + f'\n    {key}: ' + block(rows, '    ') + ','
        return body
    if 'f' in d:
        body = put(body, 'f', d['f'], d['fa'])
    if 'b' in d:
        body = put(body, 'b', d['b'], d['ba'])
    src = src[:m.start(1)] + body + src[m.end(1):]
    print('applied', sid)
open(HAIR, 'w').write(src)
