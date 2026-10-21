"""Our female body at idle frame 0, which the Aurelia scripts lay her pieces on (tools/refs/aurelia-*.py).

The female body was rebuilt from the owner's heroines drawn at our game scale (body/female-v2,
tools/refs/female-body-from-ref.py: a longer torso, head scale 0.70, narrower shoulders, the ankle about
4 px lower, his small hands). Against his game-scale Aurelia
(docs/reference/aurelia-escala-juego-owner-reference.jpg, one of his pixels = one of ours) it stands
like this:

- with her soles on ours (his row 98 on our row 218: his pixel (x, y) at our (x + 73, y + 120)) her
  waist and hips fall on ours, but her head is three rows higher than ours: our neck and torso are
  shorter than hers by those rows (his chin is four rows above his shoulders, ours two);
- with her eyes on ours (his y + 123) her collar sits just under our chin, as his under his.

So each of her pieces is laid where he drew it, at the row of the part of our body it rides: her hair and
eyes on our head (their own scripts, by the face anchor), her collar and bodice under our chin, her sleeves
from our shoulders, her sash on our waist, her skirt from our hips, her boots on our soles; and each is
pinned to our joints below at their angles here, so at rest it is stamped as laid.

JOINTS are printed by `npx tsx tools/refs/heroine-idle.mts <out>` (the female's), in fine pixels.
"""

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

# His pixel (x, y) is our frame's (x + AT[0], y + AT[1]) for the part of her each key names.
AT = {
    # her collar and bodice: his collar under our chin, as under his
    'bodice': (73, 123),
    # her near sleeve and her bare near shoulder over it: his shoulder on our near shoulder (two columns
    # right of her bodice: our shoulders are narrower than his), so his band sits round our upper arm and
    # our hand comes out of his cuff's opening
    'sleeveN': (75, 122),
    # her far sleeve: its band at our far shoulder, under her bust
    'sleeveF': (73, 122),
}
