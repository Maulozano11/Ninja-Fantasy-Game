# Propuesta: el mundo entre misiones (campaña, sociedad, linaje, reputación y riqueza) (respondida)

Respuestas del dueño, 2026-10-27 (primera ronda): `W1b W2b W3b W4a W5a W6a W7a W8b W9a W10a W11a
W12a`. **Segunda ronda, la misma noche, que manda donde cambia:** `W1b W2b W3b W4a+ W5a+ W6a W7a+
W8b W9c W10a W11a W12a W13a+ W14a W15a`. Lo que lleva **+** trae un añadido suyo:

- **W4a+:** la fórmula de estabilidad se queda, y además **cada pareja adicional baja la riqueza un
  nivel al empezar**, salvo que sea una **relación de una noche**: una relación amorosa **se
  convierte en "de una noche" cuando ya no se interactúa con esa persona** (sección 6).
- **W5a+:** 7 niveles y nunca un precio, pero el juego **muestra cifras aleatorias con los 000 que
  correspondan al nivel** para que el jugador sienta la dimensión de su riqueza, sin ponerle precio
  a nada (sección 8).
- **W7a+:** la edad jugable **la decide el jugador al crear la campaña**, según lo larga que la
  quiera y si es multigeneracional (sección 11).
- **W9c** (cambia su W9a de la primera ronda): el evento paranormal **solo en la historia, cuando el
  guion lo pida**; con las Bendiciones y Maldiciones de la primera ronda (sección 10).
- **W13a+:** mesas de verdad, y **ganar o perder ayuda en muchas tiradas sociales del casino**
  (sección 5b).

Difieren de la recomendación:

- **W7:** jugable a los 18 por defecto, pero es **el jugador quien lo fija** al crear la campaña.
- **W9c:** lo paranormal no es un beat de mundo sorteado: lo trae el guion.

Además de las letras, el dueño añadió (sus palabras resumidas; el detalle va en cada sección):

- **Estatus** (sección 6b, nuevo): *"si tienes estatus, riqueza y posición de poder tienes mucha
  ventaja con las mujeres en tiradas de cortejo, facilitando tanto el cortejo como la permisividad
  de tus otras parejas (ejemplo: capitán de nave espacial millonario que ha salvado múltiples veces
  la vida de su tripulación y pareja tiene permitido cortejar y tener otras parejas por méritos
  increíbles como esos). Podría ser un rasgo en sí: 1 Don nadie hasta 10 World Leader, pudiendo
  hasta poner dinámicas donde fans pueden salir en muchos lados. Muestra tu estatus en el mundo y
  se refleja en tus relaciones de pareja."*
- **Bendiciones y Maldiciones** (sección 10): el evento paranormal, *"relacionado con la historia
  y sus decisiones, puede traer Bendiciones o Maldiciones (buffs y debuffs que tendrán de rasgo
  aleatorio los personajes dependiendo de la trama en la que estén)"*.
- **El Salón / Casino** (sección 5b, nuevo): otro lugar aparte de las carnes asadas: *"el bar /
  casino donde puedes jugar y apostar fortunas contra otros personajes jugadores y NPC, socializar,
  buscar información de misiones, reunirse con informantes, o hasta convertirse en un campo de
  batalla (el sistema de combate con ciertos diálogos). Se puede jugar póker y bacará, tomar en la
  barra diferentes bebidas según el universo, cortejar, conseguir parejas, aliados o enemigos como
  en la carne asada."*
- **Multijugador** (sección 13b): *"1 campaña single player o multijugador; la multijugador no
  puede ser jugada sin los jugadores originales de la campaña, para mantener sus decisiones y
  opciones al corriente con los demás (como una campaña de D&D con amigos: para seguir jugándola
  tienen que estar todos)."*
- **El nombre de los hijos lo pone el jugador.**
- **Los compañeros con hoja envejecen y, si se separan del grupo por un tiempo, suben de nivel
  solos.**

Todavía no se ha construido nada. El siguiente paso es pasar las reglas acordadas a
`GAMEPLAY_DESIGN.md` y `MISSION_DESIGN.md` (en inglés) y empezar por el paso 1 de la sección 13
(`CampaignState` y el origen).

---

Este documento diseña la **capa de campaña**: todo lo que pasa con el personaje y el mundo
*entre* misiones y batallas. Hoy el juego tiene un creador, una misión y un motor de batalla; al
terminar la misión, al héroe solo le vuelven cicatrices y rasgos. Este documento añade el mundo
que recuerda: un origen de verdad, personas con memoria, amores, hijos que heredan y toman el
relevo, reputación que abre puertas, riqueza que sube y baja con las decisiones, una base que
crece, y un generador que arma campañas nuevas con todo eso.

Se diseña para **este juego (shinobi)** y a la vez como **motor**: la capa de campaña nunca dice
"chakra", "clan" ni "jutsu"; dice *don*, *facción*, *base*, *evento social*. Lo shinobi vive en un
pack de ambientación. El dueño quiere, con el mismo motor, un juego de aventureros espaciales con
mechas y nave, y uno de superhéroes. El combate táctico y los sprites siguen siendo de cada juego
(eso es arte, y el arte se produce, no se abstrae); la capa de campaña es la que se comparte.

---

## 0. Lo que el dueño ya decidió (2026-10-27)

Sus palabras: *"tiempo y tambien puede ser muerte y tambien algun evento paranormal puede
acelerar el crecimiento de estos / los npc pueden tener un rasgo explisito pero no te limita
completamente solo tienes que mantener la relacion en muy buen lugar con decisiones, status, y
riqueza / nacen nivel 1 y dones heredados y suben solos"*.

- **El relevo generacional** llega por **tiempo** (los años pasan y el hijo crece), por **muerte**
  del protagonista, y además **un evento paranormal puede acelerar el crecimiento** de un hijo.
- **Amores múltiples:** cada persona tiene un **rasgo explícito** de pareja (celosa, abierta,
  orgullosa…) que **no te limita del todo**: con cualquier rasgo se puede, pero hay que mantener
  esa relación **en muy buen lugar** con **decisiones, estado y riqueza**.
- **Los hijos nacen a nivel 1**, con **dones heredados**, y **suben solos**.

Y de la misma conversación, las ideas que dieron origen a este documento: campañas de cualquier
género con decisiones, escenas y opciones al estilo de un RPG de decisiones; el sistema social
como pieza central, con *carnes asadas* al estilo Monterrey donde se conoce gente y nacen
relaciones y amores que cambian la historia; hijos que absorben poderes y rasgos físicos de los
padres y se vuelven jugables (al estilo de las novelas de reencarnación y linaje); reputación que
da privilegios; dinero para propiedades (mansión, castillo; en el espacial, mejoras de la nave o
planetas) **sin que el dinero sea nunca un tema complejo**: todo se apoya en decisiones, dados y
suerte; varios amores si todo en tu vida va bien y se pierden con malas decisiones; y el dinero
inicial lo da el **origen**.

---

## 1. Motor y pack de ambientación

**Regla única:** `src/campaign/` (la capa de campaña, TypeScript puro como `src/rules` y
`src/battle`: sin React, sin imágenes, con el RNG sembrado) solo conoce el **vocabulario del
motor**. Cada juego aporta un **pack** que llena ese vocabulario con nombres, orígenes, facciones,
personas y plantillas de escenas con su sabor.

| Vocabulario del motor | Shinobi (este juego) | Espacial / mechas | Superhéroes |
|---|---|---|---|
| **Don** (heredable) | Naturaleza de chakra, ojos de clan | Afinidad de pilotaje, implante | Poder, mutación |
| **Facción** | Clan (Mirai, Kōton, Ryusei, Northstar), aldea | Flota, corporación, colonia | Gobierno, liga, banda |
| **Base** | Casa del clan → mansión → fortaleza | Nave → nave nodriza → estación | Piso → cuartel → torre |
| **Módulo de la base** | Salón, dojo, santuario, forja | Hangar, puente, jardín hidropónico | Sala de guerra, laboratorio, azotea |
| **Propiedad mayor** | Tierras, un puesto, una aldea | Un planeta, una ruta comercial | Una ciudad bajo tu protección |
| **Compañero de combate** | Montura, invocación | Mecha personal | Traje |
| **Evento social** (la carne asada) | Banquete del clan, festival de la aldea | Parrillada en el hangar | Azotea, gala |
| **Moneda narrativa** | Oro / ryō | Créditos | Fondos, patrocinio |
| **Tiempo** | Estaciones | Ciclos de la nave | Temporadas |
| **Evento paranormal** | Un espíritu, un sello antiguo | Anomalía temporal, nebulosa | Rayo cósmico, experimento |

Todo lo que el jugador lee sale del pack a través de `strings()` con `en` y `es`, como siempre.
Los tipos del motor usan ids (`factionId`, `giftId`, `moduleId`), nunca uniones escritas como
`'Mirai' | 'Koton'`. `ShinobiCharacter` se queda como está: la capa de campaña lo envuelve en una
**Persona** (sección 4) en vez de cambiarlo.

---

## 2. El estado del mundo: `CampaignState`

Una sola estructura, guardada en `localStorage` bajo `shinobi5e.campaign.v1` (al lado de
`hero`, `roster` y `mission`), escrita por todo lo demás. El `MissionRun` sigue existiendo para la
misión en curso; al terminar, su resultado se **aplica** al `CampaignState` en vez de perderse.

