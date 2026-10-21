# Efectos de las técnicas: ideas para aprobar (borrador)

Son 12 técnicas que ya están en el juego, elegidas porque son las que más ganan. Cada una tiene una opción A y una B, y marco con ⭐ la que recomiendo.
Todo se hace con tus dibujos que ya están en el juego, o con piezas nuestras que ya aprobaste. Solo se mueven, se escalan, se voltean, se ponen unos encima de otros, se encadenan o se cambia cuándo salen. No se redibuja nada. Lo que necesitaría un dibujo nuevo lo marco como tal y queda como opción secundaria. **No entra nada en el juego hasta que digas que sí**: antes te enseño cada idea como una tira de imágenes con etiquetas en español.

**Cómo leer los tiempos.** 0 ms es cuando sale el nombre y el ninja hace la pose de lanzar, que dura 900 ms. Hoy el efecto empieza a los 560 ms. En las técnicas cuerpo a cuerpo, **L** es el momento en que el ninja llega al objetivo (corre a 5,5 m/s). `vfx_fire/...` es `src/assets/world/vfx_fire/...` (igual para cada elemento) y `vfx_beasts/...` son tus bestias. 1x es a tamaño real, con tus píxeles exactos.

## Resumen

| Nº | Técnica | Idea recomendada | Trabajo |
|---|---|---|---|
| 1 | Llama Dragón (`dragon_fire_bomb`) | La cabeza de tu Gran aniquilación sale del fuego y dispara 5 bolas de fuego en abanico | cambio pequeño + hoja de la cabeza (tus píxeles) |
| 2 | Fuego del dragón (`dragon_fire_stream`) | La misma cabeza, a mitad de tamaño, escupe el chorro de fuego | cambio pequeño + la misma hoja |
| 3 | Night Guy (`night_guy_dragon`) | Tu fénix, que nunca se ha visto, cae en picado sobre el objetivo con el ninja | cambio pequeño |
| 4 | Dragón de madera (`wood_dragon_jutsu`) | Un dragón de madera como el de tu icono | **necesita dibujo nuevo**; mientras tanto, cambio pequeño |
| 5 | Cadenas selladoras (`adamantine_sealing_chains`) | Tu haz de chakra, que ya es una cadena dorada, va del pecho al objetivo | cambio pequeño |
| 6 | 64 palmas (`taki_sixtyfour_palms`) | 8 palmas abiertas (tu aliento de chakra tiene una mano) y el sello dorado de remate | cambio pequeño |
| 7 | Proyectil del dragón de agua (`water_dragon_suiryuudan`) | El dragón vuela con un cuerpo de agua detrás, como la serpiente de tu icono | cambio pequeño |
| 8 | Balas de tierra (`earth_spear_doryuudan`) | Tus 3 balas de roca y su impacto, que nunca han salido | cambio pequeño |
| 9 | Danza de la luna creciente (`crescent_moon_dance`) | 3 medias lunas de luz cruzan al objetivo | cambio pequeño |
| 10 | Templo del Nirvana (`temple_of_nirvana`) | Se abre tu vórtice de cuervos sobre el objetivo y la bandada cae | cambio pequeño (B es solo datos) |
| 11 | Chidori (`chidori_lightning_blade`) | Rayo en la mano, aura de rayo al correr, estocada y el rayo sale por la espalda del enemigo | cambio pequeño |
| 12 | Huracán de la hoja (`leaf_hurricane_senpuu`) | El ninja gira entre cintas de viento y las hojas golpean a cada enemigo | cambio pequeño |

