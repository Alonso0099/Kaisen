# ⚔️ Kaizen

Un RPG estilo anime donde tu personaje sube de nivel con las actividades de tu vida real.

**Kaizen** (改善) es una palabra japonesa: «cambio» + «bueno», es decir, **mejora continua**: avanzar un poco cada día. (Antes la app se llamaba *Kaisen*; las claves internas de guardado conservan ese nombre para no perder el progreso de nadie.)
Es una PWA (app web instalable) pensada para iPhone: funciona sin conexión y sin servidor propio.

---

## 📱 Instalar en el iPhone

1. Abre la URL de la app en **Safari** (otro navegador no sirve para instalarla en iOS).
2. Toca el botón **Compartir** (el cuadrito con la flecha hacia arriba).
3. Elige **"Agregar a pantalla de inicio"** y luego **Agregar**.
4. Abre Kaizen desde el ícono: se ve a pantalla completa, sin barras de Safari.

Después de abrirla una vez con internet, funciona **offline**.

### ⚠️ Respaldos (importante)
Safari puede borrar los datos de una app web si no la usas por varias semanas o si el iPhone se queda sin espacio.
En **Ajustes → Respaldo → Exportar** se genera un archivo `.json`: guárdalo en **Archivos / iCloud Drive**.
Para recuperar tus datos: **Importar** y elige ese archivo. La app te recuerda respaldar (punto rojo en Ajustes) si pasan más de 7 días.

---

## 🌐 Publicarla en GitHub Pages

1. Sube el código a GitHub (la rama que quieras publicar, normalmente `main`).
2. En el repositorio: **Settings → Pages**.
3. En *Build and deployment* elige **Source: Deploy from a branch**, rama `main`, carpeta `/ (root)` → **Save**.
4. Espera 1–2 minutos. Tu app quedará en `https://TU-USUARIO.github.io/Kaizen/`.
5. Abre esa URL en Safari del iPhone e instálala (pasos de arriba).

No hay que compilar nada: son archivos estáticos. El archivo `.nojekyll` le dice a GitHub que los sirva tal cual.

### Publicar cambios
Cuando modifiques archivos, **sube el número de `CACHE_VERSION` en `sw.js`** (p. ej. `v1.0.0` → `v1.0.1`) y el de `APP_VERSION` en `js/app.js`.
Así el service worker descarga la versión nueva. En el iPhone puede tardar en aparecer hasta que cierres y vuelvas a abrir la app (a veces dos veces).

### Probar en tu computadora
```bash
python3 -m http.server 8000     # luego abre http://localhost:8000
npm test                        # pruebas de la lógica de XP, niveles, rachas y logros (Node 18+)
```

---

## 🌱 Lo básico

Dormir, tomar agua, comer fruta o verdura, salir a tomar aire, tender la cama… Para mucha gente lo básico es el reto. Estos hábitos se marcan **una vez al día** desde la fila **«Lo básico de hoy»** en Inicio (un toque) y dan poco XP pero constante. No ocupan los accesos rápidos.

**Hogar y finanzas:** la stat Hogar incluye ahora hábitos de dinero (ahorrar algo hoy, un día sin compras impulsivas, revisar gastos).

## 🦸 Héroes

Seis héroes, cada uno con una cualidad y dos looks (12 avatares): **Gladiador/a de Bronce** (fuerza y coraje), **Pirata del Cielo** (iniciativa), **Hechicero/a Astral** (curiosidad y estrategia), **Druida de Espinas** (calma y enfoque), **Forjador/a de Almas** (carácter y cuidado) y **Ninja de la Luna** (disciplina y precisión). Primero se elige cómo se ve (**Hombre** o **Mujer**, con el mismo peso visual) y después el héroe; en Ajustes el look se cambia con un selector arriba de la lista. El héroe es solo tu avatar: **la misma actividad da la misma XP con cualquiera**, y cambiarlo no toca tu nivel, historial ni guardianas. Los perfiles con un personaje anterior pasan solos al héroe equivalente con el mismo look.

