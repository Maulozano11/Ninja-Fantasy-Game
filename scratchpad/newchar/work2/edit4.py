p = 'tools/refs/scarlet-study.py'
s = open(p).read()
a = """    # hair, face and chin (his neck below the chin goes with the coat, round the cravat)
    'head': [(54, 16), (102, 16), (102, 50), (97, 53), (93, 55), (89, 56), (86, 57.5), (84, 58.5), (78, 58.5), (75, 56),
             (72, 55), (68, 54.5), (64, 55.5), (60, 57.5), (56, 56), (54, 52)],"""
b = """    # hair, face and chin (his neck below the chin goes with the coat, round the cravat, and so does
    # his collar's white-edged tip under his hair's near ends)
    'head': [(54, 16), (102, 16), (102, 50), (97, 53), (93, 55), (89, 56), (86, 57.5), (84, 58.5), (78, 58.5), (75, 56),
             (72, 54), (68, 52), (65, 51.5), (61, 52), (57, 51), (54, 49)],"""
assert a in s
s = s.replace(a, b)
a = """LAYER_PATCHES = {
"""
b = """LAYER_PATCHES = {
    # his face: his eyes on ours (his lashes, his white, his amber iris and its glint; the far one his
    # dark amber and glint), the shade under his bangs, the hair strand between his eyes, his nose's
    # shade, his small smile, his jaw and chin
    'head': [(119, 139, [
        'rAlrArrMJMUrl44M..',
        'liiwAwcbbbQl4qaab.',
        'iMqrAGZ3T7666I5bc.',
        'mUUlrwM446666QZXb.',
        'imXJlAl466666422b.',
        'lccczl466666UXZb..',
        'iiliql466666UZXb..',
        '....zQ262MU66ZXi..',
        '....Mz466662XZv_..',
        '....cUJq2662Fa_...',
        '......UMqqZ6c_....',
    ])],
"""
assert a in s
s = s.replace(a, b)
open(p, 'w').write(s)
