# Propuesta: el mundo entre misiones (campaña, sociedad, linaje, reputación y riqueza)

> **Estado: propuesta, esperando las respuestas del dueño** (sección 14). Lo que él decidió el
> 2026-10-27 en la conversación ya está escrito como decidido (sección 0). Nada de esto está
> construido. Cuando responda, las reglas acordadas pasan a `GAMEPLAY_DESIGN.md` y
> `MISSION_DESIGN.md` (en inglés), como se hizo con `rest-and-cinematics-proposal.md`.

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
- **Nunca se ve una cifra.** En pantalla, el nivel con su nombre y un sello; en la Crónica, "tu
  fortuna creció" / "menguó".

---

## 9. La base

Una base por campaña, con **nivel** (1 a 4) y **módulos**. El pack pone los nombres; el motor
sabe qué abre cada módulo.

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

## 10. El tiempo

El año tiene **4 estaciones**. El tiempo avanza:

- **Una estación por misión** completada (el viaje, el descanso, la vuelta).
- **Por decisión:** en casa puedes elegir **"Pasar la estación"** (entrenar, criar, construir,
  cortejar) en vez de salir de misión. Cada estación en casa da una actividad de base y un
  evento social si hay salón; también corre la paciencia de las parejas y la edad de los hijos.
- **Por muerte** del protagonista: el relevo (sección 11) salta hasta que el heredero tiene edad.
- **Por evento paranormal** (decidido): un beat raro, ligado al Santuario o a un lugar de misión
  (un sello antiguo, un espíritu, una grieta), que **acelera el crecimiento de un hijo**: salta
  de niño a adolescente, o de adolescente a adulto, en una noche. Tiene precio: una marca
  (`tocado_por_el_espiritu`), un rasgo raro, y quizá un don que no es de ninguno de los padres.

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
  (Entrenamiento ×2); un adolescente llega a nivel 3 o 4 antes de ser jugable. Nunca hereda nivel,
  jutsu ni objetos: aprende los suyos (su clase se elige al volverse jugable, con el creador, con
  su cuerpo y dones ya puestos).
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

---

## 14. Preguntas para el dueño

Formato: "W1b W2a…". ★ marca mi recomendación. Lo que él ya decidió (sección 0) no se pregunta.

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

Dudas abiertas que no son preguntas todavía: cómo entra la campaña en el multijugador local y en
línea (¿una campaña por anfitrión, cada jugador con su linaje?); si el nombre de los hijos lo
pone el jugador o el pack; y qué pasa con los compañeros con hoja (Hana, Kenji) cuando pasan
años: envejecen como todos, pero ¿suben de nivel solos?
