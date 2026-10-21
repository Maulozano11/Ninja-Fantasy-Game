"""The owner's Scarlet's pinstripe trousers and noble belt (docs/reference/scarlet-owner-reference.jpg).

His picture is not at our scale (tools/refs/scarlet_ref.py: one of his pixels is about 0.57 of ours),
so nothing here is his pixels 1:1. What it lifts out, every colour one of his (PALETTE):

  the trousers  his colours by role. Our trousers keep our cloth's shape (it fits every body and pose)
                and take his colours by the tone our light gives each pixel: the cloth between his
                pinstripes and the stripes on it, each picked from his own trousers in the coat's
                opening (checked below: every one is common there). His stripes are 2 of his pixels
                apart, a pixel at our scale: ours are 3 fine pixels apart, so each stays a clean line
                however the leg turns (2 apart, a slanting line would step into a checkerboard).
  the belt      his black belt by tone, and its gold ornaments as the reduced reference has them
                (tools/refs/scarlet-study.py, his figure at our scale on our male at idle frame 0):
                the ring buckle on the front, the cross hanging over the near thigh, and the far
                tassel under its gold knot. The tassel's reds are his: the study's block medians mix
                his thin red cord with the black round it, so each of its 5 rows takes the commonest
                red of the matching fifth of his cord, top to bottom, in his picture. And the small
                gold star just inside his coat's near edge (his pixels 70-74, 116-119): it hangs over
                the trousers, a pixel clear of the coat's trim, so the coat leaves it out
                (scarlet-upper-from-ref.py, BELT_HANG) and the belt carries it.
  the anchors   where each ornament hangs, in our torso's own frame (design units from the pelvis
                along rig.right and rig.up), found on our male at idle (scarlet_ref.OUR_JOINTS, his
                torso leaning IDLE_LEAN): at rest every ornament pixel is where the reduced reference
                has it.

It writes the TypeScript module (src/sprite/items/scarletLowerArt.ts) and, in <study>, the ornaments
at 8x next to the reduced reference's waist. The same picture always gives the same bytes:

  python3 -I tools/refs/scarlet-lower-from-ref.py src/sprite/items/scarletLowerArt.ts <study>
"""

import collections
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

from scarlet_ref import CHARS, OUR_JOINTS, PALETTE, REF, grid, native, quantize, reduced, reduced_layers, rgb, save, ts_piece  # noqa: E402

C = {ch: PALETTE[i] for i, ch in enumerate(CHARS[:len(PALETTE)])}
RES = 2

# Our male's torso at idle frame 0 leans this far (src/sprite/rig.ts, the idle pose's lean): rig.right
# points this many degrees above screen-right.
IDLE_LEAN = -2.0

# His trousers in the coat's opening, his pixels (x0, y0, x1, y1): both legs from under his belt's
# ornaments to his coat's hem, between the coat's skirts.
TROUSERS = (66, 112, 98, 150)
# His belt across the opening, under his shirt: the strap left of the ring buckle and right of it.
BELT = (80, 100, 92, 105)

# His trousers by the tone our cloth light gives (0 darkest .. 5 the lit crest of a fold), as his near
# leg runs across in his row 133 (e f n n h t j t j n d d) and his far leg in row 130 (d d f j f n f n f d):
# on the lit side his cloth is j with t stripes, in the shade f with n stripes, at the dark inner side d
# with j stripes; the darkest tone keeps a faint f stripe, and the crest lifts both a step (t, and his
# lightest grey there, B).
CLOTH_TONES = 'dddfjt'
STRIPE_TONES = 'dfjntB'
# The colours the colour slots recolour from: his lit cloth and his lit stripe.
CLOTH, STRIPE = 'j', 't'
# His belt by tone: near black (d) through the purple black of his strap (h) to the grey of its sheen
# beside the buckle (t, B; his row 102).
BELT_TONES = 'dddhtB'
LEATHER = 'd'
# His line.
LINE = 'a'

# The ornaments in the reduced reference's torso layer (our 256 frame): name -> box (x0, y0, x1, y1,
# inclusive), the pixels kept (his gold, the dark of the buckle's hole and the cross's lattice; not the
# belt's or the trousers' colours round them), and the pivot pixel (where it hangs from, or for the
# buckle its middle).
ORNAMENTS = {
    'buckle': ((128, 172, 132, 175), (130, 173)),
    'cross': ((124, 176, 128, 183), (126, 176)),
    'tassel': ((134, 176, 134, 181), (134, 176)),
    'star': ((122, 182, 123, 183), (122, 182)),
}
GOLD = 'FJOSXvy'
DARK = 'ad'
# The buckle's hole and the cross's lattice: the dark pixels walled in by its gold.
HOLES = {'buckle': [(129, 173), (130, 173), (129, 174), (130, 174)], 'cross': [(125, 179), (127, 179)]}
# His red tassel in the picture (his pixels): the cord under the far gold knot, and its rows in ours.
TASSEL = (92, 104, 97, 116)
TASSEL_ROWS = range(177, 182)

