# The 12 abilities: the current look (emulating playback.ts / vfxSprites.ts / renderer.ts) and
# options A and B, as scenes for strips and GIFs. Second pass, after the review:
#   - "Ahora" draws the chakra burst the battle puts on every cast, and the weapon stays stowed
#     after a seal jutsu; the options draw no burst (question for the owner);
#   - his dragon head moves and burns the way the generator does it in annihilation_enh (no dither,
#     no invented entry), his jet is shown whole, cuts are hidden by his own flames;
#   - nothing covers the caster or hides the target for long; no rotated pixels.
#   python3 -I mockups.py <n>[,<n>...]|all [strip|gif|all]
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vfxlib import *  # noqa

CX, CY = 420, 700  # the caster's feet (map px), on the flat grass left of the river
CAST = 560          # the effect starts 560 ms after the cast


def m(x, z=0.0, ox=CX, oy=CY):
    """Map pixel of a ground point x m right and z m deeper than (ox, oy)."""
    return ox + x * PXM, oy + z * PXD


def caster(sc, burst=False):
    """A seal jutsu: the stowed cast pose for 900 ms, then idle still stowed (engine.ts setArmed).
    burst: the chakra burst the game draws on every cast today (Aiden has it on)."""
    c = sc.unit('aiden', CX, CY, idle_look='aidenstow')
    c.pose(0, 'cast', look='aidenstow', dur=900, burst=burst)
    return c


def foe(sc, x, z=0.0, zbias=0.0):
    return sc.unit('rogue', *m(x, z), facing=-1, zbias=zbias)


def lift(p, h):
    return (p[0], p[1] - h)


def hit(sc, el, t, p, h=60, name='hit', mirror=False, depth=None):
    sh = S(el, name)
    sc.add(play(sh, 'hit', t, p[0], p[1] - h, max(1000, sh.ms('hit')), mirror=mirror, depth=depth))


def short_hit(sc, el, t, p, ms=450):
    """An element's hit cut to its peak and faded, for rapid blows."""
    sh = S(el, 'hit')
    sc.add(play(sh, 'hit', t, p[0], p[1], ms, fade=0.35))


def frames_plan(sh, anim, t0, x, y, plan, depth=None, mirror=False):
    """A sheet row played by a plan of (frame, ms): his frames, only re-timed (held, skipped)."""
    total = sum(ms for _, ms in plan)

    def fn(cv, t):
        if t < t0 or t >= t0 + total:
            return
        at = t - t0
        for fr, ms in plan:
            if at < ms:
                blit(cv, sh, anim, fr, x, y, mirror)
                return
            at -= ms
    return Fx(fn, depth)


def seal_ring(sc, t0, x, y, hold=600):
    """His chakra seal circle without the pillar: the blast's opening frames (0, 1), frame 1 held,
    then its last frames (12-15), where the pillar is already gone."""
    f = 1000 / 12
    sc.add(frames_plan(S('chakra', 'blast'), 'blast', t0, x, y, [(0, f), (1, hold), (12, f), (13, f), (14, f), (15, f)], depth='under'))
    return t0 + f + hold + 4 * f


def ease_in(u):
    return u * u


def lin(u):
    return u


ICON = REPO + '/src/assets/ui_icons/{}@2x.png'
RUN_MS_PER_M = 1000 / 5.5   # melee jutsu: the ninja runs in at 5.5 m/s
STOP = 1.1                  # stops this far (m) in front of the target


def melee_run(sc, target_x, stop=STOP):
    """The caster runs from CX to `stop` m before the target; returns (unit, L)."""
    c = sc.unit('aiden', CX, CY)
    run_m = target_x - stop
    L = round((run_m * RUN_MS_PER_M) / 50) * 50  # on the GIFs' 50 ms grid
    c.run(0, L, CX + run_m * PXM, CY)
    return c, L


def now_line(sc, el, reach_x_m, units):
    """The game today for a line jutsu: the stream + head from the caster (50 px up) to the clicked
    point, full at 1.8x speed (722 ms), fading over the last 20% of 1300 ms; damage at 560 + 900."""
    p0 = (CX, CY - 50)
    p1 = (CX + reach_x_m * PXM, CY - 50)
    dur = 1300
    sc.add(beam(el, CAST, p0, p1, dur / 1.8, dur - dur / 1.8 - dur * 0.2, dur * 0.2))
    for u in units:
        u.hurt(CAST + 900)


def beam_reach_times(t0, grow, x0, x1, xs):
    return [t0 + grow * max(0.0, min(1.0, (x - x0) / (x1 - x0))) for x in xs]


def now_melee(sc, el, TX):
    """The game today for a melee jutsu: run in, the weapon attack pose (900 ms), the element's hit
    on the target 560 ms later, damage 450 ms after that."""
    c, L = melee_run(sc, TX)
    f = foe(sc, TX)
    c.pose(L, 'attack', dur=900)
    hit(sc, el, L + 560, m(TX))
    f.hurt(L + 1010)
    sc.L, sc.t_end = L, L + 1600
    return c, f, L


# ------------------------------------------------------------------------------------------
# 1. Llama Dragón (dragon_fire_bomb): 9 m cone, 60 deg
# ------------------------------------------------------------------------------------------

AIM = -8  # where the cone points (deg): a little up the screen, so the fan stays on the grass
WALL_X, WALL_Y = CX - 190, CY - 14


def fire_wall(sc, t0, end, x=WALL_X, y=WALL_Y, half_=False, fade=667):
    sh = HalfSheet(S('fire', 'wall')) if half_ else S('fire', 'wall')
    w = seq(sh, [('rise', 1000), ('idle', None)], t0, x, y, end, fade_ms=fade, depth=y)
    sc.add(w)
    return w


def bolts_from(sc, head, launches, targets, ms_per_m=75, cover_bolt=True):
    """Fire bolts launched from his jet's tip (the bolt's tail covers the jet's cut end) to the first
    target on their line or the cone's edge (9 m from the caster); his fire hit where they land."""
    bolt = S('fire', 'bolt')
    lands = []
    for k, (t_l, ang) in enumerate(launches):
        a = math.radians(ang)
        end, who = (m(9 * math.cos(a), 9 * math.sin(a))[0], m(9 * math.cos(a), 9 * math.sin(a))[1] - 20), None
        for (tx, tz), u in targets:
            if abs(math.degrees(math.atan2(tz, tx)) - ang) < 4:
                end, who = lift(m(tx, tz), 60), u
        p0 = head.tip_at(t_l)
        p0 = (p0[0] + 18, p0[1])
        d_m = math.hypot(end[0] - p0[0], (end[1] - p0[1]) * PXM / PXD) / PXM
        dur = (d_m + 0.5) * ms_per_m
        sc.add(fly(bolt, 'fly', t_l, dur, p0, end, hump=0, ease=lin))
        sc.add(play(S('fire', 'hit'), 'hit', t_l + dur, end[0], end[1], 1000))
        lands.append(t_l + dur)
        if who:
            who.hurt(t_l + dur)
    if cover_bolt:
        # the next bolt forms at the tip as soon as the last one leaves
        t_first, t_last = launches[0][0], launches[-1][0]

        def fn(cv, t, head=head):
            if t < t_first or t >= t_last:
                return
            x, y = head.tip_at(t)
            blit(cv, bolt, 'fly', bolt.frame_at('fly', t), x + 18, y)
        sc.add(Fx(fn))
    return lands