```ts
interface CampaignState {
  version: 1;
  seed: string;                 // la semilla de la campaña: con la misma semilla, el mismo mundo
  settingId: 'shinobi';         // el pack
  time: { year: number; season: 0 | 1 | 2 | 3 };    // primavera, verano, otoño, invierno
  protagonistId: PersonId;      // quién se juega ahora (cambia con el relevo generacional)
  people: Record<PersonId, Person>;                   // sección 4: el héroe, la familia, los PNJ
  factions: Record<FactionId, { reputation: number }>; // −10..+10 → 5 niveles (sección 7)
  fame: number;                 // 0..10, cuánto se habla de ti en el mundo
  wealth: 0 | 1 | 2 | 3 | 4 | 5 | 6;                 // sección 8
  base: { tier: number; modules: ModuleId[] };        // sección 9
  holdings: HoldingId[];        // propiedades mayores
  lineage: { unions: Union[]; children: PersonId[]; generation: number }; // sección 11
  marks: Record<string, boolean | number | string>;   // las marcas del guion (MISSION_DESIGN)
  chronicle: ChronicleEntry[];  // las decisiones, con quién votó qué y sus ecos
  arc: { index: number; beatsDone: BeatId[]; pending: Echo[] };           // sección 12
}
```

- **Las marcas y la Crónica ya están diseñadas** (`MISSION_DESIGN.md`, "The world remembers").
  Aquí solo se les da casa: viven en la campaña, no en la misión.
- **Determinista:** todo lo que el mundo decide por su cuenta (quién viene a la carne asada, qué
  don despierta el hijo, qué beat toca) se tira con `rngFor(seed, 'campaign', contador)`, como la
  batalla. Dos jugadores con la misma semilla y las mismas decisiones ven el mismo mundo.
- **Migración:** un héroe guardado sin campaña recibe una campaña nueva con un origen neutro
  ("Sin pasado": riqueza 2, reputación 0 con todos, sin familia) la primera vez que entra, igual
  que `migrateCharacter` hace con las hojas viejas.

---

## 3. El origen (un paso de verdad en el creador)

Hoy el paso "Origen" del creador solo ofrece *personalizado* o *copiar una leyenda*. Pasa a ser
una lista de **orígenes narrativos**, como la de un RPG de decisiones: cada uno fija el punto de
partida en el mundo. Las leyendas (Solen, Aiden, Lyra…) siguen ahí como presets, y cada una
trae su origen ya elegido.

```ts
interface Origin {
  id: OriginId;
  name: string; nameEs: string;
  wealth: 0..6;                       // riqueza inicial
  reputation: Partial<Record<FactionId, number>>;  // −10..+10 por facción
  fame: number;
  family: PersonSeed[];               // quién te espera en casa (padres, hermanos, un maestro)
  baseTier: number;                   // con qué base empiezas
  hook: BeatId;                       // el beat con el que arranca tu campaña
  traits: TraitId[];                  // rasgos de personalidad iniciales
  giftBias?: GiftId[];                // dones más probables en tu sangre (sección 11)
}
```

Seis orígenes de ejemplo para el pack shinobi (nombres provisionales):

| Origen | Riqueza | Reputación | Familia y base | Gancho |
|---|---|---|---|---|
| **Heredero del clan** | 5 | +4 con tu clan, −2 con su rival del ciclo | Padres vivos y poderosos; la casa principal del clan | Tu padre te manda a probarte: la primera misión es un examen |
| **Huérfano de la guerra** | 0 | 0 con todos, +2 con la aldea | Nadie; un cuarto en el barracón de genin | Alguien sabe quién mató a tus padres |
| **Hijo del mercader** | 4 | +2 con la aldea, −1 con tu clan (no eres "puro") | Padre mercader, hermana menor; una casa en el mercado | Tu padre debe dinero a quien no debía |
| **Renegado perdonado** | 1 | −4 con tu clan, +1 con los renegados | Un antiguo compañero que no te perdona; una cabaña fuera de la muralla | La aldea te vigila: una misión para demostrar lealtad |
| **Discípulo del ermitaño** | 2 | 0 con todos, +3 con el santuario | Tu maestro (viejo, enfermo); el santuario del bosque | Tu maestro te pide un último favor antes de morir |
| **Hijo de dos clanes** | 3 | +1 con ambos clanes, pero los dos desconfían | Madre de un clan, padre de otro, separados | Los dos clanes quieren que elijas; tu sangre lleva dos dones |

El origen **no toca las reglas de batalla** (ni atributos ni jutsu): toca el mundo. El "Hijo de
dos clanes" es el único que roza las reglas: tiene dos `giftBias`, que importa para sus hijos.

**Límite del dueño (2026-10-27)** sobre el Hijo de dos clanes: *"solo se puede hasta jugar una
campaña y tener hijos combinados con otro clan/raza"*. Lo leemos así (si no es esto, que lo
corrija): ese origen **no se elige en el creador**; la sangre mezclada **se consigue jugando**: en
una campaña, un protagonista de un clan tiene hijos con una pareja de otro clan o raza, y **esos
hijos** son los que llevan dos `giftBias`. Así la mezcla es un logro del linaje, no un punto de
partida. La fila de la tabla se queda como ejemplo de lo que un hijo mezclado tiene al tomar el
relevo (riqueza y reputación según lo que herede, sección 11), no como origen elegible. En el pack
espacial, "clan" es raza o planeta; en superhéroes, linaje de poder.

---

## 4. Las personas

Toda persona del mundo (el héroe, los compañeros, los PNJ, los hijos) es una **Persona**. Los
compañeros de misión (Hana, Kenji, las leyendas) siguen siendo `ShinobiCharacter` para la batalla;
la Persona los envuelve.

```ts
interface Person {
  id: PersonId;
  sheet?: ShinobiCharacter;     // solo quien puede luchar
  name: string; nameEs?: string;
  born: { year: number; season: number };
  alive: boolean; whereabouts: 'home' | 'away' | 'missing' | 'dead';
  factionId: FactionId;
  traits: TraitId[];            // 3 o 4 de personalidad: valiente, celosa, orgulloso, leal, ambicioso…
  values: ConvictionValue[];    // las convicciones ya existentes (MISSION_DESIGN, "Decisions")
  loveTrait?: 'jealous' | 'open' | 'proud' | 'devoted' | 'free';   // sección 6
  gifts: GiftId[];              // dones (naturaleza, ojos de clan…); los heredan los hijos
  looks: InheritedLooks;        // lo que se hereda del sprite (sección 11)
  parents?: [PersonId, PersonId];
  relation: Record<PersonId, Relation>;   // qué siente por cada otra persona
}

interface Relation {
  bond: number;      // Lazo, −10..+10: el que ya existe (la charla junto al fuego da +1)
  trust: number;     // confianza: ¿cumples lo que dices?
  respect: number;   // respeto: ¿eres fuerte, honorable, útil?
  affection: number; // afecto: ¿le gustas? Solo sube si la persona puede sentirlo por ti
  grudge: number;    // rencor, 0..10: no baja solo; se paga con decisiones
  memory: MemoryEntry[];   // "X lo recordará": la marca, la temporada y una frase
}
```

- **Lazo es la barra general** y la única que ya existe en el juego. Las otras cuatro se añaden
  para que los PNJ no sean "amigo / no amigo": se puede ser respetado y odiado a la vez.
- **Cómo cambian:** solo por decisiones (las opciones de una escena dicen qué barras tocan y en
  quién, como hoy dicen a qué valores apelan), por tiradas en eventos sociales, por el paso del
  tiempo (una temporada sin verte: −1 afecto si no es *devoted*) y por lo que haces en el mundo
  (una persona *ambiciosa* sube respeto cuando sube tu riqueza; una *leal a la aldea* baja
  confianza si tu reputación con la aldea cae).
- **Memoria.** Cada "X lo recordará" guarda `{ mark, season, line }` en la relación. Las
  plantillas de escena (sección 12) las leen: si una persona guarda la marca
  `dejaste_morir_a_mi_hermano`, el generador puede sacarla en la siguiente carne asada.
- **Umbrales** que las escenas usan como condiciones: `bond ≥ 3` amigo, `≥ 6` íntimo,
  `affection ≥ 5` cortejable, `grudge ≥ 6` enemigo, `trust ≤ −3` no te cree aunque digas verdad.

---

## 5. El evento social: la carne asada

El evento hub del motor. En el pack shinobi es el **banquete del clan** o el **festival de la
aldea**; en el espacial, la **parrillada en el hangar**; en superhéroes, la **azotea**. El motor
lo trata igual. Es la escena donde las relaciones avanzan, se cruzan amores, se desatan celos y se
cierran alianzas. El **campamento** actual (fuego, cena, charla junto al fuego) es su versión
pequeña en mitad de una misión; esta es la grande, en casa, entre misiones.

**Cuándo hay una:** al volver de misión si la base tiene el módulo *Salón* (sección 9), cuando
una facción te invita (reputación ≥ Amigo), en una fecha del año (el festival de verano), o
cuando un beat la pide (una boda, un funeral, un nacimiento).

**Quién viene:** el generador invita por reglas: la familia; cada persona con `bond ≥ 3`; un
representante de cada facción con reputación ≥ Neutral; **1 o 2 personas nuevas** (semilla del
pack, elegidas por tu fama y tu riqueza: a riqueza 5 vienen herederos, a riqueza 1 vienen
genin y cazadores); y, si `grudge ≥ 6` con alguien de una facción invitada, **ese alguien se
cuela**. Con la base pequeña caben 6 invitados; cada módulo *Salón* añade 4.

**Cómo se juega** (con el sistema de escenas de `MISSION_DESIGN.md`, "Cinematics and dialogue",
y la escena de presión de "Countdown scenes"):

1. **Llegada.** Una cinemática corta: el patio, el fuego, los invitados en sus marcas. La cámara
   pasa por los que traen algo (un `!` sobre quien tiene un beat pendiente contigo).
2. **Rondas.** La noche tiene **4 rondas** (la escena de presión, con *turnos* y sin medidor de
   fallo). En cada ronda te acercas a una persona o a un grupo. Mirar y preguntar es gratis;
   acercarte cuesta la ronda. Cada acercamiento abre **2 a 4 cartas** (como cualquier decisión):
   brindar, preguntar por su familia, hablar de la misión, pedir un favor, cortejar, provocar,
   presentar a dos personas. Las cartas bloqueadas salen en gris con el motivo ("Necesita Lazo 3").
