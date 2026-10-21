# Shinobi 5e Chronicles: sistema de descansos y sistema de cinemáticas para decisiones

Este documento diseña dos sistemas de juego: los **descansos** (campamentos con trampas, buffs y debuffs, curación y regeneración de chakra) y las **cinemáticas con diálogos** que se usan al tomar decisiones. No incluye las decisiones de la historia, que escribirás tú en otra sesión; solo hay un ejemplo neutral para enseñar cómo funciona el sistema.
*Los números de Gods Will Be Watching (GWBW) y Darkest Dungeon (DD) vienen de wikis, guías y foros de fans, así que son aproximados y pueden variar según el parche.*

---

## 1. Qué tomamos de cada juego

### Gods Will Be Watching (2014)

Casi todos los capítulos son una crisis distinta en una sola pantalla (el capítulo 5, «Legend», avanza pantalla a pantalla por un desierto generado al azar). Hay un objetivo, un límite de tiempo que solo avanza cuando haces una acción con coste, y varios medidores que compiten entre sí.

**Lo que tomamos para los descansos:**

- **Presupuesto fijo de acciones.**
  - El campamento del capítulo 4 da 5 acciones por día. Se gastan, entre otras cosas, en reparar la radio, cazar, cocinar, mantener el fuego o animar al grupo.
  - Ser amable cuesta progreso. La charla de ánimo de Sarah gasta 3 de las 5 acciones del día (en la versión de lanzamiento, «Terapia de grupo» gastaba las 5), así que ese día apenas avanzas con la radio.
  - **En Shinobi:** las varitas de incienso del campamento. Curar, meditar, vigilar y animar compiten por las mismas varitas.
- **Comer bien sube la moral.** En el capítulo 4, cocinar la carne es la forma principal de subir la moral. **En Shinobi:** la comida caliente baja la Tensión.
- **Descansar también gasta tiempo.** El capítulo 5 tiene un plazo de unas 150–200 horas (las fuentes no coinciden). Cada movimiento gasta horas, descansar conviene hacerlo a la sombra y no al sol, cavar en busca de agua cuesta 3 h, y el grupo va a la velocidad del más lento. **En Shinobi:** algunas misiones tienen un plazo en horas, y cada alto y cada campamento lo gastan. En las demás, las horas gastadas en el camino suben el peligro nocturno (2.1).
- **Medidores de doble filo.**
  - En el capítulo 1, un rehén demasiado tranquilo se confía y ataca a Burden, y uno demasiado asustado intenta huir. Se lee por la postura: si tiene miedo, tiembla o se lleva la mano a la cabeza; si está demasiado relajado, estira las piernas y se recuesta.
  - Así no sirve repetir siempre la misma acción.
  - **En Shinobi:** el fuego del campamento y el tipo de escena de turnos contados (2.15).
- **Elegir 1 de 3.** Cada noche del capítulo 2, Liam entra a escondidas y trae una sola cosa: analgésicos, un botiquín o información. **En Shinobi:** el halcón mensajero, una curiosidad del camino.
- **El fuego.** En GWBW era un mantenimiento obligatorio: si se quedaba sin leña de noche, la partida acababa, así que había que guardar leña de reserva. **En Shinobi** lo convertimos en un dilema: un fuego más grande sube el ánimo (−1 Tensión), pero atrae emboscadas; cualquier fuego permite la comida caliente. Ese equilibrio es idea nuestra, no de GWBW.

**Lo que tomamos para las decisiones y su puesta en escena:**

- **Acciones gratis y acciones con coste.** Preguntar y observar no gastan nada. Actuar gasta un turno y hace avanzar el reloj y los medidores. GWBW solo lo marcaba con el color de cada opción (rojo: cuesta un turno; verde: gratis) y nunca explicaba la regla, y la crítica lo señaló. Hay que explicarlo en pantalla.
- **Porcentajes visibles antes de arriesgar.** En el capítulo 2, mentir parte de un 10 % de éxito, que sube con «Pensar» o con la información de Liam (con ella, al día siguiente es un 100 %). En el capítulo 1, el «Hack Boost» muestra una probabilidad de éxito que se va cargando, y las guías aconsejan lanzarlo hacia el 75–80 %.
- **Todo pasa en el escenario.** Cada escena es un decorado fijo de pixel art con pocos personajes. Se hace clic en un personaje para hablarle o darle órdenes. Al tocar a alguien o algo sale una lista corta de acciones en texto, distinta para cada personaje. Los diálogos son solo texto, sin voces.
- **El estado oculto se ve dentro de la escena:** la postura de los rehenes y frases sueltas como «Tengo que salir de aquí» o «Está distraído…». En el campamento, la moral se lee en el diálogo y con el robot BR4ND-0N.
- **Los números importantes, a la vista:** barras y porcentajes de progreso, seguridad, oxígeno, voluntad de cada rehén y reparación de la radio, y contadores de días y horas.
- **Una acción cambia a todo el grupo.** Ejecutar, dar de comer o amenazar cambia la actitud de todos, no solo la de uno. La lista de características previa al lanzamiento lo llamaba «Empathy System».
- **El resultado se ve en el escenario:** los sprites hacen la acción y los medidores cambian. Al terminar el capítulo, una pantalla compara tus decisiones con las de jugadores de todo el mundo.
- **Las opciones duras suelen ser eficaces** (ejecutar a un rehén mete en vereda a los demás; matar a un compañero ahorra comida), aunque no siempre salen gratis: si matas a Abraham, el soldado cojo que frena la marcha en el capítulo 5, según una fuente desertan dos soldados (otras no lo mencionan). Esa eficacia es lo que provoca la culpa. **En Shinobi:** el sistema deja que una opción eficaz cueste Tensión, Lazo o una marca que se cobra más tarde. Qué opciones existen lo decides tú en la historia.

**Lo que evitamos:**

- **Azar que borra mucho progreso.** Perder en la ruleta rusa del capítulo 2 (1 posibilidad entre 7 en el primer disparo) reiniciaba el capítulo entero y costaba unos 15–20 minutos, porque no había puntos de control. Algunos capítulos duraban más de una hora. El ensayo y error sin puntos de control fue la queja principal de la crítica. Unas semanas después del lanzamiento (la «Mercy Update», agosto de 2014), el propio estudio añadió modos sin azar (Puzzle y Puzzle ligero) y un modo Narrativo. **En Shinobi:** se guarda al entrar en cada nodo del camino, al empezar cada campamento y antes de cada decisión (2.1), y puede haber un modo sin azar (pregunta 15).
- **Muertes sin peso.** Los muertos volvían en el capítulo siguiente (la historia es un bucle temporal), y la crítica señaló que así perder a alguien no pesaba. **En Shinobi:** las cicatrices y las marcas de las decisiones se quedan.
- **Repetir lo ya visto.** Cada fallo reiniciaba el capítulo entero. **En Shinobi:** siempre se puede saltar; lo que aún no has leído pide confirmación (3.2).

### Darkest Dungeon (sobre todo el 1)

*Todo lo de esta lista (leña, comida, Respiro, emboscada nocturna, trampas, curiosidades, estrés de 0 a 200, ataques al corazón) es de DD1. La campaña principal de DD2 no tiene campamentos (el modo Kingdoms sí): el grupo descansa en la posada al final de cada región, el estrés va de 0 a 10 y las relaciones entre héroes se forman en las posadas.*

**Lo que tomamos:**

- **El campamento es un dilema, no una curación gratis.**
  - Acampar gasta 1 leña. Las expediciones medianas dan 1 y las largas 2; en las cortas no se puede acampar.
  - Se elige un nivel de comida. Estos son los costes para 4 héroes; los nombres en español son nuestros.

    | Nivel | Comida | Efecto |
    |---|---|---|
    | Ayuno | 0 | Daño del 20 % de la vida máxima y +15 de estrés |
    | Media | 2 (otras fuentes dicen 3) | Ninguno |
    | Completa | 4 | Cura un 10 % |
    | Festín | 8 | Cura un 25 % y quita 10 de estrés |

  - Después se reparten 12 puntos de Respiro (14 en un caso especial) entre las habilidades de campamento. Cada héroe lleva 4 equipadas, elegidas entre 3 comunes a casi todas las clases (Animar, Curar heridas, Charla de ánimo) y 4 propias de su clase. Cuestan de 1 a 5 puntos y cada una se usa una vez por campamento.
  - **En Shinobi:** kit de acampada, cuatro niveles de comida y varitas de incienso.
- **Emboscada nocturna con contramedida.**
  - Hay un 33 % fijo de emboscada. El grupo siempre empieza sorprendido, la antorcha cae a 0 y no se puede huir.
  - Ciertas habilidades la anulan, pero cuestan 3–4 de los 12 puntos, y solo 5 clases tienen una. Proteger el sueño sale caro.
  - **En Shinobi:** cada zona muestra su %, y siempre hay alguna forma de bajarlo.
- **Duraciones fáciles de prever.** Los buffs de las habilidades de campamento duran las 4 batallas siguientes (la emboscada nocturna cuenta como una), y los de las curiosidades duran hasta el siguiente campamento. **En Shinobi:** rondas, batallas, la zona, hasta el campamento, hasta tratarlo, hasta el fin de la misión o para siempre.
- **Trampas.**
  - Se revelan con el reconocimiento: al entrar en cada sala hay una tirada (25 % base, más con luz alta, habilidades de campamento, rasgos y abalorios). Es la única forma de verlas antes de pisarlas.
  - Si la trampa está revelada, se puede intentar desactivar con una probabilidad igual a la estadística de Trampas del héroe + 40 %, menos un 20 % en mazmorras de nivel Veterano y un 40 % en las de Campeón. Si sale bien, el héroe pierde 8 de estrés; si falla, la trampa se activa.
  - Si no estaba revelada, el héroe aún puede esquivarla con su estadística de Trampas (sin el +40 %). Si le alcanza, recibe daño igual a un % de su vida máxima (varía por región), +15 de estrés fijo y un efecto según la región (Ruinas: solo daño; Weald: infección, parecida al veneno; Madrigueras: sangrado; Cala: −velocidad y −esquiva; Patio: sangrado, y puede invocar enemigos).
  - **En Shinobi:** se detectan con Percepción o explorando; al verla salen su CD y el % de cada opción; desactivarla baja la Tensión.
- **Curiosidades.** En muchas, usar el objeto adecuado da un resultado bueno garantizado (por ejemplo, agua bendita en un altar arcano quita un rasgo negativo). Otras no admiten objetos, y en alguna el objeto desencadena un peligro. Investigar sin objeto es una tirada que puede salir bien o mal. **En Shinobi:** lo mismo, pero siempre con una pista en pantalla. En DD la combinación correcta se descubre probando o mirando la wiki.
- **Estrés visible con prueba de voluntad.** Al llegar a 100, el héroe sufre una Aflicción o gana una Virtud, y el estrés puede seguir subiendo hasta 200. Los creadores hicieron el medidor totalmente visible a propósito. **En Shinobi:** la Tensión, de 0 a 10 como en DD2.
- **Puerta de la muerte.** A 0 PG el héroe no muere, pero cualquier daño a su vida (golpes, sangrado o infección) obliga a una tirada de resistencia al golpe mortal, con un 67 % base. Al salir de ese estado le quedan penalizaciones hasta el final de la expedición. **En Shinobi:** las salvaciones de muerte de 5e que ya acordamos, y al levantarse, el debuff «Secuelas de caída» hasta el fin de la misión.
- **Relaciones que nacen al descansar (DD2).** **En Shinobi:** el Lazo entre dos ninjas sube con las charlas junto al fuego.

