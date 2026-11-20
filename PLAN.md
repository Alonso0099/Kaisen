# Plan de mejoras · Kaizen v2.5 y siguientes

> **Estado (2026-11-20):** v2.5.0 implementa la sección 1 completa, las tres mejoras recomendadas (2.1 Afinidad, volver sin castigo con 2.3 y la racha con gracia, 2.2 recompensas con reto + precio guía + XP por esfuerzo), el aviso con lo que avanzó en el RPG y las frases del día (héroe, guardianas y jefes). Pendiente: expedición, contadores y temporizadores, días programados, inglés, y fijar automáticamente un hábito nuevo.

Fecha: 2026-11-20. Este plan no cambia código todavía: sirve para decidir qué entra en la próxima versión.

**Regla fija (A-14):** una misma actividad da la misma XP con cualquier héroe y look. Nada de este plan depende del héroe elegido.

**Cómo se revisó:**
- **Probado:** recorrí Kaisen v2.4.1 en un iPhone 14 simulado (Playwright), adelantando el reloj.
- **Leído:** Levla y Pixelio no se pudieron instalar desde aquí. Lo que se dice de ellas sale de sus fichas oficiales (App Store, Google Play y sus sitios), no de usarlas.

---

## 1. Lo que sí hay que hacer (pedido de Alonso)

| # | Cambio | Qué resuelve | Cómo | Costo |
|---|---|---|---|---|
| 1 | **Kaisen → Kaizen** en la app y en el repo | 改善 *kaizen* es la palabra correcta («mejora continua»); *kaisen* no significa eso | Nombre visible, manifest, README y docs. Las claves internas de guardado (`kaisen-index`, `kaisen-p-…`) **se quedan igual** para no tocar el progreso de nadie. Los respaldos aceptan `kaisen` y `kaizen`. El repo lo renombra Alonso en GitHub (Settings → Rename); yo actualizo enlaces y rutas. | Bajo (horas) |
| 2 | **Significado de Kaizen** en la bienvenida y en un botón | Que el nombre explique la filosofía: mejorar un poco cada día | Una línea en el paso 1 («Kaizen: mejorar un poco cada día») y un botón «¿Qué es Kaizen?» en Ajustes y dentro del tour, con una explicación de 3 frases | Bajo |
| 3 | **Guía en cada sección y botón de tour** | Hoy hay que descubrir solo qué hace cada cosa | Un botón **?** en la cabecera de Inicio, Misiones, Tienda, Progreso y Ajustes, que abre una hoja con 3 puntos cortos. Un **tour** de 6–8 pasos que resalta cada parte de la pantalla; sale al terminar la bienvenida (se puede omitir) y se puede repetir desde Ajustes → «Ver tour». Funciona sin conexión. | Medio (1–2 días) |
| 4 | **Elegir primero «hombre o mujer»** | Al entrar solo se ven hombres y las mujeres creen que no hay heroínas | Primero «¿Cómo quieres que se vea tu héroe?» con dos tarjetas grandes del mismo tamaño, cada una con un mosaico de sus 6 héroes. Después salen los 6 héroes en ese look y con un toque queda elegido (el paso «Elige tu look» ya no hace falta). En Ajustes, un selector Hombre / Mujer arriba de la lista. Cambiar de look conserva el héroe y el progreso. | Bajo |

> **Riesgo del cambio de nombre del repo:** la dirección de GitHub Pages cambia de `/Kaisen/` a `/Kaizen/`. El progreso no se pierde (se guarda por dominio, y el dominio es el mismo), pero **el ícono ya instalado en el teléfono apunta a la dirección vieja**. Solución: después de renombrar, crear un repo pequeño llamado `Kaisen` cuya página solo redirige a `/Kaizen/`. Antes del cambio, exportar un respaldo por si acaso.

---

## 2. Ideas de Alonso para decidir

### 2.1 Guardianas que dan más XP y monedas (no está implementado)

**Revisado en el código:** hoy las guardianas solo cambian de forma. **No** dan XP ni monedas extra. Lo único que da % extra es el equipo.

**Propuesta («Afinidad»):** cada forma de la guardiana da un extra a las actividades de **su** stat:

| Forma | Nivel de la stat | Extra de XP (y de monedas, porque las monedas salen de la XP) |
|---|---|---|
| 1 | 1 | — |
| 2 | 5 | +5 % |
| 3 | 10 | +10 % |
| 4 | 20 | +15 % |
| 5 | 35 | +20 % |

- **Por qué funciona:** llegar a nivel 5 en una stat son unas 40 actividades de esa stat (unas 6 semanas a diario). Para entonces el hábito ya está formado, y el premio llega justo ahí: más monedas, recompensas más rápido.
- **Respeta A-14:** depende del nivel de la stat, no del héroe.
- **Implementación:** igual que el equipo. El extra se guarda en el registro (`guardXp`), así lo ya ganado no cambia aunque después cambie algo. Se muestra en el aviso: «+20 XP · +2 Afinidad de Runa».
- **Costo:** bajo (medio día) más pruebas de balance con la tienda.

### 2.2 Recompensas sin autosabotaje

