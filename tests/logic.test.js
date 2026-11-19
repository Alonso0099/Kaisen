// Pruebas de la lógica del juego. Ejecutar con: npm test  (o: node --test tests/)
import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../js/logic.js';

const DAY = 86400000;
const noon = (y, m, d) => new Date(y, m - 1, d, 12).getTime();

test('curva de XP crece en cada nivel', () => {
  assert.equal(L.xpToNext(1), 100);
  assert.equal(L.xpToNext(2), 283);
  assert.equal(L.xpToNext(4), 800);
  for (let l = 1; l < 60; l++) assert.ok(L.xpToNext(l + 1) > L.xpToNext(l));
});

test('levelFromXp: límites exactos', () => {
  assert.deepEqual(L.levelFromXp(0), { level: 1, into: 0, needed: 100, pct: 0 });
  assert.equal(L.levelFromXp(99).level, 1);
  assert.equal(L.levelFromXp(100).level, 2);
  assert.equal(L.levelFromXp(100).into, 0);
  assert.equal(L.levelFromXp(382).level, 2);   // 100 + 283 - 1
  assert.equal(L.levelFromXp(383).level, 3);
  assert.equal(L.levelFromXp(-50).level, 1);
});

test('levelFromXp y totalXpForLevel son inversos', () => {
  for (let lvl = 1; lvl < 40; lvl++) {
    const t = L.totalXpForLevel(lvl);
    assert.equal(L.levelFromXp(t).level, lvl);
    assert.equal(L.levelFromXp(t).into, 0);
    if (t > 0) assert.equal(L.levelFromXp(t - 1).level, lvl - 1);
  }
});

test('stats usan su propia curva', () => {
  assert.equal(L.statXpToNext(1), 60);
  assert.equal(L.levelFromXp(60, L.statXpToNext).level, 2);
});

test('rangos con letra', () => {
  assert.equal(L.rankFor(1).letter, 'E');
  assert.equal(L.rankFor(5).letter, 'C');
  assert.equal(L.rankFor(20).letter, 'S');
});

test('rangos', () => {
  assert.equal(L.rankFor(1).title, 'Novato');
  assert.equal(L.rankFor(4).title, 'Aprendiz');
  assert.equal(L.rankFor(10).title, 'Élite');
  assert.equal(L.rankFor(99).title, 'Mito');
});

test('registrar actividad suma XP general y a su stat', () => {
  const s = L.defaultState();
  L.logActivity(s, 'def-gym');
  L.logActivity(s, 'def-leer');
  const p = L.deriveProfile(s);
  assert.equal(p.totalXp, 45);
  assert.equal(p.stats.fuerza.xp, 30);
  assert.equal(p.stats.sabiduria.xp, 15);
  assert.equal(p.stats.hogar.xp, 0);
});

test('bono opcional de mountain bike', () => {
  const s = L.defaultState();
  const e = L.logActivity(s, 'def-mtb', { bonus: true });
  assert.equal(e.xp, 50);
  assert.match(e.name, /Ruta larga/);
  const e2 = L.logActivity(s, 'def-gym', { bonus: true }); // sin bono definido
  assert.equal(e2.xp, 30);
});

test('deshacer resta la XP', () => {
  const s = L.defaultState();
  const e = L.logActivity(s, 'def-tarea');
  L.logActivity(s, 'def-gym');
  L.undoEntry(s, e.id);
  assert.equal(L.deriveProfile(s).totalXp, 30);
  assert.equal(L.undoEntry(s, 'no-existe'), null);
});

test('misiones únicas: completar y deshacer', () => {
  const s = L.defaultState();
  s.quests.push({ id: 'q1', name: 'Arreglar la bici', stat: 'hogar', xp: 60 });
  const e = L.completeQuest(s, 'q1');
  assert.equal(s.quests.length, 0);
  assert.equal(s.questHistory.length, 1);
  assert.equal(L.deriveProfile(s).totalXp, 60);
  assert.ok(L.unlockedAchievements(s).includes('quest-1'));
  L.undoEntry(s, e.id);
  assert.equal(s.quests.length, 1);
  assert.equal(s.questHistory.length, 0);
  assert.equal(s.quests[0].completedAt, undefined);
});