**Lo que evitamos:**

- **Grind de aldea.** La Taberna y la Abadía cuestan oro y retienen al héroe una semana, así que se pierde la siguiente expedición. **En Shinobi:** la aldea lo recupera todo sin pagar semanas.
- **Aflicciones con un 75 % de probabilidad base** al llegar a 100 de estrés. Solo algunos abalorios y rasgos mejoran esa tirada (hasta un 70 % de Virtud con la mejor combinación), así que en la práctica el jugador apenas puede influir en ella: lo único fiable es no llegar a 100. **En Shinobi:** una salvación de SAB que el grupo puede preparar en el campamento.
- **Espirales,** donde un héroe afligido estresa a todo el grupo. **En Shinobi:** un Quiebre no sube por sí solo la Tensión de los demás.
- **Gastar puntos de Respiro en habilidades que el héroe rechaza.** **En Shinobi:** la actividad que un ninja rechaza sale tachada antes de elegir, así que no se gasta ninguna varita (2.9).
- **Ataques al corazón** (al llegar a 200 de estrés). Junto con los cadáveres en combate, ambos añadidos en julio de 2015 durante el acceso anticipado, provocaron tantas quejas que Red Hook añadió opciones para desactivarlos. En el parche del 30 de noviembre de 2015 los ataques al corazón dejaron de matar directamente (el héroe cae a 0 PG, en la Puerta de la muerte, y muere si le vuelve a pasar estando en ella). **En Shinobi:** la Tensión nunca mata.

---

## 2. Sistema de descansos

*Esta sección y la siguiente describen las opciones que recomiendo (★) en las preguntas del final. Si eliges otra, se ajusta.*

### 2.1 La idea

- Los PG, el chakra y los efectos ya no se rellenan solos entre batallas. El grupo los arrastra por el camino.
- Hay dos descansos: el **alto en el camino** (corto) y el **campamento** (largo, de noche).
- Descansar nunca es gratis. Gasta suministros y horas, y de noche puede haber emboscada. Cada campamento es un pequeño dilema, como en DD y GWBW.

**Dónde encaja en una misión:**

**Aldea → camino por tramos → altos y campamentos → objetivo → Crónica de la misión**

- **Aldea.** Se elige el equipo (1–4 ninjas) y, entre ellos, el **líder de la misión**, que desempata las votaciones (3.5). También se compran suministros: raciones, kits de acampada, vendas, antídotos, píldoras de soldado, sellos explosivos y alambre. La mochila tiene espacio limitado.
- **Camino.** Un mapa con bifurcaciones de 4–6 nodos, inspirado en el mapa de regiones de DD2 (allí, parte de los nodos y caminos empiezan ocultos hasta que se exploran). Cada nodo muestra su tipo (batalla, trampa, curiosidad, escena o campamento) y su peligro. Para los descansos solo importa dónde se puede acampar y cuántas horas cuesta cada tramo.
- **Zona.** Una **zona** es un tramo del mapa con varios nodos y un mismo terreno (bosque, pantano…); una misión tiene 2–3 zonas. En este documento, «zona» siempre significa eso.
- **Dónde se descansa.** El alto se hace entre zona y zona, como máximo uno por zona. El campamento solo se monta en nodos marcados con una fogata (claro, cueva, ruina); en GWBW las guías aconsejan descansar a la sombra. Lo normal son 1–2 campamentos por misión.
- **Plazo en horas,** solo en algunas misiones. Cada tramo gasta horas, un alto 1 h y un campamento 8 h. Siempre se ve cuánto queda.
- **Las horas cuentan siempre.** En misiones sin plazo, cada 4 horas gastadas en el camino (tramos, altos, rodeos o «Perdido») suben un 5 % el peligro nocturno del siguiente campamento (2.8).
- **Guardado** al empezar cada campamento, antes de cada decisión (3.6) y al entrar en cada nodo del camino (en Leyenda, en la misma ranura, que también guarda la batalla en cada turno, así que salir del juego no la reinicia). Si todo el grupo cae, en Historia y Normal se repite desde ese nodo. Si cae en la emboscada nocturna, despierta con «Secuelas de caída» y pierde la mitad de los suministros (2.8). En Leyenda, si cae todo el grupo, se aplica la regla de 2.8 y la pregunta 21. Nunca hay que repetir una misión entera.

### 2.2 Lo que cada ninja arrastra

| Recurso | Qué es | Cómo se recupera |
|---|---|---|
| **PG** | La vida | Jutsus de curación, vendas, Dados de Golpe, campamento y aldea |
| **Chakra** | Lo que gastan los jutsus | Uddo, «Concentrar chakra», píldoras, Dados de Chakra, meditación, campamento y aldea |
| **Dados de Golpe** | Tantos como su nivel. Cada uno cura su dado + CON | El campamento devuelve la mitad de los gastados, redondeando hacia arriba (mínimo 1); la aldea, todos |
| **Dados de Chakra** | Tantos como su nivel. Cada uno da su dado de chakra, sin modificador | Igual que los Dados de Golpe |
| **Tensión** | Estrés mental, de 0 a 10 | Comida caliente, charlas, victorias, santuarios y aldea |
| **Agotamiento** | Cansancio físico, niveles 1 a 6 | Campamento con comida y estiramientos |
| **Efectos** | Buffs y debuffs con duración | Caducan solos o se quitan con actividades |

Que el campamento devuelva solo la mitad de los dados es más duro que 5e a propósito: en 5e (2024) el descanso largo los devuelve todos.

Los dados de cada clase ya están en el juego:

| Clase | Dado de Golpe | Dado de Chakra | Estadística de lanzamiento |
|---|---|---|---|
| Ninjutsu | d8 | d12 | INT |
| Taijutsu | d10 | d8 | FUE |
| Genjutsu | d6 | d10 | CAR |
| Médico | d8 | d10 | SAB |
| Bukijutsu | d10 | d8 | DES |

### 2.3 Chakra y curación

| Momento | PG | Chakra |
|---|---|---|
| **En batalla** | Jutsus de curación y vendas | No se regenera solo. Uddo mantiene su +2 por ronda. **«Concentrar chakra»** (acción nueva): recupera 1d6 + modificador de lanzamiento, pero los ataques contra ti tienen ventaja hasta tu siguiente turno. **Píldora de soldado** (acción adicional): +2d6, y al terminar la batalla deja el debuff «Bajón». |
| **Alto en el camino** | Dados de Golpe | Dados de Chakra |
| **Campamento** | 50 % + comida + actividades | 50 % + meditación |
| **Aldea** | 100 % | 100 % |

- Los jutsus de curación, como la Palma mística, también se pueden lanzar en el campamento, pagando su chakra. Así hay que elegir entre curar ahora o guardar chakra para mañana.
- Un Uddo puede pasar chakra o PG propios a un aliado (actividad «Vitalidad compartida», 2.7).

### 2.4 Alto en el camino (descanso corto)

- Se hace entre zona y zona, como máximo uno por zona (2.1). Dura 1 hora y no gasta kit.
- Cada ninja gasta los Dados de Golpe y de Chakra que quiera.
- Cada ninja puede hacer **1** actividad de 1 varita, sin gastar incienso, que no recupere chakra, Tensión ni Agotamiento: por ejemplo Vendar (gasta 1 venda) o Curar con jutsu (gasta su chakra). Explorar no vale en el alto: cuesta 2 varitas y solo se hace en el campamento.
- Meditar, Sueño apacible, Estiramientos, Cirugía de campaña, Rezar en un santuario, Charla junto al fuego y las actividades que solo dan un buff (Afilar hojas, Dar ánimo, Piel de madera, Sello protector) son solo de campamento (en el camino, rezar en un santuario es una curiosidad aparte, 2.11). Fuera de los Dados de Golpe, en el alto solo se curan PG gastando algo: una venda o el chakra de un jutsu.
- No hay emboscada.

### 2.5 El campamento (descanso largo), paso a paso

1. **Montar el campamento.** Gasta 1 kit de acampada. Antes, el grupo mira el claro gratis con su Percepción pasiva, por si hay una trampa enemiga.
2. **Fuego.** Se vota primero: sin fuego, fuego bajo u hoguera (2.6). La hoguera necesita un kit extra o que el Mirai se comprometa a hacer el Fuego Katon, que paga después en las actividades.
3. **Actividades.** Cada ninja tiene **3 varitas de incienso**, que se ven arder en pantalla. Cada actividad cuesta de 1 a 3 varitas (algunas gastan además chakra o material). Cada ninja hace cada actividad una vez por campamento. Las que cambian la emboscada (guardia, Refugio de madera, Barrera de sellos, Ilusión de campamento) cuentan una sola vez aunque las hagan dos. Cazar, el Fuego Katon, vigilar y poner trampas también son actividades. Mirar el estado del grupo y hablar es gratis.
4. **Comida.** Un nivel para todo el grupo (2.6). Si la caza falla, el Festín no se puede elegir.
5. **La noche.** Se tira la emboscada con el % que muestra la luna. Si hay emboscada, empieza una batalla nocturna (2.8).
6. **La mañana.** Cada ninja recupera:
   - la mitad de sus PG máximos y de su chakra máximo, sin pasar del máximo;
   - la mitad de los Dados de Golpe y de Chakra gastados, redondeando hacia arriba (mínimo 1);
   - lo que añadan la comida y las actividades.

   Caducan los efectos «C» que el grupo traía de antes del campamento. Los efectos «C» ganados en este campamento duran hasta el siguiente. El 100 % solo se recupera en la aldea.

### 2.6 Comida y fuego

**Comida** (se decide en grupo):

| Nivel | Coste | Efecto |
|---|---|---|
| Sin comer | 0 | +1 Agotamiento, +2 Tensión y el debuff «Hambriento» |
| Ración seca | 1 por ninja | Sin penalización |
| Comida caliente | 1 por ninja, y hace falta fuego | Recupera 1 Dado de Golpe gastado más y −1 Tensión |
| Festín | 1 ración por ninja + la caza o la pesca (2.7), y hace falta fuego | Lo de la comida caliente, otro −1 Tensión y el buff «Bien alimentado» (+5 PG temporales al empezar cada batalla) |

**Fuego** (también se decide en grupo):

| Fuego | Coste | Emboscada | Efecto |
|---|---|---|---|
| Sin fuego | Nada | −10 % | Solo comida fría y +1 Tensión a todos. En zonas frías, además, el debuff «Entumecido». |
| Fuego bajo | Incluido en el kit | Sin cambio | Permite la comida caliente |
| Hoguera | 1 kit extra, o el Fuego Katon de un Mirai | +10 % | Permite la comida caliente y da −1 Tensión extra a todos |

La fogata ya tiene tres animaciones: encendida, en brasas y apagada. Cada una corresponde a un nivel de fuego.

### 2.7 Actividades

**Para todos:**

