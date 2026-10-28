# Tarjetas de prompt: el preámbulo fijo, los lotes y cómo "entrenar" al generador

Una tarjeta por lote. Se pega tal cual en el generador de imágenes, con sus adjuntos. Lo que
importa de verdad son tres cosas: **PNG**, **fondo magenta puro** (y nada magenta ni morado en el
dibujo) y **vista 3/4 frontal**; la rejilla y la escala las arregla el convertidor
(`sheet-from-template.py --auto-grid`, con los metros de cada pieza en el spec).

---

## 0. Cómo entrenarlo (se hace una vez)

Un generador de chat no se entrena: **se le da siempre lo mismo**. Tres cosas, y las respeta cada
vez mejor porque las tiene delante:

1. **Un proyecto o conversación fija** para el juego (en el generador: un "proyecto" o un chat
   que no se cierra, con instrucciones personalizadas si las tiene). Ahí se pega **el preámbulo**
   de abajo como instrucción permanente.
2. **Dos imágenes que viven en ese proyecto** y se adjuntan en cada lote:
   `REFERENCIA_DE_ESTILO.png` (objetos reales del juego junto a Solen, con las reglas escritas y
   un ejemplo de lo que no se quiere) y la **plantilla** del lote.
3. **Memoria de lo bueno:** cuando una hoja sale bien, se le dice *"así; esta es la referencia de
   ahora en adelante"* y se guarda esa imagen en el proyecto. Cuando sale mal, no se discute: se
   repite la tarjeta con la corrección en una sola línea ("vista frontal, no isométrica").

### El preámbulo (instrucción permanente del proyecto)

```
Eres el artista de sprites de un juego de pixel art de 16 bits (RPG táctico 2.5D de vista
lateral). Todo lo que dibujes debe verse como la imagen REFERENCIA_DE_ESTILO.png que tienes:
- Vista 3/4 FRONTAL: el frente del objeto de cara al espectador, la tapa vista un poco desde
  arriba. NUNCA isométrico ni en diagonal de 30 grados.
- Luz desde arriba a la izquierda. Línea negra de 1 px alrededor de cada objeto.
- Colores planos a bandas: 3 o 4 tonos por material. Sin degradados, sin anti-alias, sin brillo
  suave, sin texturas de ruido. Formas grandes y legibles; nada de detalle diminuto.
- Fondo magenta puro (#FF00FF) y plano. Nada en el dibujo puede ser magenta, rosa fuerte ni
  morado: esos tonos se tratan como fondo y desaparecen.
- Sin sombra proyectada en el suelo, sin personas, sin texto ni marcas dentro de las celdas.
- Una pieza por celda de la plantilla, centrada, apoyada en el borde inferior de su celda, sin
  salirse. La rejilla la puedes rehacer, pero el orden de las celdas se respeta.
- Entrega siempre PNG, sin comprimir a JPG.
Cuando te dé una lista numerada de piezas, dibuja exactamente esas, en ese orden.
```

---

## 1. Hoja de prueba (lote 0) · hecha el 2026-10-27

Patio shinobi simplista: mesa baja, brasero, tarima, farol de piedra, banco, jarras de sake,
sombrilla. Salió **bien de estilo** y el convertidor la dejó en el juego. Lo que enseñó, ya
corregido arriba: no respetó la plantilla (rejilla propia, figura redibujada, jarras de un
metro), dibujó mesa, tarima y banco en isométrico, y metió 29 000 colores con anti-alias.

---

## 2. Lote casino shinobi · A) los props

Adjuntos: `REFERENCIA_DE_ESTILO.png` y `plantilla_casino_3x3.png`. Spec: `casino-spec.json`.

```
LOTE CASINO · casa de té y apuestas de la aldea · 8 props · estilo: madera oscura y laca roja
Adjunto la referencia de estilo y la plantilla (rejilla 3×3, fondo magenta, figura de escala en la
celda 0). Sigue el preámbulo del proyecto: vista 3/4 FRONTAL (no isométrica), línea negra de 1 px,
colores planos a bandas, fondo magenta puro, sin morados, sin sombras, sin personas, PNG.
Piezas (una por celda, en este orden, cada una apoyada en el borde inferior de su celda):
 1  mesa de juego: mesa baja cuadrada de madera oscura con un tapete rojo y dados y fichas encima
 2  mesa de bacará: mesa larga y baja con tapete verde oscuro, un zapato de cartas y fichas,
    vista de frente a lo largo
 3  barra: mostrador largo de madera oscura visto de frente, con una repisa detrás con jarras de
    sake, botellas y tazas
 4  taburete de madera redondo, sencillo
 5  farol colgante de papel rojo con una cuerda arriba (cuelga del techo; dibújalo entero con
    la cuerda)
 6  cofre de hierro con remaches y candado grande, cerrado
 7  escalera de madera recta que sube a un altillo, vista de frente, con barandal a la derecha
 8  biombo de tres paneles con pinturas de grullas, de pie, visto de frente
Vista frontal en todas: nada de 30 grados. Formas grandes; sin detalle diminuto.
Entrega: PNG al tamaño de la plantilla o mayor.
```

