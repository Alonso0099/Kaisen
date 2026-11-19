// =====================================================================
// Catálogo de contenido de Kaisen: aquí se declara TODO el arte que la
// app sabe mostrar, con su ruta y cuándo se desbloquea.
//
// Para agregar arte nuevo casi nunca hay que tocar código:
//   1. Guarda la imagen con el nombre que indica ARTE.md
//      (por ejemplo art/guardians/fuerza-2.webp).
//   2. Si es un elemento nuevo (otro personaje, otro mundo…), agrega
//      una línea en la lista correspondiente de este archivo.
// Si una imagen todavía no existe, la app muestra "Próximamente".
// =====================================================================

export const art = {
  char:     id => `art/chars/${id}.webp`,
  guardian: (stat, tier) => `art/guardians/${stat}-${tier}.webp`,
  boss:     id => `art/bosses/${id}.webp`,
  pet:      (species, stage) => `art/pets/${species}-${stage}.webp`,
  egg:      species => `art/eggs/${species}.webp`,
  world:    id => `art/worlds/${id}.webp`,
  badge:    id => `art/badges/${id}.webp`,
  stat:     id => `art/stats/${id}.webp`,
  item:     id => `art/items/${id}.webp`,
};

// ---------------------------------------------------------------------
// Personajes jugables
// ---------------------------------------------------------------------
// Cada héroe representa una cualidad que la gente quiere tener. Los ids se
// conservan (las elecciones guardadas no cambian); el arte definitivo de cada
// arquetipo es el encargo A-14 de COORDINACION.md.
export const CHARACTERS = [
  { id: 'guardabosques', name: 'Guardián',    title: 'Corazón leal',      blurb: 'Su fuerza viene de los suyos. Protege, acompaña y nunca deja a nadie atrás.', accent: '#7fae4a' },
  { id: 'exploradora',   name: 'Relámpago',   title: 'Rápida y ágil',     blurb: 'Arranca antes de pensarlo dos veces. Para ella, empezar ya es medio camino.', accent: '#2aa3a0' },
  { id: 'forjador',      name: 'Titán',       title: 'Fuerza imparable',  blurb: 'No espera tener ganas: se pone en marcha y cada día es un poco más fuerte.', accent: '#cf713e' },
  { id: 'cartografo',    name: 'Estratega',   title: 'Mente afilada',     blurb: 'Planea, aprende y va un paso adelante. Cada tarea es una jugada ganada.', accent: '#c75649' },
  { id: 'tejedora',      name: 'Sabia',       title: 'Calma y enfoque',   blurb: 'Cuando todo es ruido, ella respira y elige con claridad. Nada la saca de su centro.', accent: '#ac77ce' },
  { id: 'duelista',      name: 'Implacable',  title: 'Disciplina de acero', blurb: 'Hace lo que dijo que haría, aunque nadie lo vea. La constancia es su arma.', accent: '#37896a' },
];
export const DEFAULT_CHARACTER = CHARACTERS[0].id;
export const characterById = id => CHARACTERS.find(c => c.id === id) || CHARACTERS[0];
export const characterImg = id => art.char(characterById(id).id);

// ---------------------------------------------------------------------
// Guardianes: uno por stat, con 5 evoluciones que se desbloquean al
// subir el nivel de esa stat (6 stats × 5 = 30 diseños).
// `name: null` = todavía sin nombre (se muestra "Guardián de …").
// ---------------------------------------------------------------------
export const GUARDIAN_TIERS = [1, 5, 10, 20, 35]; // nivel de stat para cada evolución
// phrase: lo que dice al evolucionar (entrega T-03 de GPT).
export const GUARDIANS = {
  fuerza:      { name: 'Astrid', phrase: 'Hoy puedo con lo que ayer me pesaba.' },
  resistencia: { name: 'Skadi',  phrase: 'Mirá cuánto camino hicimos, paso a paso.' },
  intelecto:   { name: 'Runa',   phrase: 'Una pregunta más, y se abrió otra puerta.' },
  sabiduria:   { name: 'Véra',   phrase: 'Aprendí a hacer una pausa antes de responder.' },
  vinculo:     { name: 'Eira',   phrase: 'Cada vez que nos buscamos, el lazo se hace más fuerte.' },
  hogar:       { name: 'Liv',    phrase: 'Poco a poco, este lugar se siente nuestro.' },
};

