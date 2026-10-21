# Jutsu nuevos de rango D y C: propuesta para tu aprobación

Son **12 jutsu**: 6 de rango D y 6 de rango C. Todos usan **tus sprites aprobados**, así que no hay que dibujar nada. Los nombres son originales y siguen tu regla: *Técnica de <Elemento>: <nombre>*.

**Cómo leer cada ficha:**
- **Solo datos:** puede entrar ya. Se escribe la ficha del jutsu y el juego ya sabe animarlo con tus sprites.
- **Cambio pequeño:** hace falta un poco de código, pero nada de dibujo.
- **Ajuste de animación:** es opcional. Combina tus cuadros, que ya existen, para que el efecto se parezca más a lo que hace el jutsu: un aura antes, otro impacto, un vuelo más lento… Nunca redibujo, giro ni retiño tu arte. Puedes aprobar el jutsu tal cual y el ajuste después.

**Imágenes** (con etiquetas en español):
- `jutsus-propuestos.png`: los 12 en una sola hoja.
- `jutsus-propuestos-1.png` y `jutsus-propuestos-2.png`: los mismos 12 con su animación cuadro a cuadro.
- `previews/<n>-<nombre>.png`: una por jutsu. Arriba van tus hojas, cuadro por cuadro. Debajo, la animación en filas: «Ahora», «Opción A» y «Opción B».

**Lo que vale para todos** (para no repetirlo en cada uno):
- **Al lanzar:**
  - Los jutsu a distancia usan la pose de conjurar, en el estilo de lanzamiento del ninja (por defecto, la Palma de runas). Si el ninja tiene activado el estallido de chakra al lanzar, también se ve.
  - El arma se guarda sola para hacer los sellos.
  - Los de cuerpo a cuerpo (Tajo, Corona y Embestida) usan la pose de ataque, sin sellos.
- **Tiempos de hoy:**
  - el gesto de lanzar, 0,56 s;
  - el vuelo, entre 0,5 y 1 s según la distancia;
  - el impacto, 1 s;
  - una explosión de área, entre 1,2 y 1,4 s.

  Este ritmo es el de prueba que todavía no apruebas.
- **Potenciar** añade un dado y agranda el área. Es lo único que el juego ya sabe hacer al potenciar.
- **Enemigos:** la IA lanza sola cualquier jutsu de daño, pero solo si se lo damos a un tipo de enemigo o a un compañero, porque cada uno tiene su lista fija. El Manto y el Rocío no los usaría.
- **Icono:** hasta que pintes uno, el hueco muestra el icono genérico teñido del color del elemento.
- **Quién lo aprende:** hoy cualquier ninja puede elegir cualquiera. Cuando la naturaleza decida los jutsu (pendiente), cada uno irá con su elemento.
- **Cifras de referencia:**
  - Un ninja de nivel 1 tiene 12 de chakra y su CD de salvación es de unos 13.
  - Los D cuestan 1 chakra; los C, 2. El Rocío es la excepción: es D pero cuesta 2.
  - La Bola de fuego (C), la más fuerte de su rango, cuesta 3.

---

## Fuego

### 1. Técnica de Fuego: Tres brasas
*Fire Technique: Three Embers* · **Rango D** · Fuego · **1 chakra** (+1 potenciado) · Acción · un objetivo a 9 m
- **Descripción:** «Con un chasquido de dedos salen tres brasas encendidas que vuelan en abanico y estallan contra el enemigo. Es poca cosa, pero no falla en prender un arbusto seco.»
- **Mecánica:**
  - Tirada de ataque de jutsu contra la CA: **2d6 de fuego**. Un crítico dobla los dados.
  - Como todo fuego, quema los arbustos y hace estallar barriles y sellos explosivos a 1 m del objetivo, aunque falle.
  - Potenciado: 3d6.
- **Animación:** pose de conjurar → vuelan **tres cometas de fuego** (`vfx_fire/multi`, 8 cuadros a 12 fps) → **estallido de púas de fuego** (`vfx_fire/hit`, 12 cuadros, 1 s).
- **Ajuste de animación:** así está bien.
  - Descarté la pose de lanzar: con el arma guardada, esa pose pone un kunai en el puño.
  - Si quieres otro gesto solo para este jutsu, la pieza P1 te deja elegirle un estilo de lanzamiento propio.
