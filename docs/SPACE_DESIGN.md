# Estructura de código para el juego espacial (mechas, naves y cadetes)

Propuesta (2026-10-28) a partir del *Documento de Diseño Maestro: RPG Táctico Sci-Fi* del dueño.
Dice cómo encaja su diseño en el código que ya existe y qué se construye nuevo, con los tipos y
los módulos ya nombrados para que el día que se programe no haya que inventarlos. Es una
propuesta: lo que él corrija manda. Las preguntas abiertas van al final (S1–S8).

Lo que su documento pide que sea modular (la economía: `GameCurrencyManager`, `CostValue`) ya
tiene casa: la riqueza por niveles de `docs/WORLD_DESIGN.md` 8 (`src/campaign/state.ts`:
`canBuy`, `buy`, `priceFor`). Aquí no se hardcodea moneda alguna: cada compra es un **nivel de
precio** y el pack espacial le pone el nombre (créditos, chatarra).

---

## 0. En una página

| Lo que pide su diseño | Dónde vive | Nuevo o reutilizado |
|---|---|---|
| Cero azar, intenciones visibles, empujones, eje Z, reacciones | Un **segundo motor de batalla**, `src/tactics/`, determinista sin RNG | Nuevo (mismo contrato que `src/battle`: `create` + `apply(state, action)` → `{ state, events }`) |
| Superficies y matriz de elementos con etiquetas | `src/tactics/surfaces.ts` | Nuevo, pero copia la idea ya hecha de `src/battle/ground.ts` (agua, vapor, rayo en cadena) |
| Cadetes, decisión de muerte, mutilación, prótesis | `src/tactics/death.ts`, `src/tactics/cyber.ts` + la capa de campaña (`Person.traits`) | Nuevo en reglas; las etiquetas son **rasgos** como las Bendiciones/Maldiciones y cicatrices ya diseñadas |
| Nave nodriza en grid de módulos, MACRO y MICRO, abordaje | `src/tactics/ship.ts`, `src/tactics/boarding.ts` | Nuevo; la nave **es la base** del pack espacial (`WORLD_DESIGN` 9/9b: "nave → nave nodriza → estación") |
| Economía modular | `src/campaign/state.ts` (niveles de riqueza, compra como prueba) | Reutilizado tal cual |
| Campaña, personas, carne asada en el hangar, linaje, estatus | `src/campaign/` + pack `src/settings/space/` | Reutilizado: el motor de campaña no sabe de género (`WORLD_DESIGN` 1) |
| Pantallas: mapa táctico, nave, Casa | `src/components/tactics/`, `src/components/ship/`, `src/components/world/` | Mapa nuevo; reproducción de eventos (`playback.ts`), HUD y renderer **se extraen** de `components/battle` a algo común |
| Sprites de cadetes, mechas, naves | `src/sprite/` (cuerpos nuevos), `tools/` (sus dibujos) | Como siempre: sus píxeles, un script por pieza |

**La regla de oro sigue siendo una**: `src/tactics`, como `src/battle` y `src/campaign`, es
TypeScript puro, sin React, sin imágenes y aquí además **sin `rngFor`**: el motor táctico
espacial no importa `src/rules/rng.ts`. Un test lo vigila.

---

## 1. Por qué un segundo motor y no una variante del de hoy

`src/battle` es un motor 5e: dados, CD, tiradas de salvación, ventaja. Su diseño espacial pide lo
contrario (daño fijo, intenciones visibles, empujones geométricos, eje Z, reacciones con AP). Se
podría poner un interruptor "sin dados" al motor de hoy, pero cada regla (jutsu, armas, estados)
está escrita alrededor de la tirada: saldría un motor con dos mitades que no se entienden.

Lo que **sí** comparten los dos motores, y por eso se saca a un sitio común:

- El **contrato**: `create(setup) → { state, events }`, `apply(state, action) → { state, events }`,
  estado plano serializable, eventos que una pantalla reproduce. `src/components/battle/playback.ts`
  (ritmo de eventos) y el patrón del renderer sirven para los dos.
