# Jutsu nuevos de rango D y C (borrador para tu aprobación)

Son **12 jutsu** (6 de rango D y 6 de rango C). Todos usan **tus sprites aprobados** (`src/assets/world/vfx_<elemento>/`). No hace falta dibujar nada nuevo. Cada elemento principal tiene al menos uno:

- Fuego 1, Agua 2, Viento 1, Rayo 2, Tierra 2.
- Genjutsu 1, Taijutsu 1, Kenjutsu 1, Veneno 1 (opcional).

Los nombres son originales y siguen tu regla D24: *Técnica de <Elemento>: <nombre>*.

Para cada jutsu pongo:
- el nombre en español y en inglés;
- la descripción;
- las reglas;
- la animación, con los archivos exactos;
- si se añade solo con datos o necesita un poco de código;
- **el ajuste de animación que te recomiendo**, con opciones A/B cuando de verdad hay que elegir.

Para ver cada efecto cuadro por cuadro, con etiquetas en español, están las tiras en
`/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/jutsu-list/vfx/`
(el nombre es `<elemento>-<papel>.png`, por ejemplo `earth-multi_hit.png`).

## Resumen

| # | Nombre | Rango | Qué hace | Animación (tus sprites) | ¿Solo datos? |
|---|---|---|---|---|---|
| 1 | Técnica de Fuego: **Tres brasas** | D | Disparo barato a distancia; prende arbustos | 3 cometas de fuego → estallido de fuego | Sí |
| 2 | Técnica de Tierra: **Guijarros** | D | Disparo débil como **acción adicional** | 3 balas de roca → impacto de balas de roca | Sí |
| 3 | Técnica de Rayo: **Calambre** | D | Daño leve que deja **Entumecido** (−2 a DES) | Agujas de trueno → chispazo | Sí |
| 4 | Técnica de Viento: **Manto de brisa** | D | Acción adicional: te atacan con desventaja hasta tu turno | Aura de viento sobre el ninja | No: código pequeño |
| 5 | Técnica de Kenjutsu: **Tajo sangrante** | D | Corte cuerpo a cuerpo y silencioso que deja **Sangrando** | Pose de ataque → X de viento | Sí |
| 6 | Técnica de Agua: **Rocío sanador** | D | Curación pequeña **a distancia** | Hoy: anillo verde dibujado en código | Sí |
| 7 | Técnica de Agua: **Géiser** | C | Área a distancia: un géiser revienta bajo los pies (tirada de FUE) | Géiser de agua (blast) | Sí |
| 8 | Técnica de Tierra: **Corona de púas** | C | Púas brotan **alrededor tuyo** (3 m) | Hoy: estallido de roca sobre el ninja | Sí |
| 9 | Técnica de Rayo: **Abanico de chispas** | C | Cono corto; en el agua la corriente se propaga | Cono de rayos ramificados | Sí |
| 10 | Técnica de Genjutsu: **Espejismo** | C | Un objetivo queda **Confundido**; no delata al lanzador | Orbe-ojo violeta → estallido violeta | Sí |
| 11 | Técnica de Taijutsu: **Embestida** | C | Cruza hasta 9 m de golpe y pega | Carrera → estallido de chakra | Sí |
| 12 | Técnica de Veneno: **Dardos ácidos** (opcional) | C | Daño de veneno y **Envenenado** | 3 dardos de veneno → salpicadura verde | Casi: falta la naturaleza Veneno |

**Los enemigos también los usarán.** La IA lanza sola cualquier jutsu que haga daño. Así habrá enemigos de rango bajo más variados. Las excepciones son el Manto y el Rocío, que la IA no usa.

**Cifras de referencia** (sacadas de los jutsu actuales; no hay tabla de rangos escrita):
- Un ninja de nivel 1 tiene 12 de chakra y su CD de salvación es de unos 13.
- Los D cuestan 1 chakra; los C, 2–3.
- Potenciar añade 1 dado y agranda el área (los círculos ×1,5; el cono más largo y más ancho). Es lo único que el juego ya sabe hacer al potenciar.

