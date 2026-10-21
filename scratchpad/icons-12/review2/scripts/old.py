import sys, importlib.util, numpy as np
spec = importlib.util.spec_from_file_location('m', sys.argv[3]); 
src = open(sys.argv[3]).read().split('res = {}')[0]
g = {}; sys.argv = sys.argv[:3]; exec(src, g)
WT, R = sys.argv[1], sys.argv[2]; ST = R + '/stage/ref'
for jid, old0, new0 in (('lightning_hound_raidon', 29, 25), ('crescent_moon_dance', 6, 4), ('temple_of_nirvana', 9, 11)):
    win = g['load'](f'{ST}/{jid}@window.png')
    for rev, o0 in (('cd8e07b', old0), ('a30eadc', new0), ('HEAD', new0)):
        W = win[:, o0:o0+115]
        out = {}
        for N, f in ((88, f'src/assets/ui_icons/{jid}@2x.png'), (44, f'src/assets/ui_icons/{jid}.png')):
            o = g['gitimg'](rev, f)
            ref = g['area'](W, N)
            pal = np.array(sorted(set(map(tuple, o.reshape(-1, 3).astype(int)))))
            d, l = g['blocks'](o, ref, N // 11)
            dp, lp = g['blocks'](g['onpal'](ref, pal), ref, N // 11)
            s, b = g['small_and_bright'](o)
            out[N] = f'diff {d.mean():.2f} (plain {dp.mean():.2f}) light {l.mean():+.2f} (plain {lp.mean():+.2f}) ge2 {(l>=2).sum()} max {l.max():.2f} small {s} bright {b}'
        print(jid, rev, o0, '\n   88:', out[88], '\n   44:', out[44])