**Problema:** el jugador pone el precio de sus recompensas (y la XP de sus actividades, de 5 a 50). Si las pone baratas, el juego deja de motivar.

**Propuestas:**
1. **Precio guía por tipo:** gratis 40–100, pequeño gusto 120–250, experiencia 300–600, inversión en ti desde 600. Si alguien baja de la guía, un aviso amable: «Una recompensa muy barata deja de sentirse ganada». No se bloquea.
2. **Recompensas con reto («qué chiva»):** al crear una recompensa grande se puede atar a un reto, además del precio. Ejemplos: «Desbloquea al derrotar al jefe del mes», «5 de 7 días con Leer», «Guardiana de Fuerza en forma 2». Hasta cumplirlo se ve con candado y una barra de avance. Es un compromiso que la persona se pone a sí misma, y es lo más fuerte contra el autosabotaje.
3. **XP por esfuerzo, no con deslizador:** al crear una actividad se elige *Fácil / Media / Difícil* (10 / 20 / 35 XP) en lugar de un número. Así no se infla.

**Costo:** 1 y 3 bajo; 2 medio (1–2 días).

### 2.3 El jefe que «ataca»

**Idea de Alonso:** si hoy no registraste nada contra el jefe, el jefe te ataca o te quita vida.

**Cuidado:** quitar vida o progreso al héroe (como hace Habitica) genera culpa y es la razón más común para abandonar. Levla lo evita a propósito: según su sitio, faltar nunca cuesta vida, oro ni equipo.

**Propuesta que mantiene la tensión sin castigar:**
- **El jefe se recupera.** Un día sin ningún golpe contra él (ni su stat débil ni su reto), recupera el 3 % de su vida. Como máximo el 15 % en el mes. **Nunca** se quita XP, monedas, niveles ni equipo.
- **Defensa:** cumplir el reto de resistencia del jefe (el ×3) te da **Defensa** para el día siguiente; ese día el jefe no puede recuperarse. Esto es lo único útil que vale la pena tomar de la «Defensa» de Levla, que allí es solo una recompensa de gremio.
- **Al volver:** «Scrollax recuperó 15 PV mientras no estabas. Hoy, *Sin redes después de las 9 pm* pega ×3». Es la invitación a volver.
- Se calcula todo desde el historial, como el resto del juego.
- **Costo:** bajo-medio (1 día).

---

## 3. Los cuatro recorridos (probado en Kaisen v2.4.1)

| Recorrido | Qué pasa hoy (probado) | Problema | Qué cambiar | Costo |
|---|---|---|---|---|
| **Crear un hábito** | Bienvenida con plantillas por área, o Ajustes → Crear: nombre, stat, XP de 5 a 50 y un bono opcional | La XP la decide el jugador (autosabotaje). No hay contador («8 vasos») ni temporizador («10 min»). No se puede elegir qué días toca. Un hábito recién creado **no aparece en los accesos rápidos** hasta usarlo o fijarlo con ★ | XP por esfuerzo (2.2.3). Fijar automáticamente el hábito nuevo si hay espacio libre. Contador y temporizador (sección 4) | Bajo (fijar) / Medio (contador) |
| **Completarlo** | Un toque → aviso «Leer 20 páginas · +20 XP · +14 🪙 · Logro: Primer paso» con **Deshacer** | Funciona bien. Falta decir qué avanzó en el RPG (la guardiana, el jefe) | Agregar al aviso una línea «Runa +20 · Scrollax −20 PV» | Bajo |
| **Volver después de faltar un día** | La racha pasa a **0** desde el primer día sin registrar (si no compraste escudos). La mascota dice «Te espera». El jefe no cambia. No hay ningún mensaje al volver | Perder la racha entera por un solo día es la parte que más desanima | **Racha con un día de gracia por semana**, automático y gratis (los escudos siguen sirviendo para más). Mensaje al volver: «Volviste. Tu progreso sigue intacto» más el aviso del jefe (2.3). Levla hace algo parecido: según sus notas, registrar tarde repara la racha del último día perdido | Bajo |
| **Usar ese progreso en el RPG** | La XP sube nivel, stat y guardiana, y daña al jefe; las monedas sirven en la tienda | Las guardianas no dan nada a cambio (2.1). Fuera del jefe del mes no hay nada que «hacer» con el progreso | Afinidad (2.1). Expedición semanal (sección 5) | Bajo / Medio |

---

## 4. Levla (según sus fichas, no probado)

- **Contadores y temporizadores:** Levla tiene hábitos de casilla, temporizador y contador. Para Kaizen tiene sentido en **lo básico** («Agua 0/8», «Meditar 10 min»): un hábito puede ser *de un toque*, *contador con meta* o *temporizador*, y da su XP al llegar a la meta. La XP no cambia; solo cambia cómo se registra. **Costo medio (1–2 días).**
- **Las actividades alimentan aventuras:** en Levla, completar hábitos da recursos (energía, XP, monedas) que pagan aventuras que corren solas de 1 a 8 horas. En Kaizen lo equivalente es la expedición de la sección 5, pero sin un recurso nuevo: usa la actividad de la semana.
- **Defensa:** en Levla es un bonus de reputación de gremio, no tiene que ver con los hábitos. Para el jefe mensual solo aporta la idea de la sección 2.3 (el reto te protege mañana).
- **Faltar un día:** en Levla faltar solo reinicia la racha de ese hábito; no se pierde vida, oro ni equipo, y se puede saltar o posponer un hábito. Coincide con la «racha con gracia» de la sección 3.