- **Para agregarlo:** solo datos. id `fire_three_embers`, nombre japonés *Mittsu Okibi*.
- Imagen: `previews/1-tres-brasas.png`

## Viento

### 2. Técnica de Viento: Remolino
*Wind Technique: Whirl* · **Rango D** · Viento · **1 chakra** (+1) · Acción · un objetivo a 9 m
- **Descripción:** «Un remolino de aire del tamaño de un puño sale girando de la palma y golpea como un mazazo. A su paso arranca la hierba y deja sin escondite al que se agazapaba.»
- **Mecánica:**
  - **Salvación de FUE**; si la pasa, recibe la mitad. **1d8 contundente.**
  - **Corta los arbustos y la hierba** alrededor del objetivo, que ya no sirven para esconderse.
  - Potenciado: 2d8.
  - Frente a Tres brasas: pega menos, pero siempre hace algo, y castiga a los ninjas ágiles y flojos de fuerza.
- **Animación:** pose de conjurar → vuela **tu bola-vórtice de viento** (`vfx_wind/bolt`, de tu paint-over, 8 cuadros a 10 fps; hoy ningún jutsu la usa) → **X de hojas de viento** (`vfx_wind/hit`, 1 s).
- **Ajuste de animación:** así está bien.
- **Para agregarlo:** solo datos (corta follaje). id `wind_whirl`, nombre japonés *Tsumuji-dama*.
- Imagen: `previews/2-remolino.png`

### 3. Técnica de Viento: Manto de brisa
*Wind Technique: Breeze Mantle* · **Rango D** · Viento · **Utilidad** · **1 chakra** · **Acción adicional** · sobre ti
- **Descripción:** «Una brisa se enrosca alrededor del cuerpo y desvía cada golpe un palmo. Mientras dura, nadie te acierta limpio.»
- **Mecánica:**
  - Hasta el inicio de tu próximo turno, **los ataques contra ti tienen desventaja**. Es la acción Esquivar, pero como acción adicional: atacas y te defiendes en el mismo turno.
  - No protege de los jutsu con salvación.
  - Es silencioso y no se puede potenciar.
  - Compite por el **único hueco de Utilidad** con el Clon de sombra, el Shunshin, la Sustitución, la Emboscada con sello explosivo y la Palma mística.
- **Animación:** pose de conjurar → **tu aura de viento** envuelve al ninja: cintas en espiral con hojas (`vfx_wind/aura`) y el brillo verde detrás (`aura_back`). Son 12 cuadros a 10 fps.
- **Ajuste de animación:**
  - **A (recomendada):** el aura se queda **tenue (40 %) en bucle hasta su próximo turno**, para que se vea quién está protegido. Necesita una marca propia, para que la acción Esquivar normal no salga también con viento.
  - **B:** solo un destello de 1,2 s, como el Clon.
- **Para agregarlo:** **cambio pequeño:** un comportamiento nuevo que da «esquivando» y pone el aura, como el Clon. id `wind_breeze_mantle`, nombre japonés *Kaze no Koromo*.
- Imagen: `previews/3-manto-de-brisa.png`

## Rayo

### 4. Técnica de Rayo: Calambre
*Lightning Technique: Jolt* · **Rango D** · Rayo · **1 chakra** (+1) · Acción · un objetivo a 7,5 m
- **Descripción:** «Agujas finas de electricidad se clavan en el enemigo. El daño es poco, pero los músculos se le agarrotan y le cuesta esquivar.»
- **Mecánica:**
  - **Salvación de CON**; si la pasa, no le pasa nada.
  - Si falla: **1d6 de rayo** y queda **Entumecido**:
    - −2 a las salvaciones de DES y a los ataques a distancia;
    - −2 a las pruebas de DES, también al Sigilo en el camino.
  - Si el objetivo está en el agua, la corriente se propaga, como con todo rayo.
  - Potenciado: 2d6.
  - Sirve para preparar el terreno: Calambre y luego Bola de fuego o Ráfaga cortante, que piden salvación de DES.
  - **Duración:** hoy Entumecido dura **hasta el campamento**. Si un enemigo se lo lanza a tu grupo, el ninja lo arrastra el resto del tramo. Para que dure 2 rondas hay que crear un estado nuevo, con su nombre y su texto (pieza P5).