- La **IA**: una función `aiAction(state) → action` por motor; el bucle de la pantalla es el mismo.
- El **resultado** hacia la campaña: `applyMissionResult` (`src/campaign/state.ts`) no sabe qué
  motor jugó la misión.
- El **mapa como grid con etiquetas**: `src/battle/structures.ts` (estructuras que bloquean) y
  `ground.ts` (lo que los elementos dejan en el suelo) son el antecedente directo de las
  superficies sci-fi; el eje Z es lo único que el mapa de hoy no tiene.

Propuesta de carpetas (lo nuevo en negrita):

```
src/
  campaign/            el mundo entre misiones (ya empezado, paso 1)
  settings/
    shinobi/           el pack de hoy
    **space/**         el pack espacial: facciones (flotas, corporaciones, colonias), orígenes,
                       módulos de la nave, implantes, palabras (créditos), beats
  battle/              el motor 5e (shinobi)
  **tactics/**         el motor táctico sci-fi, determinista
  **engine/**          lo común a los dos motores: el contrato, la cola de eventos, el grid base
  components/
    battle/            la pantalla del motor 5e (de aquí se extraen playback y HUD a components/engine)
    **tactics/**       la pantalla del mapa táctico espacial (Z, intenciones, reacciones)
    **ship/**          la nave: grid de módulos, combate MACRO, control de daños, bahía de cápsulas
    world/             Casa (ya existe); la nave es la Casa del pack espacial
```

---

## 2. Los tipos (el vocabulario)

```ts
// src/tactics/types.ts — todo es data plana: se guarda, se manda por red, se repite.

/** Una celda del mapa táctico: columna, fila y altura (eje Z en "pisos" de 1 unidad). */
export interface Cell3 { c: number; r: number; z: number }

/** Etiquetas de superficie y de objeto (su sistema de etiquetas): el pack añade las suyas. */
export type SurfaceTag = 'metal' | 'wood' | 'fuel' | 'glass' | 'void' | 'coolant' | 'plasma' | 'nanobots' | 'emp' | 'steam';

export interface Tile {
  cell: Cell3;
  /** Cobertura baja (se ignora desde arriba) o alta; `none` abierto; `wall` bloquea. */
  cover: 'none' | 'low' | 'high' | 'wall';
  /** Ventana o borde al vacío: un empujón por aquí es muerte o caída. */
  edge?: 'window' | 'drop';
  tags: SurfaceTag[];
  /** Lo que hay en la celda ahora (refrigerante, plasma…), con cuántos turnos le quedan. */
  surface?: { kind: SurfaceTag; turns: number; charged?: boolean };
  /** Un objeto del entorno (barril, consola, dron): conducto para los cadetes; se consume. */
  prop?: { id: string; tags: SurfaceTag[]; hp: number };
}

export type UnitKind = 'cadet' | 'mecha' | 'drone' | 'turret' | 'boss';

export interface TacticsUnit {
  id: string;
  team: 'party' | 'enemy';
  kind: UnitKind;
  /** Quién es en la campaña (un cadete es una Person con hoja; un mecha tiene piloto). */
  personId?: string;
  pilotId?: string;
  cell: Cell3;
  facing: 0 | 1 | 2 | 3;
  hp: number; maxHp: number;
  /** Los mechas llevan armadura que los nanobots degradan; los cadetes no. */
  armor?: number;
  shield?: number;
  /** Puntos de acción: mover, actuar, reaccionar. Se gastan también en el turno enemigo. */
  ap: number; maxAp: number;
  /** Masa: cuántas celdas lo mueve un empujón de fuerza F (F / mass, redondeado abajo). */
  mass: number;
  /** Vuelo o Zero-G: ignora caídas y pisos. */
  flight?: boolean;
  /** Etiquetas anatómicas permanentes y sus prótesis (sección 5). */
  body: BodyTag[];
  abilities: string[];                   // ids de AbilitySpec del pack
  statuses: Status[];                    // stun (reinicio), slow, burning, corroded, blind…
  /** Lo que hará en su turno, visible al jugador: cero azar. */
  intent?: Intent;
}

export interface Intent { abilityId: string; target: Cell3 | string; order: number }

/** Una acción del jugador o de la IA. Siempre determinista: la misma acción, el mismo resultado. */
export type TacticsAction =
  | { kind: 'move'; unit: string; path: Cell3[] }
  | { kind: 'ability'; unit: string; abilityId: string; target: Cell3 | string }
  | { kind: 'use_prop'; unit: string; abilityId: string; prop: Cell3 }
  | { kind: 'react'; unit: string; reactionId: string; triggerId: string }   // dentro de una ventana de reacción
  | { kind: 'pass_reaction'; triggerId: string }
  | { kind: 'end_turn'; unit: string }
  | { kind: 'death_choice'; unit: string; choice: 'sacrifice' | 'retreat' };

export interface TacticsState {
  version: 1;
  map: { w: number; h: number; floors: number; tiles: Tile[] };
  units: TacticsUnit[];
  round: number;
  turn: string;                          // id de la unidad activa
  /** Una reacción pendiente para el jugador: el juego está en pausa hasta que decida. */
  pendingReaction?: { triggerId: string; trigger: TacticsEvent; who: string[]; options: string[] };
  /** Una decisión de muerte pendiente. */
  pendingDeath?: { unit: string };
  outcome: 'ongoing' | 'victory' | 'defeat';
  log: TacticsEvent[];
}

export type TacticsEvent =
  | { kind: 'moved'; unit: string; path: Cell3[] }
  | { kind: 'knockback'; unit: string; from: Cell3; to: Cell3; hit?: 'wall' | 'unit' | 'window' | 'drop'; damage: number }
  | { kind: 'damage'; unit: string; amount: number; type: DamageKind; cause: string }
  | { kind: 'surface'; cell: Cell3; kind2: SurfaceTag; reaction?: 'electrified' | 'steam' | 'detonation' | 'overheat' | 'chain' }
  | { kind: 'prop_consumed'; cell: Cell3; prop: string }
  | { kind: 'reaction_window'; triggerId: string; who: string[] }
  | { kind: 'intent'; unit: string; intent: Intent }
  | { kind: 'death_choice'; unit: string }
  | { kind: 'sacrifice'; unit: string; abilityId: string }
  | { kind: 'retreat'; unit: string; mutilation: BodyTag }
  | { kind: 'turn'; unit: string; round: number }
  | { kind: 'end'; outcome: 'victory' | 'defeat' };

export type DamageKind = 'kinetic' | 'plasma' | 'corrosive' | 'emp' | 'collision' | 'cold';
```