**Water Stream / Chorro de agua** (C, ya acordado) no está en la lista porque ya tiene diseño. Solo espera el código del empujón.

---

## Rango D

### 1. Técnica de Fuego: Tres brasas — D
*Fire Technique: Three Embers*
- id `fire_three_embers`, japonés *Mittsu Hibana*, barra *Brasas* / *Embers*.
- Categoría: Elemental.

> Con un chasquido de dedos salen tres brasas encendidas que vuelan en abanico y estallan contra el enemigo. Es poca cosa, pero no falla en prender un arbusto seco.

- **Reglas:**
  - Acción, 1 chakra (+1 potenciado). Un objetivo a 9 m.
  - **Tirada de ataque de jutsu** contra CA: 1d10 de fuego (un crítico dobla los dados).
  - Prende la madera: quema los arbustos junto al objetivo y hace estallar barriles y sellos explosivos cercanos.
  - Potenciado: 2d10.
- **Animación:**
  - Pose `cast`, en el estilo de lanzamiento del ninja.
  - Vuela de la mano al objetivo `vfx_fire/multi.png` (tres cometas de fuego, 75×76, 8 cuadros a 12 fps; entre 0,5 y 1 s según la distancia).
  - Al llegar, `vfx_fire/hit.png` (estallido de púas de fuego, 96×80, 12 cuadros, 1 s).
  - Tiras: `fire-multi.png`, `fire-hit.png`.
- **Cómo se añade:** solo datos (`vfx: 'multi'`, `env: Ignites Wood`).
- **Ajuste de animación:**
  - **A (recomendada; código pequeño G2):** usar la pose **`throw` (lanzar)** en vez de `cast`. Son 5 cuadros a 8 fps y ya la aprobaste. Así el ninja *lanza* las brasas con la mano, como un shuriken, y las suelta en el cuadro del lanzamiento. Para un jutsu tan rápido se lee mejor un gesto corto de lanzar que la pose de conjurar.
  - **B:** tal cual.
- **Por qué es divertido:** es el "disparo de siempre" de un ninja de fuego novato. Gasta poco y sirve para rematar o para quemar el arbusto donde se esconde alguien.

### 2. Técnica de Tierra: Guijarros — D
*Earth Technique: Pebble Shot*
- id `earth_pebble_shot`, japonés *Koishi-dan*, barra *Guijarros* / *Pebbles*.
- Categoría: Elemental.

> Tres piedras se desprenden del suelo y salen disparadas como balas. Pegan poco, pero salen tan rápido que caben entre un golpe y otro.

- **Reglas:**
  - **Acción adicional**, 1 chakra (+1). Un objetivo a 9 m.
  - Tirada de ataque de jutsu: 1d6 contundente.
  - Potenciado: 2d6.
- **Animación:**
  - Pose `cast`.
  - Vuela `vfx_earth/multi.png` (tres balas de roca, 118×79, 8 a 12 fps).
  - Al llegar, `vfx_earth/multi_hit.png` (impacto de balas de roca, 95×98, 12 cuadros, 1 s, que salpica hacia atrás). La tierra es el único elemento con impacto propio para `multi`, así que el efecto ya encaja.
  - Tiras: `earth-multi.png`, `earth-multi_hit.png`.
- **Cómo se añade:** solo datos (`castTime: 'Bonus Action'`, `vfx: 'multi'`).
- **Ajuste de animación:**
  - **A (recomendada; código pequeño G3):** antes del disparo, el `vfx_earth/aura.png` (anillo de polvo y guijarros) aparece 0,3 s a los pies del ninja, y luego salen las balas. Así se ve que las piedras *salen del suelo*. Además, como es acción adicional, la pausa del lanzamiento bajaría de 0,56 s a 0,3 s para que se sienta rápido.
  - **B:** tal cual.
- **Por qué es divertido:** es el único D que se combina con un ataque normal en el mismo turno (espadazo + guijarros). Es un uso nuevo de la acción adicional.

