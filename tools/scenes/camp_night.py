"""The camp at night: the painted backdrop and frame for the camp screen (docs: art3/STYLE.md).

    python3 tools/scenes/camp_night.py --out <dir>      # layers + scene.json into <dir>
    SCENE_OUT=<dir> python3 tools/scenes/camp_night.py

Default output: src/assets/scenes/camp_night/ (only once the owner approves the art).

Layers, back to front, all 960 x 420 at 1x world pixels (1 m = 57 px across, 38 px per metre of
depth, the battle maps' camera):

    sky.png           sky, clouds, moon and stars (opaque)
    forest_far.png    distant cedars, desaturated blue-teal, misty gaps
    forest_mid.png    mid trees: darker trunks with bark, leaf clumps catching the moon, underbrush
    ground.png        the clearing: grass, tufts, dirt, stones, flowers, the fire's warm pool baked in
    ground_nofire.png the same clearing without the firelight (fire out)
    frame_back.png    the gnarled frame trees' trunks, limbs and roots (behind the characters)
    frame_front.png   foreground canopy arch, hanging leaves, vines, near ferns and roots (over all)

The game places the props and the party between ground/frame_back and frame_front, sorted by their
ground y (scene.json lists the fire and suggested spots). Every layer is baked at 2x as material,
lightness and firelight fields, downsampled by majority vote and quantised to its palettes
(scene_kit.py). Light: a cool moon high to the right, warm firelight from the fire.
"""
import argparse
import json
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scene_kit import (Layer, Mat, MOON_L, bezier, clump, cushions, hash2, unit, ellipse_mask, fbm, leaf, moon_light, noise, poly_mask,  # noqa: E402
                       rnd, save, smoothstep, spline, tube_fields)

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
DEFAULT_OUT = os.path.join(REPO, 'src', 'assets', 'scenes', 'camp_night')

W, H = 960, 420
PXM, PZM = 57, 38
FIRE = (480, 338)          # ground contact of the campfire (centre of its stone ring)
FIRE_FLAME = (480, 306)    # where the light comes from
MOON = (618, 70)
MOON_R = 24
GROUND_TOP = 234           # far edge of the clearing

# ------------------------------------------------------------------ palettes (night)

SKY = Mat('sky', ['#04061a', '#060920', '#090d27', '#0c122e', '#101735', '#141d3d', '#192345', '#1e2a4d', '#243155', '#2a395c',
                  '#314163', '#3a4b6b', '#455673', '#53647e', '#64758c', '#7b8c9f', '#99a8b6'], outline=False, warm=False, jit=0.55, cell=4.5)
CLOUD = Mat('cloud', ['#0b112b', '#0f1633', '#141c3c', '#1a2346', '#212b50', '#29355b', '#334066', '#3f4d72', '#4e5c80', '#62718f',
                      '#7c8ba3', '#a0adbf', '#c9d2dd'], outline=False, warm=False, jit=0.5, cell=2.6)
MOON_M = Mat('moon', ['#7f8fa8', '#9cabbf', '#b8c4d3', '#cfd8e2', '#e2e8ee', '#f0f3f6', '#fbfcfd'], outline=False, warm=False, jit=0.4, cell=2.4)
STAR = Mat('star', ['#5d6f93', '#93a4c4', '#cdd8ec', '#f6f8ff'], outline=False, warm=False, jit=0.0)

FAR_A = Mat('farA', ['#172639', '#1b2b3f', '#1f3044', '#24364a', '#2a3c50', '#304357', '#374b5e', '#405566'], outline=False, warm=False, jit=0.5, cell=3)
FAR_B = Mat('farB', ['#0d1624', '#101a29', '#131e2e', '#172334', '#1b283a', '#202e40', '#263547', '#2e3e50', '#384a5b'], outline=False, warm=False, jit=0.5, cell=2.6)
MIST1 = Mat('mist1', ['#3c556b', '#45607a'], alpha=70, outline=False, warm=False, jit=0.3)
MIST2 = Mat('mist2', ['#466077', '#50697f'], alpha=118, outline=False, warm=False, jit=0.3)
MIST3 = Mat('mist3', ['#4f687e', '#5a7388'], alpha=165, outline=False, warm=False, jit=0.3)

MID_BARK = Mat('midBark', ['#06080e', '#090c13', '#0c1018', '#10141e', '#141924', '#191f2b', '#1f2632', '#262e3a', '#303a45', '#3f4c57'],
               warm=True, jit=0.6, cell=2.2, rim=1)
MID_LEAF = Mat('midLeaf', ['#050b0e', '#071012', '#091416', '#0c191a', '#0f1e1f', '#132424', '#182a29', '#1e322f', '#263c37', '#324941', '#455b52'],
               warm=True, jit=0.55, cell=2.0, rim=1)

GRASS = Mat('grass', ['#08100f', '#0a1412', '#0d1915', '#101e19', '#13231c', '#172920', '#1b2f24', '#203628', '#263d2d', '#2e4633', '#38503a',
                      '#455c43', '#566b4f'], outline=False, jit=0.55, cell=2.6)
DIRT = Mat('dirt', ['#0e0c0e', '#131012', '#181415', '#1e1919', '#251f1d', '#2c2522', '#342b27', '#3d332d', '#473b33', '#52443a', '#5e4f43'],
           outline=False, jit=0.4, cell=3.4)
ASH = Mat('ash', ['#121114', '#18171a', '#1f1d20', '#272427', '#302c2e', '#3a3537', '#463f40'], outline=False, jit=0.5, cell=1.8)
PEBBLE = Mat('pebble', ['#0d1016', '#13171f', '#1a1f28', '#222832', '#2b323d', '#363e49', '#444d58', '#555f6a', '#6b7580'], outline=True, jit=0.35,
             cell=1.6)
FLOWER_W = Mat('flowerW', ['#56637e', '#93a2bb', '#cfd8e6'], outline=False, jit=0.0)
FLOWER_Y = Mat('flowerY', ['#5e5a40', '#9a9058', '#d0c47c'], outline=False, jit=0.0)
FLOWER_P = Mat('flowerP', ['#4e3a54', '#86628a', '#bb92b8'], outline=False, jit=0.0)

BARK = Mat('bark', ['#050408', '#08070c', '#0c0a10', '#100d14', '#141118', '#19151d', '#1e1922', '#241e27', '#2a232c', '#312a32',
                    '#3a3239', '#453d42', '#524b4e', '#625f61', '#76797b'], jit=0.5, cell=1.8, rim=1)
MOSS = Mat('moss', ['#070e0c', '#0a130f', '#0e1913', '#122016', '#17271a', '#1d2f1e', '#243823', '#2d4228', '#384e2e', '#465c35', '#586d3f',
                    '#6e8250'], jit=0.45, cell=1.6, rim=1)
LEAF = Mat('leaf', ['#030709', '#040a0b', '#060e0e', '#081211', '#0b1714', '#0e1c18', '#12221b', '#16281f', '#1b2f24', '#21372a',
                    '#283f30', '#314a37', '#3d5641', '#4c654e', '#5f7a62', '#7a9478'], jit=0.45, cell=1.7, rim=1)
FERN = Mat('fern', ['#040a09', '#060e0c', '#09130f', '#0c1813', '#101e17', '#14251b', '#192c20', '#1f3425', '#273e2c', '#314934', '#3e573e',
                    '#4f684b'], jit=0.4, cell=1.7, rim=1)
