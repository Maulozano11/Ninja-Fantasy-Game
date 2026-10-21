## Sistema de cinemáticas y diálogos

*Esto diseña el sistema, no la historia. Lo que se cita de otros juegos sale de extractos de búsqueda web, porque no se pudieron abrir las páginas.*

### 1. Cómo se ve una escena

- **El mismo escenario que las batallas.** Fondo pintado, objetos del mundo en 16 bits a escala real y los personajes tal como el jugador los creó. No hay vídeos: todo se mueve dentro del juego, como en Chrono Trigger, Octopath Traveler o Sea of Stars.
- **Franjas negras** arriba y abajo mientras el jugador no controla nada.
- **Cámara:** sigue a quien habla, usa los zooms de batalla (1× y 2×) y un primer plano (4×) para las frases clave, tiembla con los golpes y se acerca despacio cuando llega la decisión.
- **Personajes:** entran caminando, se paran en marcas medidas en metros, se giran y cambian de pose.
- **Emotes:** globos de píxeles sobre la cabeza, cada uno con su sonido: **!**, **?**, **…**, gota de sudor, vena de enfado, corazón, nube gris y bombilla. A zoom normal la cara mide solo 12×10 píxeles, así que la emoción se lee en el globo y en el retrato.
- **Luz:** noche, atardecer, el resplandor de la fogata, relámpagos y fundidos, reutilizando la noche y el clima de las batallas.
- **Ilustración pintada** (imagen fija que la cámara recorre), solo cuando el sprite no alcanza: una escala enorme, un recuerdo o el instante clave de una gran decisión. Una o dos por misión, como máximo.
- **Antes de decidir, como en GWBW,** se puede tocar a un personaje o un objeto para preguntar u observar. Es gratis y puede desbloquear opciones, como los argumentos de Triangle Strategy.

### 2. Diálogo

- **Caja de texto** abajo, con el nombre de quien habla en el color de su clan y su **retrato**: los del grupo a la izquierda y los demás a la derecha.
- **Retratos sacados del propio sprite.** Se recortan la cabeza y los hombros y se amplían ×4. Así salen el pelo, los ojos y la bandana que eligió el jugador sin dibujar nada nuevo.
- **Texto que aparece letra a letra**, con velocidad ajustable y un pitido de voz por personaje (grave, medio o agudo). Hay Auto, Avance rápido (solo el texto ya leído), Saltar e Historial con las últimas 100 líneas. **Saltar siempre se detiene en la decisión.**
- **Cartas de elección:** de 2 a 4. Las bloqueadas salen en gris con el motivo, por ejemplo "Requiere Byakugan".
- **Temporizador, solo si la escena lo pide.** Es una mecha que se quema. Si se acaba, ocurre la opción que marcó el guionista, como en los juegos de Telltale. En Accesibilidad se puede alargar o quitar.
- **Tiradas d20:**
  - La carta muestra el **% de éxito antes de tirar**, como en GWBW.
  - Se usa el d20 rápido sobre el personaje; el `DiceRollModal` grande queda para las pruebas importantes.
  - Fallar abre otra rama, nunca un callejón sin salida.
- **"X lo recordará":** un aviso discreto con el retrato cuando una decisión cambia lo que un personaje piensa de ti. Las charlas junto al fuego del campamento usan este mismo sistema, como las conversaciones de apoyo de Fire Emblem.
- **Listo para traducir:** los textos van aparte del guion, uno por idioma, con huecos para nombres (`{lider}`) y para el género.

### 3. Lo que necesitan los sprites

- **Poses:** hoy hay 7 (quieto, sellos, ataque, lanzar, herido, victoria, cargar). **No existe "caminar"**, y es la primera que falta.
- **Cara:** es una plantilla fija de 12×10 píxeles. Cada expresión cambia unos pocos píxeles de ojos, cejas y boca, así que funciona con los 7 tipos de ojos y con cualquier personaje creado, en el escenario y en el retrato.