## 💬 Frases

- **El héroe** dice una frase del día según su cualidad (sale sola la primera vez que abres la app cada día; tocando la escena se vuelve a ver).
- **Cada guardiana** habla de su propósito: en su ficha y la primera vez del día que registras algo de su stat.
- **Cada jefe** se burla con una frase distinta cada día.

Los textos están en `js/phrases.js` (entrega T-04 de GPT). Al volver después de faltar, el mensaje alterna tres variantes.

## 🌐 Idioma (español e inglés)

Se elige en la bienvenida (arriba a la derecha) o en **Ajustes → Perfil → Idioma**. La primera vez se toma el idioma del teléfono. Cambiarlo **no toca el progreso** (el historial guarda ids y XP) y funciona sin conexión.

- `js/i18n.js`: `t('texto en español')` devuelve la traducción o el mismo español si falta; el contenido (hábitos, recompensas, héroes, jefes, logros) se traduce por id. **Lo que el jugador escribió o renombró nunca se traduce.**
- `js/names-en.js`: nombres en inglés de T-04.
- **Cobertura:** toda la app (bienvenida, Inicio, Misiones, Tienda, Progreso, Ajustes, equipo, mascota, hojas de edición, avisos, errores, fechas y tarjetas para compartir).
- **Frases en inglés** del héroe, las guardianas, los jefes y la vuelta: traducción provisional en `js/phrases.js` (GPT puede revisarla: pedido T-05).

## 🧭 Ayuda y tour

El botón **?** de arriba explica qué hace cada cosa en la pantalla en la que estás. El **tour** (9 pasos que resaltan cada parte) se ofrece al terminar la bienvenida y se repite desde **?** o **Ajustes → Ayuda**. Los textos están en `js/guide.js`.

## 🔮 Afinidad de las guardianas

Cuando una guardiana evoluciona, las actividades de su stat dan más XP **y más monedas** (las monedas salen de la XP): forma 2 (nivel 5) **+5 %**, forma 3 (nivel 10) **+10 %**, forma 4 (nivel 20) **+15 %**, forma 5 (nivel 35) **+20 %**. Llegar a la forma 2 lleva unas 6 semanas: cuando el premio llega, el hábito ya está hecho. Depende del nivel de la stat, nunca del héroe. El extra se guarda en el registro (`guardXp`), igual que el del equipo.

## 🌤️ Volver sin castigo

- **Día de gracia:** un día suelto sin registrar por semana no rompe la racha (no suma, pero no la corta). Los escudos se gastan solo cuando la gracia no alcanza.
- **Al volver** después de faltar, un mensaje dice que tu progreso sigue intacto y cómo quedó la racha.
- **El jefe se recupera:** un día completo sin nada de su stat débil ni de su reto, recupera el 3 % de su vida (máximo 15 % al mes). Nunca te quita XP, monedas ni nada. Cumplir su reto te da **Defensa**: al día siguiente no puede recuperarse.

## 🎁 Recompensas sin autosabotaje

- **Precio guía** por tipo (gratis 40–100, pequeño gusto 120–250, experiencia 300–600, inversión en ti 600+). Si la pones más barata, un aviso amable.
- **Recompensas con reto:** una recompensa se puede atar a un reto (cumplir un hábito N días, derrotar a un jefe o evolucionar una guardiana). Hasta cumplirlo se ve con candado y barra de avance; cada canje pide cumplirlo otra vez (salvo el de guardiana).
- **XP por esfuerzo:** al crear una actividad se elige Fácil (+10), Media (+20) o Difícil (+35) en lugar de un número libre.

## 👋 Bienvenida

Un perfil nuevo empieza con una bienvenida de cuatro pasos: nombre y héroe; **elegir de 1 a 12 hábitos** de una lista organizada por áreas (Lo básico, Moverme, Mente y calma, Dinero y hogar, Personas, Crecer); **elegir recompensas** (opcional, con ideas gratis, pequeños gustos, experiencias e inversión en ti); y un resumen. Las tres primeras elegidas quedan como accesos rápidos en Inicio, y se puede terminar registrando la primera. También se puede saltar y usar los hábitos sugeridos. Quien ya tenía progreso no la ve. Más tarde, en **Ajustes → Actividades → Elegir de la lista**, se agregan más hábitos. La lista está en `HABIT_TEMPLATES` (`js/logic.js`).