Al recibirla:

    python3 -I tools/refs/sheet-from-template.py <su.png> tools/refs/template/casino-spec.json --out <staging> --review <hoja.png> --auto-grid

## 2. Lote casino shinobi · B) el fondo

El fondo no va en plantilla de celdas: es **una pintura** del local vacío (los props se ponen
encima en el juego), en **16:7** (960 × 420 px de juego; se pide a 1920 × 840 o lo más cercano que
dé el generador; si solo da 16:9, se recorta). Adjunto: `REFERENCIA_DE_ESTILO.png` (para la luz y
las bandas) y, si existe, el fondo del campamento del juego (`src/assets/scenes/camp_night/`,
compuesto) como ejemplo de un fondo nuestro.

```
FONDO · interior de la casa de té y apuestas de la aldea, de noche · 16:7 (1920×840)
Pintura de fondo de un juego de pixel art de 16 bits, vista lateral (como un escenario de teatro
visto de frente, con algo de profundidad hacia atrás). El local está VACÍO: sin muebles sueltos,
sin personas; los objetos se añaden después.
Qué se ve: suelo de tablones de madera oscura ocupando el tercio inferior; al fondo, una pared de
paneles de papel (shoji) con marcos de madera, iluminada por dentro con luz cálida; a la derecha,
un altillo de madera con barandal al que sube una escalera (deja la escalera solo insinuada, el
objeto va aparte); vigas de madera arriba; dos o tres faroles de papel rojos colgando, apagados o
tenues; a la izquierda, una entrada con cortina noren azul oscuro.
Luz: cálida y baja, desde los faroles; sombras suaves hacia abajo. Paleta corta: maderas oscuras,
rojo laca, crema del papel, azul noche; 3 o 4 tonos por material, a bandas, sin degradados finos.
Sin texto. Sin magenta ni morado en ningún lado. Entrega: PNG.
```

Al recibirlo lo cuantiza `scene_kit` a 960 × 420 y lo verás montado con Solen y los props.

---

## 3. Qué hacer si vuelve a desobedecer

| Si sale… | Se le dice (una línea, sin discutir) |
|---|---|
| isométrico | "Repite la hoja con las caras de frente, como la caja de la referencia; nada de 30 grados." |
| con degradados / mucho detalle | "Repite con 3 o 4 tonos por material y formas más grandes; sin anti-alias." |
| con morados o rosas | "Quita todo tono magenta, rosa fuerte o morado del dibujo; solo el fondo es magenta." |
| con sombras en el suelo | "Sin sombra proyectada; el objeto termina en su base." |
| piezas que se salen de la celda | "Cada pieza entera dentro de su celda; si no cabe, hazla más chica, la escala la ajusto yo." |
| JPG | "Descárgala en PNG." (o se descarga el PNG a mano desde la imagen) |

---

## 2b. Lote casino · segunda vuelta (2026-10-27): lo que faltó

Dos generadores hicieron la hoja. Se toman mesa de juego, bacará, barra y biombo del segundo
(más carácter), farol y cofre del primero (más limpios). Se repiten cinco piezas, y las mesas y la
barra **más grandes: para cinco personas cada una** (el dueño). El spec ya lleva los metros nuevos
(mesa de juego 2.6 m, bacará 3.2 m, barra 4 m).

