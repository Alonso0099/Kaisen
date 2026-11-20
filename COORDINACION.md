# 🤝 Coordinación: Claude ⇄ GPT

Este archivo es el tablero compartido. **Alonso** es el puente: copia la sección que toque al otro asistente y pega aquí (o en el chat de Claude) la respuesta.

- **Claude** se encarga del código: lógica, pantallas, integración del arte, pruebas y publicación.
- **GPT** se encarga del arte y los textos de mundo: ilustraciones, nombres e historia.
- Las especificaciones técnicas del arte están en **[ARTE.md](ARTE.md)**. GPT debe seguirlas.

## Cómo se pasa el trabajo

1. Cada pedido tiene un código (`A-01`, `T-01`…) para que no se pierda entre chats.
2. **Arte terminado →** Alonso lo sube a la carpeta indicada en GitHub (*Add file → Upload files*) o se lo manda a Claude por chat. Claude lo normaliza (recorte, alineado por los pies, WebP), lo integra y marca el pedido como ✅.
3. **Textos (nombres, frases, historia) →** se pegan en el chat de Claude con su código.
4. **GPT necesita algo de Claude →** se anota en su sección con un código `G-xx` y Alonso lo pasa.

---

## Claude necesita de GPT

Prioridad de arriba hacia abajo. Tamaños y nombres según ARTE.md.

| Código | Qué | Archivos | Estado |
|---|---|---|---|
| A-01 | **Astrid**, guardiana de Fuerza, forma 1 | `art/guardians/fuerza-1.webp` | ✅ |
| A-02 | Forma 1 de los otros 5 guardianes, **con su nombre** | `art/guardians/{resistencia,intelecto,sabiduria,vinculo,hogar}-1.webp` | ✅ |
| A-03 | 6 mundos (paisaje vertical, centro inferior despejado) | `art/worlds/{atardecer,bosque,montana,islas,ciudadela,cosmos}.webp` | ✅ |
| A-04 | 6 jefes actuales en tu estilo (reemplazan los temporales) | `art/bosses/{pereza,procrastinacion,desorden,estres,distraccion,soledad}.webp` | ✅ |
| A-05 | Mascota inicial: 6 etapas (0 = huevo … 5 = forma final) | `art/pets/chispa-{0..5}.webp` | ✅ |
| A-06 | 6 emblemas de stats (circulares) | `art/stats/<stat>.webp` | ✅ |
| A-07 | 18 insignias de logros | `art/badges/<id-logro>.webp` | ✅ |
| A-08 | Más personajes jugables (las clases que quieras) | `art/chars/<id>.webp` | ✅ |
| A-09 | Formas 2–5 de los guardianes | `art/guardians/<stat>-{2..5}.webp` | ✅ |
| A-10 | 8 huevos y las otras 7 especies de mascota | `art/eggs/…`, `art/pets/…` | ✅ |
| T-01 | Para cada **jefe nuevo** (hasta 4 más): nombre, a qué miedo o mal hábito representa, frase de burla, stat débil y reto de resistencia | texto | ✅ |
| T-02 | Nombres de guardianes (Skadi, Runa, Véra, Eira, Liv) y especies (Céfiro, Marea, Pedernal, Trueno, Nival, Alba, Umbra) | texto | ✅ |
| T-03 | Una frase corta de cada guardián al evolucionar | texto | ✅ |
| A-11 | 19 íconos de piezas de equipo (lista con ids en ARTE.md → Equipo) | `art/items/<id>.webp` | ✅ |
| A-12 | Ilustraciones de los 4 jefes de T-01 (mismo estilo y tamaño que A-04). Al llegar entran en la rotación desde el mes siguiente | `art/bosses/{multitarea,perfeccionismo,inercia,desvelo}.webp` | ✅ |
| A-13 | (opcional) 4 piezas épicas de botín para esos jefes: nombre, espacio, stat e ícono 512×512 | `art/items/<id>.webp` + texto | ✅ |
| A-14 | 12 héroes nuevos: 6 arquetipos × 2 looks (ver sección A-14 abajo) | `art/chars/<arquetipo>-{m,f}.webp` | ✅ |
| T-04 | Frases del día (ver sección T-04 abajo) y nombres en inglés | texto | ✅ |
| T-05 | (opcional) Revisar la traducción al inglés de las frases (héroes, guardianas, burlas, vuelta y frases de evolución) en `js/phrases.js` y `js/i18n.js` | texto | ⏳ |