| Actividad | Varitas | Efecto |
|---|---|---|
| Cazar o pescar | 2 | Prueba de Supervivencia (SAB). Si sale, el grupo puede elegir el Festín. |
| Vendar | 1, y gasta 1 venda | Cura 1d8 + SAB y quita «Sangrando» |
| Curar con jutsu | 1 + su chakra | Lanza un jutsu de curación fuera de batalla |
| Meditar | 2 | +25 % de chakra |
| Afilar hojas | 1 | Buff «Hoja afilada» (2.12) |
| Entrenar un jutsu | 2 | Buff «Chakra centrado»: el primer jutsu de cada batalla cuesta 3 menos |
| Hacer guardia | 2 | El % de emboscada baja a la mitad, y quien vigila recibe el buff «Guardia atenta» |
| Poner trampas en el perímetro | 2 + 1 sello explosivo o 1 rollo de alambre | Si hay emboscada, la trampa está puesta en el mapa (2.8) |
| Alambre con campanas | 1 + 1 rollo de alambre | Si hay emboscada, nadie empieza sorprendido |
| Explorar | 2 | Revela las trampas de la siguiente zona |
| Rezar en un santuario | 1 | Solo si hay santuario: −2 Tensión |
| Charla junto al fuego | 1 | −1 Tensión a otro ninja y +1 de Lazo entre los dos. Se juega como una escena corta de diálogo (sección 3). |
| Dar ánimo | 1 | Buff «Ánimo» a otro ninja (2.12) |

**Lazo:** un número para cada pareja de ninjas, como la afinidad de DD2. Va de 0 a 10 y empieza en 0. Sube +1 con cada charla junto al fuego, y como máximo +1 por misión cuando uno cura o protege al otro. Desde 5, la pareja tiene el buff «Lazo de camaradas» en cada misión.

**Solo para un clan o una clase:**

| Grupo | Actividad | Varitas | Efecto |
|---|---|---|---|
| Mirai | Lectura del Sharingan | 1 | Revela trampas de genjutsu y PNJ disfrazados |
| Mirai | Fuego Katon | 1 | Hace la hoguera sin gastar kit (se compromete al votar el fuego, 2.5) |
| Uddo | Refugio de madera | 2 | −15 % de emboscada y protege del clima |
| Uddo | Vitalidad compartida | 1 | Da PG o chakra propios a un aliado (lo del chakra es un rasgo nuevo) |
| Uddo | Piel de madera | 1 | Buff «Piel de madera» a un aliado (2.12) |
| Akkai | Barrera de sellos | 1 + un cuarto de su chakra máximo | −20 % de emboscada |
| Akkai | Sellar veneno | 1 | Quita «Envenenado» o una maldición |
| Akkai | Sello protector | 1 | Buff «Sello protector» a un aliado (2.12) |
| Taki | Guardia del Byakugan | 3 | Emboscada al 0 % |
| Taki | Cerrar tenketsu | 1 | Quita «Sangrando» |
| Médico | Cirugía de campaña | 2 | Prueba de SAB: quita «Herida grave» y cura la «Fiebre»; si falla, deja una cicatriz |
| Médico | Preparar píldoras | 2 | Fabrica 1 píldora de soldado o 1 antídoto |
| Taijutsu | Estiramientos | 1 | −1 Agotamiento |
| Genjutsu | Sueño apacible | 2 | −3 Tensión |
| Genjutsu | Ilusión de campamento | 2 | −15 % de emboscada |
| Bukijutsu | Fabricar material | 1 | 1 sello explosivo o 1 rollo de alambre para las trampas |
| Ninjutsu | Meditación elemental | 2 | Lo mismo que Meditar, y resistencia a un elemento hasta el siguiente campamento |

Quien tenga la dote «Trampero táctico» pone 2 trampas con una sola actividad, y sus sellos hacen +1d6 de fuego. Todas las cifras, incluidas las varitas, son un punto de partida para probar.

### 2.8 Emboscada nocturna y trampas del perímetro

**El % de emboscada:**
- Cada zona tiene un % base visible, por ejemplo 30 %. En pantalla es una luna con su número.
- Lo cambian el fuego (2.6), el Refugio de madera, la Barrera de sellos, la Ilusión de campamento y, en misiones sin plazo, las horas gastadas en el camino (2.1). La guardia lo divide entre dos al final, aunque vigilen dos. La Guardia del Byakugan lo deja en 0 %.
- Ejemplo: zona 30 % + hoguera 10 % − Refugio de madera 15 % = 25 %. Con alguien de guardia, 12 %.

**Si hay emboscada:**
- Empieza una batalla nocturna en el mapa del propio campamento: el claro, la fogata, las tiendas y las trampas que puso el grupo. Los enemigos llegan por los bordes.
- Se aplican las reglas de noche ya acordadas: ventaja en Sigilo y menos alcance de vista.
- Quien hacía guardia no puede ser sorprendido; los demás sí, salvo que hubiera campanas. Si nadie vigilaba y no había campanas, todo el grupo empieza **sorprendido**. En ambos casos se libran los Taki: su rasgo de linaje dice que no pueden ser sorprendidos (visión de 360°).
- **Sorprendido:** no actúa ni reacciona en su primer turno (regla de 5e 2014, elegida a propósito). La emboscada empieza sin fase de sigilo: los enemigos llegan ya en iniciativa.
- La emboscada cuenta como una batalla para los efectos que duran «B» batallas, igual que en DD.
- Un descanso interrumpido da solo la mitad de la recuperación de la mañana. En Historia y Normal, la emboscada en sí nunca es un game over: si cae todo el grupo, despierta con «Secuelas de caída» y pierde la mitad de los suministros.
- **En Leyenda**, si cae todo el grupo (en batalla o en la emboscada), cada ninja caído tira sus salvaciones de muerte hasta estabilizarse o morir; los que sobreviven despiertan con «Secuelas de caída» (y, si fue en la emboscada, el grupo pierde la mitad de los suministros). Si mueren todos, lo que pasa lo decide la pregunta 21: fin de la partida o escuadrón de relevo.

**Trampas del perímetro:**
- Se ponen con la actividad «Poner trampas en el perímetro», usando material de la mochila.
- Si hay emboscada, aparecen en el mapa en el borde del claro. Un enemigo que pasa por encima la activa: el sello explosivo hace 3d6 de fuego (salvación de DES) y el alambre lanza kunais (2d6 + «Sangrando»).
- Para que sea justo, cada enemigo puede verla con su Percepción contra la CD de la trampa. La CD de las trampas del grupo es 8 + competencia + modificador de DES de quien la puso, y sirve también para la salvación de DES del sello.
- Las campanas no hacen daño: solo despiertan al grupo a tiempo.
- Si no hay emboscada, por la mañana se recoge el material sin gastarlo.

### 2.9 Tensión

- Es una escala de **0 a 10 por ninja**, siempre visible.
- **La suben:** recibir un crítico, que caiga un aliado, una trampa, el hambre, la noche sin fuego y una decisión que va contra su convicción (3.5).
- **La bajan:** la comida caliente, las charlas, las victorias, los críticos propios, desactivar una trampa, los santuarios y la aldea.
- **Al llegar a 10** se hace una salvación de SAB con CD 12:
  - Si falla: **Quiebre** (Pánico, Paranoia, Ira ciega o Desesperanza; efectos en 2.12) hasta volver a la aldea. El ninja lo anuncia con una frase. Quien controla al ninja lo sigue controlando; el Quiebre solo cambia números y frases.
  - Si pasa: **Despertar**, por ejemplo «Voluntad de Fuego».
  - Después la Tensión vuelve a 5.
  - Si ya está en Quiebre o Despertar, al llegar otra vez a 10 no hay nueva salvación: gana 1 nivel de Agotamiento (por esta vía nunca pasa del nivel 5) y vuelve a 5.
  - Al volver a la aldea, el Quiebre o el Despertar se van, pero dejan un rasgo pequeño, bueno o malo (pregunta 13).
- **Para no repetir los problemas de DD:**
  - El grupo puede preparar esa salvación: «Bendición del santuario» (ofrecer una ración en un santuario, 2.11) da ventaja en esa salvación y «Ánimo» (actividad «Dar ánimo», 2.7) quita 1 a la próxima Tensión que entre.
  - Un Quiebre no sube por sí solo la Tensión de los demás.
  - En cada campamento, un ninja en Quiebre rechaza una actividad al azar, que sale tachada antes de elegir, así que no se gasta ninguna varita en ella.
  - La Tensión nunca mata.

### 2.10 Agotamiento

- Es el lado físico, separado de la Tensión. Sigue la regla de 5e (2024).
- **Lo causan:** el hambre, el frío, la marcha forzada, tomar más de una píldora de soldado entre dos campamentos (+1 nivel por cada píldora de más), abrir las Puertas (es nuevo, 2.12) y volver a llegar a 10 de Tensión estando en Quiebre o Despertar (2.9; por esta vía nunca pasa del nivel 5).
- **Efecto:** −2 a las tiradas d20 y −1,5 m de velocidad por cada nivel.
- En el nivel 6 el ninja queda **inconsciente** y no puede actuar hasta bajar al nivel 5; no tira salvaciones de muerte ni se levanta con curación. En el modo Leyenda muere (en 5e siempre moriría).
- Se quita 1 nivel en cada campamento con comida.

### 2.11 Trampas y curiosidades en el camino

**Cómo funcionan las trampas:**
- **Detectar:** con la Percepción pasiva, o con Investigación si se busca activamente, contra la CD de la trampa.
  - La actividad «Explorar» revela las trampas de la siguiente zona.
  - El Byakugan da ventaja.
  - El Sharingan ve los sellos de genjutsu sin tirar.
- **Al detectarla** se ven su CD y el % de éxito de cada opción:
  - **Desactivar** (DES + herramientas ninja). Si sale bien: −1 Tensión, y el grupo se queda el material. Si falla, la trampa se activa sobre quien la tocaba, con su salvación normal.
  - **Activarla a distancia** con un kunai. No hace daño, pero el ruido pone en alerta la zona: la siguiente batalla empieza sin fase de sigilo.
  - **Rodearla.** Cuesta horas, que acercan el plazo o suben el peligro nocturno (2.1).
  - **Lanzar un clon.** Cuesta chakra.
- **Si nadie la vio,** salta sobre un ninja, que hace su salvación, y le sube +1 la Tensión.
- Cada zona tiene su propia mezcla de trampas, como las regiones de DD.

**Lista de trampas:**

| Trampa | Efecto |
|---|---|
| Sello explosivo | 3d6 de fuego, salvación de DES. El ruido delata al grupo. |
| Trampa de alambre | Lluvia de kunais: 2d6 + «Sangrando» |
| Sello de genjutsu | Salvación de SAB, o «Perdido»: −2 horas dando vueltas |
| Agujas envenenadas | 1d4 + «Envenenado» hasta el campamento |
| Foso con estacas | 2d6 + «Pierna herida» |
| Sello de drenaje | −2d6 de chakra |
| Campana de alarma | Sin daño, pero la siguiente batalla empieza sin fase de sigilo |
| Arena movediza Doton | Apresado |

