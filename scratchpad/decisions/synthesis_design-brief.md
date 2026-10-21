# Shinobi 5e Chronicles: escenas de decisión, campamentos y trampas

*Propuesta de diseño basada en Gods Will Be Watching (GWBW) y Darkest Dungeon (DD). Los números de los juegos originales vienen de wikis y guías de fans, así que son aproximados.*

---

## 1. Qué hace cada juego

### Gods Will Be Watching (2014)

Cada capítulo es una crisis distinta que ocurre en una sola pantalla. Hay un objetivo, un reloj que no se detiene y varios medidores que se quitan recursos unos a otros.

**Lo que vale la pena copiar:**
- **Presupuesto fijo de acciones.**
  - El campamento del capítulo 4 da 5 acciones por día. Cada una puede ir a reparar la radio, cazar, cocinar, mantener el fuego o animar al grupo.
  - Ser amable cuesta progreso. Si das una charla de ánimo, ese día no reparas la radio.
- **Acciones gratis y acciones con coste.** Preguntar y observar no gastan nada. Actuar gasta un turno y hace avanzar todos los medidores. Hay que explicarlo en pantalla, porque GWBW no lo explicaba y los jugadores se quejaron.
- **Medidores de doble filo.**
  - En el capítulo 1, un rehén demasiado tranquilo intenta huir y uno demasiado asustado ataca.
  - Así no sirve repetir siempre la misma acción.
- **Porcentajes visibles antes de arriesgar.** Mentir tenía un 10 % de éxito; la mejora del hackeo, un 80 %.
- **Las personas como recurso.**
  - Cambiar un rehén por tiempo.
  - Usar a un compañero para probar una vacuna.
  - Abandonar al soldado cojo que frena la marcha.
  - Las opciones crueles son eficaces. Eso es lo que provoca la culpa.
- **Elegir 1 de 3.** Cada noche del capítulo 2, un aliado traía una sola cosa: analgésicos, medicina o información.

**Lo que hay que evitar:**
- **Azar que borra una hora de partida.** Una ruleta rusa fallida reiniciaba el capítulo entero, porque no había puntos de control. Fue la queja principal. El propio estudio añadió después modos sin azar.
- **Muertes sin peso.** Los muertos volvían en el capítulo siguiente, así que perder a alguien no dolía.

### Darkest Dungeon (1 y 2)

**Lo que vale la pena copiar:**
- **El campamento como dilema, no como curación gratis.**
  - Acampar gasta 1 leña.
  - Se elige un nivel de comida: Ayuno, Media, Completa o Festín. El Festín cura un 25 % y quita estrés.
  - Después se reparten 12 puntos de Respiro entre habilidades propias de cada clase, que cuestan de 1 a 5 puntos.
- **Emboscada nocturna con contramedida.**
  - Hay un 33 % fijo de emboscada.
  - Ciertas habilidades la anulan, pero cuestan 3–4 de los 12 puntos. Proteger el sueño sale caro.
- **Buffs de campamento que duran 4 batallas,** y beneficios de objetos que duran hasta el siguiente campamento. Son duraciones fáciles de prever.
- **Trampas reveladas al explorar.**
  - Si la trampa está revelada, se puede desactivar con Resistencia a trampas + 40 %.
  - Si no, te golpea: daño, estrés y un efecto según la zona (sangrado, veneno, lentitud).
- **Curiosidades: el objeto correcto da un resultado garantizado.** Agua bendita en un altar, por ejemplo. Preparar el viaje siempre tiene premio.
- **Estrés visible con prueba de voluntad.** Al llegar a 100, el héroe sufre una Aflicción o gana una Virtud.
- **Al borde de la muerte.** A 0 PG el héroe sigue vivo, y cada golpe obliga a tirar para resistir.

**Lo que hay que evitar:**
- **Grind de aldea** para quitar estrés pagando oro semana tras semana.
- **Aflicciones con un 75 % de probabilidad y sin contrajuego.**
- **Espirales,** donde un héroe afligido estresa a todo el grupo.
- **Gastar puntos de Respiro en habilidades que el héroe rechaza.**
- **Ataques al corazón.** Fueron tan impopulares que el estudio permitió desactivarlos.

