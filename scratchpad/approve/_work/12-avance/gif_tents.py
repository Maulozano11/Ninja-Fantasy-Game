import sys, os
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/approve/_work/12-avance')
from common import *
T = W + '/snap/tents/'
NEWM = load_manifest(T + 'manifest.json'); OLDM = load_manifest(T + 'approved_manifest.json')
items = [('Actual (aprobada)', T + 'approved_tent.png', OLDM['tent'], True),
         ('Nueva grande', T + 'tent_large.png', NEWM['tent_large'], False),
         ('Nueva pequeña', T + 'tent_small.png', NEWM['tent_small'], False)]
fps = {s['anims']['idle']['fps'] for _, _, s, _ in items}; assert fps == {4}, fps
nfs = {s['anims']['idle']['frames'] for _, _, s, _ in items}; assert nfs == {4}, nfs
seqs = [frames_of(p, s, 'idle') for _, p, s, _ in items]
ch = Image.open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art3/char0.png').convert('RGBA')
ch = up(ch.crop(ch.getbbox()), 2)
Z = 2; TOP = 66; GAP = 36; M = 24
GW = M * 2 + sum(s['frameW'] * Z for _, _, s, _ in items) + ch.width + GAP * 3
GH = TOP + 20 + max(s['anchor'][1] for _, _, s, _ in items) * Z + 60
gy = TOP + 20 + max(s['anchor'][1] for _, _, s, _ in items) * Z
g = up(ground(60, 380, GW // Z + 1, (GH - TOP) // Z + 1), Z)
frames = []; masks = []
for t in range(4):
    fr = Image.new('RGBA', (GW, GH), BG); mk = Image.new('L', (GW, GH), 0)
    fr.alpha_composite(g.crop((0, 0, GW, GH - TOP)), (0, TOP))
    d = ImageDraw.Draw(fr)
    d.rectangle((0, 0, GW, TOP - 3), fill=TITLEBG); d.rectangle((0, TOP - 3, GW, TOP), fill=GOLD)
    text(d, (14, 8), '12 · AVANCE — Tiendas de campaña: la lona con el viento (en proceso)', font(20, True), WHITE)
    text(d, (14, 38), '4 cuadros · 4 fps · zoom 2x · sobre el césped real del mapa · personaje para escala', font(15), GREY)
    x = M
    for (name, p, s, ref), seq in zip(items, seqs):
        f = up(seq[t], Z); pos = (x, gy - s['anchor'][1] * Z)
        fr.alpha_composite(f, pos); mk.paste(f.getchannel('A'), pos, f.getchannel('A'))
        tw = int(d.textlength(name, font=font(16, True)))
        cx = x + s['frameW'] * Z // 2
        d.rounded_rectangle((cx - tw // 2 - 8, gy + 14, cx + tw // 2 + 8, gy + 40), 5, fill=(60, 40, 8, 230) if ref else (12, 15, 18, 215))
        text(d, (cx, gy + 18), name, font(16, True), GOLD if ref else WHITE, 'ma')
        x += s['frameW'] * Z + GAP
    pos = (x, gy + Z - ch.height); fr.alpha_composite(ch, pos); mk.paste(ch.getchannel('A'), pos, ch.getchannel('A'))
    frames.append(fr.convert('RGB')); masks.append(np.array(mk) > 0)
allpx = np.concatenate([np.array(f).reshape(-1, 3) for f in frames])
spx = np.concatenate([np.array(f)[m] for f, m in zip(frames, masks)])
train = np.concatenate([allpx[::4]] + [spx] * 3)
side = int(np.ceil(np.sqrt(len(train))))
buf = np.zeros((side * side, 3), np.uint8); buf[:len(train)] = train; buf[len(train):] = train[0]
pal = Image.fromarray(buf.reshape(side, side, 3)).quantize(colors=255, method=Image.Quantize.MEDIANCUT)
pfr = [f.quantize(palette=pal, dither=Image.Dither.NONE) for f in frames]
e = np.concatenate([np.abs(np.array(f).astype(int) - np.array(q.convert('RGB')).astype(int)).max(-1)[m] for f, q, m in zip(frames, pfr, masks)])
out = OUT + '/12-avance-tiendas.gif'
pfr[0].save(out, save_all=True, append_images=pfr[1:], duration=[250] * 4, loop=0, disposal=2, optimize=False)
gi = Image.open(out); fl = []
try:
    while True:
        fl.append((gi.convert('RGB').copy(), gi.info.get('duration'))); gi.seek(gi.tell() + 1)
except EOFError:
    pass
strip = Image.new('RGB', (GW, GH * 2 // 2 * 2))
for i, (f, _) in enumerate(fl):
    strip.paste(f.resize((GW // 2, GH // 2), Image.NEAREST), ((i % 2) * (GW // 2), (i // 2) * (GH // 2)))
strip = strip.crop((0, 0, GW, GH))
strip.save(W + '/chk_gif_tents.png'); fl[1][0].save(W + '/chk_gif_tents_f1.png')
print(GW, GH, len(fl), [d for _, d in fl], round(os.path.getsize(out) / 1e6, 2), 'MB', 'sprite err p50/p99', int(np.percentile(e, 50)), int(np.percentile(e, 99)))
