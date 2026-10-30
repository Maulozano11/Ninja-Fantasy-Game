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

## 7. La crupier repartiendo: hoja de animación (5 cuadros)

Adjunta la hoja de poses sentadas (la crupier es la del medio) y el fondo vacío del bacará, para
que vea dónde está el zapato de cartas (a SU derecha, nuestra izquierda).

```
De la hoja adjunta, toma SOLO a la crupier: mujer de pelo negro recogido con adorno rojo y
kimono rojo con flores doradas. Dibújala en UNA SOLA IMAGEN como una tira de 5 cuadros en fila,
todos del mismo tamaño y en la misma posición (misma cabeza, mismo torso, misma altura; solo se
mueven los brazos), separados por espacio magenta, sin silla, sentada tras una mesa que NO se
dibuja. Misma ropa, mismo pelo, mismos colores, mismo estilo de pixel art que la hoja adjunta.
Los 5 cuadros, de izquierda a derecha, son la acción de sacar una carta del zapato de cartas que
tiene a SU DERECHA y ponerla sobre la mesa frente a ella:
 1  reposo: las dos manos apoyadas al frente a la altura del regazo
 2  el brazo derecho se extiende hacia su derecha y abajo, la mano toca el zapato (el zapato no
    se dibuja)
 3  la mano derecha vuelve hacia el centro con una carta bocabajo entre los dedos, a la altura
    del pecho
 4  el brazo derecho estirado hacia adelante, la carta ya sobre la mesa frente a ella, aún bajo
    los dedos
 5  reposo otra vez, las dos manos apoyadas, la carta ya soltada (no se dibuja)
Fondo MAGENTA puro (#FF00FF). Sin sombra, sin texto, sin mesa, sin silla, sin zapato. Nada
magenta, rosa fuerte ni morado en el dibujo. Cada cuadro de unos 450 píxeles de alto, con
margen entre cuadros. PNG.
```

Si cambia la posición del cuerpo entre cuadros, la línea para repetir es: *"el cuerpo y la cabeza
quedan exactamente iguales en los 5 cuadros; solo cambian los brazos"*.

## 8. La pantalla Casa · el fondo pintado y las piezas de interfaz

Su referencia: `docs/reference/casa-screen-owner-reference.png` (2026-10-28, su generador: la
sala del clan de noche con la interfaz encima). Como en el bacará, el juego dibuja la interfaz y
los datos: lo que hace falta es **la sala sin interfaz** y **las piezas** por separado.

**A) El fondo** (clase "pintado completo", `docs/scene-art-plan.md` 9b), con su imagen adjunta:

```
MISMA SALA, misma luz y mismo encuadre que la imagen adjunta, pero VACÍA: quita todos los
paneles, textos, barras, botones, retratos y el estandarte de la izquierda. Deja solo la sala del
clan de noche: las columnas de madera, los faroles rojos y dorados encendidos, los estandartes
rojos con el emblema dorado colgando de las vigas, el arce rojo y los bonsáis, la terraza al
fondo con las montañas y la luna. El centro de la imagen con poco detalle y algo más oscuro (ahí
van los paneles). Panorámico 16:9, 1920×1080, PNG, sin magenta ni morado.
```

**B) La hoja de piezas**, en la plantilla magenta (como `casino-ui-sheet`), fila por fila:

```
Hoja de piezas de interfaz sobre fondo magenta puro (#FF00FF), cada pieza separada, sin texto:
Fila 1: un estandarte rojo colgante con borde dorado y remate en pico, vacío (sin letras), 420×900;
el mismo estandarte en versión corta, 420×420.
Fila 2: marco de panel negro translúcido con filete dorado fino y esquinas ornamentadas, en tres
anchos (600×200, 900×300, 1200×900), el interior vacío.
Fila 3: iconos dorados de 96×96: monedas apiladas (riqueza), flor de lis (reputación), pergamino
(crónica), brújula (en casa), espadas cruzadas (salir de misión), sol/brújula (pasar la estación).
Fila 4: emblemas de facción de 96×96, un color cada uno: clan Mirai (llama, rojo), clan Kōton
(engranaje o yunque, gris acero), clan Ryusei (estrella fugaz, azul), clan Northstar (estrella
polar, blanco azulado), la aldea (puerta torii, verde), los renegados (máscara rota, negro y
rojo), el santuario del bosque (hoja de arce, naranja).
Fila 5: marcas de nivel de 48×48: triángulo verde arriba, triángulo azul arriba, rombo gris,
triángulo rojo abajo; una barra dorada vacía y una llena, 600×28 cada una.
Fila 6: botón rojo con borde dorado 600×150 y botón negro con borde dorado 600×150, vacíos.
PNG, 3200×2400, sin morado fuera del magenta de fondo.
```

**C) Las viñetas de la Crónica** (una por beat, 840×380, sin texto): la sala del clan de noche
con siluetas (la que ya está en su referencia), el patio al atardecer, el camino del bosque, la
puerta de la aldea. Se piden una a una con el preámbulo y "misma paleta que la sala del clan".

La maqueta con nuestros datos en su disposición: `docs/mockups/casa-owner-style-mockup.png`.

## 9. Los avisos de batalla (Último aliento, reacciones) y los botones · las piezas de interfaz

Su referencia: `docs/reference/last-stand-owner-reference.png` (2026-10-28, su generador: la
batalla en pausa con Lyra caída y el aviso "ÚLTIMO ALIENTO" con sus dos botones y las tres
tarjetas de resultado; *"me encanta"*). Como en el bacará y en la Casa, **el juego pone los
textos, los retratos (salen del motor de sprites) y las barras de vida**; lo que hace falta del
generador son **las piezas vacías** del marco y los botones, a tamaño de pantalla (1920×1080) para
reducirlas nosotros a 1x y 2x, como los iconos. Las figuras anime de su imagen no entran en el
juego: nuestro estándar son los sprites.

Dónde va cada pieza en el juego: el marco grande es el `Prompt` de `components/battle/hud.tsx`
(Último aliento, Desviar el kunai, Interponerse, Evasión, Kawarimi, el ataque de oportunidad);
los dos botones gema son el sí / no de esos avisos (rojo = la opción que cuesta, azul = la segura),
y el botón negro-dorado el de la barra de acciones (`hudKit.tsx`); las tarjetas pequeñas son el
resumen al cerrar la batalla y las fichas de resultado; las placas con retrato son las de la
fiesta y los enemigos arriba (`PartyFrames`).