test('racha: días seguidos, viva si registraste ayer, se rompe con un hueco', () => {
  const s = L.defaultState();
  const today = noon(2026, 11, 16);
  for (const d of [16, 15, 14, 12, 11, 10, 9]) L.logActivity(s, 'def-gym', { now: noon(2026, 11, d) });
  let st = L.computeStreak(s.log, today);
  assert.equal(st.current, 3);
  assert.equal(st.best, 4);
  assert.equal(st.loggedToday, true);
  // Al día siguiente sin registrar: sigue en 3 (aún puede mantenerla)
  st = L.computeStreak(s.log, today + DAY);
  assert.equal(st.current, 3);
  assert.equal(st.loggedToday, false);
  // Dos días después: se rompió
  assert.equal(L.computeStreak(s.log, today + 2 * DAY).current, 0);
});

test('racha cruza fin de mes', () => {
  const s = L.defaultState();
  for (const [m, d] of [[10, 30], [10, 31], [11, 1]]) L.logActivity(s, 'def-gym', { now: noon(2026, m, d) });
  assert.equal(L.computeStreak(s.log, noon(2026, 11, 1)).current, 3);
});

test('logros: 7 días de racha, libro, primer nivel, equilibrio', () => {
  const s = L.defaultState();
  const start = noon(2026, 11, 1);
  for (let i = 0; i < 7; i++) L.logActivity(s, 'def-cocinar', { now: start + i * DAY });
  let ids = L.unlockedAchievements(s);
  assert.ok(ids.includes('streak-7'));
  assert.ok(!ids.includes('book'));
  assert.ok(!ids.includes('level-2'));     // 70 XP
  L.logActivity(s, 'def-terminar-libro', { now: start + 7 * DAY });
  ids = L.unlockedAchievements(s);
  assert.ok(ids.includes('book'));
  assert.ok(ids.includes('level-2'));      // 170 XP
  assert.ok(!ids.includes('all-stats'));
  for (const a of ['def-gym', 'def-hike', 'def-estudio', 'def-tiempo']) L.logActivity(s, a);
  assert.ok(L.unlockedAchievements(s).includes('all-stats'));
});

test('borrar una actividad no rompe el historial', () => {
  const s = L.defaultState();
  L.logActivity(s, 'def-gym');
  s.activities = s.activities.filter(a => a.id !== 'def-gym');
  assert.equal(L.deriveProfile(s).totalXp, 30);
});

test('clampXp respeta 5–50', () => {
  assert.equal(L.clampXp(1), 5);
  assert.equal(L.clampXp(80), 50);
  assert.equal(L.clampXp('22'), 22);
  assert.equal(L.clampXp('abc'), 5);
  assert.equal(L.clampXp(150, 200), 150);
});

test('exportar → importar conserva los datos', () => {
  const s = L.defaultState();
  L.logActivity(s, 'def-gym');
  s.profile.name = 'Kenta';
  s.profile.character = 'exploradora';
  const json = JSON.parse(JSON.stringify(L.exportPayload(s)));
  const back = L.validateImport(json);
  assert.equal(back.log.length, 1);
  assert.equal(back.profile.name, 'Kenta');
  assert.equal(back.profile.character, 'exploradora');
  assert.equal(L.deriveProfile(back).totalXp, 30);
  assert.throws(() => L.validateImport({ foo: 1 }));
  assert.throws(() => L.validateImport(null));
});

test('simulación: un año de uso típico da un nivel razonable', () => {
  const s = L.defaultState();
  const start = noon(2026, 1, 1);
  const rot = ['def-gym', 'def-leer', 'def-estudio', 'def-cocinar', 'def-tiempo'];
  for (let d = 0; d < 365; d++) for (let k = 0; k < 3; k++) L.logActivity(s, rot[(d + k) % 5], { now: start + d * DAY });
  const p = L.deriveProfile(s, start + 364 * DAY);
  // ~70 XP/día → ~25 000 XP/año
  assert.ok(p.level >= 12 && p.level <= 25, `nivel ${p.level}`);
  assert.equal(p.streak.current, 365);
});