3. **Tiradas.** Las cartas con riesgo tiran d20 + atributo (CAR para cortejar y persuadir, SAB
   para leer a alguien, INT para una historia, FUE para el reto de fuerza que alguien propone)
   contra una CD que sube con el rasgo de la persona y baja con el Lazo. Natural 20 y 1 valen lo
   de siempre (la regla c3 del dueño). El % se ve antes de tirar.
4. **Eventos cruzados.** Entre rondas, el mundo se mueve solo: dos invitados discuten (elige
   bando o no te metas), tu pareja ve que cortejas a otra (sección 6), alguien se emborracha y
   dice una verdad (una marca sale a la luz), llega una noticia (un beat de la campaña empieza
   aquí), un rival te reta. Son plantillas del pack con condiciones sobre el estado.
5. **Cierre.** La madrugada: un resumen con los "X lo recordará", lo que subió y bajó, y quién se
   quedó a dormir (sección 6).

**Lo que da:** relaciones, aliados para la siguiente misión (una persona con `bond ≥ 6` y hoja
de personaje se puede invitar a la misión), favores (una facción que te debe una), información
(marcas que desbloquean cartas en misiones), y el **lugar donde empieza casi todo lo social**.

**Cómo se interactúa: como en Los Sims** (el dueño, 2026-10-27: *"el sistema de socializar,
cortejar y cómo te comportas es como el juego Sims 4"*). Las rondas se quedan como presupuesto de
tiempo de la noche, pero **dentro de una ronda** acercarse a alguien abre un **menú por
categorías** en vez de 2–4 cartas fijas:

| Categoría | Interacciones (ejemplos del motor; el pack las nombra) | Toca |
|---|---|---|
| **Amistoso** | charlar, preguntar por su familia, brindar, contar la misión, dar un regalo | Lazo, confianza |
| **Romántico** | halagar, coquetear, bailar, regalar algo íntimo, besar, proponer | afecto (solo si está desbloqueado), y la pareja presente lo ve |
| **Gracioso** | broma, imitación, anécdota | Lazo, y respeto si sale bien; rencor si es a su costa |
| **Serio / Negocios** | pedir un favor, ofrecer alianza, hablar de la facción, pedir información | respeto, confianza; marcas |
| **Malicioso** | provocar, insultar, amenazar, humillar delante de todos | rencor, respeto (en los que admiran la fuerza), miedo |
| **Jugar** | retar a fuerza, a dados, a una mano de cartas | respeto, fama |

- Cada interacción tiene **un requisito** (Lazo o afecto mínimo, Estatus, una marca, estar a
  solas o no), **una tirada** cuando hay riesgo (CAR, SAB, INT, FUE; la CD por rasgo de la
  persona, como ya está escrito) y **un resultado visible al momento**: el globo de emoción
  (`MISSION_DESIGN.md`, emotes: corazón, nube gris, !, ?, vena de enfado) y un aviso corto
  ("+2 afecto", "Kaen lo recordará"). Las categorías se **desbloquean** con la relación: a
  Lazo 0 solo hay Amistoso y Serio; Romántico aparece con afecto ≥ 3; las interacciones fuertes
  (besar, proponer, humillar) piden más.
- **Las personas tienen humor** esa noche (contento, aburrido, enfadado, triste, borracho; por lo
  que les pasó en la campaña, por las bebidas y por lo que hiciste hace un rato) y el humor cambia
  las CD y abre o cierra interacciones (nadie coquetea triste; un borracho acepta un reto). El
  humor se ve en el retrato y en la pose del sprite.
- **Las personas actúan solas** entre rondas (la **autonomía** de los Sims): se buscan, se
  cortejan entre ellas, discuten, se sientan a jugar, se van. Son los eventos cruzados de arriba,
  pero visibles en el patio: ves a tu pareja hablar con el rival y decides si te metes.
- **Tu comportamiento se nota**: cada interacción escribe también en tu **reputación de
  carácter** (marcas acumuladas: generoso, cruel, mujeriego, serio), que la gente nueva ya conoce
  al llegar (a Estatus alto, lo sabe todo el mundo) y que decide qué categorías te abren a ti
  ("con fama de cruel, nadie te deja usar Gracioso a la primera").
- El **casino** usa el mismo menú con sus categorías propias (Jugar, Apostar, Informantes).

---

## 5b. El Salón / Casino (el dueño, 2026-10-27)

El segundo hub social, **público** donde la carne asada es **tuya**: el bar y casino de la
ciudad (shinobi: la casa de té y apuestas del barrio del placer; espacial: la cantina del puerto
estelar; superhéroes: el club nocturno). Se entra desde *Casa* en cualquier estación, cuesta la
mitad de una estación (puedes ir y además hacer otra cosa) y no hace falta invitación ni salón.

**Quién está:** gente que no vendría a tu carne asada: desconocidos de cualquier facción (hasta
Frío; los Hostiles mandan a alguien a vigilarte), informantes, jugadores profesionales, un
rival o dos, y **otros jugadores** en multijugador. La clientela sube con tu Estatus (6b): a
Estatus 6+ hay fans en la barra; a 9+ el dueño del local te reserva mesa.

**Qué se hace** (misma escena de rondas que la carne asada, sección 5, con **3 rondas** por
visita y estas cartas en vez de las de casa):

- **La barra.** Pedir una bebida del universo (el pack las nombra: sake caliente, licor de
  cometa, un cóctel de la casa). Cada bebida es un efecto corto: *Coraje* (+2 a cortejo y
  persuasión esta visita, −2 a SAB), *Lengua suelta* (desbloquea una carta de información, pero
  una marca tuya se puede escapar), *Calma* (−1 Tensión). Tres bebidas: *Ebrio* (todas las
  tiradas con desventaja hasta la siguiente estación, y la siguiente escena puede ser una pelea).
- **Las mesas: póker y bacará.** Juegos de verdad con cartas tiradas por el RNG sembrado, no
  tiradas de d20 disfrazadas. Se apuesta en **fichas** que valen fracciones de tu nivel de riqueza
  (sección 8): la mesa baja mueve un cuarto de nivel por mano, la alta un nivel entero, y la
  **mesa de fortunas** (solo con riqueza ≥ 4 y Estatus ≥ 5) juega propiedades y módulos de la base
  contra otros jugadores y PNJ. Contra un PNJ, su estilo es su rasgo (un *orgulloso* no se
  retira; una *ambiciosa* sube la apuesta). Hacer trampa es una carta con prueba (DES o
  Engaño): sale, y ganas; falla, y la escena puede volverse batalla. **Ganar o perder en las
  mesas pesa en las tiradas sociales del casino** (el dueño, W13a): ganar una mano da +1 a
  cortejo, persuasión e intimidación hasta salir del local (+2 si ganas la mesa de fortunas);
  perder, −1; y la gente lo comenta ("el que desplumó al capitán anoche").

  **El bacará se juega exactamente como el bacará** (el dueño: *"estudia las reglas"*; estas son
  las de punto banca, la variante de casino):
  - Seis u ocho barajas, las figuras y los dieces valen 0, el as 1, el resto su número; una mano
    vale la **última cifra** de la suma (7 + 8 = 15 → 5).
  - Antes de repartir, cada apostante elige **Jugador**, **Banca** o **Empate**. El dueño: *"puedes
    poner jugador o banquero; los demás personajes pueden ganar o perder dependiendo de qué
    elijan: si son jugadores, eligen ellos; si son NPC, eligen solos"* (su rasgo decide: los
    *prudentes* van a Banca, los *ambiciosos* al Empate de vez en cuando, los *orgullosos* siempre
    contra lo que tú elegiste).
  - Dos cartas a Jugador y dos a Banca. Un **8 o 9 natural** en cualquiera de las dos manos
    termina la jugada.
  - Si no hay natural: el **Jugador** pide tercera carta con 0–5 y se planta con 6–7. La **Banca**
    sigue la tabla: si el Jugador se plantó, la Banca pide con 0–5 y se planta con 6–7; si el
    Jugador pidió, la Banca pide con 0–2 siempre; con 3 salvo que la tercera del Jugador fuera 8;
    con 4 si fue 2–7; con 5 si fue 4–7; con 6 si fue 6–7; con 7 se planta.
  - Gana la mano más alta. **Jugador paga 1:1; Banca 1:1 menos el 5 % de comisión** (en fichas: la
    comisión redondea hacia abajo, nunca te deja a cero); **Empate paga 8:1**, y si hay empate las
    apuestas a Jugador y Banca se devuelven.
  - Las cartas salen del RNG sembrado; la Crónica guarda las manos grandes.
  Para el **póker** se usa el de cinco cartas con descarte (una ronda de apuestas, un descarte de
  hasta tres, otra ronda): las reglas estándar, los PNJ con un estilo por rasgo (farol, pasivo,
  agresivo) y con una prueba de SAB puedes **leer** el farol de un PNJ una vez por mano.
- **Información y misiones.** Informantes con precio (una bebida, fichas, un favor, Lazo): dan
  marcas que abren cartas de misión (la ruta del pasadizo, quién vendió tu ruta), y el **tablón**
  del local ofrece misiones secundarias que el generador saca de los beats de mundo.
- **Lo social.** Cortejar, conseguir parejas, aliados o enemigos **igual que en la carne asada**:
  las mismas barras, los mismos umbrales. Las parejas conocidas aquí empiezan con *Lazo* 0 y
  *afecto* según el Estatus; las de casa, con lo que ya tenías.
- **La pelea.** Un reto, una trampa descubierta, un Hostil que te reconoce o una decisión de
  historia convierten la escena en **batalla** en el mapa del casino (mesas como cobertura,
  barra, escaleras a un segundo nivel, lámparas que caen): el sistema de combate de siempre con
  diálogos entre turnos (`dice` dentro de `batalla`). Lo que pase en la pelea escribe en el
  mundo: un local destrozado es riqueza −1 y reputación −2 con la facción dueña; ganarla delante
  de todos es fama +1.

