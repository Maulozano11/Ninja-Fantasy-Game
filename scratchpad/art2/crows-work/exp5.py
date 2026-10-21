exec(open('exp1.py').read().split("f0 = key_frame('L')")[0])
from PIL import Image
fr = fly()
for i, f in enumerate(fr):
    cr = META[id(f)]['crows']
    print('fly', i, 'visible crows', sum(1 for c in cr.values() if c['visible'] >= 0.05), {k: round(v['visible'], 2) for k, v in cr.items()})
sm = summon()
for i, f in enumerate(sm):
    cr = META[id(f)]['crows']
    print('summon', i, {k: round(v['visible'], 2) for k, v in cr.items()})
# fly 5 without feathers, to see what the hook by L2's beak is
def back(n):
    dest = eye(BACK[n]); pos = eye(n) + (dest - eye(n)) * 0.5; w = WHOLE_BACK.get(n, n)
    return at(w, pos, wings=wings(w, 5), mirror=(BY[BACK[n]]['face'] < 0) != (BY[w]['face'] < 0))
def sink(n):
    u = (VC - eye(n)) / np.linalg.norm(VC - eye(n))
    return at(n, eye(n) + u * SINK[n], wings=wings(n, 5), dark=0.3)
a = compose([smoke(tail=SMOKE5, dx=-8, dy=1)] + [sink(n) for n in SINK] + [vortex(-30, V5)] + [back(n) for n in BACK])
b = compose([back('R2')])
out = []
for f in (fr[5], a, b):
    t = Image.new('RGBA', (OW, OH), (0x5d, 0x6b, 0x57, 255)); t.alpha_composite(Image.fromarray(f, 'RGBA'))
    out.append(t.crop((150, 30, 230, 100)))
s = Image.new('RGBA', (83 * 3, 70)); [s.paste(t, (i * 83, 0)) for i, t in enumerate(out)]
s.resize((s.width * 6, s.height * 6), Image.NEAREST).save('hook.png')