- **Animación:** pose de conjurar → vuelan **agujas de trueno** (`vfx_lightning/multi`, 8 cuadros a 12 fps) → **chispazo** (`vfx_lightning/hit`, 1 s) → sobre el objetivo flota el cartel «Entumecido».
- **Ajuste de animación:** así está bien. Descarté poner tu aura de rayo sobre el objetivo: es la hoja de «cargar», y en un enemigo se leería como que se potenció.
- **Para agregarlo:** solo datos. id `lightning_jolt`, nombre japonés *Shibire-bari*.
- Imagen: `previews/4-calambre.png`

### 5. Técnica de Rayo: Abanico de chispas
*Lightning Technique: Spark Fan* · **Rango C** · Rayo · **2 chakra** (+2) · Acción · **cono de 4,5 m**
- **Descripción:** «De la palma abierta sale un abanico de rayos ramificados que lame a todo el que esté delante.»
- **Mecánica:**
  - **Salvación de DES**; la mitad si la pasa. **2d8 de rayo** a todos los del cono, también a los aliados.
  - Si alguno está en el agua, la corriente se extiende.
  - Potenciado: 3d8, y el cono llega a 5,6 m y se abre más.
- **Animación:** pose de conjurar → **tu cono de rayos ramificados** (`vfx_lightning/breath`, 112×119, 8 cuadros a 12 fps) se repite a lo largo del cono durante 1,4 s. Hoy los conos no muestran a quién le dieron.
- **Ajuste de animación:**
  - **A (recomendada):** un **chispazo** (`vfx_lightning/hit`) sale sobre cada alcanzado, uno tras otro cada 80 ms, y así se ve a quién le dio. Es la pieza P3. Lo mismo serviría para los conos que ya existen, pero eso sería un sí aparte.
  - **Además, si quieres (P1):** que el jugador le ponga a este jutsu su propio estilo de lanzamiento, por ejemplo «Mano de rayo» (agachado, con la mano crepitando abajo).
- **Para agregarlo:** solo datos. id `lightning_spark_fan`, nombre japonés *Hibana Ōgi*.
- Imagen: `previews/5-abanico-de-chispas.png`

## Tierra

### 6. Técnica de Tierra: Guijarros
*Earth Technique: Pebble Shot* · **Rango D** · Tierra · **1 chakra** (+1) · **Acción adicional** · un objetivo a 9 m
- **Descripción:** «Tres piedras se desprenden del suelo y salen disparadas como balas. Pegan poco, pero salen tan rápido que caben entre un golpe y otro.»
- **Mecánica:**
  - Tirada de ataque: **1d6 contundente**. Potenciado: 2d6.
  - Es el **único ataque D de acción adicional**.
  - El orden importa:
    - Primero el espadazo y luego Guijarros: funciona, porque el arma se guarda gratis.
    - Al revés no: el arma queda guardada, y sacarla pide la acción adicional, que ya se gastó.
  - **Ojo, se parece a otro jutsu:** usa las tres balas de roca, y por eso se parece más a unas «balas de tierra» que la propia *Balas de tierra* (B), que se ve como una hilera de púas.
- **Animación:** pose de conjurar → vuelan **tres balas de roca** (`vfx_earth/multi`, 8 cuadros a 12 fps) → **impacto de balas de roca** (`vfx_earth/multi_hit`, 12 cuadros; la tierra es el único elemento con impacto propio para esto).
- **Ajuste de animación:**
  - **A (recomendada):** durante la pausa de 0,56 s que ya existe, **tu aura de tierra** sube alrededor del ninja: columnas de roca detrás y anillo de polvo delante. Así se ve que las piedras salen del suelo. No alarga el jutsu. Es la pieza P3.