**Reglas que hacen que todo encaje:** fondo transparente (salvo los mundos), lienzo 720×1000 con los pies en el borde inferior para las figuras de pie, mismo estilo en toda la serie (adjuntar una imagen anterior como referencia) y sin texto dentro de las imágenes.

## A-14 · Héroes que enganchen (entregado)

**Integrado el 2026-11-19** con los nombres de la entrega: Gladiador/a de Bronce (`titan`), Pirata del Cielo (`relampago`), Hechicero/a Astral (`estratega`), Druida de Espinas (`sabio`), Forjador/a de Almas (`guardian`; antes «de Runas», renombrado por Alonso: cualidad «Carácter y cuidado», frase «Lo que promete, lo cumple. Lo que se rompe, lo repara.») y Ninja de la Luna (`implacable`). Selector en dos pasos («Elige tu héroe» → «Elige tu look»), misma XP con cualquier héroe y migración de los personajes anteriores. **Referencia de acabado para el arte que siga: Pirata del Cielo.**

*Encargo original (histórico):*

**Problema:** los personajes actuales tienen oficios (cartógrafo, tejedora…) que no dicen nada sobre la persona que los elige. La gente quiere verse **disciplinada, fuerte, rápida, enfocada**. Cada héroe tiene que representar una **cualidad que el jugador quiere tener**, y verse "qué chiva" sin exagerar.

**Seis arquetipos, dos looks cada uno (hombre y mujer) = 12 sprites.** Los nombres y frases ya están en la app (provisionales sobre el arte actual); GPT puede proponer mejoras.

| Id del archivo | Héroe | Cualidad | Frase en la app | Idea visual (un rasgo que lo identifique) |
|---|---|---|---|---|
| `titan-m`, `titan-f` | Titán | Fuerza imparable | «No espera tener ganas: se pone en marcha y cada día es un poco más fuerte.» | Complexión fuerte, guantes o vendas de entrenamiento, hombreras sencillas. Naranja cobre. |
| `relampago-m`, `relampago-f` | Relámpago | Rápida y ágil | «Arranca antes de pensarlo dos veces. Para ella, empezar ya es medio camino.» | Ropa ligera y técnica, bufanda o cinta que se mueve, detalles en zigzag. Turquesa eléctrico. |
| `estratega-m`, `estratega-f` | Estratega | Mente afilada | «Planea, aprende y va un paso adelante. Cada tarea es una jugada ganada.» | Capa corta, libreta o tablilla con runas, mirada aguda. Rojo vino y dorado. |
| `sabio-m`, `sabio-f` | Sabia / Sabio | Calma y enfoque | «Cuando todo es ruido, respira y elige con claridad. Nada la saca de su centro.» | Ropa sencilla y fluida, colgante o cuentas, postura serena. Lavanda. |
| `guardian-m`, `guardian-f` | Guardián / Guardiana | Corazón leal | «Su fuerza viene de los suyos. Protege, acompaña y nunca deja a nadie atrás.» | Escudo pequeño a la espalda, capa, gesto protector. Verde bosque. |
| `implacable-m`, `implacable-f` | Implacable | Disciplina de acero | «Hace lo que dijo que haría, aunque nadie lo vea. La constancia es su arma.» | Postura firme, ropa ajustada y ordenada, cinturón y vendas, cero adornos. Verde oscuro y acero. |

**Que se vean "qué chiva" pero no exagerado:**
- **Fantasía moderna:** ropa que alguien podría usar hoy (chaqueta técnica, botas o tenis, capucha) con toques de fantasía (runas, capa, metal). Así la gente se identifica.
- **Silueta clara** que se reconozca a 240 px de alto (el tamaño en Inicio): un color principal fuerte, un acento y **un solo objeto emblema** por arquetipo.
- **Pose segura** de pie, de frente o tres cuartos, con una expresión de determinación o una sonrisa leve.
- **Evitar:** armaduras enormes, armas gigantes, brillos o auras dibujados (la app los agrega), demasiados detalles y ropa sexualizada.
- **Diversidad** de tonos de piel, peinados y complexiones en el conjunto.
- **Mismo estilo** que Astrid y las guardianas, que ya funcionan bien.

**Especificaciones:** WebP transparente de 720 × 1000 px, cuerpo completo, pies tocando el borde inferior (ver ARTE.md → "Personas de pie"). Archivos en `art/chars/<id>.webp`.

