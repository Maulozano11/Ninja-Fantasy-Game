import sys
p = 'tools/refs/scarlet-study.py'
s = open(p).read()
rows = open(sys.argv[1]).read().rstrip('\n')
new = '''LAYER_PATCHES = {
    # his hilt, turned with his blade: his pommel (steel cap, red gem with his pink glint, dark ring),
    # his grip (dark steel, under our fist) and his cross-guard (light steel on the side the light
    # comes from, his red gem where the blade leaves it), in his black line
    'hilt': [(96, 170, [
''' + rows + '''
    ])],
}'''
s = s.replace('LAYER_PATCHES = {}', new)
open(p, 'w').write(s)
