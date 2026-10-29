# Cabezas candidatas (D-T7): ¿encajan en una cabeza nuestra o necesitan cabeza nueva?

Render only, 2026-10-29. Cada candidata se renderizó en reposo (idle, frame 0) en su rama, y su pelo y sus ojos
(donde son una forma propia) se pusieron tal cual sobre nuestras cabezas: Ren (`night`), el romano (`roman`, la cara
masculina por defecto) y Aiden (`valiant`) para los hombres; Lyra (`fine`) y Aurelia (`aurelia`) para las caballeras.
Hojas: una PNG por cabeza en esta carpeta (fila 1 su recorte, fila 2 como está en su rama, fila 3 sobre nuestras cabezas).

Notas de método:
- Los pelos de las candidatas se estampan en el ancla de la cara sin mirar la forma de cara (`stampPiece` / `paintedHair`),
  así que el cambio de cara es el único cambio. `hair_noble` y los dos pelos navy recortan el cráneo a su pelo (`trimSkull`);
  los demás (wanderer, vanguard, samurai, hoplite, general, knight, heroine_auburn) no: nuestro cráneo puede asomar.
- Las cabezas noble, navy y general se colocaron a la altura de la cabeza del romano (3 filas más arriba sobre el cuello);
  sobre Ren y Aiden bajan con el ancla, con el pelo.
- La cabeza `base` (la mujer base del dueño) solo existe en `cleanup/five-only`; en las ramas candidatas no está, así que no
  se renderizó. Sería la tercera opción para las caballeras.
- `RETIRED_HAIR` (`cleanup/five-only`, `src/sprite/items/hair.ts`) solo lista pelos genéricos antiguos (sunburst, raven, …).
  Ningún pelo candidato está en ese set; de hecho ninguno existe aún en esa rama. Al integrarlos habrá que darles `heads`.

| Candidata (rama) | Cara / ojos / pelo | Veredicto | Razón | ¿Pelo en RETIRED_HAIR? |
|---|---|---|---|---|
| wanderer (hero/three-outfits: armado y pícaro) | `wanderer` / `wanderer` / `hair_wanderer` | encaja en la cabeza de Ren como está (y en la de Aiden) | flequillo sobre las cejas, fila de ojos y mandíbula dentro del pelo; en el romano la nuca y la sien asoman detrás del pelo | no |
| vanguard (hero/three-outfits: táctico, WIP e1239a4) | `vanguard` / `vanguard` / `hair_vanguard_spikes` | encaja en la cabeza de Ren como está (y en la de Aiden) | igual que wanderer: solo cambia la cara; en el romano asoma su nuca | no |
| noble (hero/noble-swordsman) | `noble` / `noble` / `hair_noble` | encaja en la cabeza del romano como está (también en Ren y Aiden) | su cabeza se hizo al tamaño de la del romano; la cinta y el flequillo caen bien sobre las tres; `trimSkull` recorta el cráneo | no |
| samurai (hero/samurai) | `samurai` / `samurai` / `hair_samurai` | necesita cabeza nueva (o la del romano con retoque) | su cara es más grande que las nuestras: en Ren y Aiden el flequillo baja hasta la fila de ojos; en el romano coincide la fila de ojos pero asoma la sien 1 px | no |
| navy, pelo tousle (hero/navy-officer) | `navy` / `navy` / `hair_navy_tousle` | encaja en la cabeza del romano como está | hecho al tamaño de la cabeza del romano; en Ren y Aiden queda frente de más y el pelo más ancho que la cara | no |
| navy, pelo swept (hero/navy-officer) | `navy` / `navy` / `hair_navy_swept` | encaja en la cabeza del romano como está | igual que el tousle: solo cambia la cara en el romano; en Ren y Aiden frente de más | no |
| hoplite (hero/bronze-warrior, su repintado) | `hoplite` / `hoplite` / `hair_hoplite` | necesita cabeza nueva (es decir, la suya: su cabeza repintada) | su cabeza es más pequeña y el pelo no recorta el cráneo: en Ren y Aiden nuestro cráneo asoma por encima del pelo; en el romano asoman cráneo y nuca y la trenza se separa | no |
| general (hero/bronze-warrior, general romano) | `general` / `general` / `hair_general` | encaja en la cabeza del romano como está (también en Ren y Aiden) | los rizos encierran la cara en las tres; fila de ojos bajo el flequillo | no |
| knight (hero/three-knights) | `knight` / `knight` / `hair_knight` | encaja en la cabeza de Ren como está (y en la de Aiden) | flequillo sobre las cejas, mandíbula dentro del pelo; en el romano asoma la nuca | no |
| hair_long_lock (body/brawler-roman: su hombre fornido, cuerpo fornido con la camisa de costuras; sin preset, el look es `BROAD_READ_LOOK`) | `stern` / `stern` / `hair_long_lock` | encaja en la cabeza de Ren como está (y en la de Aiden) | la cara `stern` son sus píxeles de la línea de pestañas hacia abajo sobre nuestro cráneo, así que el pelo ya está hecho sobre nuestro cráneo: flequillo, fila de ojos y mandíbula en su sitio en Ren y Aiden, el mechón cae sobre el pecho; en el romano (3 filas más alto) la nuca asoma entre el pelo y el cuello | no |
| gallant (heroine/three-knights) | `gallant` / `gallant` / `hair_heroine_auburn` | encaja en la cabeza de Lyra como está | flequillo, fila de ojos y mandíbula de Lyra dentro del pelo; en Aurelia la cara es más ancha y baja (frente de más, la mejilla lejana sale del pelo); `base` no probada | no |

Nota: la cabeza `vanguard` del táctico es la del pelo oscuro de punta de su dibujo de los tres conjuntos (la figura de la
derecha, espejada), distinta de este `hair_long_lock` rubio con mechón de su hombre fornido; son dos candidatas aparte.

Ren como cabeza de muestra: `ren-como-cabeza-de-muestra.png` (los tres conjuntos, el samurai, el oficial naval, el guerrero
de bronce y los tres caballeros, cada uno como está en su rama y con la cabeza entera de Ren). Todos los conjuntos se
visten con la cabeza de Ren sin huecos; la diadema del hoplita queda sobre el pelo de Ren.