| Prioridad | Poses | Expresiones |
|---|---|---|
| **1 (mínimo)** | Caminar, hablar con gesto, brazos cruzados, sorprendido, triste, caído | Parpadeo, boca hablando, enfado, tristeza, sorpresa, sonrisa |
| **2** | Señalar, reverencia, arrodillado, sentado, dormido, risa | Ojos cerrados, mueca de dolor |
| **3** | Correr, mirar atrás, abrazar, llorar | Lágrimas, sonrojo, dojutsu que se activa |

Las poses sentado, dormido y caído también las usa el campamento.

### 4. El guion de una escena

Los guionistas escriben una orden por línea, y el juego la convierte en datos sin programar.

| Orden | Qué hace |
|---|---|
| `escena`, `fin` | Abrir la escena (fondo, luz, música) y cerrarla |
| `entra`, `mover`, `mira`, `pose` | Colocar, mover, girar y cambiar de pose a un personaje |
| `dice` | Una línea de diálogo, con la expresión entre paréntesis |
| `emote`, `camara`, `espera`, `fundido`, `musica`, `sonido` | Puesta en escena |
| `eleccion`, `opcion`, `prueba` | La decisión, sus cartas y sus tiradas d20 |
| `marca`, `si`, `ir a` | Recordar algo, preguntar por ello y saltar |
| `batalla`, `descanso`, `efecto` | Lanzar una batalla o un campamento y volver con el resultado, o aplicar un buff, un debuff o una curación |

Ejemplo con una escena de prueba neutral, que no es de la historia:

```
escena  prueba_cruce   fondo: bosque_rio   luz: atardecer   musica: calma
entra   LIDER  desde: izquierda  a: 6m
entra   GUIA   desde: derecha    a: 11m   mira: izquierda
camara  primer_plano GUIA
dice    GUIA (neutral)  "El camino se parte en dos. ¿Puente o vado?"
emote   LIDER  ?
eleccion  prueba.ruta   tiempo: no
  opcion  "Por el puente"                          -> final
  opcion  "Por el vado"   prueba: Atletismo CD 12  -> vado
#vado
  si exito:  dice LIDER (sonrisa) "Ni nos mojamos."
  si fallo:  efecto grupo Entumecido;  emote LIDER sudor
#final
  fundido negro;  fin
```

**Cómo recuerda el mundo:**
- Cada `eleccion` guarda sola lo elegido (`prueba.ruta = vado`).
- `marca` guarda lo demás: un sí o un no, un número (la confianza de un personaje no jugador, la reputación de un clan) o un texto. Puede durar la escena, la misión o la campaña.
- Una escena posterior pregunta `si prueba.ruta = vado` y cambia una línea, quién aparece, un precio o una batalla.
- **Pantalla Crónica.** Para cada misión muestra las decisiones tomadas:
  - qué se eligió y quién votó qué;
  - las consecuencias ya vistas ("→ se notó en la Misión 7");
  - las que faltan, como "Aún no ha dado frutos".

  Con el juego en línea podrá mostrar el % de jugadores que eligió lo mismo, como GWBW.
- **Listo para el juego en línea:** el servidor lee el guion, tira los dados con semilla y cuenta los votos. Cada pantalla solo lo anima, igual que en batalla.

### 5. Decisiones en los tres modos

Cada personaje tiene una **convicción**: unos valores que define el guionista. Cada opción dice a qué valores apela.

| Modo | Cómo se decide |
|---|---|
| **Solo** | Decides tú. Sobre cada carta salen los retratos de los aliados a favor, en contra o con dudas. Es un consejo, no un voto. |
| **Local** | Voto secreto: "Pasa el dispositivo a Jugador 2", con la pantalla tapada. La IA vota por los aliados sin jugador. Los votos se revelan a la vez sobre cada personaje y, si hay empate, decide el líder de la misión. |
| **En línea** | Todos votan a la vez, con 30–60 s. |

