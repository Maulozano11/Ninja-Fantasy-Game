import sys, json
def load(p):
    s=open(p).read()
    k=s.index('export const EV3_REF')
    i=s.index('{',k)
    dec=json.JSONDecoder()
    obj,_=dec.raw_decode(s[i:])
    k2=s.index('export const EV3_SCALE'); i2=s.index('{',k2); sc,_=dec.raw_decode(s[i2:])
    return obj, sc, s
a,sa,ta=load(sys.argv[1]); b,sb,tb=load(sys.argv[2])
print('scale same', sa==sb)
for k in sorted(set(a)|set(b)):
    print(k, 'same' if a.get(k)==b.get(k) else 'DIFF', '' if a.get(k)==b.get(k) else [p for p in set(a[k]['pieces'])|set(b[k]['pieces']) if a[k]['pieces'].get(p)!=b[k]['pieces'].get(p)] + (['pal'] if a[k]['pal']!=b[k]['pal'] else []) + (['size'] if (a[k]['w'],a[k]['h'],a[k]['anchor'])!=(b[k]['w'],b[k]['h'],b[k]['anchor']) else []))