### 3. Técnica de Rayo: Calambre — D
*Lightning Technique: Jolt*
- id `lightning_jolt`, japonés *Shibire-bari*, barra *Calambre* / *Jolt*.
- Categoría: Elemental.

> Agujas finas de electricidad se clavan en el enemigo. El daño es poco, pero los músculos se le agarrotan y le cuesta esquivar.

- **Reglas:**
  - Acción, 1 chakra (+1). Un objetivo a 7,5 m.
  - **Salvación de CON**; si la pasa, no le pasa nada.
  - Si falla: 1d6 de rayo y queda **Entumecido**: −2 a las salvaciones de DES y a los ataques a distancia.
  - Si el objetivo está en el agua, la corriente pasa por el agua (eso el juego ya lo hace con todo daño de rayo).
  - Potenciado: 2d6.
  - Ojo: hoy *Entumecido* dura **hasta el campamento**. Si un enemigo se lo lanza a tu grupo, el ninja lo arrastra el resto del tramo. Puede quedarse así o durar 2 rondas (código pequeño G5, el mismo que necesita Venom Surge).
- **Animación:**
  - Pose `cast`.
  - Vuela `vfx_lightning/multi.png` (agujas de trueno, 78×70, 8 a 12 fps).
  - Al llegar, `vfx_lightning/hit.png` (chispazo, 91×91, 1 s).
  - Tiras: `lightning-multi.png`, `lightning-hit.png`.
- **Cómo se añade:** solo datos (`effect: 'numb'`, `saveEffect: Negates`).
- **Ajuste de animación:**
  - **A (recomendada; código pequeño G3):** después del chispazo, el `vfx_lightning/aura.png` (carga eléctrica, 91×135) parpadea 0,6 s a media opacidad *sobre el objetivo*. Así se ve que quedó entumecido.
  - **B:** tal cual.
- **Por qué es divertido:** prepara el terreno para el equipo: Calambre y luego Bola de fuego o Ráfaga cortante, que piden salvación de DES. Y cerca del río es un truco sucio.

### 4. Técnica de Viento: Manto de brisa — D
*Wind Technique: Breeze Mantle*
- id `wind_breeze_mantle`, japonés *Kaze no Koromo*, barra *Manto* / *Mantle*.
- Categoría: **Utilidad**. Ocupa el único hueco de Utilidad, junto a Shunshin, Clon y los demás.

> Una brisa se enrosca alrededor del cuerpo y desvía cada golpe un palmo. Mientras dura, nadie te acierta limpio.

- **Reglas:**
  - **Acción adicional**, 1 chakra. Sobre ti mismo.
  - Hasta el inicio de tu próximo turno, los ataques contra ti tienen **desventaja**. Es lo mismo que la acción Esquivar, pero sin gastar la acción.
  - No protege de jutsu con salvación.
  - Silencioso.
  - Sin versión potenciada: el juego aún no sabe dar más efecto a este tipo de jutsu.
- **Animación:**
  - Pose `cast`.
  - Sobre el ninja, `vfx_wind/aura.png` (cintas de viento en espiral con hojas, 101×124, 12 cuadros a 10 fps, en bucle).
  - Detrás de él, `vfx_wind/aura_back.png` (brillo verde).
  - Tiras: `wind-aura.png`, `wind-aura_back.png`.
- **Cómo se añade:** **código pequeño.** Un nuevo `special` que da la condición *esquivando* (ya existe para la acción Esquivar) y reproduce el aura, como el Clon.
- **Ajuste de animación:**
  - **A (recomendada; código pequeño):** el aura de viento se queda puesta, tenue (40 %) y en bucle, hasta el próximo turno del ninja. Así se ve de un vistazo quién está protegido.
  - **B:** solo el destello de 1,2 s al lanzarlo, como el Clon.
- **Por qué es divertido:** te deja atacar y defenderte en el mismo turno. Es la primera defensa barata para un ninja de nivel bajo.

### 5. Técnica de Kenjutsu: Tajo sangrante — D
*Kenjutsu Technique: Bleeding Cut*
- id `kenjutsu_bleeding_cut`, japonés *Chishio-giri*, barra *Tajo* / *Cut*.
- Categoría: Elemental.

