# Hotbar icons for the senbon, weapon poison and the healing senbon (the owner, 2026-10-23: "mete los
# senbons como nueva arma arrojadiza ... inbuir las armas en veneno ... pocion curativa"). Ours, not
# copies of his sheets: drawn in the manner of his icons (a full painted ground glowing from the
# middle, the object with his black line, light from the upper left, sparks). New art, waiting for
# his approval: on the branch items/senbon only.
#
#   UI_OUT=<staging dir> python3 -I tools/ui/ui-icons-senbon.py
#
# writes <stg>/senbon.png, poison.png, healSenbon.png (44x44, the slot window) and their @2x files
# (88x88). The 88 is drawn pixel by pixel; the 44 is its area mean, with the line kept dark. It
# refuses to run without UI_OUT (it never writes into src/assets). Same input, same bytes.

import math
import os
import sys

from PIL import Image

N = 88
LINE = (7, 6, 11, 255)


def hexc(h, a=255):
    h = h.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def mix(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(4))


def rnd(seed):
    # A fixed generator (no randomness between runs).
    s = [seed & 0xffffffff]

    def f():
        s[0] = (s[0] * 1664525 + 1013904223) & 0xffffffff
        return s[0] / 2 ** 32
    return f


def ground(c0, c1, c2, seed, streaks=None):
    """His painted ground: a glow from the middle (c0) through c1 to the dark edge (c2), banded."""
    im = Image.new('RGBA', (N, N))
    px = im.load()
    r = rnd(seed)
    noise = [[r() for _ in range(N // 4 + 1)] for _ in range(N // 4 + 1)]
    for y in range(N):
        for x in range(N):
            d = math.hypot(x - N * 0.5, y - N * 0.47) / (N * 0.62)
            d += (noise[y // 4][x // 4] - 0.5) * 0.12
            t = min(1, max(0, d))
            # In bands, as his grounds are.
            t = round(t * 6) / 6
            col = mix(c0, c1, t * 2) if t < 0.5 else mix(c1, c2, (t - 0.5) * 2)
            px[x, y] = col
    if streaks:
        col, n = streaks
        for _ in range(n):
            x0, y0, L = r() * N, r() * N, 6 + r() * 14
            for k in range(int(L)):
                x, y = int(x0 + k), int(y0 - k)
                if 0 <= x < N and 0 <= y < N:
                    px[x, y] = mix(px[x, y], col, 0.55)
    return im


class Obj:
    """The object on its own layer: drawn, then lined (1 px, his black) and laid on the ground."""

    def __init__(self):
        self.im = Image.new('RGBA', (N, N), (0, 0, 0, 0))
        self.px = self.im.load()

    def set(self, x, y, c):
        if 0 <= x < N and 0 <= y < N:
            self.px[int(x), int(y)] = c

    def get(self, x, y):
        return self.px[x, y] if 0 <= x < N and 0 <= y < N else (0, 0, 0, 0)

    def needle(self, x0, y0, x1, y1, ramp, w=2):
        """A needle from its tail (x0, y0) to its tip: `w` px thick, lit on its upper-left side, the tip a glint."""
        L = math.hypot(x1 - x0, y1 - y0)
        nx, ny = -(y1 - y0) / L, (x1 - x0) / L
        steps = int(L * 3)
        for k in range(steps + 1):
            t = k / steps
            cx, cy = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            # It tapers to a point over its last fifth.
            ww = w if t < 0.8 else max(0.6, w * (1 - (t - 0.8) / 0.2))
            for j in range(-2, 3):
                off = j * 0.5
                if abs(off) > ww / 2:
                    continue
                side = off * (nx * -0.55 + ny * -0.7)
                lvl = 2 + (1 if side > 0 else 0) + (1 if t > 0.7 else 0)
                if t > 0.92:
                    lvl = len(ramp) - 1
                self.set(cx + nx * off, cy + ny * off, ramp[min(len(ramp) - 1, max(0, lvl - (1 if t < 0.15 else 0)))])

    def disc(self, cx, cy, r, ramp):
        for y in range(int(cy - r - 1), int(cy + r + 2)):
            for x in range(int(cx - r - 1), int(cx + r + 2)):
                d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
                if d > r:
                    continue
                lx, ly = (x + 0.5 - cx) / r, (y + 0.5 - cy) / r
                l = -0.55 * lx - 0.7 * ly + 0.45 * math.sqrt(max(0, 1 - lx * lx - ly * ly))
                lvl = 0 if l < -0.2 else 1 if l < 0.15 else 2 if l < 0.45 else 3 if l < 0.7 else 4
                self.set(x, y, ramp[min(len(ramp) - 1, lvl)])

    def drop(self, cx, cy, r, ramp):
        """A falling drop: round below, pointed above."""
        self.disc(cx, cy, r, ramp)
        for k in range(1, int(r * 1.6) + 1):
            w = r * (1 - k / (r * 1.6 + 1))
            for x in range(int(cx - w), int(cx + w) + 1):
                self.set(x, cy - r + 1 - k, ramp[2] if x < cx else ramp[1])

    def line(self):
        """His 1 px black line round everything drawn (4-way)."""
        src = self.im.copy().load()
        for y in range(N):
            for x in range(N):
                if src[x, y][3]:
                    continue
                if any(0 <= x + dx < N and 0 <= y + dy < N and src[x + dx, y + dy][3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    self.px[x, y] = LINE
        return self

    def onto(self, g):
        g.alpha_composite(self.im)
        return g


def glow(g, cx, cy, r, col, strength=0.8):
    px = g.load()
    for y in range(N):
        for x in range(N):
            d = math.hypot(x - cx, y - cy)
            if d < r:
                px[x, y] = mix(px[x, y], col, strength * (1 - d / r) ** 1.5)


def sparkle(g, x, y, col, big=True):
    px = g.load()
    pts = [(0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)] + ([(2, 0), (-2, 0), (0, 2), (0, -2)] if big else [])
    for dx, dy in pts:
        if 0 <= x + dx < N and 0 <= y + dy < N:
            px[x + dx, y + dy] = col if (dx, dy) == (0, 0) or not big or abs(dx) + abs(dy) == 1 else mix(px[x + dx, y + dy], col, 0.6)


STEEL = [hexc(h) for h in ('#3f4651', '#6b7482', '#9aa4b3', '#cdd5e0', '#f2f6fb', '#ffffff')]
VENOM = [hexc(h) for h in ('#173b12', '#2f6b1f', '#4f9a2a', '#7cc93a', '#b5ef6a', '#e6ffb0')]
HEAL = [hexc(h) for h in ('#1f6e3f', '#2f9e5a', '#5fd38a', '#a6f2bf', '#e4ffe9', '#ffffff')]


def senbon():
    g = ground(hexc('#8fb3c9'), hexc('#3b5f78'), hexc('#101c2a'), 7, (hexc('#b9d4e6'), 26))
    o = Obj()
    # Three needles thrown together, flying up and to the right.
    for (x0, y0, x1, y1) in ((10, 66, 62, 14), (18, 76, 74, 24), (8, 52, 50, 10)):
        o.needle(x0, y0, x1, y1, STEEL)
    o.line().onto(g)
    for (x, y, b) in ((66, 10, True), (78, 22, False), (54, 6, False), (30, 30, False)):
        sparkle(g, x, y, hexc('#ffffff'), b)
    return g


def poison():
    g = ground(hexc('#9be05a'), hexc('#3d6e2a'), hexc('#0f1f12'), 11)
    o = Obj()
    # A kunai, point down to the right, its blade running with poison.
    cx, cy, ang = 32, 30, math.radians(45)
    dx, dy = math.cos(ang), math.sin(ang)
    nx, ny = -dy, dx
    for k in range(0, 46):
        t = k / 45
        w = 12 * (1 - t) if t > 0.25 else 12 * (0.55 + t * 1.8)
        for j in range(-14, 15):
            off = j * 0.5
            if abs(off) > w / 2:
                continue
            lit = off * (nx * -0.55 + ny * -0.7) > 0
            base = VENOM if t > 0.15 else STEEL
            lvl = (3 if lit else 2) + (1 if abs(off) < 0.8 else 0)
            o.set(cx + dx * k + nx * off, cy + dy * k + ny * off, base[min(5, lvl)])
    # The handle with its wrap and the ring.
    for k in range(1, 18):
        for j in (-2, -1, 0, 1, 2):
            col = hexc('#3a2a22') if (k // 2) % 2 else hexc('#5a4334')
            o.set(cx - dx * k + nx * j, cy - dy * k + ny * j, col)
    o.disc(cx - dx * 21, cy - dy * 21, 4.2, STEEL)
    for y in range(-1, 2):
        for x in range(-1, 2):
            o.set(round(cx - dx * 21) + x, round(cy - dy * 21) + y, (0, 0, 0, 0))
    # Drops running off the blade and falling.
    o.drop(50, 66, 3.2, VENOM)
    o.drop(64, 78, 2.4, VENOM)
    o.drop(38, 76, 2.0, VENOM)
    o.line().onto(g)
    for (x, y, b) in ((70, 16, True), (18, 70, False), (76, 50, False)):
        sparkle(g, x, y, VENOM[5], b)
    # Bubbles rising, as on his antidote.
    for (x, y, r) in ((20, 22, 3), (28, 12, 2), (72, 34, 2)):
        for a in range(0, 360, 20):
            xx, yy = int(x + r * math.cos(math.radians(a))), int(y + r * math.sin(math.radians(a)))
            g.putpixel((xx, yy), mix(g.getpixel((xx, yy)), VENOM[4], 0.8))
    return g


def heal_senbon():
    g = ground(hexc('#f2fff0'), hexc('#4fae6e'), hexc('#0f2a1c'), 13)
    glow(g, 50, 36, 34, hexc('#e4ffe9'), 0.7)
    o = Obj()
    # The potion it was dipped in, below left: a round flask of the heals' green.
    o.disc(24, 64, 13, [hexc(h) for h in ('#1f6e3f', '#2f9e5a', '#5fd38a', '#a6f2bf', '#e4ffe9')])
    for y in range(44, 52):
        for x in range(20, 29):
            o.set(x, y, STEEL[3] if x < 23 else STEEL[2])
    for y in range(41, 45):
        for x in range(19, 30):
            o.set(x, y, hexc('#8a6a4a') if x < 24 else hexc('#6a4f37'))
    # The needle flying out of it, lit.
    o.needle(30, 54, 76, 10, HEAL, 3)
    o.line().onto(g)
    for (x, y, b) in ((78, 8, True), (62, 14, False), (68, 30, True), (46, 20, False), (40, 40, False)):
        sparkle(g, x, y, hexc('#ffffff'), b)
    # A small cross of light in the flask: it heals.
    px = g.load()
    for k in range(-3, 4):
        px[24 + k, 64] = HEAL[5]
        px[24, 64 + k] = HEAL[5]
    return g


def half(im):
    """The 44: the area mean of the 88, the black line kept where half the block is line."""
    src = im.load()
    out = Image.new('RGBA', (N // 2, N // 2))
    o = out.load()
    for y in range(N // 2):
        for x in range(N // 2):
            b = [src[2 * x + i, 2 * y + j] for i in (0, 1) for j in (0, 1)]
            lines = sum(1 for p in b if p[:3] == LINE[:3])
            o[x, y] = LINE if lines >= 2 else tuple(round(sum(p[k] for p in b) / 4) for k in range(4))
    return out


def main():
    root = os.environ.get('UI_OUT')
    if not root:
        sys.exit('ui-icons-senbon: set UI_OUT to the staging folder (this script never writes into src/assets)')
    os.makedirs(root, exist_ok=True)
    for name, f in (('senbon', senbon), ('poison', poison), ('healSenbon', heal_senbon)):
        im = f()
        im.save(os.path.join(root, f'{name}@2x.png'))
        half(im).save(os.path.join(root, f'{name}.png'))
    print(f'ui-icons-senbon: wrote 3 icons under {root}')


main()