## 5. Pixelio (según sus fichas, no probado)

- **Programación semanal:** Pixelio permite repetir un hábito a diario, cada semana o en días concretos. En Kaizen serviría para «Gym lunes, miércoles y viernes»: los días que no toca **no rompen la racha** ni cuentan como faltas. **Costo medio.** Va bien junto con la racha con gracia.
- **Expediciones:** en Pixelio se mandan expediciones a seis regiones y hay una tienda semanal.

### Propuesta: «Expedición de la semana» (pequeña)

1. **El lunes eliges** una guardiana y una ruta en tu mundo actual (Atardecer, Bosque…). Esa es la decisión:
   - **Ruta segura:** necesita 3 actividades de la stat de esa guardiana en la semana. Premio: monedas.
   - **Ruta arriesgada:** necesita 5 actividades. Premio: un objeto de equipo o un huevo, más una postal del mundo.
2. **Durante la semana**, Inicio muestra a la guardiana en camino con una barra de avance (3/5).
3. **El domingo**, resultado visible: la guardiana vuelve con el botín, o con las manos vacías y una frase de ánimo si no se llegó (sin castigo). La postal se guarda en un álbum.

**XP:** la expedición no da XP extra por actividad (A-14 intacto); premia con monedas y objetos.

**Arte:** la primera versión reutiliza el mundo y la guardiana que ya existen. Después se pueden pedir a GPT 6 postales (una por mundo).

**Costo:** medio (2–3 días).

---

## 6. Español e inglés (plan)

- **Alcance pedido:** bienvenida, hábitos sugeridos, misiones y tarjetas para compartir. Después, el resto de pantallas.
- **Cómo:**
  - Diccionarios `js/i18n/es.js` y `js/i18n/en.js` con una función `t('clave', {vars})`.
  - El contenido (plantillas de hábitos, recompensas, misiones, jefes, guardianas, logros) se traduce por **id**.
  - El idioma se elige en Ajustes. La primera vez se toma el del teléfono.
- **Nombres personalizados:** una actividad o recompensa que el jugador **renombró** nunca se traduce. Las que siguen con el nombre de la plantilla se muestran en el idioma elegido. Para saber cuál es cuál se guarda un `tplId` y un `custom: true` al editar el nombre. Los nombres de héroe, mascota y perfil no se tocan.
- **Progreso:** el idioma es solo cómo se muestra. El historial guarda ids y XP, así que al cambiar de idioma no cambia ningún número.
- **Sin conexión:** los diccionarios son archivos estáticos que el service worker guarda en caché como el resto.
- **Tarjetas para compartir:** el texto del canvas usa `t()`. Fechas y números con `Intl` según el idioma.
- **Nombres del mundo en inglés:** ya entregados (T-04) en `js/names-en.js` (héroes, stats, jefes, especies y mundos). Kaizen no se traduce.
- **Costo:** alto. Hay unos 400 textos en la app. Fase 1 (alcance pedido): 2–3 días. Fase 2 (el resto): 2 días más.

---

## 7. Recomendación para la próxima versión

**v2.5: lo que pidió Alonso** (sección 1): Kaizen, su significado, guías y tour, y elegir hombre o mujer primero.

**Más un máximo de tres mejoras, en este orden:**
1. **Afinidad de guardianas** (2.1). Es barata, motiva a largo plazo y le da sentido a las guardianas.
2. **Volver sin castigo** (sección 3 + 2.3): racha con un día de gracia por semana, mensaje al volver y jefe que se recupera, con Defensa.
3. **Recompensas con reto** (2.2.2), junto con el precio guía y la XP por esfuerzo (2.2.1 y 2.2.3).

**Para después:** la expedición de la semana, los contadores y temporizadores, los días programados y el inglés. El inglés conviene cuando la app esté estable, para no traducir dos veces lo que todavía cambia.

Fuentes: [Levla](https://levla.app/) · [Levla: qué es](https://levla.app/about) · [Levla vs Habitica](https://levla.app/compare/levla-vs-habitica) · [Levla patch 17.1](https://levla.app/blog/patch-171-launch-patch) · [Levla patch 17.2](https://levla.app/blog/patch-172-follow-up-launch-patch) · [Levla patch 20](https://levla.app/blog/patch-20-story-of-witsend) · [Levla en Google Play](https://play.google.com/store/apps/details?id=com.lifeborne.app&hl=en-US) · [Pixelio](https://getpixelio.com/en) · [Pixelio en App Store](https://apps.apple.com/us/app/pixelio-habit-tracker-rpg/id6761470365) · [Pixelio en Google Play](https://play.google.com/store/apps/details?id=com.luxstudio.pixelioapp)