**Las piezas de código que comparten.** Con las cinco primeras (unas 50–100 líneas en `playback.ts` y `vfxSprites.ts`), casi todo lo demás pasa a ser datos:
- **P1, pieza fija:** mostrar una fila de una hoja en un punto, con un desplazamiento en píxeles, y mantenerla (la cabeza de dragón, el vórtice de cuervos, las medias lunas).
- **P2, salida desde un punto:** que los proyectiles y los chorros puedan salir de cualquier punto, como la boca del dragón. Hoy solo salen de las manos.
- **P3, ráfaga:** varios proyectiles seguidos, cada uno con su hora de salida.
- **P4, haz libre:** un haz (chorro o cadena) hacia un solo objetivo, que se queda tendido un rato. Y de paso, que el haz llegue al final de la línea: hoy se para en el punto donde haces clic, aunque el daño cubre la línea entera.
- **P5, cuerpo a cuerpo con más pasos:** varios golpes seguidos, la pose de estocada (`pierce`, aprobada y sin usar) y un aura que acompaña al ninja mientras corre.
- **La hoja de la cabeza de dragón** (`vfx_fire/dragon_head`, para la 1 y la 2). Hoy tu cabeza va pegada dentro de cada cuadro de la Gran aniquilación potenciada, con las llamas y el humo. Pero tus píxeles de la cabeza (`s_head`) y del chorro de la boca (`s_breath`) están sueltos en las herramientas (`REF_PIECES`), así que el generador puede hacer una hoja solo con ellos: la cabeza sale del fuego, se mantiene moviéndose 1–2 px y se quema como en tu Aniquilación. No es un dibujo nuevo, son tus píxeles movidos. El corte del cuello se tapa con llamas, como en tu dibujo.

---

## 1. Llama Dragón: `dragon_fire_bomb` (Aniquilación de la llama del dragón)
**Qué hace:** es el secreto del clan Mirai, de rango A. Lanza un cono de fuego de 9 m a 60° que hace 5d8 y quema.
**Ahora:** tu aliento de fuego (`vfx_fire/breath`) aparece 6 veces seguidas por el centro del cono, y parecen disparos. No sale ningún dragón, aunque tu icono son tres cabezas de dragón.

**Opción A ⭐ (tu idea): una cabeza que dispara bolas de fuego**
- 0 ms: el nombre y la pose de lanzar.
- 560 ms: a la espalda del ninja, entre 1,5 y 4 m detrás, se levanta un muro de llamas: `vfx_fire/wall`, fila `rise` (1000 ms) y después `idle`.
- 800 ms: de esas llamas sale tu cabeza de dragón de la Gran aniquilación (`vfx_fire/dragon_head`, 1x, unos 6 m de alto) y sube en 400 ms. La boca queda a unos 3 m de alto, justo detrás de la cabeza del ninja, para no taparlo. El muro tapa el corte del cuello.
- 1200 ms: primer disparo. En la boca brilla tu chorro `s_breath` durante 100 ms y sale una bola `vfx_fire/bolt`. Son 5 bolas en abanico (−24°, −12°, 0°, +12° y +24° respecto al centro del cono), una cada 150 ms (de 1200 a 1800 ms). Vuelan rectas y algo más rápido que una bola normal: 80 ms por metro, unos 0,7 s hasta el borde del cono.
- De 1900 a 2500 ms: cada bola estalla con `vfx_fire/hit` (1000 ms) en el primer objetivo que toca o al final del cono. El daño entra con la primera.
- 2200 ms: la cabeza se quema y se hunde (fila `fade`, 667 ms, igual que en tu Aniquilación) y el muro se apaga con ella.
- Dura en total unos 3,5 s (la Gran aniquilación dura 3,3 s).
- **Potenciada:** 7 bolas, y la cabeza aguanta 300 ms más.
- **Por qué:** es justo lo que pediste. Sale el dragón del icono y dispara los proyectiles de fuego, y el abanico cubre el cono que hace daño.
- **Trabajo:** cambio pequeño (P1, P2 y P3) más la hoja de la cabeza, hecha con tus píxeles.

