p = 'tools/refs/scarlet-study.py'
s = open(p).read()

# 1. sword masks: blade polygon, hilt drawn by hand
old = s[s.index("# His sword: thick lines"):s.index("# Mends in his pixels, before anything is cut")]
new = '''# His sword's blade (polygon, his pixels): from the cross-guard to the point, its black line round it.
# The hilt (pommel, grip, cross-guard) is drawn by hand at our scale (LAYER_PATCHES['hilt']): at 0.6
# it is a few pixels each, his grip is hidden under his glove and his cuff, and his guard lies on
# his coat and cape, so it is drawn as he drew it rather than cut out of them.
BLADE = [(37.5, 122.5), (44.5, 122.5), (50.5, 126.5), (50, 130.5), (47, 135.5), (43, 140.5), (36, 150.5), (28, 160.5),
         (21, 170.5), (16, 175.5), (12, 180), (9, 180), (9.5, 176), (10.5, 174), (13, 169.5), (19.5, 159.5),
         (25.5, 149.5), (32.5, 139.5), (34.5, 134.5), (37, 129.5)]
# His cross-guard and pommel, to keep them out of the coat (the guard lies on his near skirt, MEND_ROWS).
HILT = [((64.5, 101.5), (57, 112.5), 2.6), ((37.5, 112.5), (58.5, 134), 2.2), ((50, 120), (45.5, 127), 3.0)]

'''
s = s.replace(old, new)

# 2. his(): blade polygon mask, hilt capsules
a = '''    M = {}
    for name, lines in (('hilt', SWORD_HILT), ('blade', SWORD_BLADE)):
        m = np.zeros((H, W), bool)
        for a, b, hw in lines:
            m |= capsule(a, b, hw, cx, cy)
        M[name] = m & ~skin & fig & ~inside(PARTS['handN'], cx, cy) & ~inside(PARTS['armN'], cx, cy)
    M['blade'] &= ~M['hilt']
    taken = ~fig | M['hilt'] | M['blade']'''
assert a in s
s = s.replace(a, '''    M = {}
    hilt = np.zeros((H, W), bool)
    for a, b, hw in HILT:
        hilt |= capsule(a, b, hw, cx, cy)
    M['hilt'] = hilt & ~skin & fig & ~inside(PARTS['handN'], cx, cy) & ~inside(PARTS['armN'], cx, cy)
    M['blade'] = inside(BLADE, cx, cy) & fig & ~M['hilt']
    taken = ~fig | M['hilt'] | M['blade']''')

# 3. NEAREST / sword sampling
a = '''# The sword's parts take the one colour of his under each pixel's middle, so its black line, steel
# edges and red core stay apart.
NEAREST = {'blade', 'hilt'}'''
assert a in s
s = s.replace(a, '''# The blade takes, for each of our pixels, his commonest colour along the blade through the point
# under its middle (5 of his pixels along, one across): his black line, his steel edges and his red
# core stay apart, each an unbroken band, and his JPEG speckle along them goes.
NEAREST = {'blade', 'hilt'}
ALONG = 2''')

# 4. PATCHES -> LAYER_PATCHES + PATCHES
a = '''# Mends by hand, in our frame: (x0, y0, rows); '.' keeps the pixel, '_' clears it, any other
# character is that colour of his (scarlet_ref.CHARS).
PATCHES = []'''
assert a in s
s = s.replace(a, '''# Mends by hand, in our frame: (x0, y0, rows); '.' keeps the pixel, '_' clears it, any other
# character is that colour of his (scarlet_ref.CHARS). LAYER_PATCHES go on one part's own layer
# (scarlet_ref.reduced_layers(): what of it the parts in front hide too); PATCHES on the finished
# figure, after his black line.
LAYER_PATCHES = {}
PATCHES = []''')

# 5. blade sampler + layers + compose
old = s[s.index("def build():"):s.index("def to_rgba(idx):")]
new = '''def blade_layer(seg, Q, mask, box):
    """The blade on our box: for each of our pixels, his commonest colour along the blade (ALONG of
    his pixels either way) through the point under its middle; -1 off the blade."""
    x0, y0, x1, y1 = box
    H, W = Q.shape
    yy, xx = np.mgrid[y0:y1, x0:x1]
    p = R.backward(seg, np.stack([xx.ravel() + 0.5, yy.ravel() + 0.5], 1))
    a, b = (np.asarray(v, float) for v in seg['his'][:2])
    u = (b - a) / np.hypot(*(b - a))
    out = np.full(len(p), -1)
    for i, (px, py) in enumerate(p):
        ix, iy = int(np.floor(px)), int(np.floor(py))
        if not (0 <= ix < W and 0 <= iy < H and mask[iy, ix]):
            continue
        votes = []
        for k in range(-ALONG, ALONG + 1):
            jx, jy = int(np.floor(px + k * u[0])), int(np.floor(py + k * u[1]))
            if 0 <= jx < W and 0 <= jy < H and mask[jy, jx]:
                votes.append(int(Q[jy, jx]))
        out[i] = max(sorted(set(votes)), key=lambda c: (votes.count(c), c == Q[iy, ix]))
    return out.reshape(y1 - y0, x1 - x0)


def layers():
    """Each part of him on our box, alone (what the parts in front of it hide included): a dict of
    (h, w) PALETTE indices, -1 where it is not."""
    N, Q, N0, Q0, M = his()
    box = REDUCED_BOX
    h, w = box[3] - box[1], box[2] - box[0]
    gold = {ci(c) for c in GOLD}
    out = {}
    for name in ORDER:
        seg = R.SEGMENTS[name]
        mask = np.zeros(Q.shape, bool)
        for src in SOURCE.get(name, [name]):
            mask |= M[src]
        n, q = (N0, Q0) if name in NEAREST else (N, Q)
        if seg.get('quarter_turns'):
            k = seg['quarter_turns']
            n, q, mask = turn(n, k), turn(q, k), turn(mask, k)
        if name == 'hilt':
            r = np.full((h, w), -1)
        elif name == 'blade':
            r = blade_layer(seg, q, mask, box)
        else:
            r = reduce_part(name, seg, n, q, mask, box, gold)
        if name in SPLAT:
            sp = splat(seg, q, mask, gold, box)
            on = (sp >= 0) & (r >= 0)
            r[on] = sp[on]
        out[name] = patch(r, box, LAYER_PATCHES.get(name, []))
    return out


def compose(lay):
    """The parts back to front, his black line, his pinstripes and the PATCHES: (idx, part)."""
    box = REDUCED_BOX
    h, w = box[3] - box[1], box[2] - box[0]
    idx = np.full((h, w), -1)
    part = np.full((h, w), '', dtype='<U6')
    for name in ORDER:
        put = lay[name] >= 0
        idx[put] = lay[name][put]
        part[put] = name
    idx = outline(idx, part)
    idx = stripes(idx, part, box)
    idx = patch(idx, box, PATCHES)
    part[idx < 0] = ''
    return idx, part


def build():
    N, Q, N0, Q0, M = his()
    idx, part = compose(layers())
    return N, Q, M, idx, part


'''
s = s.replace(old, new)
a = '''def patch(idx, box):
    x0, y0 = box[:2]
    for px, py, rows in PATCHES:'''
assert a in s
s = s.replace(a, '''def patch(idx, box, patches):
    x0, y0 = box[:2]
    idx = idx.copy()
    for px, py, rows in patches:''')
open(p, 'w').write(s)
