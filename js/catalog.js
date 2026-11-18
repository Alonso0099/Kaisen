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
export const CHARACTERS = [
  { id: 'guardabosques', name: 'Guardabosques', blurb: 'Paciente y constante, conoce cada sendero.', accent: '#7fae4a' },
  { id: 'exploradora',   name: 'Exploradora',   blurb: 'Curiosa e imparable, siempre busca el siguiente reto.', accent: '#2aa3a0' },
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
export const GUARDIANS = {
  fuerza:      { name: 'Astrid' },
  resistencia: { name: 'Skadi' },
  intelecto:   { name: 'Runa' },
  sabiduria:   { name: 'Véra' },
  vinculo:     { name: 'Eira' },
  hogar:       { name: 'Liv' },
};
export function guardianFor(statId, statLevel) {
  let tier = 1;
  GUARDIAN_TIERS.forEach((min, i) => { if (statLevel >= min) tier = i + 1; });
  const next = GUARDIAN_TIERS[tier] ?? null;
  return { ...GUARDIANS[statId], tier, nextAt: next, img: art.guardian(statId, tier), fallback: art.guardian(statId, 1) };
}

// ---------------------------------------------------------------------
// Mascotas: cada huevo es una especie con 6 etapas (8 × 6 = 48).
// Solo "chispa" tiene arte por ahora; las demás aparecen como próximas.
// ---------------------------------------------------------------------
export const PET_SPECIES = [
  { id: 'chispa', name: 'Chispa', element: 'Fuego' },
  { id: 'brisa',  name: null, element: 'Viento' },
  { id: 'marea',  name: null, element: 'Agua' },
  { id: 'roca',   name: null, element: 'Tierra' },
  { id: 'rayo',   name: null, element: 'Trueno' },
  { id: 'escarcha', name: null, element: 'Hielo' },
  { id: 'luz',    name: null, element: 'Luz' },
  { id: 'sombra', name: null, element: 'Sombra' },
];
export const DEFAULT_PET = 'chispa';

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
