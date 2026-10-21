import sys
root = sys.argv[1]

p = root + '/docs/GAMEPLAY_DESIGN.md'
s = open(p).read()
anchor = "## Language, sound and tips\n"
assert anchor in s
section = """## Chakra type: the elemental nature (decided 2026-10-21)

The owner: *"lo de la naturaleza elemental significa el tipo de chakra que
eligen los jugadores [...] si es chakra tipo fuego no importa el color que
eligan es naturaleza fuego si eligen el electrico entonces son naturaleza
rayo"*.

- **One choice.** In Appearance > Chakra the player picks the **chakra type**
  (Fuego, Agua, Viento, Rayo...). That type is the ninja's **elemental nature**
  in the rules: it will decide which elemental jutsu the ninja can learn
  (backlog 4c). There is no other nature picker.
- **The colour is only a look.** Any type takes any colour (its natural one,
  another chakra colour or any hex): green fire is still Fire, black or blue
  lightning is still Lightning. The colour never changes the nature.
- **The types are the bursts.** Each burst belongs to one type:

| Type | Burst(s) | Natural colour |
|---|---|---|
| Fire (Fuego) | Pyre Crown (flames), Cinder Nova (embers and a fiery shockwave) | red, orange |
| Water (Agua) | Rising Tide | blue |
| Wind (Viento) | Leafwind Spiral | green |
| Lightning (Rayo) | Storm Lash | yellow |
| Shadow (Sombra), no element | Nightveil Mist | indigo |
| Spirit (Espíritu), no element | Spectral Guardian | violet |
| Light (Luz), no element | Heaven Pillar | white |
| Void (Vacío), no element | Abyss Orbit | black |

  Earth (Tierra) has no burst yet, so it cannot be picked yet. The four types
  without an element are kept because their bursts were approved; no jutsu has
  their nature (see Open questions).
- **The legends follow their jutsu**, in the colour they always had: Kaien and
  Ren are Lightning (violet, blue), Hiro is Wind (orange), Raiga is Fire
  (violet); Hana is Water (green). Solen, Akira, Aiden and Shiori already
  matched.
- **In the code** there is one source: the look's burst
  (`appearance.chakra.color`, an id named after the colour the bursts were
  first picked by) gives the nature through `BURST_NATURE`
  (`src/sprite/chakraNature.ts`); the rules read it with `natureOf(character)`
  (`src/rules/ninja.ts`). The colour is `appearance.chakra.tint`. Saves did not
  change: an old ninja keeps the nature of the burst it has.

"""
s = s.replace(anchor, section + anchor, 1)
old = "## Open questions\n\n- None for now.\n"
assert old in s
s = s.replace(old, """## Open questions

- Chakra types without an element (Shadow, Spirit, Light, Void): which jutsu
  may they learn once the nature gates the jutsu (all non-elemental ones only?
  Shadow as Genjutsu, Spirit or Light as pure chakra?), or should they go?
- Legends with a jutsu of a second element (Kaien's Fireball, Raiga's Earth
  Wall): allowed as legends, or changed, once the nature gates the jutsu?
""", 1)
open(p, 'w').write(s)

p = root + '/docs/STATUS.md'
s = open(p).read()
old = "| Chakra | 9 colours plus any tint; 8 cast styles (\"eye\" hidden) |\n"
assert old in s
s = s.replace(old, "| Chakra | 8 types, which are the ninja's elemental nature (Fire with 2 bursts, Water, Wind, Lightning; Shadow, Spirit, Light, Void without element), any colour for any type; 8 cast styles (\"eye\" hidden) |\n", 1)
old = """### 4c. Elemental nature gates jutsu
Not in the code (an owner's session listed it as in progress: ask before starting). Goal: a
ninja's nature decides which elemental jutsu they can learn; a new ninja starts with low ranks.
"""
assert old in s
s = s.replace(old, """### 4c. Elemental nature gates jutsu
The nature exists (2026-10-21, `chakra/nature`): it is the chakra type picked in Appearance >
Chakra, read with `natureOf` (`src/rules/ninja.ts`); the colour never changes it
(`docs/GAMEPLAY_DESIGN.md`, "Chakra type"). The gating itself is not built (an owner's session
listed it as in progress: ask before starting). Goal: a ninja's nature decides which elemental
jutsu they can learn; a new ninja starts with low ranks. Open: Earth has no chakra burst yet; what
the types without element may learn; legends with a second element (Kaien, Raiga).
""", 1)
open(p, 'w').write(s)
print('ok')