**A) La hoja de piezas**, en la plantilla magenta (como la del casino), fila por fila. Se pega con
el preámbulo y su imagen adjunta como "misma paleta y mismo estilo de marco":

```
Hoja de piezas de interfaz de batalla sobre fondo magenta puro (#FF00FF), cada pieza separada,
sin texto, sin personajes, misma paleta y mismo estilo de marco que la imagen adjunta (negro
translúcido con rojo oscuro, filete dorado fino, esquinas ornamentadas, gemas rojas en rombo):
Fila 1: el marco grande del aviso, 1500×900, vacío por dentro: filete dorado doble, esquinas con
ornamento, una gema roja en rombo arriba al centro y otra abajo al centro, dos chispas doradas
(✦) sueltas de 64×64 para flanquear el título; y el mismo marco en versión estrecha, 900×600.
Fila 2: el botón gema rojo, 680×190, vacío (sin letras ni icono), en cuatro estados en fila:
normal, iluminado (borde dorado más brillante), pulsado (más oscuro, hundido), apagado (gris).
Fila 3: el mismo botón gema en azul, 680×190, los cuatro estados; y en dorado, 680×190, normal.
Fila 4: el botón negro con borde dorado de la barra de acciones, 150×150 cuadrado, cuatro
estados; y una ranura vacía del mismo tamaño para un icono.
Fila 5: iconos de 96×96 en dorado sobre fondo negro redondo con filete dorado: espadas cruzadas
(sacrificio), figura corriendo (retirada), calavera (muere), escudo (interponerse), hoja que
desvía (desviar el kunai), ojo abierto (ojo del mañana), tronco con hojas (kawarimi), rayo en
zigzag (reacción), reloj de arena (turno), ancla o gancho (brazo de madera).
Fila 6: la tarjeta de resultado, 900×560, vacía, en tres bordes: azul, rojo y rojo oscuro; la
placa "RESULTADO" vacía 400×60 con filete dorado; el marco de retrato cuadrado 180×180 dorado.
Fila 7: la placa de retrato con barra de vida, 520×120, vacía (el hueco del retrato a la
izquierda, el espacio de la barra a la derecha), en dos tonos: dorado (fiesta) y rojo (enemigo);
la insignia de turno 220×60 negra con borde dorado; el rombo de iniciativa 110×110 dorado vacío
y el mismo en gris (ya actuó).
Fila 8: una barra de vida vacía 400×28 y llena en rojo; una barra de chakra llena en azul; una
barra de dados de muerte: tres puntos rojos y tres verdes de 32×32, apagados y encendidos.
PNG, 3200×3200, sin morado fuera del magenta de fondo.
```

**B) Si una fila sale con texto o con figuras:** se repite solo esa fila con "sin texto, sin
personajes, solo el marco vacío" en una línea, como en el casino (sección 3).

**C) Los fondos del aviso:** el marco va sobre la batalla real, no hace falta fondo. Para la
tarjeta de resultado al cerrar la batalla sí: dos viñetas 1500×600 sin texto, "el campo de batalla
al amanecer, vacío" y "una lápida con una espada clavada bajo un arce rojo", misma paleta que la
imagen adjunta, pedidas una a una con el preámbulo.

Con la hoja convertida (`sheet-from-template.py --hd`, piezas a `src/assets/ui_battle/`), el
`Prompt` y los botones se redibujan con sus piezas; la maqueta con nuestros datos en su
disposición: `docs/mockups/last-stand-mockup.png` (la de antes, con el marco actual) y la que
haremos con las suyas.

## 10. El creador de personaje · su pantalla, adaptada a nuestro creador

Su referencia: `docs/reference/creator-screen-owner-reference.png` (2026-10-28, su generador).
De ella se queda la **disposición**: los pasos como rombos arriba, el menú de grupos a la
izquierda con el activo sobre la gema roja, una columna de accesos rápidos, el ninja grande al
centro sobre un círculo, el panel de partes a la derecha por secciones (miniaturas y muestras de
color), la tira de poses abajo con flechas, el retrato con botones pequeños, Aleatorio y
Siguiente. **Se adapta a lo que el juego tiene:** nuestros seis pasos (Origen, Clan, Clase,
Apariencia, Habilidades, Jutsus), nuestros siete grupos (Cuerpo, Cabeza, Ropa, Equipo, Arma,
Chakra, Pintura), las leyendas de acceso rápido (Solen, Romano, Aiden, Lyra, Aurelia), nuestras
11 poses; las miniaturas y el ninja los dibuja el motor de sprites, nunca el generador.
Maqueta con sus piezas de batalla de relleno: `docs/mockups/creator-owner-style-mockup.png`.

Lo que ya sirve de su hoja de batalla (tarjeta 9): las ranuras (miniaturas), los botones gema
(rojo = Siguiente, dorado = Aleatorio, azul = Volver), las chispas de los títulos, el marco del
retrato. Lo que falta se pide aquí.

**A) El fondo** (clase "pintado completo", 1920×1080), con su imagen adjunta:

```
MISMO LUGAR, misma luz y mismo estilo que la imagen adjunta, pero VACÍO: quita todos los
paneles, textos, botones, iconos, miniaturas y al personaje. Deja solo el patio del santuario de
noche: los arces rojos, los faroles encendidos, las pagodas y la puerta torii al fondo, la luna
azul grande arriba a la derecha, el agua que refleja las luces. En el centro, un poco abajo, un
círculo de piedra con un sello rojo tenue grabado (ahí se para el personaje), visto de frente y
algo desde arriba. Los lados izquierdo y derecho con poco detalle y más oscuros (ahí van los
paneles). Pixel art de 16 bits. Panorámico 16:9, 1920×1080, PNG, sin magenta ni morado.
```

**B) La hoja de piezas del creador** (plantilla magenta, como la de batalla), con su imagen
adjunta como "misma paleta y mismo estilo":

