for k in (0, 5):
    masks, base_ = split[k]
    cs = sorted(components(base_), key=len, reverse=True)
    off = keys[k][4]
    print('key', k, 'base components', len(cs), 'sizes', [len(c) for c in cs[:3]], 'small ones (size, sheet x, y):',
          [(len(c), int(sum(p[1] for p in c) / len(c)) + off[0], int(sum(p[0] for p in c) / len(c)) + off[1]) for c in cs[1:]])
