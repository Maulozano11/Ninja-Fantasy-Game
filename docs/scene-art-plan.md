# Plan de arte: escenas, bases y props (y cómo producirlos sin ahogarnos)

> **Propuesta para el dueño, 2026-10-27.** Responde a su pregunta de cómo hacer de forma
> eficiente todos los sprites que piden `WORLD_DESIGN.md` 5, 5b, 9b y 9c (fondos de escena,
> objetos, la carne asada en estudio / casa media / lujo en sus tres estilos, por universo), si
> puedo conectarme a su generador de imágenes, y si el sistema actual de sprites de personajes
> es eficiente o puede mejorar. Preguntas al final (A1–A5).

---

## 1. Cómo se hace el arte hoy, y qué cuesta

**Lo que funciona muy bien y hay que conservar:**

- **El motor de sprites por capas** (`src/sprite/`): un personaje es cuerpo + ítems + colores; cada
  ítem se dibuja una vez y sirve en 3 cuerpos × 16 poses, con `retintHex` para los colores del
  jugador y `PaintedPiece` para poner **los píxeles del dueño** en el rig sin redibujar. Es la razón
  por la que el creador tiene miles de combinaciones con unas decenas de dibujos. **La base se hace
  igual** (WORLD_DESIGN 9c): locación + casa + materiales + props + colores.
- **`scene_kit.py`**: las escenas pintadas (campamento, bosque del creador) ya se componen por
  capas con **materiales** (una rampa de color + textura), cuantizadas a paleta, con luz de luna y
  de fuego por código. Mármol, granito, troncos, cobre y oro son exactamente eso: materiales.
- **La regla de copiar sus píxeles** y la hoja "Tu dibujo / En el juego" en cada entrega.

**El cuello de botella:** cada lámina suya ha necesitado **un convertidor a medida**:
`tools/refs/` tiene **121 scripts, 42 000 líneas**, de 300 a 750 líneas cada uno. Todos resuelven
lo mismo, cada vez desde cero, porque cada lámina llega distinta:

| Problema de la lámina | Lo que cuesta en el script |
|---|---|
| **JPEG** | Suavizado gaussiano, "anillo oscuro" alrededor de cada trazo, colores que no son los suyos |
| **Escala desconocida** (1.0875, 19.32, 2.6 px de imagen por px de juego…) | Medir su personaje, deducir el factor, a veces por panel |
| **Fondo y marcos variables** (#20202a, bordes, etiquetas, su personaje de referencia dentro del panel) | Clasificar píxel a píxel qué es dibujo y qué es fondo |
| **Sin rejilla fija** | Localizar cada panel a mano (coordenadas escritas en el script) |
| **Cuantización por lámina** | Median-cut, k-means, familias de color, otra vez |
| **Partes sin separar** (un efecto entero en un panel) | Cortar piezas a mano para animarlas |

Resultado: cada lámina es **una sesión de trabajo** antes de ver nada en el juego. Con las
adiciones de `WORLD_DESIGN.md` (5 locaciones, 3 estilos, materiales, 40 props, casino, nave) eso
no escala. La solución no es dibujar menos: es **que todas las láminas lleguen iguales**, para que
las convierta **un solo script**.

---

## 2. La respuesta corta sobre su generador de imágenes

- **No me puedo conectar a su suscripción.** Una suscripción de chat no tiene una puerta para que
  otro programa la use, y desde esta sesión no salgo a internet salvo a los registros de paquetes.
  Así que **el flujo es el que él propone en segundo lugar**: yo le mando la **tarjeta de prompt**
  (sección 4) y la **plantilla en blanco**, él genera la imagen, me la manda, y de ahí todo es
  automático: conversión, hoja lado a lado, integración cuando él aprueba.
- **Si más adelante quiere automatizarlo de verdad**, lo que existe es una **clave de API de
  imágenes** (pago por imagen, aparte de la suscripción; la que tiene no sirve para eso). Con ella
  puedo dejar un script en `tools/` que corra **en su computadora** (no desde aquí): manda la
  tarjeta de prompt, guarda el PNG en la plantilla y lo convierte. Es una dependencia y un coste
  nuevos, así que es decisión suya (A2). Mi consejo: **primero la plantilla y el convertidor** con el
  flujo manual, y automatizar solo cuando tengamos dos o tres lotes aprobados y sepamos que las
  tarjetas de prompt producen lo que queremos a la primera.
- **Lo que un generador de imágenes hace bien y mal para nosotros**, para no pelearnos con él:
  - **Fondos pintados** (960 × 420, una locación): **muy bien.** No hace falta que sea pixel art
    exacto: se cuantiza a paleta y se baja de escala con `scene_kit`, como el campamento. Aquí su
    generador nos ahorra más que en ningún otro sitio.
  - **Props medianos** (una mesa, un asador, un yate: 30–200 px de juego): **bien**, si va en la
    plantilla a escala entera y fondo plano. El convertidor los deja limpios.
  - **Partes de personaje** (una armadura de 40 px sobre el rig): **regular.** A esa escala cada
    píxel importa y un generador "inventa" el detalle. Para esto lo que funciona es lo que ya se
    hace con sus repintados: **pintar encima de nuestro render** (sección 6).
  - **Animaciones**: mal. Los cuadros no son coherentes entre sí. Se pide **el cuadro clave** y la
    animación la hace el código, como ya se hace con los jutsu.

---

## 3. Una plantilla para todas las láminas, y un convertidor para todas

**La plantilla** (`tools/refs/template/`, yo la genero; él la usa como imagen de partida o la
describe en el prompt):

- **PNG, nunca JPEG.** Esto solo quita la mitad del código de cada convertidor.
- **Fondo plano de color clave** (magenta `#FF00FF`): lo que no es dibujo es exactamente ese
  color. Sin degradados, sin viñetas, sin texturas de fondo.
- **Rejilla fija**: celdas de **1024 × 1024 px de imagen = 128 × 128 px de juego** (factor **8**,
  entero). Una pieza por celda; una pieza grande ocupa varias celdas seguidas (el yate, 2 × 1; un
  fondo, la lámina entera a 960 × 420 × 8 no cabe, así que los fondos van en **su propia plantilla**
  a factor 2: 1920 × 840).
- **La figura de referencia** impresa en la celda 0: nuestro ninja de 94 px (752 px de imagen) de
  pie, para que el generador **calibre la escala** y la vista (3/4, luz arriba-izquierda). Se queda
  en la lámina y el convertidor la ignora.
- **Las etiquetas fuera de la celda**, en la franja de abajo, nunca encima del dibujo.
- **La base del objeto en el borde inferior de la celda** (ahí está el ancla al suelo) y **sin sombra
  proyectada** (el juego la pone, como a los personajes).
- **Paleta corta**: hasta 24 colores por pieza, sin anti-alias, sin brillo suave. Si viene con
  anti-alias, el convertidor lo quita por mayoría; si viene con degradados, se cuantiza y queda a
  bandas: así es el estilo, así que mejor pedirlo ya a bandas.

**El convertidor** (`tools/refs/sheet-from-template.py`, uno para siempre):

1. Lee la lámina y **encuentra las celdas por la rejilla** (no hay coordenadas que escribir).
2. **Quita el fondo por color clave** (con tolerancia para el borde) y las etiquetas.
3. **Baja de escala por mayoría** en bloques de 8 × 8 (no promedio: los bordes se quedan duros, como
   hace `scene_kit.resolve`).
4. **Cuantiza** a la paleta del grupo (la del estilo: simplista / elegante / lujo, o la del
   universo), con median-cut sobre sus píxeles, igual que hoy pero una sola vez.
5. **Pone la línea de 1 px** del estándar (`solid-outline.ts`) si la pieza es sólida; nada si es
   luz o humo (la etiqueta de la celda lo dice: `prop`, `glow`).
6. Escribe el **grupo** como hoy (`src/assets/world/<grupo>/` con sheet + `manifest.json`, vía
   `writeGroup`) y la hoja **"Tu dibujo / En el juego"** al 4× con etiquetas en español.
7. **Prueba de ida y vuelta**: recompone cada pieza convertida a 8× sobre magenta y mide cuánto se
   aleja de su lámina; si una celda se desvía más de lo normal, lo dice (anti-alias, degradado,
   algo fuera de la celda).

Lo primero que haría con él es **re-convertir una lámina suya que ya está en el juego** (una hoja
de iconos, que ya vienen en rejilla) y comparar con lo aprobado: si sale igual, el convertidor
está bien; si no, se ajusta antes de usarlo en nada nuevo.

---

## 4. La tarjeta de prompt (lo que yo le mando por lote)

Una tarjeta por lote, corta, siempre con la misma estructura, para que él la pegue tal cual:

```
LOTE 3 · Patio de lujo, estilo elegante · universo: superhéroes (Los Cabos)
Plantilla: adjunta (rejilla 4×2, fondo magenta, figura de referencia en la celda 0).
Estilo: pixel art 16 bits, vista 3/4 desde la derecha, luz desde arriba a la izquierda,
línea negra de 1 px, colores planos a bandas (sin degradados ni anti-alias), fondo magenta puro.
Escala: la figura de la celda 0 mide 94 px de juego; todo a esa escala.
Celdas:
 1  mesa de patio elegante, mantel blanco, 4 sillas, madera clara y hierro negro (1 celda)
 2  asador de obra en piedra clara con parrilla y brasas (1 celda)
 3  alberca infinita vista 3/4, agua turquesa a bandas, borde de mármol (3 celdas de ancho)
 4  pista de baile de madera con luces de piso apagadas (2 celdas)
 5  pérgola blanca con enredadera (2 celdas)
 6  dos camastros con toalla doblada (1 celda)
Sin personas, sin sombras proyectadas, sin texto dentro de las celdas, cada objeto apoyado
en el borde inferior de su celda. Entrega: PNG.
```

Él genera, mira, repite si hace falta (es su ojo de director de arte el que decide), y me manda
el PNG. Si el generador no respeta la rejilla a la primera, se le pide **una pieza por imagen** y el
convertidor las junta: el factor y el fondo son lo que importa, la rejilla es comodidad.

---

## 5. Inventario: cuántas piezas son de verdad

Contadas con el sistema por capas de `WORLD_DESIGN.md` 9c. La comparación importa: **pintar una
escena por combinación** sería 5 locaciones × 3 niveles × 3 estilos × 6 paredes × 5 techos × 3
universos ≈ **4 000 escenas**. Por capas:

| Capa | Piezas | Cómo se hace | Quién |
|---|---|---|---|
| **Fondos de locación** | Shinobi 5 (claro del bosque con río y montañas, barrio alto, acantilado, casa del clan, barracón) + Superhéroes 5 (bosque, penthouse NY, Los Cabos con el Arco, mansión tradicional, estudio) + Espacial 4 (hangar por casco) + 2 (planeta) = **16 pinturas** | Su generador a 1920 × 840 → `scene_kit` cuantiza a 960 × 420. **Día / tarde / noche por paleta**, no por pintura (×3 gratis) | IA + código |
| **Casa (silueta)** | 3 niveles (estudio, casa media, mansión) × 3 universos = **9 siluetas** (la nave aparte) | Dibujadas por capas con `scene_kit` o su generador en plantilla de factor 2; **sin color propio**: la silueta lleva índices de material | IA o código |
| **Materiales** | Paredes 6 + techos 5 + suelos 3 = **14 rampas con textura** | **Solo código** (`Mat` de `scene_kit`): cobre y oro son dos rampas más. Cero dibujos | código |
| **Props de patio** | 8 tipos (mesa, asador, alberca, pista, pérgola, jardín, camastros, barra) × 3 estilos = **24**; los universos comparten la mayoría (una pista es una pista); shinobi cambia 4 (mesa baja, brasero, estanque, tarima) = **28** | Plantilla factor 8 | IA |
| **Juguetes** | deportivo ×2, helicóptero, yate, caballos, carruaje, barco, mecha aparcado = **8** | Plantilla factor 8 (piezas de 2–3 celdas) | IA |
| **Seguridad** | **0 sprites nuevos**: son personajes del motor con 2 atuendos por universo (guardia, escolta) = **6 ítems de ropa** | Como cualquier ítem del creador (sección 6) | pintar sobre render |
| **Menú de la carne asada** | 15 platos pequeños (32 px) en una lámina | 1 plantilla | IA |
| **Casino** | 1 fondo por universo (3) + props: mesa de póker, mesa de bacará, barra, taburete, lámpara, ruleta de adorno, caja fuerte, escalera = **8 props** + el **mapa de batalla** del casino (3, uno por universo, con `tools/maps/`) | Fondo IA; props plantilla; mapa código | mixto |
| **Fans y gente sin hoja** | 0 nuevos: personajes del motor con ropa de civil (**4 ítems** por universo) | ítems | pintar sobre render |
| **Nave (pack espacial)** | Exterior: 4 cascos + alas 3 + motores 3 + armas 6 + escudos 3 = **19 piezas** (como ítems: cada una con ranuras de color). Interior: **12 módulos** como baldosas de habitación vistas en corte, estilo casa de muñecas, 1 por módulo (el tamaño de la nave solo cambia cuántas caben) | Plantilla factor 8 (exterior) y 4 (interior) | IA |
| **Felicitaciones de hazaña** | 2 pinturas fijas (el presidente, la federación) + marcas en fondos existentes | IA a 1920 × 840 | IA |

**Total: unas 160 piezas de IA y 14 materiales de código** para todo lo descrito, incluida la nave.
El motor compone el resto. Para **la primera carne asada jugable** (el paso 4 de WORLD_DESIGN 13)
bastan **1 fondo, 1 silueta, 4 materiales y 6 props**: un lote.

---

## 6. El sistema de personajes: lo que mejoraría

Es bueno. Las tres mejoras son de **flujo**, no de motor:

1. **Pintar sobre nuestro render, siempre.** Lo mejor que ha pasado en el repo es cuando él
   repinta **encima de nuestra hoja** (el golpe de fuego, las poses de Lyra): la escala, el ancla y
   la pose ya están, y el convertidor solo tiene que restar. Propongo hacerlo el **estándar para
   toda parte de personaje**: yo le mando una **plantilla de pintura** (nuestro cuerpo desnudo en
   las poses necesarias, al 8×, con rejilla y fondo magenta, y el ítem viejo en gris si es un
   rediseño), él o su generador pintan la prenda encima, y `part-from-template.py` (el mismo
   convertidor con modo "parte": resta el cuerpo, recorta por hueso) la convierte en
   `PaintedPiece`s. Hoy ese mapeo se deduce a mano en cada script (`aiden_ref.py` mide 19.32 px por
   píxel); con la plantilla es un número conocido.
2. **PNG y fondo clave** también aquí. Las 40 líneas de "quitar el anillo del JPEG" desaparecen.
3. **La prueba de ida y vuelta como test.** `female-base-body-from-ref.py` ya comprueba que las
   piezas recompuestas son su dibujo píxel a píxel. Que lo haga el convertidor común para cada
   parte, y que falle en voz alta: es la garantía de "con la mayor exactitud posible" sin mirar a
   ojo cada vez.

Lo que **no** cambiaría: el rig, los `PaintedPiece`, el retint, la línea automática, los tres
cuerpos, la regla de una parte = una opción del creador.

---

## 7. Orden de los lotes

Cada lote es: una tarjeta de prompt → sus imágenes → conversión → hoja lado a lado → su sí →
integración. Un lote por sesión, como mucho dos.

| Lote | Qué | Para qué paso de WORLD_DESIGN |
|---|---|---|
| **0** | La plantilla, la tarjeta modelo y `sheet-from-template.py`, probado re-convirtiendo una hoja de iconos ya aprobada | antes de todo |
| **1** | Shinobi: fondo *claro del bosque* (día/tarde/noche por paleta), silueta *casa media*, materiales madera / piedra / teja, props simplistas: mesa baja, brasero, tarima, farol, banco, jarras | la primera carne asada (paso 4) |
| **2** | *Estudio pobre* y *mansión* shinobi; materiales mármol, granito, metal, cobre, oro; props elegantes y de lujo | la base con riqueza (paso 5) |
| **3** | Casino shinobi: fondo, 8 props, el mapa de batalla | el salón (paso 5b) |
| **4** | Ropa: guardia, escolta, 4 civiles (sobre plantilla de pintura) | seguridad y fans (paso 5) |
| **5** | Superhéroes: penthouse NY, Los Cabos con el Arco, mansión tradicional, estudio, bosque; juguetes; menú | el pack de superhéroes, cuando llegue |
| **6** | La nave: 19 piezas exteriores, 12 módulos interiores, 4 hangares | el pack espacial (paso 9) |
| **7** | Las dos pinturas de felicitación | hazañas |

---

## 8. Preguntas para el dueño

Formato: "A1a A2b…". ★ marca mi recomendación.

- **A1. ¿Su generador puede entregar PNG con fondo magenta plano?** (Casi todos pueden si se les
  pide; a veces hay que descargar en PNG a mano.)
  - a) Sí; probamos el lote 0 con una hoja de prueba. ★
  - b) Solo JPEG; el convertidor hace lo que puede y perdemos exactitud en bordes.