test('respaldos viejos (sin compañera) reciben los valores por defecto', () => {
  const s = L.defaultState();
  delete s.partner;
  s.profile = { name: 'Viejo' };
  const back = L.validateImport(JSON.parse(JSON.stringify(L.exportPayload(s))));
  assert.equal(back.profile.character, 'guardabosques'); // personaje por defecto
  assert.equal(back.partner, undefined);
  assert.equal(back.profile.name, 'Viejo');
});

// ---------------- Segunda etapa ----------------

test('weekKey: la semana empieza el lunes', () => {
  // 16 nov 2026 es lunes
  assert.equal(L.weekKey(noon(2026, 11, 16)), '2026-11-16');
  assert.equal(L.weekKey(noon(2026, 11, 22)), '2026-11-16'); // domingo
  assert.equal(L.weekKey(noon(2026, 11, 23)), '2026-11-23'); // lunes siguiente
  assert.equal(L.weekKey(noon(2027, 1, 1)), '2026-12-28');   // cruza de año
});

test('misiones semanales: estables dentro de la semana y progresan', () => {
  const s = L.defaultState();
  const mon = noon(2026, 11, 16);
  const a = L.weeklyMissions(s, mon), b = L.weeklyMissions(s, mon + 5 * DAY);
  assert.equal(a.length, 3);
  assert.deepEqual(a.map(m => m.title), b.map(m => m.title));
  assert.ok(a.every(m => m.progress === 0 && !m.done && !m.claimed));
  const focus = a[0].stat;
  const act = s.activities.find(x => x.stat === focus);
  for (let i = 0; i < 3; i++) L.logActivity(s, act.id, { now: mon + i * DAY });
  const after = L.weeklyMissions(s, mon + 3 * DAY);
  assert.equal(after[0].progress, 3);
  assert.ok(after[0].done);
  // Lo de la semana pasada no cuenta
  assert.ok(L.weeklyMissions(s, mon + 7 * DAY).every(m => m.progress === 0));
});

test('misiones semanales: reclamar da XP una sola vez y se puede deshacer', () => {
  const s = L.defaultState();
  const mon = noon(2026, 11, 16);
  const m = L.weeklyMissions(s, mon)[0];
  assert.throws(() => L.claimWeekly(s, 'a', mon)); // aún no cumplida
  const act = s.activities.find(x => x.stat === m.stat);
  for (let i = 0; i < 3; i++) L.logActivity(s, act.id, { now: mon + i * DAY });
  const base = L.deriveProfile(s, mon + 3 * DAY).totalXp;
  const e = L.claimWeekly(s, 'a', mon + 3 * DAY);
  assert.equal(e.xp, 40);
  assert.equal(e.stat, m.stat);
  assert.equal(L.deriveProfile(s, mon + 3 * DAY).totalXp, base + 40);
  assert.throws(() => L.claimWeekly(s, 'a', mon + 3 * DAY)); // ya reclamada
  assert.ok(L.weeklyMissions(s, mon + 3 * DAY)[0].claimed);
  L.undoEntry(s, e.id);
  assert.ok(!L.weeklyMissions(s, mon + 3 * DAY)[0].claimed);
});

test('los premios no cuentan para racha, misiones ni jefe', () => {
  const s = L.defaultState();
  const mon = noon(2026, 11, 16);
  const m = L.weeklyMissions(s, mon)[0];
  const act = s.activities.find(x => x.stat === m.stat);
  for (let i = 0; i < 3; i++) L.logActivity(s, act.id, { now: mon });
  const before = { boss: L.bossStatus(s, mon + 2 * DAY).damage, xp: L.weeklyMissions(s, mon + 2 * DAY)[1].progress };
  L.claimWeekly(s, 'a', mon + 2 * DAY); // se reclama dos días después
  assert.equal(L.bossStatus(s, mon + 2 * DAY).damage, before.boss);
  assert.equal(L.weeklyMissions(s, mon + 2 * DAY)[1].progress, before.xp);
  assert.equal(L.computeStreak(s.log, mon + 2 * DAY).current, 0); // reclamar no mantiene la racha
  assert.equal(L.petStatus(s, mon + 2 * DAY).activeDays, 1);
});

