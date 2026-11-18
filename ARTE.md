# 🎨 Guía de arte de Kaisen

Esta guía dice **qué tamaño, formato y nombre** debe tener cada imagen para que la app la muestre sin tocar código. Mientras una imagen no exista, la app muestra "Próximamente" en su lugar, así que puedes ir agregando arte poco a poco.

## Reglas generales (todas las categorías)

1. **Formato:** WebP (preferido) o PNG. Si usas PNG, cambia la extensión en `js/catalog.js` o conviértelo a WebP (en squoosh.app, calidad 85–90).
2. **Fondo transparente** para todo lo que se pone encima de otra cosa (personajes, guardianes, jefes, mascotas, huevos, objetos, insignias). Los **mundos** sí llevan fondo completo.
3. **Nombres en minúsculas, sin acentos ni espacios:** `fuerza-2.webp`, no `Fuerza 2.webp`.
4. **Mismo estilo en toda la serie.** Pídele a GPT que use el mismo estilo cada vez y pégale una imagen anterior como referencia.
5. **Peso:** idealmente menos de 200 KB por imagen (menos de 400 KB en mundos).
6. Para reemplazar mi arte temporal, guarda tu imagen **con el mismo nombre** y súbela.
7. Después de agregar imágenes, sube el número de `CACHE_VERSION` en `sw.js` para que los teléfonos descarguen lo nuevo.

## Personas de pie (personajes, guardianes y jefes)

Para que todos se vean del mismo tamaño y alineados por los pies:

- **Lienzo de 720 × 1000 px**, vertical.
- **Cuerpo completo**, de pie, con los **pies tocando el borde inferior** (máximo 10 px de margen abajo).
- La figura ocupa casi toda la altura (unos 960 px) y queda **centrada a lo ancho**.
- Sin sombra en el piso ni efectos alrededor: la app agrega el brillo y la sombra.
- Mira hacia el frente o en tres cuartos.

Si GPT te da otro tamaño, no pasa nada: pídeme "normaliza este arte" y lo recorto y alineo como hice con Exploradora y Guardabosques.

## Categorías

| Categoría | Carpeta y nombre | Cantidad | Tamaño | Notas |
|---|---|---|---|---|
| **Personajes jugables** | `art/chars/<id>.webp` | los que quieras | 720×1000 | Agregar una línea en `CHARACTERS` de `js/catalog.js`. |
| **Guardianes** | `art/guardians/<stat>-<1..5>.webp` | 6 stats × 5 = 30 | 720×1000 | Ej.: `fuerza-1.webp` es Astrid en su primera forma. |
| **Jefes** | `art/bosses/<id>.webp` | 10 | 720×1000 o cuadrado 1000×1000 | Hoy hay 6 ids (abajo). Para los 4 nuevos, pásame nombre, debilidad y reto. |
| **Mascotas** | `art/pets/<especie>-<0..5>.webp` | 8 × 6 = 48 | 600×600 | Etapa 0 = huevo; 5 = forma final. |
| **Huevos** | `art/eggs/<especie>.webp` | 8 | 600×600 | Para el selector de huevo al empezar (próxima fase). |
| **Mundos** | `art/worlds/<id>.webp` | 6 (o más) | 1200×1600 vertical | Paisaje sin personas; el centro-abajo queda despejado para el personaje. |
| **Insignias de logros** | `art/badges/<id-logro>.webp` | 18 | 512×512 | Si falta una, se muestra el emoji. |
| **Emblemas de stats** | `art/stats/<stat>.webp` | 6 | 512×512 | Circulares. |
| **Objetos** (inventario) | `art/items/<id>.webp` | libre | 512×512 | Pociones, gemas, libros (próxima fase). |

### Ids que ya usa la app

- **Stats:** `fuerza`, `resistencia`, `intelecto`, `sabiduria`, `vinculo`, `hogar`
- **Jefes:** `pereza`, `procrastinacion`, `desorden`, `estres`, `distraccion`, `soledad`
- **Especies de mascota:** `chispa` (fuego), `brisa` (viento), `marea` (agua), `roca` (tierra), `rayo` (trueno), `escarcha` (hielo), `luz`, `sombra`
- **Mundos** (rango que lo desbloquea): `atardecer` (E), `bosque` (D), `montana` (C), `islas` (B), `ciudadela` (S), `cosmos` (SS)
- **Logros:** `first-log`, `level-2`, `level-5`, `level-10`, `streak-3`, `streak-7`, `streak-30`, `book`, `quest-1`, `all-stats`, `stat-5`, `big-day`, `logs-100`, `weekly-1`, `weekly-all`, `boss-1`, `boss-6`, `pet-adult`

Los nombres de guardianes, especies y mundos se editan en `js/catalog.js`.

## Guardianes: cómo evolucionan

Cada stat tiene un guardián con 5 formas. La forma cambia con el nivel de esa stat:

| Evolución | Nivel de la stat |
|---|---|
| 1 | 1 |
| 2 | 5 |
| 3 | 10 |
| 4 | 20 |
| 5 | 35 |

Si falta la imagen de una evolución, se muestra la primera forma.

## Equipamiento (para más adelante)

Para que el casco, la armadura o el arma se vean **puestos sobre el personaje**, cada pieza debe dibujarse sobre **el mismo cuerpo base, en la misma pose y el mismo lienzo de 720×1000**, como capas transparentes que encajan exactamente. Es difícil de lograr con generadores de imágenes.

El plan es empezar con el equipo **como íconos** (512×512, fondo transparente) en sus espacios: `casco`, `armadura`, `guantes`, `arma`, `botas`, `capa`, `accesorio-1`, `accesorio-2`.

## Plantilla para pedirle a GPT

> Ilustración de [qué es], estilo [tu estilo: p. ej. RPG anime pintado, contornos limpios], cuerpo completo de pie, vista frontal o tres cuartos, fondo transparente, sin sombra en el piso, sin texto. Lienzo vertical 720×1000 px con los pies tocando el borde inferior y la figura centrada. Mantén exactamente el mismo estilo que la imagen de referencia adjunta.
