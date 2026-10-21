p = 'tools/refs/scarlet-upper-from-ref.py'
s = open(p).read()
a = s.index("    # Our torso under the coat: his whites")
b = s.index("    idx[ours] = shirt[ours]")
s = s[:a] + '''    # Our torso under the coat: his shirt carried on out to its sides, each row in the white he drew
    # at the opening's edge on that side (lit on the near side of the cravat, in shade on the far side,
    # darker toward the tucked-in hem, as his is), a shade darker where it turns away at the far side
    # and at the very near edge; the cravat wrapped round the neck at the top (his dark reds under the
    # collar); his line round it, open at the hem (tucked in).
    torso = grow(lay[..., 1] == PART['torso']) & (yy >= 146)
    ours = torso & (yy <= 171) & (idx == NONE)
    rows = np.nonzero(ours.any(1))[0]
    whites = vis & (tcls == 'W')
    wrows = np.nonzero(whites.any(1))[0]
    mid = (OPENING[0] + OPENING[2]) / 2

    def his(y, near):
        r = min(wrows, key=lambda k: (abs(k - y), k))
        xs = np.nonzero(whites[r])[0]
        return R.CHARS[tor[r, xs.min() if near else xs.max()]]

    shirt = np.zeros((G, G), np.int32)
    for y in rows:
        xs = np.nonzero(torso[y])[0]
        x0, x1 = xs.min(), xs.max()
        for x in np.nonzero(ours[y])[0]:
            near = x < mid
            k = WHITES.index(his(y, near)) + (1 if (near and x - x0 <= 1) or (not near and x1 - x <= 3) else 0)
            shirt[y, x] = ci(WHITES[min(k, len(WHITES) - 1)])
    top = int(rows.min())
    wrap = ours & (yy <= top + 4) & box(CRAVAT_NECK[0], 0, CRAVAT_NECK[2], G - 1)
    for y, x in zip(*np.nonzero(wrap)):
        shirt[y, x] = ci(REDS[1] if y - top >= 3 or (x + y) % 3 else REDS[0])
''' + s[b:]
open(p, 'w').write(s)