> Un corte rápido y bajo, sin ruido, que busca la arteria y no el hueso. La herida no se cierra sola.

- **Reglas:**
  - Acción, 1 chakra (+1). Cuerpo a cuerpo: el ninja se acerca de un salto hasta 3 m, como en la Danza de la luna creciente.
  - Tirada de ataque: 1d8 cortante.
  - Si acierta, deja **Sangrando**: 1d4 por turno hasta que lo venden. Sigue sangrando por el camino.
  - **Silencioso**: no delata al ninja en la fase de sigilo.
  - No necesita sellos de manos.
  - Potenciado: 2d8.
- **Animación:**
  - Pose `attack` (el golpe del arma, 3 cuadros a 6 fps).
  - Sobre el objetivo, `vfx_wind/hit.png` (X de hojas de viento, 87×96, 1 s). El kenjutsu usa el juego de viento.
  - Tiras: `wind-hit.png`, `wind-slash.png`.
- **Cómo se añade:** solo datos (`melee: true`, `effect: 'bleeding'`, `loud: false`).
- **Ajuste de animación:**
  - **A (recomendada; código pequeño G3):** en vez de la X, sobre el objetivo se reproduce **una vez la media luna** de `vfx_wind/slash.png` (64×68), girada hacia donde corta, justo en el cuadro del golpe. Un corte se ve como un tajo, no como una explosión. Esto también arregla la **Danza de la luna creciente (B)**, que hoy muestra la misma X aunque tiene `slash` puesto.
  - **B:** pose **`pierce` (estocada**, 5 a 8 fps, ya aprobada) con la X de viento. Sería una versión de estocada.
- **Por qué es divertido:** la herida dura más que la pelea. Contra el grupo, hace que las vendas importen.

### 6. Técnica de Agua: Rocío sanador — D
*Water Technique: Healing Dew*
- id `water_healing_dew`, japonés *Iyashi no Tsuyu*, barra *Rocío* / *Dew*.
- Categoría: **Utilidad**.

> Una gota de agua clara cruza el aire y se rompe sobre un compañero como rocío fresco. Cierra rasguños, no milagros.

- **Reglas:**
  - Acción, 1 chakra (+1). **Un aliado a 6 m**, o uno mismo.
  - Cura 1d8. Potenciado: 2d8.
  - Silencioso.
  - Comparación con la Palma mística (C): la Palma cura 2d8+3, pero solo tocando.
  - La IA no lo usa: la curación de la IA está fijada a la Palma.
  - Extra opcional (código pequeño): que además **apague Quemado** en el aliado.
- **Animación hoy:**
  - Con solo datos sale el anillo verde dibujado en código, que no es tu arte. Funciona, pero es pobre.
- **Cómo se añade:** solo datos (`special: 'heal'`, `shape: 'ally'`, alcance 6 m).
- **Ajuste de animación (aquí sí lo recomiendo):**
  - **A (recomendada; código pequeño G3):** el orbe `vfx_water/bolt.png` (80×62, con cola en remolino) vuela en arco hasta el aliado. Allí revienta en `vfx_water/hit.png` (salpicadura en estrella, 94×94). Luego `vfx_water/aura.png` y `aura_back.png` lo envuelven 0,8 s, con los números verdes de siempre. Como cura a distancia, el vuelo deja claro a quién se curó.
  - **B:** sin vuelo, solo el aura de agua sobre el aliado.
- **Por qué es divertido:** cualquier ninja de agua puede ayudar desde lejos sin ser médico. Y no compite con la Palma.

---

## Rango C

### 7. Técnica de Agua: Géiser — C
*Water Technique: Geyser*
- id `water_geyser`, japonés *Kanketsusen*, barra *Géiser* / *Geyser*.
- Categoría: Elemental.

> El suelo bajo el enemigo se hincha y revienta en una columna de agua que lo levanta y lo deja caer. Contra la tierra firme no hay esquiva que valga.