**Persuasión** (en local y en línea):
- Antes de cerrar el voto, cada jugador puede gastar **un argumento**. Algunos se desbloquean con lo averiguado en la misión.
- Tira CAR (Persuasión) contra la convicción del objetivo. Si gana, cambia el voto de un aliado de la IA o de un indeciso.
- A otro jugador solo le muestra el argumento; él decide si cambia su voto.
- Si alguien se desconecta, la IA vota por él.

**Quien vota en contra** no pierde nada como jugador. Su personaje dice una frase, y si la decisión va contra su convicción recibe un efecto del sistema de descanso (por ejemplo, +1 de Tensión). La Crónica guarda quién discrepó, y una escena futura puede darle la razón.

### 6. Guardado

- Se guarda solo **justo antes** de cada decisión y **justo después** de su consecuencia.
- **Historia y Normal:** se puede cargar y elegir otra cosa.
- **Leyenda:** una sola ranura, que se sobrescribe al votar. No hay vuelta atrás.
- **En línea:** guarda el servidor, y cargar requiere el acuerdo del grupo.
- La semilla de los dados va en el guardado, así que repetir una tirada da el mismo resultado.

### 7. Versión mínima y pulido posterior

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

### Preguntas para el dueño

Responde con el formato "1b 2a 3a…". ★ marca mi recomendación.

1. **Retratos.**
   - a) Solo los sacados del sprite.
   - b) Sacados del sprite para todos, y pintados a mano para los personajes no jugadores principales. ★
   - c) Sin retratos: solo sprites y emotes.
2. **Temporizador en las decisiones.**
   - a) Nunca.
   - b) Solo en escenas de presión, y se puede quitar en Accesibilidad. ★
   - c) En todas.
3. **Aviso "X lo recordará".**
   - a) Sí, discreto y con el retrato. ★
   - b) No; se descubre en la Crónica.
   - c) Nunca, para que sorprenda.
4. **Cómo decide el grupo en local y en línea.**
   - a) Por mayoría, y el líder desempata. ★
   - b) Decide el líder; los demás solo aconsejan.
   - c) Por unanimidad; si no la hay, otra ronda de debate.
5. **Persuasión.**
   - a) No hay.
   - b) Un argumento por jugador y decisión, con una tirada de CAR que solo cambia votos de la IA o de indecisos. ★
   - c) Igual, pero también puede cambiar el voto de otro jugador.
6. **Quien vota en contra.**
   - a) No le pasa nada.
   - b) Su personaje dice una frase y, si la decisión va contra su convicción, +1 de Tensión. ★
   - c) Lo de b, y además −1 de Lazo con el líder.
7. **Cargar una partida para cambiar una decisión.**
   - a) Siempre, en cualquier modo.
   - b) Sí en Historia y Normal, no en Leyenda, y la tirada sale igual al cargar. ★
   - c) Nunca.

*Fuentes (extractos de búsqueda):* [Triangle Strategy, Twinfinite](https://twinfinite.net/reviews/triangle-strategy-review/) · [Triangle Strategy, Gameranx](https://gameranx.com/features/id/291893/article/triangle-strategy-how-to-unlock-the-true-ending-path-best-choices-guide/) · [HD-2D, Wikipedia](https://en.wikipedia.org/wiki/HD-2D) · [Octopath Traveler II, Unreal Engine](https://www.unrealengine.com/developer-interviews/octopath-traveler-ii-builds-a-bigger-bolder-world-in-its-stunning-hd-2d-style) · [Telltale, Game Informer](https://www.gameinformer.com/b/features/archive/2015/02/03/why-your-choices-dont-matter-in-telltale-games.aspx) · [Darkest Dungeon, TechRaptor](https://techraptor.net/gaming/features/darkest-dungeon-narrator)