test('premio general va a la stat más débil', () => {
  const s = L.defaultState();
  const mon = noon(2026, 11, 16);
  for (const id of ['def-gym', 'def-hike', 'def-estudio', 'def-leer', 'def-tiempo']) for (let i = 0; i < 3; i++) L.logActivity(s, id, { now: mon + i * DAY });
  assert.equal(L.weakestStat(s.log), 'hogar');
  const e = L.claimWeekly(s, 'b', mon + 3 * DAY); // 200–300 XP ya ganados
  assert.equal(e.stat, 'hogar');
});

test('jefe: uno por mes, la debilidad hace doble daño', () => {
  const s = L.defaultState();
  const t = noon(2026, 11, 1);
  const b0 = L.bossStatus(s, t);
  assert.equal(b0.damage, 0);
  assert.equal(b0.hp, 1100); // nivel 1, mes completo
  assert.ok(!b0.defeated);
  const weakAct = s.activities.find(a => a.stat === b0.weak);
  const otherAct = s.activities.find(a => a.stat !== b0.weak);
  L.logActivity(s, weakAct.id, { now: t });
  L.logActivity(s, otherAct.id, { now: t });
  assert.equal(L.bossStatus(s, t).damage, weakAct.xp * 2 + otherAct.xp);
  // Mismo jefe todo el mes, otro distinto el mes siguiente
  assert.equal(L.bossStatus(s, noon(2026, 11, 30)).id, b0.id);
  assert.notEqual(L.bossStatus(s, noon(2026, 12, 1)).id, b0.id);
  assert.equal(L.bossStatus(s, noon(2026, 12, 1)).damage, 0);
});

test('jefe: derrotar, reclamar una vez, trofeo y logro', () => {
  const s = L.defaultState();
  const t = noon(2026, 11, 1);
  assert.throws(() => L.claimBoss(s, t));
  for (let d = 0; d < 20; d++) for (const id of ['def-gym', 'def-tarea']) L.logActivity(s, id, { now: t + d * DAY });
  const b = L.bossStatus(s, t + 20 * DAY);
  assert.ok(b.defeated);
  assert.equal(b.hpLeft, 0);
  const xp = L.deriveProfile(s, t + 20 * DAY).totalXp;
  const e = L.claimBoss(s, t + 20 * DAY);
  assert.equal(L.deriveProfile(s, t + 20 * DAY).totalXp, xp + L.BOSS_REWARD_XP);
  assert.throws(() => L.claimBoss(s, t + 20 * DAY));
  assert.equal(L.bossTrophies(s).length, 1);
  assert.ok(L.unlockedAchievements(s).includes('boss-1'));
  L.undoEntry(s, e.id);
  assert.equal(L.bossTrophies(s).length, 0);
  assert.ok(!L.bossStatus(s, t + 20 * DAY).claimed);
});

test('jefe: si empiezas a mitad de mes, tiene menos vida', () => {
  const s = L.defaultState();
  L.logActivity(s, 'def-gym', { now: noon(2026, 11, 16) }); // día 16 de 30 → quedan 15 días
  assert.equal(L.bossStatus(s, noon(2026, 11, 16)).hp, 550);
});

test('jefe: su vida crece con tu nivel y tiene tope', () => {
  const s = L.defaultState();
  for (let d = 0; d < 300; d++) L.logActivity(s, 'def-terminar-libro', { now: noon(2026, 1, 1) + d * DAY });
  assert.equal(L.bossStatus(s, noon(2026, 12, 1)).hp, 3000);
});