```
SEGUNDA VUELTA · casino · 5 piezas · plantilla 3×3 (usa las celdas 1 a 5; las demás vacías)
Sigue el preámbulo: vista 3/4 FRONTAL, línea negra de 1 px, colores planos a bandas, fondo
magenta puro, SIN SOMBRA en el suelo, sin morados, sin personas, entrega en PNG (no JPG).
IMPORTANTE: las mesas y la barra son GRANDES, para que quepan mínimo 5 personas en cada una:
largas, con sitio de sobra; la figura de la celda 0 mide 94 px y a su lado una mesa debe verse
de 2.5 a 3 veces su ancho.
 1  escalera al altillo, VISTA DE FRENTE: los escalones son barras horizontales una encima de
    otra, cada una un poco más atrás, con un barandal a la derecha; nada de diagonal ni isométrico
 2  taburete de madera redondo, grueso: asiento ancho y patas gruesas, sin sombra
 3  mesa de juego larga para 5 personas: baja, de madera oscura con cabezas de león talladas en
    los extremos, tapete rojo con dados y fichas; vista de frente a lo largo
 4  mesa de bacará larga para 5 personas: con cabezas de dragón talladas en los extremos, tapete
    verde oscuro con un zapato de cartas, cartas y fichas; vista de frente a lo largo
 5  barra larga para 5 personas: mostrador de madera oscura visto de frente, con una repisa detrás
    con jarras de sake, botellas (sin morados) y tazas; más larga que alta
Cada pieza entera dentro de su celda, apoyada en el borde inferior; si no cabe, hazla más chica,
la escala real la pongo yo.
```

**Nota del dueño (2026-10-27):** el tapete de la mesa de bacará debe decir **BANKER** y **PLAYER**
en grande, las dos opciones, para que se entienda de un vistazo. Vale para la mesa en primer
plano (`WORLD_DESIGN.md` 5b): se pide aparte, a doble resolución, cuando toque esa escena.

## 2c. Lote casino · el fondo (tarjeta final, con lo aprendido)

```
FONDO · interior de la casa de té y apuestas de la aldea, de noche · PANORÁMICO 16:7 (1920×840)
Pintura de fondo para un juego de pixel art de 16 bits de vista lateral (2.5D): como un escenario
de teatro visto de frente, con profundidad hacia atrás, NO isométrico. Sigue la referencia de
estilo adjunta para la luz y las bandas de color.
El local está VACÍO: sin muebles sueltos, sin personas, sin mesas ni barra ni taburetes (los
objetos se ponen después, encima). Solo la arquitectura y la luz.
Qué se ve, de abajo arriba:
- el tercio inferior es el SUELO de tablones de madera oscura, visto en perspectiva suave, que
  llega hasta el borde de abajo de la imagen (ahí van a pisar los personajes);
- al fondo, una PARED de paneles de papel (shoji) con marcos de madera oscura, iluminada por
  dentro con luz cálida, con un rótulo de tela sin letras;
- a la DERECHA, un ALTILLO de madera con barandal, al que sube una escalera recta pegada a la
  pared (la escalera solo insinuada en la pared, sin volumen hacia adelante);
- a la IZQUIERDA, la entrada con una cortina noren azul oscuro y un farol de pie;
- arriba, VIGAS de madera y dos o tres faroles de papel rojos colgando, tenues.
Luz: cálida y baja desde los faroles; sombras suaves hacia abajo; el techo oscuro.
Paleta corta: maderas oscuras, rojo laca, crema del papel, azul noche; 3 o 4 tonos por material,
en bandas planas; sin degradados finos, sin ruido, sin brillos suaves.
PROHIBIDO: texto o letras, personas, muebles, magenta, rosa fuerte o morado en cualquier parte.
Entrega: PNG a 1920×840. Si solo puedes 16:9, hazla a 1920×1080 con lo importante en el centro
y yo la recorto.
```

## 4. Fondo · el patio de la carne asada (casa media shinobi) · clase "vacío + props"

Adjuntos: `casino-backdrop-v3-owner-reference.png` (el casino aprobado, como ejemplo de la
calidad y de la vista) y `REFERENCIA_DE_ESTILO.png`. Mismos dos motores compitiendo.

```
FONDO · el patio trasero de una casa media de la aldea shinobi, al atardecer, preparado para una
carne asada · PANORÁMICO 1920×840
Misma calidad, misma vista y misma forma de pintar que la imagen del salón de apuestas que
adjunto: pintura detallada de alta resolución, vista lateral de frente con profundidad hacia atrás
(como un escenario), NO isométrico, para un juego con personajes de pixel art de 16 bits encima.
El patio está VACÍO de muebles: SIN mesas, SIN brasero, SIN bancos, SIN faroles de pie, SIN
sombrillas y SIN personas (esos objetos se colocan después, encima). Solo el lugar y la luz.
Qué se ve, de abajo arriba:
- el tercio inferior es el SUELO del patio: tierra apisonada y losas de piedra planas, con hierba
  corta en los bordes, hasta el borde de abajo de la imagen; una zona central despejada y amplia;
- al fondo, la CASA: una casa de madera de la aldea, de un piso con tejado de tejas oscuras, con
  una terraza de madera (engawa) corrida a lo largo con puertas corredizas de papel abiertas e
  iluminadas por dentro con luz cálida;
- a la IZQUIERDA, el muro del patio de piedra y madera con una puerta de jardín, y un árbol grande
  (un arce rojo o un cerezo) que cuelga sobre el patio;
- a la DERECHA, un estanque pequeño con una linterna de piedra fija junto al muro y bambú;
- detrás de la casa, las copas de los cedros del bosque y, al fondo, las montañas con el cielo
  del atardecer (naranja bajando a azul); los primeros faroles de papel colgando de la terraza.
Luz: atardecer cálido desde la izquierda, sombras largas y suaves; las puertas de la casa
iluminan la terraza. Paleta: maderas cálidas, piedra gris, verdes del jardín, el rojo del arce,
el cielo naranja-azul.
PROHIBIDO: texto o letras, personas, muebles sueltos, magenta, rosa fuerte o morado.
Entrega: PNG a 1920×840.
```

