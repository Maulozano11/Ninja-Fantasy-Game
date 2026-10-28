# El juego espacial sobre el motor de hoy: naves, mechas y abordajes

Propuesta (2026-10-28) a partir de los dos documentos del dueño (*Documento de Diseño Maestro*
y *Pilares Mecánicos Acumulados*: Divinity, Wildermyth, Solasta, Tactical Breach Wizards,
Seablip, FTL) y de su corrección del mismo día:

> *"lo que te está pasando son cosas para aplicar en nuestro juego, no crear otro … deberíamos
> poder usar el motor que ya tenemos y mejorarlo … refrigerante se refiere a hielo, que también
> lo añadiremos al de shinobi; plasma es fuego; combustible es como gasolina o aceite inflamable;
> EMP es ataques de electricidad … la pelea terrestre de abordaje en la nave sigue siendo como en
> el sistema original de combate que tenemos, con dados … [el combate de naves] será más de
> probabilidad … tu rol sería ser como el comandante de la pelea".*

La primera versión de este documento proponía un segundo motor sin dados. **Queda descartada.**
Esto es lo que entendí; las preguntas N1–N15 del final son para que elija.

---

## 0. Lo que entendí (verificar)

1. **Un solo motor de batalla terrestre**, `src/battle` (5e, con dados), que **crece** con las
   ideas de sus documentos: empujones y embestidas con choque contra muros, objetos y otras
   unidades; hielo, aceite y una tabla de superficies más completa; verticalidad; reacciones con
   pregunta en el turno enemigo; intenciones visibles; mutilación e implantes. Todo eso sirve
   **también al shinobi** (el hielo y el aceite entran al juego de hoy) y, con otros nombres, al
   espacial: plasma = fuego, refrigerante = hielo/agua, combustible = aceite, EMP = rayo,
   nanobots = veneno/ácido. El motor no cambia de reglas; cambian los nombres y el arte (el pack).
2. **El combate de naves es nuevo** y es otra cosa: no dados de 5e sino **probabilidad**
   (porcentajes visibles), y el jugador es el **comandante**: manda a la nave nodriza y a naves
   pequeñas, contra naves pequeñas y una insignia enemiga. Es una capa **encima** del motor: un
   abordaje abre una batalla terrestre normal (`src/battle`, con dados) dentro de la nave enemiga.
3. **La nave nodriza** está hecha de módulos (puente, reactor, artillería, bahía de cápsulas,
   escudos…), la tripulación está dentro durante el combate (operar estaciones, control de daños)
   y disparar a la nave enemiga es disparar a **sus** módulos.

Si algo de esto no es lo que quiso decir, se corrige antes de tocar código.

---

## 1. Qué tiene ya el motor de hoy (y por eso se mejora en vez de rehacerse)

| Idea de sus documentos | Lo que `src/battle` ya hace | Lo que falta |
|---|---|---|
| Superficies que reaccionan | `ground.ts`: el agua moja el suelo, lo mojado apaga el fuego y conduce el rayo a todos los que pisan, fuego sobre mojado hace vapor que ciega y quema, el viento lo despeja | Hielo (congela el agua: resbalar, inmovilizar), aceite (terreno difícil, anula saltos, arde con fuego), ácido/veneno en el suelo (degrada armadura), la tabla completa (sección 2) |
| Objetos del mapa como armas | `hazards.ts`: barriles que explotan (3d6, radio 1.5 m, CD 13), trampas, sellos explosivos | Objetos **con etiqueta** (`[Metal]`, `[Madera]`, `[Combustible]`) que un jutsu usa como conducto y consume (consolas, drones, barriles de aceite) |
| Reacciones en el turno enemigo | `engine.ts` ya **pausa y pregunta** (`reactionAsk`, `pending`: Evasión, Kawarimi) | Más disparadores (proyectil entrante, enemigo que entra a la vista) y más respuestas (escudo, devolver proyectil) |
| Intenciones del enemigo | `intent.ts` calcula lo que la IA quiere hacer | **Mostrarlo** al jugador antes del turno enemigo (N14) |
| Choques y empujones | `knockout` (dejar inconsciente) y las estructuras que bloquean (`structures.ts`) | **Empujón**: un jutsu o una embestida mueve al objetivo N casillas; si choca con muro, estructura u otra unidad, daño de colisión (N11) |
| Eje Z | El mapa es 2.5D lateral: x y profundidad z, sin alturas | Pisos/plataformas y saltos (N13) |
| Mutilación | Cicatrices con lado bueno y malo (`MISSION_DESIGN`), estados permanentes | Decisión a 0 HP (sacrificio / retirada mutilado), etiquetas de miembro, implantes que reescriben habilidades (N12) |
| Mechas | Cuerpo `bulky` y la hidra como unidad grande | Un cuerpo `mecha` o el mecha como "montura/compañero de combate" (`WORLD_DESIGN` 1; N9) |