test('mascota: crece con los días activos y no retrocede', () => {
  const s = L.defaultState();
  const t = noon(2026, 11, 1);
  assert.equal(L.petStatus(s, t).stage, 0);
  assert.equal(L.petStatus(s, t).mood, 'egg');
  for (let d = 0; d < 7; d++) L.logActivity(s, 'def-gym', { now: t + d * DAY });
  let p = L.petStatus(s, t + 6 * DAY);
  assert.equal(p.stageName, 'Cachorro');
  assert.equal(p.mood, 'happy');
  assert.equal(p.daysToNext, 14);
  assert.equal(L.petStatus(s, t + 7 * DAY).mood, 'hungry');
  p = L.petStatus(s, t + 20 * DAY);
  assert.equal(p.mood, 'sad');
  assert.equal(p.stageName, 'Cachorro'); // triste, pero no retrocede
  for (let d = 30; d < 130; d++) L.logActivity(s, 'def-gym', { now: t + d * DAY });
  p = L.petStatus(s, t + 129 * DAY);
  assert.equal(p.stageName, 'Legendario');
  assert.equal(p.pct, 1);
  assert.ok(L.unlockedAchievements(s).includes('pet-adult'));
});

// ---------------- Tercera etapa ----------------

test('retos de resistencia: una vez al día y golpe crítico x3 a su jefe', () => {
  const s = L.defaultState();
  const t = noon(2026, 11, 2); // noviembre 2026 → Scrollax (distracción)
  const boss = L.bossStatus(s, t);
  assert.equal(boss.id, 'distraccion');
  const e = L.logActivity(s, 'res-pantallas', { now: t });
  assert.equal(e.resist, 'distraccion');
  assert.equal(L.bossStatus(s, t).damage, 15 * 3);
  assert.throws(() => L.logActivity(s, 'res-pantallas', { now: t + 3600e3 }), /hoy/);
  L.logActivity(s, 'res-pantallas', { now: t + DAY }); // al día siguiente sí
  // Un reto de OTRO jefe hace daño normal (o x2 si coincide la stat débil)
  const before = L.bossStatus(s, t + DAY).damage;
  L.logActivity(s, 'res-alarma', { now: t + DAY }); // fuerza, contra Pereza
  assert.equal(L.bossStatus(s, t + DAY).damage, before + 10);
});

test('migración: respaldos anteriores reciben retos, tienda y escudos', () => {
  const s = L.defaultState();
  const old = JSON.parse(JSON.stringify(L.exportPayload(s)));
  old.data.schema = 2;
  old.data.activities = old.data.activities.filter(a => !a.resist);
  delete old.data.rewards; delete old.data.purchases; delete old.data.shieldDays; delete old.data.equipped;
  const back = L.validateImport(old);
  assert.equal(back.activities.filter(a => a.resist).length, 6);
  assert.equal(back.rewards.length, 4);
  assert.deepEqual(back.purchases, []);
  assert.equal(back.equipped.sky, 'sky-default');
  // Una vez migrado, si borras un reto no vuelve a aparecer
  back.activities = back.activities.filter(a => a.id !== 'res-alarma');
  const again = L.validateImport(JSON.parse(JSON.stringify(L.exportPayload(back))));
  assert.equal(again.activities.filter(a => a.resist).length, 5);
});

test('monedas: se ganan con registros, cofre, premios y logros', () => {
  const s = L.defaultState();
  const t = noon(2026, 11, 2);
  assert.equal(L.wallet(s, t).balance, 0);
  assert.equal(L.wallet(s, t).chestToday, null);
  L.logActivity(s, 'def-gym', { now: t }); // 30 XP → 6 monedas
  const w = L.wallet(s, t);
  const chest = L.chestFor(L.dayKey(t));
  assert.ok(chest >= 5 && chest <= 50);
  assert.equal(w.chestToday, chest);
  assert.equal(w.earned, 6 + chest + 25); // +25 por el logro "Primer paso"
  L.logActivity(s, 'def-gym', { now: t + 3600e3 });
  assert.equal(L.wallet(s, t).earned, 12 + chest + 25); // el cofre es uno por día
  assert.equal(L.chestFor('2026-11-02'), L.chestFor('2026-11-02')); // estable
});

