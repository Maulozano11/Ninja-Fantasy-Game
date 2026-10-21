p = 'tools/refs/scarlet_ref.py'
s = open(p).read()
rep = [
    ("""# His eyes (the middle of each iris, his pixels): the head's anchor.
EYES = {'near': (78.5, 45.0), 'far': (87.0, 45.0)}""",
     """# His eyes, his pixels: the middle of each iris across, the middle of the eye with its lashes down
# (his lashes are row 43, his eye rows 44 and 45). The head's anchor.
EYES = {'near': (78.5, 44.5), 'far': (86.5, 44.5)}"""),
    ("""# Where our male's eyes are (the middle of each eye row, fine pixels) and his soles: our near sole's
# bottom row is 218, the far one's 210.
OUR_EYES = {'near': (122.5, 140.5), 'far': (131.0, 140.5)}""",
     """# Our eyes (the 'valiant' face and eyes Aiden wears): the middle of each iris across (near 126-127,
# far 132), the middle of the eye with its lashes down (lashes row 140, eye row 141).
OUR_EYES = {'near': (127.0, 141.0), 'far': (132.5, 141.0)}"""),
    ("""def _eyes_anchor(s):
    \"\"\"His eye line's middle and ours: the head scales about it.\"\"\"""",
     """def _eyes_anchor():
    \"\"\"His eye line's middle and ours: the head scales about it.\"\"\""""),
    ("_EH, _EO = _eyes_anchor(0.66)", "_EH, _EO = _eyes_anchor()"),
    ("""    # hair and face: 0.66 (our head is bigger for the body than his); his eye line on ours, so his hair
    # top lands on Aiden's (125.7) and his chin on ours (147.8)
    'head': {'kind': 'sim', 's': 0.66, 'his': _EH, 'our': _EO},""",
     """    # hair and face: 0.68 (our head is bigger for the body than his: his eyes 8 apart, ours 5.5); his
    # eyes on ours, so his eyes are where our eye shapes draw theirs, his hair top lands at 126.4 (over
    # our skull's top, 127) and his chin at 149.2, on his collar
    'head': {'kind': 'sim', 's': 0.68, 'his': _EH, 'our': _EO},"""),
]
for a, b in rep:
    assert a in s, a
    s = s.replace(a, b)
open(p, 'w').write(s)