---

## 2. La tabla de superficies, una para los dos juegos

El motor conoce la **superficie**; el pack pone el nombre y el dibujo.

| Motor (shinobi) | Pack espacial | Efecto en el suelo | Combina con |
|---|---|---|---|
| Agua (ya) | Refrigerante | Mojado: apaga fuego, conduce rayo | + rayo: electrifica a todos encima (ya) · + fuego: vapor (ya) · + hielo: se congela |
| **Hielo** (nuevo, también shinobi) | Nitrógeno líquido | Terreno resbaladizo: moverse pide salvación de DES o cae (pierde el resto del movimiento); los que empiezan el turno encima, velocidad a la mitad; en mechas: actuadores inmovilizados un turno | + fuego: se derrite a agua · + rayo: conduce como el agua |
| Fuego (ya) | Plasma | Quema por turno; revela a los ocultos (sigilo/camuflaje) | + aceite: ignición de todo el charco · + agua/hielo: se apaga · + veneno: explosión |
| Rayo (ya) | EMP / arco | Daño; en cadena por agua, hielo y objetos `[Metal]`; a sistemas (mechas, escudos): aturde ("reiniciando") | + agua/hielo/metal: encadena (ya para el agua) |
| **Aceite** (nuevo, también shinobi) | Combustible / gel | Terreno difícil (×2 movimiento), anula saltos y el desplazamiento del Ryusei | + fuego o chispa: arde y se expande |
| **Veneno / ácido en el suelo** (nuevo) | Nube de nanobots | Cada turno: a personas daño de veneno; a mechas −armadura (CA) | + fuego: sobrecalienta y explota · + viento: se despeja |
| Vapor (ya) | Vapor denso | Ciega y quema; bloquea escáneres | + viento: se va (ya) |
| Viento (ya) | Gravedad / ventilación | Despeja vapor, nubes y gases | — |

Los **objetos con etiqueta** (`props` de `hazards.ts` con `tags`): un jutsu de fuego sobre un
barril `[Combustible]` lo convierte en la bomba; un rayo sobre una consola `[Metal]` encadena
desde ahí; una técnica de un Kōton o un hacker "interfusiona" un dron inactivo y lo lanza. El
objeto se consume. Es la misma regla que ya tienen los barriles, generalizada.

---

## 3. Lo que crece en el motor terrestre (para los dos juegos)

- **Empujón y embestida** (`push.ts`): una habilidad con `push: { cells, dir }` o una embestida
  (moverse en línea hacia el enemigo y golpear) desplaza al objetivo; el choque contra muro,
  estructura, otra unidad o el borde del mapa hace **daño de colisión** (N11 decide los números),
  y chocar con otra unidad la empuja a ella también (cadena). Contra una ventana o borde al vacío
  (espacio) o un precipicio (shinobi): fuera de combate. Sigue habiendo tirada para **impactar**
  (5e); el empujón es el efecto del impacto.
- **Reacciones con más disparadores** (`engine.ts`): el mecanismo de pausa ya existe; se añaden
  `projectileIncoming` (devolver o bloquear), `enemyEntersSight` (ataque de oportunidad a
  distancia), `allyHit` (interponerse). Cada reacción cuesta la reacción del turno, como en 5e.
- **Intenciones visibles** (`intent.ts` → la pantalla): antes del turno enemigo se dibuja a quién
  y con qué va a atacar cada enemigo, y la celda a la que se moverá (N14).
- **Verticalidad** (N13): plataformas con altura en el mapa; desde arriba se ignora la cobertura
  baja; saltar cuesta movimiento; caer hace daño; el vuelo lo ignora.
- **Decisión a 0 HP, mutilación e implantes** (N12): con la regla de caída de `MISSION_DESIGN`.

---

## 4. El combate de naves: el comandante

Nuevo módulo `src/fleet/` (puro, como los demás), **sin dados de 5e**: cada acción muestra su
**probabilidad** y se resuelve con el RNG sembrado (N3 decide si hay azar o es fijo).