VINE = Mat('vine', ['#06080a', '#0a0e0e', '#101612', '#172018', '#212b1f'], outline=False, jit=0.3, cell=2)


# ------------------------------------------------------------------ lighting helpers

def ground_dist_m(x, y):
    """Distance from the fire across the ground plane, in metres (57 px across, 38 px of depth)."""
    return np.hypot((np.asarray(x, float) - FIRE[0]) / PXM, (np.asarray(y, float) - FIRE[1]) / PZM)


def fire_on_surface(x, y, nx, ny, nz, reach=4.6, lift=0.35):
    """Firelight on an upright surface at screen (x, y) with normal n: falls off with distance from
    the flames, strongest on faces turned toward them."""
    dx = FIRE_FLAME[0] - np.asarray(x, float)
    dy = FIRE_FLAME[1] - np.asarray(y, float)
    d = np.hypot(dx / PXM, dy / PXM)
    l = np.hypot(dx, dy) + 1e-6
    ndl = np.maximum(0, (nx * dx + ny * dy) / l * 0.9 + nz * lift)
    return np.clip(1.25 - d / reach, 0, 1) * ndl


# ------------------------------------------------------------------ SKY

def cloud_puffs():
    puffs = []
    # Band across the moon's lower edge (lit from behind), drifting right.
    for k in range(17):
        x = 500 + k * 27 + (rnd(11, k) - 0.5) * 18
        y = 96 + math.sin(k * 0.9) * 6 + (x - 600) * 0.05 + (rnd(11, k, 2) - 0.5) * 6
        r = 13 + rnd(11, k, 3) * 15
        puffs.append((x, y, r, r * 0.5))
    for k in range(9):
        x = 560 + k * 30 + (rnd(12, k) - 0.5) * 20
        puffs.append((x, 112 + rnd(12, k, 2) * 8, 18 + rnd(12, k, 3) * 10, 8 + rnd(12, k, 4) * 3))
    # Thin high streaks on the left, mostly behind the canopy.
    for k in range(14):
        x = 150 + k * 26
        puffs.append((x, 46 + math.sin(k * 0.7) * 5 + k * 1.2, 16 + rnd(13, k) * 10, 4 + rnd(13, k, 2) * 3))
    # Low banks over the far forest.
    for k in range(26):
        x = -10 + k * 40 + (rnd(14, k) - 0.5) * 20
        puffs.append((x, 162 + rnd(14, k, 2) * 14, 24 + rnd(14, k, 3) * 18, 9 + rnd(14, k, 4) * 5))
    return puffs


def paint_sky():
    L = Layer(W, H)
    sl, X, Y = L.full()
    obj = L.new_obj(False)
    d = np.hypot(X - MOON[0], Y - MOON[1])
    v = 0.035 + 0.5 * np.clip(Y / 250, 0, 1) ** 1.35
    # Halo: a bright ring hugging the disc and a wide soft glow.
    out = np.maximum(0, d - MOON_R)
    v = v + 0.36 * np.exp(-out / 13) + 0.16 * np.exp(-(out / 70) ** 2) + 0.06 * np.exp(-(out / 170) ** 2)
    v = v + (fbm(X, Y * 1.8, 60, 3, 3) - 0.5) * 0.05
    L.put(sl, np.ones(X.shape, bool), SKY, v.astype(np.float32), obj)
    # Stars, before the clouds so the clouds hide them.
    for k in range(150):
        sx = rnd(21, k) * W
        sy = rnd(21, k, 2) * 230
        dm = math.hypot(sx - MOON[0], sy - MOON[1])
        if dm < 78:
            continue
        b = rnd(21, k, 3)
        bright = 0.25 + 0.75 * b * (1 - sy / 300)
        cx, cy = int(sx) + 0.5, int(sy) + 0.5
        bb = L.box(cx - 2, cy - 2, cx + 2, cy + 2)
        if bb is None:
            continue
        s2, X2, Y2 = bb
        core = (np.abs(X2 - cx) < 0.5) & (np.abs(Y2 - cy) < 0.5)
        L.put(s2, core, STAR, np.float32(min(0.99, bright + 0.1)), obj)
        if b > 0.93:
            arm = ((np.abs(X2 - cx) < 1.5) & (np.abs(Y2 - cy) < 0.5)) | ((np.abs(Y2 - cy) < 1.5) & (np.abs(X2 - cx) < 0.5))
            L.put(s2, arm & ~core, STAR, np.float32(0.3), obj)
            L.put(s2, core, STAR, np.float32(0.99), obj)
    # The moon: a full disc with soft maria and a faint darker limb.
    mo = L.new_obj(False)
    m, u, vv = ellipse_mask(X, Y, MOON[0], MOON[1], MOON_R, MOON_R)
    r = np.sqrt(u * u + vv * vv)
    maria = fbm(X * 1.0 + 40, Y * 1.0, 9, 3, 77)
    mv = 0.86 - 0.32 * smoothstep(0.52, 0.66, maria) - 0.14 * smoothstep(0.66, 0.74, maria) - 0.2 * r ** 6 + (0.08 * (-u - vv) * 0.5)
    L.put(sl, m, MOON_M, mv.astype(np.float32), mo)
    # Clouds: puffs with ragged edges, dark bodies and silver rims toward the moon.
    co = L.new_obj(False)
    best = np.full(X.shape, -9.0)
    lv = np.zeros(X.shape)
    for (cx, cy, rx, ry) in cloud_puffs():
        dd = 1 - ((X - cx) / rx) ** 2 - ((Y - cy) / ry) ** 2
        take = dd > best
        best = np.where(take, dd, best)
        lv = np.where(take, (Y - cy) / ry, lv)
    edge = (fbm(X * 0.8, Y * 1.6, 7, 3, 31) - 0.5) * 0.9
    cmask = best + edge > 0.0
    # Rim: how soon a step toward the moon leaves the cloud.
    ux = MOON[0] - X
    uy = MOON[1] - Y
    ul = np.hypot(ux, uy) + 1e-6
    ux, uy = ux / ul, uy / ul
    Hs, Ws = cmask.shape
    exit_at = np.full(X.shape, 99.0)
    for kk in range(1, 9):
        sx = np.clip(np.round((X + ux * kk * 1.0) * 2 - 0.5).astype(int), 0, Ws - 1)
        sy = np.clip(np.round((Y + uy * kk * 1.0) * 2 - 0.5).astype(int), 0, Hs - 1)
        outside = ~cmask[sy, sx]
        exit_at = np.where(outside & (exit_at > 90), kk, exit_at)
    prox = np.exp(-(d / 120) ** 2)
    prox2 = np.exp(-(d / 260) ** 2)
    rim = np.clip(1 - (exit_at - 1) / 5, 0, 1) * (0.25 + 0.75 * prox2)
    body = 0.22 - 0.1 * np.clip(lv, -1, 1) + 0.38 * prox + (fbm(X, Y * 1.5, 10, 2, 41) - 0.5) * 0.18
    cv = body + rim * (0.38 + 0.25 * prox)
    # Low banks are dimmer (farther from the moon), the moon shows through thin edges.
    cv = cv - 0.08 * smoothstep(140, 175, Y)
    L.put(sl, cmask, CLOUD, cv.astype(np.float32), co)
    return L


