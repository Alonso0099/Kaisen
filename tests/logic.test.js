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

test('racha: días seguidos con un día de gracia por semana; dos días seguidos sin registrar la rompen', () => {
  const s = L.defaultState();
  const today = noon(2026, 11, 16);
  for (const d of [16, 15, 14, 12, 11, 10, 9]) L.logActivity(s, 'def-gym', { now: noon(2026, 11, d) });
  let st = L.computeStreak(s.log, today);
  assert.equal(st.current, 7);              // el 13 sin registrar se perdona (gracia de esa semana)
  assert.deepEqual(st.graceDays, ['2026-11-13']);
  assert.equal(st.best, 7);
  assert.equal(st.loggedToday, true);
  // Al día siguiente sin registrar: sigue viva
  st = L.computeStreak(s.log, today + DAY);
  assert.equal(st.current, 7);
  assert.equal(st.loggedToday, false);
  // Dos días después: el 17 también se perdona (es otra semana)
  assert.equal(L.computeStreak(s.log, today + 2 * DAY).current, 7);
  // Tres días después (17 y 18 sin registrar): se rompe
  assert.equal(L.computeStreak(s.log, today + 3 * DAY).current, 0);
  // Dos huecos sueltos en la misma semana: solo se perdona uno
  const s2 = L.defaultState();
  for (const d of [20, 18, 16]) L.logActivity(s2, 'def-gym', { now: noon(2026, 11, d) });   // lun 16 – dom 22
  assert.equal(L.computeStreak(s2.log, noon(2026, 11, 20)).current, 2);
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
  s.profile.character = 'relampago-f';
  const json = JSON.parse(JSON.stringify(L.exportPayload(s)));
  const back = L.validateImport(json);
  assert.equal(back.log.length, 1);
  assert.equal(back.profile.name, 'Kenta');
  assert.equal(back.profile.character, 'relampago-f');
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
  assert.equal(back.profile.character, 'titan-m'); // personaje por defecto
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
  assert.equal(L.computeStreak(s.log, mon + 2 * DAY).current, 1); // solo el lunes (el martes se perdona); reclamar no suma
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
  assert.equal(L.petStatus(s, t + 7 * DAY).mood, 'rest');   // nunca "hambre" ni "triste"
  p = L.petStatus(s, t + 20 * DAY);
  assert.equal(p.mood, 'rest');
  L.logActivity(s, 'def-gym', { now: t + 20 * DAY });       // vuelve tras varios días
  assert.equal(L.petStatus(s, t + 20 * DAY).mood, 'welcome');
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
  assert.equal(back.activities.filter(a => a.resist).length, 10);
  assert.equal(back.rewards.length, 4);
  assert.deepEqual(back.purchases, []);
  assert.equal(back.equipped.sky, undefined);
  // Una vez migrado, si borras un reto no vuelve a aparecer
  back.activities = back.activities.filter(a => a.id !== 'res-alarma');
  const again = L.validateImport(JSON.parse(JSON.stringify(L.exportPayload(back))));
  assert.equal(again.activities.filter(a => a.resist).length, 9);
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
  assert.throws(() => L.buyReward(s, 'rw-cafe', t), /alcanzan/);
  for (let d = 0; d < 10; d++) for (const id of ['def-gym', 'def-tarea', 'def-tiempo']) L.logActivity(s, id, { now: t + d * DAY });
  const now = t + 9 * DAY;
  const xp = L.deriveProfile(s, now).totalXp, bal = L.wallet(s, now).balance;
  assert.ok(bal >= 250, `saldo ${bal}`);
  const c = L.buyReward(s, 'rw-cafe', now);
  assert.equal(L.wallet(s, now).balance, bal - 120);
  assert.equal(L.deriveProfile(s, now).totalXp, xp);
  assert.equal(c.used, false);
  L.useCoupon(s, c.id, now);
  assert.equal(s.purchases[0].used, true);
  assert.equal(L.wallet(s, now).balance, bal - 120); // usar el cupón no cobra otra vez
});