def a1():
    crop = (CX - 365, CY - 380, 930, 550)
    T1 = (5.0 * math.cos(math.radians(4)), 5.0 * math.sin(math.radians(4)))
    T2 = (7.0 * math.cos(math.radians(-20)), 7.0 * math.sin(math.radians(-20)))

    # now: his fire breath popped 6 times along the cone's centre line, 1400 ms
    def now():
        sc = Scene(crop, 2300)
        caster(sc, burst=True)
        f1, f2 = foe(sc, *T1), foe(sc, *T2)
        br = S('fire', 'breath')
        dur, L = 1400, 9.0
        a = math.radians(AIM)
        steps = max(2, round(L / 1.6))
        for i in range(steps):
            k = (i + 0.5) / steps
            p = m(L * k * math.cos(a), L * k * math.sin(a))
            t_on = CAST + k * 0.6 * dur

            def mk(i=i, p=p, t_on=t_on):
                def fn(cv, t):
                    if t < t_on or t >= CAST + dur:
                        return
                    u = (t - CAST) / dur
                    al = (1 - u) / 0.2 if u > 0.8 else 1
                    blit(cv, br, 'fly', br.frame_at('fly', t - CAST + i * 70), p[0] - br.fw * 0.3, p[1] - 30, False, al)
                return Fx(fn)
            sc.add(mk())
        f1.hurt(CAST + 900)
        f2.hurt(CAST + 900)
        return sc

    def optA():
        sc = Scene(crop, 3400)
        caster(sc)
        f1, f2 = foe(sc, *T1), foe(sc, *T2)
        launches = [(1300 + 120 * i, AIM + ang) for i, ang in enumerate([-24, -12, 0, 12, 24])]
        t_out = launches[-1][0] + 120
        wall = fire_wall(sc, CAST, t_out + 667)
        head = dragon_head(800, 400, t_out, (CX - 40, CY - 165), depth=WALL_Y - 1, clip_y=WALL_Y, cover=wall, jet_on=1050)
        sc.add(head)
        bolts_from(sc, head, launches, [(T1, f1), (T2, f2)])
        return sc

    def optB():
        sc = Scene(crop, 3400)
        caster(sc)
        f1, f2 = foe(sc, *T1), foe(sc, *T2)
        wall = fire_wall(sc, CAST, 2050 + 667, x=WALL_X + 10)
        # three half-size heads like the icon: the middle one highest; each fires 2 bolts at its third
        spots = [(800, (CX - 235, CY - 112), [-30, -20], 0), (950, (CX - 150, CY - 178), [-8, 2], 2), (1100, (CX - 62, CY - 108), [4, 14], 4)]
        heads = []
        for k, (t_in, mouth, angs, sh_) in enumerate(spots):
            launches = [(1300 + 120 * j + 60 * k, a) for j, a in enumerate(angs)]
            h = dragon_head(t_in, 300, 1950 + 50 * k, mouth, scale=0.5, depth=WALL_Y - 1 - (k == 1) * 0.5, clip_y=WALL_Y,
                            cover=wall, jet_on=t_in + 250)
            sc.add(h)
            heads.append((h, launches))
        for h, launches in heads:
            bolts_from(sc, h, launches, [(T1, f1), (T2, f2)])
        return sc

    rows = [
        dict(label='Ahora', desc='Tu aliento de fuego aparece 6 veces por el centro del cono. No sale ningún dragón. El ninja brilla con su chakra al lanzar (lo que hace hoy el juego).',
             scene=now(), keys=[(0, 'Pose de lanzar con el brillo de chakra'), (700, 'Primer aliento en el centro del cono'),
                                (1000, 'Van saliendo más alientos'), (1400, '6 alientos en fila: parecen disparos'),
                                (1800, 'Se apagan; no hay dragón')]),
        dict(label='Opción A', rec=True, desc='Tu cabeza de dragón de la Gran aniquilación (1x, tus píxeles) sube detrás del ninja desde tu muro de llamas, como sube en tu Aniquilación, con tu chorro entero en la boca; dispara 5 bolas de fuego en abanico y se quema igual que en tu Aniquilación.',
             scene=optA(), keys=[(700, 'Tu muro de llamas detrás del ninja'), (1000, 'La cabeza sube desde detrás de las llamas'),
                                 (1300, 'Tu chorro en la boca: primera bola'), (1600, 'Bolas en abanico'),
                                 (1900, 'La última bola sale; impactos'), (2300, 'La cabeza se quema como en tu Aniquilación'),
                                 (2600, 'Se hunde en las llamas')]),
        dict(label='Opción B', desc='Tres cabezas a mitad de tamaño (0,5x, reducidas con tus colores: mira cabeza-de-dragon.png), como tu icono; cada una dispara 2 bolas hacia su parte del cono. Son la misma cabeza tres veces.',
             scene=optB(), keys=[(1000, 'Suben las cabezas'), (1300, 'Ya están las tres'),
                                 (1500, 'Disparan 2 bolas cada una'), (1800, 'Bolas por todo el cono'),
                                 (2150, 'Impactos; se queman'), (2500, 'Se hunden')]),
    ]
    return dict(n=1, slug='llama-dragon', title='1. Llama Dragón',
                sub='Técnica de Fuego: Aniquilación de la llama del dragón · cono de 9 m a 60° · rango A (secreto Mirai)',
                icon='dragon_fire_bomb', rows=rows)


# ------------------------------------------------------------------------------------------
# 2. Fuego del dragón (dragon_fire_stream): line 10.5 m, fire
# ------------------------------------------------------------------------------------------