- **Para agregarlo:** solo datos. Si además se lo damos a un enemigo, hay que arreglar la IA (P7): hoy, después de una acción adicional, la IA no vuelve a planear y pierde la acción. id `earth_pebble_shot`, nombre japonés *Koishi-dan*.
- Imagen: `previews/6-guijarros.png`

### 7. Técnica de Tierra: Corona de púas
*Earth Technique: Spike Crown* · **Rango C** · Tierra · **2 chakra** (+2) · Acción · **todo a 3 m a tu alrededor**
- **Descripción:** «El ninja pisa fuerte y la tierra a su alrededor estalla en púas. Quien lo tenía rodeado aprende a guardar distancia.»
- **Mecánica:**
  - **Salvación de DES**; la mitad si la pasa. **2d8 perforante** a todos los que estén a 3 m, aliados incluidos, pero no al lanzador.
  - No necesita sellos (es un pisotón), así que el ninja no guarda el arma.
  - Potenciado: 3d8 y 4,5 m.
  - Frente al Huracán de la hoja (D: 2d6+3, a 1,5 m): pega menos a cada uno, pero llega al doble de distancia. Es el botón para salir de un cerco.
- **Animación hoy:** pose de ataque y **explosión de roca** (`vfx_earth/hit`) **sobre el pecho del ninja**, que lo tapa durante 1 s y no deja ver a quién le dio. Es lo mismo que hace hoy el Huracán de la hoja con el chakra.
- **Ajuste de animación:**
  - **A (recomendada):**
    1. Pose de **cargar** (ya existe) durante 0,4 s, con **tu aura de tierra**: columnas de roca detrás y anillo de polvo delante.
    2. Luego, una **explosión de roca sobre cada enemigo alcanzado**.

    El ninja siempre se ve. Son las piezas P2 y P3.
  - **B:** tus **púas de cristal** (`vfx_earth/blast`) brotando detrás del ninja. Es más vistoso, pero da más trabajo, y es justo lo que muestra el *Despertar del gólem de madera* (S): le quitaría exclusividad.
- **Para agregarlo:** solo datos (cuerpo a cuerpo, área alrededor de sí, daño perforante). id `earth_spike_crown`, nombre japonés *Toge no Kanmuri*.
- Imagen: `previews/7-corona-de-puas.png`

## Agua

### 8. Técnica de Agua: Rocío sanador
*Water Technique: Healing Dew* · **Rango D** · Agua · **Utilidad** · **2 chakra** (+1) · Acción · un aliado a 6 m, o tú mismo
- **Descripción:** «Una gota de agua clara cruza el aire y se rompe sobre un compañero como rocío fresco. Cierra rasguños, no milagros.»
- **Mecánica:**
  - **Cura 1d8.** Potenciado: 2d8.
  - **Puede levantar a un aliado caído desde 6 m**, porque curar a un caído lo pone en pie. Por eso cuesta 2 y no 1.
  - La Palma mística (C) cura más, 2d8+3 por 3 chakra, pero solo tocando.
  - El bono del Médico no se aplica, igual que en la Palma.
  - Es silencioso.
  - La IA no lo usa: su curación está fijada a la Palma.
  - Compite por el hueco de Utilidad.
- **Animación hoy:** un anillo verde dibujado en código. No es tu arte.
- **Ajuste de animación:**
  - **A (recomendada):**
    1. **Tu orbe de agua** (`vfx_water/bolt`) vuela hasta el aliado.
    2. **Tu aura de agua** (`vfx_water/aura` y `aura_back`) lo envuelve 0,8 s, con el número verde de la curación.

    Quité la salpicadura en estrella porque parecía un ataque. Es la pieza P3.
  - **B:** sin vuelo, solo el aura de agua sobre el aliado.
- **Para agregarlo:** solo datos (curación a un aliado, alcance 6 m). id `water_healing_dew`, nombre japonés *Iyashi no Tsuyu*.
- Imagen: `previews/8-rocio-sanador.png`