**En multijugador** (13b), el casino es donde los jugadores de una campaña se enfrentan entre sí
sin romper el grupo: apuestas de fortunas, un duelo amistoso, un cortejo que se cruza.

**La mesa en primer plano** (el dueño, 2026-10-27: *"cuando juegues bacará o póker se vea en una
escena con más zoom y más detalle al sprite"*). Sentarse a una mesa abre **una escena propia**:
la cámara se acerca a la mesa (el 2× de las batallas, y 4× en los primeros planos de cartas), con
la mesa dibujada **a doble resolución** para ese plano (la misma lámina del generador convertida a
factor 2 en vez de 4: sin dibujar nada nuevo, el detalle que a escala normal se pierde aquí se
ve), los **retratos** de los jugadores sentados (los de diálogo, ×4) alrededor con su pila de
fichas y su gesto (tranquilo, nervioso, farol), las cartas y fichas como piezas de interfaz
grandes, y la barra del casino al fondo desenfocada por paleta. Las acciones (apostar, pedir,
plantarse, cambiar cartas, leer el farol, hacer trampa) son cartas de decisión como las demás,
con su tirada cuando la hay. Al levantarse, la cámara vuelve al salón y lo ganado o perdido se
ve en la Crónica y en las caras.

Nuevas preguntas para el dueño, al final (W13–W15).

---

## 6. El amor

**Etapas:** conocido → amistad (`bond ≥ 3`) → cortejo (`affection ≥ 5` y una carta de cortejo que
sale) → pareja → compromiso / unión (sección 11) → y, si todo va mal, ruptura o traición. Cada
etapa es una marca en la relación; cada subida pide una decisión o una tirada, nunca solo tiempo.

**El rasgo de pareja** (decidido: explícito, pero no limita del todo). Cada persona tiene uno:

| Rasgo | Qué cambia |
|---|---|
| **Celosa/o** | Cada otra pareja tuya le cuesta −2 afecto por temporada; sorprenderte cortejando: −4 y rencor +2 |
| **Orgullosa/o** | Exige riqueza ≥ la suya y reputación ≥ Amigo con su facción; si caes, afecto −2 por temporada |
| **Entregada/o** | No baja afecto por distancia; pero una traición es definitiva (rencor 10) |
| **Abierta/o** | Otras parejas no le restan; le resta que le mientas (confianza) |
| **Libre** | No quiere unión; si la pides, −3; sigue contigo mientras la relación sea buena |

**Varias parejas a la vez.** No hay un número máximo. Cada pareja **adicional** exige, al
empezarla y en cada cambio de temporada, que **todas** tus relaciones de pareja estén "en muy
buen lugar" y tu vida también:

```
estabilidad = riqueza (0..6)
            + nivel medio de reputación con las facciones de tus parejas (0..4)
            + afecto medio de tus parejas / 2 (0..5)
            − parejas adicionales × 2
            − (Tensión ≥ 6 ? 2 : 0) − (cicatriz grave reciente ? 1 : 0)
```

Si `estabilidad ≥ 8`, todo se sostiene. Entre 5 y 7, cada temporada una pareja al azar (la de
rasgo más duro primero) tira una **prueba de paciencia**: d20 + tu CAR contra CD 10 + 2 por
pareja adicional; fallar es −3 afecto y un beat de reproche en la siguiente carne asada. Por
debajo de 5, la prueba es cada temporada para todas y la CD sube a 15. Así se cumple lo
decidido: con cualquier rasgo se puede, mantenerlo depende de decisiones (cómo tratas a cada
una), estado (Tensión, heridas, reputación) y riqueza.

**Aprobado (W4a) con el añadido del dueño:** el **Estatus** (6b) entra en las dos partes. En el
cortejo, cada tirada tiene **+Estatus/2** (redondeado abajo) y, a Estatus ≥ 7, **ventaja**. En la
permisividad, la fórmula de estabilidad suma **+Estatus/2**, y la prueba de paciencia de una
pareja tiene su CD **−Estatus/2**: a la pareja del capitán millonario que le ha salvado la vida
diez veces no le cuesta lo mismo aceptar que al huérfano de la aldea. Y la propia pareja lo
**dice** en escena: a Estatus alto, el reproche se vuelve orgullo ("todas saben quién eres; yo
soy la que vuelve a casa contigo").

**W4a+, el coste de cada pareja más:** empezar una **pareja adicional** (la segunda en adelante)
**baja la riqueza un nivel** en ese momento: la casa que le pones, los regalos, lo que cuesta
sostener dos vidas. No baja si la relación es **de una noche**. Una relación amorosa **se vuelve de
una noche** cuando dejas de interactuar con esa persona (ninguna carta con ella en dos estaciones
seguidas): deja de contar como pareja (ni estabilidad, ni paciencia, ni coste), su afecto se
congela donde estaba y queda la marca `una_noche_con_X`; si más adelante la retomas, vuelve a ser
pareja (y entonces sí cuesta el nivel). Un hijo de una noche es posible (11): la persona vuelve con
él en un beat de familia, y ahí decides.

---

## 6b. El Estatus (el dueño, 2026-10-27)

Un **rasgo del protagonista de 1 a 10** que resume cuánto pesas en el mundo. Se **recalcula al
cambiar de estación** a partir de lo que ya existe, así que no es una barra más que subir: es el
reflejo de todo lo demás.

| Estatus | Nombre | De dónde sale (orientativo) |
|---|---|---|
| 1 | Don nadie | Riqueza 0–1, fama 0, sin títulos |
| 2 | Conocido en el barrio | Fama 1–2 |
| 3 | Con nombre | Fama 3 o riqueza 3 |
| 4 | Respetado | Una facción Amigo y una hazaña |
| 5 | Figura | Riqueza 4 o un título de Aliado |
| 6 | Celebridad | Fama 6 y tres hazañas: aparecen **fans** |
| 7 | Poder local | Una propiedad mayor y una facción Aliado |
| 8 | Leyenda viva | Fama 8, dos facciones Aliado |
| 9 | Señor de la región | Riqueza 6 o tres facciones Aliado |
| 10 | Líder del mundo | Todo lo anterior y una marca de historia (el final de un acto lo da) |

```
estatus = clamp(1, 10, 1 + fama/2 + riqueza/2 + nº de facciones Aliado + hazañas/3 + títulos)
```

- **Hazañas** son marcas que las escenas escriben: *salvó la vida de la tripulación*, *venció al
  rival delante del clan*, *ganó la mesa de fortunas*. El pack las nombra; el motor las cuenta. Es
  la idea del dueño: los **méritos increíbles** son lo que te da permiso.
- **Dónde se ve:** en la ficha de *Casa* con su nombre y sello; en cómo te hablan (el guion tiene
  variantes por tramo de Estatus: el posadero te tutea o se inclina); en quién viene a la carne
  asada y al casino; en los precios (Estatus ≥ 7 baja un nivel el precio de compra como si fueras
  Aliado); y **en las parejas** (6).
- **Fans** (Estatus ≥ 6): personas sin hoja que el generador saca **"en muchos lados"**, como pide
  el dueño: en la barra del casino, en la carne asada como desconocidos, en una misión (un genin
  que te pide consejo, un piloto que te copia la pintura del mecha), en la calle al volver.
  Dan fama, cartas gratis (un fan paga la ronda, otro te da una pista) y problemas (un fan
  celoso de tu pareja, uno que se mete en la pelea). A Estatus 10 hay beats propios: una facción
  te pide que decidas por ella; alguien quiere tu puesto.
- **Baja** igual que sube: una ruina, una traición pública, una misión fallida con testigos
  (−1 fama cada una) lo arrastran a la estación siguiente. El Estatus **no se hereda** entero: el
  hijo recibe la mitad por la vía de fama y reputación (11).

**Las escenas de hazaña** (el dueño, 2026-10-27: *"necesitamos escenas donde se consiga la
felicitación de una hazaña: te felicita el presidente, una ciudad completa, los noticieros, la
federación espacial, te ascienden a comandante en el ejército; solo en mechas y superhéroes, no en
ninjas"*). Cuando una hazaña sube el Estatus de tramo, el generador mete **un beat de
felicitación** antes de la siguiente estación, y el pack decide quién felicita por tramo:

| Tramo | Espacial (mechas) | Superhéroes | Shinobi |
|---|---|---|---|
| 4 Respetado | La tripulación brinda en el hangar | El barrio te hace una pancarta | *(sin escena: el clan no felicita; a lo sumo una línea del maestro)* |
| 6 Celebridad | **Los noticieros** de la colonia | **Los noticieros** de la ciudad | — |
| 7 Poder local | **Ascenso a comandante** en la flota | **Una ciudad completa** en la plaza | — |
| 8 Leyenda viva | **La federación espacial** en sesión | El alcalde y la liga | — |
| 10 Líder del mundo | El consejo de los planetas | **El presidente** | — |

Son cinemáticas cortas (el escenario de `MISSION_DESIGN.md`: marcas, cámara, una pintura fija en la
del presidente y la de la federación), con una decisión al final que escribe marcas (aceptar el
ascenso o rechazarlo; dedicar la hazaña a alguien: +3 afecto; o presumir: +1 fama, −1 respeto
con los *leales*). El ascenso da un **título** (6b) y acceso a misiones del ejército. En shinobi no
hay felicitación pública por decisión del dueño: el reconocimiento ninja es callado (el título de
Aliado, un asiento en el banquete, una línea del anciano del clan).

**Perderlo.** Afecto ≤ 0 es ruptura; rencor ≥ 8 además es traición: la persona se va con la
facción rival, se lleva una marca, y puede volver como enemiga (como Kaen en el anexo del
dueño). Una ruptura con hijos no te quita a los hijos, pero sí la custodia de dónde crecen
(sección 11).

**Con quién.** Cualquier Persona adulta con `affection` desbloqueado para ti. El pack decide
quién puede sentir afecto por quién; el motor no.

---

## 7. La reputación

Se queda lo diseñado: **reputación por facción en 5 niveles** (Hostil, Frío, Neutral, Amigo,
Aliado) sobre una marca numérica. Aquí se fija el número (−10..+10, los niveles en −10..−6, −5..−2,
−1..+1, +2..+5, +6..+10) y se añade la **fama** (0..10, cuánto se habla de ti, suba o baje la
reputación). Las decisiones de misión suben y bajan reputación como ya está diseñado (D1: Uddo +2).

**Lo que abre cada nivel** (el pack pone los nombres; el motor, la regla):

| Nivel | Privilegios |
|---|---|
| Hostil | Te atacan en su territorio; sus personas no vienen a tu carne asada; sus misiones están cerradas |
| Frío | Precios peores (una compra de riqueza cuesta un nivel más); sus cartas de persuasión tienen CD +5 |
| Neutral | Lo normal |
| Amigo | Te invitan a sus eventos; un compañero suyo se puede unir a tus misiones; una propiedad suya se puede comprar |
| Aliado | Un **título** (su nombre lo pone el pack: "Protector del clan", "Capitán de la flota"); refuerzos en sus misiones; sus secretos (dones, jutsu, módulos de base) se desbloquean; sus hijos pueden unirse a los tuyos |

La **fama** abre otra cosa: a fama ≥ 5 vienen desconocidos a tu carne asada por tu nombre; a
fama ≥ 8 las facciones te buscan (beats de oferta) y los enemigos también (beats de caza).

---

## 8. La riqueza, sin contabilidad

**Decidido en espíritu por el dueño:** el dinero nunca es un tema complejo. Así que **no hay
monedas**. Hay **7 niveles de riqueza**:

| Nivel | Nombre (shinobi) | Qué puedes |
|---|---|---|
| 0 | Arruinado | Comes lo que cazas; la base es un cuarto prestado |
| 1 | Pobre | Lo básico; suministros de misión a medias |
| 2 | Modesto | Suministros completos |
| 3 | Acomodado | Un módulo de base pequeño por temporada |
| 4 | Rico | Un módulo grande; una propiedad menor |
| 5 | Magnate | Una propiedad mayor; la base sube de nivel |
| 6 | Leyenda | Todo; las facciones te piden dinero a ti |

- **El origen fija el nivel inicial** (sección 3).
- **Sube y baja por decisiones y dados:** una misión de rango alto completada sube +1 con
  probabilidad (d20 ≥ 12, y +1 seguro si eliges la paga en vez de la reputación cuando la escena
  lo ofrece); una propiedad mayor da +1 fijo cada año; una decisión puede costar niveles (pagar
  un rescate: −2; un incendio en tu base: −1); un beat de **golpe de suerte** o **ruina** tira un
  d20 al cambiar de año (1: −1; 20: +1).
- **Comprar es una prueba, no una resta.** Cada compra tiene un **nivel de precio**. Si tu
  riqueza ≥ precio, compras sin bajar. Si es un nivel menor, puedes **estirarte**: compras y
  bajas un nivel. Dos niveles menos: no puedes. Un módulo pequeño es precio 3, uno grande 4, una
  propiedad mayor 5, subir la base de nivel 5. La reputación Frío sube el precio un nivel; Aliado
  lo baja uno.
- **Nunca se ve un precio, pero sí una cifra de fortuna (W5a+).** El dueño: *"que te dé cifras
  aleatorias con los 000 correspondientes dependiendo de la riqueza, para representar una dimensión
  de riqueza al jugador, pero sin ponerle precio a nada"*. En la ficha de *Casa*, junto al sello
  del nivel, una **fortuna estimada** en la moneda del pack, sorteada con el RNG sembrado dentro de
  la banda del nivel y redondeada a ceros: nivel 0 → 0–900; 1 → 2 000–9 000; 2 → 20 000–90 000;
  3 → 200 000–900 000; 4 → 2–9 millones; 5 → 20–90 millones; 6 → 200–900 millones. Cambia un poco
  cada estación (±10 % dentro de la banda) para que respire, salta de banda al cambiar de nivel, y
  **nada en el juego tiene precio en esa moneda**: las compras siguen siendo niveles. En la
  Crónica, "tu fortuna creció a unos 3 millones de ryō".

---

## 9. La base

Una base por campaña, con **nivel** (1 a 4) y **módulos**. El pack pone los nombres; el motor
sabe qué abre cada módulo. **Y se personaliza como un personaje** (9b): el juego no se mete en
construcción, pero la base tiene creador propio.

| Módulo (motor) | Shinobi | Qué abre |
|---|---|---|
| Salón | Salón del clan | Una carne asada al volver de cada misión; +4 invitados por salón |
| Entrenamiento | Dojo | Los hijos suben más rápido; una actividad de campamento extra en casa |
| Santuario | Santuario | −Tensión al volver; aquí ocurren los eventos paranormales |
| Taller | Forja | Materiales de misión; un objeto único por temporada |
| Jardín | Jardín del estanque | +1 afecto por temporada a quien vive contigo |
| Cuarto de invitados | Ala de invitados | Una persona más puede vivir contigo (parejas, hijos, un maestro) |
| Guardia | Muralla | Los beats de ataque a tu base se resuelven con ventaja |
| Vehículo | Establo (montura) | *Shinobi: sin uso de momento.* Espacial: hangar, un mecha más |

Nivel 1: 2 módulos; nivel 2: 4; nivel 3: 6; nivel 4: todos y una **propiedad mayor** gratis.
Subir de nivel es precio 5 y pide reputación ≥ Amigo con la facción dueña del suelo.

**Propiedades mayores** (`holdings`): un puesto comercial, unas tierras, una aldea bajo tu
protección (shinobi); un planeta, una ruta (espacial). Dan +1 riqueza al año, un beat propio por
año (una cosecha, un ataque, una petición de sus habitantes) y reputación con quien vive allí.

---

## 9b. El creador de la base (el dueño, 2026-10-27)

Sus palabras: *"no quiero que se meta mucho en construcción el juego, pero que tengas diferentes
opciones para materiales de la casa, colores, estilo y locación"*, *"todo esto personalizable como
tipo el creador de personaje, para hacerlo más simple, que solo se adapte al estilo del jugador"*.

Así que la base **no se construye: se elige**, con una pantalla como el creador de personaje
(lista a la izquierda, vista previa a la derecha, cada opción un sello). Lo elegido se guarda en
`base.look` y la escena de la carne asada, el casino propio y la pantalla *Casa* se componen de
ello por capas, como los sprites de los personajes. Lo que abre cada opción depende de la
**riqueza** (8) y del **nivel** de la base; el resto es gusto.

**Las opciones del motor** (el pack pone nombres y arte; el nivel de riqueza mínimo entre
paréntesis):

| Grupo | Opciones (motor) | Shinobi | Superhéroes | Ejemplos del dueño |
|---|---|---|---|---|
| **Locación** | bosque con ríos y montañas (0), ciudad en altura (3), costa de lujo (4), finca tradicional en lugar privilegiado (3), estudio pobre (0) | claro del bosque, barrio alto de la aldea, acantilado del mar, casa principal del clan, cuarto en el barracón | bosque, **el penthouse más alto de Nueva York**, **mansión multimillonaria playboy en Los Cabos (el Arco al fondo)**, mansión tradicional, estudio pequeño | sus cinco |
| **Estilo** | simplista, elegante, lujo extremo | | | *"elegante, simplista, extremo lujo en el patio"* |
| **Paredes** | regulares (0), troncos de madera (1), piedra (2), metal (2), mármol (4), granito (4) | troncos, piedra, metal | regulares, mármol, granito | *"paredes regulares o de piedra como mármol y granito; de troncos, de metal (fantasía, ninja)"* |
| **Techo** | teja/lámina (0), madera (1), pizarra (2), **cobre** (4), **oro** (6) | | | *"lámina de cobre o de oro (riqueza máxima)"* |
| **Colores** | 3 ranuras (muros, techo, detalles), como las ranuras de color de los ítems | | | |
| **Patio de la carne asada** | mesas (0), asador (0), **alberca** (3), **área para bailar** (3), jardín (2), pérgola (3) | mesas bajas, brasero, estanque, tarima | mesas, asador, alberca infinita, pista | *"las mesas, el asador, si tiene alberca o área para bailar"* |
| **Juguetes** | ninguno (0), montura/vehículo (3), **carros deportivos** (4), **helicóptero** (5), **yate** (5) | caballos, carruaje, barco | deportivos, helicóptero, yate | *"en tu base millonaria playboy eliges entre carros deportivos, helicóptero o yate"* |
| **Seguridad** | ninguna (0), normal (2), **exuberante** (4) | ninguna, guardias del clan, escolta armada | ninguna, guardias, **guarruras estilo narco** | *"no existente, normal, exuberante guarruras estilo narcotraficante"* |

Cada grupo es una capa del sprite de la escena (sección 9c), como un ítem del personaje: una
locación es el fondo, las paredes y el techo son la casa, el patio son props, los juguetes son
props grandes a un lado, la seguridad son personas sin hoja en sus marcas.

**La seguridad juega** (el dueño): los guardias **están en la carne asada y en el salón** según tu
estilo, y **afectan las tiradas sociales**: *normal* da +1 a intimidar y persuadir a desconocidos
y −1 a cortejar (nadie se acerca igual con un guardia detrás); *exuberante* da +2 a intimidar, −2
a cortejar a personas de rasgo *libre* o *abierto* (+1 a las *orgullosas*), y **controla a los
fans** (6b): con seguridad normal los fans molestan la mitad de rondas; con exuberante, solo
llegan los que tú dejas pasar (una carta "déjalo pasar" por ronda). Sin seguridad, a Estatus ≥ 6,
un fan te roba una ronda entera cada carne asada. Y la seguridad exuberante **tiene un precio en
reputación**: −1 por estación con la facción de la ley del pack (la aldea; la policía; la
federación) salvo que seas Aliado suyo.

**Qué se asa** (el dueño: *"la opción de decidir qué asar: ribeye, corte de alienígena de lujo,
venado, dependiendo de universo y riqueza"*): al abrir la carne asada eliges el menú de una lista
del pack con nivel de riqueza mínimo; es una carta más de la escena. Un menú por encima de lo que
tus invitados esperan da +1 afecto a todos los presentes esa noche; uno por debajo de tu Estatus,
−1 respeto ("¿esto es lo que sirve el señor de la región?"). Shinobi: pescado del río (0), jabalí
(1), venado (2), buey del valle (4), el pez del emperador (6). Superhéroes: salchichas (0),
arrachera (1), ribeye (3), wagyu (5). Espacial: ración de la nave (0), carne sintética (1), venado
de colonia (2), **corte alienígena de lujo** (5).

**La nave espacial** (pack de mechas; el dueño: *"mucha más personalización, porque sería solo tu
nave y después tu base, pero seguirías usando la nave"*). La nave es la base del pack espacial
**y además un vehículo**, así que tiene dos creadores:

- **Por fuera**, como un personaje: casco (tipo: corbeta, fragata, crucero, **nave insignia**; cada
  uno un tamaño), **colores** (3 ranuras), **armamento** (torretas, cañón de proa, misiles; cada
  pieza un ítem con ranura), **escudo** (tipo y color del brillo), alas y motores. Es el sprite que
  se ve en el espacio y en el fondo de la parrillada del hangar.
- **Por dentro**, como la base: **el tamaño del casco fija los módulos** (corbeta 3, fragata 5,
  crucero 8, insignia 12). Módulos propios del pack: **área social** (el hangar de las carnes
  asadas: el Salón del motor), **área de entrenamiento**, puente, camarotes (**cuartos más grandes**
  suben el afecto de quien vive a bordo), hangar de mechas (uno por mecha), enfermería, **prisión**
  (los enemigos capturados en misión, con sus beats), **bodega de objetos cósmicos** (los objetos
  únicos de misión se guardan aquí y dan beats paranormales), jardín hidropónico, cantina (el
  casino a bordo, 5b).
- **Mejorar la nave** es subir de casco (precio 5, como subir la base) y conserva los módulos; la
  anterior pasa a ser **nave de combate** de la flota. Desde crucero puedes tener **naves de
  combate más pequeñas** y **tu mecha con mejoras para combate espacial** (un ítem del mecha, como
  el armamento de la nave). Cuando compras una base en un planeta (propiedad mayor), la nave sigue
  siendo tuya: la base en tierra usa el creador de la base de arriba, y la nave se queda aparcada
  al lado en la escena.

**Dónde se profundiza**: el dueño lo fijó: *"donde más nos adentraremos en la personalización de
la base será en el de mechas, y de ahí agarra el sistema el de superhéroes para tener también
naves terrenales y espaciales, considerando que la del espacio sería más customizable, como la de
mechas"*. En shinobi, la base tiene el creador de la tabla y nada más; en superhéroes, lo mismo
más los juguetes y, cuando llegue, el creador de nave del pack espacial para sus naves.

---

## 9c. La escena de la base, por capas

Para que las combinaciones no exploten (5 locaciones × 3 estilos × 6 paredes × 5 techos × … ×
3 universos), la escena **no se pinta entera por combinación**: se compone en el juego, como un
sprite de personaje, de capas que se dibujan una vez cada una:

```
fondo (locación × hora)          ← 1 pintura por locación y universo; día/tarde/noche por paleta
casa (nivel × paredes × techo)   ← la silueta por nivel; paredes y techo son materiales (textura + rampa)
patio (props sueltos)            ← mesas, asador, alberca, pista, pérgola: un sprite por prop y estilo
juguetes (props grandes)         ← deportivos, helicóptero, yate, caballos: un sprite cada uno
gente (los invitados, la seguridad) ← los sprites de personaje de siempre, en sus marcas
primer plano (follaje, barandal) ← 1 por locación
```

Los **materiales** son rampas de color con una textura (como `scene_kit.py` ya hace con sus
`Mat`): mármol, granito, troncos, metal, cobre y oro son seis rampas sobre la misma silueta, no
seis dibujos. Los **colores** son `retintHex` sobre la rampa, como en los ítems. El plan de arte
(`docs/scene-art-plan.md`) cuenta exactamente cuántas piezas son y en qué orden se hacen.

---

## 9d. Atuendos por contexto (el dueño, 2026-10-27)

Sus palabras: *"tener la opción de elegir tu atuendo con armadura para combate; en el de mechas
puedes tener diferentes versiones de armadura igual que el de héroes (combate, sigilo, disfraz de
civil para misiones encubiertas con armadura escondida, traje de piloto de mecha), y poder
elegir, como ya se puede en el juego actualmente, tu ropa para eventos sociales y para cuando
estás en casa o base"*.

Hoy un personaje tiene **una** apariencia (`SpriteAppearance`) y el creador ya deja elegir toda
la ropa; la rama `hero/three-outfits` ensayó tres conjuntos para un héroe. Esto lo hace regla:

- Cada Persona con hoja tiene **atuendos** (`outfits: Record<OutfitSlot, SpriteAppearance>`), todos
  sobre el **mismo cuerpo, cara, pelo y ojos** (eso es la persona; el atuendo solo cambia ropa,
  armadura, capa, accesorios y lo que lleva en la mano). Ranuras del motor: **combate**, **sigilo**,
  **civil** (el disfraz para misiones encubiertas: ropa de calle **con la armadura escondida**, que
  en reglas cuenta la mitad de su CA y no se ve), **social** (la carne asada y el casino), **casa**
  (la base). El pack añade las suyas: **piloto** (el traje de mecha, obligatorio para subir al
  mecha) en el espacial; en superhéroes, el traje de héroe es el de combate y el civil es la
  identidad secreta.
- **Dónde se elige:** en el creador, con una pestaña por atuendo, igual que hoy se elige la ropa
  (la primera vez, el de combate; los demás se copian de él y se cambian si se quiere). En *Casa*,
  antes de salir de misión, la carta "¿Con qué atuendo?" elige entre combate, sigilo y civil para
  esa misión (la misión puede exigir uno: una encubierta pide civil). La escena social y la base
  usan el suyo solos.
- **Lo que hace en reglas:** combate, lo de siempre; **sigilo** da +2 a Sigilo y −1 CA (sin
  armadura pesada); **civil** esconde la armadura (la mitad de CA, +2 a Engaño para pasar por
  civil, y los enemigos no te reconocen hasta que atacas); **piloto** es el único que permite
  pilotar; **social** y **casa** no tocan reglas, pero la gente los nota: un atuendo social por
  encima de tu Estatus da +1 a cortejo esa noche; uno por debajo, −1 respeto con las *orgullosas*.
- **Arte:** ninguna pieza nueva del motor: cada atuendo es ropa que ya existe o que se pinta como
  cualquier ítem (`scene-art-plan.md` 6). Lo único nuevo es la ropa de civil y el traje de
  piloto por universo (en el inventario del plan de arte, lotes 4 y 6).

---

## 10. El tiempo

El año tiene **4 estaciones**. El tiempo avanza:

- **Una estación por misión** completada (el viaje, el descanso, la vuelta).
- **Por decisión:** en casa puedes elegir **"Pasar la estación"** (entrenar, criar, construir,
  cortejar) en vez de salir de misión. Cada estación en casa da una actividad de base y un
  evento social si hay salón; también corre la paciencia de las parejas y la edad de los hijos.
- **Por muerte** del protagonista: el relevo (sección 11) salta hasta que el heredero tiene edad.
- **Por evento paranormal** (decidido; **W9c**: lo trae **solo el guion de la historia**, nunca el
  sorteo de beats de mundo): una escena de la trama ligada al Santuario o a un lugar de misión
  (un sello antiguo, un espíritu, una grieta), que **acelera el crecimiento de un hijo**: salta
  de niño a adolescente, o de adolescente a adulto, en una noche. Tiene precio: una marca
  (`tocado_por_el_espiritu`), un rasgo raro, y quizá un don que no es de ninguno de los padres.

**Bendiciones y Maldiciones** (el dueño, W9c y su añadido). Lo paranormal está **ligado a la
historia y a sus decisiones**, y deja en los personajes **rasgos aleatorios con efecto**: una
**Bendición** es un buff y una **Maldición** un debuff, y cuál toca depende **de la trama en la que
estén**. Reglas:

- Son `TraitId` con efecto en reglas (como las cicatrices de `MISSION_DESIGN.md`, "Scars", que ya
  tienen un lado bueno y otro malo): van en `Person.traits` y, si la persona tiene hoja, su efecto
  se aplica en batalla como un estado permanente.
- **Quién las recibe:** el protagonista, un hijo acelerado, o cualquier persona presente en el
  beat paranormal (una tripulación entera puede salir bendecida de una nebulosa).
- **Cuál toca:** cada beat paranormal trae su **tabla** (el pack la escribe): una lista de
  bendiciones y otra de maldiciones con pesos. Lo que **inclina la tabla** son las decisiones: la
  marca `profanó_el_santuario` mueve el peso a las maldiciones; `honró_a_los_muertos`, a las
  bendiciones; y el d20 decide dentro de la lista (natural 20: eliges; natural 1: la peor).
- **Ejemplos** (shinobi; los nombres son del pack): *Bendición del río* (ventaja en salvaciones
  contra agua, +1 chakra por descanso corto), *Ojos del espíritu* (ve a los disfrazados en el
  campamento sin actividad), *Sangre antigua* (un don dormido despierta ya); *Maldición de la
  torre* (la Tensión nunca baja de 1), *Marca del hambre* (come doble ración o −1 Agotamiento
  por noche), *Sombra ajena* (los Hostiles te reconocen siempre: sin sigilo en su territorio).
- **Se heredan** como los dones: una maldición de sangre pasa con 50 % y puede ser el beat de
  una generación entera (romperla). Una bendición, con 25 %.
- **Se quitan** solo por historia: otro beat paranormal, un sacrificio, un favor de una facción
  Aliado. Nunca por tiempo.

Las personas **envejecen**: joven (hasta 25), adulta (hasta 45), mayor (hasta 65), anciana. Un
personaje mayor pierde 1 punto de FUE/DES al pasar de etapa (el pack puede cambiarlo), gana
respeto en el mundo, y a los PNJ ancianos les llega el beat de despedida. El protagonista puede
**retirarse** desde adulto si hay heredero jugable: el retiro es un relevo sin muerte.

---

## 11. El linaje

**Unión.** Con una pareja en compromiso (sección 6) y un Cuarto de invitados o nivel de base ≥ 2,
la escena de unión (boda, pacto; el pack la nombra) crea una `Union`. Cada unión puede dar
hijos: al cambiar de año, cada unión tira d20; con ≥ 11 nace un hijo (con la marca
`buscando_hijo`, elegida en casa, ≥ 6). El pack decide qué uniones pueden tener hijos; el motor no.

**Qué hereda un hijo** (decidido: nace a **nivel 1**, con **dones heredados**, y **sube solo**):

- **Rasgos físicos** (`InheritedLooks`): del sprite por capas, se heredan **cuerpo, pelo, ojos,
  forma de cara, piel y marcas de cara**. Cada capa se toma de uno de los dos padres al azar, con
  un **10 % de mutación** (otra opción del catálogo de la misma familia: otro color de pelo, otra
  forma de ojos). El resto (ropa, armadura, arma) se elige al jugarlo. Así un hijo de Aiden y Lyra
  se ve como un hijo de los dos sin dibujar nada nuevo.
- **Dones** (`gifts`): cada don de cada padre pasa con **50 %** (**75 %** si los dos lo tienen,
  **100 %** si el origen lo marca como `giftBias` de ambos). Un don heredado está **dormido**:
  **despierta** en la adolescencia (una tirada por estación: d20 ≥ 15, o seguro con el módulo
  Entrenamiento y un padre vivo con ese don) o con el evento paranormal. En el pack shinobi, los
  dones son la naturaleza de chakra (el hijo nace con la de un padre; con dos, una dormida que es
  su segundo elemento a nivel 5 sin elegir) y, más adelante, los ojos de clan (**el dueño dijo que
  los ojos vienen después: no se diseñan aquí**).
- **Personalidad:** 1 rasgo de cada padre y 1 de la crianza: cada estación en casa con un hijo
  ofrece una **decisión de crianza** (ser duro, ser blando, enseñarle el oficio, dejarlo libre)
  que suma a sus `values` (las convicciones). Un hijo criado por tu pareja lejos de ti sale con
  los valores de ella y `bond` bajo contigo.
- **Nivel 1 y sube solo:** cada estación, un hijo gana experiencia según su edad y los módulos
  (Entrenamiento ×2); a los 18 llega a nivel 3 o 4. Nunca hereda nivel, jutsu ni objetos: aprende
  los suyos (su clase se elige al volverse jugable, con el creador, con su cuerpo y dones ya
  puestos). **La edad jugable la fija el jugador al crear la campaña (W7a+)**, junto con lo larga
  que la quiere: *Campaña corta* (un protagonista; los hijos crecen pero no se juegan), *Normal*
  (jugable a los 18, el valor por defecto), *Saga* (jugable a los 16 y las estaciones corren
  más rápido: dos por misión). Antes de esa edad se le ve crecer: en la carne asada, en las
  decisiones de crianza, y en el árbol.
- **El nombre lo pone el jugador** (el dueño) al nacer, en una escena corta de nacimiento; el pack
  sugiere nombres de la facción como ayuda, nada más.
- **Lo que hereda del mundo al tomar el relevo:** la base y las propiedades enteras; la riqueza
  −1 (los gastos del relevo); la **reputación a la mitad** (la fama a la mitad también: te conocen
  por tu padre); las relaciones **no**: cada persona empieza con el hijo en `bond` 0 salvo la
  familia y las que lo vieron crecer (carne asada), que conservan la mitad; los **rencores sí**
  pasan enteros (un enemigo de tu padre es tu enemigo); los beats pendientes de la Crónica siguen
  vivos (el traidor que iba a volver, vuelve contra el hijo).

**El relevo.** Ocurre por muerte (en Leyenda; en Historia y Normal, por decisión de historia según
H2), por retiro, o por decisión en casa cuando un hijo es adulto. Si no hay heredero con edad,
**el tiempo salta** hasta que lo haya (hasta 10 años; la pantalla lo cuenta como un epílogo por
diapositivas) y entre tanto el mundo se mueve: facciones que suben y bajan, PNJ que mueren de
viejos, la riqueza que se asienta. Sin heredero posible, la campaña termina con un final (uno
de los 6+).

**El árbol.** Una pantalla **Linaje**: los retratos (cortados del sprite, como los portraits de
diálogo) por generación, con uniones, dones despiertos y dormidos, y la línea de la Crónica que
cada uno escribió. Es la pantalla que hace que las generaciones se sientan.

---

## 12. El generador de campañas

Hoy una misión es un `MissionDef` escrito a mano, y el anexo del dueño propone 3 arcos con rama y
cuello de botella. Esto se queda; lo que cambia es **de dónde salen las escenas entre misiones y
cómo se eligen**.

**Gramática:** Campaña → Actos (3, como el anexo) → **Beats** → Escenas → Opciones. Un beat es
una **plantilla con huecos y condiciones**:

```ts
interface BeatTemplate {
  id: BeatId;
  act: 1 | 2 | 3 | 'any';
  kind: 'hook' | 'social' | 'love' | 'family' | 'faction' | 'wealth' | 'base' | 'paranormal' | 'echo' | 'finale';
  when: Condition[];      // sobre CampaignState: marcas, barras, reputación, riqueza, estación, edad
  weight: number;         // cuánto pesa en el sorteo cuando se cumple
  slots: Record<string, SlotPicker>;   // {rival}: una persona con grudge ≥ 6; {amor}: una pareja; {hijo}: un hijo adolescente
  script: string;         // el guion de MISSION_DESIGN ("escena", "dice", "eleccion", "prueba", "marca"), con {huecos}
  echoes?: Echo[];        // la regla 1-2-3 del anexo: un eco 2 o 3 misiones después, y un peso en el final
  once?: boolean;
}
```

**Cómo elige:** al terminar una misión y al cambiar de estación, el generador junta los beats
cuyas condiciones se cumplen, resta los ya usados (`once`), suma los ecos pendientes que vencen
ahora, y sortea por peso con el RNG sembrado: **1 beat de historia** (del acto) + **hasta 2 de
mundo** (social, amor, familia, riqueza…). Los de historia siguen la rama y el cuello de botella
del anexo; los de mundo son los que hacen que cada campaña sea distinta.

**Un beat de ejemplo** (pack shinobi, en el formato de guion de `MISSION_DESIGN.md`):

```
# beat: rival_en_la_carne_asada   kind: social   act: any   once: no   weight: 3
# when: evento_social activo; existe {rival} con grudge >= 6 y faccion invitada; {amor} existe
escena patio_noche
entra {rival} marca:puerta pose:brazos_cruzados
emote {amor} ?
dice {rival} enfadado: "No sabía que {protagonista} invitaba a cualquiera."
eleccion
  opcion ignorar: "Sigue comiendo." valores:+completar_mision
    marca {rival}.grudge +1
    dice {amor} triste: "¿Vas a dejar que te hable así?"
    marca {amor}.respect -1
  opcion brindar: "Brinda por él delante de todos." prueba: Persuasión CD 14 quien: LIDER
    si exito: marca {rival}.grudge -3 ; marca {rival}.respect +2 ; emote {rival} …
    si fallo: marca {rival}.grudge +2 ; marca aldea.reputacion -1
  opcion reto: "Que lo arregle un combate amistoso." prueba: Atletismo CD 12 quien: LIDER
    si exito: marca {rival}.respect +3 ; marca fama +1 ; marca {amor}.affection +1
    si fallo: marca {rival}.respect -1 ; efecto herida_leve
fin
# echo: en 2 misiones, si grudge >= 8 → beat "emboscada_del_rival"; si respect >= 4 → beat "el_rival_pide_unirse"
```

**Los finales:** los 6+ del dueño (H1c) se abren por marcas, reputación **y ahora linaje**: un
final puede pedir "un heredero con dos dones despiertos" o "tres uniones vivas", igual que hoy
piden "3 clanes Aliados".

**Semilla y rejugar:** la semilla fija el sorteo; las decisiones lo mueven. En la pantalla
*Nueva campaña*, la semilla se puede escribir (para compartirla con un amigo) o dejar al azar.

---

## 13. Dónde encaja en el código y en qué orden

**Hoy:** `CharacterCreator` → `ShinobiCharacter` → `saveHero` → `MissionMode` corre un
`MissionRun` → batallas → al final, solo cicatrices y rasgos vuelven al héroe. No hay estado
entre misiones, el paso Origen es un selector de presets, y las cinemáticas, decisiones, marcas y
Crónica están diseñadas pero no construidas.

**Nuevo:**

| Ruta | Qué es |
|---|---|
| `src/campaign/` | TypeScript puro, sin React ni imágenes ni `Math.random`: `state.ts` (`CampaignState`, migración), `people.ts` (Persona, Relación, umbrales), `social.ts` (el evento social: invitados, rondas, tiradas), `love.ts` (etapas, estabilidad, paciencia), `reputation.ts`, `wealth.ts`, `base.ts`, `time.ts` (estaciones, edades), `lineage.ts` (uniones, herencia, relevo), `generator.ts` (beats, condiciones, sorteo, ecos) y sus `*.test.ts` |
| `src/settings/shinobi/` | El pack: `origins.ts`, `factions.ts`, `people.ts` (familias y PNJ semilla), `modules.ts`, `beats/*.ts` (los guiones), `words.ts` (los nombres en `en`/`es`) |
| `src/components/world/` | Las pantallas: *Casa* (la base, pasar la estación, los que viven contigo), *Carne asada* (sobre el escenario de cinemáticas), *Linaje*, *Crónica* (ya diseñada) |
| `src/components/creator/` | El paso Origen de verdad; el creador recibe un `Person` semilla cuando se juega a un hijo (cuerpo y dones ya puestos, se elige clase y el resto) |
| `src/game/saves.ts` | `shinobi5e.campaign.v1`; `applyMissionResult(campaign, run)` al terminar una misión |

`npm test` corre `src/{rules,game,battle,sprite}/*.test.ts`: hay que añadir `campaign` al
script. `src/campaign` **no importa** nada de `src/battle`; solo tipos de `src/types` y el RNG.

**Orden de construcción** (cada paso se juega solo y se enseña):

1. **`CampaignState` + Origen.** El paso Origen real, la campaña guardada, la migración del héroe
   viejo, y al volver de la misión actual (Patrulla del Bosque del Río) la pantalla *Casa* con
   riqueza, reputación y tiempo que cambian. Sin personas todavía.
2. **Cinemáticas, decisiones, marcas y Crónica** (lo ya diseñado en `MISSION_DESIGN.md`, versión
   mínima de su "Build order"). Sin esto no hay escenas.
3. **Personas y relaciones.** Hana, Kenji y la familia del origen como Personas; las 5 barras; la
   charla junto al fuego escribe en `bond` de la campaña; "X lo recordará" guarda memoria.
4. **La carne asada.** El evento social con 4 rondas, invitados por reglas, 10 cartas, 5 eventos
   cruzados. Es el primer momento en que el juego "se siente" como lo que el dueño describe.
5. **Reputación, riqueza, base.** Los privilegios, las compras como prueba, 4 módulos.
6. **Tiempo y amor.** Pasar la estación, edades, etapas del amor, rasgos de pareja, estabilidad.
7. **Linaje.** Uniones, nacimiento, herencia del sprite y de los dones, crianza, relevo, árbol.
8. **Generador.** 20 beats de mundo + los de historia del acto I; ecos; semilla. Antes de este
   paso las escenas se eligen a mano en orden fijo, que ya sirve para probar todo lo anterior.
9. **Segundo pack.** Solo cuando todo lo anterior funcione: un pack espacial mínimo (orígenes,
   facciones, nombres, 5 beats) **sin batalla ni sprites nuevos**, para comprobar que el motor no
   sabe en qué género está. Lo que haya que tocar en `src/campaign` para que funcione es lo que
   quedó mal abstraído.

El creador de la base (9b) entra en el paso 5 con la base, empezando por locación, estilo,
paredes, techo y patio (los juguetes y la seguridad cuando haya Estatus y fans); la nave del pack
espacial es del paso 9. El Salón / Casino (5b) y el Estatus (6b) entran en el paso 5 (el Estatus se calcula de lo que ese
paso construye) y el casino con sus mesas en un paso **5b** propio, después de la carne asada y
antes del tiempo: las mesas de póker y bacará son un módulo puro (`src/campaign/cards.ts`) con sus
tests, y el mapa del casino es una batalla más (`encounters.ts`) que necesita arte del dueño.

---

## 13b. Una campaña, en solitario o con amigos (el dueño, 2026-10-27)

- **Una campaña es una** (`CampaignState`), en solitario o multijugador. En multijugador, **la
  campaña no se puede jugar sin los jugadores originales**: para seguirla tienen que estar todos,
  como en una mesa de D&D, para que las decisiones y las opciones de cada uno sigan al corriente
  con las de los demás. El estado guarda la lista de jugadores (`players: PlayerId[]`) y una
  sesión solo continúa con todos presentes; con uno ausente, se puede **mirar** (Crónica, Linaje,
  Casa) pero no avanzar el tiempo ni decidir.
- Cada jugador tiene **su protagonista y su linaje** dentro de la misma campaña; la base, la
  riqueza y la reputación son **del grupo** (como la aldea de un clan), y el Estatus es **de cada
  uno**. Los hijos de dos jugadores son posibles si ambos quieren (una unión entre jugadores pide el
  sí de los dos, como el veto de H3).
- Las votaciones y la Balanza de `MISSION_DESIGN.md` ("Decisions in the three modes") valen igual
  en casa: pasar la estación, comprar un módulo o invitar a una facción se vota si hay más de un
  jugador.
- **Los compañeros con hoja** (Hana, Kenji, las leyendas que se unen, los hijos que aún no juegas)
  **envejecen como todos** y, **si se separan del grupo por un tiempo, suben de nivel solos**: una
  estación fuera del grupo (en una misión propia, en su facción, criando) es experiencia según su
  edad y la facción; vuelven con nivel, una marca de lo que hicieron y a veces una Bendición. Un
  compañero que viaja siempre contigo sube con el grupo, como hoy.

---

## 14. Preguntas para el dueño

Formato: "W1b W2a…". ★ marca mi recomendación. **Todas respondidas** (arriba, las dos rondas);
se dejan escritas para que se vea qué se eligió. Queda una duda nueva al final.

- **W13. Las mesas del casino, ¿juegos de verdad o tiradas?**
  - a) Juegos de verdad: póker (cinco cartas, una ronda de cambio y apuestas) y bacará con cartas
    del RNG sembrado; el jugador juega la mano. ★
  - b) Tiradas de d20 + INT/CAR con el nombre del juego por encima (más rápido de construir, menos
    juego).
  - c) Las dos: las mesas bajas son tiradas, la mesa de fortunas es juego de verdad.
- **W14. ¿Cuánto puede perderse en el casino?**
  - a) Hasta un nivel de riqueza por visita en las mesas normales; propiedades y módulos solo en
    la mesa de fortunas, y solo lo que pongas tú. ★
  - b) Sin tope: todo está en juego si te sientas.