---

## 2. Propuesta para Shinobi

### Cómo fluye una misión

**Aldea → Mapa de ruta → Eventos (trampas, curiosidades, escenas de crisis, batallas) → Campamento → … → Objetivo → Crónica de la misión**

- **Aldea.**
  - Se elige el equipo (1–4 ninjas).
  - Se compran suministros: raciones, kits de acampada, vendas, antídotos, píldoras de soldado y sellos explosivos.
  - El espacio en la mochila es limitado.
- **Mapa de ruta.**
  - Es un camino con bifurcaciones de 4–6 nodos, al estilo de DD2. Cada nodo muestra su tipo y su peligro.
  - Muchas misiones tienen un plazo en horas, como la marcha por el desierto de GWBW. Cada tramo gasta horas, y descansar también.
- **Punto de control** al empezar cada escena y cada campamento. Nunca se reinicia una misión entera.
- **Crónica de la misión,** al final: quién vivió, qué se gastó y qué decisiones se tomaron. Más adelante puede mostrar qué porcentaje de jugadores eligió lo mismo.

### a) Escenas de crisis (al estilo GWBW)

**Reglas comunes:**
- La escena dura de 8 a 12 turnos.
- Hay una barra de objetivo y 2–3 medidores de fallo, y uno de ellos es de doble filo.
- Las acciones **verdes** son gratis: observar, preguntar, leer el ambiente.
- Las acciones **naranjas** cuestan un turno y hacen avanzar el reloj.
- **Tiradas d20 con las estadísticas del ninja.**
  - Se tira d20 + modificador + competencia contra una CD.
  - El porcentaje de éxito se muestra antes de tirar.
  - Las tiradas usan el `DiceRollModal` actual.
- **Rasgos de clan y de clase como ventajas reales:**
  - Mirai tiene ventaja contra genjutsu.
  - El Byakugan de Taki revela medidores ocultos.
  - Uddo puede transferir chakra.
  - Akkai sella.
- **Fallar no termina la partida.** La historia sigue, con una consecuencia.

| Escena | Medidores | Acciones clave | Dilema |
|---|---|---|---|
| **La casa de té.** Un renegado retiene al hijo del daimyo y a 3 civiles. | **Nervios del captor** (doble filo: muy bajos y huye por la ventana con el niño; muy altos y mata a un rehén). **Llegada de la guardia** (reloj de 8 turnos). **Miedo de cada rehén**, que se lee en su postura. | Persuadir (CAR). Intimidar (CAR). Genjutsu (CAR contra la SAB del captor). Observar con Byakugan (gratis: muestra el número exacto). Preparar un tiro (DES). | Entregar al prisionero que escoltáis (perdéis la recompensa) o dejar que muera un civil. |
| **Interrogatorio en el puesto.** Un espía capturado. | **Voluntad del espía** (a 0 revela 3 secretos). **Salud del espía** (si llega a 0, muere callado). **Alarma** del campamento enemigo cercano. | Preguntar (gratis). Persuadir. Amenazar (rápido, pero sube la alarma). Genjutsu (cuesta chakra, sin daño). Curarle (sube su salud y también su voluntad). Ofrecerle libertad. | Torturar funciona. Cuesta Tensión al grupo y marca la reputación con "Crueldad". Si lo liberas, puede volver en otra misión como aliado o como traidor. |
| **Ventisca en el paso.** Escolta de un cliente herido y un porteador cojo. | **Calor del grupo.** **PG del cliente.** **Distancia al refugio.** **Horas de luz.** | Avanzar (el grupo va a la velocidad del más lento). Cargar al cliente (+1 Agotamiento para quien lo carga). Hoguera Katon (gasta chakra en vez de leña). Refugio de madera Uddo. Buscar paso (SAB, Supervivencia). | Dejar atrás al porteador duplica el avance, pero sube la Tensión y baja los lazos del grupo. |
| **Sostener la puerta.** Un Akkai rompe un sello de 5 capas mientras llegan oleadas de enemigos. | **Progreso del sello.** **Integridad de la puerta.** **Chakra del sellador.** | Sellar (INT). Reforzar con Doton (FUE). Salir a combatir (una batalla corta). Clones de sombra (compran turnos con chakra). Transferir chakra (Uddo). | El "Sello de sangre" duplica el progreso, pero deja al sellador con −PG máximos para siempre (una cicatriz). |

