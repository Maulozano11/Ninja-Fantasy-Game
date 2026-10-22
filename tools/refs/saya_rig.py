"""Our female body at idle frame 0, which the Saya scripts lay her pieces on (tools/refs/saya-*.py).

The female body is now the owner's bare female body (docs/reference/female-base-owner-reference.jpg,
2026-10-21; body/female-v2, tools/refs/female-base-body-from-ref.py): his pieces on a rig fitted to his
joints, so the joints below are his at idle. His Saya stands as his bare woman does. Against his
game-scale Saya (docs/reference/saya-game-scale-owner-reference.jpg laid on our 256 x 256 frame at AT,
her soles on ours) it stands like this:

- from the hips down it is where he drew her: her skirt's hem, her legging tops, her knee pads and her
  shoes fall on our thighs, knees and feet, both knees just under her legging tops (the earlier body's
  far knee stood five rows higher, so her far legging turned with the shin);
- from the neck up our neck, shoulders and near arm stand where they stood on the earlier bodies (his
  bare woman's shoulders are three or four rows higher than Saya's, the head two), so her pieces from the
  neck up keep the moves they had (saya-upper-from-ref.py UPPER, NEAR_ARM; the scarf's SHOULDER_MOVE);
- his bare woman's far arm hangs about four pixels nearer the torso than Saya's and a row higher: her
  far guards hang from our far arm's joints moved FAR_OUT (saya-upper-from-ref.py), as before.

So every piece of hers is laid where it lay on the earlier body (at idle frame 0 the same pixels) and
pinned to these joints: only how the pieces turn about them changed. Her bare thighs are the body's own
(saya-legs-from-ref.py).

Earlier the female body was the one rebuilt from his heroines at our scale (tools/refs/female-body-from-ref.py:
a longer torso, head scale 0.70, narrower shoulders, his small hands; then the female standard).

JOINTS are printed by `npx tsx tools/refs/heroine-idle.mts <out>` (the female's), in fine pixels.
"""

# One of her pixels is one of ours; her picture's cell (x, y) is our frame's (x + AT[0], y + AT[1]).
AT = (76, 122)

# Our female rig at idle frame 0, fine pixels.
JOINTS = {
    'head': (126.00, 138.00),
    'neck': (123.50, 146.50),
    'shoulderN': (115.50, 151.50),
    'shoulderF': (131.50, 151.50),
    'elbowN': (111.50, 164.50),
    'elbowF': (135.50, 164.50),
    'wristN': (109.50, 173.50),
    'wristF': (139.00, 174.50),
    'handN': (108.95, 175.96),
    'handF': (139.83, 176.88),
    'pelvis': (127.25, 173.00),
    'hipN': (120.50, 173.00),
    'hipF': (134.00, 173.00),
    'kneeN': (117.00, 194.50),
    'kneeF': (133.50, 194.00),
    'ankleN': (113.00, 209.00),
    'ankleF': (134.00, 208.50),
}

# The middle of her near glove's fist (tools/refs/saya-upper-from-ref.py SAYA_GLOVE_N) at idle frame 0, a
# cell of our frame: her sword's grip passes through it (tools/refs/saya-sword-from-ref.py), so the fist
# closes round the grip with the pommel above it and the guard cup below, as she holds it.
GRIP_N = (109, 177)

# Our head's scale on the female body (rig.ts BODY_PARAMS headScale): the face anchor's offset from the
# head joint scales with it.
HEAD_SCALE = 0.70