def a2():
    crop = (CX - 200, CY - 250, 900, 320)
    T1, T2 = 4.0, 7.5
    END = 10.5

    def now():
        sc = Scene(crop, 2300)
        caster(sc, burst=True)
        f1, f2 = foe(sc, T1), foe(sc, T2)
        now_line(sc, 'fire', T1, [f1, f2])
        return sc

    WY = CY - 12
    MOUTH = (CX - 30, CY - 118)

    def optA():
        sc = Scene(crop, 3000)
        caster(sc)
        f1, f2 = foe(sc, T1), foe(sc, T2)
        t_out = 2200
        # his fire wall halved (his colours, his outline) behind him hides the cut neck
        wall = fire_wall(sc, CAST, t_out + 667, x=CX - 92, y=WY, half_=True)
        head = dragon_head(800, 300, t_out, MOUTH, scale=0.5, depth=WY - 1, clip_y=WY, cover=wall, jet_on=1050)
        sc.add(head)
        tip = head.tip_at(1300)
        m0 = (tip[0] - 8, tip[1])
        m1 = (CX + END * PXM, CY - 50)
        sc.add(beam('fire', 1300, m0, m1, 400, 500, 300))
        for f, x in ((f1, T1), (f2, T2)):
            t = beam_reach_times(1300, 400, m0[0], m1[0], [CX + x * PXM])[0]
            hit(sc, 'fire', t, m(x))
            f.hurt(t)
        return sc

    def optB():
        sc = Scene(crop, 2300)
        caster(sc)
        f1, f2 = foe(sc, T1), foe(sc, T2)
        hand = (CX + 34, CY - 58)
        br = S('fire', 'breath')
        sc.add(play(br, 'fly', CAST, hand[0] + 50, hand[1], 300, fade=0.3))
        p1 = (CX + END * PXM, CY - 50)
        sc.add(beam('fire', 700, hand, p1, 400, 500, 300))
        for f, x in ((f1, T1), (f2, T2)):
            t = beam_reach_times(700, 400, hand[0], p1[0], [CX + x * PXM])[0]
            hit(sc, 'fire', t, m(x))
            f.hurt(t)
        return sc

    rows = [
        dict(label='Ahora', desc='Si haces clic en el primer enemigo (a 4 m): tu chorro de fuego sale de las manos y se para ahí, aunque el daño llega a 10,5 m. No hay dragón. El ninja brilla al lanzar.',
             scene=now(),
             keys=[(0, 'Pose de lanzar con el brillo de chakra'), (800, 'El chorro sale de las manos'), (1100, 'Llega al punto del clic'),
                   (1500, 'El segundo recibe daño sin que le llegue el fuego'), (1800, 'Se apaga')]),
        dict(label='Opción A', rec=True, desc='Tu cabeza de dragón a mitad de tamaño (0,5x, reducida con tus colores) sube desde tu muro de llamas (también reducido) detrás del ninja y escupe el chorro desde su boca hasta el final de la línea.',
             scene=optA(),
             keys=[(700, 'Tu muro de llamas pequeño detrás'), (1000, 'Sube la cabeza (0,5x)'), (1300, 'Tu chorro en la boca'),
                   (1550, 'El chorro avanza: golpea al primero'), (1900, 'Llega al final: golpea al segundo'), (2400, 'La cabeza se quema')]),
        dict(label='Opción B', desc='Sin cabeza: un fogonazo (tu aliento de fuego) en las manos y el chorro llega hasta el final de la línea.',
             scene=optB(),
             keys=[(620, 'Fogonazo en las manos'), (850, 'El chorro avanza'), (1100, 'Golpea al primero'),
                   (1350, 'Llega al final: golpea al segundo'), (1750, 'Se apaga')]),
    ]
    return dict(n=2, slug='fuego-del-dragon', title='2. Fuego del dragón',
                sub='Técnica de Fuego · línea de 10,5 m · rango B', icon='dragon_fire_stream', rows=rows)


# ------------------------------------------------------------------------------------------
# 3. Night Guy (night_guy_dragon): melee 9 m, chakra (its data already names the griffin)
# ------------------------------------------------------------------------------------------

def a3():
    crop = (CX - 150, CY - 300, 800, 370)
    TX = 8.0
    tx = CX + TX * PXM

    def now():
        sc = Scene(crop, 0)
        now_melee(sc, 'chakra', TX)
        return sc

    def optA():
        sc = Scene(crop, 0)
        c, L = melee_run(sc, TX)
        f = foe(sc, TX)
        c.pose(L, 'attack', dur=900)
        gr = beast('chakra')
        sx = tx - STOP * PXM
        p0, p1 = (sx - 1.6 * PXM, CY - 200), (tx + 1.6 * PXM, CY - 40)
        dur = 560
        g = fly(gr, 'fly', L, dur, p0, p1, hump=-10, ease=ease_in,
                alpha_fn=lambda t: min(1.0, (t - L) / 120) if t < L + 120 else (1.0 if t < L + dur - 140 else max(0.0, (L + dur - t) / 140)))
        sc.add(g)
        hit(sc, 'chakra', L + 330, m(TX))
        hit(sc, 'chakra', L + 470, (tx + 14, CY + 22))
        f.hurt(L + 360)
        sc.L, sc.t_end = L, L + 1500
        return sc

    def optB():
        sc = Scene(crop, 0)
        c, L = melee_run(sc, TX)
        f = foe(sc, TX)
        c.pose(L, 'attack', dur=900)
        ph = beast('fire')
        sx = tx - STOP * PXM
        p0 = (sx - 30, CY - 190)
        p1 = (tx - 8, CY - 112)
        sc.add(fly(ph, 'dive', L, 450, p0, p1, hump=-10, ease=ease_in,
                   alpha_fn=lambda t: min(1.0, (t - L) / 150)))
        sc.add(play(ph, 'attack', L + 450, p1[0], p1[1], 600 + 300, fade=0.33))
        hit(sc, 'fire', L + 560, m(TX))
        f.hurt(L + 600)
        sc.L, sc.t_end = L, L + 1500
        return sc

    n, a, b = now(), optA(), optB()
    L = n.L
    rows = [
        dict(label='Ahora', desc='Corre, hace el golpe de arma normal y sale una estrella de chakra. Tu grifo de chakra, que es la bestia que esta técnica ya tiene asignada, no sale nunca.',
             scene=n,
             keys=[(0, 'Empieza a correr'), (700, 'Corre 7 m'), (L, 'Llega: golpe de arma'), (L + 650, 'Una estrella de chakra'),
                   (L + 1100, 'Daño'), (L + 1500, 'Fin')]),
        dict(label='Opción A', rec=True, desc='Al llegar, tu grifo de chakra (nunca se ha visto) baja en picado desde detrás del ninja y atraviesa al objetivo junto con el golpe; dos estrellas de chakra. Sigue siendo de chakra, como dice la técnica.',
             scene=a,
             keys=[(700, 'Corre'), (L + 100, 'Llega: aparece tu grifo detrás'), (L + 250, 'Baja en picado'),
                   (L + 400, 'Atraviesa al objetivo: chakra'), (L + 600, 'Sigue de largo y se va'), (L + 1200, 'Fin')]),
        dict(label='Opción B', desc='Al llegar, tu fénix (nunca se ha visto) cae en picado sobre el objetivo con tu fila de picado y ataca con tu fila de ataque; tu golpe de fuego. Convierte el golpe en un golpe de fuego.',
             scene=b,
             keys=[(700, 'Corre'), (L + 150, 'Llega: aparece tu fénix'), (L + 400, 'Cae en picado'),
                   (L + 650, 'Ataca sobre el objetivo'), (L + 1000, 'Se desvanece'), (L + 1400, 'Fin')]),
    ]
    return dict(n=3, slug='night-guy', title='3. Night Guy',
                sub='Taijutsu · cuerpo a cuerpo, corre hasta 9 m · rango S · L = cuando el ninja llega al objetivo',
                icon=None, rows=rows)


# ------------------------------------------------------------------------------------------
# 4. Dragón de madera (wood_dragon_jutsu): single target 9 m, earth beast
# ------------------------------------------------------------------------------------------

