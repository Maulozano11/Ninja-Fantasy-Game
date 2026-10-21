p = 'tools/refs/scarlet-upper-from-ref.py'
s = open(p).read()
old = '''    # Our torso under the coat: his shirt carried on out to its sides, each row in the white he drew
    # at the opening's edge on that side (lit on the near side of the cravat, in shade on the far side,
    # darker toward the tucked-in hem, as his is), a shade darker where it turns away at the far side
    # and at the very near edge; the cravat wrapped round the neck at the top (his dark reds under the
    # collar); his line round it, open at the hem (tucked in).'''
new = '''    # Our torso under the coat: his shirt carried on out to its sides, each side of the cravat in his
    # whites on that side (lit on the near side, in shade on the far side, darker toward the tucked-in
    # hem, as his is), taken as the middle white of his five rows round each row so it falls in soft
    # bands rather than his one-pixel stripes; a shade darker where it turns away at the far side and
    # at the very near edge; the cravat wrapped round the neck at the top (his dark reds under the
    # collar); his line round it, open at the hem (tucked in).'''
assert old in s
s = s.replace(old, new)
old = '''    def his(y, near):
        r = min(wrows, key=lambda k: (abs(k - y), k))
        xs = np.nonzero(whites[r])[0]
        return R.CHARS[tor[r, xs.min() if near else xs.max()]]
'''
new = '''    def his(y, near):
        y = min(max(y, wrows.min() + 2), wrows.max() - 2)
        ks = []
        for r in range(y - 2, y + 3):
            xs = np.nonzero(whites[r] & ((xx[r] < mid) if near else (xx[r] > mid)))[0]
            ks += [WHITES.index(R.CHARS[tor[r, x]]) for x in xs]
        return WHITES[int(np.median(ks))]
'''
assert old in s
s = s.replace(old, new)
open(p, 'w').write(s)