test('tienda: comprar no baja la XP y no deja gastar de más', () => {
  const s = L.defaultState();
  const t = noon(2026, 11, 2);
  assert.throws(() => L.buyReward(s, 'rw-antojo', t), /alcanzan/);
  for (let d = 0; d < 10; d++) for (const id of ['def-gym', 'def-tarea', 'def-tiempo']) L.logActivity(s, id, { now: t + d * DAY });
  const now = t + 9 * DAY;
  const xp = L.deriveProfile(s, now).totalXp, bal = L.wallet(s, now).balance;
  assert.ok(bal >= 250, `saldo ${bal}`);
  const c = L.buyReward(s, 'rw-antojo', now);
  assert.equal(L.wallet(s, now).balance, bal - 100);
  assert.equal(L.deriveProfile(s, now).totalXp, xp);
  assert.equal(c.used, false);
  L.useCoupon(s, c.id, now);
  assert.equal(s.purchases[0].used, true);
  assert.equal(L.wallet(s, now).balance, bal - 100); // usar el cupón no cobra otra vez
});

test('tienda: cosméticos se compran una vez y se equipan', () => {
  const s = L.defaultState();
  const t = noon(2026, 11, 2);
  assert.ok(L.owns(s, 'sky-default'));
  assert.ok(!L.owns(s, 'sky-noche'));
  assert.throws(() => L.equip(s, 'sky', 'sky-noche'));
  for (let d = 0; d < 20; d++) for (const id of ['def-gym', 'def-tarea', 'def-tiempo']) L.logActivity(s, id, { now: t + d * DAY });
  const now = t + 19 * DAY;
  L.buyCosmetic(s, 'sky-noche', now);
  assert.throws(() => L.buyCosmetic(s, 'sky-noche', now), /Ya lo tienes/);
  L.equip(s, 'sky', 'sky-noche');
  L.buyCosmetic(s, 't-imparable', now);
  L.equip(s, 'title', 't-imparable');
  assert.equal(L.titleName(s), 'El Imparable');
  L.equip(s, 'title', null);
  assert.equal(L.titleName(s), null);
});

test('escudo de racha: salva un día perdido, máximo 2 guardados', () => {
  const s = L.defaultState();
  const t = noon(2026, 11, 2);
  for (let d = 0; d < 20; d++) for (const id of ['def-gym', 'def-tarea', 'def-tiempo']) L.logActivity(s, id, { now: t + d * DAY });
  const last = t + 19 * DAY;
  L.buyShield(s, last); L.buyShield(s, last);
  assert.throws(() => L.buyShield(s, last), /Solo puedes/);
  assert.equal(L.shieldsLeft(s), 2);
  // Sin faltar ningún día no se gasta nada
  assert.deepEqual(L.applyShields(s, last + DAY), []);
  // Falta 1 día (día 21) y abres la app el día 22
  const saved = L.applyShields(s, last + 2 * DAY);
  assert.equal(saved.length, 1);
  assert.equal(L.shieldsLeft(s), 1);
  let st = L.deriveProfile(s, last + 2 * DAY).streak;
  assert.equal(st.current, 21);            // 20 días + el salvado
  assert.equal(st.loggedToday, false);     // el escudo no cuenta como registrar hoy
  assert.deepEqual(L.applyShields(s, last + 2 * DAY), []); // no se gasta dos veces
  assert.equal(L.petStatus(s, last + 2 * DAY).activeDays, 20); // la mascota no crece con escudos
});

test('escudo de racha: si el hueco es mayor que tus escudos, no se gasta ninguno', () => {
  const s = L.defaultState();
  const t = noon(2026, 11, 2);
  for (let d = 0; d < 20; d++) for (const id of ['def-gym', 'def-tarea', 'def-tiempo']) L.logActivity(s, id, { now: t + d * DAY });
  const last = t + 19 * DAY;
  L.buyShield(s, last);
  assert.deepEqual(L.applyShields(s, last + 3 * DAY), []); // faltaron 2 días, hay 1 escudo
  assert.equal(L.shieldsLeft(s), 1);
  assert.equal(L.deriveProfile(s, last + 3 * DAY).streak.current, 0);
});

// ---------------- Nombre de la mascota ----------------

