import sys
p = sys.argv[1]
s = open(p).read()
old = """  'Chakra Nature & Burst': 'Naturaleza y estallido de chakra',
  'Chakra Color': 'Color del chakra',
"""
assert old in s
s = s.replace(old, """  'Chakra Color': 'Color del chakra',
  // the chakra types (the ninja's nature) and their bursts
  'Chakra Type': 'Tipo de chakra',
  Nature: 'Naturaleza',
  'Your chakra type is your elemental nature: it decides the elemental jutsu you can learn.':
    'Tu tipo de chakra es tu naturaleza elemental: decide los jutsus elementales que puedes aprender.',
  Elements: 'Elementos',
  'No element': 'Sin elemento',
  Burst: 'Estallido',
  'Only a look: the color never changes the nature. Green fire is still Fire; black lightning is still Lightning.':
    'Solo es estético: el color nunca cambia la naturaleza. Un fuego verde sigue siendo Fuego; un rayo negro sigue siendo Rayo.',
  Fire: 'Fuego',
  Water: 'Agua',
  Wind: 'Viento',
  Lightning: 'Rayo',
  Earth: 'Tierra',
  Shadow: 'Sombra',
  Spirit: 'Espíritu',
  Light: 'Luz',
  Void: 'Vacío',
  'Pyre Crown': 'Corona de pira',
  'Cinder Nova': 'Nova de brasas',
  'Storm Lash': 'Látigo de tormenta',
  'Leafwind Spiral': 'Espiral de viento y hojas',
  'Rising Tide': 'Marea creciente',
  'Nightveil Mist': 'Bruma del velo nocturno',
  'Spectral Guardian': 'Guardián espectral',
  'Heaven Pillar': 'Pilar celestial',
  'Abyss Orbit': 'Órbita del abismo',
  'Tongues of flame lick upward from the whole body.': 'Lenguas de fuego suben por todo el cuerpo.',
  'Embers explode outward as a shockwave rolls out from the feet.': 'Las brasas estallan mientras una onda expansiva sale de los pies.',
  'Jagged bolts crackle and arc around the body.': 'Rayos quebrados crepitan y saltan alrededor del cuerpo.',
  'A rising whirlwind of wind and leaves wraps the body.': 'Un torbellino de viento y hojas sube y envuelve el cuerpo.',
  'Rings of water climb the body, shedding droplets.': 'Anillos de agua suben por el cuerpo soltando gotas.',
  'Shadow smoke streams backward in curling tendrils.': 'Humo de sombra fluye hacia atrás en zarcillos que se enroscan.',
  'A towering ghost warrior looms behind the user.': 'Un enorme guerrero fantasma se alza a su espalda.',
  'A pillar of light falls while rays fan out from the heart.': 'Cae un pilar de luz mientras los rayos se abren desde el pecho.',
  'Black orbs orbit the body as space cracks open around it.': 'Orbes negros giran alrededor del cuerpo mientras el espacio se resquebraja.',
  // the chakra colors
  Red: 'Rojo',
  Orange: 'Naranja',
  Yellow: 'Amarillo',
  Green: 'Verde',
  Blue: 'Azul',
  Indigo: 'Índigo',
  Violet: 'Violeta',
  White: 'Blanco',
  Black: 'Negro',
""", 1)
old = "  'Any nature takes any color: red water, black or blue lightning, green fire…': 'Cualquier naturaleza acepta cualquier color: agua roja, rayo negro o azul, fuego verde…',\n"
assert old in s
s = s.replace(old, "", 1)
open(p, 'w').write(s)
print('ok')
