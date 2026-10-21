# Skill icons: the full list

Every ability that needs a skill icon, in the order of the template `ui-icons-template.png`. Built by `tools/ui/ui-icons-template.ts` from the game's own tables (jutsu: `src/data/shinobiData.ts` and `src/battle/jutsu.ts`; buttons and their Spanish labels: `src/components/battle/BattleScreen.tsx` and `battleText.ts`; clan abilities: phase 1 of `docs/CLANS_DESIGN.md`). The hydra's attacks are left out (no ninja uses them).

Icon size: 44 x 44 px, the window of the kit's skill slot frame (56 x 56 px on a 1600 x 900 screen). The template shows everything at 3x (a 132 x 132 window per icon). "Spanish name" is the name the game shows: for jutsu that is the button's label (the game has no other Spanish name for them; their tooltip shows the English name).

In his bar the four items sit in greyed item slots (the kit's `item_slot`, a 40 x 40 window with a dim glyph and the name); the template shows them at the skill icon size like the rest, so one painted icon can serve both. Passives have no button; they are listed because the clan card and the tips can show their icon.

**63 icons:** Basic actions (Básicas) 21, Items (Objetos) 4, Jutsu by element (Jutsu por elemento) 27, Clan abilities (Clanes) 11.

## Basic actions (Básicas): 21

| # | id | Spanish name | English name | group | row | use | notes |
|---|---|---|---|---|---|---|---|
| 1 | `attack` | Atacar | Attack | Básicas | Barra | action | Most likely his painted icon 3. |
| 2 | `throw` | Kunai | Kunai | Básicas | Barra | action | Throws a kunai (button id "throw"). Most likely his painted icon 5. |
| 3 | `dash` | Correr | Dash | Básicas | Barra | action | Most likely his painted icon 1. |
| 4 | `dodge` | Esquivar | Dodge | Básicas | Barra | action |  |
| 5 | `hide` | Esconderse | Hide | Básicas | Barra | action | Most likely his painted icon 2. |
| 6 | `draw` | Desenvainar | Draw weapon | Básicas | Barra | free once a turn, then bonus action | The "draw" button while the weapon is stowed. |
| 7 | `stow` | Guardar arma | Stow weapon | Básicas | Barra | free once a turn, then bonus action | The same "draw" button while the weapon is drawn. |
| 8 | `end` | Fin | End turn | Básicas | Barra | button | Ends the turn; in the stealth phase it reads "Listo" (Done). |
| 9 | `disengage` | Retirarse | Disengage | Básicas | Menú Más | action |  |
| 10 | `crouch` | Agacharse | Crouch | Básicas | Menú Más | bonus action |  |
| 11 | `stand` | Levantarse | Stand | Básicas | Menú Más | free | The same "crouch" button while crouched. |
| 12 | `jump` | Salto ninja | Ninja jump | Básicas | Menú Más | bonus action | Most likely his painted icon 4. |
| 13 | `shove` | Empujar | Shove | Básicas | Menú Más | action |  |
| 14 | `trip` | Derribar | Trip | Básicas | Menú Más | action |  |
| 15 | `focus` | Concentrar chakra | Focus chakra | Básicas | Menú Más | action | The button shows "Concentr..." (truncated). |
| 16 | `stabilize` | Estabilizar | Stabilize | Básicas | Menú Más | action | Only with a downed ally next to you. |
| 17 | `stone` | Lanzar piedra | Throw a stone | Básicas | Sigilo, borde y menú | action | Stealth phase only. |
| 18 | `drag` | Arrastrar cuerpo | Drag body | Básicas | Sigilo, borde y menú | movement | Stealth phase only, next to a body (button id "drag:<unit>"). |
| 19 | `flee` | Huir | Flee | Básicas | Sigilo, borde y menú | action in combat | Only at an exit edge of the map. |
| 20 | `more` | Más | More | Básicas | Sigilo, borde y menú | button | Opens the "Más" menu. |
| 21 | `back` | Volver | Back | Básicas | Sigilo, borde y menú | button | Closes the "Más" menu (the game shows "←" on the same "more" button). |

## Items (Objetos): 4

| # | id | Spanish name | English name | group | row | use | notes |
|---|---|---|---|---|---|---|---|
| 1 | `pill` | Píldora de soldado | Soldier pill | Objetos | Menú Más | bonus action | Consumable with a count badge; the button shows "Píldora d..." (truncated). |
| 2 | `bandage` | Venda | Bandage | Objetos | Menú Más | action | Consumable with a count badge. |
| 3 | `antidote` | Antídoto | Antidote | Objetos | Menú Más | action | Consumable with a count badge. |
| 4 | `tag` | Sello explosivo | Explosive tag | Objetos | Menú Más | action | Consumable with a count badge; the button shows "Sello expl..." (truncated). |

## Jutsu by element (Jutsu por elemento): 27

| # | id | Spanish name | English name | group | row | use | notes |
|---|---|---|---|---|---|---|---|
| 1 | `trap_setter_tag` | Trampa | Explosive Tag Ambush | Jutsu por elemento | Fuego | rank C, action, 2 chakra | Button "Trampa" (EN "Trap tag"); no Spanish full name in the game, the tooltip shows the English one. |
| 2 | `fireball_goukakyu` | Bola fuego | Fire Release: Great Fireball | Jutsu por elemento | Fuego | rank C, action, 3 chakra | Button "Bola fuego" (EN "Fireball"); no Spanish full name in the game, the tooltip shows the English one. |
| 3 | `dragon_fire_stream` | Llama | Fire Release: Dragon Fire | Jutsu por elemento | Fuego | rank B, action, 4 chakra | Button "Llama" (EN "Dragon fire"); no Spanish full name in the game, the tooltip shows the English one. |
| 4 | `dragon_fire_bomb` | Bomba | Mirai Secret: Dragon Flame Annihilation | Jutsu por elemento | Fuego | rank A, action, 5 chakra | Button "Bomba" (EN "Dragon bomb"); no Spanish full name in the game, the tooltip shows the English one. |
| 5 | `great_fire_annihilation` | Aniquilación | Ultimate S-Rank: Great Fire Annihilation | Jutsu por elemento | Fuego | rank S, action, 8 chakra | Button "Aniquilación" (EN "Annihilation"); no Spanish full name in the game, the tooltip shows the English one. |
| 6 | `mystical_palm` | Palma | Mystical Palm Healing | Jutsu por elemento | Agua | rank C, action, 3 chakra | Button "Palma" (EN "Heal palm"); no Spanish full name in the game, the tooltip shows the English one. |
| 7 | `water_shield_suijinheki` | Muro agua | Water Release: Water Formation Wall | Jutsu por elemento | Agua | rank C, action, 3 chakra | Button "Muro agua" (EN "Water wall"); no Spanish full name in the game, the tooltip shows the English one. |
| 8 | `water_dragon_suiryuudan` | Dragón agua | Water Release: Water Dragon Bullet | Jutsu por elemento | Agua | rank B, action, 4 chakra | Button "Dragón agua" (EN "Water dragon"); no Spanish full name in the game, the tooltip shows the English one. |
| 9 | `wind_blade_daitoppa` | Hoja viento | Wind Release: Great Breakthrough Blade | Jutsu por elemento | Viento | rank C, action, 3 chakra | Button "Hoja viento" (EN "Wind blade"); no Spanish full name in the game, the tooltip shows the English one. |
| 10 | `crescent_moon_dance` | Luna | Dance of the Crescent Moon | Jutsu por elemento | Viento | rank B, action, 3 chakra | Button "Luna" (EN "Crescent"); no Spanish full name in the game, the tooltip shows the English one. |
| 11 | `rasenshuriken_wind` | Rasenshuriken | Ultimate S-Rank: Wind Release Rasenshuriken | Jutsu por elemento | Viento | rank S, action, 8 chakra | Button "Rasenshuriken" (EN "Rasenshuriken"); no Spanish full name in the game, the tooltip shows the English one. |
| 12 | `lightning_hound_raidon` | Sabueso | Lightning Release: Lightning Hound | Jutsu por elemento | Rayo | rank B, action, 4 chakra | Button "Sabueso" (EN "Thunder hound"); no Spanish full name in the game, the tooltip shows the English one. |
| 13 | `chidori_lightning_blade` | Chidori | Lightning Release: Chidori (One Thousand Birds) | Jutsu por elemento | Rayo | rank A, action, 5 chakra | Button "Chidori" (EN "Chidori"); no Spanish full name in the game, the tooltip shows the English one. |
| 14 | `kirin_thunder` | Kirin | Ultimate S-Rank: Kirin (Thunder Divine Beast) | Jutsu por elemento | Rayo | rank S, action, 8 chakra | Button "Kirin" (EN "Kirin"); no Spanish full name in the game, the tooltip shows the English one. |
| 15 | `earth_wall_doryuheki` | Muro tierra | Earth Release: Mud Wall | Jutsu por elemento | Tierra | rank B, action, 3 chakra | Button "Muro tierra" (EN "Earth wall"); no Spanish full name in the game, the tooltip shows the English one. |
| 16 | `earth_spear_doryuudan` | Lanza | Earth Release: Stone Dragon Spate | Jutsu por elemento | Tierra | rank B, action, 4 chakra | Button "Lanza" (EN "Earth spear"); no Spanish full name in the game, the tooltip shows the English one. |
| 17 | `wood_dragon_jutsu` | Dragón madera | Ryusei Secret: Wood Dragon Technique | Jutsu por elemento | Tierra | rank A, action, 5 chakra | Button "Dragón madera" (EN "Wood dragon"); no Spanish full name in the game, the tooltip shows the English one. |
| 18 | `wood_golem_titan` | Gólem | Ultimate S-Rank: Wood Golem Awakening | Jutsu por elemento | Tierra | rank S, action, 8 chakra | Button "Gólem" (EN "Golem"); no Spanish full name in the game, the tooltip shows the English one. |
| 19 | `temple_of_nirvana` | Nirvana | Genjutsu: Temple of Nirvana | Jutsu por elemento | Genjutsu | rank A, action, 4 chakra | Button "Nirvana" (EN "Nirvana"); no Spanish full name in the game, the tooltip shows the English one. Most likely his painted icon 6. |
| 20 | `body_flicker` | Shunshin | Instant Body Flicker | Jutsu por elemento | Chakra (taijutsu y sellos) | rank D, bonus action, 2 chakra | Button "Shunshin" (EN "Flicker"); no Spanish full name in the game, the tooltip shows the English one. |
| 21 | `substitution_kawarimi` | Kawarimi | Body Replacement Technique | Jutsu por elemento | Chakra (taijutsu y sellos) | rank D, reaction, 2 chakra | Button "Kawarimi" (EN "Kawarimi"); no Spanish full name in the game, the tooltip shows the English one. A reaction: not on the bar, offered when it can be used. |
| 22 | `leaf_hurricane_senpuu` | Huracán | Leaf Hurricane (Konoha Senpuu) | Jutsu por elemento | Chakra (taijutsu y sellos) | rank D, action, 1 chakra | Button "Huracán" (EN "Hurricane"); no Spanish full name in the game, the tooltip shows the English one. |
| 23 | `shadow_clone` | Clon | Shadow Clone Technique | Jutsu por elemento | Chakra (taijutsu y sellos) | rank B, bonus action, 3 chakra | Button "Clon" (EN "Clone"); no Spanish full name in the game, the tooltip shows the English one. |
| 24 | `adamantine_sealing_chains` | Cadenas | Kōton Secret: Adamantine Sealing Chains | Jutsu por elemento | Chakra (taijutsu y sellos) | rank A, action, 5 chakra | Button "Cadenas" (EN "Chains"); no Spanish full name in the game, the tooltip shows the English one. |
| 25 | `taki_sixtyfour_palms` | 64 palmas | Northstar Secret: Eight Trigrams 64 Palms | Jutsu por elemento | Chakra (taijutsu y sellos) | rank A, action, 5 chakra | Button "64 palmas" (EN "64 palms"); no Spanish full name in the game, the tooltip shows the English one. |
| 26 | `yasaka_magatama` | Magatama | Ultimate S-Rank: Yasaka no Magatama | Jutsu por elemento | Chakra (taijutsu y sellos) | rank S, action, 8 chakra | Button "Magatama" (EN "Magatama"); no Spanish full name in the game, the tooltip shows the English one. |
| 27 | `night_guy_dragon` | Dragón noche | Ultimate S-Rank: Night Guy (Sekizo Dragon) | Jutsu por elemento | Chakra (taijutsu y sellos) | rank S, action, 8 chakra | Button "Dragón noche" (EN "Night dragon"); no Spanish full name in the game, the tooltip shows the English one. |

## Clan abilities (Clanes): 11

| # | id | Spanish name | English name | group | row | use | notes |
|---|---|---|---|---|---|---|---|
| 1 | `mirai_eye_of_tomorrow` | Ojo del Mañana | Eye of Tomorrow | Clanes | Mirai | passive | Passive, no button (proposed id). The current screenshots still show it as the "Visión del Futuro" (Future Foresight) button; phase 1 makes it passive, so one icon serves both. |
| 2 | `mirai_evasion` | Evasión Premonitoria | Premonitory Evasion | Clanes | Mirai | reaction, 2 chakra | A reaction: not on the bar, offered when it can be used. |
| 3 | `katon_pursuing_flame` | Katon: Llama Persecutoria | Katon: Pursuing Flame | Clanes | Mirai | action, 3 chakra | Button label "Persigue". |
| 4 | `koton_block` | Arquitectura Modular: Bloque | Modular Architecture: Block | Clanes | Kōton | bonus action, 2 chakra | Button label "Bloque". |
| 5 | `koton_wall` | Arquitectura Modular: Muro | Modular Architecture: Wall | Clanes | Kōton | action, 4 chakra | Button label "Muro metal". |
| 6 | `ryusei_weapon_nodes` | Nodos de Armas | Weapon Nodes | Clanes | Ryusei | passive | Passive, no button (proposed id): kunai and missed blows leave a Node. |
| 7 | `ryusei_warp` | Warp Strike | Warp Strike | Clanes | Ryusei | bonus action, 2 chakra | Button label "Warp". |
| 8 | `ryusei_swap` | Intercambio Espacial | Spatial Swap | Clanes | Ryusei | action, 3 chakra | Button label "Cambio". |
| 9 | `northstar_aura` | Aura de Soberanía | Aura of Sovereignty | Clanes | Northstar | passive | Passive, no button (proposed id): 4.5 m around the Northstar. |
| 10 | `northstar_command` | Command | Command | Clanes | Northstar | action, 4 chakra |  |
| 11 | `northstar_submission` | Sumisión Natural | Natural Submission | Clanes | Northstar | action, 5 chakra | Button label "Sumisión". |

## His painted icons (Tus íconos, referencia)

The six icons he painted on the action bar of `docs/reference/ui-battle-owner-reference.jpg`, left to right (cropped by `tools/ui/ui-icons-ref.py`). The number is the one on its tag in his picture (they do not run in order there).

| position | his tag | what he painted | most likely | could also be |
|---|---|---|---|---|
| 1 | 1 | A ninja silhouette sprinting over an orange burst: running. | Correr (`dash`) | Shunshin (`body_flicker`) |
| 2 | 2 | A dark ninja silhouette low in a wide crouch on gold, the usual "hide" pose. | Esconderse (`hide`) | Agacharse (`crouch`) |
| 3 | 3 | A long sword on a golden starburst: the weapon attack. | Atacar (`attack`) | - |
| 4 | 5 | A pair of boots in a green glow: a movement action that is not the sprint of icon 1. | Salto ninja (`jump`) | Retirarse (`disengage`), Correr (`dash`) |
| 5 | 4 | Crossed blades with cyan motion streaks, one with a fletched tail: a thrown weapon (the kunai). | Kunai (`throw`) | Esquivar (`dodge`), Luna (`crescent_moon_dance`) |
| 6 | 9 | A magenta pillar of light (the game's genjutsu colour, like the genjutsu blast) with a figure slumping at its foot: the genjutsu that drops its targets. | Nirvana (`temple_of_nirvana`) | Command (`northstar_command`), Sumisión Natural (`northstar_submission`) |