**Curiosidades:**
- **Santuario Inari.** Ofrecer una ración da una bendición. Rezar (una vez por ninja y santuario) da −2 Tensión. Profanarlo da botín y una maldición.
- **Campamento abandonado.** Buscar (Investigación) da suministros, aunque puede esconder una trampa.
- **Desconocido herido.** Ayudarle cuesta vendas y tiempo. Puede ser un espía, y el Sharingan o el Byakugan lo revelan. Ignorarle da +1 Tensión a los ninjas cuya convicción sea proteger a inocentes.
- **Cadáver de shinobi.** Puede llevar pergaminos y sellos.
- **Fuente termal.** Un alto extra, que no cuenta para el límite de uno por zona y no gasta horas.
- **Cofre sellado.** Un Akkai lo abre sin riesgo.
- **Halcón mensajero de la aldea.** Elige 1 de 3: vendas, píldoras de soldado o el mapa de trampas de la zona siguiente.
- **Regla tomada de DD:** usar el objeto correcto da un resultado garantizado. A diferencia de DD, aquí siempre habrá una pista en pantalla. Investigar sin objeto es una tirada con su % visible.

### 2.12 Buffs y debuffs: catálogo inicial

Duraciones:
- **R:** rondas.
- **B:** batallas (la emboscada nocturna cuenta).
- **Z:** mientras el grupo siga en esa zona del camino.
- **C:** hasta el siguiente campamento (los altos no los quitan).
- **T:** hasta que algo lo quite (vendar, comer, cirugía).
- **M:** hasta el fin de la misión, al volver a la aldea.
- **P:** permanente.

**Buffs:**

| Buff | Duración | Efecto |
|---|---|---|
| Bien alimentado | C | +5 PG temporales al empezar cada batalla |
| Hoja afilada | 3B | +2 de daño en los ataques cuerpo a cuerpo con arma (cuando el combate nuevo los tenga) |
| Chakra centrado | C | El primer jutsu de cada batalla cuesta 3 menos |
| Guardia atenta | 1B | No puede ser sorprendido, +2 a la iniciativa |
| Ojos abiertos | Z | Trampas reveladas |
| Oculto en la niebla | 3R | Ventaja en Sigilo |
| Puertas abiertas | 2R | +1d8 de daño de taijutsu y más movimiento, como la dote «Iniciado de las Ocho Puertas». Al terminar, +1 Agotamiento (nuevo: la dote actual no da Agotamiento; esto la cambia). |
| Bendición del santuario | C | Ventaja en la próxima salvación de SAB por llegar a 10 de Tensión |
| Sello protector (Akkai) | C | Resistencia a un elemento |
| Piel de madera (Uddo) | 2B | +5 PG temporales |
| Lazo de camaradas | M | +1 CA mientras esté a 3 m o menos de su compañero; vuelve en cada misión mientras el Lazo sea 5 o más |
| Ánimo | C | La próxima vez que reciba Tensión, recibe 1 menos; después se pierde |
| Voluntad de Fuego (Despertar) | M | +2 a las salvaciones, inmune al miedo |

**Debuffs:**

| Debuff | Duración | Efecto |
|---|---|---|
| Sangrando | T | 1d4 por ronda en batalla y 1d4 por cada tramo del camino. Se quita con Vendar o Cerrar tenketsu. |
| Quemado | 2R | 1d6 por ronda; se apaga con agua o con una acción |
| Chakra sellado (crítico de Taki) | 2R | Sin jutsus |
| Confundido (genjutsu) | 2R | 25 % de atacar a un objetivo al azar |
| Marcado | 3R | Visible aunque esté escondido |
| Envenenado | C | Desventaja en ataques y pruebas. Se quita con un antídoto (objeto que se compra en la aldea) o con «Sellar veneno». |
| Pierna herida | C | −3 m de velocidad |
| Entumecido (frío) | C | −2 a DES |
| Hambriento | T | Desventaja en las salvaciones de CON. Se quita al comer. |
| Bajón | C | −2 a todas las tiradas |
| Fiebre | T | No recupera PG al descansar. Se coge al acampar con «Sangrando» sin vendar; se cura con Cirugía de campaña. |
| Secuelas de caída | M | −2 CA y salvaciones de muerte con desventaja |
| Maldición del santuario | M | −1 a todas las salvaciones |
| Quiebre | M | Pánico, Paranoia, Ira ciega o Desesperanza (efectos debajo) |
| Herida grave | M | −10 % de PG máximos; si se cura mal, deja una cicatriz (P). Se gana al caer a 0 PG por un crítico. |

**Los cuatro Quiebres** (quien controla al ninja lo sigue controlando, 2.9):
- **Pánico:** desventaja al atacar si hay un enemigo a 3 m o menos.
- **Paranoia:** no acepta curación de aliados.
- **Ira ciega:** ventaja al atacar y desventaja en las salvaciones de SAB.
- **Desesperanza:** −2 a todas las salvaciones.

### 2.13 En pantalla

- Escena lateral 2.5D de noche: el grupo sentado alrededor de la fogata animada, con tiendas, humo y luciérnagas.
- Arriba, las varitas de incienso de cada ninja ardiendo y la luna del **«Peligro nocturno»** con su %.
- Abajo, los retratos de los ninjas con barras de PG, chakra, Tensión y Agotamiento, y los iconos de sus efectos.
- Las actividades son cartas con su coste en varitas, el % de éxito si hay tirada y una vista previa del resultado.
- La pantalla explica qué es gratis (mirar, hablar) y qué gasta incienso. Es la lección de GWBW.

### 2.14 En solo, local y en línea

| | Solo | Local (pasar el dispositivo) | En línea |
|---|---|---|---|
| **Actividades de cada ninja** | Las eliges tú, todas | Cada jugador elige las de su ninja en secreto, por turnos, tras la pantalla tapada («Pasa el dispositivo a Jugador 2») | Cada jugador las suyas, a la vez y en secreto, con plazo de 90 s; si se acaba, la IA elige las de su ninja |
| **Fuego y comida** | Lo decides tú | Voto secreto de los jugadores, un voto por jugador aunque lleve varios ninjas (3.5); los votos se revelan a la vez. Si hay empate, gana, entre las opciones empatadas, la que tenga más aliados de la IA a favor; si sigue, decide el líder de la misión (3.5) | Voto a la vez, con plazo de 60 s; empate como en local |
| **Tiradas y emboscada** | En el dispositivo, con semilla | En el dispositivo, con semilla | Las tira el servidor |

- Antes de elegir se puede hablar, y ver el estado del grupo es gratis.
- Quién vigila se habla antes de elegir; la guardia es una actividad más y la paga quien la elige.
- Los ninjas que lleva la IA eligen sus actividades con reglas sencillas. Por ejemplo, curan a quien tenga menos del 50 % de PG. En el fuego y la comida no votan: muestran su postura, como en las decisiones (3.5). La IA prefiere la comida caliente (con fuego bajo) si alguien tiene 5 o más de Tensión; si no, prefiere sin fuego y ración seca cuando la emboscada pasa del 25 %, y fuego bajo y ración seca en los demás casos.
- **Plazo de voto en línea:** 60 s; al acabar, quien no votó cuenta como un aliado de la IA (muestra su postura y solo sirve para desempatar). El anfitrión lo puede quitar.
- Si alguien se desconecta, la IA juega sus ninjas hasta que vuelva, y en los votos cuentan como aliados de la IA.

### 2.15 Un tipo de escena reutilizable: turnos contados

El motor tendrá un tipo de escena de presión, sin historia propia, inspirado en los capítulos de GWBW. Dura un número fijo de turnos (8–12) y tiene una barra de objetivo y 2–3 medidores de fallo, uno de ellos de doble filo. Las acciones gratis (observar, preguntar) se distinguen claramente de las que gastan un turno, y cada tirada muestra su %. Fallar no acaba la partida: la historia sigue con una consecuencia. Se escribe con el mismo guion que las cinemáticas (órdenes `medidor` y `turnos`, 3.4). Cada turno, cada personaje del grupo hace una acción con coste, en orden de iniciativa, sea quien sea su controlador: en solo las eliges tú todas, y los de la IA eligen solos. Los turnos y los medidores se ajustan a 4 personajes y se escalan si hay menos. Qué escenas lo usan lo decides tú cuando escribas la historia.

---

## 3. Sistema de cinemáticas y diálogos

*Esto diseña el sistema, no la historia. Lo que se dice de otros juegos viene de los resúmenes que da el buscador web, porque las páginas no se pudieron abrir.*

### 3.1 Cómo se ve una escena

- **El mismo escenario que las batallas.** Fondo pintado, objetos del mundo en 16 bits a escala real y los personajes tal como el jugador los creó. No hay vídeos: todo se mueve dentro del juego, como en Chrono Trigger, Octopath Traveler o Sea of Stars.
- **Franjas negras** arriba y abajo mientras el jugador no controla nada.
- **Cámara:** sigue a quien habla y usa los zooms de batalla (1× y 2×). Para las frases clave hay un primer plano (4×). Tiembla con los golpes y se acerca despacio cuando llega la decisión.
- **Personajes:** entran caminando, se paran en marcas medidas en metros, se giran y cambian de pose.
- **Emotes:** globos de píxeles sobre la cabeza, cada uno con su sonido: **!**, **?**, **…**, gota de sudor, vena de enfado, corazón, nube gris y bombilla. A zoom normal la cara mide solo 12×10 píxeles, así que la emoción se lee en el globo y en el retrato.
- **Luz:** noche, atardecer, el resplandor de la fogata, relámpagos y fundidos. Se reutilizan la noche y el clima de las batallas.
- **Ilustración pintada** (una imagen fija que la cámara recorre), solo cuando el sprite no alcanza: algo enorme, un recuerdo o el instante clave de una gran decisión. Una o dos por misión, como máximo.
- **Antes de decidir, como en GWBW,** se puede tocar a un personaje o un objeto para preguntar u observar. Es gratis y puede desbloquear opciones, como los argumentos de Triangle Strategy.

### 3.2 Diálogo

- **Caja de texto** abajo, con el nombre de quien habla en el color de su clan y su **retrato**. Los del grupo van a la izquierda y los demás a la derecha.
- **Retratos sacados del propio sprite.** Se recortan la cabeza y los hombros y se amplían ×4. Así salen el pelo, los ojos y la bandana que eligió el jugador sin dibujar nada nuevo. Los retratos pintados a mano para los PNJ principales son pulido posterior (3.7); si los quieres se decide entonces.
- **Texto que aparece letra a letra:**
  - Velocidad ajustable.
  - Un pitido de voz por personaje (grave, medio o agudo).
  - Botones Auto, Avance rápido (solo el texto ya leído) y Saltar. Saltar también salta lo no leído, pidiendo confirmación.
  - Historial con las últimas 100 líneas.
  - **Saltar siempre se detiene en la decisión.**
  - En línea, cada pantalla avanza su propio texto, y la decisión se abre cuando todos llegan, o 60 s después de que llegue el primero.
- **Cartas de elección:** de 2 a 4. Las bloqueadas salen en gris con el motivo, por ejemplo «Requiere Byakugan».
- **Temporizador, solo si la escena lo pide.** Es una mecha que se quema. Si se acaba, ocurre la opción que marcó el guionista, como en los juegos de Telltale. En Accesibilidad se puede alargar o quitar. El plazo del voto en línea (60 s, 3.5) es aparte de la mecha de la escena. En local, la mecha se para en la pantalla tapada y cada jugador tiene la mecha completa para votar. En línea, si la mecha de la escena es más corta que los 60 s del voto, manda la mecha.
- **Tiradas d20:**
  - La carta muestra el **% de éxito antes de tirar**, como en GWBW.
  - Se usa el d20 rápido sobre el personaje. La ventana grande de dados queda para las pruebas importantes.
  - Fallar abre otra rama, nunca un callejón sin salida.