**Opción B: tres cabezas, como tu icono**
- 560 ms: el mismo muro de llamas detrás del ninja.
- 800, 950 y 1100 ms: salen tres cabezas a mitad de tamaño (0,5x, unos 3 m cada una) a distintas alturas, como en tu icono. Cada una sube en 300 ms.
- De 1200 a 1800 ms: cada cabeza dispara 2 bolas `vfx_fire/bolt` hacia su tercio del cono (izquierda, centro y derecha), una cada 120 ms.
- De 1900 a 2500 ms: estallan con `vfx_fire/hit`.
- 2300 ms: las tres se queman (667 ms). Dura en total unos 3,5 s.
- **Por qué:** es tu icono tal cual.
- **Trabajo:** cambio pequeño (P1, P2 y P3) más la hoja de la cabeza reducida a la mitad. Al reducirla se pierde detalle, así que te la enseño antes.

---

## 2. Fuego del dragón: `dragon_fire_stream`
**Qué hace:** es de rango B. Lanza una línea de fuego de 10,5 m que hace 4d6 y quema.
**Ahora:** el chorro `vfx_fire/stream` + `stream_head` va de las manos al punto donde haces clic y dura 1300 ms. Tu icono es una cabeza de dragón rugiendo.

**Opción A ⭐: la cabeza pequeña escupe el chorro**
- 560 ms: a 1 m detrás del ninja salen llamas (`vfx_fire/aura` y `aura_back`).
- 700 ms: de ellas sale la misma cabeza a 0,5x y sube en 300 ms. La boca queda a unos 2 m de alto, por encima del hombro del ninja.
- 1000 ms: en la boca aparece tu chorro `s_breath`, y desde ahí el chorro `vfx_fire/stream` + `stream_head` crece hasta el **final** de la línea en 400 ms. Aguanta 500 ms y se apaga en 300 ms.
- De 1000 a 1400 ms: `vfx_fire/hit` en cada unidad cuando el chorro le llega.
- 1900 ms: la cabeza se quema (667 ms). Dura en total unos 2,6 s.
- **Por qué:** sale el dragón del icono y el chorro sale de su boca, no de las manos. Además queda una escalera por rango: rango B con la cabeza pequeña, rango A (la 1) con la cabeza grande y rango S con tu Gran aniquilación entera.
- **Trabajo:** cambio pequeño (P1, P2 y P4) más la hoja de la cabeza (la misma de la 1).

**Opción B: sin cabeza (si prefieres guardar el dragón para la 1 y la Gran aniquilación)**
- 560 ms: un fogonazo `vfx_fire/breath` en las manos (300 ms) y llamas `vfx_fire/aura` alrededor del ninja mientras dura el chorro.
- 700 ms: el chorro llega hasta el final de la línea en 400 ms y hace `vfx_fire/hit` en cada unidad. Dura en total unos 2,2 s.
- **Trabajo:** cambio pequeño (P4 y el aura en el lanzador).

---

## 3. Night Guy: `night_guy_dragon`
**Qué hace:** es de rango S. El ninja corre hasta 9 m y da un golpe de 10d10 de fuerza: "un dragón carmesí de chakra que embiste".
**Ahora:** corre y hace el golpe de arma normal con un solo `vfx_chakra/hit`. El grifo de chakra nunca sale, porque el código mira primero si es cuerpo a cuerpo.
*El nombre y la idea vienen de Naruto y hay que cambiarlos antes de publicar, así que propongo un aspecto que no copia el del anime.*

**Opción A: la cabeza de dragón embiste**
- De 0 a 560 ms: el ninja se carga con llamas rojas (`vfx_fire/aura` y `aura_back`).
- 560 ms: corre con las llamas pegadas al cuerpo, como en Shunshin.
- L: detrás del ninja sale tu cabeza de dragón a 1x y se lanza 2 m hacia el objetivo en 250 ms, con la boca abierta encima de él. Solo se mueve; no se redibuja.
- L+250: `vfx_chakra/hit` y `vfx_fire/blast` (el hongo con el anillo de fuego) en el objetivo, con una sacudida fuerte.
- L+600: la cabeza se quema (667 ms). Termina hacia L+1600.
- **Trabajo:** cambio pequeño (P1 y P5) más la hoja de la cabeza.

