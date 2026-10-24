"""Writing the owner's frames as painted pieces pinned to our rig (src/sprite/ownerFrames.ts), shared by
lyra-read-from-ref.py and lyra-throw-from-ref.py.

A frame of his is cut into pieces: each piece is the pixels of one owner (the option of hers that draws
it: hair, face, top, armor, bottom, skirt, waist, feet, held, book) on one part of the body, on the
layer that part is drawn on, pinned to the rig joint the part hangs from. A piece records its pivot (the
cell over its joint's fine pixel, floor(joint + 1e-6)) and that fine pixel (`at`): stamped there it lies
exactly where he drew it (ownerFrames.ts checks the rig still puts the joint there; the tests too). Each
of his colours in a piece has a kind, the colour slot of the option that recolours it ('line', his black
line, and 'keep' are never recoloured).
"""

import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import owner_paintover as P  # noqa: E402

# The layer and the joint of each owner's pieces, by the side of the body they are on ('T' the torso and
# head, 'N' the near limbs, 'F' the far ones); a limb's part picks its joint (JOINT_OF).
DEPTH = {
    ('hair', 'T'): 'hairFront',
    ('face', 'T'): 'head.face',
    ('top', 'T'): 'torso.top',
    ('top', 'N'): 'nearArm.cloth',
    ('top', 'F'): 'farArm.cloth',
    ('armor', 'T'): 'torso.armor',
    ('armor', 'N'): 'nearArm.armor',
    ('armor', 'F'): 'farArm.armor',
    ('bottom', 'T'): 'torso.bottom',
    ('skirt', 'T'): 'skirt',
    ('waist', 'T'): 'waist',
    ('feet', 'N'): 'nearLeg.feet',
    ('feet', 'F'): 'farLeg.feet',
    ('held', 'T'): 'nearArm.held',
    ('book', 'T'): 'nearArm.over',
}
PART_OF_OWNER = {'hair': 'head', 'face': 'head', 'top': 'torso', 'armor': 'torso', 'bottom': 'pelvis', 'skirt': 'pelvis', 'waist': 'pelvis', 'held': 'held', 'book': 'held'}
JOINT_OF = {
    'head': 'head', 'torso': 'neck', 'pelvis': 'pelvis', 'held': 'pelvis',
    'upperArmN': 'shoulderN', 'forearmN': 'elbowN', 'handN': 'wristN',
    'upperArmF': 'shoulderF', 'forearmF': 'elbowF', 'handF': 'wristF',
    'thighN': 'hipN', 'shinN': 'kneeN', 'footN': 'ankleN',
    'thighF': 'hipF', 'shinF': 'kneeF', 'footF': 'ankleF',
}
# The book is pinned to the near wrist (it rides the hands that hold it).
JOINT_OF_BOOK = 'wristN'


def anchor(p):
    return int(math.floor(p[0] + 1e-6)), int(math.floor(p[1] + 1e-6))


def rgb(h):
    return int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)


def kind_of(owner, h, line):
    """The colour slot (key) of the owner's option that recolours his colour h."""
    r, g, b = rgb(h)
    if max(r, g, b) < line:
        return 'line'
    skin = r > 190 and 120 < g < 220 and 85 < b < 200 and r - b > 40 and r - g > 35
    gold = r > 150 and g > 95 and b < 120 and r - b > 75 and not skin
    red = r - g > 45 and g < 80 and r > 90
    cream = r > 175 and g > 150 and b > 110 and r - b < 80 and not skin
    cyan = b > r + 15 and g > r + 5
    steel = abs(r - b) < 26 and abs(g - b) < 26 and r > 70 and not cream
    if owner == 'face':
        if g > r + 15:
            return 'eye'
        return 'skin' if skin or (r > 150 and r - b > 30 and g > 80) else 'keep'
    if owner == 'hair':
        if gold:
            return 'ornament'
        if abs(r - b) < 20 and abs(g - b) < 20:
            return 'ribbon'
        return 'hair'
    if owner == 'top':
        if skin:
            return 'skin'
        if cream:
            return 'blouse'
        if red:
            return 'lining'
        return 'keep'
    if owner == 'armor':
        if gold:
            return 'gold'
        if steel:
            return 'steel'
        return 'leather'
    if owner == 'bottom':
        return 'stripes' if red else 'cloth'
    if owner == 'skirt':
        if gold:
            return 'gold'
        if red:
            return 'trim'
        if cream:
            return 'cloth'
        return 'keep'
    if owner == 'waist':
        if gold:
            return 'gold'
        if red:
            return 'pouch'
        if steel:
            return 'steel'
        return 'leather'
    if owner == 'feet':
        if skin:
            return 'skin'
        if gold:
            return 'gold'
        return 'leather'
    if owner == 'held':
        if cyan:
            return 'blade'
        if gold:
            return 'guard'
        return 'keep'
    return 'keep'


