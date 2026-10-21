"""Our female body at idle frame 0, which the Aurelia scripts lay her pieces on (tools/refs/aurelia-*.py).

The female body was rebuilt from the owner's heroines drawn at our game scale (body/female-v2,
tools/refs/female-body-from-ref.py: a longer torso, head scale 0.70, narrower shoulders, the ankle about
4 px lower, his small hands; then the female standard, docs/SPRITE_STYLE_GUIDE.md: both arms hang where
his heroines draw them, the elbows at the waist). Against his game-scale Aurelia
(docs/reference/aurelia-escala-juego-owner-reference.jpg, one of his pixels = one of ours) with her soles on
ours (his row 98 on our row 218: his pixel (x, y) at our (x + 73, y + 120)) her waist, hips, knees, soles,
shoulders, elbows and hands fall on ours, and her collar sits just under our chin.

So every piece of hers is laid at that one place (AT), his pixels one for one and none of his rows left
out: at rest she is his picture. The owner's review of the earlier layout (2026-10-21: "tienes errores de
pixeles diferentes en faja cinturon y bolsa, en falda la pierna derecha y la capa estan mal unos pixeles
esta haciendo que la pierna se vea deforme en bota cercana tambien se ve el error") found the pixels it
moved: the bodice and skirt three rows lower than the boots, rows left out of the skirt, the near boot and
the sleeves, the near sleeve two columns over. Her hair and eyes ride our head (their own scripts, by the
face anchor). Each piece is pinned to our joints below at their angles here, so at rest it is stamped as
laid.

JOINTS are printed by `npx tsx tools/refs/heroine-idle.mts <out>` (the female's), in fine pixels.
"""

# Our female rig at idle frame 0, fine pixels.
JOINTS = {
    'head': (126.00, 138.00),
    'neck': (126.94, 146.23),
    'shoulderN': (117.54, 150.96),
    'shoulderF': (131.50, 150.48),
    'elbowN': (110.84, 165.05),
    'elbowF': (134.53, 165.78),
    'wristN': (107.86, 173.01),
    'wristF': (140.54, 174.39),
    'handN': (106.97, 175.37),
    'handF': (141.98, 176.46),
    'pelvis': (127.00, 182.25),
    'hipN': (120.58, 181.88),
    'hipF': (132.35, 178.47),
    'kneeN': (121.27, 196.06),
    'kneeF': (141.04, 189.70),
    'ankleN': (117.56, 211.62),
    'ankleF': (136.58, 205.06),
}

# His pixel (x, y) is our frame's (x + AT[0], y + AT[1]) for the part of her each key names: all of her
# at one place, his soles on ours.
HIS = (73, 120)
AT = {
    # her collar and bodice
    'bodice': HIS,
    # her near sleeve and her bare near shoulder over it
    'sleeveN': HIS,
    # her far sleeve
    'sleeveF': HIS,
    # her sash, belt, pouch and skirt
    'lower': HIS,
    # her boots
    'boots': HIS,
    # her staff
    'staff': HIS,
}
