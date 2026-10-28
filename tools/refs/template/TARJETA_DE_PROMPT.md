# Tarjeta de prompt (modelo) y la hoja de prueba del lote 0

Una tarjeta por lote. Se pega tal cual en el generador de imágenes, con la plantilla adjunta
(`plantilla_4x2.png` o la que haga `make-template.py` para ese lote). Lo que importa de verdad
son tres cosas: **PNG**, **fondo magenta puro** y **la escala de la figura de la celda 0**; la
rejilla es comodidad (si el generador no la respeta, se pide una pieza por imagen y se juntan).

---

## Hoja de prueba (lote 0): patio shinobi, estilo simplista

```
LOTE 0 · Hoja de prueba · patio de una casa media shinobi · estilo simplista
Plantilla: la imagen adjunta (rejilla 4×2, fondo magenta #FF00FF, figura de escala en la celda 0).
Estilo: pixel art de 16 bits, vista 3/4 desde la derecha, luz desde arriba a la izquierda,
línea negra de 1 px alrededor de cada objeto, colores planos a bandas (sin degradados, sin
anti-alias, sin brillo suave), fondo magenta puro y plano en todo lo que no sea dibujo.
Escala: la figura de la celda 0 mide 94 px de juego; cada celda son 128×128 px de juego.
Dibuja cada objeto a la escala de esa figura.
Celdas (una pieza por celda, apoyada en el borde inferior de su celda, centrada):
 1  mesa baja de madera para sentarse en el suelo, con dos cojines
 2  brasero de hierro con brasas y una parrilla encima
 3  tarima de madera baja (un escenario pequeño para bailar), vista 3/4
 4  farol de piedra de jardín japonés, apagado
 5  banco de madera de dos plazas
 6  dos jarras de sake de cerámica, una junto a la otra
 7  sombrilla de papel grande, abierta, clavada en el suelo
Sin personas, sin sombras proyectadas en el suelo, sin texto ni marcas dentro de las celdas,
nada que salga de su celda. Entrega: PNG (no JPG) al tamaño de la plantilla.
```

Cuando la tenga: me manda el PNG, yo corro

    python3 -I tools/refs/sheet-from-template.py <su.png> tools/refs/template/example-spec.json --out <staging> --review <hoja.png>

y le enseño la hoja "Tu dibujo / En el juego". Si el generador cambió la rejilla o el fondo, el
informe de ida y vuelta lo marca con REVISAR y vemos qué pasó antes de usar nada.
