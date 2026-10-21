import sys, os
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/approve/_work/12-avance')
from common import *
from math import lcm
import numpy as np

NEW = load_manifest(W + '/snap/new/manifest.json')
PHX = ('Fénix (aprobado · listón)', W + '/snap/old/fire.png', load_manifest(W + '/snap/old/fire.manifest.json')['beast'], 'ref')
CHAR = ('Personaje (escala 1,7 m)', None, None, 'char')
def nb(key, name):
    return (name + ' (nueva)', W + '/snap/new/' + NEW[key]['file'], NEW[key], 'new')

SETS = {
    'a': ('6 cuadros', [PHX, nb('wind', 'Viento'), nb('lightning', 'Rayo'), nb('genjutsu', 'Genjutsu'), nb('chakra', 'Chakra'), CHAR], 3),
    'b': ('8 cuadros', [nb('water', 'Agua'), nb('earth', 'Tierra'), nb('poison', 'Veneno'), CHAR], 2),
}
Z = 2
CW, CH = 157 * Z + 18, 121 * Z + 34
TOP = 66
ch = Image.open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art3/char0.png').convert('RGBA')
ch = up(ch.crop(ch.getbbox()), Z)

for tag, (sub, items, COLS) in SETS.items():
    ROWS = (len(items) + COLS - 1) // COLS
    GW, GH = COLS * CW, ROWS * CH + TOP
    fps = 12
    N = 1
    seqs = []
    for _, p, sp, kind in items:
        if kind == 'char':
            seqs.append(None); continue
        assert sp['anims']['fly']['fps'] == fps
        N = lcm(N, sp['anims']['fly']['frames'])
        seqs.append(frames_of(p, sp, 'fly'))
    g = up(ground(100 + (0 if tag == 'a' else 40), 400, GW // Z + 1, (GH - TOP) // Z + 1), Z)
    fT = font(20, True); fS = font(15); fL = font(15, True)
    frames = []; masks = []
    for t in range(N):
        mk = Image.new('L', (GW, GH), 0)
        fr = Image.new('RGBA', (GW, GH), BG)
        fr.alpha_composite(g.crop((0, 0, GW, GH - TOP)), (0, TOP))
        d = ImageDraw.Draw(fr)
        d.rectangle((0, 0, GW, TOP - 3), fill=TITLEBG)
        d.rectangle((0, TOP - 3, GW, TOP), fill=GOLD)
        text(d, (14, 8), '12 · AVANCE — Bestias en vuelo (en proceso)', fT, WHITE)
        text(d, (14, 38), f'{sub} · 12 fps · zoom 2x · sobre el césped real del mapa', fS, GREY)
        for i, ((name, p, sp, kind), seq) in enumerate(zip(items, seqs)):
            cx, cy = (i % COLS) * CW, TOP + (i // COLS) * CH
            if kind == 'char':
                pos = (cx + (CW - ch.width) // 2, cy + CH - ch.height - 8)
                fr.alpha_composite(ch, pos); mk.paste(ch.getchannel('A'), pos, ch.getchannel('A'))
            else:
                f = up(seq[t % len(seq)], Z)
                pos = (cx + (CW - f.width) // 2, cy + 28 + (CH - 28 - f.height) // 2)
                fr.alpha_composite(f, pos); mk.paste(f.getchannel('A'), pos, f.getchannel('A'))
            tw = int(d.textlength(name, font=fL))
            d.rounded_rectangle((cx + 8, cy + 6, cx + 8 + tw + 14, cy + 28), 5, fill=(60, 40, 8, 230) if kind == 'ref' else (12, 15, 18, 215))
            text(d, (cx + 15, cy + 9), name, fL, GOLD if kind == 'ref' else WHITE)
        frames.append(fr.convert('RGB')); masks.append(np.array(mk) > 0)
    # palette training set: all frames once + sprite pixels repeated (sprites get most of the 255 entries)
    allpx = np.concatenate([np.array(f).reshape(-1, 3) for f in frames])
    spx = np.concatenate([np.array(f)[m] for f, m in zip(frames, masks)])
    train = np.concatenate([allpx[::4]] + [spx] * 6)
    side = int(np.ceil(np.sqrt(len(train))))
    buf = np.zeros((side * side, 3), np.uint8); buf[:len(train)] = train; buf[len(train):] = train[0]
    pal = Image.fromarray(buf.reshape(side, side, 3)).quantize(colors=255, method=Image.Quantize.MEDIANCUT)
    pframes = [f.quantize(palette=pal, dither=Image.Dither.NONE) for f in frames]
    errs = []; gerr = []
    for f, q, m in zip(frames, pframes, masks):
        e = np.abs(np.array(f).astype(int) - np.array(q.convert('RGB')).astype(int)).max(-1)
        errs.append(e[m]); gerr.append(e[~m])
    errs = np.concatenate(errs); gerr = np.concatenate(gerr)
    print(tag, 'sprite err p50/p99/max', int(np.percentile(errs, 50)), int(np.percentile(errs, 99)), int(errs.max()), '| grass p50/p99', int(np.percentile(gerr, 50)), int(np.percentile(gerr, 99)))
    # cumulative rounding to GIF's 10 ms ticks: the cycle averages exactly 1000/fps
    cum = [round(i * 1000 / fps, -1) for i in range(N + 1)]
    dur = [int(cum[i + 1] - cum[i]) for i in range(N)]
    out = OUT + f'/12-avance-bestias-vuelo-{tag}.gif'
    pframes[0].save(out, save_all=True, append_images=pframes[1:], duration=dur, loop=0, disposal=2, optimize=False)
    # contact strip from the saved GIF itself
    gi = Image.open(out); fl = []
    try:
        while True:
            fl.append((gi.convert('RGB').copy(), gi.info.get('duration'))); gi.seek(gi.tell() + 1)
    except EOFError:
        pass
    cols = 2
    strip = Image.new('RGB', (GW // 2 * cols, GH // 2 * ((len(fl) + cols - 1) // cols)), (0, 0, 0))
    for i, (f, _) in enumerate(fl):
        strip.paste(f.resize((GW // 2, GH // 2), Image.NEAREST), ((i % cols) * (GW // 2), (i // cols) * (GH // 2)))
    strip.save(W + f'/chk_gif_{tag}.png'); fl[0][0].save(W + f'/chk_gif_{tag}_f0.png')
    print(tag, N, 'frames', GW, GH, round(os.path.getsize(out) / 1e6, 2), 'MB', 'durations', [x for _, x in fl])
