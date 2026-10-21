from PIL import Image
im = Image.open('../art2/REF-genjutsu-set-owner.jpg').convert('RGB')
boxes = {
 'bolt': (0,28,115,145), 'stream': (330,28,680,145), 'breath': (685,28,845,198), 'sphere': (848,28,958,145),
 'slash': (0,204,115,320), 'multi': (144,204,256,320), 'hit': (287,204,398,320), 'blast': (430,205,848,460),
 'wall': (0,465,455,658), 'aura': (460,465,580,658), 'wall_diag': (611,465,1020,786), 'wall_depth': (0,674,235,1016),
}
for n,b in boxes.items():
    c = im.crop(b)
    k = 6 if c.width < 130 else (4 if c.width < 260 else 3)
    c.resize((c.width*k, c.height*k), Image.NEAREST).save('crop-%s.png'%n)
