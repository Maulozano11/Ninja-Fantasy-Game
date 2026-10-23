"""The owner's own frames of his Trunks (his read and sit paint-overs) as painted pieces, shared by
trunks-read-from-ref.py and trunks-sit-from-ref.py.

A frame's pieces are cut by owner (the option of his Trunks that draws them) and part, as his Lyra's are
(owner_frames.py), all pinned to the pelvis: his figure sits still in a pose, so laid on our male rig's
pelvis every pixel lands where he drew it. Each colour of a piece has a kind, the colour slot of the
option that recolours it: 'main' (the cape, the shirt, the gloves, the belt, the trousers, the boots, the
hair), 'buckle' (the belt's), 'skin' and 'eye' (the character's), and 'line' (his black) and 'keep' (his
own, never recoloured).
"""

import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import owner_frames as F  # noqa: E402
import owner_paintover as P  # noqa: E402

# Every piece is pinned to the pelvis (ownerFrames.ts stamps it on the rig's pelvis).
PIN = 'pelvis'


def kind_of(owner, h, line, rules):
    """The colour slot of the owner's option that recolours his colour h. rules: the ref module (its colour
    rules: skin, eye, lilac, green, grey, brown, cream)."""
    c = np.array([[F.rgb(h)]])
    if max(F.rgb(h)) < line:
        return 'line'
    is_ = lambda f: bool(f(c)[0, 0])
    if owner == 'face':
        if is_(rules.eye):
            return 'eye'
        return 'skin' if is_(rules.skin) and not is_(rules.white) else 'keep'
    if owner in ('top', 'hands') and is_(rules.skin) and not is_(rules.cream):
        return 'skin'
    if owner == 'hair':
        return 'main' if is_(rules.lilac) else 'keep'
    if owner == 'top':
        return 'main' if is_(rules.lilac) else 'keep'
    if owner == 'hands':
        return 'main' if is_(rules.grey) or is_(rules.lilac) else 'keep'
    if owner == 'waist':
        if is_(rules.cream):
            return 'buckle'
        return 'main' if is_(rules.brown) else 'keep'
    if owner == 'bottom':
        return 'main' if is_(rules.green) else 'keep'
    if owner in ('cape', 'feet'):
        return 'main' if is_(rules.brown) else 'keep'
    return 'keep'


def apply_fills(m, masks, fills):
    """His frame with the waist's white filled (fill_waist): the colours and each owner's mask. Returns
    copies."""
    m = m.copy()
    masks = {o: mk.copy() for o, mk in masks.items()}
    for (x, y), (hx, owner) in fills.items():
        m[y, x] = F.rgb(hx)
        masks[owner][y, x] = True
    return m, masks


def frame_pieces(m, masks, place, pelvis, parts, line, rules):
    """The pieces of one frame (the rock left out) and his frame as our fine pixels {(x, y): hex}, checked
    to be the same pixels (owner_frames.check)."""
    masks = {o: mk for o, mk in masks.items() if o != 'seat'}
    want = {}
    for o, mk in masks.items():
        for y, x in zip(*np.nonzero(mk)):
            want[place(x, y)] = P.hexs(m[y, x])
    pcs = F.pieces(masks, m, place, {PIN: pelvis}, parts, line, pin=PIN)
    for p in pcs:
        p['kinds'] = {c: kind_of(p['owner'], h, line, rules) for c, h in p['colors'].items()}
    F.check(pcs, want)
    return pcs, want


def clear_of_boxes(ref, boxes, pitch, page, tol):
    """Nothing of his figure within a cell of any box's edge: every box edge runs through his white page
    (a figure cut by a box would lose its pixels past it). Raises naming the box and side."""
    from PIL import Image
    img = np.asarray(Image.open(ref).convert('RGB')).astype(int)
    px, py = pitch if isinstance(pitch, tuple) else (pitch, pitch)
    for k, (x0, y0, x1, y1) in enumerate(boxes):
        a = img[y0:y1, x0:x1]
        fig = np.abs(a - np.array(page)).max(2) > tol
        bands = {'left': fig[:, :int(np.ceil(px))], 'right': fig[:, -int(np.ceil(px)):], 'top': fig[:int(np.ceil(py))], 'bottom': fig[-int(np.ceil(py)):]}
        for side, band in bands.items():
            if band.any():
                raise ValueError(f'box {k}: his figure reaches the {side} edge')


def module(doc, consts):
    """A generated module: consts is [(name, doc, type, value text)]."""
    out = [doc, "import type { OwnerPiece } from '../ownerFrames';", '']
    for name, d, typ, text in consts:
        out.append(f'/** {d} */')
        out.append(f'export const {name}: {typ} = {text};')
        out.append('')
    return '\n'.join(out)


def ts_frames(frames, names):
    out = ['[']
    for pcs, name in zip(frames, names):
        out.append(f'  // {name}')
        out.append('  [')
        out.append(',\n'.join(F.ts_piece(p) for p in pcs) + ',')
        out.append('  ],')
    out.append(']')
    return '\n'.join(out)


def ts_pieces(pcs):
    return '[\n' + ',\n'.join(F.ts_piece(p, '  ') for p in pcs) + ',\n]'
