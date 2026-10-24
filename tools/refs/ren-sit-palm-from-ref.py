"""Ren's far hand when seated: the owner's open hand, palm up, from his Trunks sit picture
(docs/reference/trunks-sit-owner-reference.jpg; trunks_sit_ref.py says how his picture is read and brought down
to our scale).

The owner on Ren's sit: "la pose de sentado y su brazo izquierdo cuando esta sentado ya tienes las bases y
respuestas en los otros personajes". The answer the others got: seated, the far arm reaches forward with the
open palm up, as he drew it on his Trunks sit, and his two hands there are the standard for the hands of the
characters to come ("usa sus dos manos como referencia y standard para futuros disenos de personajes"). Ren
wears a black fingerless glove as his Trunks does there, so the far hand of Ren's sit is his Trunks' far hand,
every pixel his, in his colour: his black line, his bare fingertips and thumb (they follow the character's skin
in the game) and his glove over the palm (it follows the glove's colour slot, his Ren glove by default).

The hand is the far part of his frame's hands (trunks-sit-from-ref.py HANDS_ROW: the near hand rests on the
thigh below it), without the bit of his bare forearm that comes with it (our forearm is there: Ren's casting
forearm). Our forearm meets it at his wrist: the cell where his bare forearm, followed along its line,
goes under the glove's cuff. The piece's angle is his forearm's (fitted on his bare forearm, the line through
the middle of its columns), so in the game it turns with our forearm about our wrist as his forearm turns.

It writes the piece as TypeScript (src/sprite/items/nightSitPalmArt.ts) and, in <study>, his frame round the
hand beside the piece at 8x. The same picture always gives the same bytes:

  python3 -I tools/refs/ren-sit-palm-from-ref.py src/sprite/items/nightSitPalmArt.ts [studyDir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import ren_ref as R  # noqa: E402
import trunks_sit_ref as S  # noqa: E402

OUT = 'src/sprite/items/nightSitPalmArt.ts'
# His frame's hands below this row are the near hand on the thigh, above it the far hand (trunks-sit-from-ref.py).
HANDS_ROW = 43
# The least red a colour of the hand has to follow the character's skin: his darkest warm crease between the curled
# fingers (#2d1219) is under it, and tinted as skin it showed in the game as a dead red pixel (the owner: "aun falta
# arreglarle algunos pixeles"); it stays dark, as the glove round it.
SKIN_MIN = 64
# His bare far forearm in his frame (columns, rows): between the sleeve and the glove's cuff.
FOREARM = ((50, 60), (33, 45))


def is_skin(c):
    """His skin: warm, red over blue and green (his bare fingers, his forearm, their warm shadow lines)."""
    r, g, b = (int(v) for v in c)
    return r > b + 15 and r > g + 10


def lifted():
    """His far hand at our scale: (colours, mask, line mask, his frame's colours, figure, owners) in his frame's cells."""
    m, fg, line = S.frame(0)
    own, masks = S.owners(0)
    H, W = fg.shape
    rows = np.mgrid[0:H, 0:W][0]
    hand = masks['hands'] & (rows <= HANDS_ROW)
    return m, hand, line, fg, masks


def forearm_line(m, fg, line, masks):
    """His bare forearm's line (slope, intercept) through the middle of each column of its skin, in his frame's cells."""
    (x0, x1), (y0, y1) = FOREARM
    xs, ys = [], []
    for x in range(x0, x1 + 1):
        col = [y for y in range(y0, y1 + 1) if fg[y, x] and not line[y, x] and masks['top'][y, x] and is_skin(m[y, x])]
        if len(col) >= 3:
            xs.append(x + 0.5)
            ys.append((min(col) + max(col) + 1) / 2)
    k, c = np.polyfit(xs, ys, 1)
    return float(k), float(c)


def wrist(hand, k, c):
    """Where his forearm goes under the glove: the first column of the hand on the forearm's line, on that line."""
    H, W = hand.shape
    for x in range(W):
        y = int(np.floor(k * (x + 0.5) + c))
        if 0 <= y < H and hand[y, x]:
            return x + 0.5, k * (x + 0.5) + c
    raise ValueError('the forearm line never meets his hand')


DOC = """// Ren's far hand when seated: the owner's open hand, palm up, his pixels from his Trunks sit picture
// (tools/refs/ren-sit-palm-from-ref.py from docs/reference/trunks-sit-owner-reference.jpg, at our scale).
// Generated: rerun the script to change it.
"""


def module(rows, origin, palette, kinds, pivot, ang, skin, glove):
    key = lambda k: k if k.isidentifier() else "'" + k + "'"
    out = [DOC, "import type { PaintedPiece } from '../painted';", '']
    out.append('/** His skin and his glove the colour slots recolour from (at these, every pixel is his). */')
    out.append(f"export const NIGHT_SIT_PALM_SKIN = '{skin}';")
    out.append(f"export const NIGHT_SIT_PALM_GLOVE = '{glove}';")
    out.append('')
    out.append("/** What each of his colours is: his line, his skin (it follows the character's), his glove (it follows the glove's colour). */")
    out.append(f"export const NIGHT_SIT_PALM_KIND: Record<string, {' | '.join(repr(n) for n in sorted(set(kinds.values())))}> = {{")
    for h in sorted(kinds):
        out.append(f"  '{h}': '{kinds[h]}',")
    out += ['};', '']
    out.append("/** Where the piece lands in his Trunks sit frame, as he drew it: the fine pixel of its first row's first cell. */")
    out.append(f'export const NIGHT_SIT_PALM_REST: [number, number] = [{origin[0]}, {origin[1]}];')
    out.append('')
    out.append(R.ts_piece('NIGHT_SIT_PALM_F', "The far hand open, palm up, reaching forward: it rides the hand about the wrist, turned with his forearm's angle.", rows, origin, palette, pivot, ang))
    return '\n'.join(out)


def hand_only(hand, m, line, wx):
    """The hand without the bit of his bare forearm his frame gives with it: his skin up to the wrist's column,
    then the line that bounded only that skin (a line cell beside what was taken, with no other cell of the
    hand but line beside it), taken in turn."""
    H, W = hand.shape
    out = hand.copy()
    gone = np.zeros_like(hand)
    for y, x in zip(*np.nonzero(hand)):
        if x + 0.5 <= wx and not line[y, x] and is_skin(m[y, x]):
            out[y, x] = False
            gone[y, x] = True
    near = lambda y, x, test: any(0 <= y + dy < H and 0 <= x + dx < W and test(y + dy, x + dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx)
    while True:
        drop = [(y, x) for y, x in zip(*np.nonzero(out)) if line[y, x]
                and near(y, x, lambda a, b: gone[a, b])
                and not near(y, x, lambda a, b: out[a, b] and not line[a, b])]
        if not drop:
            return out
        for y, x in drop:
            out[y, x] = False
            gone[y, x] = True


def loose_off(hand, line):
    """Without the cells of his colour left loose under the cuff when his forearm was taken away (a cell, not his
    line, with no other such cell beside it: a dead pixel below the glove in the game), and the line round only
    them, taken as hand_only takes the forearm's."""
    H, W = hand.shape
    out = hand.copy()
    gone = np.zeros_like(hand)
    near = lambda y, x, test: any(0 <= y + dy < H and 0 <= x + dx < W and test(y + dy, x + dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx)
    for y, x in zip(*np.nonzero(hand)):
        if not line[y, x] and not near(y, x, lambda a, b: hand[a, b] and not line[a, b]):
            out[y, x] = False
            gone[y, x] = True
    while True:
        drop = [(y, x) for y, x in zip(*np.nonzero(out)) if line[y, x]
                and near(y, x, lambda a, b: gone[a, b])
                and not near(y, x, lambda a, b: out[a, b] and not line[a, b])]
        if not drop:
            return out
        for y, x in drop:
            out[y, x] = False
            gone[y, x] = True


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else OUT
    study = sys.argv[2] if len(sys.argv) > 2 else None
    m, hand, line, fg, masks = lifted()
    k, c = forearm_line(m, fg, line, masks)
    wx, wy = wrist(hand, k, c)
    hand = loose_off(hand_only(hand, m, line, wx), line)
    ox, oy = S.OFFSET
    # In our frame (fine pixels): his cell (x, y) is our pixel (x + OFFSET[0], y + OFFSET[1]).
    col = np.zeros((256, 256, 3), np.uint8)
    mask = np.zeros((256, 256), bool)
    lmask = np.zeros((256, 256), bool)
    for y, x in zip(*np.nonzero(hand)):
        col[y + oy, x + ox] = m[y, x]
        mask[y + oy, x + ox] = True
        lmask[y + oy, x + ox] = line[y, x]
    rows, origin, palette = R.pack(col, mask)
    kinds, skins, gloves = {}, {}, {}
    for y, x in zip(*np.nonzero(mask)):
        h = R.packed(R.hexc(col[y, x]), palette)
        kd = 'line' if lmask[y, x] else 'skin' if is_skin(col[y, x]) and col[y, x][0] >= SKIN_MIN else 'glove'
        if kinds.get(h, kd) != kd:
            raise ValueError(f'{h} is both {kinds[h]} and {kd}')
        kinds[h] = kd
        if kd == 'skin':
            skins[h] = skins.get(h, 0) + 1
        if kd == 'glove':
            gloves[h] = gloves.get(h, 0) + 1
    # The commonest of each: the tone his skin and his glove are painted in.
    skin = sorted(skins.items(), key=lambda t: (-t[1], t[0]))[0][0]
    glove = sorted(gloves.items(), key=lambda t: (-t[1], t[0]))[0][0]
    ang = float(np.degrees(np.arctan(k)))
    R.write(out_ts, module(rows, origin, palette, kinds, (wx + ox, wy + oy), ang, skin, glove))
    if study:
        os.makedirs(study, exist_ok=True)
        his = np.concatenate([(m * fg[..., None]).astype(np.uint8)[20:50, 40:80], np.full((30, 40, 1), 255, np.uint8)], axis=2)
        R.save(his, os.path.join(study, 'sit-palm-his@8.png'))
        ours = np.zeros((30, 40, 4), np.uint8)
        for y, x in zip(*np.nonzero(mask)):
            ours[y - oy - 20, x - ox - 40, :3] = col[y, x]
            ours[y - oy - 20, x - ox - 40, 3] = 255
        R.save(ours, os.path.join(study, 'sit-palm-ours@8.png'))


if __name__ == '__main__':
    main()