Con el fondo, el juego pone encima: mesa baja, brasero, tarima, banco, jarras y sombrilla del
lote 0 (los props de píxel ya convertidos), más la gente. Es la primera escena de la carne asada.

## 5. Props HD del patio (casa media) · misma calidad que el fondo

Adjuntos: `patio-backdrop-owner-reference.png` (el patio aprobado: su luz y su pincel son los
de estas piezas) y `plantilla_4x2.png` (solo por la rejilla; la escala la pongo yo).

```
PROPS DEL PATIO · 7 piezas · misma pintura y misma luz que el patio al atardecer que adjunto
Pinta cada objeto EXACTAMENTE con el estilo, el detalle y la luz del patio adjunto (atardecer
cálido desde la izquierda), como si lo hubieras recortado de ese cuadro: alta resolución, no
pixel art. Vista 3/4 FRONTAL como los objetos del patio (el frente de cara, la tapa un poco desde
arriba), NO isométrico.
Cada objeto sobre FONDO MAGENTA PURO (#FF00FF), uno por celda de la rejilla adjunta, entero
dentro de su celda, apoyado en el borde inferior de su celda. SIN sombra proyectada en el suelo,
SIN personas, SIN texto. Nada magenta, rosa fuerte ni morado dentro de los objetos.
 1  mesa baja de madera para sentarse en el suelo, larga para 5 personas, con tazas y una tetera
 2  dos cojines de suelo rojos con un bordado sencillo, uno junto al otro
 3  banco de madera largo, para 3 personas
 4  tarima de madera baja para bailar, rectangular, con un farol de papel en cada esquina,
    larga para 5 personas
 5  dos jarras de sake de cerámica y tres tazas
 6  farol de pie de madera y papel, encendido, con luz cálida
 7  sombrilla de papel roja grande, abierta, clavada en el suelo
Entrega: PNG al tamaño de la plantilla o mayor.
```

## 6. La mesa de bacará en primer plano · el fondo pintado completo

Su imagen objetivo: `bacara-scene-target-owner-reference.png`. Para el juego hace falta **la misma
imagen sin la gente y sin la interfaz** (los personajes son sprites y la interfaz la dibuja el
juego). Se pide al mismo generador, con esa imagen adjunta:

```
MISMA ESCENA, misma mesa, misma sala, misma luz y mismo encuadre que la imagen adjunta, pero
VACÍA: quita a las cinco personas (los cuatro jugadores y el crupier), quita todas las fichas, las
cartas y el zapato de cartas de la mesa, y quita todos los textos y paneles de interfaz (los
rótulos de arriba, las cartas grandes, los cuadros con nombres, el menú de acciones).
Deja: la mesa de bacará completa con su tapete rojo y los rótulos PLAYER · TIE · BANKER pintados
en el tapete, las cabezas de dragón talladas, las cinco sillas vacías (cuatro de jugador y la del
crupier en medio), la sala al fondo con sus faroles y la gente lejana borrosa.
Panorámico 16:9, 1920×1080, PNG, sin magenta ni morado.
```

Y aparte, en plantilla magenta, **las piezas móviles** (fichas de cuatro colores en pilas de 1,
3 y 6; las cartas de la baraja; el zapato de cartas) como props HD, para que el juego las ponga y
las mueva. Las **poses** (sentado a la mesa con las manos en el tapete, contar fichas, taparse la
boca, echarse atrás; el crupier repartiendo en 2 cuadros; el chaleco rojo del crupier como atuendo
social) son una hoja de pintura sobre nuestro render, no una lámina de props.