### 9. Técnica de Agua: Géiser
*Water Technique: Geyser* · **Rango C** · Agua · **2 chakra** (+2) · Acción · círculo de 1,5 m de radio a 9 m
- **Descripción:** «El suelo bajo el enemigo se hincha y revienta en una columna de agua que lo levanta y lo deja caer. Contra la tierra firme no hay esquiva que valga.»
- **Mecánica:**
  - **Salvación de FUE**; la mitad si la pasa. **3d6 contundente** a todos los del círculo, aliados incluidos.
  - Potenciado: 4d6 y radio de 2,25 m.
  - Frente a la Bola de fuego (3 chakra, 3d8 y Quemado, salvación de DES): pega menos y cuesta menos, y castiga a los ágiles.
  - No choca con el *Chorro de agua* que ya acordaste, que es en línea y con empujón.
  - Extra opcional (cambio pequeño): que apague a los que estén Quemados dentro del círculo.
- **Animación hoy:** vuela **tu burbuja de agua** (`vfx_water/sphere`) y al llegar sube **tu géiser** (`vfx_water/blast`, 16 cuadros, 1,3 s).
- **Ajuste de animación:**
  - **A (recomendada):** **sin proyectil**, porque un géiser sale de abajo, no viene volando:
    1. 0,3 s de **salpicadura de aviso** en el suelo (`vfx_water/hit`).
    2. Sube el géiser, con una **sacudida leve** de pantalla.

    Es la pieza P4, la misma idea que ya usa el Kirin.
  - **B:** tal cual está hoy.
- **Para agregarlo:** solo datos. id `water_geyser`, nombre japonés *Kanketsusen*.
- Imagen: `previews/9-geiser.png`

## Genjutsu

### 10. Técnica de Genjutsu: Espejismo
*Genjutsu Technique: Mirage* · **Rango C** · Genjutsu · **2 chakra** (+2) · Acción · un objetivo a 9 m
- **Descripción:** «Un orbe violeta flota hasta la mente del enemigo. Por un momento el mundo se le dobla: ve caminos que no existen y enemigos donde hay aire.»
- **Mecánica:**
  - **Salvación de SAB**; si la pasa, no le pasa nada.
  - Si falla: **2d6 psíquico** y queda **Confundido 2 rondas**: 1 de cada 4 veces pierde la acción.
  - Potenciado: 3d6.
  - Es la versión pequeña, de un solo objetivo, del Templo del Nirvana (A).
  - Los enemigos sí pueden usarlo. El Templo no lo usa ninguno.
  - **Ruidoso**, como todos los jutsu de daño. Si fuera silencioso, podría herir a un guardia en la fase de sigilo sin dar la alarma. Si lo quieres silencioso, hace falta la pieza P6.
- **Animación hoy:** pose de conjurar → vuela **tu orbe-ojo** (`vfx_genjutsu/bolt`, 8 cuadros a 10 fps) → **estallido violeta** (`vfx_genjutsu/hit`) y el cartel «Confundido».
- **Ajuste de animación:**
  - **A (recomendada):** **tu esfera-ojo con anillo y púas** (`vfx_genjutsu/sphere`), que es más vistosa, volando **1,5 veces más despacio**, como a la deriva en un sueño. La esfera es solo datos; el vuelo lento es la pieza P3.
  - Descarté envolver al objetivo con el aura de genjutsu: en el juego esa aura ya significa «tomado por el Comando de un Northstar».
- **Para agregarlo:** solo datos. id `genjutsu_mirage`, nombre japonés *Shinkirō*.
- Imagen: `previews/10-espejismo.png`

## Kenjutsu