# The colours the Gold and Tassel slots recolour from: his gold, and his tassel's red.
GOLD_BASE = 'S'
RED_BASE = 's'


def check_common(region, chars, what, at_least=3):
    """Each colour must be one of his in that region of his picture, at least a few times."""
    x0, y0, x1, y1 = region
    q = quantize(native()[y0:y1, x0:x1])
    n = collections.Counter(CHARS[i] for i in q.ravel())
    for ch in set(chars):
        if n[ch] < at_least:
            raise SystemExit(f'{what}: {ch} {C[ch]} is not common in his picture there ({n[ch]})')


def tassel_reds():
    """His tassel's reds, top to bottom: the picture's red pixels in the cord, split into as many bands as
    our rows, each band's commonest red of his (only reds: the cord's edges blur into his gold and
    black)."""
    a = np.asarray(Image.open(REF).convert('RGB')).astype(np.int32)
    xs, ys = grid()
    x0, y0, x1, y1 = TASSEL
    sub = a[ys[y0]:ys[y1], xs[x0]:xs[x1]]
    red = (sub[..., 0] > 110) & (sub[..., 0] > sub[..., 1] + 60)
    yy, _ = np.nonzero(red)
    q = quantize(sub[red])
    reds = {ch for ch in CHARS[:len(PALETTE)] if _is_red(C[ch])}
    order = np.argsort(yy, kind='stable')
    n = len(order)
    out = []
    for k in range(len(TASSEL_ROWS)):
        band = order[k * n // len(TASSEL_ROWS):(k + 1) * n // len(TASSEL_ROWS)]
        cnt = collections.Counter(CHARS[i] for i in q[band] if CHARS[i] in reds)
        out.append(max(cnt, key=lambda ch: (cnt[ch], ch)))
    return out


def _is_red(hexc):
    r, g, b = (int(hexc[i:i + 2], 16) for i in (1, 3, 5))
    return r > 70 and r > 2 * g and r > b + 30


def local(p):
    """Our fine pixel's centre at rest -> torso-local design units (x along rig.right, y along rig.up)."""
    t = np.radians(IDLE_LEAN)
    right = np.array([np.cos(t), np.sin(t)])
    up = np.array([np.sin(t), -np.cos(t)])
    d = (np.array(p, float) + 0.5) / RES - np.array(OUR_JOINTS['pelvis']) / RES
    return float(d @ right), float(d @ up)


def ornament(name, lay, reds):
    (x0, y0, x1, y1), pivot = ORNAMENTS[name]
    rows, colors, used = [], {}, {}
    for y in range(y0, y1 + 1):
        row = ''
        for x in range(x0, x1 + 1):
            v = lay[y, x]
            ch = CHARS[v] if v < 255 else '.'
            if name == 'tassel' and y in TASSEL_ROWS:
                ch = reds[y - TASSEL_ROWS[0]]
            elif not (ch in GOLD or (x, y) in HOLES.get(name, [])):
                ch = '.'
            if ch != '.':
                used[ch] = C[ch]
            row += ch
        rows.append(row)
    for ch in sorted(used, key=lambda c: CHARS.index(c)):
        colors[ch] = used[ch]
    return rows, (x0, y0), colors, pivot


def kind(ch):
    if ch in GOLD:
        return 'gold'
    if _is_red(C[ch]):
        return 'red'
    # his black line stays; the near black in the buckle's hole is the strap seen through it
    return 'line' if ch == LINE else 'leather'


def main(out_ts, study):
    check_common(TROUSERS, CLOTH_TONES + STRIPE_TONES, 'trousers', at_least=2)
    check_common(BELT, BELT_TONES, 'belt', at_least=1)
    lay = reduced_layers()['torso']
    reds = tassel_reds()
    pieces = {name: ornament(name, lay, reds) for name in ORNAMENTS}

    tone_list = lambda s: '[' + ', '.join(f"'{C[ch]}'" for ch in s) + '] as const'
    out = [
        "// The owner's Scarlet's pinstripe trousers and noble belt in his colours, the belt's ornaments as",
        '// the reduced reference has them (tools/refs/scarlet-lower-from-ref.py from',
        '// docs/reference/scarlet-owner-reference.jpg). Generated: rerun the script to change it.',
        '',
        "import type { PaintedPiece } from '../painted';",
        '',
        '/** His black line. */',
        f"export const PIN_LINE = '{C[LINE]}';",
        '/** The colours the trousers\' slots recolour from (at these, every pixel is his): his lit cloth and his lit stripe. */',
        f"export const PIN_CLOTH = '{C[CLOTH]}';",
        f"export const PIN_STRIPE = '{C[STRIPE]}';",
        '/** His trousers by the tone our cloth light gives a pixel (0 darkest .. 5 a fold\'s lit crest): the cloth, and his stripes on it. */',
        f'export const PIN_CLOTH_TONES = {tone_list(CLOTH_TONES)};',
        f'export const PIN_STRIPE_TONES = {tone_list(STRIPE_TONES)};',
        '/** Fine pixels from one stripe to the next across a leg (his are 2 of his pixels apart, about one of ours). */',
        'export const PIN_GAP = 3;',
        '',
        '/** The colours the belt\'s slots recolour from: his strap, his gold and his tassel\'s red. */',
        f"export const BELT_LEATHER = '{C[LEATHER]}';",
        f"export const BELT_GOLD = '{C[GOLD_BASE]}';",
        f"export const BELT_RED = '{C[RED_BASE]}';",
        '/** His belt by tone (0 darkest .. 5 the sheen beside the buckle). */',
        f'export const BELT_TONES = {tone_list(BELT_TONES)};',
        '/** What each colour of the ornaments is: his gold, his tassel\'s red, his strap (seen through the buckle) or his black line. */',
        "export const BELT_KIND: Record<string, 'gold' | 'red' | 'leather' | 'line'> = {",
    ]
    kinds = {}
    for rows, _, colors, _ in pieces.values():
        for ch, hexc in colors.items():
            kinds[hexc] = kind(ch)
    out += [f"  '{h}': '{k}'," for h, k in sorted(kinds.items())]
    out += ['};', '']
    out += [
        '/**',
        ' * Where each ornament is tied on (its pivot), in the torso\'s frame: design units from the pelvis along',
        f' * rig.right and rig.up, as on our male at idle frame 0 (his torso leaning {IDLE_LEAN:g} degrees). Each is',
        ' * stamped upright there, the cross and the tassel hanging straight down.',
        ' */',
        'export const BELT_AT = {',
    ]
    for name, (_, _, _, pivot) in pieces.items():
        lx, ly = local(pivot)
        out.append(f'  {name}: [{lx:.4f}, {ly:.4f}],')
    out += ['} as const;', '']
    docs = {
        'buckle': 'His ring buckle on the front of the belt, its dark hole inside.',
        'cross': 'His gold cross hanging from the belt over the near thigh: a small cross on the big one, the long stem.',
        'tassel': 'His far gold knot and the red tassel under it.',
        'star': "His small gold star hanging just inside the coat's near edge.",
    }
    names = {'buckle': 'BELT_BUCKLE', 'cross': 'BELT_CROSS', 'tassel': 'BELT_CORD', 'star': 'BELT_STAR'}
    for name, (rows, origin, colors, pivot) in pieces.items():
        out.append(ts_piece(names[name], docs[name], rows, origin, colors, pivot, 0))
    text = '\n'.join(out).rstrip('\n') + '\n'
    tmp = out_ts + '.tmp'
    with open(tmp, 'w') as f:
        f.write(text)
    os.replace(tmp, out_ts)

    # Study: the reduced reference's waist, and the ornaments alone on it, at 8x.
    os.makedirs(study, exist_ok=True)
    ref = reduced()
    box = (118, 166, 140, 186)
    crop = ref[box[1]:box[3], box[0]:box[2]].copy()
    alone = np.zeros_like(crop)
    P = rgb()
    for name, (rows, (ox, oy), colors, _) in pieces.items():
        for j, row in enumerate(rows):
            for i, ch in enumerate(row):
                if ch == '.':
                    continue
                y, x = oy + j - box[1], ox + i - box[0]
                alone[y, x, :3] = P[CHARS.index(ch)]
                alone[y, x, 3] = 255
    sheet = np.zeros((crop.shape[0], crop.shape[1] * 2 + 2, 4), np.uint8)
    sheet[:, :crop.shape[1]] = crop
    sheet[:, crop.shape[1] + 2:] = alone
    save(sheet, os.path.join(study, 'belt-ornaments@8.png'))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