- **Escala** (N1): la nave nodriza del jugador más sus **naves pequeñas** (cazas, corbetas, los
  mechas en el espacio) contra naves pequeñas y una **insignia** enemiga. El jugador es el
  comandante: da órdenes a cada nave por turno (mover, disparar, abordar, proteger a otra).
- **Mapa** (N2): un tablero espacial con las naves como unidades.
- **Anatomía de la nodriza**: módulos en cuadrícula. Puente (evasión de la nave), Reactor (la
  energía = los puntos de acción de la nave; sin él caen los escudos), Artillería (cañones,
  láseres, misiles), Escudos, Bahía de cápsulas / mechas (de aquí salen los abordajes), Motor (sin
  él no escapa), Enfermería, Taller. **La nave es la base del pack espacial** (`WORLD_DESIGN` 9:
  nave → nodriza → estación), así el creador de la base y el tablero de módulos son la misma
  cosa (N8).
- **Tripulación dentro** (N5): operar una estación mejora ese módulo (un artillero baja el tiempo
  de recarga; un hacker en escudos recarga más); un impacto abre **brecha, incendio de plasma o
  avería**, y hay que mover a alguien a esa sala a repararlo, dejando su estación.
- **Disparar a sistemas**: se apunta a un módulo enemigo (cañones para desarmar, motor para que no
  escape, escudos para abrirle paso al abordaje). Nada de barra de vida general.
- **Abordaje** (N6): una cápsula con el escuadrón hacia la nave enemiga; la cámara entra a los
  pasillos y empieza una **batalla terrestre normal** (`src/battle`, con dados, empujones, fuego,
  katanas, hackeos) en un mapa que es el interior de esa nave, con lo que los cañones ya
  rompieron (una sala sin oxígeno, otra electrificada). Ganar el puente o el reactor termina el
  combate naval. Mientras tanto la batalla naval sigue por turnos alternos (N6).

---

## 5. Orden de construcción (propuesta)

1. **Hielo y aceite en shinobi** (tabla de la sección 2, `ground.ts`): se juega ya, con sus
   tests y jutsu de hielo para el Agua.
2. **Empujón y embestida** con daño de colisión; objetos con etiqueta.
3. **Intenciones visibles** y más reacciones.
4. **Verticalidad** (si N13 = a).
5. **Decisión a 0 HP, mutilación e implantes** (donde N12 diga).
6. **El pack espacial** sobre la campaña (`WORLD_DESIGN` 13, paso 9) + la nave como base.
7. **`src/fleet/`**: el combate de naves y el abordaje hacia `src/battle`.
8. **Arte**: naves, mechas, interiores, con sus tarjetas de prompt.

---

## 6. Preguntas para el dueño (elegir una letra por pregunta)

**Respondidas el 2026-10-28:** `N1c N2c N3c N4a N5c N6(2) N7a N8 las dos N9c N10a N11b N12b N13a N14c N15a`.
Sus palabras: N8 *"las dos, hay las dos: nave espacial y después base o estación espacial, pero
sigues usando la nave espacial"*; N9 *"c, pero yo recomiendo ×3 del piloto"* (el cuerpo `mecha`
es tres veces la altura del piloto); N14 *"c, pregúntame a detalle esto"* (las preguntas N14.1–N14.5
abajo). N2 y N3 pedían una referencia visual y una explicación: `docs/mockups/naval-bands-concept.png`
(las bandas lejos / media / cerca, la flota y las órdenes del comandante) y "rango" = el daño es un
intervalo (12–18) que el RNG sembrado decide, visible antes de ordenar, en vez de un número fijo.
Pendiente: la letra de N6 (a solo tú abordas, b también te abordan, c las dos; el "2" ya dice que
la batalla naval sigue alternando turnos durante el abordaje).

**N14 a detalle (las intenciones visibles solo con una habilidad):**
- N14.1 ¿Qué se ve? a) a quién atacará cada enemigo · b) eso y adónde se moverá · c) eso y con qué
  habilidad (el icono).
- N14.2 ¿Quién lo tiene en shinobi? a) solo el Ojo del Mañana del Mirai (ya "ve el próximo
  movimiento" a 18 m; sería dibujarlo en el mapa) · b) también un jutsu de Spirit/Light que cualquiera
  pueda aprender · c) a + un objeto (un pergamino de un uso).
- N14.3 ¿Quién lo tiene en el espacial? a) las Ópticas Tácticas (implante de ojos) · b) un módulo
  de la nave (escáner/puente) que lo da a toda la tripulación en el abordaje · c) las dos.
