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