Las **habilidades** son data del pack, no código por habilidad (como `JUTSUS_DATA` pero sin
dados):

```ts
// src/settings/space/abilities.ts
export interface AbilitySpec {
  id: string; name: string; nameEs: string;
  apCost: number;
  range: { min: number; max: number; needsLos: boolean; ignoresLowCoverFromAbove?: boolean };
  /** Daño fijo. Cero azar: lo que dice es lo que hace. */
  damage?: { amount: number; type: DamageKind };
  /** Empujón: fuerza en "unidades de masa"; dirección desde el atacante o fija. */
  push?: { force: number; dir: 'away' | 'toward' | 'facing' };
  /** Lo que deja en el suelo (o conduce por un objeto etiquetado). */
  surface?: { kind: SurfaceTag; radius: number; turns: number; viaPropTags?: SurfaceTag[] };
  /** Salto orbital, vuelo: cambia el Z. */
  vertical?: { jumpZ: number } | { flightTurns: number };
  /** Puede usarse como reacción a estos disparadores (misil entrante, movimiento a la vista…). */
  reactionTo?: TriggerKind[];
  statuses?: Status[];
  /** Prótesis que la otorga o la bloquea (sección 5). */
  requiresBody?: BodyTag[]; blockedByBody?: BodyTag[];
}
```

---

## 3. Los pilares de combate, módulo por módulo