# ------------------------------------------------------------------ FAR FOREST

def cedar(L, x, top, base, tw, cw, mat, seed, obj, v0, v1, tiers=7):
    """A distant cedar: a straight trunk and a narrow crown of drooping tiers; the moon side lighter."""
    b = L.box(x - cw - 3, top - 2, x + cw + 3, base + 1)
    if b is None:
        return
    sl, X, Y = b
    crown_bot = top + (base - top) * (0.55 + rnd(seed, 1) * 0.15)
    t = (Y - top) / max(1, crown_bot - top)
    tier = (t * tiers) % 1.0
    hw = cw * np.clip(t, 0, 1) ** 0.85 * (0.62 + 0.38 * tier ** 1.6) + 0.8
    hw = hw + (noise(X, Y, 1.8, seed) - 0.5) * 2.2
    crown = (t >= 0) & (t <= 1.02) & (np.abs(X - x) <= hw)
    trunk = (Y >= top + 6) & (np.abs(X - x) <= tw / 2) & (Y <= base)
    u = np.clip((X - x) / np.maximum(hw, 1), -1, 1)
    vc = v0 + (v1 - v0) * (0.5 + 0.5 * u) + 0.08 * (tier > 0.75)
    L.put(sl, crown, mat, vc.astype(np.float32), obj)
    ut = np.clip((X - x) / (tw / 2 + 0.01), -1, 1)
    vt = v0 - 0.05 + (v1 - v0) * 0.6 * (0.5 + 0.5 * ut) + (noise(X * 3, Y * 0.3, 2, seed + 3) - 0.5) * 0.12
    L.put(sl, trunk & ~crown, mat, vt.astype(np.float32), obj)


def paint_forest_far():
    L = Layer(W, H)
    obj = L.new_obj(False)
    # Row A: the farthest stand, pale with distance.
    for k in range(44):
        x = -10 + k * 23 + (rnd(51, k) - 0.5) * 16
        top = 92 + rnd(51, k, 2) * 50 + abs(x - 560) * 0.02
        cedar(L, x, top, 246, 4 + rnd(51, k, 3) * 3, 9 + rnd(51, k, 4) * 6, FAR_A, 500 + k, obj, 0.32, 0.62)
    sl, X, Y = L.full()
    # Mist between the rows.
    m1 = (Y > 182 + (fbm(X, Y, 24, 3, 61) - 0.5) * 30) & (Y < 250)
    L.put(sl, m1, MIST1, np.float32(0.5), obj)
    # Row B: nearer cedars and a few round broadleaf crowns, darker.
    for k in range(30):
        x = -20 + k * 34 + (rnd(52, k) - 0.5) * 22
        top = 64 + rnd(52, k, 2) * 60 + max(0, 140 - abs(x - 600)) * 0.25
        if abs(x - MOON[0]) < 46:
            top = max(top, MOON[1] + MOON_R + 30)
        cedar(L, x, top, 250, 5 + rnd(52, k, 3) * 4, 12 + rnd(52, k, 4) * 8, FAR_B, 600 + k, obj, 0.3, 0.68, tiers=8)
    for k in range(9):
        x = 40 + k * 110 + (rnd(53, k) - 0.5) * 40
        cy = 168 + rnd(53, k, 2) * 18
        o2 = L.new_obj(False)
        clump(L, x, cy, 26 + rnd(53, k, 3) * 10, 18 + rnd(53, k, 4) * 6, FAR_B, 700 + k, o2, leaf_len=(2.5, 4.0), leaf_w=(1.6, 2.2),
              base=0.12, gain=0.55)
    # Forest floor far away, under the mist.
    floor = Y > 236 + (noise(X, Y, 6, 62) - 0.5) * 6
    L.put(sl, floor, FAR_B, np.float32(0.2), obj)
    m2 = (Y > 212 + (fbm(X + 300, Y, 30, 3, 63) - 0.5) * 34) & (Y < 252)
    gaps = fbm(X, Y, 50, 2, 64) > 0.45
    L.put(sl, m2 & gaps, MIST2, np.float32(0.5), obj)
    m3 = (Y > 230 + (fbm(X + 600, Y, 26, 3, 65) - 0.5) * 16) & (Y < 254) & (fbm(X, Y, 40, 2, 66) > 0.52)
    L.put(sl, m3, MIST3, np.float32(0.5), obj)
    return L


# ------------------------------------------------------------------ MID FOREST

def bark_trunk(L, pts, radii, mat, seed, obj, ambient=0.12, gain=0.75, furrow=0.28, cell=4.0, twist=0.0, warm=True, knots=(),
               lines=5.0, bulge=0.1, smooth=True, ldir=None):
    """A tapered trunk, limb or root along a smooth spline: bulges on the outline, bark furrows that
    run around it every few px and wander with the twist (a dark groove, the ridge wall facing the
    moon lit, the other in shade), cross cracks that split the ridges into plates, and knots with a
    dark hole, a raised lip and growth rings. Lit by the moon (ldir), and by the fire on faces turned to it."""
    ld = MOON_L if ldir is None else ldir
    if smooth:
        P, R = spline(pts, radii, 2.5)
    else:
        P, R = np.asarray(pts, float), np.asarray(radii, float)
    if bulge:
        k = np.arange(len(R))
        R = R * (1 + bulge * (noise(k * 0.0 + seed * 3.1, k * 2.5 / max(4.0, np.mean(R)), 1.0, seed + 91) - 0.5) * 2)
    tf = tube_fields(L, P, R)
    if tf is None:
        return None
    sl, inside, U, V, TX, TY, X, Y = tf
    nx = U * (-TY)
    ny = U * TX
    nz = np.sqrt(np.clip(1 - U * U, 0, 1))
    light = moon_light(nx, ny, nz, ambient, ld)
    theta = np.arcsin(np.clip(U, -1, 1))
    seg = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(P, axis=0).T))])
    r_here = np.interp(V, seg, R)
    around = theta * np.maximum(r_here, 1)
    f = around + twist * V
    spacing = cell * 1.45
    wob = (fbm(f / (cell * 2.2), V / (cell * 9), 1.0, 3, seed) - 0.5) * 3.2
    ph = f / spacing + wob
    c = ph % 1.0
    # Grooves narrow where the trunk turns away (foreshortened), wider facing us.
    gw = 0.2 + 0.08 * nz
    groove = c < gw
    # Which wall of a ridge faces the light: the ridge's +U edge if +U points toward it.
    plus_lit = ((-TY) * ld[0] + TX * ld[1]) > 0
    hi_edge = c > 0.8
    lo_edge = (c >= gw) & (c < gw + 0.18)
    lit_wall = np.where(plus_lit, hi_edge, lo_edge)
    dark_wall = np.where(plus_lit, lo_edge, hi_edge)
    # Cross cracks split the ridges into long plates.
    rid = np.floor(ph)
    cv_ = (V / (cell * 4.5) + hash2(rid, 7, seed)) % 1.0
    crack = (cv_ < 0.07) & ~groove & (hash2(rid, np.floor(V / (cell * 4.5) + hash2(rid, 7, seed)), seed + 1) > 0.35)
    v = light * gain + (hash2(rid, np.floor(V / (cell * 4.5) + hash2(rid, 7, seed)), seed + 2) - 0.5) * 0.08
    v = v - furrow * groove - furrow * 0.8 * crack + 0.13 * lit_wall * (light > 0.3) - 0.07 * dark_wall
    v = v + (noise(X, Y, 9, seed + 7) - 0.5) * 0.08
    wv = fire_on_surface(X, Y, nx, ny, nz) if warm else None
    L.put(sl, inside, mat, v.astype(np.float32), obj, wv)
    for (kx, ky, kr) in knots:
        b = L.box(kx - kr * 2.2, ky - kr * 2.8, kx + kr * 2.2, ky + kr * 2.8)
        if b is None:
            continue
        s2, X2, Y2 = b
        on = L.mat[s2] == mat.id
        hole, u2, v2 = ellipse_mask(X2, Y2, kx, ky, kr * 0.5, kr * 0.85)
        lipm, u3, v3 = ellipse_mask(X2, Y2, kx, ky, kr, kr * 1.45)
        burl, u4, v4 = ellipse_mask(X2, Y2, kx, ky, kr * 1.9, kr * 2.5)
        lit3 = np.clip(u3 * MOON_L[0] + v3 * MOON_L[1], -1, 1)
        rings = ((np.hypot(u4, v4) * 4.0) % 1.0) < 0.28
        L.put(s2, burl & ~lipm & on & rings, mat, np.float32(0.12), obj)
        L.put(s2, lipm & ~hole & on, mat, (0.38 + 0.32 * lit3).astype(np.float32), obj)
        L.put(s2, hole & on, mat, (0.0 + 0.06 * np.clip(-v2, 0, 1)).astype(np.float32), obj)
    return (sl, inside, U, V, TX, TY, X, Y)


