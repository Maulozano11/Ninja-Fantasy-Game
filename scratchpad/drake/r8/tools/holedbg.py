f = FLY[6]
fr, b, t = pose(f['k'], f['pitch'], f.get('eye', 0.0), f['legs'], f.get('dust_at'), f.get('scale', 1.0), f.get('hz', 0.0), f.get('feet', False), f.get('clod_at'))
print(fr[144:151, 50:55, 3])