test('tienda: títulos se compran una vez y se equipan', () => {
  const s = L.defaultState();
  const t = noon(2026, 11, 2);
  assert.ok(!L.owns(s, 't-imparable'));
  assert.throws(() => L.equip(s, 'title', 't-imparable'));
  for (let d = 0; d < 20; d++) for (const id of ['def-gym', 'def-tarea', 'def-tiempo']) L.logActivity(s, id, { now: t + d * DAY });
  const now = t + 19 * DAY;
  L.buyCosmetic(s, 't-imparable', now);
  assert.throws(() => L.buyCosmetic(s, 't-imparable', now), /Ya lo tienes/);
  L.equip(s, 'title', 't-imparable');
  assert.equal(L.titleName(s), 'El Imparable');
  L.equip(s, 'title', null);
  assert.equal(L.titleName(s), null);
  assert.equal(L.SHOP.skies, undefined);                     // Ambientes retirados
});

test('Ambientes retirados: las monedas gastadas se devuelven solas', () => {
  const s = L.defaultState();
  const t = noon(2026, 11, 2);
  for (let d = 0; d < 20; d++) for (const id of ['def-gym', 'def-tarea', 'def-tiempo']) L.logActivity(s, id, { now: t + d * DAY });
  const now = t + 19 * DAY;
  const before = L.wallet(s, now).balance;
  // compra de la versión anterior
  s.purchases.push({ id: 'old', ts: now, kind: 'sky', itemId: 'sky-noche', name: 'Noche estrellada', cost: 300 });
  s.equipped.sky = 'sky-noche';
  assert.equal(L.wallet(s, now).balance, before);            // no descuenta
  assert.equal(L.skyRefund(s), 300);
  const back = L.validateImport(JSON.parse(JSON.stringify(L.exportPayload(s))));
  assert.equal(back.equipped.sky, undefined);
  assert.equal(L.wallet(back, now).balance, before);
  assert.equal(back.purchases.length, 1);                    // la compra queda en el historial
});

test('accesos rápidos: fijadas primero, luego las más usadas, sin retos', () => {
  const s = L.defaultState();
  const t = noon(2026, 11, 1);
  assert.deepEqual(L.quickActivities(s, t), []);             // perfil nuevo: nada todavía
  for (let d = 0; d < 6; d++) L.logActivity(s, 'def-leer', { now: t + d * DAY });
  for (let d = 0; d < 3; d++) L.logActivity(s, 'def-gym', { now: t + d * DAY });
  for (let d = 0; d < 3; d++) L.logActivity(s, 'def-hike', { now: t + 10 * DAY + d });   // empate con gym, más reciente
  L.logActivity(s, 'def-cocinar', { now: t });
  for (let d = 0; d < 9; d++) L.logActivity(s, 'res-alarma', { now: t + d * DAY });       // reto: no entra solo
  const now = t + 12 * DAY;
  assert.deepEqual(L.quickActivities(s, now).map(a => a.id), ['def-leer', 'def-hike', 'def-gym']);
  assert.equal(L.togglePin(s, 'def-cocinar'), true);
  assert.deepEqual(L.quickActivities(s, now).map(a => a.id), ['def-cocinar', 'def-leer', 'def-hike']);
  L.togglePin(s, 'def-tarea'); L.togglePin(s, 'def-byu-no-existe'); L.togglePin(s, 'def-mtb');
  assert.equal(s.pinned.length, 3);                          // máximo 3: suelta la más antigua
  assert.ok(!L.isPinned(s, 'def-cocinar'));
  assert.deepEqual(L.quickActivities(s, now).map(a => a.id), ['def-tarea', 'def-mtb', 'def-leer']); // la inexistente se ignora; el hueco lo llena la más usada
  L.togglePin(s, 'def-mtb');
  assert.ok(!L.isPinned(s, 'def-mtb'));
  // registros de hace más de 60 días no cuentan
  assert.deepEqual(L.quickActivities(s, t + 200 * DAY).map(a => a.id), ['def-tarea']);
  const back = L.validateImport(JSON.parse(JSON.stringify(L.exportPayload(s))));
  assert.deepEqual(back.pinned, s.pinned);
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
  // Falta 1 día: lo cubre el día de gracia, no se gasta escudo
  assert.deepEqual(L.applyShields(s, last + 2 * DAY), []);
  assert.equal(L.deriveProfile(s, last + 2 * DAY).streak.current, 20);
  // Faltan 2 días: un escudo para uno, la gracia para el otro
  const saved = L.applyShields(s, last + 3 * DAY);
  assert.equal(saved.length, 1);
  assert.equal(L.shieldsLeft(s), 1);
  let st = L.deriveProfile(s, last + 3 * DAY).streak;
  assert.equal(st.current, 21);            // 20 días + el salvado
  assert.equal(st.loggedToday, false);     // el escudo no cuenta como registrar hoy
  assert.deepEqual(L.applyShields(s, last + 3 * DAY), []); // no se gasta dos veces
  assert.equal(L.petStatus(s, last + 3 * DAY).activeDays, 20); // la mascota no crece con escudos
});