- **A2. ¿Automatizar con una clave de API de imágenes más adelante?**
  - a) Primero el flujo manual (él genera, me manda); se decide después de 2–3 lotes aprobados. ★
  - b) Desde ya: él consigue la clave y yo dejo el script en `tools/` para correrlo en su máquina.
  - c) Nunca; todo manual.
- **A3. Los fondos de locación, ¿cómo?**
  - a) Su generador pinta, `scene_kit` cuantiza a nuestra paleta (como el campamento, pero con su
    ojo en la composición). ★
  - b) Por código como hoy (más lento por fondo, pero coherente al 100 % con el campamento).
  - c) Mezcla: él pinta el cielo y el horizonte, el código pone suelo, casa y follaje.
- **A4. Las partes de personaje nuevas (ropa de guardia, civiles), ¿sobre plantilla de pintura?**
  - a) Sí: siempre sobre nuestro render con rejilla. ★
  - b) Como hasta ahora, lámina libre y convertidor a medida.
- **A5. ¿Los props llevan el estilo en el dibujo o en el color?**
  - a) En el dibujo: una mesa simplista, una elegante y una de lujo son tres sprites. ★ (más
    piezas, más carácter)
  - b) En el color: un sprite por prop y tres paletas (un tercio de piezas, se parecen entre sí).
  - c) Mezcla: props grandes (alberca, pista, pérgola) en el dibujo, pequeños en el color.