**Opción B ⭐: tu fénix**
- De 0 a 560 ms: las mismas llamas rojas en el ninja.
- 560 ms: el ninja corre y tu fénix (`vfx_beasts/fire`, fila `fly`) vuela 1,5 m detrás y 1,5 m por encima de él, siguiéndolo.
- L: el fénix cae en picado sobre el objetivo (fila `dive`, 500 ms).
- L+500: hace la fila `attack` (600 ms) sobre el objetivo, con `vfx_chakra/hit` y `vfx_fire/blast`.
- L+1100: el fénix se desvanece (300 ms). Termina hacia L+1650.
- **Por qué la recomiendo:** dibujaste las filas de picado y ataque del fénix y nunca se han visto en el juego. Así la cabeza de dragón no sale en tres técnicas y sigue siendo especial. Y como hay que cambiarle el nombre de todas formas, puede pasar a ser una técnica de ave de fuego.
- **Trabajo:** cambio pequeño (P5, una bestia que acompaña al ninja y las filas `dive` y `attack`).

---

## 4. Dragón de madera: `wood_dragon_jutsu`
**Qué hace:** es el secreto del clan Ryusei, de rango A. Ataca a un objetivo a 9 m con 5d8.
**Ahora:** tu dragón de piedra (`vfx_beasts/earth`) salta en arco y hace `vfx_earth/hit`. Tu icono es un dragón-serpiente verde de madera y raíces: de piedra a madera no hay forma de llegar solo con lo que tenemos.

**Opción A (provisional, sin dibujo nuevo): el dragón sale del suelo**
- 560 ms: `vfx_earth/blast` (púas que brotan entre polvo, 1333 ms) a 1 m delante del ninja.
- 800 ms: tu dragón de piedra salta de entre las púas y vuela al objetivo, a 150 ms por metro (mínimo 900 ms).
- Al llegar: `vfx_earth/hit` y `vfx_earth/multi_hit` (esquirlas hacia atrás). Dura en total unos 2,7 s.
- **Trabajo:** cambio pequeño (P1 y una salida con retraso).

**Opción B ⭐: necesita dibujo nuevo (tuyo o nuestro, para aprobar)**
- Un dragón de madera como el de tu icono, como hoja `vfx_beasts/wood` (fila `fly` de 8 cuadros), que vuela igual que las otras bestias. Con la hoja hecha, el resto es solo datos.
- A puede servir mientras tanto. Y con B, tu dragón de piedra queda libre para una técnica de tierra.

---

## 5. Cadenas selladoras de adamantio: `adamantine_sealing_chains`
**Qué hace:** es el secreto del clan Kōton, de rango A. Ataca a un objetivo a 9 m con 4d10 de fuerza y le sella el chakra.
**Ahora:** un trozo de 64 px de tu haz de chakra vuela en arco como si fuera una piedra y hace `vfx_chakra/hit`. Pero tu haz de chakra (`vfx_chakra/stream`) ya es una cadena dorada con anillos de sello.

**Opción A ⭐: la cadena sale del pecho**
- 560 ms: la cadena (`vfx_chakra/stream`, con `stream_head` en la punta) sale del pecho del ninja y se tiende hasta el objetivo en 400 ms.
- 960 ms: `vfx_chakra/hit` en el objetivo, que es cuando entra el daño.
- De 960 a 1900 ms: la cadena se queda tensa (en bucle) y bajo el objetivo se abre tu círculo de sello dorado con el pilar de luz (`vfx_chakra/blast`, 1333 ms): el chakra queda sellado.
- 1900 ms: la cadena se apaga (300 ms). Dura en total unos 2,3 s.
- **Por qué:** la descripción dice "cadenas que salen del torso", y tu dibujo ya es esa cadena.
- **Trabajo:** cambio pequeño (P4).

**Opción B: cadenas en X, como tu icono (encaja con la versión potenciada, la barrera que paraliza a todos a 2 casillas)**
- 560 ms: tu círculo de sello `vfx_chakra/blast` bajo el objetivo.
- 700 y 850 ms: dos cadenas salen del suelo a los dos lados del círculo y se cruzan en X sobre el objetivo, cada una en 300 ms.
- 1150 ms: `vfx_chakra/hit`. Las cadenas aguantan 700 ms y se apagan. Dura en total unos 2,2 s.
- **Trabajo:** cambio pequeño (P4, con cadenas que no salen del ninja y van inclinadas).

