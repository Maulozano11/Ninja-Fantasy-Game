"""The owner's trousers on his navy officer: the bottom option 'Officer's Trousers', tucked into the boots, in two
paints of his: navy (docs/reference/navy-officer-owner-reference.jpg) and black (his open-coat picture,
docs/reference/navy-officer-open-coat-owner-reference.jpg: the same trousers in black; his buttoned and dark-coat
pictures wear them black too).

tools/refs/navy_ref.py shrinks each picture to our male rig and cleans it with his palette only, and cuts each leg
out of it with what the coat's tails and the boots hide continued up from his own pixels (navy_ref.pieces). Each
leg is cut at his knee: the thigh pivoted on his hip, the shin on his knee, at his angles; the seat between the
hips under the tails. It writes src/sprite/items/navyTrousersArt.ts. With a second argument, a folder, it writes
the pieces beside his figure at 8x. Run from the repo root:

  python3 -I tools/refs/navy-trousers-from-ref.py src/sprite/items/navyTrousersArt.ts [studyDir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import navy_ref as N  # noqa: E402

SIDES = {'N': 'near', 'F': 'far'}


def main():
    out_ts = sys.argv[1]
    study = sys.argv[2] if len(sys.argv) > 2 else None
    blocks = []
    bases = {}
    table = {'gold': 'cloth', 'wine': 'cloth', 'red': 'cloth'}
    for pic, prefix in (('high', 'TROUSERS_NAVY'), ('open', 'TROUSERS_BLACK')):
        pcs = N.pieces(pic)
        consts = N.leg_consts(prefix, pcs, SIDES)
        bases[prefix] = N.middle(['trousers_n', 'trousers_f'], pcs, ('dark', 'grey'))
        blocks.append((pic, prefix, consts))
        if study:
            N.run_part('navy-trousers-from-ref.py', '', os.devnull, study, consts, {}, prefix, N.kinds_by(table), pic=pic)
    # one module: both paints' pieces, each with its own kinds and rest
    out = []
    for i, (pic, prefix, consts) in enumerate(blocks):
        text = N.module('', consts, {prefix: bases[prefix]}, prefix, N.kinds_by(table), N.joints_ts(prefix + '_JOINTS', ['hipN', 'kneeN', 'ankleN', 'hipF', 'kneeF', 'ankleF']) if i == 0 else '')
        lines = text.split('\n')
        if i:
            lines = [ln for ln in lines if not ln.startswith('import ')]
        out.append('\n'.join(lines).strip('\n'))
    head = N.header('navy-trousers-from-ref.py', "The owner's officer's trousers (navy from his first picture, black from his open-coat picture)")
    N.write(out_ts, head + '\n' + '\n\n'.join(out) + '\n')
    print(bases)


if __name__ == '__main__':
    main()