def a4():
    crop = (CX - 150, CY - 250, 780, 320)
    TX = 7.0

    def now():
        sc = Scene(crop, 2500)
        caster(sc, burst=True)
        f = foe(sc, TX)
        dur = max(900, TX * 150)
        sc.add(fly(beast('earth'), 'fly', CAST, dur, (CX, CY - 70), (CX + TX * PXM, CY - 60)))
        hit(sc, 'earth', CAST + dur, m(TX))
        f.hurt(CAST + dur + 300)
        return sc

    def optA():
        sc = Scene(crop, 2800)
        caster(sc)
        f = foe(sc, TX)
        bx = CX + 3.0 * PXM
        sc.add(play(S('earth', 'blast'), 'blast', CAST, bx, CY + 4, fade=0.15))
        dur = 900
        sc.add(fly(beast('earth'), 'fly', 800, dur, (bx, CY - 50), (CX + TX * PXM, CY - 60), hump=40))
        hit(sc, 'earth', 800 + dur, m(TX))
        mh = S('earth', 'multi_hit')
        sc.add(play(mh, 'hit', 800 + dur + 80, CX + TX * PXM + 30, CY - 60))
        f.hurt(800 + dur + 100)
        return sc

    def optB():
        sc = Scene(crop, 2500)
        caster(sc)
        f = foe(sc, TX)
        dur = max(900, TX * 150)
        ic = Image.open(ICON.format('wood_dragon_jutsu')).convert('RGBA')
        sc.add(placeholder(CAST, dur, (CX, CY - 70), (CX + TX * PXM, CY - 60), 250, 104, 'dibujo nuevo:\ndragón de madera\ncomo tu icono', pic=ic))
        hit(sc, 'earth', CAST + dur, m(TX))
        f.hurt(CAST + dur + 300)
        return sc

    rows = [
        dict(label='Ahora', desc='Tu dragón de piedra salta en arco y golpea. Tu icono es un dragón-serpiente verde de madera: con lo que tenemos no se puede llegar a madera.',
             scene=now(),
             keys=[(0, 'Pose de lanzar con el brillo de chakra'), (750, 'Sale tu dragón de piedra'), (1100, 'Salta en arco'), (1450, 'Llega'), (1800, 'Estallido de rocas')]),
        dict(label='Opción A', rec=True, desc='Provisional, sin dibujo nuevo, y sigue siendo de piedra: tus púas de tierra brotan a 3 m delante del ninja y de ellas salta tu dragón de piedra; al llegar, tu estallido de rocas y tu impacto de esquirlas.',
             scene=optA(),
             keys=[(700, 'Brotan tus púas a 3 m'), (950, 'El dragón salta de las púas'), (1300, 'Vuela al objetivo'),
                   (1750, 'Estallido de rocas y esquirlas'), (2150, 'Fin')]),
        dict(label='Opción B', tag='necesita dibujo nuevo (tuyo o nuestro, para aprobar)',
             desc='Un dragón de madera como el de tu icono, como hoja nueva de bestia (8 cuadros de vuelo). Con la hoja hecha, lo demás es solo datos y tu dragón de piedra queda libre para una técnica de tierra.',
             scene=optB(),
             keys=[(700, 'Sale el dragón de madera (falta dibujarlo)'), (1100, 'Vuela como las otras bestias'), (1450, 'Llega'), (1800, 'Golpe')]),
    ]
    return dict(n=4, slug='dragon-de-madera', title='4. Dragón de madera',
                sub='Secreto del clan Ryusei · un objetivo a 9 m · rango A', icon='wood_dragon_jutsu', rows=rows)


# ------------------------------------------------------------------------------------------
# 5. Cadenas selladoras de adamantio: single target 9 m, chakra
# ------------------------------------------------------------------------------------------

def a5():
    crop = (CX - 130, CY - 230, 640, 290)
    TX = 6.0
    tx = CX + TX * PXM

    def now():
        sc = Scene(crop, 2300)
        caster(sc, burst=True)
        f = foe(sc, TX)
        dur = max(500, TX * 115)
        sc.add(fly(S('chakra', 'stream'), 'fly', CAST, dur, (CX, CY - 70), (tx, CY - 60)))
        hit(sc, 'chakra', CAST + dur, m(TX))
        f.hurt(CAST + dur + 300)
        return sc

    def optA():
        sc = Scene(crop, 2500)
        caster(sc)
        f = foe(sc, TX)
        chest = (CX + 18, CY - 58)
        sc.add(beam('chakra', CAST, chest, (tx - 6, CY - 58), 400, 940, 300))
        hit(sc, 'chakra', 960, m(TX))
        seal_ring(sc, 960, tx, CY + 4, hold=700)
        f.hurt(960)
        return sc

    def optB():
        sc = Scene(crop, 2400)
        caster(sc)
        f = foe(sc, TX)
        seal_ring(sc, CAST, tx, CY + 4, hold=1200)
        # two chains out of the ground on both sides of the circle, crossing in an X over him; sloped
        # the way the game already slopes a beam (pixel columns stay upright: nothing is rotated)
        sc.add(beam('chakra', 700, (tx - 92, CY + 6), (tx + 46, CY - 112), 300, 1000, 300))
        sc.add(beam('chakra', 850, (tx + 92, CY + 6), (tx - 46, CY - 112), 300, 850, 300))
        hit(sc, 'chakra', 1150, m(TX))
        f.hurt(1150)
        return sc

    rows = [
        dict(label='Ahora', desc='Un trozo de 64 px de tu haz de chakra vuela en arco como una piedra. Tu haz ya es una cadena dorada con anillos de sello, pero nunca se tiende.',
             scene=now(),
             keys=[(0, 'Pose de lanzar con el brillo de chakra'), (700, 'Sale un trozo del haz'), (950, 'Vuela en arco'), (1450, 'Estrella de chakra'), (1800, 'Daño')]),
        dict(label='Opción A', rec=True, desc='Tu cadena de chakra sale del pecho y se tiende hasta el objetivo; se queda tensa mientras bajo él se abre tu círculo de sello dorado (sin el pilar de luz, para que se le vea): el chakra queda sellado.',
             scene=optA(),
             keys=[(700, 'La cadena sale del pecho'), (960, 'Llega: estrella de chakra'), (1250, 'Se abre tu círculo de sello'),
                   (1600, 'Cadena tensa sobre el círculo'), (2000, 'Se apaga')]),
        dict(label='Opción B', desc='Como tu icono: primero tu círculo de sello bajo el objetivo; luego dos cadenas salen del suelo y se cruzan en X sobre él, inclinadas como el juego ya inclina un chorro (sin girar tus píxeles).',
             scene=optB(),
             keys=[(650, 'Círculo de sello'), (850, 'Sale la primera cadena'), (1050, 'La segunda: X sobre él'),
                   (1250, 'Estrella de chakra'), (1800, 'Aguantan'), (2150, 'Se apagan')]),
    ]
    return dict(n=5, slug='cadenas-selladoras', title='5. Cadenas selladoras',
                sub='Secreto del clan Kōton (Cadenas selladoras de adamantio) · un objetivo a 9 m · rango A', icon='adamantine_sealing_chains', rows=rows)


# ------------------------------------------------------------------------------------------
# 6. Ocho trigramas, 64 palmas: melee 1.5 m, chakra
# ------------------------------------------------------------------------------------------

