"""The owner's cowl on his Solen (docs/reference/solen-owner-reference.jpg).

His picture is our Solen painted over in his own pixels (tools/refs/solen_ref.py: one of his pixels is one
fine pixel of our sprites). This script lifts out of it, every pixel in his exact colour:

  the cowl      the dark grey cloth wound round the neck under the chin and over the far shoulder, with
                its gold stud on the chest. It rides the torso about the neck.
  the near end  the same cloth over the near shoulder, with its gold stud, in front of the arm's sleeve:
                it rides the near shoulder (left of COWL_SPLIT).
  the stud      the white stud on the far shoulder, over the cowl's end: it rides the far shoulder.
  the seams     what he drew beside the near end and the stud, again, each riding with the piece it meets,
                to fill the seam when it opens: see SEAM.

His neck and shoulders stand where ours do, so every piece hangs from our joint exactly where he drew it.
It writes the pieces as TypeScript (src/sprite/items/founderCowlArt.ts) and, in <study>, his figure beside
the pieces at 8x. The same picture always gives the same bytes:

  python3 -I tools/refs/solen-cowl-from-ref.py src/sprite/items/founderCowlArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import solen_ref as R  # noqa: E402

DOC = (
    "// The owner's cowl with its gold studs and the white stud on the far shoulder, his pixels (tools/refs/\n"
    '// solen-cowl-from-ref.py from docs/reference/solen-owner-reference.jpg). Generated: rerun the script to change it.\n'
)

# The cowl over the near shoulder is the columns left of this (his near shoulder's cloth, in front of the
# sleeve); the rest wraps the neck.
COWL_SPLIT = 47

# The near end and the stud ride the shoulders, the cowl round the neck rides the torso: as a shoulder moves
# from the neck (a wider body, a raised or swung arm) the seam between them opens and the background shows
# beside the gold stud (the owner, 2026-10-22: "aqui tiene unos aun en la hebilla o medallon de la capa").
# So what he drew beside each of them (the cowl round the neck, and under the white stud the cuirass's top)
# is lifted again as a seam riding with that piece: his pixels within SEAM px of it. The item puts a seam's
# pixels only where the background would show between the pieces (fillSeams in items/accessories.ts): at
# rest the pieces meet and nothing is filled (the male idle frame is unchanged); as the seam opens it shows
# his cloth and his line going on from the stud.
SEAM = 6


def under_studs(col, mask, cloth):
    """His colours of a seam with the cloth under his gold stud in place of the gold: a seam that opens shows
    the cowl going on, not a second stud. Each gold pixel takes the nearest grey of his cowl along its row
    (the left first at the same distance)."""
    out = col.copy()
    W = col.shape[1]
    for y, x in zip(*np.nonzero(mask)):
        if R.kind(col[y, x]) != 'gold':
            continue
        for k in range(1, W):
            hit = [xx for xx in (x - k, x + k) if 0 <= xx < W and cloth[y, xx] and R.kind(col[y, xx]) == 'grey']
            if hit:
                out[y, x] = col[y, hit[0]]
                break
    return out


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = R.native(R.REF)
    masks, cols, filled = R.pieces(a)
    xs = np.mgrid[0:a.shape[0], 0:a.shape[1]][1]
    masks['cowl_n'] = masks['cowl'] & (xs < COWL_SPLIT)
    masks['cowl'] = masks['cowl'] & (xs >= COWL_SPLIT)
    cols['cowl_n'] = cols['cowl']
    filled['cowl_n'] = filled['cowl']
    # Beside the stud's lower half he drew the cuirass's top, not the cowl: that seam takes it too, as far
    # down as the stud goes.
    ys = np.mgrid[0:a.shape[0], 0:a.shape[1]][0]
    chest = masks['chest'] & ~masks['cowl'] & (ys <= ys[masks['stud_f']].max())
    behind = np.where(chest[..., None], cols['chest'], cols['cowl'])
    for n, at, under in (('seam_n', 'cowl_n', masks['cowl']), ('seam_f', 'stud_f', masks['cowl'] | chest)):
        near = masks[at]
        for _ in range(SEAM):
            near = R.near8(near)
        masks[n] = under & near & ~masks[at]
        cols[n] = under_studs(behind, masks[n], under)
        filled[n] = filled['cowl']
    J = R.JOINTS
    torso = R.angle('pelvis', 'neck')
    bases = {
        'FOUNDER_COWL': R.middle(a, masks, cols, ['cowl', 'cowl_n'], ('grey',)),
        'FOUNDER_COWL_GOLD': R.middle(a, masks, cols, ['cowl', 'cowl_n'], ('gold',)),
        'FOUNDER_COWL_STUD': R.middle(a, masks, cols, ['stud_f'], ('white', 'stud', 'steel')),
    }
    consts = [
        ('FOUNDER_COWL_NECK', 'cowl', 'The cowl wound round the neck and over the far shoulder, its gold stud: it rides the torso about the neck.', J['neck'], torso),
        ('FOUNDER_COWL_NEAR', 'cowl_n', 'The cowl over the near shoulder with its gold stud, in front of the sleeve: it rides the near shoulder.', J['shoulderN'], torso),
        ('FOUNDER_COWL_STUD_F', 'stud_f', 'The white stud on the far shoulder: it rides the far shoulder.', J['shoulderF'], torso),
        ('FOUNDER_COWL_SEAM_N', 'seam_n', 'The cowl round the neck beside the near end, riding with it: it fills the seam between them when it opens.', J['shoulderN'], torso),
        ('FOUNDER_COWL_SEAM_F', 'seam_f', 'The cowl round the neck and the cuirass\'s top beside the white stud, riding with it: it fills the seam when it opens.', J['shoulderF'], torso),
    ]
    text = R.module(masks, cols, DOC, consts, bases, 'FOUNDER_COWL')
    if out_ts:
        R.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, masks, cols, ['cowl', 'cowl_n', 'stud_f'], os.path.join(study, 'cowl@8.png'), (26, 20, 70, 42), filled)
    print('bases', bases)


if __name__ == '__main__':
    main()