- **Reglas:**
  - Acción, 3 chakra (+2). Círculo de 1,5 m de radio a 9 m.
  - **Salvación de FUE**; la mitad si la pasa. 3d6 contundente.
  - Se diferencia de la Bola de fuego en que no quema y pide fuerza, no destreza: es bueno contra los ninjas ágiles.
  - Potenciado: 4d6 y radio de 2,25 m.
  - Extra opcional (código pequeño): apagar *Quemado* y el fuego del suelo dentro del círculo.
- **Animación:**
  - Pose `cast`.
  - Por defecto vuela la burbuja `vfx_water/sphere.png` (69×66).
  - En el círculo, `vfx_water/blast.png` (géiser saliendo de un charco, 203×152, 16 cuadros a 12 fps, 1,3 s).
  - Tiras: `water-sphere.png`, `water-blast.png`, `water-hit.png`.
- **Cómo se añade:** solo datos (círculo; papel `blast`).
- **Ajuste de animación:**
  - **A (recomendada; código pequeño G4):** **sin proyectil.** Primero, 0,3 s de `vfx_water/hit.png` como salpicadura en el suelo del punto, como un aviso. Luego sube el géiser, con una sacudida de pantalla leve (3). Un géiser sale de abajo, no viene volando.
  - **B:** tal cual: la burbuja cae y revienta en el géiser.
- **Por qué es divertido:** es el primer ataque de agua de rango bajo. Y es el área que castiga al enemigo que confía en esquivar.

### 8. Técnica de Tierra: Corona de púas — C
*Earth Technique: Spike Crown*
- id `earth_spike_crown`, japonés *Toge no Kanmuri*, barra *Púas* / *Spikes*.
- Categoría: Elemental.

> El ninja pisa fuerte y la tierra a su alrededor estalla en púas de cristal. Quien lo tenía rodeado aprende a guardar distancia.

- **Reglas:**
  - Acción, 3 chakra (+2). **Todo lo que esté a 3 m alrededor del lanzador**, sin contarlo a él. Los aliados cercanos también reciben.
  - Salvación de DES; la mitad si la pasa. 2d8 perforante.
  - No necesita sellos: es un pisotón.
  - Potenciado: 3d8 y radio de 4,5 m.
  - El Huracán de la hoja (D) también golpea alrededor, pero solo a 1,5 m. La Corona es el "salir de un cerco".
- **Animación hoy:**
  - Con solo datos se vería la pose `attack` y `vfx_earth/hit.png` (explosión de roca) *sobre el pecho* del ninja. Es lo mismo que hace hoy el Huracán de la hoja con el chakra.
- **Cómo se añade:** solo datos (`melee: true`, radio alrededor de sí, `dmgType: 'Piercing'`).
- **Ajuste de animación:**
  - **A (recomendada; código pequeño G2+G3):** pose **`charge`** (postura firme con los puños abajo, ya existe) durante 0,3 s. Luego `vfx_earth/blast.png` (púas de cristal que brotan de una nube de polvo, 229×162, unos 4 m de ancho, 1,3 s) **centrado en los pies** del ninja, con una sacudida de pantalla de 3. El blast es algo más pequeño que el área (6 m de diámetro), pero se lee bien como "todo alrededor".
  - **B:** en vez de la pose, el `vfx_earth/aura.png` y `aura_back.png` (anillo de polvo y columnas de roca) suben 0,4 s alrededor del ninja, y luego el blast.
- **Por qué es divertido:** es el botón de pánico cuando te rodean, y se ve espectacular.

### 9. Técnica de Rayo: Abanico de chispas — C
*Lightning Technique: Spark Fan*
- id `lightning_spark_fan`, japonés *Hibana Ōgi*, barra *Abanico* / *Spark fan*.
- Categoría: Elemental.

> De la palma abierta sale un abanico de rayos ramificados que lame a todo el que esté delante.