def a6():
    crop = (CX - 90, CY - 210, 470, 260)
    TX = 4.0
    tx = CX + TX * PXM

    def now():
        sc = Scene(crop, 0)
        now_melee(sc, 'chakra', TX)
        return sc

    def optA():
        sc = Scene(crop, 0)
        c, L = melee_run(sc, TX, stop=1.5)
        f = foe(sc, TX)
        c.pose(L, 'pierce', loop=True, dur=1150)
        hx = tx - 1.5 * PXM
        br = S('chakra', 'breath')
        # a palm every 150 ms, each held 280 ms, high and low in turn
        heights = [78, 36, 70, 30, 82, 40, 66, 34]
        for i, hgt in enumerate(heights):
            t = L + i * 150
            sc.add(play(br, 'fly', t, hx + 18, CY - hgt, 280, fade=0.25, frame_ms=lambda ms, i=i: i * 85 + ms))
            if i % 2 == 1:
                short_hit(sc, 'chakra', t + 60, (tx + 4, CY - hgt - 4))
            f.hurts.append(t + 60)
        f.pose(L + 60, 'hurt', loop=True, dur=1100)
        hit(sc, 'chakra', L + 1200, (tx, CY - 50), h=0)
        sc.L, sc.t_end = L, L + 2300
        return sc

    def optB():
        sc = Scene(crop, 0)
        c, L = melee_run(sc, TX)
        f = foe(sc, TX)
        c.pose(L, 'attack', loop=True, dur=1000)
        spots = [(0, 86), (-10, 60), (12, 66), (-6, 40), (8, 24), (-12, 18), (4, 74), (0, 50)]
        for i, (dx, hgt) in enumerate(spots):
            short_hit(sc, 'chakra', L + i * 120, (tx + dx, CY - hgt))
            f.hurts.append(L + i * 120)
        f.pose(L, 'hurt', loop=True, dur=1000)
        seal_ring(sc, L + 1000, tx, CY + 4, hold=500)
        sc.L, sc.t_end = L, L + 2100
        return sc

    n, a, b = now(), optA(), optB()
    L = n.L
    La = a.L
    rows = [
        dict(label='Ahora', desc='Corre, hace el golpe de arma y sale una sola estrella de chakra. Tu icono tiene muchas palmas y un círculo.',
             scene=n,
             keys=[(0, 'Empieza a correr'), (L, 'Llega: golpe de arma'), (L + 650, 'Una estrella de chakra'), (L + 1100, 'Daño'), (L + 1500, 'Fin')]),
        dict(label='Opción A', rec=True, desc='Estocadas seguidas: cada 150 ms sale una palma (tu aliento de chakra, que tiene una mano abierta), arriba y abajo por turnos, y cada una dura 280 ms; 8 palmas y de remate tu estrella de chakra grande.',
             scene=a,
             keys=[(La + 60, 'Primera palma (arriba)'), (La + 220, 'Segunda (abajo)'), (La + 520, 'Palmas seguidas'),
                   (La + 1080, 'Octava palma'), (La + 1350, 'Remate: estrella de chakra'), (La + 1900, 'Fin')]),
        dict(label='Opción B', desc='Lluvia de golpes: 8 estrellas de chakra en la cabeza, el pecho, los brazos y las piernas, una cada 120 ms, y de remate tu círculo de sello (sin el pilar), como el círculo de tu icono.',
             scene=b,
             keys=[(L + 30, 'Primer golpe'), (L + 300, 'Golpes por todo el cuerpo'), (L + 850, 'Ocho golpes'),
                   (L + 1150, 'Remate: tu círculo de sello'), (L + 1600, 'Se apaga')]),
    ]
    return dict(n=6, slug='64-palmas', title='6. Ocho trigramas, 64 palmas',
                sub='Secreto del clan Northstar · cuerpo a cuerpo a 1,5 m · rango A · L = cuando el ninja llega al objetivo', icon='taki_sixtyfour_palms', rows=rows)


# ------------------------------------------------------------------------------------------
# 7. Proyectil del dragón de agua: single target 9 m, water beast
# ------------------------------------------------------------------------------------------

def a7():
    crop = (CX - 130, CY - 230, 760, 300)
    TX = 7.0
    tx = CX + TX * PXM

    def now():
        sc = Scene(crop, 2500)
        caster(sc, burst=True)
        f = foe(sc, TX)
        dur = max(900, TX * 150)
        sc.add(fly(beast('water'), 'fly', CAST, dur, (CX, CY - 70), (tx, CY - 60)))
        hit(sc, 'water', CAST + dur, m(TX))
        f.hurt(CAST + dur + 300)
        return sc

    def optA():
        sc = Scene(crop, 2800)
        caster(sc)
        f = foe(sc, TX)
        gx = CX + 2.5 * PXM
        sc.add(play(S('water', 'blast'), 'blast', CAST, gx, CY + 4, fade=0.15))
        dur = 900
        sc.add(fly(beast('water'), 'fly', 800, dur, (gx + 10, CY - 120), (tx, CY - 60), hump=30))
        hit(sc, 'water', 800 + dur, m(TX))
        f.hurt(800 + dur + 100)
        return sc

    def optB():
        sc = Scene(crop, 2400)
        caster(sc)
        f = foe(sc, TX)
        dur = 1050
        p0, p1 = (CX + 20, CY - 64), (tx, CY - 62)
        dr = fly(beast('water'), 'fly', CAST, dur, p0, p1, hump=0, ease=ease_out)
        hand = (CX + 22, CY - 60)
        tail_off = 10  # the stream (no head) reaches under the drake's body
        end = CAST + dur

        def reach(t):
            x, _ = dr.pos(min(t, end))
            return max(0.0, (x - tail_off - hand[0]) / (p1[0] - tail_off - hand[0]))
        # it fades out whole with the splash (the way the game fades a beam), no cut
        sc.add(beam('water', CAST, hand, (p1[0] - tail_off, CY - 60), dur, 0, 300, head=False, reach_fn=reach))
        sc.add(dr)
        hit(sc, 'water', end, m(TX))
        f.hurt(end + 100)
        return sc

    rows = [
        dict(label='Ahora', desc='Tu dragón de agua de cuatro patas vuela en arco y salpica. Tu icono es un dragón largo, como una serpiente.',
             scene=now(),
             keys=[(0, 'Pose de lanzar con el brillo de chakra'), (700, 'Sale tu dragón de agua'), (1100, 'Vuela en arco'), (1450, 'Llega'), (1750, 'Salpicadura')]),
        dict(label='Opción A', desc='Tu géiser brota a 2,5 m delante del ninja y de él salta el dragón hacia el objetivo.',
             scene=optA(),
             keys=[(700, 'Brota tu géiser'), (950, 'El dragón salta del géiser'), (1300, 'Vuela al objetivo'), (1750, 'Salpicadura'), (2150, 'Fin')]),
        dict(label='Opción B', rec=True, desc='El dragón vuela recto y detrás se tiende tu chorro de agua sin la punta: queda un cuerpo largo de agua, como la serpiente de tu icono. Al llegar, el cuerpo se desvanece entero con la salpicadura.',
             scene=optB(),
             keys=[(700, 'Sale de las manos'), (1000, 'El cuerpo de agua lo sigue'), (1350, 'Casi llega'), (1650, 'Salpicadura'), (1800, 'El cuerpo se desvanece')]),
    ]
    return dict(n=7, slug='dragon-de-agua', title='7. Proyectil del dragón de agua',
                sub='Técnica de Agua · un objetivo a 9 m · rango B · lo usan el jugador y los cazadores', icon='water_dragon_suiryuudan', rows=rows)