/** Forma (1–5) que corresponde a un nivel de stat. */
export function guardianTier(statLevel) {
  let tier = 1;
  GUARDIAN_TIERS.forEach((min, i) => { if (statLevel >= min) tier = i + 1; });
  return tier;
}

/**
 * Guardianas que alcanzaron una forma que aún no se anunció.
 * stats: { fuerza: { level }, ... } · seen: { fuerza: 3, ... } (forma más alta ya anunciada)
 * Devuelve [{ stat, tier }] con la forma MÁS ALTA de cada una (si un registro
 * salta varias formas, solo se anuncia la última).
 */
export function guardianEvolutions(stats, seen = {}) {
  return Object.keys(GUARDIANS)
    .map(stat => ({ stat, tier: guardianTier(stats[stat]?.level || 1) }))
    .filter(({ stat, tier }) => tier > 1 && tier > (seen[stat] || 1));
}

/** Marca como anunciadas las formas actuales (al abrir la app, cambiar de perfil o importar). */
export function syncGuardianSeen(seen = {}, stats) {
  const out = { ...seen };
  for (const stat of Object.keys(GUARDIANS)) out[stat] = Math.max(out[stat] || 1, guardianTier(stats[stat]?.level || 1));
  return out;
}

export function guardianFor(statId, statLevel) {
  const tier = guardianTier(statLevel);
  const next = GUARDIAN_TIERS[tier] ?? null;
  return { ...GUARDIANS[statId], tier, nextAt: next, img: art.guardian(statId, tier), fallback: art.guardian(statId, 1) };
}

// ---------------------------------------------------------------------
// Mascotas: cada huevo es una especie con 6 etapas (8 × 6 = 48).
// Solo "chispa" tiene arte por ahora; las demás aparecen como próximas.
// ---------------------------------------------------------------------
// `ready: true` = ya tiene arte de sus 6 etapas. Las demás se ven en el
// selector como "Próximamente" y no se pueden elegir todavía (para que
// nadie se quede con una mascota invisible). Cambia a true al subir su arte.
export const PET_SPECIES = [
  { id: 'chispa',   name: 'Dragón de Fuego', element: 'Fuego', ready: true },  // nombre provisional
  { id: 'brisa',    name: 'Céfiro',   element: 'Viento', ready: true },
  { id: 'marea',    name: 'Marea',    element: 'Agua',   ready: true },
  { id: 'roca',     name: 'Pedernal', element: 'Tierra', ready: true },
  { id: 'rayo',     name: 'Trueno',   element: 'Trueno', ready: true },
  { id: 'escarcha', name: 'Nival',    element: 'Hielo',  ready: true },
  { id: 'luz',      name: 'Alba',     element: 'Luz',    ready: true },
  { id: 'sombra',   name: 'Umbra',    element: 'Sombra', ready: true },
];
export const DEFAULT_PET = 'chispa';
export const speciesById = id => PET_SPECIES.find(s => s.id === id) || PET_SPECIES[0];

// ---------------------------------------------------------------------
// Mundos (fondos de Inicio): se desbloquean por rango.
// ---------------------------------------------------------------------
export const WORLDS = [
  { id: 'atardecer', name: 'Valle del Atardecer', minLevel: 1 },
  { id: 'bosque',    name: 'Bosque Antiguo',      minLevel: 3 },
  { id: 'montana',   name: 'Cumbres del Alba',    minLevel: 5 },
  { id: 'islas',     name: 'Islas Flotantes',     minLevel: 10 },
  { id: 'ciudadela', name: 'Ciudadela Celeste',   minLevel: 20 },
  { id: 'cosmos',    name: 'Mar de Estrellas',    minLevel: 30 },
];
export const DEFAULT_WORLD = 'atardecer';
export const worldById = id => WORLDS.find(w => w.id === id) || WORLDS[0];