**Las consecuencias duran.** Quedan registradas como cicatrices, traumas y reputación de clan, y también qué personajes no jugadores (PNJ) están vivos o muertos. Mueven diálogos, precios, aliados y misiones futuras.

### b) Campamentos (DD adaptado a 5e)

**Descanso corto** ("Alto en el camino", 1 hora, no gasta kit):
- Cada ninja gasta **Dados de Golpe**. Cada dado devuelve dado + CON en PG, usando el `hitDie` de su clase.
- También gasta **Dados de Chakra**. Cada dado devuelve dado + modificador de lanzamiento, usando el `chakraDie`.
- Se tienen tantos dados de cada tipo como el nivel del personaje.
- Cada ninja hace 1 actividad.

**Descanso largo** (la noche, gasta 1 kit de acampada):
- **Presupuesto de incienso.** Cada ninja tiene **3 varitas de incienso**, que se ven arder en pantalla. Cada actividad cuesta 1–3.
- **Qué se recupera:**
  - Base: el 50 % de los PG y el 50 % del chakra, más la mitad de los dados gastados.
  - La comida y las actividades suben el resto.
  - El 100 % solo se recupera en la aldea.
- **Qué caduca:** los efectos que duran "hasta el descanso".

**Comida** (se decide en grupo):

| Nivel | Coste | Efecto |
|---|---|---|
| Sin comer | 0 | +1 Agotamiento, +2 Tensión |
| Ración seca | 1 por ninja | Sin penalización |
| Comida caliente | 1 por ninja + fuego | +1 Dado de Golpe gratis, −1 Tensión |
| Festín | Requiere caza o pesca | +5 PG temporales en la siguiente batalla, −2 Tensión, buff "Bien alimentado" |

**El fuego** es otro dilema, como en GWBW:
- Un fuego grande da +10 % de emboscada y mejora la comida y el ánimo.
- Sin fuego hay −10 % de emboscada, pero la comida es fría y sube la Tensión.

**Actividades:**

| Actividad | Coste | Efecto |
|---|---|---|
| Cocinar o cazar | 1–2 | Prueba de Supervivencia (SAB) para conseguir comida |
| Vendar | 1 | 1d8 + SAB, quita Sangrando |
| Meditar | 2 | +25 % de chakra |
| Afilar hojas | 1 | +2 de daño con arma durante 3 batallas |
| Poner trampas en el perímetro | 2 | Si hay emboscada, los enemigos empiezan dañados |
| Hacer guardia | 2 | El % de emboscada baja a la mitad |
| Explorar | 2 | Revela las trampas de la siguiente zona |
| Rezar en un santuario | 1 | Solo si hay santuario; −2 Tensión |
| Entrenar un jutsu | 2 | El primer jutsu de cada batalla cuesta −3 de chakra |
| Charla junto al fuego | 1 | −1 Tensión a otro ninja y +1 de Lazo |

**Actividades exclusivas:**