### 11. Técnica de Kenjutsu: Tajo sangrante
*Kenjutsu Technique: Bleeding Cut* · **Rango D** · Kenjutsu · **1 chakra** (+1) · Acción · cuerpo a cuerpo: se acerca de un salto hasta 3 m
- **Descripción:** «Un corte rápido y bajo, que busca la arteria y no el hueso. La herida no se cierra sola.»
- **Mecánica:**
  - Tirada de ataque: **1d8 cortante**. Si acierta, deja **Sangrando**: 1d4 por turno hasta que lo venden. Sigue sangrando en el camino, 1d4 por tramo.
  - No necesita sellos.
  - Ruidoso; silencioso solo con la pieza P6.
  - Potenciado: 2d8.
  - **Ojo:** los jutsu de cuerpo a cuerpo no desenfundan. Si el ninja guardó el arma para otro jutsu, el tajo sale con el puño. Hoy le pasa igual a la Danza de la luna creciente. El arreglo es la pieza P8.
- **Animación hoy:** salto → pose de ataque → **X de hojas de viento** (`vfx_wind/hit`) sobre el objetivo, y el cartel «Sangrando». El Kenjutsu usa tu juego de viento.
- **Ajuste de animación:**
  - **A (recomendada):** en vez de la X, **una sola media luna de viento** (`vfx_wind/slash`) cruza al objetivo en el cuadro del golpe y se desvanece. Un corte se ve como un tajo, no como una explosión.
    - La media luna solo se espeja, nunca se gira, porque girarla deformaría tus píxeles.
    - Es la pieza P3.
    - La Danza de la luna creciente (B) tiene el mismo problema. Cambiarla sería un sí aparte.
- **Para agregarlo:** solo datos (cuerpo a cuerpo, Sangrando). id `kenjutsu_bleeding_cut`, nombre japonés *Chishio-giri*.
- Imagen: `previews/11-tajo-sangrante.png`

## Taijutsu

### 12. Técnica de Taijutsu: Embestida
*Taijutsu Technique: Rush* · **Rango C** · Taijutsu · **2 chakra** (+2) · Acción · cuerpo a cuerpo con **alcance de 6 m**
- **Descripción:** «El ninja desaparece en un borrón y aparece encima del enemigo con el puño ya en camino.»
- **Mecánica:**
  - El ninja va en línea recta hasta el objetivo, sin recibir ataques de oportunidad, y golpea. Tirada de ataque: **2d8 contundente**.
  - No necesita sellos.
  - Potenciado: 3d8.
  - El riesgo: terminas pegado al enemigo.
  - **Alcance:** 6 m es más que el Chidori (A, 4,5 m). Si te parece mucho, lo dejamos en 4,5 m.
- **Animación hoy:** corre con la carrera normal → pose de ataque → **estallido de chakra** (`vfx_chakra/hit`). Si el ninja lleva arma en la mano, el golpe sale con el arma, como hoy en el Huracán de la hoja y el Night Guy.
- **Ajuste de animación:**
  - **A (recomendada):** **destello de chakra** en el punto de salida (`vfx_chakra/aura` y `aura_back`, como el Shunshin) y **carrera al doble de rápido**. Es la pieza P3.
  - Descarté una estela de luz: se parece a la fase azul de los Ryusei, la de la Estocada Fugaz.
- **Para agregarlo:** solo datos (cuerpo a cuerpo, alcance 4 casillas). id `taijutsu_rush`, nombre japonés *Mōshin*.
- Imagen: `previews/12-embestida.png`

---

## Las piezas de código pequeñas

Ninguna dibuja nada: todas usan tus cuadros tal cual. Cada pieza sirve para varios jutsu.

| Pieza | Qué hace | La usan |
|---|---|---|
| **P1** Estilo por jutsu | El combate usa el estilo de lanzamiento que el jugador eligió para cada jutsu en el creador. Hoy usa solo el general | Abanico, Tres brasas (opcional) |
| **P2** Pose por jutsu | Un jutsu puede usar la pose de cargar, que ya existe, en vez de la de ataque | Corona |
| **P3** Piezas antes y después | Un aura en el lanzador antes, un impacto sobre cada alcanzado, otro sprite de impacto, un vuelo más lento, una carrera más rápida, una sacudida | Abanico, Guijarros, Corona, Rocío, Espejismo, Tajo, Embestida; el aura tenue del Manto |
| **P4** Desde el suelo | Un área que aparece en el punto, sin proyectil, como el Kirin | Géiser |
| **P5** Estado corto | Un Entumecido de 2 rondas: un estado nuevo con su texto | Calambre (si lo quieres) |
| **P6** Silencioso con daño | Un jutsu silencioso que hiere cuenta como ataque en la fase de sigilo | Espejismo, Tajo (si los quieres silenciosos) |
| **P7** IA con acción adicional | La IA vuelve a planear después de una acción adicional | Guijarros, si lo usan enemigos |
| **P8** Kenjutsu desenfunda | Los jutsu de Kenjutsu sacan el arma solos | Tajo; arregla también la Danza de la luna creciente |
| **Manto** | Un comportamiento nuevo que da «esquivando» | Manto de brisa |