- **Reglas:**
  - Acción, 2 chakra (+2). **Cono de 4,5 m** (60°).
  - Salvación de DES; la mitad si la pasa. 2d8 de rayo.
  - Si alguno de los alcanzados está en el agua, la corriente se extiende por el agua.
  - Potenciado: 3d8, cono más largo (5,6 m) y más abierto.
- **Animación:**
  - Pose `cast`.
  - `vfx_lightning/breath.png` (cono de rayos ramificados, 112×119, 8 a 12 fps) se repite a lo largo del cono durante 1,4 s.
  - Tira: `lightning-breath.png`.
- **Cómo se añade:** solo datos (forma Cono).
- **Ajuste de animación:**
  - **A (recomendada; código pequeño G3):** cuando el abanico llega, un `vfx_lightning/hit.png` (chispazo) sale **sobre cada enemigo alcanzado**, uno detrás de otro cada 80 ms. Así se ve a quién le dio. Hoy los conos no muestran impactos.
  - **B (o además; código pequeño G1):** que el combate use el **estilo de lanzamiento por jutsu** que ya se guarda en el creador. Así un jugador puede ponerle "Mano de rayo" (agachado, mano crepitando abajo) solo a este jutsu.
- **Por qué es divertido:** es un área corta y barata para el cuerpo a cuerpo. En el mapa del río obliga a pensar dónde se pone cada uno.

### 10. Técnica de Genjutsu: Espejismo — C
*Genjutsu Technique: Mirage*
- id `genjutsu_mirage`, japonés *Shinkirō*, barra *Espejismo* / *Mirage*.
- Categoría: Elemental.

> Un orbe violeta flota hasta la mente del enemigo. Por un momento el mundo se le dobla: ve caminos que no existen y enemigos donde hay aire.

- **Reglas:**
  - Acción, 3 chakra (+2). Un objetivo a 9 m.
  - **Salvación de SAB**; si la pasa, no le pasa nada.
  - Si falla: 2d6 psíquico y **Confundido 2 rondas** (1 de cada 4 veces pierde la acción).
  - **Silencioso**: no delata al lanzador.
  - Potenciado: 3d6.
  - Es la versión pequeña y de un solo objetivo del Templo del Nirvana (A).
  - Sin la etiqueta `special`, para que también la usen los enemigos. Hoy la IA nunca usa el Templo porque la lleva.
- **Animación:**
  - Pose `cast`.
  - Vuela `vfx_genjutsu/bolt.png` (orbe-ojo vigilante con zarcillos, 67×64, 8 a 10 fps).
  - Al llegar, `vfx_genjutsu/hit.png` (estallido violeta, 66×67). Es pequeño.
  - Tiras: `genjutsu-bolt.png`, `genjutsu-hit.png`, `genjutsu-aura.png`, `genjutsu-aura_back.png`.
- **Cómo se añade:** solo datos (`effect: 'confused'`, `saveEffect: Negates`, `loud: false`).
- **Ajuste de animación:**
  - **A (recomendada; código pequeño G3):** el orbe vuela **más despacio** (×1,5), como a la deriva, como en un sueño. Al llegar, en vez del estallido pequeño, el `vfx_genjutsu/aura.png` y `aura_back.png` (velo violeta con pétalos y plumas, llamas violeta oscuro) **envuelven al objetivo** 1,2 s. Así se ve que cayó en la ilusión.
  - **B (solo datos):** usar la esfera `vfx_genjutsu/sphere.png` (orbe-ojo con anillo y púas) en vez del bolt, más vistosa.
- **Por qué es divertido:** es control barato, y se puede lanzar sin revelar la posición, ideal para empezar una emboscada.

### 11. Técnica de Taijutsu: Embestida — C
*Taijutsu Technique: Rush*
- id `taijutsu_rush`, japonés *Mōshin*, barra *Embestida* / *Rush*.
- Categoría: Elemental.

> El ninja desaparece en un borrón y aparece encima del enemigo con el puño ya en camino.