| Pilar | Módulo | Qué hace, en una línea |
|---|---|---|
| Cero azar | todo `src/tactics` | Ningún módulo importa `rng`; `engine.test.ts` falla si alguno lo hace. El "azar" del enemigo es su **intención**, calculada al empezar su turno y mostrada (`intent.ts`) |
| Intenciones visibles | `intent.ts` | Al terminar el turno del jugador, cada enemigo decide (IA determinista) y emite `intent`; la pantalla dibuja el objetivo y la celda. En su turno ejecuta exactamente eso, salvo que ya no pueda (muerto, aturdido, sin línea): entonces recalcula y se ve |
| Empujones | `physics.ts` | `knockback(state, unit, dir, force)`: celdas = `floor(force / mass)`; avanza celda a celda; al chocar: contra **muro** daño = celdas que faltaban × `WALL_K`; contra **otra unidad** reparte el daño y empuja a la segunda con la fuerza restante (cadena); por **ventana** al vacío: fuera de combate (cadete: decisión de muerte; mecha: destruido); por **borde** cae pisos: daño por piso. Todo geométrico, sin tirada |
| Eje Z | `grid3.ts` | Pathfinding A* con coste de subir (escaleras, rampas, salto) y caída libre; `los(from, to)` con alturas: desde más alto, la cobertura baja no cuenta; una unidad en vuelo ignora pisos y minas. Reutiliza la idea de la rejilla oculta de `src/battle/nav.ts`, con Z |
| Reacciones | `reactions.ts` | Disparadores (`TriggerKind`: `missile_incoming`, `enemy_moves_in_sight`, `ally_hit`, `surface_spreading`): cuando uno ocurre en el turno enemigo y alguien del jugador tiene AP y una habilidad con `reactionTo`, el motor emite `reaction_window` y deja `pendingReaction`; **no avanza** hasta `react` o `pass_reaction`. La IA enemiga también reacciona, sin pausa |

El bucle (`engine.ts`): `applyAction` valida la acción contra `pendingReaction` / `pendingDeath`
(si hay algo pendiente, solo se aceptan las acciones que lo resuelven), la ejecuta, resuelve
superficies y cadenas, comprueba muertes (→ decisión), pasa turno, calcula intenciones.

---

## 4. Superficies y control ambiental

`surfaces.ts` lleva la **matriz** como una tabla, no como `if`s repartidos:

```ts
/** Qué pasa cuando `incoming` cae sobre una celda con `present` (o con esa etiqueta de objeto). */
export const REACTIONS: Record<`${SurfaceTag}+${SurfaceTag}`, Reaction> = {
  'coolant+emp':     { result: 'coolant', charged: true, spread: 'surface' },   // electrifica la zona
  'coolant+plasma':  { result: 'steam', turns: 2 },                            // vapor: bloquea visión y escáneres
  'plasma+fuel':     { result: 'detonation', radius: 2, damage: 12 },
  'nanobots+plasma': { result: 'overheat', radius: 1, damage: 8 },
  'emp+metal':       { result: 'emp', spread: 'tags', stun: true },            // en cadena por el metal
  'emp+coolant':     { result: 'emp', spread: 'surface', stun: true },
  'plasma+stealth':  { result: 'reveal' },                                     // anula camuflaje óptico
};
```

- **Refrigerante** ralentiza (coste de movimiento ×2); **plasma** quema por turno y revela;
  **nanobots** quitan armadura al mecha y vida al cadete cada turno; **EMP** rompe escudos y
  aturde (reinicio: pierde su próximo turno), y se **propaga** por celdas contiguas con etiqueta
  `metal` o superficie `coolant` (`spread`), igual que hoy el rayo corre por el suelo mojado.
- **Objetos como conductos**: `use_prop` toma un objeto con etiqueta compatible
  (`viaPropTags`), lo consume (`prop_consumed`) y aplica la superficie desde la celda del objeto,
  no desde el cadete: así un barril de combustible lejano es una bomba a distancia.
- La clase **Cadete Espacial** es la que tiene habilidades `surface` con `viaPropTags`; un mecha
  no manipula objetos, los aplasta (empujón).

---

## 5. Cadetes: decisión de muerte, mutilación y prótesis

