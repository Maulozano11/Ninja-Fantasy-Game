import sys
root = sys.argv[1]
burst_code = open(sys.argv[2]).read()


def rep(s, old, new, count=1):
    assert s.count(old) == count, (old, s.count(old))
    return s.replace(old, new)


p = root + '/src/sprite/types.ts'
s = open(p).read()
s = rep(s, "export type ChakraColorId = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'indigo' | 'violet' | 'white' | 'black';",
        "export type ChakraColorId = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'indigo' | 'violet' | 'white' | 'black' | 'brown';")
open(p, 'w').write(s)

p = root + '/src/sprite/chakra.ts'
s = open(p).read()
s = rep(s, "  { id: 'black', name: 'Black', hex: '#1a0b22', burst: 'Abyss Orbit', motif: 'Void', desc: 'Black orbs orbit the body as space cracks open around it.' },\n",
        "  { id: 'black', name: 'Black', hex: '#1a0b22', burst: 'Abyss Orbit', motif: 'Void', desc: 'Black orbs orbit the body as space cracks open around it.' },\n"
        "  { id: 'brown', name: 'Brown', hex: '#9a6a36', burst: 'Shattered Earth', motif: 'Earth', desc: 'The ground cracks open and rocks tear loose to float around the body.' },\n")
s = rep(s, "  black: pal('#000000', '#0e0614', '#4a1470', '#a238f0', '#ff2c50'),\n",
        "  black: pal('#000000', '#0e0614', '#4a1470', '#a238f0', '#ff2c50'),\n  brown: pal('#24160b', '#5a3a1c', '#9a6a36', '#d4a464', '#f6e3b4'),\n")
s = rep(s, "  black: 907,\n};", "  black: 907,\n  brown: 1009,\n};")
s = rep(s, "  black: blackBurst,\n};", "  black: blackBurst,\n  brown: brownBurst,\n};")
s = rep(s, """      case 'black':
        orb(c, 1, x0 - age * 0.3 * side * S, y0 - age * 0.5 * S, 1.5 * S);
        break;
""", """      case 'black':
        orb(c, 1, x0 - age * 0.3 * side * S, y0 - age * 0.5 * S, 1.5 * S);
        break;
      case 'brown':
        // a pebble lifting off and drifting up
        if (age < 9) rock(c, 1, x0, y0 - age * 0.7 * S, age < 6 ? 3 : 4);
        break;
""")
anchor = "// ---------------------------------------------------------------------------\n// Idle aura: pulsing rim + a few color-flavored motes\n"
s = rep(s, anchor, burst_code + anchor)
open(p, 'w').write(s)

p = root + '/src/sprite/chakraNature.ts'
s = open(p).read()
s = rep(s, "  black: 'Void', // Abyss Orbit: void orbs, cracking space\n",
        "  black: 'Void', // Abyss Orbit: void orbs, cracking space\n  brown: 'Earth', // Shattered Earth: cracked ground, rocks tearing loose\n")
s = rep(s, "  { nature: 'Lightning', elemental: true, bursts: ['yellow'] },\n",
        "  { nature: 'Lightning', elemental: true, bursts: ['yellow'] },\n  { nature: 'Earth', elemental: true, bursts: ['brown'] },\n")
open(p, 'w').write(s)

p = root + '/src/components/creator/words.ts'
s = open(p).read()
s = rep(s, "  'Abyss Orbit': 'Órbita del abismo',\n", "  'Abyss Orbit': 'Órbita del abismo',\n  'Shattered Earth': 'Tierra quebrada',\n")
s = rep(s, "  'Black orbs orbit the body as space cracks open around it.': 'Orbes negros giran alrededor del cuerpo mientras el espacio se resquebraja.',\n",
        "  'Black orbs orbit the body as space cracks open around it.': 'Orbes negros giran alrededor del cuerpo mientras el espacio se resquebraja.',\n"
        "  'The ground cracks open and rocks tear loose to float around the body.': 'El suelo se agrieta y las rocas se desprenden para flotar alrededor del cuerpo.',\n")
s = rep(s, "  Black: 'Negro',\n", "  Black: 'Negro',\n  Brown: 'Marrón',\n")
open(p, 'w').write(s)
print('ok')