- **Reglas:**
  - Acción, 2 chakra (+2). Cuerpo a cuerpo, pero **con alcance de 9 m**: el ninja se planta junto al objetivo y golpea.
  - Tirada de ataque: 2d8 contundente.
  - No necesita sellos.
  - Potenciado: 3d8.
  - Riesgo: terminas pegado al enemigo.
- **Animación hoy:**
  - El ninja *corre* hasta el objetivo con la carrera normal.
  - Luego la pose `attack` y `vfx_chakra/hit.png` (estallido alrededor de un sello dorado, 88×89).
  - Tiras: `chakra-hit.png`, `chakra-aura.png`, `chakra-stream.png`.
- **Cómo se añade:** solo datos (`melee: true`, alcance 6 casillas, como el Night Guy).
- **Ajuste de animación:**
  - **A (recomendada; código pequeño G3):** donde arranca, `vfx_chakra/aura.png` destella (como en el Shunshin). La carrera se cambia por un **borrón de 0,25 s** que deja detrás una **estela de luz** con las piezas de `vfx_chakra/stream.png` (rayo con anillos de sello), que se apaga enseguida. Al final, el estallido de chakra.
  - **B (más simple):** se queda la carrera, pero al doble de velocidad, y luego el estallido.
- **Por qué es divertido:** mueve y pega en una sola acción. Es el primer taijutsu que alcanza al mago que se esconde atrás.

### 12. Técnica de Veneno: Dardos ácidos — C (opcional)
*Poison Technique: Acid Darts*
- id `poison_acid_darts`, japonés *Dokuya*, barra *Dardos* / *Darts*.
- Categoría: Elemental.

> Tres gotas de veneno verde salen disparadas como dardos y revientan en una salpicadura que quema la piel y nubla los reflejos.

- **Reglas:**
  - Acción, 2 chakra (+2). Un objetivo a 9 m.
  - **Salvación de CON**.
  - Si falla: 2d4 de veneno y queda **Envenenado**: desventaja en sus ataques, también en las tiradas de ataque de jutsu.
  - Si la pasa: la mitad del daño y no se envenena.
  - Potenciado: 3d4.
  - Duración: con solo datos, Envenenado dura **hasta el campamento** (se cura con antídoto). Recomiendo **2 rondas** (código pequeño G5), como diseñaste para Venom Surge.
- **Animación:**
  - Pose `cast`.
  - Vuela `vfx_poison/multi.png` (tres dardos de baba, 75×63, 8 a 10 fps).
  - Al llegar, `vfx_poison/hit.png` (salpicadura verde con púas, 84×81).
  - Tiras: `poison-multi.png`, `poison-hit.png`, `poison-aura.png`.
- **Cómo se añade:**
  - Los datos y la animación ya funcionan (con `element: 'poison'` y `dmgType: 'Poison'`, como las Cadenas).
  - **Pero la naturaleza Veneno no existe todavía.** Hay que añadirla, que es el mismo cambio pequeño que necesita Venom Surge.
  - Y hay una **pregunta tuya:** ¿quién lo aprende? No hay chakra de tipo Veneno (los tipos son Fuego, Agua, Viento, Rayo, Tierra, Sombra, Espíritu, Luz y Vacío).
- **Ajuste de animación:**
  - **A (recomendada; código pequeño G3):** después de la salpicadura, el `vfx_poison/aura.png` (tinte de veneno y charco, 94×145) se queda 1 s sobre el objetivo. Así se ve que quedó envenenado.
  - **B:** tal cual.
- **Por qué es divertido:** apaga al enemigo que más pega. Y por fin usa tu juego de veneno, que hoy ningún jutsu del jugador usa.

---

## Las piezas de código pequeñas (sirven para varios)

Ninguna dibuja nada: todas usan tus cuadros tal cual. No escalo ni retinto tu arte, para que el pixel art no se deforme.