| Grupo | Actividades |
|---|---|
| Mirai | **Lectura del Sharingan:** revela trampas de genjutsu y PNJ disfrazados. **Fuego Katon:** hace fuego sin leña. |
| Uddo | **Refugio de madera:** −15 % de emboscada y protege del clima. **Vitalidad compartida:** da PG propios a un aliado. |
| Akkai | **Barrera de sellos:** −20 %; se paga con chakra, no con incienso. **Sellar veneno:** quita Envenenado o una maldición. |
| Taki | **Guardia del Byakugan:** emboscada al 0 %. **Cerrar tenketsu:** detiene sangrados. |
| Médico | **Cirugía de campaña:** prueba de SAB; quita Herida grave, y si falla, cicatriz. **Preparar píldoras.** |
| Taijutsu | **Estiramientos:** −1 Agotamiento. |
| Genjutsu | **Sueño apacible:** −3 Tensión. **Ilusión de campamento:** −15 %. |
| Bukijutsu | **Fabricar sellos explosivos y alambre.** |
| Ninjutsu | **Meditación elemental:** +chakra y resistencia a un elemento hasta el siguiente descanso. |

**Emboscada nocturna:**
- Cada zona tiene un % base visible, por ejemplo 30 %.
- Si hay emboscada, empieza una batalla nocturna.
- Si nadie hacía guardia, el grupo empieza **sorprendido**.
- Un descanso interrumpido da solo la mitad de la recuperación. Nunca es un game over.

**Tensión** (lo recomiendo):
- Es una escala de **0–10 por ninja**, siempre visible.
- **La suben:** recibir un crítico, que caiga un aliado, una trampa, el hambre, las decisiones crueles y la noche sin fuego.
- **La bajan:** la comida, las charlas, las victorias y los críticos propios.
- **Al llegar a 10** se hace una salvación de SAB con CD 12:
  - Si falla: **Quiebre** (Pánico, Paranoia, Ira ciega o Desesperanza) hasta la aldea.
  - Si pasa: **Despertar**, por ejemplo "Voluntad de Fuego".
  - Después la Tensión vuelve a 5.

**Agotamiento** (5e 2024):
- Es el lado físico, separado de la Tensión.
- **Lo causan:** el hambre, el frío, la marcha forzada y abusar de las píldoras de soldado.
- **Efecto:** −2 a las tiradas d20 y −1,5 m de velocidad por cada nivel.
- En el nivel 6, el ninja queda **caído** (o muerto, en modo Leyenda).
- Se quita 1 nivel por cada descanso largo con comida.

**Chakra:**
- **En batalla:**
  - No se regenera solo; Uddo mantiene su +2 por ronda.
  - Nueva acción **"Concentrar chakra":** recupera 1d6 + modificador de lanzamiento, pero da ventaja a los ataques contra ti hasta tu siguiente turno.
  - **Píldora de soldado** (acción adicional): +2d6 de chakra; al terminar la batalla deja el efecto "Bajón".
- **Descanso corto:** Dados de Chakra.
- **Descanso largo en el campo:** 50 % + meditación.
- **Aldea:** 100 %.

### c) Trampas y curiosidades en el camino

**Cómo funcionan las trampas:**
- **Detectar:** con Percepción pasiva, o con Investigación si se busca activamente, contra la CD de la trampa.
  - Explorar revela las trampas de la zona.
  - El Byakugan da ventaja.
  - El Sharingan ve los sellos de genjutsu sin tirar.
- **Al detectarla** se ven su CD y el % de éxito de cada opción:
  - **Desactivar** (DES + herramientas ninja). Si sale bien: −1 Tensión, y te quedas el material.
  - **Activarla a distancia** (con un kunai). No hace daño, pero sube la alerta.
  - **Rodearla.** Cuesta horas.
  - **Lanzar un clon.** Cuesta chakra.

**Lista de trampas:**

| Trampa | Efecto |
|---|---|
| Sello explosivo | 3d6 de fuego, salvación de DES. El ruido delata al grupo. |
| Trampa de alambre | Lluvia de kunais, 2d6 + Sangrando |
| Sello de genjutsu | Salvación de SAB, o "Perdido": −2 horas dando vueltas |
| Agujas envenenadas | 1d4 + Envenenado hasta el descanso |
| Foso con estacas | 2d6 + Pierna herida |
| Sello de drenaje | −2d6 de chakra |
| Campana de alarma | Sin daño, pero la siguiente batalla empieza sin fase de sigilo |
| Arena movediza Doton | Apresado |

