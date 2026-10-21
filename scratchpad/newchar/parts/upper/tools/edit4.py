p = 'tools/refs/scarlet-upper-from-ref.py'
s = open(p).read()


def rep(old, new):
    global s
    assert old in s, old[:60]
    s = s.replace(old, new)


rep('''  coat body     collar, lapels with their gold checker, the gold-edged fronts and   torso.armor
                the coat's sides down to the belt (pivot: the neck)
''', '''  coat body     collar, lapels with their gold checker, the gold-edged fronts and   torso.armor
                the coat's sides down to the belt (pivot: the neck); with its hull,
                the body with the opening filled, outside which our torso is taken
                away in a pose
''')
rep('''What his picture hides is filled in his colours: the coat under the near sleeve takes his cloth
nearest it; the shirt under the coat and the shirt's sleeves (his are under the coat's) are our
body's shape (<parts>: our male at idle frame 0 as a map of body parts, tools/refs/scarlet-body-map.mts)
in his whites, lit from the upper left as his shirt front is, with the cravat wrapped round the neck;
the coat's back between the legs is his lining, carried on behind the legs. A piece's edge that his
picture hides takes his black line, so it is outlined when another pose shows it. His belt, its
buckle, cross and tassel stay out (they are the trousers'), and so does whatever lies under what our
game draws behind the coat (the far arm and glove, the legs) or in front of the sleeves (the sword
and the near glove): there the reduced reference is the other part's.
''', '''What his picture hides is filled in his colours, on our body's shape (<maps>: our male at idle
frame 0 as maps of body parts, tools/refs/scarlet-body-map.mts): the coat body covers our torso and a
pixel round it (his cloth nearest it under the near sleeve; where our torso is drawn over his far
sleeve, his sleeve's pixels), and the far sleeve our far arm and a pixel round it, so a turned piece
never lets our body show past it; the shirt under the coat and the shirt's sleeves (his are under the
coat's) are our body's shape and a pixel round it in his whites, lit as his shirt front is, with the
cravat wrapped round the neck; the coat's back between the legs is his lining, carried on behind the
legs. A piece's edge that his picture hides takes his black line, so it is outlined when another pose
shows it. His belt, its buckle, cross and tassel stay out (they are the trousers'), and so does
whatever lies under what our game draws behind the coat (the far arm and glove, the legs) or in front
of the sleeves (the sword and the near glove): there the reduced reference is the other part's.
''')
rep('''  npx tsx tools/refs/scarlet-body-map.mts <out>
  python3 -I tools/refs/scarlet-upper-from-ref.py <out> <out>/male-idle-parts.png [coat.ts shirt.ts]
''', '''  npx tsx tools/refs/scarlet-body-map.mts <maps>
  python3 -I tools/refs/scarlet-upper-from-ref.py <out> <maps> [coat.ts shirt.ts]
''')
rep('''# The skin he painted his neck in (the face's base skin, scarlet-eyes-from-ref.py): the colour the
# skin tone moves his neck's skin from.''', '''# His lit skin (the base his face is drawn on): the skin tone moves his neck's skin from it.''')
rep('''    tcls = classes(tor)
    fcls = classes(fig)
    yy, xx = np.mgrid[0:G, 0:G]
    # What our game draws behind the coat''', '''    tcls = classes(tor)
    yy, xx = np.mgrid[0:G, 0:G]
    # What our game draws behind the coat''')
rep('''    # o grows toward -n's... the left of a limb pointing down is its +o side: flip so -1 is left
    return -out if n[0] > 0 else out''', '''    # o runs along n, the limb's direction turned a quarter: flip it where n points right
    return -out if n[0] > 0 else out''')
rep('''    # The sleeves: our arm's shape (its line included) in his whites, lit on the left as a round limb
    # is, the far arm a shade darker; a cuff at the wrist (a seam in shade, then his lightest white),
    # his line round it.''', '''    # The sleeves: our arm's shape and a pixel round it in his whites, lit on the left as a round limb
    # is, the far arm a shade darker; a cuff at the wrist (a seam in shade, then his lighter whites),
    # his line round it.''')
rep('''    out_dir, maps = sys.argv[1], sys.argv[2]''', '''    out_dir, maps = sys.argv[1], sys.argv[2]  # noqa: E501''')
open(p, 'w').write(s)
