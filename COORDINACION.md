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
| A-09 | Formas 2–5 de los guardianes | `art/guardians/<stat>-{2..5}.webp` | ⏳ |
| A-10 | 8 huevos y las otras 7 especies de mascota | `art/eggs/…`, `art/pets/…` | ⏳ |
| T-01 | Para cada **jefe nuevo** (hasta 4 más): nombre, a qué miedo o mal hábito representa, frase de burla, stat débil y reto de resistencia | texto | ⏳ |
| T-02 | Nombres de guardianes (Skadi, Runa, Véra, Eira, Liv) y especies (Céfiro, Marea, Pedernal, Trueno, Nival, Alba, Umbra) | texto | ✅ |
| T-03 | Una frase corta de cada guardián al evolucionar | texto | ✅ |
| A-11 | 19 íconos de piezas de equipo (lista con ids en ARTE.md → Equipo) | `art/items/<id>.webp` | ⏳ |

**Reglas que hacen que todo encaje:** fondo transparente (salvo los mundos), lienzo 720×1000 con los pies en el borde inferior para las figuras de pie, mismo estilo en toda la serie (adjuntar una imagen anterior como referencia) y sin texto dentro de las imágenes.

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
| A-04 | Seis jefes en estilo Kaisen | 2026-11-18 |
| T-02 | Nombres de guardianas y de las 8 especies | 2026-11-18 |
| A-05 | Dragón de Fuego: 6 etapas (especie `chispa`) | 2026-11-18 |
| A-06, A-07 | 6 emblemas de stats y 18 insignias de logros | 2026-11-18 |
| A-08 | Personajes Forjador, Cartógrafo, Tejedora y Duelista | 2026-11-18 |