```
Hoja de piezas de interfaz del creador de personaje sobre fondo magenta puro (#FF00FF), cada
pieza separada, sin texto, sin personajes, misma paleta y mismo marco que la imagen adjunta
(negro translúcido, filete dorado fino, esquinas ornamentadas, gemas rojas):
Fila 1: el panel alto vacío 560×1100 con esquinas ornamentadas y una gema roja arriba y abajo al
centro; el panel ancho vacío 1100×320 (la tira de poses); el panel pequeño vacío 560×480.
Fila 2: el rombo de paso de 160×160 en tres estados: apagado (borde gris), disponible (borde
dorado) y activo (rojo encendido con brillo); vacío por dentro, sin icono.
Fila 3: la fila del menú de grupos, 520×90: normal (solo una línea dorada fina abajo), iluminada
(dorado tenue) y activa (gema roja con borde dorado, como el botón rojo de la imagen).
Fila 4: la cajita de muestra de color 120×56 vacía (borde oscuro) y seleccionada (borde dorado
grueso con brillo); el botón cuadrado pequeño 80×80 negro y dorado en normal y activo; la cajita
"ninguno" 120×120 con una X gris.
Fila 5: dos flechas de carrusel doradas 60×120 (izquierda y derecha) en normal y encendida; un
deslizador: la barra 400×24 negra con filete dorado y la perilla dorada 48×48.
Fila 6: la cabecera de sección 600×40: una chispa dorada a la izquierda y una línea dorada fina
que se desvanece a la derecha; el círculo del suelo 900×220 visto en perspectiva: anillo rojo
brillante con un sello tenue, sin fondo.
Fila 7: iconos dorados de 96×96 sobre círculo negro con filete dorado: figura de pie (cuerpo),
cabeza de perfil (cabeza), camisa (ropa), escudo (equipo), espada (arma), llama (chakra),
pincel (pintura), pergamino (origen), abanico o emblema de clan (clan), kunai cruzados (clase),
puño (habilidades), mano haciendo un sello (jutsus), dado (aleatorio), lupa (zoom), flechas en
círculo (girar), retrato (vista previa).
PNG, 3200×3200, sin morado fuera del magenta de fondo.
```

**C) Si algo sale con texto o con figuras:** se repite esa fila sola con "sin texto, sin
personajes, solo la pieza vacía". Si el fondo sale con el personaje, se repite A con "SIN
NINGUNA PERSONA".

Lo que de su imagen **no** hacemos todavía: *Expresión* (los sprites no tienen caras distintas;
los retratos expresivos son para las escenas sociales) y *Rotar* (el sprite es de vista 3/4 fija;
se puede girar a izquierda y derecha, no dar la vuelta). *Zoom* sí: ya existe el acercamiento a
la cara al editar la cabeza.

### 10b. La segunda versión (la que manda): tres columnas para todas las pestañas

Su referencia: `docs/reference/creator-screen-v2-owner-reference.png` (2026-10-28). Sus reglas,
con sus palabras: *"también esta forma para las otras pestañas"*, *"asegúrate de tener el botón
de color personalizado a cada cosa"* y *"las poses de abajo son las poses que ya tenemos, no esas
de ataque"*. Así queda:

- **Arriba:** el título "CREADOR DE PERSONAJE · FORJA TU PROPIA LEYENDA" a la izquierda y los
  seis pasos como **barra de pestañas** a la derecha (la activa sobre la gema roja, rombos
  pequeños entre ellas). La misma pantalla para los seis pasos: solo cambian las dos columnas.
- **Centro (fijo en todas):** el ninja con sus herramientas (acercar a la cara, voltear,
  centrar), el nombre con el dado de aleatorio, y debajo **nuestras 11 poses** con su nombre
  (Reposo, Sellos, Ataque, Arrojar, Estocada, Embestida, Combo, Lanzar, Herido, Victoria,
  Cargar). Sin "Expresiones" (los sprites no las tienen).
- **Botón de color personalizado en cada cosa:** al final de cada fila de muestras (cabello,
  ojos, piel, marcas) y junto a **cada color de cada prenda** en la *Paleta de colores*, que
  lista lo que lleva puesto, pieza por pieza y con todos sus colores (los `colors` de cada
  `ItemDef`).
- **Qué va en las columnas, por paso:**

| Paso | Izquierda | Derecha |
|---|---|---|
| Origen | Los cinco orígenes con su tarjeta | Lo que da: reputaciones, riqueza, rasgo |
| Clan | Los cuatro clanes con emblema | Sus habilidades, su naturaleza de chakra, sus ojos |
| Clase | La clase elegida en detalle (dados, salvaciones, rasgos) | Las cinco clases, el arma (con su color), el elemento del arma, el estilo de sellos |
| Apariencia | Leyendas, cuerpo, rostro, cabello y colores base | Ropa, armadura, capa (con "ninguna"), paleta de colores de todo lo puesto |
| Habilidades | Las seis características con sus botones − / + | Dotes y lo que cambia (PV, CA, chakra) |
| Jutsus | Las cinco ranuras | La lista de jutsus del rango con su icono y su carta |

Maquetas con sus piezas de batalla de relleno: `docs/mockups/creator-v2-appearance-mockup.png`,
`docs/mockups/creator-v2-class-mockup.png`.

**B2) Las piezas que añade esta versión** (pegar con el preámbulo y su imagen adjunta):

```
Hoja de piezas de interfaz sobre fondo magenta puro (#FF00FF), cada pieza separada, sin texto,
sin personajes, misma paleta y mismo marco que la imagen adjunta:
Fila 1: la pestaña de la barra de pasos 300×70 en tres estados: normal (solo una línea dorada
fina abajo), iluminada (dorado tenue) y activa (gema roja con borde dorado y rombos en los
extremos); el rombo pequeño separador 40×40 dorado.
Fila 2: el botón de color personalizado 72×72: una rueda de colores (arcoíris) dentro de un
marco cuadrado negro con filete dorado y un "+" blanco pequeño en el centro; en normal,
iluminado y pulsado. La cajita de color 72×72 vacía con filete dorado, normal y seleccionada.
Fila 3: el emblema del título 160×160 (rombo dorado con una estrella de cuatro puntas), y la
caja del nombre 700×90 negra con filete dorado y un ícono de pluma a la izquierda, vacía.
Fila 4: tres botones cuadrados 90×90 negro y dorado para las herramientas, con iconos: lupa,
flechas en círculo, mira (centrar); y el dado 110×110 dorado del aleatorio.
Fila 5: el panel de sección 1000×300 con la cabecera: esquinas ornamentadas, un círculo con
icono a la izquierda del título y una línea dorada; vacío; y el mismo en 1000×600.
PNG, 3200×2400, sin morado fuera del magenta de fondo.
```

