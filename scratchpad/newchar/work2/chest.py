"""Draft the chest rows (x 116..139, y 147..175) for the torso layer and print them."""
X0, Y0, W, H = 116, 147, 24, 29
g = [['.'] * W for _ in range(H)]


def row(y, x, s):
    for i, c in enumerate(s):
        if c != ' ':
            g[y - Y0][x - X0 + i] = c


# collar tips and the neck: near collar (gold-edged, his white glint at the tip), the cravat's knot
# round the neck, the far collar
row(147, 117, 'azfda')
row(147, 131, 'afJa')
row(148, 117, 'aJSfjak')
row(148, 130, 'kbjJfa')
row(149, 117, 'afShfaukk')
row(149, 129, 'kucaJfa')
# near lapel (gold outer edge, his gold embroidery, black inner edge), the open collar's skin and the
# cravat, the far lapel (gold inner edge and embroidery)
row(150, 117, 'jfSOhfakuZXukcaJFda')
row(151, 117, 'jfOhSfackUkuukaSyfa')
row(152, 117, 'nfOJfSaakurukcaJvfd')
row(153, 117, 'njSfOJSackuukcaOyfd')
# the shirt opens under the knot; the cravat hangs down its middle
row(154, 117, 'njOJfSFSa7ikuk5aJfd')
row(155, 117, 'jfSfSOfJa75kuc3aSyf')
row(156, 117, 'jfdSJfOJa75ukc0aJvf')
row(157, 117, 'jfdSfOJfa73kuiYaOyf')
row(158, 117, 'ffdjSfJOa53kuc0aJvf')
row(159, 117, 'ffdjSOfJa70kucYaSyf')
row(160, 117, 'fddfjSJfa53ckuVaJvf')
row(161, 117, 'fddfjSfOa70ikuYaOyf')
row(162, 117, 'fddffjSJa53kuk0aJvf')
row(163, 117, 'fddffjSfa70ckiVaSyf')
row(164, 117, 'fddffjjSa53Ykc0aJvf')
row(165, 117, 'fddffjjSa703iYVaOyf')
# below the lapel: the coat's near front edge (his dark gold trim) and the shirt to the belt
row(166, 117, 'fddffjjSa70330YaJvf')
row(167, 117, 'fddffjjya5303YVaSyf')
row(168, 117, 'fddffjjya7053YVaJvf')
row(169, 117, 'fddffjjva3503YRaOyf')
row(170, 117, 'fddffjjyaV03YVNaJvf')
row(171, 117, 'fddffjjvaRVYVNRayff')
# his belt, his gold buckle ring
row(172, 117, 'ddajnjnyaaaaJOSayad')
row(173, 119, 'adfjfdvdhOadXJadd')
row(174, 119, 'adffddyddSddSFadf')
row(175, 119, 'aeddd' + 'avadJOSvaadf')
for r in g:
    print("        '" + ''.join(r) + "',")