def paint_forest_mid():
    L = Layer(W, H)
    trunks = [
        (118, 26, -0.04), (176, 15, 0.03), (236, 21, -0.02), (318, 13, 0.05), (388, 17, -0.03), (448, 9, 0.02),
        (676, 11, -0.02), (722, 19, 0.03), (790, 14, -0.04), (842, 24, 0.02), (906, 16, -0.03), (575, 8, 0.0),
    ]
    for k, (x, w, lean) in enumerate(trunks):
        o = L.new_obj(True)
        base = 238 + rnd(81, k) * 8
        top = -10
        pts = [(x + lean * (base - y) * 0.6, y) for y in np.linspace(base, top, 12)]
        radii = np.linspace(w / 2 + 2.5, w / 2 * 0.7, 12)
        bark_trunk(L, pts, radii, MID_BARK, 800 + k, o, ambient=0.1, gain=0.62, furrow=0.22, cell=3.0, twist=0.05)
        # Branch stubs.
        for j in range(2):
            by = 150 - j * 60 - rnd(82, k, j) * 30
            side = 1 if rnd(82, k, j + 5) > 0.5 else -1
            ex = x + side * (14 + rnd(82, k, j + 9) * 14)
            bark_trunk(L, [(x, by), ((x + ex) / 2, by - 6), (ex, by - 14)], [3.2, 2.2, 1.2], MID_BARK, 850 + k * 3 + j, o, ambient=0.1, gain=0.6,
                       furrow=0.1)
    # Foliage clumps catching the moon on their tops: heavy at the sides, open around the moon.
    clumps = []
    for k in range(70):
        x = rnd(83, k) * W
        cen = abs(x - 560)
        y = 10 + rnd(83, k, 2) * 140 + max(0, 210 - cen) * 0.45
        if math.hypot(x - MOON[0], y - MOON[1]) < 90 or (cen < 150 and y < 135):
            continue
        clumps.append((y, x, k))
    clumps.sort()
    for y, x, k in clumps:
        o = L.new_obj(True)
        rx = 22 + rnd(84, k) * 22
        clump(L, x, y, rx, rx * 0.6, MID_LEAF, 900 + k, o, leaf_len=(3.0, 5.0), leaf_w=(1.8, 2.6), base=0.0, gain=0.74, droop=0.7)
    # Underbrush along the far edge of the clearing.
    for k in range(34):
        x = -10 + k * 30 + (rnd(85, k) - 0.5) * 18
        y = 222 + rnd(85, k, 2) * 14
        o = L.new_obj(True)
        rx = 17 + rnd(85, k, 3) * 12
        clump(L, x, y, rx, rx * 0.58, MID_LEAF, 1000 + k, o, leaf_len=(2.6, 4.4), leaf_w=(1.7, 2.4), base=0.02, gain=0.7, droop=0.4)
    sl, X, Y = L.full()
    base = (Y > 238 + (noise(X, Y, 5, 86) - 0.5) * 6) & (Y < 262)
    L.put(sl, base, MID_LEAF, np.float32(0.08), L.new_obj(False))
    return L


# ------------------------------------------------------------------ GROUND

def tuft(L, bx, by, n, h, mat, val, seed, obj, warmf=None, spread=1.0, lit=0.32):
    """A grass tuft: n blades fanning up from (bx, by); each blade dark at the root, its tip catching
    the moon (a blade leaning right, toward the moon, more)."""
    for j in range(n):
        lean = (rnd(seed, j) - 0.5) * 2.0 * spread + (j - (n - 1) / 2) * 1.1 * spread
        hh = h * (0.6 + 0.4 * rnd(seed, j, 2))
        x0 = bx + (j - (n - 1) / 2) * 0.8 * spread
        b = L.box(min(x0, x0 + lean) - 1, by - hh - 1, max(x0, x0 + lean) + 1, by + 0.5)
        if b is None:
            continue
        sl, X, Y = b
        t = np.clip((by - Y) / hh, 0, 1)
        cx = x0 + lean * t ** 1.6
        wdt = 0.62 * (1 - t) + 0.3
        m = (np.abs(X - cx) <= wdt) & (Y <= by + 0.25) & (Y >= by - hh)
        v = val + lit * t ** 1.3 + (0.09 if lean > 0.2 else -0.03) * t
        L.put(sl, m, mat, np.full(X.shape, 0, np.float32) + v, obj, warmf(X, Y) if warmf else None)


def ground_warm(X, Y, k=1.0):
    """Firelight on the ground: bright close in, a long faint tail to about 4 m."""
    d = ground_dist_m(X, Y)
    return np.clip(1.3 / (1 + (d / 1.45) ** 2) - 0.1 - 0.02 * d, 0, 1) * k