# ------------------------------------------------------------------------------------------
# 8. Balas de tierra (earth_spear_doryuudan): line 9 m, earth
# ------------------------------------------------------------------------------------------

def a8():
    crop = (CX - 120, CY - 220, 760, 280)
    T1, T2, END = 4.0, 7.5, 9.0

    def now():
        sc = Scene(crop, 2300)
        caster(sc, burst=True)
        f1, f2 = foe(sc, T1), foe(sc, T2)
        now_line(sc, 'earth', T1, [f1, f2])
        return sc

    def volleys(sc, starts, units, y=CY - 46, x0=CX + 1.5 * PXM, end_burst=True):
        mu, mh = S('earth', 'multi'), S('earth', 'multi_hit')
        x1 = CX + END * PXM
        dur = 900
        for k, t0 in enumerate(starts):
            # each volley fades in where it leaves the ground (1.5 m out: never over the caster)
            sc.add(fly(mu, 'fly', t0, dur, (x0, y), (x1, y), hump=0, ease=lin,
                       alpha_fn=lambda t, t0=t0: min(1.0, (t - t0) / 120) if t < t0 + dur - 120 else max(0, (t0 + dur - t) / 120)))
            for (f, ux) in units:
                tt = t0 + dur * (CX + ux * PXM - x0) / (x1 - x0)
                sc.add(play(mh, 'hit', tt, CX + ux * PXM + 6, y))
                f.hurts.append(tt)
                if k == 0:
                    f.pose(tt, 'hurt', dur=300 + 150 * (len(starts) - 1))
            if end_burst and k == len(starts) - 1:
                sc.add(play(mh, 'hit', t0 + dur - 60, x1, y))

    def optA():
        sc = Scene(crop, 2900)
        caster(sc)
        f1, f2 = foe(sc, T1), foe(sc, T2)
        hit(sc, 'earth', CAST, m(1.5), h=24)
        volleys(sc, [700, 850, 1000], [(f1, T1), (f2, T2)])
        return sc

    def optB():
        sc = Scene(crop, 2600)
        caster(sc)
        f1, f2 = foe(sc, T1), foe(sc, T2)
        p0, p1 = (CX, CY - 50), (CX + END * PXM, CY - 50)
        sc.add(beam('earth', CAST, p0, p1, 722, 318, 260))
        volleys(sc, [800, 1000], [(f1, T1), (f2, T2)], y=CY - 96)
        return sc

    rows = [
        dict(label='Ahora', desc='Una fila de púas doradas crece hasta donde haces clic (aquí, el primer enemigo). Tus tres balas de roca y su impacto no salen nunca.',
             scene=now(),
             keys=[(0, 'Pose de lanzar con el brillo de chakra'), (800, 'Crecen las púas'), (1100, 'Se paran en el clic (4 m)'), (1500, 'Daño a los dos'), (1800, 'Se apagan')]),
        dict(label='Opción A', rec=True, desc='Revienta el suelo a 1,5 m delante del ninja y de ahí salen tres ráfagas de tus balas de roca que recorren toda la línea; tu impacto de esquirlas en cada enemigo y al final.',
             scene=optA(),
             keys=[(620, 'Revienta el suelo a 1,5 m'), (800, 'Sale la primera ráfaga'), (1100, 'Tres ráfagas en fila'),
                   (1300, 'Esquirlas en el primero'), (1600, 'Esquirlas en el segundo'), (1950, 'Se rompen al final')]),
        dict(label='Opción B', desc='Las púas de ahora, pero hasta el final de la línea, y por encima vuelan dos ráfagas de balas. Más lleno, pero más recargado.',
             scene=optB(),
             keys=[(850, 'Púas y balas'), (1100, 'Púas hasta el final'), (1300, 'Esquirlas en el primero'), (1650, 'En el segundo'), (2000, 'Se apagan')]),
    ]
    return dict(n=8, slug='balas-de-tierra', title='8. Balas de tierra',
                sub='Técnica de Tierra · línea de 9 m · rango B', icon='earth_spear_doryuudan', rows=rows)


# ------------------------------------------------------------------------------------------
# 9. Danza de la luna creciente: melee 3 m, sword
# ------------------------------------------------------------------------------------------

def a9():
    crop = (CX - 90, CY - 210, 480, 260)
    TX = 4.0
    tx = CX + TX * PXM

    def now():
        sc = Scene(crop, 0)
        now_melee(sc, 'wind', TX)
        return sc

    def opt(el):
        sc = Scene(crop, 0)
        c, L = melee_run(sc, TX)
        f = foe(sc, TX)
        sl = S(el, 'slash')
        for i, hgt in enumerate([86, 58, 30]):
            t = L + i * 220
            c.pose(t, 'attack', dur=220 if i < 2 else 700, fps=15)
            # each crescent crosses the target on a 2 m path: from the blade, through him and past him
            sc.add(fly(sl, 'fly', t + 40, 320, (tx - 1.0 * PXM, CY - hgt), (tx + 1.0 * PXM, CY - hgt + 6), hump=0, ease=lin,
                       alpha_fn=lambda tt, t=t: 1.0 if tt < t + 280 else max(0, (t + 360 - tt) / 80)))
            f.hurts.append(t + 200)
        f.pose(L + 200, 'hurt', dur=650)
        hit(sc, 'chakra' if el == 'chakra' else 'fire', L + 720, m(TX))
        sc.L, sc.t_end = L, L + 1700
        return sc

    n, a, b = now(), opt('chakra'), opt('fire')
    L = n.L
    La = a.L
    rows = [
        dict(label='Ahora', desc='Corre, hace el golpe y sale tu X de viento con hojas. Tu icono son tres medias lunas doradas; ninguna de tus medias lunas sale en el juego.',
             scene=n,
             keys=[(0, 'Empieza a correr'), (L, 'Llega: golpe de arma'), (L + 650, 'X de viento con hojas'), (L + 1100, 'Daño'), (L + 1500, 'Fin')]),
        dict(label='Opción A', rec=True, desc='Tres golpes seguidos; con cada uno, tu media luna de chakra (blanca y azul con motas doradas, como luz de luna) sale de la espada, atraviesa al objetivo y sigue 1 m más: alta, en medio y baja. Remate con tu estrella de chakra.',
             scene=a,
             keys=[(La + 100, 'Primera media luna (alta)'), (La + 220, 'La atraviesa'), (La + 400, 'Segunda (en medio)'),
                   (La + 620, 'Tercera (baja)'), (La + 850, 'Remate: estrella de chakra'), (La + 1300, 'Fin')]),
        dict(label='Opción B', desc='Lo mismo con tu media luna de fuego, la más dorada y la más parecida a tu icono. Puede parecer fuego.',
             scene=b,
             keys=[(La + 100, 'Primera media luna (alta)'), (La + 220, 'La atraviesa'), (La + 400, 'Segunda (en medio)'),
                   (La + 620, 'Tercera (baja)'), (La + 850, 'Remate'), (La + 1300, 'Fin')]),
    ]
    return dict(n=9, slug='luna-creciente', title='9. Danza de la luna creciente',
                sub='Kenjutsu · golpe de espada a 3 m · rango B · L = cuando el ninja llega al objetivo', icon='crescent_moon_dance', rows=rows)