---

## 6. Ocho trigramas, 64 palmas: `taki_sixtyfour_palms`
**Qué hace:** es el secreto del clan Northstar, de rango A. Golpe cuerpo a cuerpo a 1,5 m con 6d6+6 de fuerza que corta el chakra.
**Ahora:** corre, hace el golpe de arma y sale un solo `vfx_chakra/hit`. Tu icono tiene muchas palmas y un círculo.

**Opción A ⭐: palmas abiertas**
- L: el ninja repite la pose de estocada (`pierce`). Cada 90 ms sale una palma: tu aliento de chakra (`vfx_chakra/breath`, el cono con la **mano abierta**) apuntando al objetivo durante 2 o 3 cuadros, alternando arriba, en medio y abajo. Son 8 palmas, de L a L+630.
- Cada dos palmas, un `vfx_chakra/hit`.
- L+720: de remate, tu círculo de sello dorado con el pilar (`vfx_chakra/blast`, 1333 ms) bajo el objetivo: su chakra queda cortado. Termina hacia L+2050.
- **Potenciada (128 palmas):** 16 palmas, una cada 45 ms.
- **Por qué:** tu aliento de chakra ya tiene una palma dibujada, y el círculo dorado hace de círculo del icono.
- **Trabajo:** cambio pequeño (P5).

**Opción B: lluvia de golpes**
- L: aura de chakra en el ninja (`vfx_chakra/aura` y `aura_back`: sello delante y llamas azules detrás).
- De L a L+640: 8 `vfx_chakra/hit` en puntos distintos del cuerpo del objetivo (cabeza, pecho, brazos y piernas), uno cada 80 ms, mientras el ninja repite la pose de ataque.
- L+720: `vfx_chakra/blast` de remate.
- **Trabajo:** cambio pequeño (P5).

---

## 7. Proyectil del dragón de agua: `water_dragon_suiryuudan`
**Qué hace:** es de rango B y lo usan el jugador y los cazadores. Ataca a un objetivo a 9 m con 4d8 de frío.
**Ahora:** tu dragón de agua de cuatro patas (`vfx_beasts/water`) vuela en arco y hace `vfx_water/hit`. Tu icono es un dragón largo, como una serpiente.

**Opción A: sale de un géiser**
- 560 ms: `vfx_water/blast` (el géiser) a 1 m delante del ninja, 1333 ms.
- 800 ms: tu dragón salta del géiser y vuela al objetivo, a 150 ms por metro (mínimo 900 ms).
- Al llegar: `vfx_water/hit`. Dura en total unos 2,7 s.
- **Trabajo:** cambio pequeño (P1 y una salida con retraso).

**Opción B ⭐: cuerpo de agua**
- 560 ms: el dragón sale de las manos y vuela recto (sin arco) hacia el objetivo.
- Detrás de él se va tendiendo tu chorro de agua `vfx_water/stream`, sin la punta (la punta es el dragón). Queda como un cuerpo largo de agua que lo une al ninja.
- Al llegar: `vfx_water/hit`, y el chorro se deshace desde la cola en 300 ms.
- **Por qué:** se parece mucho más a tu icono sin dibujar nada.
- **Trabajo:** cambio pequeño (un haz que crece detrás de la bestia y un vuelo recto).

---

## 8. Balas de tierra: `earth_spear_doryuudan`
**Qué hace:** es de rango B. Lanza una línea de 9 m que hace 3d10 contundente: "del suelo brotan balas de lodo y roca".
**Ahora:** una fila de púas doradas (`vfx_earth/stream`) crece hasta el punto donde haces clic. Tus tres balas de roca (`vfx_earth/multi`) y el impacto que dibujaste para ellas (`vfx_earth/multi_hit`) no se ven nunca.