def paint_ground(fire=True):
    L = Layer(W, H)
    sl, X, Y = L.full()
    gobj = L.new_obj(False)
    top = GROUND_TOP + (fbm(X, Y, 14, 2, 101) - 0.5) * 6
    land = Y >= top
    depth = np.clip((Y - GROUND_TOP) / (H - GROUND_TOP), 0, 1)
    wk = 1.0 if fire else 0.0
    warm = ground_warm(X, Y, wk)
    d = ground_dist_m(X, Y)
    # Grass: calm broad patches (no speckle), darker toward the forest and under the frame trees,
    # moonlight pooling where the canopy opens, and the fire brightening the middle.
    patches = fbm(X, Y * 1.6, 34, 3, 102)
    v = 0.34 + (patches - 0.5) * 0.18 - 0.16 * (1 - smoothstep(0, 0.25, depth))
    dapple = fbm(X * 0.8, Y * 1.5, 30, 3, 103)
    v = v + 0.1 * smoothstep(0.6, 0.66, dapple) * smoothstep(150, 260, X) * (1 - smoothstep(700, 820, X))
    v = v - 0.18 * (1 - smoothstep(70, 210, X)) - 0.18 * smoothstep(760, 890, X)
    v = v + 0.2 * warm
    # Short horizontal strokes: the lie of the grass.
    strokes = noise(X * 0.32, Y * 1.4, 1.6, 108)
    v = v + np.where(strokes > 0.7, 0.05, 0) - np.where(strokes < 0.22, 0.05, 0)
    L.put(sl, land, GRASS, v.astype(np.float32), gobj, warm)
    # Worn dirt around the fire and along the paths to the tents.
    path = np.zeros(X.shape)
    for (ax, ay, bx, by, wdt) in [(420, 336, 300, 312, 14), (260, 308, 236, 304, 14), (546, 334, 640, 318, 10), (700, 306, 726, 306, 12)]:
        tx, ty = bx - ax, by - ay
        ll = math.hypot(tx, ty)
        t = np.clip(((X - ax) * tx + (Y - ay) * ty) / (ll * ll), 0, 1)
        dd = np.hypot(X - (ax + tx * t), (Y - (ay + ty * t)) * 1.6)
        path = np.maximum(path, (1 - dd / (wdt * (1 - 0.35 * t))))
    dirtv = np.maximum(1 - d / 1.85, path * 0.7) + (fbm(X, Y * 1.4, 14, 3, 104) - 0.5) * 0.45
    dirt = land & (dirtv > 0.3)
    dv = 0.38 + (fbm(X, Y * 1.6, 16, 2, 105) - 0.5) * 0.14 - 0.08 * (1 - smoothstep(0, 0.2, depth)) + 0.22 * warm
    # Scuffs and a few cracks in the trodden earth.
    cr = fbm(X * 0.7, Y * 1.6, 9, 2, 109)
    dv = dv - 0.1 * (np.abs(cr - 0.5) < 0.018)
    L.put(sl, dirt, DIRT, dv.astype(np.float32), gobj, warm)
    # Ash and scorched earth just around the ring.
    ring = land & (d < 0.9 + (noise(X, Y, 3, 106) - 0.5) * 0.3)
    L.put(sl, ring, ASH, (0.36 + (noise(X, Y, 2.2, 107) - 0.5) * 0.3 + 0.15 * warm).astype(np.float32), gobj, warm)
    # Grass tufts in loose groups: thick at the edges, sparse on the dirt, none in the ring.
    for g in range(330):
        gx0 = rnd(110, g) * W
        gy0 = GROUND_TOP + 6 + rnd(110, g, 2) ** 0.9 * (H - GROUND_TOP - 2)
        for k in range(2 + int(rnd(110, g, 7) * 4)):
            bx = gx0 + (rnd(111 + k, g) - 0.5) * 16
            by = gy0 + (rnd(112 + k, g) - 0.5) * 7
            if by < GROUND_TOP + 3 or by > H + 4:
                continue
            gx, gy = min(W - 1, max(0, int(bx))), min(H - 1, int(by))
            dk = float(ground_dist_m(bx, by))
            if dk < 1.15:
                continue
            on_dirt = L.mat[gy * 2, gx * 2] == DIRT.id
            if on_dirt and rnd(113 + k, g) > 0.12:
                continue
            o = L.new_obj(False)
            sc = 0.7 + 0.65 * (by - GROUND_TOP) / (H - GROUND_TOP)
            n = 4 + int(rnd(114 + k, g) * 4)
            shade = 0.1 * (1 - smoothstep(70, 210, bx)) + 0.1 * smoothstep(760, 890, bx)
            val = 0.1 + 0.12 * rnd(115 + k, g) - shade
            tuft(L, bx, by, n, (4 + rnd(116 + k, g) * 4.5) * sc, GRASS, val, 1200 + g * 8 + k, o,
                 warmf=(lambda X2, Y2: ground_warm(X2, Y2, wk * 1.05)), spread=sc, lit=0.34 + 0.12 * float(ground_warm(bx, by, wk)))
    # Tufts along the far edge poke up over the forest's foot.
    for k in range(300):
        bx = k * 3.3 + rnd(111, k) * 3
        by = GROUND_TOP + 2 + rnd(111, k, 2) * 5
        o = L.new_obj(False)
        tuft(L, bx, by, 3 + int(rnd(111, k, 3) * 3), 3 + rnd(111, k, 4) * 4, GRASS, 0.04 + rnd(111, k, 5) * 0.12, 2900 + k, o, lit=0.22)
    # Small flat stones in little groups, mostly at the dirt's edge.
    for g in range(16):
        gx0 = 170 + rnd(120, g) * 640
        gy0 = GROUND_TOP + 24 + rnd(120, g, 2) * (H - GROUND_TOP - 30)
        for k in range(1 + int(rnd(121, g) * 3)):
            bx = gx0 + (rnd(122 + k, g) - 0.5) * 14
            by = gy0 + (rnd(123 + k, g) - 0.5) * 6
            if float(ground_dist_m(bx, by)) < 1.15:
                continue
            o = L.new_obj(True)
            rx = 1.6 + rnd(124 + k, g) ** 2 * 3.6
            ry = rx * (0.48 + 0.16 * rnd(125 + k, g))
            s2, X2, Y2 = L.box(bx - rx - 1, by - ry - 1, bx + rx + 1, by + ry + 1)
            m, u, vv = ellipse_mask(X2, Y2, bx, by, rx, ry, (rnd(126 + k, g) - 0.5) * 0.6)
            m &= ~((vv > 0.55) & (np.abs(u) > 0.5))
            nz = np.sqrt(np.clip(1 - u * u - vv * vv, 0, 1))
            lv = moon_light(u * 0.7, vv * 0.9 - 0.3, nz, 0.12) * 0.85 + (noise(X2, Y2, 1.2, 120 + k) - 0.5) * 0.12
            L.put(s2, m, PEBBLE, lv.astype(np.float32), o, ground_warm(X2, Y2, wk * 1.1))
    # Tiny flowers in the grass, away from the fire.
    for k in range(70):
        bx = 150 + rnd(130, k) * 660
        by = GROUND_TOP + 10 + rnd(130, k, 2) * (H - GROUND_TOP - 10)
        gx, gy = min(W - 1, int(bx)), min(H - 1, int(by))
        if L.mat[gy * 2, gx * 2] != GRASS.id or float(ground_dist_m(bx, by)) < 2.2:
            continue
        mat = [FLOWER_W, FLOWER_W, FLOWER_W, FLOWER_Y, FLOWER_P][int(rnd(130, k, 3) * 5)]
        o = L.new_obj(False)
        cx, cy = int(bx) + 0.5, int(by) + 0.5
        s2, X2, Y2 = L.box(cx - 2, cy - 3, cx + 2, cy + 2)
        stem = (np.abs(X2 - cx) < 0.5) & (Y2 > cy) & (Y2 < cy + 2)
        L.put(s2, stem, GRASS, np.float32(0.3), o)
        big = rnd(130, k, 4) > 0.55
        petal = ((np.abs(X2 - cx) < 1.5) & (np.abs(Y2 - cy) < 0.5)) | ((np.abs(Y2 - cy) < 1.0) & (np.abs(X2 - cx) < 0.5))
        if big:
            L.put(s2, petal, mat, np.float32(0.5), o)
        L.put(s2, (np.abs(X2 - cx) < 0.5) & (np.abs(Y2 - cy) < 0.5), mat, np.float32(0.99 if big else 0.7), o)
    return L