## 11. La hidra colosal, guardiana de la fortaleza · el fondo con el cuerpo, las cabezas, los efectos

Aprobada por el dueño el 2026-10-28 en su versión básica (`docs/mockups/colossal-hydra-concept.png`):
el cuerpo **solo a la derecha** (nada a lo largo del fondo ni hacia el frente), siete cabezas (ahora **cinco**, su diseño nuevo; ver la tercera vuelta) de
**2.4 m** (eran 4.4 m, luego 3.3 m; con su tercer fondo eligió 2.4 m el 2026-10-28, donde su
cuello coincide con los cuellos pintados) en cuellos
largos **horizontales**, **mirando a la izquierda** hacia la
puerta, cada una en su carril y a 8 m o más de las otras (una Bola de fuego solo da a una).
**Mismo estilo y calidad que el casino** (sus palabras: *"que haga el mismo estilo y calidad que
el casino"*): fondo pintado HD-2D como el casino v3, piezas HD como los props del patio
(`sheet-from-template.py --hd`).

Cómo se reparte: el **cuerpo va pintado dentro del fondo** (no se ataca ni se mueve: así tiene la
calidad de la pintura), con siete hombros de donde salen los cuellos. Lo que se mueve, se corta y
recibe daño son las **cabezas con su cuello**: una sola pieza, la misma para las siete (el juego
la pone en cada carril).

**Ojo con el magenta:** la boca de la hidra pequeña es morada-rosa; aquí va **rojo oscuro**,
porque el morado se borra con el fondo magenta.

**Primera vuelta (2026-10-28):** su fondo (`docs/reference/colossal-hydra-backdrop-v1-owner-reference.png`)
tiene el estilo que queremos, pero la cámara quedó baja (el suelo solo en el tercio de abajo, unos
10 m de fondo, con punto de fuga) y los muñones apuntan hacia arriba; la culpa fue de esta tarjeta,
que pedía "perspectiva suave hasta la mitad de la imagen". La A de abajo es la corregida. Su cabeza
(B) sirve tal cual; su tira de mordida (C) sirve, pero se nota la costura con el cuello largo, de
ahí la línea nueva de C. Cómo se ve con la cámara del juego: `docs/mockups/colossal-hydra-game-camera.png`.

**Segunda vuelta (2026-10-28):** el fondo nuevo (`docs/reference/colossal-hydra-backdrop-v2-owner-reference.png`)
**funciona**: cámara alta, losas paralelas, unos 21 m de suelo y los siete muñones horizontales a
siete alturas; las cabezas caben a 8 m o más una de otra. La tira nueva
(`docs/reference/colossal-hydra-bite-strip-v2-owner-reference.png`) corta el cuello siempre al
mismo grueso y a la misma altura, y su cuello es del grueso de los muñones, así que **el cuello
largo se hace alargando el tramo final de la propia tira** (la pieza B queda solo de referencia:
su cuello es un tercio más grueso que los muñones). Montado: `docs/mockups/colossal-hydra-mounted-v2.png`.
Faltan las otras cinco tiras de C (se piden adjuntando la tira nueva) y los efectos de D.

**Tercera vuelta, el diseño nuevo (2026-10-28):** él eligió su tercer fondo
(`docs/reference/colossal-hydra-backdrop-v3-owner-reference.png`) con **5 cabezas** (*"para que no
abarque todo el mapa"*), y sus cinco poses de cabeza (`docs/reference/colossal-hydra-head-poses-owner-reference.png`):
gruñido, rugido hacia arriba, calma con la boca cerrada, siseo con la lengua fuera y rugido. En el
juego son la **quieta** (gruñido, calma y siseo alternados) y el **rugido** de antes de atacar. Todas
cortan el cuello al mismo grueso y a la misma altura, así que **ellas son la referencia de C**.
Montado: `docs/mockups/colossal-hydra-five-heads-2.4m.png` (su elección: cabezas de 2.4 m).

**A) El fondo con el cuerpo** (adjunta su primer fondo como estilo):

```
FONDO · el patio interior de una fortaleza de piedra, de noche, con una hidra colosal a la derecha · 1920×1080
MISMO estilo, pincel, paleta y luz que la imagen adjunta (pixel art HD-2D), pero con la CÁMARA ALTA:
vista táctica de batalla, la cámara elevada mirando hacia abajo unos 40°, proyección paralela SIN
punto de fuga: las juntas de las losas son líneas horizontales y verticales paralelas, y las losas
miden lo mismo arriba que abajo.
- El SUELO ocupa los dos tercios de abajo: desde un tercio de la altura hasta el borde inferior.
- El MURO de la fortaleza solo ocupa el tercio de arriba: casi no se ve cielo; almenas, torres y
  antorchas cortadas por el borde superior. El portón abierto a la izquierda.
- El CUERPO de la hidra a la derecha, en el último quinto del ancho, de arriba a abajo, apoyado en
  el suelo. De su costado izquierdo salen SIETE muñones cortados limpio, en HORIZONTAL, apuntando
  a la izquierda, cada uno a una altura distinta: tres a un 35% de la altura de la imagen, dos a un
  57%, dos a un 78%, escalonados un poco entre sí. Nada del cuerpo hacia el frente ni a lo largo del muro.
PROHIBIDO: texto, personas, cabezas, magenta, rosa o morado.
```

**B) La cabeza con su cuello, quieta** (adjunta A cuando esté hecho, para la misma escama y luz):

```
UNA cabeza de la hidra del fondo adjunto, con su cuello largo, sobre FONDO MAGENTA PURO (#FF00FF):
cabeza de dragón mirando a la IZQUIERDA, mandíbula abierta, filas de dientes blancos, boca ROJO
OSCURO (nada morado ni rosa), ojos verdes brillantes bajo una ceja enojada, cuernos dorados
barridos hacia atrás y una corona de púas. El cuello sale de la cabeza hacia la DERECHA en
horizontal, largo como cuatro veces la cabeza, con escamas verde azulado, placas doradas debajo y
púas doradas encima, y termina cortado limpio en el borde derecho (ahí lo tapa el hombro del
cuerpo). Misma escama, mismos dorados y misma luz nocturna que el fondo adjunto, alta
resolución, NO pixel art.
Sin sombra en el suelo, sin texto, nada magenta, rosa fuerte ni morado en el dibujo.
Entrega: PNG de unos 2400×700, la pieza entera con margen.
```