**Al recibirlos, Claude:** cambia el selector a "elige tu héroe y luego su look", y pasa a quien ya eligió un personaje al arquetipo equivalente (guardabosques → Guardián, exploradora → Relámpago, forjador → Titán, cartógrafo → Estratega, tejedora → Sabia, duelista → Implacable), así nadie pierde su elección.

## T-04 · Frases del día (entregado)

**Integrado el 2026-11-20:** frases de héroes, guardianas, burlas de jefes (alternan con su burla principal) y 3 variantes de vuelta en `js/phrases.js`; nombres en inglés en `js/names-en.js`, listos para el selector de idioma.

*Encargo original (histórico):*

La app ya muestra frases provisionales (en `js/phrases.js`). Pedimos la versión final, en español neutro con «tú», cortas (máximo ~90 caracteres) y sin culpa ni presión:

1. **Héroes:** 7 frases por héroe (6 héroes), con el tono de su cualidad. Las dice el héroe en Inicio, una por día. Ejemplo (Forjador/a de Almas, carácter y cuidado): «Si algo se rompió ayer, hoy lo reparamos.»
2. **Guardianas:** 6 frases por guardiana sobre el **propósito de su stat** (Astrid fuerza, Skadi resistencia, Runa intelecto, Véra sabiduría, Eira vínculo, Liv hogar y finanzas). Ejemplo (Véra): «Antes de responder, respira. La calma también es sabiduría.»
3. **Jefes:** 3 burlas más por jefe (10 jefes), en la voz del mal hábito que representan y con humor, no crueles. Ejemplo (Scrollax): «Solo cinco minutos de scroll…»
4. **Vuelta:** 3 variantes del mensaje «¡Volviste! Tu progreso sigue intacto.»

Formato: una lista por id (`titan`, `relampago`, `estratega`, `sabio`, `guardian`, `implacable`; stats; ids de jefes como en ARTE.md).

## GPT necesita de Claude

*(GPT anota aquí lo que necesite: capturas de una pantalla, colores, tamaños, cómo se verá algo, etc.)*

| Código | Qué | Estado |
|---|---|---|
| — | — | — |

**Datos útiles para GPT:**
- Paleta de la interfaz: fondo `#0b0918`, paneles `#14112a`, acento morado `#a99bff` / `#6c5ce7`, XP y monedas en dorado `#ffd23f`.
- Las figuras se ven sobre el mundo elegido, con sombra y brillo que pone la app; no hace falta dibujarlos.
- En Inicio el personaje se ve de cuerpo completo en unos 240 px de alto, así que debe leerse bien en pequeño: silueta clara y colores contrastados.

## Entregado

| Código | Qué | Fecha |
|---|---|---|
| — | Exploradora y Guardabosques (personajes jugables) | 2026-11-18 |
| A-01, A-02 | Guardianas forma 1: Astrid, Skadi, Runa, Véra, Eira, Liv | 2026-11-18 |
| A-03 | Seis mundos de Inicio | 2026-11-18 |
| A-04 | Seis jefes en estilo Kaizen | 2026-11-18 |
| T-02 | Nombres de guardianas y de las 8 especies | 2026-11-18 |
| A-05 | Dragón de Fuego: 6 etapas (especie `chispa`) | 2026-11-18 |
| A-06, A-07 | 6 emblemas de stats y 18 insignias de logros | 2026-11-18 |
| A-08 | Personajes Forjador, Cartógrafo, Tejedora y Duelista | 2026-11-18 |
| T-03 | Frases de evolución de las guardianas | 2026-11-19 |
| A-09 | Formas 2–5 de las seis guardianas (24 imágenes) | 2026-11-19 |
| — | Ícono aprobado: flecha dorada de fuego | 2026-11-19 |
| A-10 | 8 huevos y 42 etapas de las siete especies nuevas | 2026-11-19 |
| A-11 | 19 íconos de equipo | 2026-11-19 |
| T-01 | Textos de Multyra, Perfectus, Glacior y Noxveil | 2026-11-19 |
| A-12, A-13 | Ilustraciones de los 4 jefes nuevos y sus 4 piezas de botín (rotan desde diciembre 2026) | 2026-11-19 |
| A-14 | 12 héroes (6 × 2 looks) con selector en dos pasos; reemplazan a los personajes de A-08 | 2026-11-19 |
| T-04 | Frases del día (héroes, guardianas, jefes, vuelta) y nombres en inglés | 2026-11-20 |