- **«X lo recordará»:** un aviso discreto con el retrato cuando una decisión cambia lo que un personaje piensa de ti. Las charlas junto al fuego del campamento (2.7) usan este mismo sistema, como las conversaciones de apoyo de Fire Emblem.
- **Listo para traducir:** los textos van aparte del guion, uno por idioma, con huecos para nombres (`{lider}`) y para el género.

### 3.3 Lo que necesitan los sprites

- **Poses:** hoy hay 7: quieto, sellos, ataque, lanzar, herido, victoria y cargar. **No existe «caminar»**, y es la primera que falta.
- **Cara:** es una plantilla fija de 12×10 píxeles. Cada expresión cambia unos pocos píxeles de ojos, cejas y boca. Así funciona con los 7 tipos de ojos y con cualquier personaje creado, en el escenario y en el retrato.

| Prioridad | Poses | Expresiones |
|---|---|---|
| **1 (mínimo)** | Caminar, hablar con gesto, brazos cruzados, sorprendido, triste, caído, sentado | Parpadeo, boca hablando, enfado, tristeza, sorpresa, sonrisa |
| **2** | Señalar, reverencia, arrodillado, dormido, risa | Ojos cerrados, mueca de dolor |
| **3** | Correr, mirar atrás, abrazar, llorar | Lágrimas, sonrojo, dojutsu que se activa |

Las poses sentado, dormido y caído también las usa el campamento. Sentado está en la prioridad 1 porque el primer prototipo ya incluye un campamento; hasta tener dormido, de noche se usa sentado.

### 3.4 El guion de una escena

Los guionistas escriben una orden por línea, y el juego la convierte en datos. No hace falta programar.

| Orden | Qué hace |
|---|---|
| `escena`, `fin` | Abrir la escena (fondo, luz, música) y cerrarla |
| `entra`, `mover`, `mira`, `pose` | Colocar, mover, girar y cambiar de pose a un personaje |
| `dice` | Una línea de diálogo, con la expresión entre paréntesis |
| `emote`, `camara`, `espera`, `fundido`, `musica`, `sonido` | Puesta en escena |
| `eleccion`, `opcion`, `prueba` | La decisión, sus cartas (cada una con su id) y sus tiradas d20 |
| `marca`, `si`, `ir a` | Recordar algo, preguntar por ello y saltar |
| `batalla`, `descanso`, `efecto` | Lanzar una batalla o un campamento y volver con el resultado, o aplicar un buff, un debuff o una curación del catálogo (2.12) |
| `medidor`, `turnos` | Crear una barra (objetivo, fallo o doble filo) y fijar el número de turnos (2.15) |

**Quién tira una `prueba`:** se escribe `prueba: Atletismo CD 12 quien: elegido|mejor|grupo|LIDER`. Si no se indica, tira el ninja con mejor modificador; `grupo` es la prueba de grupo de 5e: pasa si la supera al menos la mitad.

Ejemplo con una escena de prueba neutral, que no es de la historia:

```
escena  ejemplo_cruce   fondo: bosque_rio   luz: atardecer   musica: calma
entra   LIDER  desde: izquierda  a: 6m
entra   GUIA   desde: derecha    a: 11m   mira: izquierda
camara  primer_plano GUIA
dice    GUIA (neutral)  "El camino se parte en dos. ¿Puente o vado?"
emote   LIDER  ?
eleccion  ejemplo.ruta   tiempo: no
  opcion  puente  "Por el puente"                                     -> final
  opcion  vado    "Por el vado"   prueba: Atletismo CD 12 quien: grupo  -> vado
#vado
  si exito:  dice LIDER (sonrisa) "Ni nos mojamos."
  si fallo:  efecto grupo Entumecido;  emote LIDER sudor
#final
  fundido negro;  fin
```

**Cómo recuerda el mundo:**
- Cada `eleccion` guarda sola el id de la opción elegida (`ejemplo.ruta = vado`), así que dos opciones que saltan al mismo sitio se distinguen.
- `marca` guarda lo demás. Puede ser:
  - un sí o un no;
  - un número, como la confianza de un personaje no jugador o la reputación de un clan;
  - un texto.

  Puede durar la escena, la misión o la campaña.
- Una escena posterior pregunta `si ejemplo.ruta = vado` y, según la respuesta, cambia una línea, quién aparece, un precio o una batalla.
- **Pantalla Crónica.** Para cada misión muestra las decisiones tomadas:
  - qué se eligió, quién votó qué y qué postura mostró cada aliado de la IA;
  - las consecuencias ya vistas («→ se notó en la Misión 7»);
  - las que faltan, con un aviso como «Aún no ha dado frutos».

  Con el juego en línea podrá mostrar el % de jugadores que eligió lo mismo, como GWBW.
- **Listo para el juego en línea:** el servidor lee el guion, tira los dados con una semilla y cuenta los votos. Cada pantalla solo muestra la animación, igual que en batalla.

### 3.5 Decisiones en los tres modos

Cada personaje tiene una **convicción**. Los PNJ tienen la que les da el guionista, que marca también cuál es su valor principal. Cada ninja del jugador elige 1 o 2 valores de una lista cerrada en el creador (por ejemplo: proteger a inocentes, lealtad a la aldea, cumplir la misión, honor del clan); el primero es su valor principal. Cada opción dice a qué valores apela y contra cuáles va. Un personaje está a favor si apela a uno de sus valores, en contra si va contra alguno, y con dudas si pasan las dos cosas o ninguna.

**Quién vota.** Vota cada jugador, una sola vez, aunque lleve varios ninjas. Sus otros ninjas cuentan como aliados de la IA. Los aliados de la IA no votan: muestran su postura (a favor, en contra o con dudas), como en Solo, y solo cuentan para desempatar, antes que el líder. El líder de la misión se elige en la aldea al formar el equipo (2.1).

**Desempate.** Si hay empate, gana, entre las opciones empatadas, la que tenga más aliados de la IA a favor; si sigue, decide el líder.

| Modo | Cómo se decide |
|---|---|
| **Solo** | Decides tú. Sobre cada carta salen los retratos de los aliados a favor, en contra o con dudas. Es un consejo, no un voto. |
| **Local** | Voto secreto: entre un jugador y otro aparece una pantalla tapada («Pasa el dispositivo a Jugador 2»). Al tocarla, ese jugador ve las cartas y vota a solas, y la pantalla se vuelve a tapar. Los votos se revelan a la vez sobre el retrato de cada jugador. Si hay empate, gana, entre las opciones empatadas, la que tenga más aliados de la IA a favor; si sigue, decide el líder de la misión. |
| **En línea** | Todos votan a la vez. Plazo de voto en línea: 60 s; al acabar, quien no votó cuenta como un aliado de la IA (muestra su postura y solo desempata). El anfitrión lo puede quitar. Empate como en local. |

**El voto va en dos pasos** (en local y en línea):
1. **Debate** a la vista de todos, donde cada jugador puede gastar **un argumento**. Algunos se desbloquean con lo averiguado en la misión.
2. **Voto secreto.**

Los argumentos se juegan en el paso 1, así que cada jugador ve los que le afectan antes de votar.

**Persuasión** (en el debate):
- Tira Persuasión (d20 + CAR + competencia si la tiene) contra una CD: 10 si la opción no toca la convicción del objetivo, 15 si va contra ella y 20 si va contra su valor principal. Si gana, el aliado de la IA cambia de postura.
- A otro jugador no se le tiran dados: solo ve el argumento y decide qué vota.
- Si alguien se desconecta, sus personajes cuentan como aliados de la IA hasta que vuelva.

**Personajes en desacuerdo.** En todos los modos, cada personaje cuya convicción vaya contra la opción elegida recibe +1 Tensión (2.9), haya votado o no. Votar en contra no cuesta nada más como jugador: el personaje dice su frase, la Crónica guarda quién no estuvo de acuerdo, y una escena futura puede darle la razón.

### 3.6 Guardado

- El juego guarda automáticamente **justo antes** de cada decisión y **justo después** de su consecuencia. También al empezar cada campamento y al entrar en cada nodo del camino (2.1); en Leyenda, todo va a la misma ranura.
- **Si todo el grupo cae** en una batalla, en Historia y Normal se repite desde ese nodo. Si cae en la emboscada, despierta con «Secuelas de caída» y pierde la mitad de los suministros (2.8).
- **En Leyenda, si cae todo el grupo** (en batalla o en la emboscada), cada ninja caído tira sus salvaciones de muerte hasta estabilizarse o morir; los que sobreviven despiertan con «Secuelas de caída». Si mueren todos, lo decide la pregunta 21 (fin de la partida o escuadrón de relevo).
- **Historia y Normal:** se puede cargar y elegir otra cosa.
- **Leyenda:** una sola ranura, que se sobrescribe al entrar en cada nodo, al confirmar cada decisión (o al cerrarse el voto), en cada turno de batalla, al morir un ninja, al terminar cada batalla y al salir del juego. Cargar nunca devuelve a un momento anterior a una muerte, y salir del juego no reinicia una batalla. No hay vuelta atrás.
- **En línea:** guarda el servidor, y cargar requiere el acuerdo del grupo.
- La semilla de los dados va en el guardado. Cada tirada de una decisión sale de la semilla + el id de la decisión + el id de la opción + el número de tirada. Repetir la misma opción da el mismo resultado, pero otra opción da un número que no se puede prever.
- Las tiradas del camino y del campamento (trampas, curiosidades, caza, Cirugía de campaña, emboscada) salen de la semilla + el id del nodo + el número de tirada, sin depender de lo elegido. Cargar el mismo campamento da la misma tirada de emboscada.

### 3.7 Versión mínima y pulido posterior

- **Mínimo:**
  - Escenario con franjas, cámara y fundidos.
  - Caminar, las poses y expresiones de prioridad 1 y 6 emotes.
  - Retratos con Auto, Saltar e Historial.
  - Cartas con % y d20, `marca` y `si`, y la Crónica como lista.
  - Guardado antes y después de cada decisión.
  - Solo y local con voto secreto.
- **Después:**
  - Primer plano, temblor, luz de fuego e ilustraciones pintadas.
  - Temporizador y persuasión.
  - Pitidos de voz y retratos pintados a mano para los personajes no jugadores principales.
  - Narrador opcional como el de Darkest Dungeon.
  - % mundial, segundo idioma y un editor visual de escenas.

