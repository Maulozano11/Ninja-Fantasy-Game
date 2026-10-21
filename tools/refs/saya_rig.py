"""Our female body at idle frame 0, which the Saya scripts lay her pieces on (tools/refs/saya-*.py).

The female body was rebuilt from the owner's heroines drawn at our game scale (the second female body,
tools/refs/female-body-from-ref.py: a longer torso, head scale 0.70, narrower shoulders, the ankle about
4 px lower, his small hands). Against his game-scale Saya (docs/reference/saya-game-scale-owner-reference.jpg
laid on our 256 x 256 frame at AT, her soles on ours) it stands like this:

- from the hips down it is where he drew her: her skirt's hem, her knee pads and her shoes fall on our
  thighs, knees and feet (the far foot still about six rows higher than his);
- from the neck up it is three or four rows higher than his picture (the head two): the torso between
  is longer than hers.

So her pieces from the neck up (scarf, top, arm guards) are laid that much higher than he drew them
(each on its joint as he drew it), her skirt, belts and legs where he drew them, and her top is longer
by the rows between: what shows of it there continues his rows (saya-upper-from-ref.py).

JOINTS are printed by `npx tsx tools/refs/heroine-idle.mts <out>` (the female's), in fine pixels.
"""

# One of her pixels is one of ours; her picture's cell (x, y) is our frame's (x + AT[0], y + AT[1]).
AT = (76, 122)

# Our female rig at idle frame 0, fine pixels.
JOINTS = {
    'head': (126.00, 138.00),
    'neck': (126.94, 146.23),
    'shoulderN': (117.54, 150.96),
    'shoulderF': (131.50, 150.48),
    'elbowN': (113.84, 162.38),
    'elbowF': (133.72, 162.27),
    'wristN': (111.48, 172.51),
    'wristF': (139.28, 171.06),
    'handN': (110.91, 174.96),
    'handF': (140.63, 173.19),
    'pelvis': (127.00, 182.25),
    'hipN': (120.58, 181.88),
    'hipF': (132.35, 178.47),
    'kneeN': (121.27, 196.06),
    'kneeF': (141.04, 189.70),
    'ankleN': (117.56, 211.62),
    'ankleF': (136.58, 205.06),
}

# Our head's scale on the female body (rig.ts BODY_PARAMS headScale): the face anchor's offset from the
# head joint scales with it.
HEAD_SCALE = 0.70