test('escudo de racha: si el hueco es mayor que tus escudos, no se gasta ninguno', () => {
  const s = L.defaultState();
  const t = noon(2026, 11, 2);
  for (let d = 0; d < 20; d++) for (const id of ['def-gym', 'def-tarea', 'def-tiempo']) L.logActivity(s, id, { now: t + d * DAY });
  const last = t + 19 * DAY;
  L.buyShield(s, last);
  assert.deepEqual(L.applyShields(s, last + 4 * DAY), []); // faltaron 3 días, hay 1 escudo (+ 1 gracia)
  assert.equal(L.shieldsLeft(s), 1);
  assert.equal(L.deriveProfile(s, last + 4 * DAY).streak.current, 0);
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
  const e = L.logActivity(s, 'def-gym', { now });         // 30 XP → +2 (5 % redondeado) + Afinidad
  assert.equal(e.gearXp, 2);
  assert.equal(e.xp, 32 + (e.guardXp || 0));
  const e2 = L.logActivity(s, 'def-estudio', { now });    // otra stat: sin extra
  assert.equal(e2.xp, 25 + (e2.guardXp || 0));
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
  assert.equal(Gear.ITEMS.filter(i => i.boss).length, 10);
  assert.ok(L.BOSSES.every(b => L.bossDrop(b.id)), 'cada jefe tiene botín');
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
  const won = 33 + (e.guardXp || 0);
  assert.equal(L.deriveProfile(s, now).totalXp, before + won);
  Gear.equipItem(s, 'guantes', null);                     // quitarse el equipo no cambia lo ya ganado
  assert.equal(L.deriveProfile(s, now).totalXp, before + won);
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

// ---------------- Evolución de guardianas ----------------
import * as Cat from '../js/catalog.js';

test('guardianas: forma según nivel de la stat (5, 10, 20, 35)', () => {
  assert.deepEqual([1, 4, 5, 9, 10, 19, 20, 34, 35, 60].map(Cat.guardianTier), [1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  assert.ok(Object.values(Cat.GUARDIANS).every(g => g.name && g.phrase));
});

test('guardianas: se anuncia solo la forma más alta y nunca dos veces', () => {
  const lv = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { level: v }]));
  // fuerza salta de nivel 4 a 12 → pasa por las formas 2 y 3: solo se anuncia la 3
  let seen = {};
  let evo = Cat.guardianEvolutions(lv({ fuerza: 12, hogar: 3 }), seen);
  assert.deepEqual(evo, [{ stat: 'fuerza', tier: 3 }]);
  seen = { fuerza: 3 };
  assert.deepEqual(Cat.guardianEvolutions(lv({ fuerza: 12 }), seen), []);   // recargar: nada
  assert.deepEqual(Cat.guardianEvolutions(lv({ fuerza: 8 }), seen), []);    // deshacer y bajar: nada
  assert.deepEqual(Cat.guardianEvolutions(lv({ fuerza: 20 }), seen), [{ stat: 'fuerza', tier: 4 }]);
  // al abrir la app con progreso viejo, se marca todo como visto
  const synced = Cat.syncGuardianSeen({}, lv({ fuerza: 22, intelecto: 6 }));
  assert.equal(synced.fuerza, 4); assert.equal(synced.intelecto, 2); assert.equal(synced.hogar, 1);
  assert.deepEqual(Cat.guardianEvolutions(lv({ fuerza: 22, intelecto: 6 }), synced), []);
});

test('guardianas: guardianSeen sobrevive a exportar/importar', () => {
  const s = L.defaultState();
  s.guardianSeen = { fuerza: 3 };
  const back = L.validateImport(JSON.parse(JSON.stringify(L.exportPayload(s))));
  assert.deepEqual(back.guardianSeen, { fuerza: 3 });
  const old = JSON.parse(JSON.stringify(L.exportPayload(s)));
  delete old.data.guardianSeen;
  assert.deepEqual(L.validateImport(old).guardianSeen, {});
});

// ---------------- Rotación de jefes por etapas (T-01) ----------------

test('jefes: la rotación de los 6 originales no cambia', () => {
  // misma fórmula de siempre: (año*12 + mes-1) % 6
  const order = ['pereza', 'procrastinacion', 'desorden', 'estres', 'distraccion', 'soledad'];
  for (let i = 0; i < 11; i++) {          // enero a noviembre de 2026 (antes de la etapa nueva)
    const d = new Date(2026, i, 15);
    const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    assert.equal(L.bossForMonth(mk).id, order[(d.getFullYear() * 12 + d.getMonth()) % 6]);
  }
  assert.equal(L.bossForMonth('2026-11').id, 'distraccion');
});

test('jefes: los 10 rotan desde diciembre de 2026, uno distinto cada mes', () => {
  const nuevos = ['multitarea', 'perfeccionismo', 'inercia', 'desvelo'];
  for (const id of nuevos) {
    const b = L.BOSSES.find(x => x.id === id);
    assert.ok(b && b.taunt && b.fear && b.challenge && L.STAT_IDS.includes(b.weak), id);
    assert.ok(L.DEFAULT_RESIST.some(r => r.resist === id), `reto de ${id}`);
  }
  assert.equal(L.activeBosses().length, 10);
  assert.equal(L.bossForMonth('2026-11').id, 'distraccion');   // el mes en curso no cambia
  assert.equal(L.bossForMonth('2026-12').id, 'multitarea');
  const year = [];
  for (let i = 0; i < 10; i++) { const d = new Date(2026, 11 + i, 1); year.push(L.bossForMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`).id); }
  assert.equal(new Set(year).size, 10);
  for (let i = 1; i < year.length; i++) assert.notEqual(year[i], year[i - 1]);
});

test('migración v5: perfiles existentes reciben los 4 retos nuevos una sola vez', () => {
  const s = L.defaultState();
  const old = JSON.parse(JSON.stringify(L.exportPayload(s)));
  old.data.schema = 4;
  old.data.activities = old.data.activities.filter(a => !L.RESIST_V5.includes(a.id));
  let back = L.validateImport(old);
  assert.equal(back.activities.filter(a => L.RESIST_V5.includes(a.id)).length, 4);
  back.activities = back.activities.filter(a => a.id !== 'res-dormir');   // el jugador lo borra
  back = L.validateImport(JSON.parse(JSON.stringify(L.exportPayload(back))));
  assert.ok(!back.activities.some(a => a.id === 'res-dormir'));
});

test('jefes: una etapa nueva desde un mes futuro no altera los meses anteriores', () => {
  const ten = ['pereza', 'multitarea', 'procrastinacion', 'perfeccionismo', 'desorden', 'inercia', 'estres', 'desvelo', 'distraccion', 'soledad'];
  const eras = [...L.BOSS_ERAS, { from: '2027-02', ids: ten }];
  for (const mk of ['2026-11', '2026-12', '2027-01']) assert.equal(L.bossForMonth(mk, eras).id, L.bossForMonth(mk).id);
  assert.equal(L.bossForMonth('2027-02', eras).id, 'pereza');
  assert.equal(L.bossForMonth('2027-03', eras).id, 'multitarea');
  assert.equal(L.bossForMonth('2027-12', eras).id, 'pereza');   // 10 meses después vuelve a empezar
});

// ---------------- Bienvenida (versión general) ----------------

test('bienvenida: perfil nuevo la ve; quien ya jugaba no', () => {
  assert.equal(L.defaultState().onboarded, false);
  const s = L.defaultState();
  L.logActivity(s, 'def-gym');
  const old = JSON.parse(JSON.stringify(L.exportPayload(s)));
  delete old.data.onboarded;                                    // respaldo de antes de la bienvenida
  assert.equal(L.validateImport(old).onboarded, true);
  const fresh = JSON.parse(JSON.stringify(L.exportPayload(L.defaultState())));
  assert.equal(L.validateImport(fresh).onboarded, false);       // perfil nuevo exportado sin terminar
  fresh.data.log = s.log;
  assert.equal(L.validateImport(fresh).onboarded, true);        // si ya registró, no se le pregunta
});

test('bienvenida: deja solo los hábitos elegidos, conserva retos y fija 3', () => {
  const s = L.defaultState();
  const resistBefore = s.activities.filter(a => a.resist).length;
  L.applyOnboarding(s, { name: '  Kai  ', character: 'implacable-f', habitIds: ['tpl-correr', 'def-leer', 'tpl-meditar', 'tpl-finanzas', 'no-existe'] });
  assert.equal(s.profile.name, 'Kai');
  assert.equal(s.profile.character, 'implacable-f');
  assert.deepEqual(s.activities.filter(a => !a.resist).map(a => a.id), ['tpl-correr', 'def-leer', 'tpl-meditar', 'tpl-finanzas']);
  assert.equal(s.activities.filter(a => a.resist).length, resistBefore);
  assert.deepEqual(s.pinned, ['tpl-correr', 'def-leer', 'tpl-meditar']);
  assert.deepEqual(L.quickActivities(s).map(a => a.id), ['tpl-correr', 'def-leer', 'tpl-meditar']);
  assert.equal(s.onboarded, true);
  const e = L.logActivity(s, 'tpl-correr');
  assert.equal(e.stat, 'resistencia');
  // cada stat tiene al menos 4 opciones y todas las plantillas son válidas
  for (const st of L.STAT_IDS) assert.ok(L.HABIT_TEMPLATES.filter(t => t.stat === st).length >= 4, st);
  for (const ar of L.HABIT_AREAS) assert.ok(L.HABIT_TEMPLATES.filter(t => t.area === ar.id).length >= 5, ar.id);
  assert.equal(new Set(L.HABIT_TEMPLATES.map(t => t.id)).size, L.HABIT_TEMPLATES.length);
});

test('bienvenida: saltar conserva las sugeridas; agregar hábitos después no duplica', () => {
  const s = L.defaultState();
  const before = s.activities.map(a => a.id);
  L.applyOnboarding(s, { name: '', habitIds: [] });
  assert.equal(s.profile.name, 'Héroe');
  assert.deepEqual(s.activities.map(a => a.id), before);
  assert.equal(L.addHabits(s, ['tpl-agua', 'def-gym', 'tpl-agua']), 1);
  const ids = s.activities.map(a => a.id);
  assert.ok(ids.indexOf('tpl-agua') < ids.findIndex(id => s.activities.find(a => a.id === id).resist)); // antes de los retos
});

// ---------------- Lo básico y recompensas sugeridas ----------------

test('lo básico: una vez al día, no entra en accesos rápidos y migra en perfiles viejos', () => {
  const s = L.defaultState();
  L.applyOnboarding(s, { habitIds: ['tpl-agua', 'bas-cama', 'def-hike', 'tpl-meditar'] });
  assert.deepEqual(s.pinned, ['def-hike', 'tpl-meditar']);   // los básicos tienen su propia fila
  const t = noon(2026, 11, 2);
  const e = L.logActivity(s, 'tpl-agua', { now: t });
  assert.equal(e.xp, 5);
  assert.throws(() => L.logActivity(s, 'tpl-agua', { now: t + 3600e3 }), /Ya lo marcaste hoy/);
  L.logActivity(s, 'tpl-agua', { now: t + DAY });            // al día siguiente sí
  for (let i = 0; i < 9; i++) L.logActivity(s, 'bas-cama', { now: t + i * DAY });
  assert.ok(!L.quickActivities(s, t + 9 * DAY).some(a => a.basic));
  // un perfil que eligió "Tomar suficiente agua" antes de esta versión: queda como básico
  const old = L.defaultState();
  old.activities.push({ id: 'tpl-agua', name: 'Tomar suficiente agua', stat: 'resistencia', xp: 10, bonus: null });
  const back = L.validateImport(JSON.parse(JSON.stringify(L.exportPayload(old))));
  assert.equal(back.activities.find(a => a.id === 'tpl-agua').basic, true);
  assert.equal(back.activities.find(a => a.id === 'tpl-agua').name, 'Tomar suficiente agua'); // conserva su nombre
});

test('recompensas: sugeridas por tipo, gratis más baratas, sin duplicar', () => {
  const ids = L.REWARD_TEMPLATES.map(r => r.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const ty of L.REWARD_TYPES) assert.ok(L.REWARD_TEMPLATES.some(r => r.type === ty.id), ty.id);
  const max = ty => Math.max(...L.REWARD_TEMPLATES.filter(r => r.type === ty).map(r => r.cost));
  const min = ty => Math.min(...L.REWARD_TEMPLATES.filter(r => r.type === ty).map(r => r.cost));
  assert.ok(min('gratis') < min('experiencia') && max('gratis') <= min('experiencia'));
  assert.ok(L.defaultState().rewards[0].type === 'gratis');
  const s = L.defaultState();
  L.applyOnboarding(s, { rewardIds: ['rw-siesta', 'rw-libro', 'no-existe'] });
  assert.deepEqual(s.rewards.map(r => r.id), ['rw-siesta', 'rw-libro']);
  assert.equal(L.addRewards(s, ['rw-siesta', 'rw-cafe']), 1);
  const keep = L.defaultState();                               // sin elegir: quedan las de siempre
  L.applyOnboarding(keep, {});
  assert.equal(keep.rewards.length, 4);
});

test('stat hogar se llama "Hogar y finanzas"', () => {
  assert.equal(L.statById('hogar').name, 'Hogar y finanzas');
});

test('A-14: el avatar no cambia la XP de una actividad', () => {
  const xps = [];
  for (const ch of ['titan-m', 'relampago-f', 'estratega-m', 'sabio-f', 'guardian-m', 'implacable-f', 'guardabosques']) {
    const s = L.defaultState();
    s.profile.character = ch;
    const act = s.activities.find(a => !a.resist && !a.basic);
    L.logActivity(s, act.id, new Date(2026, 10, 19, 10).getTime());
    xps.push(JSON.stringify(s.log.map(e => [e.stat, e.xp])) + L.deriveProfile(s).totalXp);
  }
  assert.equal(new Set(xps).size, 1);
});

test('A-14: los avatares anteriores pasan al héroe equivalente con el mismo look', () => {
  const map = { guardabosques: 'guardian-m', exploradora: 'relampago-f', forjador: 'titan-m', cartografo: 'estratega-m', tejedora: 'sabio-f', duelista: 'implacable-f' };
  for (const [old, now] of Object.entries(map)) {
    const s = L.defaultState();
    s.profile.character = old;
    s.log.push({ id: 'x', act: 'def-leer', stat: 'intelecto', xp: 40, ts: Date.now() });
    const back = L.validateImport(JSON.parse(JSON.stringify(L.exportPayload(s))));
    assert.equal(back.profile.character, now, old);
    assert.equal(back.log.length, 1, 'conserva el historial');
  }
  // Las elecciones A-14 se conservan tal cual; lo desconocido cae al héroe por defecto.
  for (const k of ['sabio-f', 'implacable-m']) assert.equal(L.migrateCharacter(k), k);
  assert.equal(L.migrateCharacter('no-existe'), 'titan-m');
  assert.equal(L.migrateCharacter('relampago'), 'relampago-m');
});

test('Afinidad: la guardiana da +5/10/15/20 % en su stat según su forma, guardado en el registro', () => {
  const s = L.defaultState();
  const now = new Date(2026, 10, 19, 10).getTime();
  const e1 = L.logActivity(s, 'def-gym', { now });          // forma 1: sin extra
  assert.equal(e1.guardXp, undefined);
  // Llevar fuerza a nivel 5 (forma 2) con registros sueltos.
  while (L.affinityFor(s, 'fuerza').tier < 2) s.log.push({ id: L.uid(), ts: now - 86400000, type: 'activity', refId: 'x', name: 'x', stat: 'fuerza', xp: 50 });
  assert.deepEqual(L.affinityFor(s, 'fuerza'), { tier: 2, pct: 5 });
  const e2 = L.logActivity(s, 'def-gym', { now });          // 30 XP → +2
  assert.equal(e2.guardXp, 2); assert.equal(e2.xp, 32);
  assert.equal(L.coinsFor(e2), Math.round(32 / 5), 'las monedas salen de la XP con Afinidad');
  const e3 = L.logActivity(s, 'def-estudio', { now });      // otra stat: sin extra
  assert.equal(e3.guardXp, undefined);
  assert.equal(L.guardianTier(35), 5); assert.equal(L.AFFINITY_PCT[4], 20);
});

test('jefe: se recupera un poco tras un día sin golpes en su contra; Defensa lo evita; nunca quita nada al jugador', () => {
  const day = d => new Date(2026, 10, d, 12).getTime();          // noviembre 2026: Scrollax (débil a sabiduría)
  const mk = () => { const s = L.defaultState(); s.log.push({ id: L.uid(), ts: new Date(2026, 9, 20, 12).getTime(), type: 'activity', refId: 'x', name: 'x', stat: 'fuerza', xp: 10 }); return s; };
  const s = mk();
  const b0 = L.bossStatus(s, day(1));
  assert.equal(b0.weak, 'sabiduria');
  s.log.push({ id: 'a', ts: day(1), type: 'activity', refId: 'x', name: 'x', stat: 'sabiduria', xp: 100 });
  const xpBefore = L.deriveProfile(s, day(3)).totalXp;
  const b = L.bossStatus(s, day(3));                               // día 2 sin golpes → se recupera
  const step = Math.round(b.hp * L.BOSS_HEAL.perDay / 5) * 5;
  assert.equal(b.healed, step);
  assert.equal(b.healedYesterday, step);
  assert.equal(b.damage, 200 - step);                              // 100 XP ×2 (débil)
  assert.equal(L.deriveProfile(s, day(3)).totalXp, xpBefore, 'tu XP no cambia');
  // Un registro de otra stat no cuenta como golpe en su contra.
  const s2 = mk();
  s2.log.push({ id: 'a', ts: day(1), type: 'activity', refId: 'x', name: 'x', stat: 'sabiduria', xp: 100 });
  s2.log.push({ id: 'b', ts: day(2), type: 'activity', refId: 'x', name: 'x', stat: 'fuerza', xp: 20 });
  assert.equal(L.bossStatus(s2, day(3)).healed, step);
  // Defensa: cumplir su reto el día 1 evita la recuperación del día 2.
  const s3 = mk();
  s3.log.push({ id: 'r', ts: day(1), type: 'activity', refId: 'res', name: 'reto', stat: 'sabiduria', xp: 15, resist: 'distraccion' });
  const b3 = L.bossStatus(s3, day(3));
  assert.equal(b3.healed, 0);
  assert.equal(L.bossStatus(s3, day(2)).defenseToday, true);
  // Tope del mes: como mucho el 15 % de su vida.
  const s4 = mk();
  s4.log.push({ id: 'a', ts: day(1), type: 'activity', refId: 'x', name: 'x', stat: 'sabiduria', xp: 300 });
  const b4 = L.bossStatus(s4, day(28));
  assert.ok(b4.healed <= Math.round(b4.hp * L.BOSS_HEAL.maxMonth));
  assert.ok(b4.damage >= 0);
});

test('recompensas con reto: hábito N días, jefe y guardiana; cada canje pide cumplirlo otra vez', () => {
  const s = rich();
  const t = noon(2026, 11, 2);
  s.rewards.push({ id: 'big', name: 'Cena especial', cost: 100, type: 'experiencia', lock: { kind: 'habit', act: 'def-leer', n: 3, since: t } });
  const r = s.rewards.find(x => x.id === 'big');
  assert.equal(L.rewardLock(s, r, t).locked, true);
  assert.throws(() => L.buyReward(s, 'big', t), /Primero cumple su reto/);
  for (let d = 1; d <= 3; d++) L.logActivity(s, 'def-leer', { now: t + d * DAY });
  L.logActivity(s, 'def-leer', { now: t + 3 * DAY + 3600e3 });          // dos el mismo día cuentan como uno
  const lk = L.rewardLock(s, r, t + 3 * DAY + 7200e3);
  assert.deepEqual([lk.locked, lk.progress, lk.target], [false, 3, 3]);
  L.buyReward(s, 'big', t + 4 * DAY);
  assert.equal(L.rewardLock(s, r, t + 4 * DAY).locked, true, 'después de canjear, el reto se reinicia');
  // Guardiana: queda cumplido para siempre una vez alcanzada la forma
  s.rewards.push({ id: 'g', name: 'Zapatillas', cost: 100, lock: { kind: 'guardian', stat: 'fuerza', tier: 2 } });
  const g = s.rewards.find(x => x.id === 'g');
  assert.equal(L.rewardLock(s, g, t + 5 * DAY).locked, L.affinityFor(s, 'fuerza').tier < 2);
  // Sin reto: null
  assert.equal(L.rewardLock(s, s.rewards[0], t), null);
  // Precio guía
  assert.deepEqual(L.rewardPriceHint('gusto', 60), { min: 120, max: 250, low: true });
  assert.equal(L.rewardPriceHint('gusto', 150).low, false);
});

test('el día de vuelta: días sin registrar desde el último registro', () => {
  const s = L.defaultState();
  assert.equal(L.daysAway(s, noon(2026, 11, 5)), 0);
  L.logActivity(s, 'def-gym', { now: noon(2026, 11, 2) });
  assert.equal(L.daysAway(s, noon(2026, 11, 3)), 0);
  assert.equal(L.daysAway(s, noon(2026, 11, 4)), 1);
  assert.equal(L.daysAway(s, noon(2026, 11, 6)), 3);
});
