## Chakra type: the elemental nature (decided 2026-10-21)

The owner: *"lo de la naturaleza elemental significa el tipo de chakra que
eligen los jugadores [...] si es chakra tipo fuego no importa el color que
eligan es naturaleza fuego si eligen el electrico entonces son naturaleza
rayo"*.

**Decided by the owner:**

- **One choice.** In Appearance > Chakra the player picks the **chakra type**
  (Fuego, Agua, Viento, Rayo...). That type is the ninja's **elemental nature**
  in the rules: it decides which elemental jutsu the ninja can learn ("The
  nature decides the elemental jutsu" below). There is no other nature picker.
- **The colour is only a look.** Any type takes any colour (its natural one,
  another chakra colour or any hex): green fire is still Fire, black or blue
  lightning is still Lightning. The colour never changes the nature.

**His answers to the four questions** (2026-10-21, later): *"1 si 2 actualiza
3 sombra se quedara pendiente y espiritu tambien quitalos de la seleccion y luz
y vacio hay que hacerles justsus pero dejalo pendiente porque van a ser jutsus
de tipo deidad angel y dios y el de vacio sombra y espiritu va ser demoniaco
4 si"*. All four are built:

1. **The legends keep their new types** ("si"), each in the colour it always
   had: Kaien and Ren Lightning (violet, blue), Hiro Wind (orange), Raiga Fire
   (violet); of the companions, Hana Water (green) and Kenji Earth (violet).
   Kaien, Raiga and Kenji lose the ghost-warrior burst. Solen, Akira, Aiden and
   Shiori already matched.
2. **Saved copies are updated** ("actualiza"). A copy of a legend or companion
   (the hero, the roster, the party and the fallen of a mission under way,
   matched by its id) that still has the burst it had before (Kaien, Raiga and
   Kenji the violet Spectral Guardian, Ren the blue Rising Tide, Hiro the
   orange Cinder Nova, Hana the green Leafwind Spiral) loads with the legend's
   burst of today, in the colour it showed (its own colour, else the old
   burst's natural one). Nothing else changes, and it happens once. A copy
   whose player picked another burst keeps it.
3. **Shadow and Spirit are pending** ("se quedara pendiente... quitalos de la
   seleccion"): the creator and the random ninja no longer offer them. Their
   art stays in the game: a ninja that already has one keeps it, draws it and
   reads it as its nature; the creator shows its tile marked "Pendiente" and
   lets the player pick another type. **Light and Void stay**; their own jutsu
   are pending ("dejalo pendiente"): **Light** will get **deity, angel and god**
   jutsu (*"deidad angel y dios"*); **Void**, and later **Shadow and Spirit**,
   **demonic** ones (*"demoniaco"*). Until then they learn no elemental jutsu;
   the creator says so ("Sus jutsus llegarán más adelante").
4. **Cinder Nova stays as a second Fire burst** ("si").

The types and their bursts:

| Type | Burst(s) | Natural colour | State |
|---|---|---|---|
| Fire (Fuego) | Pyre Crown (flames), Cinder Nova (embers and a fiery shockwave) | red, orange | His rule; Cinder Nova as a second burst: his answer 4 |
| Water (Agua) | Rising Tide | blue | Built; his answer 1 (Hana Water) builds on it |
| Wind (Viento) | Leafwind Spiral | green | Built; his answer 1 (Hiro Wind) builds on it |
| Lightning (Rayo) | Storm Lash | yellow | His rule |
| Earth (Tierra) | Shattered Earth (the ground cracks, stone spikes, rocks tear loose and float up) | brown | Kenji Earth: his answer 1. The burst is **new art, waiting for his approval** |
| Shadow (Sombra), no element | Nightveil Mist | indigo | **Pending** (answer 3): not offered; jutsu later, demonic |
| Spirit (Espíritu), no element | Spectral Guardian | violet | **Pending** (answer 3): not offered; jutsu later, demonic |
| Light (Luz), no element | Heaven Pillar | white | Stays (answer 3); its jutsu later: deity, angel and god |
| Void (Vacío), no element | Abyss Orbit | black | Stays (answer 3); its jutsu later: demonic |

**The nature decides the elemental jutsu** (the owner's earlier rule:
"Elemental nature decides the elemental jutsu available; a new ninja starts
with low-rank ones only"). Built in the creator's Jutsu step:

- **Gated:** a jutsu of one of the five elements (Fire, Water, Wind,
  Lightning, Earth) in the **Element I, Element II and S-rank** slots is
  offered only to a ninja of that element.
- **Not gated:** the jutsu with no element in those slots (taijutsu,
  kenjutsu, genjutsu); everything in the **Utility** slot (including the
  explosive tag, a Fire tool, and the mystical palm, Water healing); the **clan
  secret**, whatever its element (it comes with the clan).
- **Light and Void** (and a ninja that still has Shadow or Spirit) are offered
  no elemental jutsu: only the ones with no element, until their own exist.
- **Changing the type** swaps each chosen jutsu of another element for one of
  the new type: its own element first, the lowest rank first, never the one
  the other Element slot holds; if the type has none left, one with no
  element. A note under the type tiles and at the top of the Jutsu step lists
  the swaps ("Ahora Rayo: se cambiaron los jutsus de otro elemento. Bola de
  fuego → Sabueso del rayo; Gran aniquilación → Kirin.").
- **A sheet keeps what it has:** a legend's jutsu of a second element (Kaien's
  Fireball, Raiga's Earth Wall), an older sheet or an imported one keep their
  jutsu; the Jutsu step marks such a jutsu "no es de tu naturaleza", and it
  stays until the player changes that slot or the type. Saves are not changed.
- **The random ninja** picks jutsu of its own nature (Element I and the S-rank
  of its element when there is one) and its clan's secret.
- **Enemies and battles** are not touched: the gate is the creator's.
- **Not built yet:** "a new ninja starts with low-rank ones only". No rank cap
  is written down, and the creator's S-rank slot is part of the approved
  layout, so which ranks a new ninja may take is a question for the owner
  (Open questions).

**In the code** there is one source: the look's burst
(`appearance.chakra.color`, an id named after the colour the bursts were first
picked by) gives the nature through `BURST_NATURE`
(`src/sprite/chakraNature.ts`); the rules read it with `natureOf(character)`
(`src/rules/ninja.ts`). The colour is `appearance.chakra.tint`. A burst id the
game does not know is drawn, cast and described as Rising Tide and reads as
Water. A sheet older than the sprite look draws its burst from its old aura
colour (`palette.chakraAuraColor`); the creator's clan change no longer writes
that colour, so such a ninja's type only changes when the player picks one.
Pending types are marked `pending` in `CHAKRA_TYPES`; `OFFERED_TYPES` is what
the creator and the random ninja offer. The saved copies are moved by
`updateLegendChakra` (in `migrateCharacter`, so `loadHero`, `loadRoster`, the
mission load and imports all do it), from `LEGEND_OLD_BURST`. The jutsu gate is
`src/rules/jutsuNature.ts` (`jutsuChoices`, `fitLoadout`, `offNatureJutsus`).

