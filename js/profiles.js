// =====================================================================
// Perfiles locales: varias personas pueden usar Kaisen en el mismo
// teléfono, cada una con su propio progreso y personaje.
//
//   kaisen-index        → { active, ids: [...] }
//   kaisen-p-<id>       → el estado completo de ese perfil
//
// Si existe un guardado de la versión anterior (nano-rpg-v1), se
// convierte en el primer perfil para no perder el progreso.
// =====================================================================
import * as G from './logic.js';

const INDEX_KEY = 'kaisen-index';
const LEGACY_KEY = 'nano-rpg-v1';
const keyFor = id => `kaisen-p-${id}`;

function readIndex() {
  try { return JSON.parse(localStorage.getItem(INDEX_KEY)) || null; } catch { return null; }
}
function writeIndex(idx) { localStorage.setItem(INDEX_KEY, JSON.stringify(idx)); }

export function loadProfileState(id) {
  try {
    const raw = localStorage.getItem(keyFor(id));
    if (raw) return G.validateImport(JSON.parse(raw));
  } catch (err) { console.error('No se pudo leer el perfil', id, err); }
  return null;
}
export function saveProfileState(id, state) {
  localStorage.setItem(keyFor(id), JSON.stringify(state));
}

/** Prepara el índice la primera vez (con migración) y devuelve { idx, id, state }. */
export function boot() {
  let idx = readIndex();
  if (!idx || !idx.ids?.length) {
    const id = G.uid();
    let state = G.defaultState();
    try {
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) state = G.validateImport(JSON.parse(legacy));
    } catch { /* guardado viejo dañado: se empieza de cero */ }
    saveProfileState(id, state);
    idx = { active: id, ids: [id] };
    writeIndex(idx);
  }
  if (!idx.ids.includes(idx.active)) idx.active = idx.ids[0];
  const state = loadProfileState(idx.active) || G.defaultState();
  return { idx, id: idx.active, state };
}

/** Lista para el selector de perfiles: id, nombre, personaje y nivel. */
export function listProfiles() {
  const idx = readIndex() || { ids: [] };
  return idx.ids.map(id => {
    const st = loadProfileState(id);
    if (!st) return null;
    return { id, name: st.profile.name, character: st.profile.character, level: G.deriveProfile(st).level, active: id === idx.active };
  }).filter(Boolean);
}

export function createProfile({ name, character }) {
  const idx = readIndex();
  const id = G.uid();
  const state = G.defaultState();
  state.profile.name = name || 'Héroe';
  state.profile.character = G.migrateCharacter(character);
  saveProfileState(id, state);
  idx.ids.push(id);
  idx.active = id;
  writeIndex(idx);
  return { id, state };
}

export function switchProfile(id) {
  const idx = readIndex();
  if (!idx.ids.includes(id)) throw new Error('Perfil no encontrado');
  idx.active = id;
  writeIndex(idx);
  return loadProfileState(id) || G.defaultState();
}

export function deleteProfile(id) {
  const idx = readIndex();
  if (idx.ids.length <= 1) throw new Error('Debe quedar al menos un perfil');
  idx.ids = idx.ids.filter(x => x !== id);
  if (idx.active === id) idx.active = idx.ids[0];
  writeIndex(idx);
  localStorage.removeItem(keyFor(id));
  return idx.active;
}