- **W15. ¿Las bebidas tienen efecto en reglas o solo sabor?**
  - a) Efecto corto por bebida (Coraje, Lengua suelta, Calma) y Ebrio a la tercera. ★
  - b) Solo sabor y diálogo.
  - c) Efecto, y además una bebida de la casa por universo con un efecto raro (una marca, una
    visión).

- **W1. ¿Cuántas barras de relación?**
  - a) Solo Lazo, como hoy (más simple; los PNJ son "amigo / no amigo").
  - b) Lazo + confianza, respeto, afecto, rencor (sección 4). ★
- **W2. La carne asada, ¿cuántas rondas?**
  - a) 3.
  - b) 4. ★
  - c) 6 (noches largas; más tiradas, más riesgo de aburrir).
- **W3. ¿El rasgo de pareja se ve?**
  - a) Siempre, en la ficha de la persona.
  - b) Se descubre: oculto hasta `bond ≥ 3` o hasta que lo muestra en una escena. ★
  - c) Nunca se nombra; solo se nota por cómo reacciona.
- **W4. La estabilidad para varias parejas (sección 6):**
  - a) Como está: fórmula con umbral 8 y prueba de paciencia por estación. ★
  - b) Más dura: umbral 10, y cada pareja adicional baja riqueza un nivel al empezar.
  - c) Más blanda: sin fórmula; solo el afecto de cada una decide.