# ------------------------------------------------------------------ FRAME TREES

def moss_on(L, sl, inside, X, Y, nx, ny, mat_from, seed, obj, amount=0.4, warm=None, up_bias=0.35, ldir=None):
    """Moss on the upward faces of bark: patches built of round cushions (a jittered grid), each lit
    on the side toward the moon with a dark crease between cushions; the lower edge hangs ragged."""
    ld = MOON_L if ldir is None else ldir
    up = -ny
    patch = fbm(X, Y * 1.2, 18, 3, seed) + up * up_bias + np.maximum(0, -nx * np.sign(ld[0])) * 0.06
    m = inside & (L.mat[sl] == mat_from.id) & (patch > 1 - amount)
    du, dv, d = cushions(X, Y, 3.6, seed + 1)
    cz = np.sqrt(np.clip(1 - np.minimum(d, 1) ** 2, 0, 1))
    lit = moon_light(du * 0.8 + nx * 0.4, dv * 0.8 + ny * 0.4, cz, 0.1, ld)
    v = 0.12 + 0.62 * lit - 0.16 * (d > 0.86) + up * 0.08
    m &= d < 1.05
    L.put(sl, m, MOSS, v.astype(np.float32), obj, warm)


def frame_tree(L, side):
    """One huge gnarled frame tree: back roots, limbs into the canopy, the twisting trunk with
    knots and moss, then the front roots spreading over the clearing and diving into it."""
    sgn = 1 if side == 'L' else -1
    X0 = 0 if side == 'L' else W
    # The moon lies toward the middle of the picture from both trees.
    ldir = MOON_L if side == 'L' else unit([-0.4, -0.62, 0.62])

    def P(x, y):
        return (X0 + sgn * x, y)

    def path(pts):
        return [P(x, y) for x, y in pts]

    seed = 2000 if side == 'L' else 3000
    if side == 'L':
        trunk = [(28, 440), (38, 394), (60, 348), (52, 296), (62, 240), (86, 180), (82, 122), (94, 66), (108, 12), (120, -40)]
        tr = [100, 90, 76, 62, 58, 56, 54, 50, 46, 44]
        limbs = [
            ([(86, 190), (128, 152), (188, 114), (260, 86), (338, 68), (418, 62)], [28, 24, 19, 15, 11, 8]),
            ([(98, 114), (134, 62), (154, 12), (166, -30)], [26, 21, 17, 15]),
            ([(54, 152), (20, 94), (-10, 52)], [30, 24, 20]),
        ]
        back_roots = [([(88, 330), (120, 320), (148, 318), (166, 324), (178, 334)], [19, 14, 10, 7, 3])]
        front_roots = [
            # A root that arches out of the ground and dives back in (a knee), then runs on.
            ([(66, 354), (98, 362), (124, 362), (142, 350), (158, 348), (170, 360), (180, 374), (198, 382), (214, 386)],
             [27, 20, 16, 13, 11, 10, 9, 6, 2]),
            ([(34, 374), (46, 402), (54, 426), (58, 450)], [36, 31, 28, 26]),
        ]
        knots = [(64, 266, 8), (88, 152, 6)]
        burying = [(214, 387), (178, 335)]
    else:
        trunk = [(34, 440), (50, 390), (40, 338), (56, 282), (50, 224), (70, 166), (62, 110), (76, 52), (86, -40)]
        tr = [96, 84, 70, 60, 56, 54, 50, 46, 42]
        limbs = [
            ([(66, 170), (118, 132), (176, 98), (236, 74), (290, 62)], [26, 22, 17, 12, 8]),
            ([(74, 98), (108, 42), (128, -20)], [24, 19, 15]),
        ]
        back_roots = [([(80, 326), (112, 318), (136, 318), (152, 326), (162, 336)], [18, 13, 9, 6, 2])]
        front_roots = [
            ([(64, 350), (94, 358), (118, 356), (134, 346), (150, 348), (160, 362), (168, 376), (184, 384)], [25, 18, 14, 12, 10, 9, 6, 2]),
            ([(32, 372), (44, 400), (52, 426), (56, 450)], [34, 29, 26, 24]),
        ]
        knots = [(50, 256, 8), (66, 142, 6)]
        burying = [(184, 385), (162, 337)]

    def bark(pts, rr, s, obj, twist=0.12, kn=(), moss=0.36, up_bias=0.35):
        tf = bark_trunk(L, path(pts), rr, BARK, s, obj, ambient=0.1, gain=0.8, furrow=0.3, cell=4.4, twist=twist * sgn,
                        knots=[(*P(kx, ky), kr) for kx, ky, kr in kn], bulge=0.12, ldir=ldir)
        if tf is None:
            return
        sl, inside, U, V, TX, TY, X, Y = tf
        nx = U * (-TY)
        ny = U * TX
        nz = np.sqrt(np.clip(1 - U * U, 0, 1))
        moss_on(L, sl, inside, X, Y, nx, ny, BARK, s + 50, obj, amount=moss, warm=fire_on_surface(X, Y, nx, ny, nz), up_bias=up_bias,
                ldir=ldir)

    for k, (pts, rr) in enumerate(back_roots):
        bark(pts, rr, seed + 10 + k, L.new_obj(True), twist=0.04, moss=0.36, up_bias=0.4)
    for k, (pts, rr) in enumerate(limbs):
        bark(pts, rr, seed + 20 + k, L.new_obj(True), twist=0.2, moss=0.36, up_bias=0.5)
    bark(trunk, tr, seed + 1, L.new_obj(True), twist=0.22, kn=knots, moss=0.28, up_bias=0.0)
    for k, (pts, rr) in enumerate(front_roots):
        bark(pts, rr, seed + 30 + k, L.new_obj(True), twist=0.04, moss=0.36, up_bias=0.4)
    # Grass and earth over the root tips, so they dive into the ground.
    for k, (x, y) in enumerate(burying):
        bx, by = P(x, y)
        for j in range(3):
            o = L.new_obj(False)
            tuft(L, bx + (j - 1) * 4 - sgn * 3, by + 1 + j % 2, 5, 5 + j, GRASS, 0.06, seed + 300 + k * 7 + j, o, spread=1.0, lit=0.3)