## 🎮 Cómo se juega

- **Inicio**: tu personaje en su mundo, rango, nivel y XP; el botón **Registrar actividad** (abre el catálogo completo), hasta **3 accesos rápidos** (las que fijes con ★ y luego las que más usas), un aviso con tu **próximo hito** («Registra un día más para que nazca tu mascota») y las tarjetas del **jefe** (con su reto del día) y la **mascota**. Mantén presionado un acceso para editar esa actividad.
- **Bono opcional**: si una actividad tiene bono (p. ej. *Mountain bike → Ruta larga +15*), al tocarla eliges *Normal* o *Bono*.
- **Jefe del mes**: cada mes aparece un jefe (Pereza, Procrastinación, Desorden, Estrés, Distracción, Soledad). Cada XP que ganas le quita 1 punto de vida, y la stat a la que es débil hace **doble daño**. Si lo derrotas antes de fin de mes reclamas +150 XP y queda como trofeo.
- **Misiones semanales**: 3 por semana, se renuevan cada lunes (enfocarte en una stat, juntar XP, y constancia o variedad). Al cumplirlas reclamas XP extra; los premios generales van a tu stat más débil.
- **Mascota**: nace de un huevo y evoluciona según tus días activos (2, 7, 21, 45 y 90). Nunca retrocede ni se pone triste: si no registraste hoy "te espera", y el día que vuelves está feliz de verte. Tócala en Inicio para verla y cambiarle el nombre.
- **Retos de resistencia**: cosas que te cuestan o que evitas. Cada uno cuenta una vez al día y le da **golpe crítico ×3** a su jefe. El reto del jefe del mes está en su tarjeta de Inicio; todos están en el catálogo.
- **Monedas y tienda**: además de XP ganas monedas (por cada registro, logro, misión semanal y jefe, más un **cofre diario** con premio variable en el primer registro del día). Se gastan en la Tienda sin tocar tu XP ni tu nivel:
  - **Recompensas reales** que tú defines, o elegidas de **Ideas** (gratis, pequeños gustos, experiencias, inversión en ti). Las gratis cuestan menos para que premiarte no deshaga tus metas. Al canjear recibes un cupón.
  - **Escudo de racha**: si un día no registras, se usa solo y la racha sigue viva (máximo 2 guardados).
  - **Títulos** para tu héroe. (Los "Ambientes" se retiraron en la versión 2.0: a quien los había comprado se le devolvieron las monedas.)
- **Compartir**: tarjetas ilustradas (progreso, subida de nivel, jefe derrotado, cupón) que se generan en tu teléfono y se mandan por la hoja de compartir.
- **Misiones únicas**: tareas de una sola vez con su propia XP (5–200). Al completarlas desaparecen y pasan a "Misiones completadas".
- **Progreso → Historial**: todo lo registrado, agrupado por día, con botón ↶ para deshacer. Deshacer una misión la devuelve a pendientes.
- **Progreso → Stats**: el gráfico radar, el nivel de cada stat y las guardianas.
- **Progreso → Logros**: 18 logros, cada uno da 25 monedas (primer nivel, rachas de 3/7/30 días, terminar un libro, equilibrio en las 6 stats, etc.).
- **Ajustes**: perfiles (crear, cambiar, borrar), nombre, héroe y look, animación en reposo (balanceo o quieto), crear/editar/borrar actividades (XP de 5 a 50), respaldo y reinicio.

**Racha**: días seguidos con al menos un registro. Está completa en **Progreso → Logros** (actual, mejor y escudos). Arriba solo aparece cuando ya es de 3 días o más, y nunca se muestra como "rota".