**Curiosidades:**
- **Santuario Inari.**
  - Ofrecer una ración da una bendición.
  - Rezar da −2 Tensión.
  - Profanarlo da botín y una maldición.
- **Campamento abandonado.** Buscar (Investigación) da suministros, aunque puede esconder una trampa.
- **Desconocido herido.**
  - Ayudarle cuesta vendas y tiempo.
  - Puede ser un espía; el Sharingan o el Byakugan lo revelan.
  - Ignorarle da +1 Tensión a los ninjas nobles.
- **Cadáver de shinobi.** Puede tener pergaminos y sellos.
- **Fuente termal.** Descanso corto gratis.
- **Cofre sellado.** Un Akkai lo abre sin riesgo.
- **Regla de DD:** usar el objeto correcto da un resultado garantizado. Siempre hay una pista en pantalla.

### d) Catálogo inicial de buffs y debuffs

Duraciones:
- **R:** rondas.
- **B:** batallas.
- **D:** hasta el siguiente descanso.
- **M:** hasta el fin de la misión.
- **P:** permanente.

**Buffs:**

| Buff | Duración | Efecto |
|---|---|---|
| Bien alimentado | D | +5 PG temporales al empezar cada batalla |
| Hoja afilada | 3B | +2 de daño con arma |
| Chakra centrado | D | El primer jutsu de cada batalla cuesta −3 |
| Guardia atenta | 1B | No puede ser sorprendido, +2 a iniciativa |
| Ojos abiertos | Zona | Trampas reveladas |
| Oculto en la niebla | 3R | Ventaja en Sigilo |
| Puertas abiertas | 2R | +2 de daño y +3 m; al terminar, +1 Agotamiento |
| Bendición del santuario | D | Ventaja en una salvación |
| Sello protector (Akkai) | D | Resistencia a un elemento |
| Piel de madera (Uddo) | 2B | +5 PG temporales |
| Píldora de soldado | Batalla | +2d6 de chakra |
| Lazo de camaradas | M | +1 CA junto a su compañero |
| Ánimo | D | −1 a toda la Tensión que reciba |
| Voluntad de Fuego (Despertar) | M | +2 a salvaciones, inmune al miedo |

**Debuffs:**

| Debuff | Duración | Efecto |
|---|---|---|
| Sangrando | R | 1d4 por ronda hasta que lo venden |
| Quemado | R | 1d6 por ronda; se apaga con agua o con una acción |
| Chakra sellado (crítico Taki) | 2R | Sin jutsus |
| Confundido (genjutsu) | R | 25 % de atacar a un objetivo al azar |
| Marcado | 3R | Visible aunque esté escondido |
| Envenenado | D | Desventaja en ataques y pruebas |
| Pierna herida | D | −3 m de velocidad |
| Entumecido (frío) | D | −2 a DES |
| Hambriento | Hasta comer | Desventaja en salvaciones de CON |
| Bajón | D | −2 a todas las tiradas |
| Fiebre | Hasta tratarla | No recupera PG al descansar |
| Secuelas de caída | M | −2 CA y salvaciones de muerte con desventaja |
| Maldición del santuario | M | −1 a todas las salvaciones |
| Quiebre | M | Pánico, Paranoia, Ira ciega o Desesperanza |
| Herida grave | Hasta la aldea | −10 % de PG máximos; si se cura mal, deja una cicatriz (P) |

### e) En pantalla y en multijugador

**Campamento:**
- Escena lateral 2.5D de noche: el grupo sentado alrededor del fuego animado, con luciérnagas y tiendas.
- Arriba, las varitas de incienso ardiendo y el medidor **"Peligro nocturno"** (una luna con su %).
- Abajo, los retratos de los ninjas con barras de PG, chakra, Tensión y Agotamiento, y los iconos de sus efectos.
- Las actividades son cartas con el coste en incienso y una vista previa del resultado.