def fern(L, bx, by, fronds, mat, seed, obj, scale=1.0, base=0.0, gain=0.85, warm=0.0):
    """A fern: fronds arching out from (bx, by), each a curving rachis with paired leaflets that
    shrink toward the tip; leaflets on the upper side catch the moon, the lower ones stay dark."""
    for j, (ang, length, curl) in enumerate(fronds):
        length *= scale
        n = max(4, int(length / 2.4))
        dx, dy = math.cos(ang), math.sin(ang)
        pts = []
        for i in range(n + 1):
            t = i / n
            pts.append((bx + dx * length * t, by + dy * length * t + curl * length * t * t))
        o = obj if obj else L.new_obj(True)
        tf = tube_fields(L, pts, np.linspace(0.85, 0.4, len(pts)) * scale ** 0.5)
        if tf is not None:
            sl, inside, U, V, TX, TY, X, Y = tf
            L.put(sl, inside, mat, np.float32(base + 0.2), o, np.float32(warm) if warm else None)
        for i in range(1, n):
            t = i / n
            ax, ay = pts[i]
            tx, ty = pts[i + 1][0] - pts[i - 1][0], pts[i + 1][1] - pts[i - 1][1]
            tl = math.hypot(tx, ty) or 1
            tx, ty = tx / tl, ty / tl
            ll = (3.0 + 6.0 * math.sin(math.pi * min(1.0, t * 1.1 + 0.05)) ** 0.8 * (1 - 0.5 * t)) * scale
            for s in (-1, 1):
                lx, ly = -ty * s, tx * s
                la = math.atan2(ly + ty * 0.7, lx + tx * 0.7)
                up = -math.sin(la)
                lv = base + gain * (0.3 + 0.32 * up + 0.12 * math.cos(la) * MOON_L[0] + 0.1 * (1 - t)) + (rnd(seed, j * 97 + i, 1 + s) - 0.5) * 0.1
                leaf(L, ax, ay, la, ll, max(1.7, 2.4 * scale ** 0.6), mat, lv, o, warm=np.float32(warm) if warm else None,
                     tipv=0.12, sidev=0.07)


def paint_frame_back():
    L = Layer(W, H)
    frame_tree(L, 'L')
    frame_tree(L, 'R')
    # Small ferns among the roots, behind the characters.
    for (bx, by, sc, s) in [(150, 344, 0.85, 1), (214, 336, 0.6, 2), (836, 340, 0.8, 3), (774, 330, 0.6, 4), (24, 322, 0.75, 5), (940, 318, 0.7, 6)]:
        fronds = []
        for j in range(7):
            a = -math.pi / 2 + (j - 3) * 0.42 + (rnd(4000 + s, j) - 0.5) * 0.3
            fronds.append((a, 22 + rnd(4000 + s, j, 2) * 12, 0.6 + abs(j - 3) * 0.12))
        fern(L, bx, by, fronds, FERN, 4000 + s, 0, scale=sc, base=0.0, gain=0.62,
             warm=float(np.clip(1.2 - float(ground_dist_m(bx, by)) / 4.6, 0, 0.6)))
    return L


# ------------------------------------------------------------------ FRAME FRONT

def canopy(L, side):
    sgn = 1 if side == 'L' else -1
    X0 = 0 if side == 'L' else W
    seed = 5000 if side == 'L' else 6000
    # Masses along the arch: (x from the edge, y, rx, ry); back rows first, each row lower and smaller.
    if side == 'L':
        rows = [
            [(20, 4, 76, 50), (140, -14, 80, 44), (256, -10, 70, 38), (360, 2, 56, 30), (444, 10, 38, 20)],
            [(4, 84, 60, 54), (96, 46, 66, 42), (206, 34, 62, 34), (312, 40, 52, 28), (402, 50, 40, 21)],
            [(28, 158, 48, 44), (96, 112, 50, 34), (176, 88, 50, 28), (262, 80, 44, 24), (344, 84, 34, 18), (414, 86, 22, 12)],
            [(10, 222, 36, 36), (58, 168, 32, 26), (138, 126, 34, 20), (220, 114, 30, 17), (298, 112, 26, 14), (366, 108, 18, 10)],
        ]
    else:
        rows = [
            [(24, 2, 70, 44), (136, -8, 70, 40), (236, 2, 50, 28)],
            [(6, 76, 56, 48), (94, 42, 60, 36), (186, 36, 50, 28), (262, 44, 32, 18)],
            [(24, 144, 44, 38), (90, 100, 44, 30), (164, 78, 42, 24), (232, 76, 28, 15)],
            [(12, 200, 32, 32), (60, 154, 30, 24), (124, 116, 30, 17), (192, 104, 22, 12)],
        ]
    for ri, row in enumerate(rows):
        for k, (x, y, rx, ry) in enumerate(row):
            cx = X0 + sgn * x
            o = L.new_obj(True)
            near_moon = 1 - min(1, abs(cx - MOON[0]) / 560)
            gain = 0.62 + 0.08 * ri + 0.2 * near_moon
            ld = unit([MOON[0] - cx, (MOON[1] - y) * 0.6 - 60, 120])

            def light(nx, ny, nz, px, py, ld=ld):
                # Seen from below against the sky: dark undersides, moonlight only on the edges turned to it.
                l = max(0.0, nx * ld[0] + ny * ld[1] + nz * ld[2] * 0.4)
                return 0.14 + 0.86 * l ** 1.6
            clump(L, cx, y, rx, ry, LEAF, seed + ri * 50 + k, o, leaf_len=(4.5, 7.5), leaf_w=(2.4, 3.4), base=0.0, gain=gain, droop=0.9,
                  lobes=3 + int(rnd(seed, ri * 10 + k, 1) * 3), light=light, fill_val=0.02)
    return rows