def pieces(masks, col, place, joints, parts, line, pin=None):
    """The pieces of one frame. masks: {owner: (rows, cols) bool} in the frame's own cells; col: its
    colours; place(x, y) -> our fine pixel of a cell; joints: {joint: (x, y)} fine pixels; parts(owner,
    mask) -> [(side, part, mask)] (the owner's pixels split by body part); pin: the joint every piece is
    pinned to, if not each part's own (JOINT_OF). Returns a list of dicts."""
    out = []
    for owner in sorted(masks):
        for side, part, m in parts(owner, masks[owner]):
            if not m.any():
                continue
            rows, (x0, y0), palette = P.pack(m, col)
            fx, fy = place(x0, y0)
            joint = pin or (JOINT_OF_BOOK if owner == 'book' else JOINT_OF[part])
            ax, ay = anchor(joints[joint])
            out.append({
                'owner': owner,
                'depth': DEPTH[(owner, side)],
                'part': part,
                'joint': joint,
                'at': (ax, ay),
                'pivot': (ax - fx, ay - fy),
                'rows': rows,
                'colors': palette,
                'kinds': {c: kind_of(owner, h, line) for c, h in palette.items()},
            })
    return out


def ts_piece(p, indent='    '):
    rows = ',\n'.join(f"{indent}    '{r}'" for r in p['rows'])
    colors = ', '.join(f"'{c}': '{h}'" for c, h in p['colors'].items())
    kinds = ', '.join(f"'{c}': '{k}'" for c, k in p['kinds'].items())
    return (
        f"{indent}{{\n"
        f"{indent}  owner: '{p['owner']}',\n"
        f"{indent}  depth: '{p['depth']}',\n"
        f"{indent}  part: '{p['part']}',\n"
        f"{indent}  joint: '{p['joint']}',\n"
        f"{indent}  at: [{p['at'][0]}, {p['at'][1]}],\n"
        f"{indent}  pivot: [{p['pivot'][0]}, {p['pivot'][1]}],\n"
        f"{indent}  rows: [\n{rows},\n{indent}  ],\n"
        f"{indent}  colors: {{ {colors} }},\n"
        f"{indent}  kinds: {{ {kinds} }},\n"
        f"{indent}}}"
    )


def check(frame_pieces, want):
    """The pieces laid at their `at`, one over another, are `want` ({(x, y): hex}, our fine pixels):
    every pixel his, none missing, none extra. Raises with the first differences."""
    got = {}
    for p in frame_pieces:
        ax, ay = p['at']
        px, py = p['pivot']
        for j, row in enumerate(p['rows']):
            for i, c in enumerate(row):
                if c == '.':
                    continue
                xy = (ax - px + i, ay - py + j)
                h = p['colors'][c]
                if xy in got and got[xy] != h:
                    raise ValueError(f'{xy}: two colours {got[xy]} and {h}')
                got[xy] = h
    bad = [xy for xy in set(got) | set(want) if got.get(xy) != want.get(xy)]
    if bad:
        raise ValueError(f'{len(bad)} pixels differ, e.g. {sorted(bad)[:8]}')