| Pieza | Qué hace | La usan |
|---|---|---|
| **G1** Estilo de lanzamiento por jutsu | El combate usa el estilo que el jugador eligió para cada jutsu en el creador (hoy solo usa el estilo general) | Abanico (y cualquier jutsu) |
| **G2** Pose por jutsu | Deja que un jutsu use `throw`, `pierce` o `charge`, que ya existen, en vez de `cast` o `attack` | Tres brasas, Tajo (B), Corona |
| **G3** Piezas antes y después | En la lista de ajustes de cada jutsu se puede poner: un aura en el lanzador *antes*, un aura en el objetivo *después*, otro sprite de impacto (`blast` o `slash` en vez de `hit`), un vuelo más lento o una sacudida de pantalla | Casi todos |
| **G4** Desde el suelo | Un área que no vuela: aparece directamente en el punto (como ya hace el Kirin) | Géiser (y sirve para Erupciones futuras) |
| **G5** Duración por jutsu | Un estado de 2 rondas en vez de "hasta el campamento" | Calambre, Dardos, Venom Surge |
| Manto | Un `special` nuevo que da *esquivando* | Manto de brisa |

---

## Tu ejemplo: "que salga una cabeza de dragón y dispare"

Hablas de la **Técnica de Fuego: Fuego del dragón** (rango B; hoy es un chorro de fuego en línea de 10,5 m).

Ya miré la Gran aniquilación potenciada (`vfx_fire/annihilation_enh.png`). En sus cuadros de "burn" (6, en bucle) **la cabeza y el cuello del dragón sobresalen limpios por encima de las llamas**, con la boca echando fuego. Se pueden **recortar tus píxeles tal cual**: el cuello termina dentro del fuego, así que su base quedaría tapada por las llamas del aura de fuego del ninja.

- **Opción A, "dragón que escupe el chorro":**
  1. Las llamas `vfx_fire/aura_back.png` suben detrás del ninja (0,4 s).
  2. De ellas asoma la cabeza recortada del dragón.
  3. El chorro de fuego de siempre (`stream` + `stream_head`) sale **de su boca** a lo largo de la línea.
  4. La cabeza se hunde en las llamas al final.
- **Opción B, "dragón que dispara proyectiles"** (más cerca de lo que dijiste):
  1. Aparece la misma cabeza.
  2. Escupe **3 bolas de fuego** (`vfx_fire/bolt.png`), una detrás de otra cada 150 ms, por la línea.
  3. Cada una revienta en `vfx_fire/hit.png` sobre los enemigos de la línea.
  4. Las reglas no cambian: la misma línea y el mismo daño.
- **Trabajo:** un script que recorta la cabeza de tus cuadros (como los de `tools/refs/`) más código pequeño (G3). Antes de ponerlo te mando el recorte al lado de tu dibujo, a la misma escala.
- **Para que lo decidas:** esa cabeza es la firma de la Gran aniquilación potenciada (rango S). Si sale también en un jutsu B, el S pierde un poco de exclusividad.
  - Si prefieres guardarla para el S, hay una alternativa sin recortes: el **fénix** de fuego (`vfx_beasts/fire.png`). Hoy ningún jutsu lo usa, y tiene dos animaciones que nunca se han visto: **picada (5 cuadros)** y **ataque (6 cuadros)**. Puede aparecer sobre el ninja con su animación de ataque y lanzar las bolas de fuego.

Si te gusta este tipo de cambio, te hago la misma lista de ideas (A/B) para los **27 jutsu que ya existen**.

---

## Lo que necesito que me digas

1. ¿Qué jutsu entran? (Sí / No a cada uno de los 12. Si quitas alguno, quedan 10 u 11.)
2. ¿Te gustan los nombres? Cambia los que quieras por los tuyos.
3. Para cada uno: ¿ajuste **A**, **B** o tal cual?
4. **Dardos ácidos:** ¿añadimos la naturaleza Veneno? ¿Y quién la aprende?
5. **Entumecido y Envenenado** en estos jutsu: ¿hasta el campamento, o 2 rondas?
6. **Tu ejemplo del dragón:** ¿A (chorro desde la boca) o B (proyectiles)? ¿Cabeza del dragón de la Aniquilación, o el fénix?

Cuando me respondas, te mando primero las imágenes de antes y después de cada animación, y no meto nada en el juego hasta que digas que sí.