**C) Las animaciones que faltan** (2026-10-28, sobre su hoja de 5 filas x 6 cuadros, una fila por
cabeza, `docs/reference/colossal-hydra-heads-grid-owner-reference.png`; él confirmó *"como la
montaste está bien"*). Una hoja por animación, adjuntando esa hoja. Primero el preámbulo, luego la
línea de la animación:

```
Dibuja una hoja igual a la adjunta: 5 FILAS x 6 CUADROS sobre FONDO MAGENTA PURO (#FF00FF), cada
cuadro separado por espacio magenta. Cada fila es la MISMA cabeza de hidra que esa fila de la hoja
adjunta (misma cabeza, misma escala, mismos colores, mirando a la IZQUIERDA), con su cuello largo
saliendo hacia la DERECHA y cortado en el borde derecho de cada cuadro EXACTAMENTE a la misma altura
y del mismo grueso que en esa fila de la hoja adjunta, igual en los 6 cuadros: solo se mueven la
cabeza y el tramo de cuello cercano a ella. Las 5 filas hacen la misma animación, cada una con su
cabeza. Boca y carne ROJO OSCURO, nada morado ni rosa. Sin texto, sin sombra en el suelo.
```

| Animación | La línea que va después del preámbulo |
|---|---|
| Mordida | *"MORDIDA, de izquierda a derecha. La cabeza SE LANZA HACIA ADELANTE: 1 la cabeza en reposo; 2 se echa hacia atrás (a la derecha) con la boca entreabierta; 3 se lanza hacia la IZQUIERDA: el cuello se estira y el hocico queda MUY a la izquierda de donde está en reposo, boca abierta al máximo; 4 en ese mismo punto adelantado CIERRA la mandíbula de golpe, dientes juntos, SIN lengua; 5 todavía adelantada, sacude la cabeza con la boca cerrada; 6 regresa a la pose de reposo. Ningún cuadro saca la lengua. Deja espacio magenta a la izquierda de cada cuadro para la cabeza adelantada. La hoja, del mismo tamaño que la adjunta, y sin halo rosa en las púas."* (Primera vuelta, 2026-10-28: la cabeza nunca pasaba del hocico en reposo, sacaba la lengua en vez de cerrar de golpe y el cuello subía y bajaba hasta 11 px; él decidió usarla como más variedad del reposo, `docs/reference/colossal-hydra-roar-grid-owner-reference.png`.) |
| Ácido | *"ESCUPE ÁCIDO, de izquierda a derecha: 1 echa la cabeza hacia atrás y la garganta se hincha; 2 abre la boca con gotas verde brillante en los dientes; 3 escupe un chorro grueso de ácido VERDE BRILLANTE hacia la izquierda; 4 el chorro sigue saliendo; 5 el chorro se corta y le escurre baba verde; 6 cierra la boca y vuelve a su pose de reposo."* |
| Herida | *"RECIBE UN GOLPE, de izquierda a derecha: 1 la cabeza en reposo; 2 el golpe: un DESTELLO BLANCO en la mejilla, la cabeza se sacude hacia atrás y hacia arriba con los ojos cerrados; 3 se abre un TAJO GRANDE Y PROFUNDO en la mejilla y el cuello justo detrás de la cabeza, ROJO BRILLANTE con borde oscuro, del ojo hasta la oreja, y SALPICA SANGRE ROJA hacia afuera en gotas grandes; 4 baja aturdida con la boca entreabierta: la SANGRE CHORREA de la herida en hilos gruesos que bajan por el cuello y GOTEAN por debajo de la panza, y las escamas alrededor quedan manchadas de rojo; 5 levanta la cabeza enojada, la herida sigue abierta y la sangre sigue CHORREANDO y goteando hacia abajo; 6 vuelve a su pose de gruñido con la HERIDA ROJA ABIERTA y los HILOS DE SANGRE todavía colgando y goteando. La herida y la sangre son ROJO VIVO (no oscuro, no café, no morado) para que se vean a tamaño pequeño. Las gotas que caen van sobre magenta puro, separadas del dibujo."* (Primera vuelta, 2026-10-29, `docs/reference/colossal-hydra-hurt-grid-owner-reference.png`: funcionó, pero la herida salió chica y oscura; él la quiere más visible, *"hasta que chorree sangre incluso"*.) |
| Cortada | *"LA CORTAN, de izquierda a derecha: 1 la cabeza herida con los ojos en blanco; 2 un corte limpio atraviesa el cuello justo detrás de la cabeza; 3 la cabeza se separa del cuello; 4 la cabeza cae hacia abajo, APARTE del cuello, con espacio magenta entre los dos; 5 la cabeza cortada queda abajo del cuadro, aparte; 6 solo queda el muñón del cuello, cortado limpio, con la carne roja oscura, sin cabeza."* |
| Vuelve a crecer | *"LE VUELVE A CRECER LA CABEZA, de izquierda a derecha: 1 el muñón del cuello con la carne roja oscura; 2 la carne burbujea; 3 asoma una cabeza pequeña y húmeda; 4 la cabeza crece a la mitad de su tamaño y abre los ojos; 5 la cabeza casi completa; 6 la cabeza completa, de su tamaño normal, rugiendo."* |

**El muñón quemado** (2026-10-29: si le queman el muñón, la cabeza ya no vuelve a crecer). Una
hoja aparte, adjuntando su hoja de "vuelve a crecer" (`docs/reference/colossal-hydra-regrow-grid-owner-reference.png`),
cuya primera columna es el muñón crudo de cada cabeza:

```
Dibuja una hoja igual a la adjunta: 5 FILAS x 6 CUADROS sobre FONDO MAGENTA PURO (#FF00FF), cada
cuadro separado por espacio magenta. Cada fila es el MISMO muñón de cuello que la PRIMERA COLUMNA
de esa fila en la hoja adjunta (el cuello cortado con el anillo rojo de carne a la izquierda, sin
cabeza), misma escala, mismos colores, el cuello saliendo hacia la DERECHA y cortado en el borde
derecho EXACTAMENTE a la misma altura y del mismo grueso que en la hoja adjunta, igual en los 6
cuadros: solo cambia el extremo cortado y el tramo cercano a él.
LE QUEMAN EL MUÑÓN, de izquierda a derecha: 1 el muñón crudo, carne roja; 2 el fuego lo alcanza:
llamas NARANJA Y AMARILLO BRILLANTE envuelven el anillo de carne; 3 las llamas grandes, la carne
chisporrotea y empieza a ponerse negra, chispas saltando; 4 el fuego baja: la punta queda
CARBONIZADA, NEGRA con grietas de BRASAS NARANJAS, humo gris saliendo; 5 brasas brillando y una
columna de humo gris; 6 el muñón SELLADO: costra negra carbonizada con unas pocas brasas naranjas,
un hilo de humo, ya no sangra.
El fuego es naranja y amarillo vivo, el humo gris; nada morado ni rosa. Sin texto, sin sombra en el
suelo. Las chispas y el humo que se separen van sobre magenta puro.
```

La cabeza cortada tirada en el suelo y el muñón quemado van además en D.

**D) Los efectos**, en una hoja magenta como los props (adjunta su hoja de cinco poses): el escupitajo de ácido (una bola verde
brillante con estela), el charco de ácido en el suelo (visto desde arriba, achatado), la cabeza cortada tirada en el suelo, el muñón
quemado (negro con brasas), el muñón crudo; cada uno en su celda, sin sombra, sin texto.