**Opción A ⭐: las balas**
- 560 ms: `vfx_earth/hit` (estallido de rocas) en el suelo, a 1 m delante del ninja: revienta el suelo.
- 700, 850 y 1000 ms: salen de ahí tres ráfagas de `vfx_earth/multi` (tres balas cada una) que vuelan rectas por toda la línea, en 1 s más o menos para los 9 m.
- Cada vez que una ráfaga pasa por una unidad: `vfx_earth/multi_hit`. La última se rompe al final de la línea. Dura en total unos 3 s.
- **Por qué:** coincide con el nombre, con tu icono (rocas que vuelan) y con tu dibujo de las balas y su impacto.
- **Trabajo:** cambio pequeño (P3 y que una línea pueda lanzar proyectiles en vez del haz).

**Opción B: púas y balas a la vez**
- Las púas de ahora (también son tuyas) llegan hasta el final de la línea, y por encima vuelan dos ráfagas de `vfx_earth/multi`, con `multi_hit` en cada unidad. Queda más lleno, pero también más recargado.
- **Trabajo:** cambio pequeño.

---

## 9. Danza de la luna creciente: `crescent_moon_dance`
**Qué hace:** es de rango B. Golpe de espada cuerpo a cuerpo a 3 m con 3d8+3 cortante.
**Ahora:** corre, hace el golpe y sale la X de viento con hojas (`vfx_wind/hit`). Tu icono son tres medias lunas doradas y una luna. Ninguna de tus medias lunas (`slash`) sale en el juego.

**Opción A ⭐: medias lunas de luz**
- L, L+200 y L+400: el ninja hace tres golpes de arma, cambiando de lado cada vez. Con cada golpe, tu media luna de chakra (`vfx_chakra/slash`, blanca y azul con motas doradas: parece luz de luna) cruza al objetivo en 250 ms (unos 40 px): una alta, otra en medio y otra baja.
- L+600: `vfx_chakra/hit`. Termina hacia L+1600.
- **Potenciada (espadas fantasma):** 5 medias lunas.
- **Trabajo:** cambio pequeño (P1 con movimiento y P5).

**Opción B: medias lunas doradas**
- Lo mismo, con `vfx_fire/slash`, que es la más dorada y la que más se parece a tu icono. El problema es que puede parecer fuego.
- **Trabajo:** cambio pequeño.

---

## 10. Templo del Nirvana: `temple_of_nirvana`
**Qué hace:** es de rango A. Un círculo de 3 m a 7,5 m que hace 2d10 psíquico y deja confuso.
**Ahora:** vuela un orbe con un ojo (`vfx_genjutsu/bolt`) y luego sale el pilar violeta con plumas (`vfx_genjutsu/blast`). Tu icono son plumas blancas cayendo.

**Opción A ⭐: los cuervos bajan del cielo**
- 560 ms: a 3 m de altura sobre el círculo se abre tu vórtice y salen los cuervos (`vfx_beasts/genjutsu`, fila `summon`, 500 ms). Esta fila no se ha visto nunca.
- 1060 ms: la bandada (fila `fly`) baja en picado hasta el centro en 600 ms.
- 1660 ms: tu pilar con plumas `vfx_genjutsu/blast` (1333 ms). A los 1990 ms, `vfx_genjutsu/hit` en cada unidad del círculo. Dura en total unos 3 s.
- **Por qué:** el templo cae desde arriba, con plumas, como en tu icono.
- **Trabajo:** cambio pequeño (P1 y P2, las mismas piezas de la 1; con ellas hechas, esto es solo datos).

**Opción B: la bandada en vez del orbe (ya)**
- Los cuervos (`vfx_beasts/genjutsu`, `fly`) vuelan desde el ninja en lugar del orbe con el ojo, y luego sale el mismo pilar.
- **Trabajo:** **solo datos** (en `OVERRIDE`, cambiar `vfx: 'blast'` por `vfx: 'beast'`).

---