**Rangos**: Novato (1) → Aprendiz (3) → Guerrero (5) → Élite (10) → Campeón (15) → Héroe (20) → Leyenda (30) → Mito (50).
Desde nivel 5 tu personaje tiene **aura** del color de su rango, y las brasas de energía aumentan con cada nivel.

---

## 🧠 Arquitectura (para entender el código)

```
index.html             Estructura de las 5 pantallas, barra de pestañas, hoja inferior y animación de nivel
css/styles.css         Todo el estilo (escena, paneles, animaciones)
js/logic.js            Reglas del juego, SIN acceso a la pantalla → se puede probar con Node
js/app.js              Interfaz: guarda/carga, dibuja pantallas, maneja toques
js/fx.js               Efectos en <canvas>: brasas de energía y chispas de subida de nivel
js/share.js            Genera las tarjetas ilustradas para compartir (sin datos personales)
js/profiles.js         Perfiles locales: varios jugadores en un mismo teléfono
js/catalog.js          Catálogo de arte: personajes, guardianes, jefes, mascotas, mundos
js/gear.js             Equipo e inventario: piezas, espacios y bonus de XP
art/                   Ilustraciones por categoría (ver ARTE.md)
fonts/                 Tipografías Bangers y Nunito (licencia libre OFL), incluidas para funcionar offline
sw.js                  Service worker: caché para funcionar offline
manifest.webmanifest   Nombre, ícono y modo pantalla completa de la PWA
icons/                 Íconos de la app (incluye apple-touch-icon para iOS)
tests/logic.test.js    Pruebas automáticas de la lógica
```

### Decisiones principales

1. **El historial es la fuente de la verdad.** No se guarda "XP total" ni "nivel": se guarda la lista de registros (`log`), y el nivel, las stats, la racha y los logros se **calculan** a partir de ella (`deriveProfile` en `logic.js`). Por eso *deshacer* es trivial (se borra el registro y todo se recalcula) y nunca hay números desincronizados.
2. **Cada registro guarda una copia** del nombre, stat y XP de la actividad. Si después editas o borras la actividad, tu historial y tu XP no cambian.
3. **Curvas de XP**:
   - Nivel general: para pasar del nivel *N* al *N+1* necesitas `100 × N^1.5` XP (100, 283, 520, 800, 1118…).
   - Stats: `60 × N^1.35` (más suave, para que suban más seguido).
   - Con ~70 XP diarios llegas a nivel 5 en ~3 semanas, a nivel 10 en ~5 meses y a ~13 en un año.
   Puedes ajustar esto en `xpToNext` y `statXpToNext`.