**Escena de crisis:**
- Un fondo pintado con los personajes en escena.
- Arriba, los medidores con números, salvo los ocultos, que se leen por la postura.
- Al hacer clic en una persona o un objeto aparece un menú verde o naranja con el % visible.
- El contador de turnos está en una esquina.

**Multijugador:**
- **Campamento:**
  - Cada jugador elige en secreto y a la vez las actividades de su ninja, con su propio incienso.
  - La comida, el fuego y las guardias se votan, con un temporizador de 30 s. El líder de la misión desempata.
  - La IA elige con reglas simples para los ninjas sin jugador; por ejemplo, cura a quien tiene menos del 50 % de PG.
- **Escenas de crisis:**
  - Cada jugador hace una acción por turno, en orden de iniciativa.
  - Las decisiones morales (ejecutar, abandonar, torturar) se votan. Quien vota en contra y pierde recibe +1 Tensión y −1 de Lazo.

### f) Dónde encaja en el código y qué hay que construir

**Bloqueos actuales:**
- `TacticalCombat.tsx` resetea los PG y el chakra en cada batalla (líneas 131 y 275).
- No devuelve resultados, y en derrota ni siquiera llama a `onBattleEnd`.
- Las condiciones no tienen duración.
- `bonusEffect` en `CampaignMode.tsx` es solo texto.
- No se guarda nada: no hay partidas guardadas.
- El combate aún usa una cuadrícula de 10×8, y no sigue el diseño acordado.

**Fases:**
1. **Estado persistente.**
   - `TacticalCombat` debe aceptar un `initialState` (PG, chakra, efectos) y devolver `onBattleEnd({victory, survivors, xp, loot})`.
   - Cambiar la unión cerrada `conditions` por un `StatusEffect {id, kind, mods, duration: rounds|battles|untilRest|mission|permanent}` guardado en el personaje.
   - Restar duraciones en `handleEndTurn`.
   - Tirar salvaciones de verdad.
   - Añadir la acción "Concentrar chakra" y el clima de noche.
2. **Reglas compartidas.**
   - `src/rules/derived.ts`: mover aquí `calculateDerived`, que hoy está dentro del creador.
   - `checks.ts`: d20 contra CD, usando `DiceRollModal`.
   - `effects.ts` y `rest.ts`.
   - Añadir a `ShinobiCharacter`: `hitDiceRemaining`, `chakraDiceRemaining`, `exhaustion`, `tension`, `effects`, `inventory`, `scars`.
3. **Campamento.**
   - `RestCamp.tsx`, reutilizando la ficha con sprite de `ArenaSandbox`.
   - `src/data/campActivities.ts`, basado en datos como el JSON de DD: `id`, `cost`, `target`, `requires {clan, class}`, `chance`, `effects[]`.
   - Nuevas poses de sprite: sentado, durmiendo y caído.
   - Usar el arte de tienda y fogata del encargo #44.
4. **Ruta, trampas y curiosidades.** `RouteMap.tsx`, `EventCard.tsx` y `src/data/traps.ts`.
5. **Escenas de crisis.**
   - `DecisionScene.tsx`, a partir del diseño de `CampaignMode`.
   - `src/types/mission.ts` con `MissionDef`, `SceneDef`, `Meter`, `SceneAction` y `Effect` tipado (por ejemplo `{type:'chakra', delta}`, `{type:'flag'}`, `{type:'battle'}`).
   - Un `EncounterDef` único que sustituya la forma que hoy se repite en 4 archivos.
6. **`MissionRunner.tsx`.**
   - Máquina de estados: ruta → escena → batalla → campamento.
   - Nueva vista `'mission'` en `App.tsx`, con una plantilla de ninjas en vez de un solo `character`.
   - `src/utils/save.ts`: `localStorage` con try/catch, versión de esquema y exportación manual. Punto de control en cada escena y cada campamento.
7. **Multijugador y Gemini (opcional).**
   - Narración opcional con Gemini, siempre con texto escrito de reserva.
   - Gemini necesita un servidor propio para no exponer la clave.

---

## 3. Preguntas para el dueño

Responde con el formato "1b 2b 3a…". ★ marca mi recomendación.