test('nombre de mascota: vacío por defecto, se guarda por especie y se puede borrar', () => {
  const s = L.defaultState();
  assert.equal(L.petCustomName(s), '');
  L.setPetName(s, '  Brasa  ');
  assert.equal(L.petCustomName(s), 'Brasa');
  s.pet.species = 'marea';
  assert.equal(L.petCustomName(s), '');            // otra especie, otro nombre
  L.setPetName(s, 'Ola');
  s.pet.species = 'chispa';
  assert.equal(L.petCustomName(s), 'Brasa');
  L.setPetName(s, '');                              // vacío = vuelve al nombre de la especie
  assert.equal(L.petCustomName(s), '');
  assert.equal(L.setPetName(s, 'NombreDemasiadoLargoParaCaber').length, L.PET_NAME_MAX);
});

test('nombre de mascota: se pregunta una sola vez al eclosionar', () => {
  const s = L.defaultState();
  assert.equal(L.shouldAskPetName(s, 0, 1), true);
  assert.equal(L.shouldAskPetName(s, 1, 2), false); // solo al salir del huevo
  L.markPetNameAsked(s);                             // "Omitir"
  assert.equal(L.shouldAskPetName(s, 0, 1), false);
  const t = L.defaultState();
  L.setPetName(t, 'Ya tengo nombre');
  assert.equal(L.shouldAskPetName(t, 0, 1), false);
});

test('nombre de mascota: migra el formato viejo y descarta el "Chispa" automático', () => {
  const old = L.defaultState();
  old.pet = { name: 'Chispa' };                      // nombre que ponía la app sola
  let back = L.validateImport(JSON.parse(JSON.stringify(L.exportPayload(old))));
  assert.equal(L.petCustomName(back), '');
  assert.equal(back.pet.name, undefined);
  assert.equal(back.pet.species, 'chispa');
  old.pet = { name: 'Brasa', species: 'chispa' };    // nombre elegido por el jugador
  back = L.validateImport(JSON.parse(JSON.stringify(L.exportPayload(old))));
  assert.equal(L.petCustomName(back), 'Brasa');
  // ida y vuelta conserva nombres y "ya preguntado"
  L.markPetNameAsked(back);
  const again = L.validateImport(JSON.parse(JSON.stringify(L.exportPayload(back))));
  assert.equal(L.petCustomName(again), 'Brasa');
  assert.equal(again.pet.asked.chispa, true);
});

// ---------------- Equipo e inventario ----------------
import * as Gear from '../js/gear.js';

const rich = () => { // perfil con monedas de sobra
  const s = L.defaultState();
  const t0 = noon(2026, 10, 1);
  for (let d = 0; d < 30; d++) for (const id of ['def-gym', 'def-tarea', 'def-tiempo']) L.logActivity(s, id, { now: t0 + d * DAY });
  return s;
};

test('equipo: comprar, equipar y ganar % extra solo en su stat', () => {
  const s = rich();
  const now = noon(2026, 11, 2);
  assert.throws(() => Gear.equipItem(s, 'casco', 'casco-cuero'), /Aún no/);
  const bal = L.wallet(s, now).balance;
  L.buyItem(s, 'casco-cuero', now);                       // fuerza +5 %
  assert.equal(L.wallet(s, now).balance, bal - 150);
  assert.throws(() => L.buyItem(s, 'casco-cuero', now), /Ya la tienes/);
  Gear.equipItem(s, 'casco', 'casco-cuero');
  assert.equal(Gear.gearPct(s, 'fuerza'), 5);
  assert.equal(Gear.gearPct(s, 'intelecto'), 0);
  const e = L.logActivity(s, 'def-gym', { now });         // 30 XP → +2 (5 % redondeado)
  assert.equal(e.xp, 32);
  assert.equal(e.gearXp, 2);
  const e2 = L.logActivity(s, 'def-estudio', { now });    // otra stat: sin extra
  assert.equal(e2.xp, 25);
  assert.equal(e2.gearXp, undefined);
});

