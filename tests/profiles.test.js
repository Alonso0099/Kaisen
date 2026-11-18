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
  assert.equal(state.profile.character, 'guardabosques');
});

test('dos perfiles con personajes distintos se conservan al "recargar"', () => {
  store.clear();
  const first = P.boot();
  first.state.profile.name = 'Kai';
  first.state.profile.character = 'guardabosques';
  P.saveProfileState(first.id, first.state);
  const second = P.createProfile({ name: 'Rin', character: 'exploradora' });
  G.logActivity(second.state, 'def-leer');
  P.saveProfileState(second.id, second.state);

  // "Recargar": volver a arrancar solo desde localStorage
  let boot = P.boot();
  assert.equal(boot.id, second.id);                       // queda activo el último elegido
  assert.equal(boot.state.profile.character, 'exploradora');
  assert.equal(boot.state.log.length, 1);

  P.switchProfile(first.id);
  boot = P.boot();
  assert.equal(boot.state.profile.name, 'Kai');
  assert.equal(boot.state.profile.character, 'guardabosques');
  assert.equal(boot.state.log.length, 0);                  // el progreso no se mezcla

  const list = P.listProfiles();
  assert.deepEqual(list.map(p => p.character).sort(), ['exploradora', 'guardabosques']);
  assert.equal(list.find(p => p.active).name, 'Kai');
});

test('borrar perfil: no deja borrar el último y cambia al siguiente', () => {
  store.clear();
  const a = P.boot();
  assert.throws(() => P.deleteProfile(a.id), /al menos un perfil/);
  const b = P.createProfile({ name: 'B', character: 'exploradora' });
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
  assert.equal(state.profile.character, 'guardabosques');
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
  const b = P.createProfile({ name: 'B', character: 'exploradora' });
  assert.equal(b.state.pet.species, 'chispa');
  P.switchProfile(a.id);
  assert.equal(P.boot().state.pet.species, 'marea');        // cada perfil conserva su elección
});

test('nombre de mascota por perfil: cada perfil guarda el suyo', async () => {
  store.clear();
  const a = P.boot();
  G.setPetName(a.state, 'Brasa');
  P.saveProfileState(a.id, a.state);
  const b = P.createProfile({ name: 'B', character: 'exploradora' });
  assert.equal(G.petCustomName(b.state), '');
  G.setPetName(b.state, 'Fuego');
  P.saveProfileState(b.id, b.state);
  P.switchProfile(a.id);
  assert.equal(G.petCustomName(P.boot().state), 'Brasa');
  P.switchProfile(b.id);
  assert.equal(G.petCustomName(P.boot().state), 'Fuego');
});
