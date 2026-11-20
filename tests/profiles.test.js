// Pruebas de perfiles locales (localStorage simulado en memoria).
import test from 'node:test';
import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k),
  clear: () => store.clear(),
};
const P = await import('../js/profiles.js');
const G = await import('../js/logic.js');

test('primer arranque crea un perfil por defecto', () => {
  store.clear();
  const { idx, state } = P.boot();
  assert.equal(idx.ids.length, 1);
  assert.equal(state.profile.character, 'titan-m');
});

test('dos perfiles con personajes distintos se conservan al "recargar"', () => {
  store.clear();
  const first = P.boot();
  first.state.profile.name = 'Kai';
  first.state.profile.character = 'guardian-m';
  P.saveProfileState(first.id, first.state);
  const second = P.createProfile({ name: 'Rin', character: 'relampago-f' });
  G.logActivity(second.state, 'def-leer');
  P.saveProfileState(second.id, second.state);

  // "Recargar": volver a arrancar solo desde localStorage
  let boot = P.boot();
  assert.equal(boot.id, second.id);                       // queda activo el último elegido
  assert.equal(boot.state.profile.character, 'relampago-f');
  assert.equal(boot.state.log.length, 1);

  P.switchProfile(first.id);
  boot = P.boot();
  assert.equal(boot.state.profile.name, 'Kai');
  assert.equal(boot.state.profile.character, 'guardian-m');
  assert.equal(boot.state.log.length, 0);                  // el progreso no se mezcla

  const list = P.listProfiles();
  assert.deepEqual(list.map(p => p.character).sort(), ['guardian-m', 'relampago-f']);
  assert.equal(list.find(p => p.active).name, 'Kai');
});

test('borrar perfil: no deja borrar el último y cambia al siguiente', () => {
  store.clear();
  const a = P.boot();
  assert.throws(() => P.deleteProfile(a.id), /al menos un perfil/);
  const b = P.createProfile({ name: 'B', character: 'relampago-f' });
  assert.equal(P.deleteProfile(b.id), a.id);
  assert.equal(store.has(`kaisen-p-${b.id}`), false);
});

test('migra el guardado de la versión anterior como primer perfil', () => {
  store.clear();
  const old = G.defaultState();
  G.logActivity(old, 'def-gym');
  delete old.profile.character;
  old.partner = { name: 'Alguien' };
  store.set('nano-rpg-v1', JSON.stringify(old));
  const { state } = P.boot();
  assert.equal(state.log.length, 1);
  assert.equal(state.profile.character, 'titan-m');
  assert.equal(state.partner, undefined);
});

test('especie de mascota: ids y nombres del catálogo, y se conserva por perfil', async () => {
  const C = await import('../js/catalog.js');
  assert.deepEqual(C.PET_SPECIES.map(s => `${s.id}:${s.name}`), [
    'chispa:Dragón de Fuego', 'brisa:Céfiro', 'marea:Marea', 'roca:Pedernal',
    'rayo:Trueno', 'escarcha:Nival', 'luz:Alba', 'sombra:Umbra',
  ]);
  store.clear();
  const a = P.boot();
  assert.equal(a.state.pet.species, 'chispa');             // perfiles viejos y nuevos empiezan en Chispa
  a.state.pet.species = 'marea';
  P.saveProfileState(a.id, a.state);
  const b = P.createProfile({ name: 'B', character: 'relampago-f' });
  assert.equal(b.state.pet.species, 'chispa');
  P.switchProfile(a.id);
  assert.equal(P.boot().state.pet.species, 'marea');        // cada perfil conserva su elección
});

test('nombre de mascota por perfil: cada perfil guarda el suyo', async () => {
  store.clear();
  const a = P.boot();
  G.setPetName(a.state, 'Brasa');
  P.saveProfileState(a.id, a.state);
  const b = P.createProfile({ name: 'B', character: 'relampago-f' });
  assert.equal(G.petCustomName(b.state), '');
  G.setPetName(b.state, 'Fuego');
  P.saveProfileState(b.id, b.state);
  P.switchProfile(a.id);
  assert.equal(G.petCustomName(P.boot().state), 'Brasa');
  P.switchProfile(b.id);
  assert.equal(G.petCustomName(P.boot().state), 'Fuego');
});

test('héroes A-14: seis héroes × dos looks, con nombre, cualidad y frase', async () => {
  const C = await import('../js/catalog.js');
  assert.deepEqual(C.CHARACTERS.map(c => c.id), ['titan', 'relampago', 'estratega', 'sabio', 'guardian', 'implacable']);
  for (const c of C.CHARACTERS) assert.ok(c.names.m && c.names.f && c.title && c.blurb.length > 30, c.id);
  assert.equal(C.DEFAULT_CHARACTER, 'titan-m');
  assert.equal(C.characterById('no-existe').key, 'titan-m');
  const h = C.characterById('estratega-f');
  assert.equal(h.name, 'Hechicera Astral'); assert.equal(h.hero, 'estratega'); assert.equal(h.look, 'f');
  assert.equal(C.characterImg('duelista'), 'art/chars/implacable-f.webp');
});