test('equipo: tipo de espacio, accesorios dobles y tope de bonus', () => {
  const s = rich();
  const now = noon(2026, 11, 2);
  L.buyItem(s, 'anillo-vinculo', now); L.buyItem(s, 'capa-caminante', now);
  assert.throws(() => Gear.equipItem(s, 'casco', 'anillo-vinculo'), /no va en ese espacio/);
  Gear.equipItem(s, 'acc1', 'anillo-vinculo');
  Gear.equipItem(s, 'acc2', 'anillo-vinculo');            // la misma pieza se mueve, no se duplica
  assert.equal(s.equipped.gear.acc1, undefined);
  assert.equal(s.equipped.gear.acc2, 'anillo-vinculo');
  Gear.equipItem(s, 'capa', 'capa-caminante');
  assert.equal(Gear.gearPct(s, 'vinculo'), 15);
  // tope: sumando botín épico de vínculo (+15) y todo (+5) no pasa de 30
  s.log.push({ id: 'b1', ts: now, type: 'boss', refId: '2026-10:soledad', name: 'x', stat: 'vinculo', xp: 150 });
  s.log.push({ id: 'b2', ts: now, type: 'boss', refId: '2026-09:pereza', name: 'x', stat: 'fuerza', xp: 150 });
  Gear.equipItem(s, 'capa', 'capa-lazo');                 // reemplaza a la capa común
  Gear.equipItem(s, 'armadura', 'cota-constancia');
  assert.equal(Gear.gearPct(s, 'vinculo'), 30);           // 10 + 15 + 5 = 30 (tope)
  assert.equal(Gear.gearPct(s, 'hogar'), 5);              // la cota da a todo
  Gear.equipItem(s, 'capa', null);
  assert.equal(s.equipped.gear.capa, undefined);
});

test('equipo: los jefes sueltan su pieza; si deshaces el premio, la pieza se va', () => {
  const s = L.defaultState();
  assert.equal(L.bossDrop('estres').id, 'yelmo-calma');
  assert.ok(Gear.ITEMS.filter(i => i.boss).length === 6);
  const e = { id: 'b', ts: Date.now(), type: 'boss', refId: '2026-11:estres', name: 'x', stat: 'resistencia', xp: 150 };
  s.log.push(e);
  assert.ok(Gear.ownsItem(s, 'yelmo-calma'));
  Gear.equipItem(s, 'casco', 'yelmo-calma');
  assert.equal(Gear.gearPct(s, 'resistencia'), 15);
  L.undoEntry(s, 'b');
  assert.ok(!Gear.ownsItem(s, 'yelmo-calma'));
  assert.equal(Gear.gearPct(s, 'resistencia'), 0);        // equipada pero ya no la tiene: no cuenta
  assert.throws(() => L.buyItem(s, 'yelmo-calma'), /no se vende/);
});

test('equipo: deshacer un registro con bonus quita exactamente lo ganado', () => {
  const s = rich();
  const now = noon(2026, 11, 2);
  L.buyItem(s, 'guanteletes', now); Gear.equipItem(s, 'guantes', 'guanteletes');
  const before = L.deriveProfile(s, now).totalXp;
  const e = L.logActivity(s, 'def-gym', { now });
  assert.equal(L.deriveProfile(s, now).totalXp, before + 33);
  Gear.equipItem(s, 'guantes', null);                     // quitarse el equipo no cambia lo ya ganado
  assert.equal(L.deriveProfile(s, now).totalXp, before + 33);
  L.undoEntry(s, e.id);
  assert.equal(L.deriveProfile(s, now).totalXp, before);
});

test('equipo: respaldos viejos reciben gear vacío y el equipo sobrevive a exportar', () => {
  const s = rich();
  const old = JSON.parse(JSON.stringify(L.exportPayload(s)));
  delete old.data.equipped.gear;
  assert.deepEqual(L.validateImport(old).equipped.gear, {});
  L.buyItem(s, 'botas-viaje'); Gear.equipItem(s, 'botas', 'botas-viaje');
  const back = L.validateImport(JSON.parse(JSON.stringify(L.exportPayload(s))));
  assert.equal(back.equipped.gear.botas, 'botas-viaje');
  assert.equal(Gear.gearPct(back, 'resistencia'), 5);
});