Con A–D: el fondo se usa como el del casino (pintado completo); B y C pasan por
`sheet-from-template.py --hd` a una hoja de la hidra colosal como la de `world/creatures/`
(`hydra_neck_*`), una sola cabeza repetida en los siete carriles; el motor necesita cabezas con
`bulk` (su tamaño) y carriles fijos (diseño en `docs/GAMEPLAY_DESIGN.md`, "The colossal hydra").

## 12. La fortaleza de la hidra: la elección, el patio vacío y la invocación (2026-10-29)

La misión entera está en `docs/MISSION_DESIGN.md`, "The hydra's fortress". Lo que pide al generador:

**A) La pantalla de elección** (3 imágenes, 1920×1080, mismo estilo HD-2D que el casino y el patio de la
hidra; adjunta el fondo de la hidra v3 como estilo). Primero la base:

```
FONDO · la fortaleza de piedra vista desde afuera, de noche, al llegar por el camino · 1920×1080
MISMO estilo, pincel, paleta y luz que la imagen adjunta (pixel art HD-2D). Vista de frente y un poco
desde arriba. Al CENTRO-IZQUIERDA el gran portón de madera reforzada ABIERTO de par en par, con
antorchas encendidas a los lados y NINGÚN guardia: inquietante, demasiado fácil. A la DERECHA, al pie
de la muralla y medio escondida entre rocas y matorrales, la boca de un DESAGÜE de piedra con una reja
oxidada, por donde sale un hilo de agua sucia hacia un foso. Abajo, el camino de tierra que llega hasta
nosotros. Luna, nubes, banderas rojas en las almenas. Dejar el tercio de abajo con poco detalle (ahí
van los botones). PROHIBIDO: texto, personas, magenta, rosa fuerte o morado.
```

Luego, adjuntando esa base, las dos variantes (lo que cambia al seleccionar cada opción):

```
La MISMA imagen adjunta, idéntica píxel por píxel, cambiando SOLO esto: el portón abierto y el camino
hacia él brillan con una luz cálida dorada, las antorchas más fuertes; el resto un poco más oscuro.
```
```
La MISMA imagen adjunta, idéntica píxel por píxel, cambiando SOLO esto: la boca del desagüe (el arco
de piedra abajo a la IZQUIERDA, junto al agua y la cascadita) brilla con una luz fría azul verdosa
que sale de adentro, con un poco de niebla sobre el agua; el resto un poco más oscuro y frío.
```

**B) El patio vacío** (adjunta su fondo de la hidra v3, `docs/reference/colossal-hydra-backdrop-v3-owner-reference.png`):

```
La MISMA imagen adjunta, idéntica en todo (muro, portón, antorchas, suelo, luz, encuadre), pero SIN
la hidra: ni cuerpo, ni cuellos, ni púas, ni garras. Donde estaba, el patio sigue: el suelo de losas y
el muro del fondo, con la misma luz. Agrega en el suelo, donde estaba el cuerpo, un gran círculo
alquímico APAGADO grabado en la piedra (líneas finas, apenas visibles). Sin texto, sin personas.
```

**C) La invocación del jefe y la invocación simple** (hoja de efectos sobre magenta, como los props):

```
Hoja de efectos de invocación sobre FONDO MAGENTA PURO (#FF00FF), cada cuadro separado, sin texto,
sin personas, alta resolución, colores brillantes. El círculo va visto desde arriba y ACHATADO
(como pintado en el suelo, el doble de ancho que de alto).
Fila 1 · INVOCACIÓN DEL JEFE, 6 cuadros de 900×450: un gran círculo alquímico en el suelo (círculos
concéntricos, un triángulo y un cuadrado inscritos, runas en el borde) que 1 aparece como una chispa
en el centro; 2 se dibuja la primera línea de luz; 3 el círculo completo brilla dorado-anaranjado;
4 brilla al máximo y sube una columna de luz y relámpagos; 5 la columna se vuelve humo y polvo
denso; 6 el humo se abre y el círculo se apaga.
Fila 2 · INVOCACIÓN SIMPLE, 4 cuadros de 450×225: un círculo pequeño y sencillo que brilla, una
nube de humo blanco que hace "puf", el humo se disipa, nada.
Luz dorada, naranja y blanca; humo gris; nada morado ni rosa.
```

**D) Segunda vuelta de la invocación (2026-10-29).** Su primera hoja (`docs/reference/summon-sigil-sheet-owner-reference.png`)
funciona, pero el sello le quedó chico: *"hazme un prompt para algo más masivo, como el cuerpo de la
hidra"*. Y un humo grande aparte, porque habrá invocaciones de ese tamaño seguido, también del lado
del jugador (bestias, mechas, la armadura espiritual gigante).

El sello masivo (adjunta el patio vacío, `docs/reference/colossal-hydra-courtyard-empty-owner-reference.png`,
como referencia de perspectiva y estilo):