def hanging(L, side, rows):
    """Strands of leaves hanging from the canopy and a few thin vines looping down."""
    sgn = 1 if side == 'L' else -1
    X0 = 0 if side == 'L' else W
    seed = 7000 if side == 'L' else 7500
    low = rows[-1]
    for k in range(len(low) * 2 + 2):
        x, y, rx, ry = low[k % len(low)]
        x = x + (rnd(seed, k) - 0.5) * rx * 1.4
        top = y + ry * 0.55
        length = 14 + rnd(seed, k, 2) ** 1.5 * 52
        cx = X0 + sgn * x
        o = L.new_obj(True)
        n = int(length / 3.0)
        sway = (rnd(seed, k, 3) - 0.5) * 10
        for i in range(n):
            t = i / max(1, n - 1)
            px = cx + sway * t * t
            py = top + length * t
            s = 1 if (i + k) % 2 else -1
            ang = math.pi / 2 + s * (0.75 + rnd(seed, k * 31 + i, 4) * 0.5)
            facing = s * sgn < 0
            lv = 0.14 + 0.18 * (1 - t) + (0.2 if facing else 0.02) + (rnd(seed, k * 31 + i, 5) - 0.5) * 0.12
            leaf(L, px, py, ang, (4.4 + rnd(seed, k * 31 + i, 6) * 2.6) * (1 - 0.35 * t), 2.6, LEAF, lv, o, tipv=0.12, sidev=0.08)
    # Thin vines: catenary loops between two points of the canopy, or a single hanging strand.
    for k in range(4):
        xa = 40 + rnd(seed + 1, k) * (330 if side == 'L' else 220)
        xb = xa + 30 + rnd(seed + 1, k, 5) * 60
        ya = 90 + rnd(seed + 1, k, 2) * 50
        yb = ya - 10 + rnd(seed + 1, k, 6) * 20
        drop = 30 + rnd(seed + 1, k, 3) * 50
        o = L.new_obj(False)
        A = (X0 + sgn * xa, ya)
        B = (X0 + sgn * xb, yb)
        pts = bezier(A, ((A[0] + B[0]) / 2, max(ya, yb) + drop * 2), B, n=40)
        tf = tube_fields(L, pts, np.full(len(pts), 0.6))
        if tf is not None:
            sl, inside, U, V, TX, TY, X, Y = tf
            L.put(sl, inside, VINE, (0.45 - 0.3 * U * np.sign(TX + 1e-6)).astype(np.float32), o)
        for i in range(5, len(pts) - 3, 5):
            px, py = pts[i]
            s = 1 if (i // 5) % 2 else -1
            o2 = L.new_obj(True)
            leaf(L, px, py, math.pi / 2 + s * 0.8, 3.8, 2.3, LEAF, 0.26 + (0.16 if s * sgn < 0 else 0), o2, tipv=0.1, sidev=0.06)


def paint_frame_front():
    L = Layer(W, H)
    for side in ('L', 'R'):
        rows = canopy(L, side)
        hanging(L, side, rows)
    # Foreground: a root crossing the bottom-left corner and big near ferns at both corners.
    o = L.new_obj(True)
    bark_trunk(L, [(-12, 402), (30, 406), (70, 416), (104, 430), (124, 446)], [17, 15, 13, 11, 10], BARK, 8100, o, ambient=0.05, gain=0.6,
               furrow=0.3, cell=4.0, twist=0.04, lines=4.0)
    for (bx, by, sc, s, n, spread) in [(26, 436, 1.35, 1, 9, 0.34), (146, 436, 0.95, 2, 7, 0.4), (934, 436, 1.4, 3, 9, 0.34), (836, 440, 0.9, 4, 7, 0.4)]:
        fronds = []
        for j in range(n):
            a = -math.pi / 2 + (j - (n - 1) / 2) * spread + (rnd(8200 + s, j) - 0.5) * 0.25
            fronds.append((a, 40 + rnd(8200 + s, j, 2) * 26, 0.5 + abs(j - (n - 1) / 2) * 0.1))
        fern(L, bx, by, fronds, FERN, 8200 + s, 0, scale=sc, base=-0.06, gain=0.62,
             warm=float(np.clip(1.15 - float(ground_dist_m(bx, by - 30)) / 4.8, 0, 0.5)))
    return L


# ------------------------------------------------------------------ resolve and write

def finish(L, seed, outline=False, inner=True, rim=True):
    r = L.resolve(seed)
    if rim:
        r.rim(1, -1, 1)
    if inner:
        r.inner_lines()
    if outline:
        r.outline()
    return r


def scene_json():
    spots = [
        {'x': 372, 'y': 352, 'facing': 'right', 'note': 'left of the fire'},
        {'x': 590, 'y': 352, 'facing': 'left', 'note': 'right of the fire'},
        {'x': 418, 'y': 306, 'facing': 'right', 'note': 'behind the fire, left'},
        {'x': 548, 'y': 304, 'facing': 'left', 'note': 'behind the fire, right'},
    ]
    # Props: x, y = where the sprite's anchor lands. z nudges the draw order among props at one y.
    props = [
        {'group': 'campsite', 'name': 'tent_large', 'x': 206, 'y': 314},
        {'group': 'campsite', 'name': 'bedroll', 'x': 292, 'y': 330},
        {'group': 'campsite', 'name': 'backpack', 'x': 326, 'y': 326},
        {'group': 'campsite', 'name': 'sword_stuck', 'x': 346, 'y': 314},
        {'group': 'campsite', 'name': 'stump_axe', 'x': 160, 'y': 374},
        {'group': 'campsite', 'name': 'firewood', 'x': 268, 'y': 380},
        {'group': 'campsite', 'name': 'campfire_large', 'x': FIRE[0], 'y': FIRE[1], 'anim': 'burning', 'note': 'anchor = centre of the ring'},
        {'group': 'campsite', 'name': 'smoke_tall', 'x': FIRE[0] + 2, 'y': FIRE[1] - 52, 'z': 52.5, 'note': 'foot at the flame tips'},
        {'group': 'campsite', 'name': 'cooking_tripod', 'x': FIRE[0], 'y': FIRE[1], 'z': 1, 'note': 'anchor = ground under the pot'},
        {'group': 'campsite', 'name': 'log_seat', 'x': 600, 'y': 398},
        {'group': 'campsite', 'name': 'tent_small', 'x': 716, 'y': 306, 'flip': True},
        {'group': 'campsite', 'name': 'swords_pair', 'x': 640, 'y': 326},
        {'group': 'campsite', 'name': 'torii', 'x': 870, 'y': 294},
        {'group': 'landmarks', 'name': 'stone_lantern', 'x': 796, 'y': 344, 'anim': 'lit'},
        {'group': 'campsite', 'name': 'fern_clump', 'x': 932, 'y': 330},
        {'group': 'campsite', 'name': 'fern_clump', 'x': 770, 'y': 352, 'flip': True},
        {'group': 'campsite', 'name': 'fern_clump', 'x': 118, 'y': 396},
    ]
    return {
        'name': 'camp_night',
        'size': [W, H],
        'pxPerMeter': PXM,
        'pxPerMeterDepth': PZM,
        'groundTop': GROUND_TOP,
        'layers': {
            'back': ['sky.png', 'forest_far.png', 'forest_mid.png', 'ground.png', 'frame_back.png'],
            'front': ['frame_front.png'],
            'groundNoFire': 'ground_nofire.png',
        },
        'fire': {'x': FIRE[0], 'y': FIRE[1], 'flameY': FIRE_FLAME[1], 'lightRadiusM': 3.9},
        'moon': {'x': MOON[0], 'y': MOON[1], 'r': MOON_R},
        'spots': spots,
        'partySpots': [spots[0], spots[1], spots[3]],
        'props': props,
        'grade': {
            'note': 'How day-lit sprites are lit in this scene (tools/scenes/camp_preview.py grade()): multiply by the moon and add its ambient; '
                    'firelight by distance from the flames (57 px/m across, 38 px/m deep), quantised to 4 levels through the warm tint; '
                    'a warm rim on silhouette edges facing the fire, a faint cool rim on edges facing the upper right. Flames stay as they are.',
            'moonMul': [0.4, 0.48, 0.68],
            'moonAdd': [5, 9, 21],
            'fireTint': [1.9, 1.4, 0.92],
            'fireAdd': [58, 34, 14],
            'fireLevels': [0, 0.32, 0.62, 0.95],
            'fireFalloff': 'w = 1.3 / (1 + (d / 1.55)^2) - 0.1, d in metres',
        },
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=os.environ.get('SCENE_OUT', DEFAULT_OUT))
    ap.add_argument('--only', default='')
    a = ap.parse_args()
    out = a.out
    only = [s for s in a.only.split(',') if s]
    os.makedirs(out, exist_ok=True)
    jobs = [
        ('sky', lambda: finish(paint_sky(), 1, inner=False, rim=False)),
        ('forest_far', lambda: finish(paint_forest_far(), 2, inner=False, rim=False)),
        ('forest_mid', lambda: finish(paint_forest_mid(), 3)),
        ('ground', lambda: finish(paint_ground(True), 4, rim=False)),
        ('ground_nofire', lambda: finish(paint_ground(False), 4, rim=False)),
        ('frame_back', lambda: finish(paint_frame_back(), 5, outline=True)),
        ('frame_front', lambda: finish(paint_frame_front(), 6, outline=True)),
    ]
    for name, job in jobs:
        if only and name not in only:
            continue
        r = job()
        save(r.image(), os.path.join(out, name + '.png'))
        print('wrote', name)
    tmp = os.path.join(out, 'scene.json.tmp')
    with open(tmp, 'w') as f:
        json.dump(scene_json(), f, indent=1)
        f.write('\n')
    os.replace(tmp, os.path.join(out, 'scene.json'))


if __name__ == '__main__':
    main()