*Fuentes (resúmenes del buscador):* [Triangle Strategy, Twinfinite](https://twinfinite.net/reviews/triangle-strategy-review/) · [Triangle Strategy, Gameranx](https://gameranx.com/features/id/291893/article/triangle-strategy-how-to-unlock-the-true-ending-path-best-choices-guide/) · [HD-2D, Wikipedia](https://en.wikipedia.org/wiki/HD-2D) · [Octopath Traveler II, Unreal Engine](https://www.unrealengine.com/developer-interviews/octopath-traveler-ii-builds-a-bigger-bolder-world-in-its-stunning-hd-2d-style) · [Telltale, Game Informer](https://www.gameinformer.com/b/features/archive/2015/02/03/why-your-choices-dont-matter-in-telltale-games.aspx) · [Darkest Dungeon, TechRaptor](https://techraptor.net/gaming/features/darkest-dungeon-narrator)

---

## 4. Dónde encaja en el código y qué hay que construir

### Lo que hay hoy y lo que bloquea

- `TacticalCombat.tsx` resetea los PG y el chakra en cada batalla (líneas 131 y 275) y vacía las condiciones (132 y 276). Ignora el `currentHp` y el `currentChakra` que recibe.
- Solo avisa de la victoria con `onBattleEnd(true, 1200)` (línea 994): una XP fija, sin los PG, el chakra ni las condiciones finales. En la derrota no llama a `onBattleEnd`, y `App.tsx` ignora la llamada porque su callback está vacío.
- Las condiciones (`CombatEntity.conditions`, `src/types/shinobi.ts:207`) son una unión cerrada sin duración, origen ni acumulación, y solo existen en batalla. Ninguna regla las aplica. Falta `'Poisoned'`, aunque el texto de `mystical_palm` lo menciona.
- `bonusEffect` en `CampaignMode.tsx` (línea 29) es solo texto: nunca llega al combate.
- No se guarda nada. La única persistencia es exportar e importar la ficha a mano en el creador (`CharacterCreator.tsx:303-319`).
- El combate aún usa una cuadrícula de 10×8 (`TacticalCombat.tsx:107-108`), sin tirada de iniciativa, y nunca tira salvaciones (`savingThrow` y `saveEffect` no se leen). `GAMEPLAY_DESIGN.md` ya dice que `TacticalCombat.tsx` se reconstruye.
- No hay nada de cinemáticas. `CampaignNode` no tiene `next`, banderas, condiciones ni hablantes. No existen diálogos ni retratos. Los sprites no caminan, no tienen expresiones y no se pueden reflejar. Todo el texto está en inglés dentro de los componentes, sin capa de traducción.

### Lo que ya sirve

- `SHINOBI_CLASSES` (`src/data/shinobiData.ts:89-146`) tiene `hitDie`, `chakraDie` y `castingStat`: bastan para los Dados de Golpe y de Chakra.
- `DiceRollModal` ya muestra la CD y el éxito o fallo, y anima la tirada que le pasen, que puede venir del motor o del servidor con semilla. No muestra el %: ese % va en la carta antes de abrirlo.
- La ficha con sprite de `ArenaSandbox.tsx` (líneas 98-121) sirve para el campamento.
- `renderSprite` (`src/sprite/compose.ts:124`) es una función pura que dibuja cualquier pose en cualquier fotograma y devuelve el `rig` (cabeza, manos, pies). Sirve para recortar retratos y anclar globos.
- Los PNJ pueden ser datos `SpriteAppearance`, como `ENEMY_LOOKS` y `enemyLook()` (`TacticalCombat.tsx:19-20`).
- La fogata (con sus animaciones encendida, en brasas y apagada), la columna de humo y la tienda de lona ya están en `src/assets/world/camp/`, a escala real (57 px por metro). Se hicieron como accesorios del campamento enemigo en el mapa de batalla; sirven igual para el nuestro. Son parte del encargo de sprites del mundo, ahora en pausa. El dueño pidió rehacer todo el set del campamento con el estilo de los landmarks, conservando las llamas, el humo y las tres animaciones de la fogata.
- El sonido se sintetiza con Web Audio en `src/utils/audio.ts`. Se le pueden añadir el pitido de texto y los sonidos de los emotes. No hay música ni ambiente.

### Pasos de construcción

*Los llamo «pasos» para no confundirlos con la «fase 2» de `GAMEPLAY_DESIGN.md`, que es la red.*

**Paso 1. Estado del grupo y efectos.** Va junto con la reconstrucción del motor de batalla acordada en `GAMEPLAY_DESIGN.md`.
- Antes de programar, se copian a `GAMEPLAY_DESIGN.md` (la fuente de verdad de las batallas) las reglas de batalla nuevas: batallas sin fase de sigilo (emboscada, Campana de alarma, trampa activada con un kunai), «Concentrar chakra», la píldora de soldado, sorprendido (5e 2014) y que los Taki no pueden serlo, efectos con duración, «Secuelas de caída», «Herida grave» por críticos y la Tensión por críticos.
- El motor de batalla nuevo acepta un estado inicial del grupo (PG, chakra, efectos) y devuelve un resultado `{victory, survivors, xp, loot}`. Reglas en TypeScript puro, separadas de la pantalla, con acciones y eventos, dados con semilla y estado serializable. Si antes se parchea el `TacticalCombat.tsx` actual, hay que cambiar su firma de hoy, `onBattleEnd(victory, expGained)`, y llamarla también en la derrota.
- Cambiar la unión cerrada `conditions` por un `StatusEffect {id, kind, mods, duration: rounds|battles|zone|untilCamp|untilTreated|mission|permanent, source, stacks}` guardado en el personaje (`untilTreated` es la duración T de 2.12: Sangrando, Fiebre, Hambriento).
- Restar duraciones al empezar y al acabar cada turno y al acabar cada batalla, en el motor nuevo. Hoy el equivalente es `handleEndTurn` (`TacticalCombat.tsx:472`), que solo reinicia las acciones del siguiente combatiente y le suma el chakra de Uddo. Los turnos de la IA se encadenan con `setTimeout` y leen estado de cierres obsoletos, así que meter ahí los ticks sería frágil.
- Tirar salvaciones de verdad.
- Añadir la acción «Concentrar chakra», la píldora de soldado y el clima de noche (`WeatherType`, `shinobi.ts:195`, no tiene noche).
- Añadir a `ShinobiCharacter`: `hitDiceRemaining`, `chakraDiceRemaining`, `exhaustion`, `tension`, `effects`, `inventory`, `scars`, `bonds` (Lazo), `conviction` (1 o 2 valores elegidos en el creador, 3.5) y `skillProficiencies` (Sigilo, Percepción, Investigación, Supervivencia, Persuasión, Atletismo…). Calcular la competencia según el nivel, en vez del `profBonus = 2` fijo.
- Rasgos de `CLANS_DATA`: añadir la transferencia de chakra de Uddo (es nueva) e implementar los que hoy son solo texto y usa este diseño: Taki no puede ser sorprendido (`shinobiData.ts:78`) y Mirai tiene ventaja contra genjutsu.
- Grupo de hasta 4 ninjas, cada uno con su controlador (jugador local, otro jugador local, jugador remoto o IA). Nueva vista `'mission'` en `App.tsx`, que hoy tiene `AppView` en la línea 11 y un único `character` en la 20.
- Un `EncounterDef` único que sustituya la forma `{title, description, enemyType, weather}` que hoy se repite en `App.tsx`, `CampaignMode.tsx`, `ArenaSandbox.tsx` y `TacticalCombat.tsx`.

**Paso 2. Módulos de reglas** (`src/rules/`, sin pantalla; el mismo código correrá en el servidor).
- `derived.ts`: mover aquí `calculateDerived`, que hoy es un cierre local en `CharacterCreator.tsx:92-134`.
- `checks.ts`: d20 + modificador + competencia contra CD, % de éxito antes de tirar y dados con semilla. Devuelve un `DiceRollResult` para el d20 rápido o para `DiceRollModal`.
- `effects.ts`: aplicar, acumular, restar y caducar efectos según su duración.
- `rest.ts`: alto y campamento (dados, comida, fuego, incienso, % de emboscada, recuperación de la mañana), Tensión y Agotamiento.
- `traps.ts`: detectar, desactivar, activar, rodear, y las trampas del perímetro.
- `vote.ts`: debate y voto secreto (un voto por jugador), revelación a la vez, postura de la IA según la convicción, desempate (la opción empatada con más aliados de la IA a favor y después el líder), plazo de 60 s en línea y persuasión.
- Todo como acciones y eventos, igual que la batalla.

**Paso 3. Pantalla de campamento.**
- `RestCamp.tsx`, reutilizando la ficha con sprite de `ArenaSandbox`.
- `src/data/campActivities.ts`, inspirado en el JSON de habilidades de campamento de DD. Allí cada habilidad tiene `id`, `level`, `cost`, `use_limit`, `hero_classes[]` y una lista `effects[]`, y cada efecto lleva su propio objetivo (`selection`), `requirements` y `chance`. Nuestra versión: `id`, `cost`, `useLimit`, `requires {clan, class}`, `effects[]` con `target` y `chance` en cada efecto.
- `CoverScreen.tsx`: la pantalla tapada de «Pasa el dispositivo a Jugador 2», compartida con las votaciones.
- La fogata cambia de animación según el fuego elegido, y la luna muestra el % de emboscada.
- El mapa de la emboscada se arma con el claro, la fogata, las tiendas y las trampas del perímetro.

**Paso 4. Camino, trampas y curiosidades.**
- `src/data/traps.ts` y `src/data/curios.ts`.
- `RouteMap.tsx` y `EventCard.tsx`, solo con lo que piden los descansos: nodos, horas y dónde se acampa.
- `MissionRunner.tsx`: máquina de estados tramo → evento → escena → batalla → alto o campamento → … → Crónica.

**Paso 5. Reproductor de cinemáticas y formato de guion.**
- `src/types/scene.ts`: `SceneDef`, las órdenes, `Choice`, `Check` y un `Effect` tipado (`{type:'chakra', delta}`, `{type:'status', id}`, `{type:'flag', key, value}`, `{type:'battle', encounterId}`, `{type:'rest'}`).
- `src/scenes/parse.ts`: convierte el guion de texto (3.4) en esos datos. Un script de comprobación avisa de órdenes desconocidas, saltos rotos, ids de opción repetidos y textos sin traducir antes de publicar.
- `src/rules/scene.ts`: avanza la escena, tira los dados con semilla, guarda las marcas y emite eventos. Así queda listo para el servidor.
- `ScenePlayer.tsx`: el escenario de batalla con franjas, cámara (1×, 2× y primer plano 4×), fundidos, luz, emotes y una cola de animaciones con línea de tiempo. Hoy no existe: en combate solo se cambia `spriteState`, que no vuelve a `'idle'` hasta `handleEndTurn`.
- `DialogueBox.tsx` (retrato, letra a letra, Auto, Avance rápido, Saltar, Historial) y `ChoiceCards.tsx` (%, bloqueos, mecha).
- Marcas con alcance de escena, misión o campaña, y la pantalla `Chronicle.tsx`.
- Textos aparte, uno por idioma (`src/i18n/es.json`, `en.json`), con huecos como `{lider}` y variantes de género.
- Para el tipo de escena de turnos contados (2.15): órdenes `medidor` y `turnos` en el guion, y sus barras en pantalla.
- `CampaignMode.tsx` (fondo, texto y cartas de opción, sin personajes) solo aporta la idea de las cartas. Se migra a escenas o se queda como selector de arcos.
- El paquete `motion` ya está instalado y nadie lo usa: puede animar cartas y barras.

**Paso 6. Sprites: poses, expresiones y espejo.** Puede empezar ya, en paralelo.
- Hoy hay 7 poses (`SpritePose`, `src/sprite/types.ts:11`). Cada pose nueva necesita entradas en `SpritePose` y `SPRITE_POSES` (`types.ts:11-13`), en `POSES` (`rig.ts:218`) y en `POSE_FPS` (`rig.ts:373`). Primero caminar (en combate el movimiento es hoy un salto instantáneo), luego la prioridad 1 de 3.3 (que ya incluye sentado y caído, que usa el campamento) y después dormido.
- Expresiones: la cara es una plantilla fija (`FACE_LEFT`, `FACE_MAIN` y `EYE_ROWS` en `src/sprite/body.ts:329`, `337` y `377`, pintadas por `drawFace`), y la boca siempre es la misma línea. Añadir un parámetro de expresión que sustituya filas de ojos, cejas y boca con el mismo mecanismo `eyeRow` (`body.ts:391`), respetando los `pixelEdits` que el jugador haya pintado sobre la cabeza.
- Espejo: `renderSprite` siempre mira a la derecha, aunque `GAMEPLAY_DESIGN.md` dice que los sprites se reflejan. Hace falta para `mira: izquierda`.
- `ShinobiSpriteCanvas`: añadir dirección, expresión, fotograma fijo, reproducir una sola vez y aviso al terminar la animación.
- Retratos: recorte de cabeza y hombros a partir del `rig`, ampliado ×4. Globos de emote: 8 sprites pequeños.

**Paso 7. Guardado.**
- `src/utils/save.ts`: `localStorage` con try/catch, versión de esquema, migración al estilo de `characterFromImport` (`CharacterCreator.tsx:42`) y exportación manual. El Artifact publicado puede tener el almacenamiento vacío o bloqueado, así que la exportación es la red de seguridad.
- Puntos de guardado: al empezar cada campamento, al entrar en cada nodo del camino, justo antes de cada decisión y justo después de su consecuencia.
- Leyenda: una sola ranura que se sobrescribe al entrar en cada nodo, al confirmar cada decisión (o al cerrarse el voto), en cada turno de batalla, al morir un ninja, al terminar cada batalla y al salir del juego. Cargar nunca devuelve a un momento anterior a una muerte. La semilla de los dados va en el guardado; cada tirada de una decisión se deriva de la decisión, la opción y el número de tirada, y las del camino y el campamento, del nodo y el número de tirada (3.6).
- En línea (fase 2 de la red): guarda el servidor.

**Orden recomendado para un primer prototipo:** pasos 1 y 2 con un solo ninja controlado por ti, un campamento completo (paso 3) sin emboscada, y la versión mínima de cinemáticas (3.7) con la pose de caminar. Después, la emboscada, las trampas y el voto en local.

---

## 5. Preguntas para el dueño

Responde con el formato "1b 2a 3a…". ★ marca mi recomendación.

1. **Tensión (el estrés mental de cada ninja).**
   - a) No hay: solo PG, chakra y Agotamiento.
   - b) Sí, visible de 0 a 10; al llegar a 10, Quiebre o Despertar. ★
   - c) Sí, pero oculta: se lee en los retratos y los diálogos.

   *Si eliges a: en la 13 no hay rasgos de Quiebre ni de Despertar; en la 17, la b pasa a ser −1 de Lazo con el líder (si quien discrepa es el líder, no pierde nada) y la c, −2; y lo que baja o frena la Tensión en el campamento (comida, charlas, rezar, Sueño apacible, Dar ánimo) se rehace con otros efectos.*