# ------------------------------------------------------------------------------------------
# 10. Templo del Nirvana: circle 3 m at 7.5 m, genjutsu
# ------------------------------------------------------------------------------------------

def a10():
    crop = (CX - 130, CY - 330, 800, 400)
    C = 6.5
    cx = CX + C * PXM

    def units(sc):
        return [(foe(sc, C - 0.8, -0.4), C - 0.8, -0.4), (foe(sc, C + 0.9, 0.5), C + 0.9, 0.5)]

    def now():
        sc = Scene(crop, 2700)
        caster(sc, burst=True)
        us = units(sc)
        dur = max(500, C * 115)
        sc.add(fly(S('genjutsu', 'bolt'), 'fly', CAST, dur, (CX, CY - 70), (cx, CY - 30)))
        sc.add(play(S('genjutsu', 'blast'), 'blast', CAST + dur, cx, CY, fade=0.15))
        for f, _, _ in us:
            f.hurt(CAST + dur + 300)
        return sc

    def optA():
        sc = Scene(crop, 3100)
        caster(sc)
        us = units(sc)
        cr = beast('genjutsu')
        top = (cx - 1.6 * PXM, CY - 3 * PXM - 20)
        sc.add(play(cr, 'summon', CAST, top[0], top[1], 500))
        # the flock dives on a diagonal into the circle
        sc.add(fly(cr, 'fly', 1060, 600, top, (cx + 10, CY - 50), hump=-20, ease=ease_in))
        sc.add(play(S('genjutsu', 'blast'), 'blast', 1660, cx, CY, fade=0.15))
        for f, x, z in us:
            hit(sc, 'genjutsu', 1990, m(x, z))
            f.hurt(1990)
        return sc

    def optB():
        sc = Scene(crop, 3100)
        caster(sc)
        us = units(sc)
        dur = max(900, C * 150)
        sc.add(fly(beast('genjutsu'), 'fly', CAST, dur, (CX + 20, CY - 70), (cx, CY - 40)))
        sc.add(play(S('genjutsu', 'blast'), 'blast', CAST + dur, cx, CY, fade=0.15))
        for f, _, _ in us:
            f.hurt(CAST + dur + 300)
        return sc

    rows = [
        dict(label='Ahora', desc='Vuela un orbe con un ojo y luego sale tu pilar violeta con plumas de cuervo. Tu icono son plumas blancas cayendo.',
             scene=now(),
             keys=[(0, 'Pose de lanzar con el brillo de chakra'), (800, 'Vuela el orbe con el ojo'), (1250, 'Llega'), (1650, 'Tu pilar con plumas'), (2100, 'Confusión'), (2500, 'Se apaga')]),
        dict(label='Opción A', rec=True, desc='Arriba, a un lado del círculo, se abre tu vórtice y salen tus cuervos (esta fila no se ha visto nunca); la bandada baja en diagonal hasta el centro y estalla tu pilar con plumas. Son cuervos negros, no las plumas blancas de tu icono.',
             scene=optA(),
             keys=[(650, 'Se abre tu vórtice arriba'), (950, 'Salen los cuervos'), (1350, 'La bandada baja en diagonal'),
                   (1800, 'Tu pilar con plumas'), (2150, 'Confusión en los dos'), (2700, 'Se apaga')]),
        dict(label='Opción B', desc='Solo datos, ya: tus cuervos vuelan desde el ninja en vez del orbe con el ojo, y luego el mismo pilar.',
             scene=optB(),
             keys=[(700, 'Salen tus cuervos'), (1100, 'Vuelan al círculo'), (1500, 'Llegan'), (1850, 'Tu pilar con plumas'), (2600, 'Se apaga')]),
    ]
    return dict(n=10, slug='templo-del-nirvana', title='10. Templo del Nirvana',
                sub='Genjutsu · círculo de 3 m a 7,5 m · rango A · deja confusos', icon='temple_of_nirvana', rows=rows)


# ------------------------------------------------------------------------------------------
# 11. Chidori: melee 4.5 m, lightning (a look that does not copy the anime's)
# ------------------------------------------------------------------------------------------

def a11():
    crop = (CX - 100, CY - 260, 560, 310)
    TX = 5.0
    tx = CX + TX * PXM

    def now():
        sc = Scene(crop, 0)
        now_melee(sc, 'lightning', TX)
        return sc

    def optA():
        sc = Scene(crop, 0)
        c, L = melee_run(sc, TX)
        f = foe(sc, TX)
        c.pose(L, 'attack', dur=900)
        sl = S('lightning', 'slash')
        # his lightning crescent follows the swing: from the blade, through the target and on 1.3 m
        sc.add(fly(sl, 'fly', L + 100, 340, (tx - 1.0 * PXM, CY - 66), (tx + 1.3 * PXM, CY - 50), hump=0, ease=lin,
                   alpha_fn=lambda t: 1.0 if t < L + 360 else max(0, (L + 440 - t) / 80)))
        hit(sc, 'lightning', L + 230, m(TX))
        f.hurt(L + 250)
        sc.L, sc.t_end = L, L + 1300
        return sc

    def optB():
        sc = Scene(crop, 0)
        c, L = melee_run(sc, TX)
        f = foe(sc, TX)
        c.pose(L, 'attack', dur=900)
        # his lightning strike from the sky (the lightning blast) falls on the target as the blade hits
        sc.add(play(S('lightning', 'blast'), 'blast', L + 120, tx + 4, CY + 4, fade=0.15))
        f.hurt(L + 120 + 330)
        sc.L, sc.t_end = L, L + 1550
        return sc

    n, a, b = now(), optA(), optB()
    L = n.L
    La = a.L
    rows = [
        dict(label='Ahora', desc='Corre, hace el golpe de arma y sale una chispa de rayo. No se ve que la espada lleve rayo.',
             scene=n,
             keys=[(0, 'Empieza a correr'), (L, 'Llega: golpe de arma'), (L + 650, 'Chispa de rayo'), (L + 1100, 'Daño'), (L + 1500, 'Fin')]),
        dict(label='Opción A', rec=True, desc='Tajo de rayo: corre con la espada, y con el golpe tu media luna de rayo sale de la hoja, atraviesa al objetivo y sigue 1,3 m; tu chispa de rayo al cortarlo. Sin rayo en la mano ni estocada (eso copiaba la técnica del anime).',
             scene=a,
             keys=[(700, 'Corre con la espada'), (La + 100, 'Golpe: sale la media luna de rayo'), (La + 250, 'Lo atraviesa: chispa'),
                   (La + 420, 'Sigue de largo y se apaga'), (La + 800, 'Fin')]),
        dict(label='Opción B', desc='Rayo del cielo: con el golpe de espada cae sobre el objetivo tu rayo del cielo (tu estallido de rayo), con su chispazo en el suelo.',
             scene=b,
             keys=[(700, 'Corre con la espada'), (La + 150, 'Golpe: empieza a caer el rayo'), (La + 450, 'El rayo le cae encima'),
                   (La + 800, 'Chispazo en el suelo'), (La + 1300, 'Se apaga')]),
    ]
    return dict(n=11, slug='chidori', title='11. Chidori',
                sub='Técnica de Rayo · cuerpo a cuerpo, corre hasta 4,5 m · rango A · L = cuando llega',
                icon='chidori_lightning_blade', rows=rows)