- **W5. ¿Riqueza con 7 niveles sin cifras?**
  - a) Sí, 7 niveles y nunca una cifra. ★
  - b) 5 niveles.
  - c) Niveles por fuera, pero una cifra de oro por dentro que se puede ver en la Crónica.
- **W6. Comprar estirándose (bajar un nivel para comprar un nivel por encima):**
  - a) Sí. ★
  - b) No: solo se compra lo que el nivel permite.
- **W7. ¿Cuánto tarda un hijo en ser jugable?**
  - a) Adulto a los 16 años del mundo (16 estaciones × 4 = 64 misiones o estaciones en casa; el
    relevo casi siempre llega por el salto de tiempo o lo paranormal).
  - b) Adolescente jugable a los 14, adulto a los 18; el salto de tiempo cubre lo que falte. ★
  - c) Jugable desde los 10 (campañas cortas de generaciones rápidas).
- **W8. Al tomar el relevo, la reputación del padre:**
  - a) Pasa entera.
  - b) Pasa a la mitad; los rencores enteros. ★
  - c) No pasa nada: el hijo empieza de cero con el apellido.
- **W9. El evento paranormal que acelera el crecimiento:**
  - a) Raro y con precio: una marca, un rasgo raro, quizá un don ajeno. ★
  - b) Siempre disponible en el Santuario, a cambio de riqueza −2.
  - c) Solo en la historia, cuando el guion lo pida.
- **W10. ¿Qué rasgos físicos hereda el sprite?**
  - a) Cuerpo, pelo, ojos, forma de cara, piel y marcas, cada uno de un padre al azar, 10 % de
    mutación. ★
  - b) Lo mismo, sin mutación.
  - c) Que el jugador los elija al crear al hijo, con los de los padres como sugerencia.
- **W11. ¿Hay semilla visible para compartir campañas?**
  - a) Sí, en *Nueva campaña*. ★
  - b) No; siempre al azar.
- **W12. ¿Qué pack va segundo?**
  - a) Espacial con mechas y nave (el que el dueño describió con más detalle). ★
  - b) Superhéroes.
  - c) Un segundo pack de fantasía (caballeros) que reutiliza más arte.

Las tres dudas abiertas de la primera versión (multijugador, el nombre de los hijos, los
compañeros con los años) las respondió el dueño el mismo día: están en 13b y 11.

**Duda nueva (W16), para cuando toque:** el límite del Hijo de dos clanes (sección 3) está leído
como "la sangre mezclada se consigue jugando, no se elige al crear". Si quiso decir otra cosa
(por ejemplo, que sí se elige pero esa campaña no puede pasar a una segunda generación mezclada),
que lo diga y se corrige.