2. **Cuántas veces se descansa.**
   - a) Solo en la aldea.
   - b) 1–2 campamentos por misión, más un alto corto entre zona y zona (como máximo uno por zona). ★
   - c) Cuando el jugador quiera, limitado por los kits de acampada.
3. **Cuánto recupera un campamento fuera de la aldea.**
   - a) Todo, como en 5e.
   - b) La mitad de PG y chakra; la comida y las actividades suben el resto. El 100 % solo en la aldea. ★
   - c) Solo lo que den la comida y las actividades.
4. **Presupuesto del campamento.**
   - a) 3 varitas de incienso por ninja; cada actividad cuesta de 1 a 3 (algunas gastan además chakra o material). ★
   - b) Una bolsa común para el grupo (12 puntos, como el Respiro de DD).
   - c) Un número fijo de acciones por noche para todo el grupo (por ejemplo 5, como el campamento de GWBW).
5. **Cómo decide el grupo en local y en línea** (decisiones de escena, y comida y fuego en el campamento).
   - a) Votan los jugadores, un voto por jugador aunque lleve varios ninjas, por mayoría. Los aliados de la IA (y los demás ninjas de cada jugador) solo muestran su postura y desempatan; si sigue el empate, decide el líder, que se elige en la aldea. Las actividades de cada ninja las elige su jugador. ★
   - b) Decide el líder; los demás solo aconsejan.
   - c) Por unanimidad; si no la hay, otra ronda de debate.
   - d) Se turnan: cada decisión la toma un jugador distinto.
6. **Modos de dificultad y muerte permanente.**
   - a) Un solo modo, sin muerte permanente: caer deja una Herida grave.
   - b) Historia / Normal / Leyenda; solo en Leyenda hay muerte permanente y una sola ranura de guardado. ★
   - c) Como en GWBW: un modo Original y otro Narrativo, casi sin obstáculos. (El modo sin azar, que GWBW llamaba Puzzle, va aparte, en la 15.)
   - d) Muerte permanente siempre, como en Darkest Dungeon 1.
7. **Cargar una partida para cambiar una decisión.**
   - a) Siempre, en cualquier modo.
   - b) Sí en Historia y Normal, no en Leyenda; al cargar, la misma opción da la misma tirada, y el mismo campamento, la misma tirada de emboscada. ★
   - c) Nunca.

   *Si en la 6 no eliges b, la b de aquí dice: sí, salvo con muerte permanente.*
8. **Emboscadas nocturnas.**
   - a) Nunca.
   - b) Con % visible y siempre contrarrestables (guardia, campanas, barrera, Byakugan). ★
   - c) Aleatorias y ocultas.
9. **Recuperar chakra en batalla.**
   - a) Solo Uddo y las píldoras de soldado.
   - b) La acción «Concentrar chakra», más Uddo y las píldoras. ★
   - c) +1 por ronda para todos (Uddo, +3).
10. **Trampas en el camino.**
    - a) Siempre visibles.
    - b) Ocultas hasta superar la Percepción pasiva o explorar; después se ven la CD y el % de cada opción. ★
    - c) Ocultas hasta que se activan.
11. **Suministros.**
    - a) Ninguno.
    - b) Ligeros: raciones, kits, vendas, antídotos, píldoras y material para trampas, con mochila limitada. ★
    - c) Profundos: también agua, leña, munición y peso.
12. **Escenas de turnos contados** (el tipo de escena de presión de 2.15).
    - a) No: solo cinemáticas con decisión.
    - b) Sí, como tipo de escena reutilizable: 1 objetivo y 2–3 medidores, uno de doble filo. ★
    - c) Sí, más complejas: 4 medidores o más.
13. **Qué queda después de la misión.**
    - a) Nada: la aldea lo cura todo.
    - b) Las cicatrices, y un rasgo pequeño por cada Quiebre o Despertar. ★
    - c) Lo de b, y además las Heridas graves y la Fiebre siguen al volver y cuestan dinero o perderse la siguiente misión para curarlas (va contra «la aldea lo recupera todo»).
14. **Azar.**
    - a) Dados sin mostrar el %.
    - b) d20 con el % visible antes de tirar. ★
    - c) Nada de dados fuera de batalla: todo determinista.
15. **Modo sin azar** (opcional, como el Puzzle de GWBW).
    - a) No.
    - b) Sí, fuera de batalla: cada prueba vale 10 + modificador; las tiradas de % se cambian por un contador (la emboscada llega cuando la suma de los % de los campamentos llega a 100), y una curiosidad sale bien si su % es del 50 % o más. ★
    - c) Sí, también en batalla.

    *Si en la 14 eliges c, fuera de batalla ya no hay dados, así que aquí solo cambia algo la c.*
16. **Plazo en horas** (descansar gasta tiempo, como la marcha del capítulo 5 de GWBW). Sin plazo, las horas siguen subiendo el peligro nocturno (2.1).
    - a) Nunca.
    - b) Solo en algunas misiones, y siempre se ve cuánto queda. ★
    - c) En todas las misiones.
17. **Personajes en desacuerdo.**
    - a) No les pasa nada.
    - b) Cada personaje cuya convicción vaya contra la opción elegida recibe +1 de Tensión, haya votado o no; quien votó en contra dice su frase. ★
    - c) Lo de b, y además −1 de Lazo con el líder.
18. **Persuasión.**
    - a) No hay.
    - b) Un argumento por jugador y decisión, en el debate antes del voto secreto, con una tirada de CAR que solo cambia la postura de los aliados de la IA. ★
    - c) Igual, pero si la tirada sale, también obliga a otro jugador a votar esa opción.
19. **Temporizador en las decisiones.**
    - a) Nunca.
    - b) Solo en escenas de presión, y se puede quitar en Accesibilidad. ★
    - c) En todas.

    *El plazo del voto en línea (60 s, 3.5) es aparte de la mecha de la escena.*
20. **Aviso «X lo recordará».**
    - a) Sí, discreto y con el retrato. ★
    - b) No; se descubre en la Crónica.
    - c) Ni aviso ni Crónica: las consecuencias solo se ven en la historia.
21. **Si muere todo el grupo en Leyenda** (2.8).
    - a) Fin de la partida: hay que empezar la campaña de nuevo.
    - b) El clan manda un escuadrón de relevo: ninjas nuevos siguen la campaña con las marcas, la reputación y las cicatrices del mundo ya ganadas, desde la última misión. ★

---

## Anexo: ideas para tu sesión de historia

> **Esto son ideas, no decisiones.** Sirven para inspirarte en la sesión de historia; nada de este anexo está decidido ni hace falta responderlo ahora. Los nombres (Kaen, Juro, Hana) son provisionales. Donde una idea toca las reglas de este documento (votos, líder, Tensión, Lazo, muerte), ya está ajustada a ellas. Las preguntas van numeradas de H1 a H5 para no confundirlas con las 21 de la sección 5.

Las elecciones de la pantalla de campaña actual solo cambian la batalla siguiente: quedan como **decisiones tácticas**. Encima van pocas **decisiones de historia**, que usan el sistema de cinemáticas de la sección 3.

### A.1 Estructura: rama y cuello de botella

- **3 arcos** (Bosque, Bastión de Hierro, Titán). Los arcos I y II acaban en una **decisión clave** que abre una de dos rutas, con misiones, aliados, enemigos y lugares distintos; el III, en la decisión final.
- Las rutas se juntan en una misión común (el **cuello de botella**). El arco I es lineal (4 misiones). En los arcos II y III se juegan 4 misiones (3 de la ruta elegida y la común) y se construyen 7. Las rutas reutilizan mapas con variantes: de noche, quemado, con arena.
- El juego guarda **marcas** del guion (3.4), como «aldea_uddo_salvada = sí», y la **reputación** de cada clan como una marca numérica.

```
ARCO I · EL BOSQUE
 [Entrada] → [Río] → [Campamento] → [Torre] → ◆ CLAVE 1
                                       ┌───────┴───────┐
                                    Ruta A          Ruta B
ARCO II · EL BASTIÓN                   └───────┬───────┘
                          [Asedio del Bastión] → ◆ CLAVE 2
                                       ┌───────┴───────┐
                                    Ruta A          Ruta B
ARCO III · EL TITÁN                    └───────┬───────┘
                          [El cráter] → ◆ DECISIÓN FINAL
                (opciones abiertas según marcas y reputación)
                  Final 1 · Final 2 · Final 3 · Final 4
```