```
Hoja de efectos de una INVOCACIÓN DE JEFE MASIVA sobre FONDO MAGENTA PURO (#FF00FF), 6 cuadros de
1800×900 en fila, separados por espacio magenta, sin texto, sin personas, alta resolución, colores
brillantes, mismo estilo de pintura que la imagen adjunta (HD-2D).
El sello es un CÍRCULO ALQUÍMICO GIGANTE en el suelo, visto en la MISMA perspectiva que el círculo
grabado en el piso de la imagen adjunta: muy achatado, unas CINCO veces más ancho que alto, ocupando
casi todo el ancho del cuadro. Tiene tres anillos concéntricos de runas, un heptagrama, cuadrados
inscritos y símbolos alquímicos.
1 grietas de luz dorada corren por el suelo dibujando el contorno del círculo; 2 se encienden el
anillo exterior y sus runas, suben brasas; 3 arde toda la geometría interior y TRES ANILLOS DE RUNAS
SE ELEVAN flotando sobre el suelo a distintas alturas, uno encima de otro, como capas; 4 todo al
máximo: una COLUMNA DE LUZ COLOSAL dorada y blanca sale del centro y atraviesa el borde de arriba del
cuadro, con relámpagos alrededor, las losas del suelo se agrietan y se levantan, vuelan piedras;
5 la columna estalla en un muro de humo y polvo denso que llena el cuadro; 6 el sello gastado y
humeante en el suelo, con grietas que todavía brillan débil y piedras alrededor.
Luz dorada, naranja y blanca; humo gris; nada morado ni rosa.
```

El humo de invocación grande, para todas las invocaciones grandes (va en gris y blanco neutro: el
juego lo tiñe del color del chakra o del elemento de quien invoca):

```
Hoja de HUMO DE INVOCACIÓN sobre FONDO MAGENTA PURO (#FF00FF), cada cuadro separado por espacio
magenta, sin texto, sin personas, alta resolución, mismo estilo de pintura HD-2D que la imagen
adjunta. Humo GRIS Y BLANCO NEUTRO, sin color (el juego lo tiñe), denso, con volumen, luces y sombras
suaves; visto de lado, apoyado en el suelo.
Fila 1 · GRANDE, 6 cuadros de 1000×1000: 1 un anillo de polvo revienta a ras del suelo; 2 el humo se
levanta en una columna que se ensancha; 3 una NUBE ENORME y totalmente OPACA, alta como un edificio de
tres pisos, que tapa por completo lo que hay dentro; 4 la nube empieza a abrirse desde el centro; 5 la
nube se abre del todo y deja el centro vacío (ahí aparece la criatura), quedan jirones a los lados;
6 los últimos jirones y polvo en el suelo.
Fila 2 · MEDIANA, 4 cuadros de 600×600: lo mismo en menos pasos: estallido, nube opaca alta como una
persona y media, se abre, jirones.
Nada morado ni rosa.
```

**E) La invocación masiva pintada EN el patio** (2026-10-29). La hoja de magenta salió como seis
escenas chiquitas con su propio piso (`docs/reference/summon-sigil-massive-v1-owner-reference.png`).
Como su generador sí respeta una imagen adjunta al píxel (la fortaleza iluminada coincidió exacta),
la invocación se pide pintada sobre el patio, **una imagen por paso**, cada una adjuntando el patio
vacío (`docs/reference/colossal-hydra-courtyard-empty-owner-reference.png`). Al principio de cada una:

```
La MISMA imagen adjunta, idéntica píxel por píxel en todo lo que no se menciona (muro, portón,
antorchas, losas, encuadre), cambiando SOLO esto:
```

1. *"el gran círculo alquímico grabado en el piso se enciende: sus líneas brillan dorado-anaranjado como metal al rojo, grietas de luz corren entre las losas cercanas, suben brasas; el resto del patio un poco más oscuro."*
2. *"el círculo grabado en el piso arde con fuerza, todo dorado y blanco; TRES ANILLOS DE RUNAS de luz dorada flotan sobre él a distintas alturas, uno encima de otro, y la luz ilumina el muro y el piso alrededor; las losas cercanas se agrietan."*
3. *"del centro del círculo grabado sale una COLUMNA DE LUZ COLOSAL dorada y blanca que sube hasta salirse por arriba de la imagen, con relámpagos alrededor; losas y piedras vuelan hacia arriba; todo el patio iluminado de dorado."*
4. *"donde está el círculo grabado, una NUBE ENORME de humo gris y polvo, totalmente opaca, alta hasta la mitad del muro y más, llena el lado derecho del patio; piedras cayendo; la luz dorada apenas se ve dentro del humo."*

La última adjunta **el fondo de la hidra** (`docs/reference/colossal-hydra-backdrop-v3-owner-reference.png`) en lugar del patio vacío:

5. *"jirones de humo gris y polvo se disipan alrededor del cuerpo de la hidra y en el piso, con algunas piedras sueltas y grietas que todavía brillan débil en las losas."*

El juego encadena 1→2→3→4 con fundidos, cambia al fondo de la hidra dentro del humo (4→5) y luego
quita el humo. Sin texto ni personas en ninguna.

**F) Los dos pasos intermedios** (2026-10-29). Los cortes de la columna al humo y del humo a la hidra
se veían como "transición de PowerPoint" (sus palabras). Dos fondos más para esos momentos:

*3b, la columna se rompe en polvo* (adjunta el **paso 3**, la columna):
```
La MISMA imagen adjunta, idéntica píxel por píxel en todo lo que no se menciona (muro, portón,
antorchas, losas, encuadre), cambiando SOLO esto: la columna de luz se está ROMPIENDO: su base revienta
en una onda de polvo y humo gris que se expande a ras del suelo hacia los lados desde el círculo, la
columna se adelgaza y se apaga de abajo hacia arriba, las piedras siguen en el aire, el polvo empieza a
subir y a tapar la parte de abajo de la columna; la luz dorada todavía brilla dentro del polvo.
```

*4b, la hidra dentro del humo* (adjunta **el fondo de la hidra**, `docs/reference/colossal-hydra-backdrop-v3-owner-reference.png`).
Él decidió (2026-10-29) que mientras sale el humo **las cabezas van recogidas dentro de la nube**, sin
cuellos largos asomando, y que se **extienden hacia afuera cuando aparece la hidra** (eso lo hace el juego):
```
La MISMA imagen adjunta, idéntica píxel por píxel en todo lo que no se menciona (el muro, el portón, las
antorchas, las losas, el encuadre), cambiando SOLO esto: una NUBE ENORME y densa de humo gris y polvo,
como una explosión reciente, cubre TODO el lado derecho del patio y la hidra ENTERA, cuerpo y cuellos:
NINGUNA cabeza ni cuello sale de la nube. Dentro del humo solo se adivina la SILUETA OSCURA del cuerpo
gigante, y cerca del cuerpo, juntos y ADENTRO de la nube, brillan cinco pares de OJOS VERDES, como si las
cabezas estuvieran recogidas contra el cuerpo. El borde izquierdo de la nube no pasa de la mitad del
patio. Piedras cayendo, brasas sueltas, un resplandor dorado débil al pie de la nube.
```