1. **Tono.**
   - a) Aventura ligera; la muerte es rara.
   - b) Oscuro con esperanza: dilemas duros y muertes posibles, sin tortura explícita. ★
   - c) Muy oscuro, como GWBW.
2. **Muerte permanente de los ninjas del jugador.**
   - a) Nunca: caer da una Herida grave.
   - b) Solo en modo Leyenda. ★
   - c) Siempre, como en DD.
3. **Tensión (estrés mental).**
   - a) No: solo PG, chakra y Agotamiento.
   - b) Sí, visible de 0 a 10, con Quiebre o Despertar. ★
   - c) Sí, pero oculta (se lee en retratos y diálogos).
4. **Frecuencia de los descansos.**
   - a) Solo en la aldea.
   - b) 1–2 campamentos por misión, más altos cortos entre zonas. ★
   - c) Cuando el jugador quiera, limitado por los kits.
5. **Descanso largo en el campo.**
   - a) Regla de 5e: todo al 100 %.
   - b) 50 %, y la comida y las actividades suben el resto; el 100 % solo en la aldea. ★
   - c) Solo lo que den la comida y las actividades.
6. **Gestión de suministros.**
   - a) Ninguna.
   - b) Ligera: raciones, kits, vendas y píldoras compradas en la aldea, con mochila limitada. ★
   - c) Profunda: también agua, leña, munición y peso.
7. **Emboscadas nocturnas.**
   - a) Nunca.
   - b) Con % visible y siempre contrarrestables con guardia, barrera o Byakugan. ★
   - c) Aleatorias y ocultas.
8. **Chakra en batalla.**
   - a) Solo Uddo y las píldoras.
   - b) Acción "Concentrar chakra" + Uddo + píldoras. ★
   - c) +1 por ronda para todos (Uddo +3).
9. **Trampas.**
   - a) Siempre visibles.
   - b) Ocultas hasta superar la Percepción pasiva o explorar; después se ven la CD y los %. ★
   - c) Ocultas hasta que se activan.
10. **Medidores en las escenas de crisis.**
    - a) 1 de objetivo + 1 de fallo.
    - b) 1 de objetivo + 2–3 de fallo, uno de doble filo. ★
    - c) 4 o más (un puzzle complejo).
11. **Fallar una escena.**
    - a) Reiniciar la escena.
    - b) La historia sigue con una consecuencia, y se puede reintentar desde el último punto de control. ★
    - c) Game over y repetir la misión entera.
12. **Azar.**
    - a) Azar completo.
    - b) d20 con el % visible antes de tirar, más un modo "Puzzle" sin azar en las escenas. ★
    - c) Escenas totalmente deterministas.
13. **Modos de dificultad.**
    - a) Uno solo.
    - b) Historia / Normal / Leyenda (muerte permanente y un solo guardado). ★
    - c) Los modos de GWBW: Original / Puzzle / Narrativo.
14. **Quién decide en multijugador.**
    - a) El líder lo decide todo.
    - b) Cada uno elige las actividades de su ninja; lo de grupo se vota y el líder desempata. ★
    - c) Votación unánime.
    - d) Se turnan.
15. **Duración de una misión.**
    - a) 10–15 min.
    - b) 30–45 min: 4–6 nodos y 1 campamento. ★
    - c) 60–90 min, de varios días.
16. **Qué persiste entre misiones.**
    - a) Nada.
    - b) Cicatrices, traumas, reputación de clan y qué PNJ están vivos o muertos. ★
    - c) Todo lo anterior, más las heridas y enfermedades sin curar.
17. **Opciones crueles** (torturar, abandonar al porteador).
    - a) No existen.
    - b) Existen, son eficaces y cuestan Tensión, lazos y reputación. ★
    - c) Existen sin coste extra.
18. **Narrativa.**
    - a) Todo escrito a mano.
    - b) Escrita a mano, con Gemini opcional para variar los diálogos del campamento y texto fijo de reserva. ★
    - c) Generada por Gemini.