**Finales.** La decisión final ofrece hasta 4 opciones, que se abren o se cierran según lo que hiciste (como en Mass Effect). Las cerradas salen en gris con el motivo, como cualquier carta bloqueada (3.2):

1. **Cuatro sellos:** con 3 clanes Aliados o más, el titán se reparte entre los cuatro. Paz frágil.
2. **La vasija:** se sella en una persona (alguien del grupo o el rival perdonado). Pide el pergamino o a los Akkai como Aliados.
3. **Ceniza:** matarlo a la fuerza. Siempre disponible; la aldea sobrevive o arde según lo anterior.
4. **El nuevo amo:** el pergamino ata al titán al grupo. Solo con mucha «Crueldad» (otra marca numérica).

Cierra un **epílogo por diapositivas**: una imagen y dos frases por PNJ, aldea y clan.

### A.2 Consecuencias que duran

Regla **1-2-3**: cada decisión grande tiene un efecto inmediato, un eco 2 o 3 misiones después y un peso en el final. La Crónica (3.4) los va mostrando.

- **Destinos** de PNJ y ninjas: vivos, muertos, heridos, desaparecidos. Un ninja del jugador solo muere de verdad según las reglas de muerte (A.5).
- **Reputación** de Mirai, Uddo, Akkai y Taki en 5 niveles (Hostil, Frío, Neutral, Amigo, Aliado). Cambia precios, refuerzos, emboscadas y finales.
- **Lugares:** una aldea salvada o quemada cambia su mapa (casas o ruinas) y sus misiones (el mercado pasa a ser un campo de refugiados).
- **Gente que vuelve:** el rival perdonado (aliado o jefe) y el traidor (pistas pronto, revelación un arco después).
- **Jutsus y aliados** que solo existen en una rama.
- **Frases que recuerdan:** «Aún huelo el humo de aquella torre». Acompañan al aviso «X lo recordará» (3.2), no lo sustituyen.

### A.3 Seis decisiones de ejemplo

#### D1 · La última ración (Arco I · Uddo · campamento)
Seis leñadores Uddo con niños huyen de un incendio (si quemasteis el puesto del río, el fuego es vuestro). Solo queda comida para el grupo hasta la torre.
- **Compartir:** esa noche el grupo queda en «Sin comer» (2.6: +1 Agotamiento, +2 Tensión y «Hambriento»). *Después:* Uddo +2; una sanadora Uddo lucha en el asedio y la niña Hana vuelve en el Arco III.
- **Guardarla:** llegáis fuertes a la torre. *Después:* tumbas junto al puente (Uddo −1); un superviviente vende vuestra ruta y el asedio empieza con la alarma dada (sin fase de sigilo).

#### D2 · El rival de la torre (Arco I · Mirai · clave 1)
Vencéis a Kaen Mirai, el prodigio rival. Ha visto la técnica secreta de vuestro clan. Nadie mira.
- **Perdonarlo:** se va herido y en deuda. Ruta A: los Mirai os abren el Paso de las Cenizas. *Después:* Kaen vuelve en el Arco III: aliado si la reputación Mirai es alta, jefe enemigo si es baja.
- **Matarlo:** os quedáis su pergamino y un jutsu Mirai (Mirai −2). Ruta B: cazadores Mirai os persiguen por los pantanos. *Después:* en el asedio aparece un escuadrón Mirai extra, inmune a vuestro genjutsu.

#### D3 · Un antídoto, dos envenenados (Arco II · Akkai · campamento · destino de un ninja)
Los perros del Bastión envenenan a uno de vuestros ninjas y a Juro, un sellador Akkai desertor que conoce un pasadizo. Hay un solo antídoto para el «Veneno del Bastión», un veneno especial: los antídotos comunes, Preparar píldoras y Sellar veneno no lo curan, y no caduca al acampar.
- **Vuestro ninja:** Juro muere. El asedio es frontal, sin sigilo y con más enemigos.
- **Juro:** vuestro ninja tira 3 salvaciones de CON esa noche. Si falla la mayoría, en Leyenda muere; en Historia y Normal sobrevive con «Secuelas de caída» (2.12). Si sobrevive, le queda la cicatriz «Sangre negra» (−5 PG máximos). Juro os guía por el pasadizo. *Después:* según cómo lo tratasteis, os traiciona en el Arco III y abre el cráter a los renegados. Pista previa: un halcón de noche.

#### D4 · Prisioneros o pergamino (Arco II · Taki y Akkai · clave 2)
El Bastión se derrumba. Hay tiempo para salvar a cinco Taki a los que roban el Byakugan o para coger el pergamino de sellado robado a los Akkai. No para ambos.
- **Los Taki:** Taki +2, Akkai −1. Ruta A: os guían al cráter por los túneles. *Después:* un vigía Taki os acompaña y nadie os sorprende, pero «La vasija» se cierra salvo que los Akkai sean Aliados.
- **El pergamino:** Akkai +2, Taki −2. Ruta B: aprendéis el sello en su santuario. *Después:* los renegados usan los ojos robados: en el Arco III los enemigos ven en 360° y el sigilo es mucho más duro.

#### D5 · El cebo (Arco III · destino de un ninja)
El titán persigue el chakra más fuerte. Para alejarlo de la evacuación, alguien del grupo puede hacer de cebo.
- **Un ninja:** juega solo una misión de huida (en multijugador, su momento). Si cae, el titán lo absorbe: no muere, pero solo sellando al titán se le recupera. Si escapa, cicatriz «Marca del titán» (su Tensión nunca baja de 2).
- **Nadie:** el grupo sigue entero. *Después:* el titán pisa la ruta; la escolta del valle pasa a ser un rescate entre escombros.

Quién hace de cebo lo decide el dueño de ese ninja (veto, A.4 y H3).

#### D6 · Las últimas píldoras (Arco III · los cuatro clanes · suministros)
La noche antes del final, los genin que cubren la evacuación piden vuestra última caja de píldoras de soldado.
- **Dárselas:** la batalla final empieza con −25 % de chakra. *Después:* «aldea salvada»; si compartisteis en D1, la jefa de los genin es Hana, jonin en el epílogo.
- **Quedároslas:** todo el chakra. *Después:* la línea se rompe, «aldea quemada», PNJ conocidos en el memorial y −1 con todos los clanes.

### A.4 Cómo se decidirían en cada modo

Las reglas son las de 3.5; aquí solo se ve cómo encajan con estas decisiones.

**Solo.** Decides tú, pero antes cada aliado muestra su postura (a favor, en contra o con dudas) según su convicción. Cada personaje cuya convicción vaya contra lo elegido recibe +1 Tensión.

**Local y en línea: la Balanza** (como en Triangle Strategy):
1. **Debate.** Cada jugador puede gastar un argumento para cambiar la postura de un aliado de la IA: Persuasión (d20 + CAR + competencia si la tiene) contra CD 10, 15 o 20 según su convicción (3.5). Idea para la historia: que también se pueda convencer así a un anciano de clan presente en la escena (un PNJ con su propia convicción). A un jugador no se le tiran dados: se le convence hablando.
2. **Voto secreto.** Solo votan los jugadores, una vez cada uno aunque lleve varios ninjas. En local, uno por uno tras la pantalla tapada; en línea, todos a la vez, con 60 s. Los aliados de la IA (y los demás ninjas de cada jugador) no votan: muestran su postura.
3. **Resultado.** Gana la mayoría de los jugadores. Si hay empate, gana, entre las opciones empatadas, la que tenga más aliados de la IA a favor; si sigue, decide el líder de la misión, que se eligió en la aldea al formar el equipo.

**Quien queda en desacuerdo:**
- Como en 3.5: +1 Tensión a cada personaje cuya convicción vaya contra lo elegido, haya votado o no. Si eliges la c de la pregunta 17, además −1 de Lazo con el líder.
- *Ideas extra, aún no están en las reglas:*
  - Ficha **«Te lo dije»** para quien votó en contra: si la decisión sale mal, la cambia por Inspiración (ventaja en una tirada, como en 5e) y −2 Tensión.
  - **Desobedecer en secreto** con lo suyo (dar su ración a los refugiados). Se descubre en la Crónica (H4).
  - **Veto:** nadie decide el destino de tu personaje sin ti (H3).

### A.5 Que la muerte pese

En GWBW los muertos volvían y reiniciar borraba los errores. Aquí, siguiendo las reglas de la sección 2:
- **Sin bucle.** Los muertos no vuelven. Si todo el grupo cae en una batalla, en Historia y Normal se repite desde la entrada de ese nodo (2.1); en la emboscada nocturna, el grupo despierta con «Secuelas de caída» y pierde la mitad de los suministros (2.8). En Leyenda, los caídos tiran sus salvaciones de muerte (2.8). Cargar para cambiar una decisión solo se puede en Historia y Normal (pregunta 7).
- **Caer no es morir.** A 0 PG hay salvaciones de muerte. Al levantarse queda «Secuelas de caída», y si cayó por un crítico, «Herida grave» (2.12). Un ninja del jugador solo muere de verdad en Leyenda (pregunta 6) o, si así lo eliges en H2, por una decisión de historia. Los PNJ sí pueden morir por una decisión en cualquier modo.
- **La Tensión nunca mata** (2.9): puede llevar a un Quiebre, no a la muerte.
- **Cicatrices** permanentes con un lado bueno y otro malo, visibles en el sprite (venda, parche, brazo sellado).
- **Memorial** en la aldea y un hueco junto al fuego en el campamento siguiente.
- **Reemplazos con historia:** la hermana del caído, el rival perdonado, un Taki rescatado. Llegan con opinión («dejasteis morir a mi hermano») y con el Lazo a 0 con todos.
- **La trama se apoya en PNJ**, no en tus ninjas: una muerte cambia frases, no bloquea la campaña.
- **Si muere todo el grupo en Leyenda**, lo decide la pregunta 21; la idea recomendada es que el clan mande un escuadrón de relevo.

### A.6 Preguntas para la sesión de historia

No hace falta responderlas ahora. Formato: "H1b H2b…". ★ marca mi recomendación. (Cuándo se ve quién votó qué ya está decidido en 3.5: al momento, sobre el retrato de cada jugador, y después en la Crónica.)

- **H1. ¿Cuántos finales?**
  - a) 3.
  - b) 4, con epílogo por diapositivas. ★
  - c) 6 o más.
- **H2. ¿Puede una decisión de historia matar a un ninja del jugador?** (La muerte en batalla la decide la pregunta 6.)
  - a) Sí, en todos los modos.
  - b) Solo en Leyenda; en Historia y Normal deja secuelas y una cicatriz grave. ★
  - c) Nunca; solo cicatrices.
- **H3. ¿Puede el grupo decidir el destino del personaje de otro jugador?**
  - a) Sí, manda el voto.
  - b) Solo si su dueño acepta. ★
- **H4. ¿Se puede desobedecer en secreto?**
  - a) No.
  - b) Sí, solo con lo tuyo (tu ración, tu chakra). ★
  - c) Sí, incluso sabotear al grupo.
- **H5. ¿Cómo se ve la reputación de los clanes?**
  - a) Con números.
  - b) Solo por cómo reacciona el mundo.
  - c) Emblema con 5 niveles, más las reacciones del mundo. ★