## Lo que dejé fuera

- **Técnica de Veneno: Dardos ácidos:**
  - La naturaleza Veneno todavía no existe.
  - Era una copia pequeña del Venom Surge (B), que ya está diseñado.
  - Mejor que llegue junto con él.
  - En su lugar entró el Remolino, que usa tu bola-vórtice de viento.
- **Chorro de agua (C):** ya lo acordaste. Solo espera el código del empujón.
- **Tu ejemplo del dragón** («que salga la cabeza y dispare») es sobre un jutsu que ya existe, así que va en la otra lista: las ideas para los efectos de los jutsu actuales.

## Lo que necesito que me digas

1. **¿Cuáles entran?** Sí o no a cada número del 1 al 12.
2. **¿Te gustan los nombres?** Cambia los que quieras por los tuyos.
3. **Animación:** para cada uno, ¿A, B o tal cual?
4. **Calambre:** ¿Entumecido hasta el campamento (solo datos) o 2 rondas (P5)?
5. **Embestida:** ¿alcance de 6 m o de 4,5 m?
6. **Rocío:** ¿le ponemos también tu aura de agua a la Palma mística? Si no, la Palma (C) se vería más pobre que este D.
7. **Guijarros:** ¿te parece bien que se parezca más a unas «balas de tierra» que la propia *Balas de tierra* (B)?
8. **Espejismo y Tajo:** ¿ruidosos, como los demás jutsu de daño, o silenciosos (P6)?
9. **Para más adelante:** cuando la naturaleza decida los jutsu, ¿quién aprende los de Genjutsu, Kenjutsu y Taijutsu?

Cuando me respondas, primero te mando imágenes de antes y después dentro del juego. No meto nada hasta que digas que sí.

## Resumen

| # | Nombre | Rango | Elemento | ¿Solo datos? | Ajuste de animación |
|---|---|---|---|---|---|
| 1 | Técnica de Fuego: Tres brasas | D | Fuego | Sí | No (así está bien) |
| 2 | Técnica de Viento: Remolino | D | Viento | Sí | No (así está bien) |
| 3 | Técnica de Viento: Manto de brisa | D | Viento | No (cambio pequeño) | Sí (A: aura tenue hasta tu turno) |
| 4 | Técnica de Rayo: Calambre | D | Rayo | Sí | No (así está bien) |
| 5 | Técnica de Rayo: Abanico de chispas | C | Rayo | Sí | Sí (A: chispazo en cada alcanzado) |
| 6 | Técnica de Tierra: Guijarros | D | Tierra | Sí (la IA necesita P7) | Sí (A: aura de tierra al lanzar) |
| 7 | Técnica de Tierra: Corona de púas | C | Tierra | Sí | Sí (A: cargar + roca en cada enemigo) |
| 8 | Técnica de Agua: Rocío sanador | D | Agua | Sí | Sí (A: orbe que vuela + aura de agua) |
| 9 | Técnica de Agua: Géiser | C | Agua | Sí | Sí (A: sale del suelo, sin proyectil) |
| 10 | Técnica de Genjutsu: Espejismo | C | Genjutsu | Sí | Sí (A: esfera-ojo lenta) |
| 11 | Técnica de Kenjutsu: Tajo sangrante | D | Kenjutsu | Sí | Sí (A: una media luna de viento) |
| 12 | Técnica de Taijutsu: Embestida | C | Taijutsu | Sí | Sí (A: destello de chakra + carrera rápida) |