# ------------------------------------------------------------------------------------------
# 12. Huracán de la hoja: circle 1.5 m around himself
# ------------------------------------------------------------------------------------------

def a12():
    crop = (CX - 170, CY - 190, 340, 240)
    E1, E2 = (1.25, 0.25), (-1.2, -0.3)
    FLIP = 180  # ms per half turn (about 5.5 flips a second, not a jitter)

    def foes(sc):
        f1 = foe(sc, *E1)
        f2 = sc.unit('rogue', *m(*E2), facing=1)
        return [(f1, E1), (f2, E2)]

    def now():
        sc = Scene(crop, 1700)
        c = sc.unit('aiden', CX, CY)
        fs = foes(sc)
        c.pose(0, 'attack', dur=900)
        hit(sc, 'chakra', CAST, (CX, CY))
        for f, _ in fs:
            f.hurt(CAST + 450)
        return sc

    def optA():
        sc = Scene(crop, 1600)
        c = sc.unit('aiden', CX, CY)
        fs = foes(sc)
        c.spin(0, 4 * FLIP, 'attack', every=FLIP)
        sl = S('wind', 'slash')
        # with each half turn a wind crescent leaves the ninja toward one enemy, then his leaves hit him
        for i, (f, p) in enumerate(fs):
            t0 = FLIP * (i + 1) - 60
            end = lift(m(*p), 50)
            left = end[0] < CX
            sc.add(fly(sl, 'fly', t0, 240, (CX + (-14 if left else 14), CY - 50), (end[0] + (-14 if left else 14), end[1]), hump=0, ease=lin, mirror=left,
                       alpha_fn=lambda t, t0=t0: 1.0 if t < t0 + 200 else max(0, (t0 + 260 - t) / 60)))
            hit(sc, 'wind', t0 + 200, m(*p), mirror=left)
            f.hurt(t0 + 220)
        return sc

    def optB():
        sc = Scene(crop, 1500)
        c = sc.unit('aiden', CX, CY)
        fs = foes(sc)
        c.spin(0, 4 * FLIP, 'attack', every=FLIP)
        sl = S('wind', 'slash')

        def orbit(k):
            def fn(cv, t):
                if t < 0 or t >= 4 * FLIP + 100:
                    return
                a = (t / (2 * FLIP)) * 2 * math.pi + k * math.pi
                x, y, s = CX + math.cos(a) * 52, CY - 34 - k * 26 + math.sin(a) * 12, math.sin(a)
                al = 1.0 if t < 4 * FLIP else (4 * FLIP + 100 - t) / 100
                blit(cv, sl, 'fly', sl.frame_at('fly', t), x, y, s > 0, al)
            return fn

        for k in range(2):
            fn = orbit(k)
            # in front of him on the near half of the orbit, behind him on the far half
            sc.add(Fx(lambda cv, t, fn=fn, k=k: fn(cv, t) if math.sin((t / (2 * FLIP)) * 2 * math.pi + k * math.pi) >= 0 else None))
            sc.add(Fx(lambda cv, t, fn=fn, k=k: fn(cv, t) if math.sin((t / (2 * FLIP)) * 2 * math.pi + k * math.pi) < 0 else None, depth=CY - 1))
        for i, (f, p) in enumerate(fs):
            hit(sc, 'wind', 300 + 80 * i, m(*p), mirror=p[0] < 0)
            f.hurt(300 + 80 * i)
        return sc

    rows = [
        dict(label='Ahora', desc='Hace el golpe de arma y sale una estrella de chakra en el pecho del propio ninja. No gira y no hay viento.',
             scene=now(),
             keys=[(0, 'Golpe de arma'), (300, 'Nada más'), (650, 'Estrella en su propio pecho'), (1000, 'Daño a los dos'), (1400, 'Fin')]),
        dict(label='Opción A', rec=True, desc='El ninja gira (el dibujo se voltea cada 180 ms) y con cada media vuelta sale de él una de tus medias lunas de viento hacia un enemigo; tu X de viento con hojas en cada uno. Nada da vueltas alrededor del ninja.',
             scene=optA(),
             keys=[(100, 'Empieza a girar'), (200, 'Media luna hacia el de la derecha'), (380, 'Hojas en el primero; otra media luna'),
                   (560, 'Hojas en el segundo'), (800, 'Termina el giro'), (1250, 'Fin')]),
        dict(label='Opción B', tag='¿te parece aura?',
             desc='El ninja gira con dos de tus medias lunas de viento dando vueltas a su alrededor (por delante y por detrás de él); tu X de viento con hojas en cada enemigo. Si esto te parece el aura que no quieres, descártala.',
             scene=optB(),
             keys=[(100, 'Empieza a girar'), (250, 'Medias lunas alrededor'), (380, 'Hojas en el primero'), (500, 'Y en el segundo'),
                   (800, 'Termina el giro'), (1150, 'Fin')]),
    ]
    return dict(n=12, slug='huracan-de-la-hoja', title='12. Huracán de la hoja',
                sub='Taijutsu · golpea en un círculo de 1,5 m alrededor del ninja · rango D · lo usan el jugador y los saqueadores',
                icon=None, rows=rows)


ABIL = {1: a1, 2: a2, 3: a3, 4: a4, 5: a5, 6: a6, 7: a7, 8: a8, 9: a9, 10: a10, 11: a11, 12: a12}


def build(n, what='all'):
    a = ABIL[n]()
    base = f"{OUT}/{a['n']}-{a['slug']}"
    if what in ('strip', 'all'):
        out = strip(base + '.png', a['title'], a['sub'], a['rows'], icon=ICON.format(a['icon']) if a.get('icon') else None)
        print(base + '.png', out.size, os.path.getsize(base + '.png'))
    if what in ('gif', 'all'):
        for r in a['rows'][1:]:
            letter = r['label'][-1]
            p = f'{base}-{letter}.gif'
            sz = gif(p, r['scene'], f"{a['title']} · {r['label']}" + (' (recomendada)' if r.get('rec') else ''))
            print(p, sz)
    return a


if __name__ == '__main__':
    what = sys.argv[2] if len(sys.argv) > 2 else 'all'
    ns = range(1, 13) if sys.argv[1] == 'all' else [int(x) for x in sys.argv[1].split(',')]
    for n in ns:
        build(n, what)
