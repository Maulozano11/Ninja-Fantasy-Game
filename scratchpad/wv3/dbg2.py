import runpy, sys, numpy as np
from PIL import Image
SP = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
sys.argv = ['x', SP + '/art2/REF-wind-set-owner.jpg', SP + '/wv3/refdata.ts']
g = runpy.run_path('/home/user/Ninja-Fantasy-Game/tools/refs/wind-from-ref.py')
name = sys.argv[1] if len(sys.argv) > 1 else 'blast'
for name in ['blast', 'bolt', 'wall']:
    st = g['stage'][name]; pal = g['PALS'][name]
    img = st['img']; raw = st['raw']
    a = img[..., 3:]
    comp = img[..., :3] * a + np.array([32, 32, 42.]) * (1 - a)
    idx = g['QUANT'][name][0]
    q = g['render'](idx, pal); qc = g['over'](q, (32, 32, 42))
    lab = g['lab']
    e1 = np.sqrt(((lab(comp) - lab(raw)) ** 2).sum(-1)); e2 = np.sqrt(((lab(qc) - lab(raw)) ** 2).sum(-1))
    print(name, 'unquantized dE mean', e1.mean().round(2), 'quantized dE', e2.mean().round(2), 'lum raw', g['lum'](raw).mean().round(1), 'unq', g['lum'](comp).mean().round(1), 'q', g['lum'](qc).mean().round(1))
    H, W = raw.shape[:2]
    row = np.concatenate([raw, comp, qc], 1)
    Image.fromarray(np.clip(row, 0, 255).astype(np.uint8)).resize((W * 3 * 3, H * 3), Image.NEAREST).save(SP + f'/wv3/look/dbg-{name}.png')
for name in ['blast', 'bolt', 'wall']:
    st = g['stage'][name]; pal = g['PALS'][name]
    img = st['img']
    a = img[..., 3:]
    comp = img[..., :3] * a + np.array([32, 32, 42.]) * (1 - a)
    idx = g['QUANT'][name][0]
    qc = g['over'](g['render'](idx, pal), (32, 32, 42))
    lab = g['lab']
    e = np.sqrt(((lab(comp) - lab(qc)) ** 2).sum(-1))
    op = img[..., 3] >= 1; tr = (img[..., 3] > 0) & ~op
    print(name, 'opaque px', op.sum(), 'err', e[op].mean().round(2), '| translucent px', tr.sum(), 'err', e[tr].mean().round(2), '| alpha of translucent: median', np.median(img[tr][:, 3]).round(2))
print('---')
for name in ['blast', 'bolt', 'wall']:
    st = g['stage'][name]; pal = g['PALS'][name]
    img = st['img']; op = img[..., 3] >= 1
    lab = g['lab']
    q0 = pal.quantize(img)
    c0 = pal.rgb(q0)
    e = np.sqrt(((lab(img[..., :3]) - lab(c0)) ** 2).sum(-1))
    q1 = pal.clean(q0); c1 = pal.rgb(q1)
    e1 = np.sqrt(((lab(img[..., :3]) - lab(c1)) ** 2).sum(-1))
    fam = g['family'](img[op][:, :3])
    print(name, 'quantize-only err', e[op].mean().round(2), 'after clean', e1[op].mean().round(2), 'fam counts', np.bincount(fam, minlength=3), 'pal fams', np.bincount(pal.fam, minlength=3))