```ts
export type BodyTag =
  | 'missing_arm_l' | 'missing_arm_r' | 'missing_eye' | 'missing_leg'
  | 'optics_tactical' | 'optics_designator'
  | 'arm_grapple' | 'arm_magshield' | 'arm_repulsor'
  | 'legs_zero_g' | 'legs_hover' | 'legs_quantum';
```

- **Decisión de muerte** (`death.ts`): a 0 HP un cadete no muere; el motor emite `death_choice`
  y deja `pendingDeath`. `sacrifice`: muere para siempre y ejecuta su habilidad definitiva
  (`AbilitySpec` marcada `ultimate`) desde su celda; `retreat`: sale del mapa y recibe una
  etiqueta de mutilación **elegida por una tabla fija según la causa** (sin dado: daño
  `corrosive` → ojo; `collision` → pierna; `plasma` → brazo; `kinetic` → el primero libre). Un mecha
  a 0 HP se destruye; su piloto, si lo tiene, pasa por la decisión de muerte.
- **Las etiquetas viven en la campaña**: `Person.traits` (`WORLD_DESIGN` 4) con efecto en reglas,
  como las cicatrices y las Maldiciones ya diseñadas. `missing_arm_*` bloquea armas a dos manos
  y baja un punto de daño; `missing_eye` quita alcance; `missing_leg` quita movimiento. Se
  **heredan** como un rasgo cualquiera: no (las prótesis tampoco).
- **Prótesis** (`cyber.ts` + evento de base): en la nave, en el módulo **Laboratorio** (el
  "Taller" del motor de campaña, `WORLD_DESIGN` 9), un cadete mutilado se instala un implante.
  Es una **compra como prueba**: cada implante tiene un `price: 3 | 4 | 5` (nivel de riqueza) y
  sale por `buy(campaign, priceFor(price, reputación del vendedor))`. Instalarlo **reemplaza** la
  etiqueta de falta y **sobrescribe** habilidades: `abilitiesFor(unit)` filtra por
  `requiresBody` / `blockedByBody`, así un brazo modificado quita las armas a dos manos y da el
  gancho, el escudo magnético o el repulsor; las ópticas dan evasión al primer disparo
  (`reactionTo: ['first_shot']`, coste 0 AP) o el designador para pedir el **bombardeo orbital**
  de la nave (una habilidad que la MACRO resuelve: sección 6); las piernas Zero-G ignoran
  terreno y minas (`flight` parcial) o dan el salto cuántico (teletransporte a celda vista).

```ts
// src/settings/space/implants.ts
export interface ImplantSpec {
  id: BodyTag; name: string; nameEs: string;
  replaces: BodyTag;                 // la etiqueta de falta que cubre
  price: 3 | 4 | 5;                  // nivel de riqueza (WORLD_DESIGN 8): nunca una cifra
  grants: string[];                  // ids de AbilitySpec
  blocks?: 'two_handed'[];
  passive?: Partial<Pick<TacticsUnit, 'flight'>> & { evadeFirstShot?: boolean; ignoreTerrain?: boolean };
}
```

---

## 6. Combate naval: MACRO y MICRO

**La nave es la base del pack espacial.** Hoy `CampaignState.base = { tier, modules }`; para
la nave el pack necesita **dónde** está cada módulo, porque el grid de módulos es a la vez el
creador de la base (`WORLD_DESIGN` 9b, el interior de la nave) y el tablero del combate naval.
Propuesta: el motor de campaña gana un campo opcional, genérico, que el pack shinobi no usa:

```ts
// src/campaign/state.ts (ampliación)
base: { tier: number; modules: string[]; layout?: ModuleCell[] };
export interface ModuleCell { moduleId: string; c: number; r: number; w: number; h: number }
```

