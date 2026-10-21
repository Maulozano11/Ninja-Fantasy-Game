"""mkfly.py <base.json> <out.json> 'i:key=val,key=val;i:...' : overrides FLY entries (legs keys nf ff nh fh tail tip head,
other keys pitch eye scale hz)."""
import json, sys
fly = json.load(open(sys.argv[1]))
LEGS = {'nf', 'ff', 'nh', 'fh', 'tail', 'tip', 'curl', 'nhf'}
for part in sys.argv[3].split(';'):
    if not part.strip():
        continue
    i, kv = part.split(':')
    f = fly[int(i)]
    for item in kv.split(','):
        k, v = item.split('=')
        if k in LEGS:
            f['legs'][k] = float(v)
        elif k == 'dust_at' or k == 'clod_at':
            f[k] = [float(x) for x in v.split('/')]
        else:
            f[k] = float(v)
json.dump(fly, open(sys.argv[2], 'w'), indent=1)
