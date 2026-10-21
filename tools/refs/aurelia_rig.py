"""Our female body at idle frame 0, which the Aurelia scripts lay her pieces on (tools/refs/aurelia-*.py).

The female body is now the owner's bare female body (docs/reference/female-base-owner-reference.jpg,
2026-10-21; body/female-v2, tools/refs/female-base-body-from-ref.py): his pieces on a rig fitted to his
joints, so the joints below are his at idle. His Aurelia stands as his bare woman does: her near boot
slants down to the front like his near leg, her far boot is the straight column his far leg is, her
sleeves hang from his shoulders to his wrists. So she is still laid where he drew her (AT, his soles on
ours) and each piece is pinned to these joints: at rest every pixel is his, and her pieces turn about
his joints. (Before this, the female body was the one fitted to his heroines at our scale.)


Earlier the female body was the one rebuilt from the owner's heroines drawn at our game scale (body/female-v2,
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