```ts
// src/tactics/ship.ts — una nave en combate (la del jugador y la enemiga, misma estructura)
export interface ShipModuleState {
  moduleId: string;                 // reactor, bridge, shields, artillery, catapult_bay, hydroponics, lab, hangar…
  cells: ModuleCell;
  hp: number; maxHp: number;
  online: boolean;                  // deshabilitado a 0 HP o por EMP
  /** Daño interno abierto: alguien tiene que ir a repararlo (MICRO). */
  breach?: { kind: 'plasma_fire' | 'vacuum' | 'electrified'; turns: number };
}

export interface ShipState {
  id: string; name: string;
  modules: ShipModuleState[];
  reactor: { energy: number; maxEnergy: number; perTurn: number };
  weapons: ShipWeapon[];            // cinéticas, plasma, EMP: coste de energía, daño fijo, qué módulos pueden apuntar
}

export interface NavalState {
  version: 1;
  player: ShipState; enemy: ShipState;
  /** Los cadetes dentro de la nave: el mapa MICRO es el interior (layout → Tile[] con etiquetas). */
  crew: TacticsState;
  /** Un abordaje en curso: el interior de la nave enemiga como mapa táctico. */
  boarding?: TacticsState;
  turn: 'player' | 'enemy';
  round: number;
}

export type NavalAction =
  | { kind: 'fire'; weaponId: string; targetModule: string }                     // MACRO: gasta energía del reactor
  | { kind: 'crew'; action: TacticsAction }                                      // MICRO: moverse, reparar, apagar fuegos
  | { kind: 'repair'; unit: string; moduleId: string }
  | { kind: 'launch_capsule'; units: string[]; targetModule: string }           // desde la bahía de catapultas
  | { kind: 'board'; action: TacticsAction }                                     // dentro de la nave enemiga
  | { kind: 'orbital_strike'; cell: Cell3 }                                      // pedido por un designador láser desde tierra
  | { kind: 'end_turn' };
```

- **MACRO** (`ship.ts`): `fire` resta energía, aplica daño fijo al módulo apuntado (los
  **escudos** absorben primero si están `online`; el **EMP** los salta y pone `online: false` un
  turno). Un módulo a 0 HP queda deshabilitado: sin reactor no hay disparos; sin bahía no hay
  cápsulas; sin puente la IA enemiga pierde sus intenciones (dispara al azar fijo: al primer
  módulo). Un impacto que perfora abre una **brecha** en el módulo (plasma, vacío o
  electrificado según el arma), y esa brecha es una **superficie** en el mapa MICRO: las celdas
  del módulo reciben `plasma` / `void` / `emp` con la misma matriz de la sección 4.
- **MICRO** (`crew` dentro de `NavalState.crew`): es el motor táctico corriendo sobre el interior
  de la nave (`layoutToTiles(layout)`); `repair` pide estar en el módulo, cuesta AP y cierra la
  brecha; una brecha sin cerrar sigue haciendo daño al módulo cada turno (`breach.turns` cuenta
  hacia la pérdida del módulo).
- **Abordaje** (`boarding.ts`): `launch_capsule` toma cadetes de la bahía de catapultas y crea
  `boarding` = un `TacticsState` con el interior de la **nave enemiga** (`layoutToTiles` de su
  layout) y las superficies que **los disparos MACRO ya dejaron** allí (una sala sin oxígeno es
  `void` en sus celdas: sin casco, daño por turno; una electrificada, `emp` en cadena por el
  metal). Ganar el abordaje del puente o del reactor termina el combate naval.
- Las dos escalas en el **mismo turno**: el jugador reparte energía (MACRO) y AP (MICRO) como
  quiera; `end_turn` pasa a la nave enemiga, que dispara según sus intenciones visibles y mueve a
  su tripulación.

---

## 7. La campaña espacial (lo que ya existe, con nombres nuevos)

Nada de esto es código nuevo: es el pack `src/settings/space/` llenando el vocabulario de
`WORLD_DESIGN` 1.

