"""Our female body at idle frame 0, which the Saya scripts lay her pieces on (tools/refs/saya-*.py).

The female body was rebuilt from the owner's heroines drawn at our game scale (the second female body,
tools/refs/female-body-from-ref.py: a longer torso, head scale 0.70, narrower shoulders, the ankle about
4 px lower, his small hands). Against his game-scale Saya (docs/reference/saya-game-scale-owner-reference.jpg
laid on our 256 x 256 frame at AT, her soles on ours) it stands like this:

- from the hips down it is where he drew her: her skirt's hem, her knee pads and her shoes fall on our
  thighs, knees and feet (our far ankle stands six rows higher than his, so her far leg, kept as long as
  he drew it, reaches six rows below it);
- from the neck up it is three or four rows higher than his picture (the head two): the torso between
  is longer than hers;
- its arms are the female standard's (body/female-v2, where his game-scale heroines hang them): a long
  upper arm and a short forearm, so our near elbow is where he drew hers and our near wrist and hand
  four rows higher than his, and our far arm hangs about five pixels nearer the torso than hers.

So her pieces from the neck up (scarf, top, arm guards, fists) are laid that much higher than he drew
them (each on its joint as he drew it), her skirt, belts and legs where he drew them, and her top is
longer by the rows between: what shows of it there continues his rows (saya-upper-from-ref.py).

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
    'elbowN': (110.84, 165.05),
    'elbowF': (134.58, 165.77),
    'wristN': (107.98, 172.74),
    'wristF': (140.44, 174.12),
    'handN': (107.10, 175.10),
    'handF': (141.88, 176.18),
    'pelvis': (127.00, 182.25),
    'hipN': (120.58, 181.88),
    'hipF': (132.35, 178.47),
    'kneeN': (121.27, 196.06),
    'kneeF': (141.04, 189.70),
    'ankleN': (117.56, 211.62),
    'ankleF': (136.58, 205.06),
}

# The middle of her near glove's fist (tools/refs/saya-upper-from-ref.py SAYA_GLOVE_N) at idle frame 0, a
# cell of our frame: her sword's grip passes through it (tools/refs/saya-sword-from-ref.py), so the fist
# closes round the grip with the pommel above it and the guard cup below, as she holds it.
GRIP_N = (109, 177)

# Our head's scale on the female body (rig.ts BODY_PARAMS headScale): the face anchor's offset from the
# head joint scales with it.
HEAD_SCALE = 0.70