4. **Un solo cambio = `commit()`.** En `app.js`, toda acción pasa por `commit(mutación)`: calcula el perfil antes y después, guarda en `localStorage`, redibuja y celebra (animación de nivel, stats que subieron, logros nuevos).
5. **Jefes, misiones semanales y mascota también se calculan del historial** (`bossStatus`, `weeklyMissions`, `petStatus` en `logic.js`). Reclamar un premio añade un registro de tipo `weekly` o `boss`, que da XP pero no cuenta para la racha, ni daña al jefe, ni avanza otras misiones (ver `isBase`). Las misiones de cada semana salen de un generador con semilla: la misma semana siempre da las mismas.
5. **Las monedas ganadas también se calculan del historial** (`wallet` en `logic.js`); lo único que se guarda es lo gastado (`purchases`). El cofre diario usa una semilla por fecha, así que no hace falta guardar si ya se abrió. Por eso comprar nunca baja tu XP.
5. **Las tarjetas para compartir se dibujan en un `<canvas>`** (`share.js`) dentro del teléfono: no hay servidor ni se sube nada.
5. **Logros calculados**: cada logro es una función `test(estado, perfil)`. Para agregar uno, añade un objeto al arreglo `ACHIEVEMENTS` en `logic.js`.
6. **El arte vive en un catálogo** (`js/catalog.js`) con rutas fijas por categoría (`art/chars`, `art/guardians`, `art/bosses`, `art/pets`, `art/worlds`…). Agregar arte es guardar el archivo con el nombre correcto; si falta, se muestra "Próximamente". Ver **[ARTE.md](ARTE.md)**.
6. **Perfiles locales** (`js/profiles.js`): varias personas pueden usar Kaizen en el mismo teléfono, cada una con su progreso y su personaje. No hay servidor: todo queda en el dispositivo.
7. **La escena se arma por capas** (`.scene` en el CSS): mundo que se desplaza → líneas de velocidad → aura del rango → canvas de brasas → personaje (balanceo suave o quieto, alineado por los pies) → degradado → nivel y barra de XP. Al registrar algo el personaje destella; al completar una misión aparece un destello detrás de él (si estabas en otra pestaña, se reproduce al volver a Inicio). Con "reducir movimiento" activado en el teléfono no hay animaciones.
8. **Sin frameworks ni paso de compilación.** Se evaluó usar un stack más pesado, pero lo que hace linda la app es el arte, la tipografía y el movimiento; todo eso funciona con HTML + CSS + módulos JS nativos, y así sigue bastando con subir los archivos a GitHub Pages.
9. **Service worker "caché primero"**: la app abre al instante y sin internet; en segundo plano baja la versión nueva si hay red.
10. **Fechas locales**: la racha usa la fecha de tu teléfono (no UTC), así un registro a las 11 pm cuenta para ese día.
11. **Límites de XP**: actividades nuevas 5–50 XP. Las predeterminadas que valen más (*Terminar libro* = 100) conservan su valor como tope al editarlas.

### Datos guardados (`localStorage`)
```js
// kaisen-index → { active: idPerfil, ids: [...] }
// kaisen-p-<id> → estado de ese perfil:
{
  profile: { name, character }, prefs: { idle: 'sway' | 'static' }, pet: { name, species },
  activities: [{ id, name, stat, xp, bonus, resist }],
  rewards: [...], purchases: [...], shieldDays: [...], equipped: { sky, title, world },
  quests: [...], questHistory: [...],
  log: [{ id, ts, type: 'activity'|'quest'|'weekly'|'boss', refId, name, stat, xp }],
  seenAchievements: [...], lastBackup, createdAt
}
```

---

## 📲 Instalar la app

En **Ajustes → Instalar la app** hay una tarjeta que cambia según el dispositivo: en Android y escritorio (Chrome, Edge) un botón **Instalar Kaizen**; en iPhone, los tres pasos de Safari (iOS no permite un botón); y si ya está instalada, lo dice. La lógica está en `js/install.js`.

## ✨ Al registrar

Cada registro muestra **un solo aviso**: qué registraste, el XP y las monedas, hasta dos líneas con lo que desbloqueaste (logros, stats, misión cumplida…) y **Deshacer**, que no se borra aunque lleguen otros avisos. Como máximo hay una celebración a pantalla completa por registro (subir de nivel > eclosión > evolución de guardiana); lo demás va en ese aviso.

## 🎒 Equipo

Inicio → **🎒 Equipo** abre la pantalla de equipo: tu personaje con 8 espacios, el resumen de bonus y el inventario.

- Cada pieza da **XP extra** en una stat (o en todas), con un tope de +30 % por stat.
- Las comunes (+5 %) y raras (+10 %) se compran en la **Tienda**. Cada **jefe** suelta su pieza épica (+15 %) al reclamar el premio.
- El extra se calcula al registrar y queda guardado en el registro (`gearXp`): cambiarte el equipo no altera lo ya ganado, y deshacer quita exactamente lo que se sumó.
- La lógica está en `js/gear.js` y no depende de la pantalla.

## 🔮 Ideas a futuro
- Dos perfiles sincronizados (cada quien en su teléfono) con jefe cooperativo. Requiere servidor y cuentas.
- Versión general para otras personas: el mismo motor con un "paquete de contenido" aparte (nombres, actividades, arte) y creador de avatar.
- Huevo inicial a elegir (8 especies), inventario y equipamiento (ver ARTE.md).