| Motor | Pack espacial |
|---|---|
| Facción | Flota (la armada), corporación, colonia, piratas, el gremio de ingenieros |
| Origen | Cadete de academia, hijo de la corporación, superviviente de colonia, pirata amnistiado, aprendiz del ingeniero jefe (el "hijo de dos razas" se gana jugando, como en shinobi) |
| Don | Afinidad de pilotaje, implante de nacimiento, resistencia al vacío |
| Base | Nave → nave nodriza → estación; módulos = los del grid (reactor, puente, escudos, artillería, bahía de catapultas, hangar, hidropónico, laboratorio, ala de tripulación) |
| Compañero de combate | El mecha personal (una `TacticsUnit` kind `mecha` con `pilotId`) |
| Evento social | Parrillada en el hangar (la carne asada, mismas reglas) |
| Moneda narrativa | Créditos / chatarra: solo nombre; la riqueza son los 7 niveles |
| Estatus | De don nadie a comandante de la flota; fans en la estación |
| Evento paranormal | Anomalía temporal, nebulosa: Bendiciones/Maldiciones con la misma tabla de pesos |

Un cadete es una **Persona con hoja**; la hoja espacial no es `ShinobiCharacter`. Para el paso 3
de la campaña (`WORLD_DESIGN` 13) conviene desde ya tipar `Person.sheet` por pack:
`sheet?: { kind: 'shinobi'; sheet: ShinobiCharacter } | { kind: 'space'; sheet: CadetSheet }`,
y que el creador reciba un `Person` semilla, como está diseñado para los hijos.

---

## 8. Orden de construcción

Después del paso 9 de `WORLD_DESIGN` 13 (el pack espacial mínimo sin batalla), que es la prueba
de que el motor de campaña no sabe en qué género está:

1. **`src/engine/`**: sacar el contrato y `playback` de `components/battle` a común, sin cambiar
   el juego shinobi (sus tests siguen verdes).
2. **`src/tactics/` mínimo**: grid 3D, movimiento, una habilidad de daño fijo, intenciones
   visibles, fin de combate. Un mapa de prueba, `#tactics` para abrirlo. Sin arte: cajas.
3. **Empujones y superficies**: `physics.ts`, `surfaces.ts` con la matriz y los objetos conducto.
4. **Reacciones** y la pausa en turno enemigo.
5. **Cadetes**: decisión de muerte, mutilación, prótesis en el Laboratorio con la compra como
   prueba.
6. **Nave**: `layout` en la base, `ship.ts` MACRO, MICRO sobre el interior, abordaje.
7. **Arte**: sus cadetes, mechas y naves como siempre (un script por pieza); la nave por dentro
   y por fuera como en `WORLD_DESIGN` 9b.

Cada paso con sus tests, en `src/tactics/*.test.ts` (añadir a `npm test`).

---

## 9. Preguntas para el dueño

- **S1.** ¿Confirmas **dos motores** (5e para shinobi, determinista para el espacial) con el
  contrato común, en vez de un interruptor "sin dados" en el de hoy? (Mi recomendación: sí.)
- **S2.** Cero azar en batalla: ¿también en la **campaña** espacial? Hoy la carne asada, la
  fortuna, el d20 de suerte y los dones de los hijos se tiran con el RNG sembrado. Propongo que la
  campaña siga tirando (es narrativa, no táctica) y solo el combate sea determinista.
- **S3.** El daño por empujón: ¿fijo por celda que faltaba (como propongo) o fijo por tipo de
  obstáculo (muro 5, unidad 3, ventana = fuera)? Dame tus números cuando los tengas.
- **S4.** La mutilación al retirarse: ¿la decide la **causa del daño** (tabla fija, sin dado) o
  la elige el jugador entre dos?
- **S5.** Los implantes: ¿se pueden **quitar y cambiar** (precio otra vez) o son permanentes?
- **S6.** El grid de módulos de la nave: ¿cuántas celdas (propongo 6×4 para la nodriza, 4×3 para
  una corbeta enemiga) y la nave del jugador **crece** con el nivel de la base (nave → nodriza →
  estación) añadiendo filas?
- **S7.** El bombardeo orbital pedido desde tierra: ¿gasta energía del reactor de la nave (así la
  MACRO y la tierra comparten recurso) o tiene usos por misión?
- **S8.** Sprites: ¿los cadetes se dibujan con el cuerpo de hoy (male / female / bulky) con
  trajes como ítems, y los mechas son un cuerpo nuevo (`mecha`, ~2× la altura)? Así la cabeza
  `base`, los pelos y las caras de tus cinco sirven tal cual para los cadetes.