## 11. Chidori: `chidori_lightning_blade`
**Qué hace:** es de rango A y lo usan el jugador y los Kagero. El ninja corre hasta 4,5 m y da un golpe de 5d8 de rayo.
**Ahora:** corre, hace el golpe de arma y sale una chispa (`vfx_lightning/hit`). No hay rayo en la mano ni estocada. *El nombre es de Naruto (está en la lista para cambiar).*

**Opción A ⭐: rayo en la mano y estocada**
- De 0 a 560 ms: pose de lanzar con el estilo "rayo" (chispas en la mano, nuestro y aprobado) y `vfx_lightning/aura` en el ninja.
- 560 ms: corre con el aura pegada al cuerpo, como en Shunshin.
- L: estocada (`pierce`, 500 ms). `vfx_lightning/hit` en el objetivo y tu cono de rayos ramificado (`vfx_lightning/breath`) saliéndole por la espalda, en la dirección de la carrera, durante 400 ms.
- Termina hacia L+1000.
- **Trabajo:** cambio pequeño (P5 y el estilo de lanzamiento de esta técnica).

**Opción B: lo mínimo**
- Solo el aura de rayo durante la carrera, la estocada y `vfx_lightning/hit`.
- **Trabajo:** cambio pequeño (menos que A).

---

## 12. Huracán de la hoja: `leaf_hurricane_senpuu`
**Qué hace:** es de rango D y lo usan el jugador y los saqueadores. Golpea en un círculo de 1,5 m alrededor del ninja con 2d6+3 contundente.
**Ahora:** hace el golpe de arma y sale una estrella de chakra (`vfx_chakra/hit`) **en el pecho del propio ninja**. No gira y no hay viento.

**Opción A ⭐: giro entre cintas de viento**
- 0 ms: el ninja gira en la pose de ataque: el sprite se voltea de izquierda a derecha cada 110 ms, 6 veces (660 ms). Alrededor van tus cintas de viento (`vfx_wind/aura` y `aura_back`).
- 300 ms: tu X de viento con hojas (`vfx_wind/hit`) en cada enemigo del círculo, uno cada 80 ms.
- Dura en total unos 1,3 s.
- **Trabajo:** cambio pequeño (voltear la pose y poner el golpe en cada objetivo).

**Opción B: el ninja se vuelve un torbellino**
- Tu tornado (`vfx_wind/blast`, 1333 ms) centrado en el ninja, que lo tapa, y `vfx_wind/hit` en cada enemigo.
- **Trabajo:** cambio pequeño.

---

## Fuera de esta lista (para otra ronda)
- **Clon de sombra:** el clon no se ve nunca. Hay que dibujar en el mapa una copia del ninja, y eso es más que un efecto.
- **Llama persecutoria:** solo datos, ya: con `vfx: 'beast'` vuela tu fénix. Si el fénix va a la 3, mejor otra cosa.
- **Kirin:** es tu diseño. El dragón de rayo solo sale en la versión potenciada, aunque tu icono es el dragón. ¿Lo quieres siempre?
- **Yasaka no Magatama:** son joyas lanzadas, así que irían ráfagas de `vfx_chakra/multi` (tres orbes de sello), como en la 8.
- **Comando y Sumisión:** sus iconos tienen un ojo rojo, y eso es de los ojos de clan, que esperan a que tú digas.
- **Bloque y Muro Kōton, Gólem de madera:** necesitan dibujo nuevo.

## Preguntas para ti
1. **Tamaño de la cabeza de dragón:** ¿a 1x (tus píxeles exactos, unos 6 m) o a 0,5x (unos 3 m, reducida, con algo menos de detalle)? Propongo 1x para la 1 y 0,5x para la 2.
2. **¿Dónde puede salir la cabeza de tu Gran aniquilación?** Propongo solo en la 1 y la 2, para que siga siendo especial. Por eso en la 3 recomiendo el fénix.
3. **Estilo de lanzamiento:** el creador guarda un estilo para cada técnica, pero la batalla siempre usa el del personaje. ¿Hacemos que la batalla use el que elegiste para cada técnica?

*Nota:* el texto potenciado de la Llama Dragón dice "Amaterasu negra", que es un nombre de Naruto. Aquí no lo toco.
