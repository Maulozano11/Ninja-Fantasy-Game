for thr in (52, 35, 25, 18):
    px = []
    for k in PICS:
        L = LAY[k]
        for cr in L['crows']:
            e = cr['mask'] & dilate(~L['fg'], 1)
            p_ = L['rgb'][e]
            px.append(p_[lum(p_) < thr])
    px = np.concatenate(px)
    print(thr, len(px), np.median(px, 0), np.percentile(lum(px), [10, 50, 90]))
# also edge pixels at game scale (key pieces outer edge) 