*4c, las cabezas rasgan la nube* (él lo pidió 2026-10-29: el humo esparcido antes de tiempo por las
cabezas al salir). **Primera vuelta** (`docs/reference/summon-courtyard-step4c-v1-owner-reference.png`):
el generador pintó cinco cuellos LARGOS hasta los túneles, en otras alturas que los nuestros, y repintó
el cuerpo; con nuestras cabezas encima salen cuellos dobles. Se pide de nuevo **sobre el 4b** (la nube
con los ojos), con los túneles VACÍOS: los cuellos y las cabezas los pone el juego.
```
La MISMA imagen adjunta, idéntica píxel por píxel en todo lo que no se menciona (el muro, el portón, las
antorchas, las losas, el encuadre, la forma de la nube), cambiando SOLO esto: la nube se está RASGANDO
por dentro: CINCO TÚNELES HORIZONTALES VACÍOS atraviesan el humo de derecha a izquierda, uno a la altura
de cada par de ojos verdes, como si algo acabara de salir disparado por ahí; los túneles son huecos de
aire oscuro con las paredes de humo arremolinadas en espiral, y en la boca izquierda de cada túnel el
humo sale despedido hacia la izquierda en jirones largos. NO dibujes cuellos, cabezas, escamas ni el
cuerpo: dentro de los túneles solo hay aire y humo. Los ojos verdes ya no están. Piedras y brasas sueltas.
```

Con estos el juego hace: columna (3) → la columna se rompe (3b) → la nube (4) → la nube con la silueta
(4b, ya sobre el fondo de la hidra, así el cambio de fondo pasa dentro del humo) → el humo se deshace
mientras las cinco cabezas salen de la nube y estiran el cuello hasta su lugar. Si 4b sale alineado, opcional un 4c igual pero con el humo a la mitad.

## 13. Barrabás, el villano de la fortaleza (2026-10-29)

Su diseño (`docs/MISSION_DESIGN.md`, "The hydra's fortress"): un Kōton corrupto, aliado de los
Northstar; los Kōton usan armadura pesada como la de Aiden, los buenos de caballero respetable, los
corruptos una versión más gótica y oscura. Pelo verde oscuro, diseño propio (nada de personajes de
franquicias). Su sprite lo hace nuestro motor; del generador sale **su hoja de diseño** (para copiar
su armadura pieza por pieza, como Aiden) y **su retrato con expresiones** para el monólogo.

**A) La hoja de diseño** (adjunta la referencia de Aiden, `docs/reference/aiden-owner-reference.jpg`, como "misma
calidad y misma escala de armadura pesada"):

```
Hoja de diseño de personaje sobre FONDO MAGENTA PURO (#FF00FF), pixel art de 16 bits, mismo estilo,
misma calidad y misma escala que la imagen adjunta: tres vistas de cuerpo entero del mismo hombre en
fila, de FRENTE, de TRES CUARTOS mirando a la derecha y de LADO, de pie, separadas por espacio magenta.
BARRABÁS, comandante villano de un clan de alquimistas: hombre de unos 35 años, alto y ancho de
hombros, postura arrogante, mentón levantado. Pelo VERDE OSCURO casi negro, corto a los lados y largo
arriba, peinado hacia atrás con mechones sueltos que le caen sobre la frente; barba corta muy
recortada; ojos ámbar fríos, cejas gruesas, una cicatriz fina que cruza la ceja izquierda; sonrisa
de medio lado.
ARMADURA PESADA GÓTICA Y OSCURA: placas de acero ennegrecido con filos y grabados de cobre envejecido,
hombreras enormes con púas curvas, peto con un CÍRCULO ALQUÍMICO grabado en el centro (un círculo con
un triángulo dentro), guanteletes con garras cortas, faldón de placas sobre una túnica de tela verde
botella muy oscura, capa larga negra rasgada en la orilla con forro verde oscuro. En el cinturón,
frascos alquímicos de vidrio con líquidos verdes. Sin casco. Arma: una alabarda negra con hoja de
cobre grabada.
Paleta corta: negro azulado, acero oscuro, cobre envejecido, verde botella, verde alquímico brillante
solo en los frascos. Contorno oscuro de 1 píxel. Sin texto, sin sombra en el suelo, nada magenta, rosa
ni morado en el personaje.
```

**B) Su retrato con expresiones** (adjunta la hoja A cuando esté hecha):

```
Hoja de RETRATOS del personaje adjunto sobre FONDO MAGENTA PURO (#FF00FF): 8 retratos de BUSTO (de la
cintura para arriba) del MISMO hombre, mirando a la IZQUIERDA en tres cuartos, todos del mismo tamaño
y en la misma posición, en 2 filas de 4, separados por espacio magenta. Pixel art de 16 bits de alta
calidad para un cuadro de diálogo de novela visual, misma cara, pelo, armadura y paleta que la imagen
adjunta, detalle de rostro mayor que en el sprite.
Expresiones, de izquierda a derecha:
Fila 1: 1 NEUTRAL arrogante, mentón arriba, mirada por encima; 2 SONRISA BURLONA de medio lado;
3 RIENDO a carcajadas con la cabeza un poco hacia atrás ("¡Ja!"); 4 OJOS ENTRECERRADOS, desconfiado,
evaluando.
Fila 2: 5 ENFURECIDO, dientes apretados, venas en la sien; 6 SORPRENDIDO, ojos muy abiertos;
7 con un CORTE FINO EN LA MEJILLA que sangra un hilo rojo, tocándose la herida con dos dedos del
guantelete, mirada fría de rabia contenida; 8 extendiendo la mano abierta hacia abajo, palma hacia el
suelo, con un brillo VERDE ALQUÍMICO en la mano (el momento de invocar).
Sin texto, sin fondo, nada magenta, rosa ni morado en el dibujo.
```

Cada expresión tiene su momento del monólogo: 3 "¡Ja! Sabía que vendrían", 2 "...Insolente", 4 la
opción azul, 6 y 5 la provocación (3b), 7 el kunai a media frase (4a), 8 la invocación.