test('instalación: qué se muestra según el dispositivo', async () => {
  const I = await import('../js/install.js');
  const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1';
  const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36';
  const DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0 Safari/537.36';
  // ya instalada gana sobre todo lo demás
  assert.equal(I.installInfo({ standalone: true, hasPrompt: true, ua: IPHONE }).kind, 'installed');
  // si el navegador ofrece instalar, hay botón
  const p = I.installInfo({ standalone: false, hasPrompt: true, ua: ANDROID });
  assert.equal(p.kind, 'prompt'); assert.ok(p.button);
  // iPhone / iPad (incluido iPadOS que se anuncia como Mac): instrucciones, sin botón
  for (const ua of [IPHONE, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1']) {
    const i = I.installInfo({ standalone: false, hasPrompt: false, ua });
    assert.equal(i.kind, 'ios'); assert.equal(i.button, undefined); assert.equal(i.steps.length, 3);
  }
  // Android sin evento (p. ej. ya la rechazó): instrucciones del menú
  assert.equal(I.installInfo({ standalone: false, hasPrompt: false, ua: ANDROID }).kind, 'android-menu');
  // escritorio sin evento: texto genérico; un Mac normal NO es iOS
  assert.equal(I.installInfo({ standalone: false, hasPrompt: false, ua: DESKTOP }).kind, 'other');
  assert.equal(I.isIOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15'), false);
  // modo de pantalla
  assert.equal(I.isStandalone({ matchMedia: q => ({ matches: q.includes('standalone') }) }), true);
  assert.equal(I.isStandalone({ matchMedia: () => ({ matches: false }), navigator: { standalone: true } }), true);
  assert.equal(I.isStandalone({ matchMedia: () => ({ matches: false }), navigator: {} }), false);
});


test('T-04: frases para cada héroe (7), guardiana (6), jefe (3 + su burla) y 3 de vuelta; nombres en inglés por id', async () => {
  const P = await import('../js/phrases.js');
  const C = await import('../js/catalog.js');
  const L = await import('../js/logic.js');
  const EN = await import('../js/names-en.js');
  for (const c of C.CHARACTERS) { assert.equal(P.HERO_LINES[c.id]?.length, 7, c.id); assert.ok(EN.HEROES_EN[c.id], c.id); }
  for (const s of L.STAT_IDS) { assert.equal(P.GUARDIAN_LINES[s]?.length, 6, s); assert.ok(EN.STATS_EN[s], s); }
  for (const b of L.BOSSES) { assert.equal(P.BOSS_LINES[b.id]?.length, 3, b.id); assert.ok(b.taunt && EN.BOSSES_EN[b.id], b.id); }
  for (const sp of C.PET_SPECIES) assert.ok(EN.SPECIES_EN[sp.id], sp.id);
  for (const w of C.WORLDS) assert.ok(EN.WORLDS_EN[w.id], w.id);
  assert.equal(P.BACK_LINES.length, 3);
  assert.equal(P.lineOfDay(P.BACK_LINES, 'back', '2026-11-20'), P.lineOfDay(P.BACK_LINES, 'back', '2026-11-20'));
});

test('idioma: traduce plantillas por id, respeta lo que el jugador renombró y no toca el progreso', async () => {
  const I = await import('../js/i18n.js');
  const L = await import('../js/logic.js');
  const s = L.defaultState();
  L.logActivity(s, 'def-mtb', { bonus: true, now: Date.now() });
  const before = JSON.stringify(L.deriveProfile(s));
  I.setLang('en');
  assert.equal(I.nameOf(s.activities.find(a => a.id === 'def-leer')), 'Read 20+ min');
  assert.equal(I.nameOf(s.log[0]), 'Cycling · Long route');
  assert.equal(I.nameOf({ id: 'def-leer', name: 'Leer novelas' }), 'Leer novelas', 'renombrada: no se traduce');
  assert.equal(I.nameOf({ id: 'x123', name: 'Mi hábito propio' }), 'Mi hábito propio');
  assert.equal(I.nameOf({ id: 'def-cocinar', name: 'Cocinar en vez de pedir' }), 'Cook at home');
  assert.equal(I.t('Siguiente'), 'Next');
  assert.equal(I.t('Texto sin traducir todavía'), 'Texto sin traducir todavía');
  assert.equal(I.statName(L.statById('hogar')), 'Hearth');
  assert.equal(I.bossName(L.BOSSES[0]), 'The Lord of the Couch');
  assert.equal(I.missionText({ id: 'b', target: 250 }).title, 'Power Build-Up');
  assert.equal(JSON.stringify(L.deriveProfile(s)), before, 'cambiar de idioma no cambia nada del progreso');
  I.setLang('es');
  assert.equal(I.nameOf(s.log[0]), s.log[0].name);
  assert.equal(I.t('Siguiente'), 'Siguiente');
});