- N14.4 ¿Cuánto dura y cuánto cuesta? a) pasivo, siempre, para los enemigos a la vista y en
  alcance · b) una acción adicional y chakra/energía por turno · c) pasivo en el espacio (escáner),
  con coste en tierra.
- N14.5 ¿La insignia enemiga en el combate naval muestra sus intenciones? a) sí, siempre (eres el
  comandante y tienes escáner) · b) solo si tu puente está intacto · c) nunca: es la niebla de guerra.


**N1. Escala del combate naval.**
a) Nodriza contra nodriza (como FTL). b) Flota: tu nodriza + naves pequeñas (cazas, corbetas, mechas) contra naves pequeñas y una insignia; tú eres el comandante. c) Las dos, según la misión (una patrulla es a, una batalla grande es b).

**N2. El tablero espacial.**
a) Visto desde arriba, en cuadrícula, cada nave una unidad con alcance y arco de disparo. b) Lateral 2.5D como nuestras batallas de hoy (mismo renderer, las naves como sprites grandes). c) Sin tablero: distancia por bandas (lejos / media / cerca) y las naves en fila, como FTL.

**N3. El azar en el combate naval.**
a) Cero azar: daño y efectos fijos, intenciones visibles. b) Probabilidades visibles (impacto 72 %, crítico 10 %) resueltas con el RNG sembrado; el daño sí es fijo. c) Como b pero también el daño en rangos.

**N4. El turno naval.**
a) Por turnos: la nave gasta la energía del reactor como puntos de acción; cada nave pequeña tiene su turno. b) Tiempo real con pausa (FTL). (Recomiendo a: todo el juego es por turnos.)

**N5. La tripulación durante el combate naval.**
a) Órdenes por turno: mover a un tripulante a una sala cuesta una acción de la nave. b) Asignación: pones a cada uno en su estación al empezar y van solos a reparar (tú eliges a quién mandar cuando hay brecha). c) a+b: asignación inicial y órdenes puntuales.

**N6. El abordaje.**
a) Solo tú abordas: la cápsula abre la batalla terrestre en la nave enemiga. b) También te abordan a ti: la batalla terrestre es defender tu nodriza. c) Las dos. Y mientras dura el abordaje, ¿la batalla naval se pausa (1) o sigue alternando turnos (2)?

**N7. El interior de la nave como mapa de batalla.**
a) Lateral por cubiertas (nuestro 2.5D, los pisos como verticalidad). b) Desde arriba.

**N8. La nave del jugador es la base del pack espacial** (su cuadrícula de módulos es a la vez el creador de la base de `WORLD_DESIGN` 9b y el tablero de combate).
a) Sí. b) No, la base es la estación y la nave es aparte.

**N9. Los mechas.**
a) Unidades grandes en la batalla terrestre (un cuerpo `mecha`, ~2× la altura, con piloto). b) Solo en el espacio, como naves pequeñas. c) Las dos.

**N10. Hielo y aceite en shinobi.**
a) Ahora, al motor de hoy, con jutsu de hielo en el Agua (como el vapor). b) Después, junto con el pack espacial.

**N11. El daño del empujón al chocar.**
a) Fijo por casilla que faltaba por recorrer (p. ej. 3 por casilla). b) Dados según el obstáculo (muro 2d6, unidad 1d6 a cada uno, caída 1d6 por piso), fiel al 5e. c) Fijo por obstáculo (muro 6, unidad 4, precipicio: fuera).

**N12. Decisión a 0 HP, mutilación e implantes.**
a) Solo en el pack espacial (cibernética). b) También en shinobi: retirarse mutilado y un "implante" del santuario o de la forja (brazo de madera, ojo de clan trasplantado). c) En shinobi solo la retirada con cicatriz, sin implantes.

**N13. Verticalidad.**
a) Plataformas y pisos en el mapa de hoy (saltos, caídas, desde arriba se ignora la cobertura baja; vuelo). b) No por ahora.

**N14. Intenciones visibles del enemigo.**
a) En todas las batallas (se ve a quién atacará cada enemigo y adónde se moverá). b) Solo en el combate naval. c) Solo con una habilidad u objeto (el Ojo del Mañana del Mirai ya "ve el próximo movimiento": sería ampliarlo).

**N15. Reacciones en el turno enemigo.**
a) Pausa y pregunta con cada disparador nuevo (proyectil entrante, enemigo a la vista, aliado golpeado), como hoy con Evasión y Kawarimi. b) Reacciones preconfiguradas en la ficha ("siempre bloquear misiles"), sin pausa.
