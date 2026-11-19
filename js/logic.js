// =====================================================================
// Kaisen — lógica pura del juego (sin DOM).
// Todo lo que se puede calcular a partir del historial vive aquí, para
// poder probarlo con Node (ver tests/logic.test.js).
// =====================================================================

import { gearExtra, itemById, ownsItem, bossDrop } from './gear.js';

export const STATS = [
  { id: 'fuerza',      name: 'Fuerza',      short: 'FUE', icon: '💪', color: '#e63946' },
  { id: 'resistencia', name: 'Resistencia', short: 'RES', icon: '🔥', color: '#ff7a1a' },
  { id: 'intelecto',   name: 'Intelecto',   short: 'INT', icon: '🧠', color: '#1f6feb' },
  { id: 'sabiduria',   name: 'Sabiduría',   short: 'SAB', icon: '📖', color: '#8e44ad' },
  { id: 'vinculo',     name: 'Vínculo',     short: 'VÍN', icon: '❤️', color: '#e84393' },
  { id: 'hogar',       name: 'Hogar',       short: 'HOG', icon: '🏠', color: '#2a9d4b' },
];
export const STAT_IDS = STATS.map(s => s.id);
export const statById = id => STATS.find(s => s.id === id);

export const XP_MIN = 5;
export const XP_MAX = 50;         // límite para actividades nuevas
export const QUEST_XP_MAX = 200;  // las misiones únicas pueden valer más

// ---------------------------------------------------------------------
// Curvas de experiencia
// ---------------------------------------------------------------------

/** XP necesaria para pasar del nivel `level` al `level + 1` (nivel general). */
export function xpToNext(level) {
  return Math.round(100 * Math.pow(level, 1.5));
}

/** XP necesaria para subir un nivel de stat (curva más suave). */
export function statXpToNext(level) {
  return Math.round(60 * Math.pow(level, 1.35));
}

/**
 * Convierte XP total en { level, into, needed, pct }.
 *  - level:  nivel actual (empieza en 1)
 *  - into:   XP acumulada dentro del nivel actual
 *  - needed: XP total que pide este nivel para subir
 */
export function levelFromXp(totalXp, curve = xpToNext) {
  let level = 1;
  let rest = Math.max(0, Math.floor(totalXp || 0));
  while (rest >= curve(level)) {
    rest -= curve(level);
    level++;
  }
  const needed = curve(level);
  return { level, into: rest, needed, pct: rest / needed };
}

/** XP total acumulada necesaria para *alcanzar* `level`. */
export function totalXpForLevel(level, curve = xpToNext) {
  let sum = 0;
  for (let l = 1; l < level; l++) sum += curve(l);
  return sum;
}

export const RANKS = [
  { min: 1,  letter: 'E',   title: 'Novato',   color: '#9aa0a6' },
  { min: 3,  letter: 'D',   title: 'Aprendiz', color: '#2a9d4b' },
  { min: 5,  letter: 'C',   title: 'Guerrero', color: '#1f6feb' },
  { min: 10, letter: 'B',   title: 'Élite',    color: '#8e44ad' },
  { min: 15, letter: 'A',   title: 'Campeón',  color: '#ff7a1a' },
  { min: 20, letter: 'S',   title: 'Héroe',    color: '#e63946' },
  { min: 30, letter: 'SS',  title: 'Leyenda',  color: '#ffd23f' },
  { min: 50, letter: 'SSS', title: 'Mito',     color: '#00e5ff' },
];
export function rankFor(level) {
  let r = RANKS[0];
  for (const rank of RANKS) if (level >= rank.min) r = rank;
  return r;
}

/**
 * Registros "base": actividades y misiones únicas, o sea lo que hiciste tú.
 * Los premios (misiones semanales, jefes) también dan XP, pero no cuentan
 * para la racha, ni para dañar al jefe, ni para otras misiones.
 */
export const isBase = e => e.type !== 'weekly' && e.type !== 'boss';

// ---------------------------------------------------------------------
// Fechas (se usa la fecha LOCAL del teléfono, no UTC)
// ---------------------------------------------------------------------

export function dayKey(ts) {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function shiftDay(key, delta) {
  const [y, m, d] = key.split('-').map(Number);
  // Mediodía para esquivar problemas con cambios de horario.
  return dayKey(new Date(y, m - 1, d + delta, 12).getTime());
}

/**
 * Racha de días seguidos con al menos un registro.
 * La racha sigue "viva" si registraste hoy o ayer (te queda el día de hoy
 * para mantenerla).
 */
export function computeStreak(log, now = Date.now(), shieldDays = []) {
  const real = new Set(log.filter(isBase).map(e => dayKey(e.ts)));
  // Un día protegido por un escudo cuenta como registrado para la racha.
  const days = new Set([...real, ...shieldDays]);
  const today = dayKey(now);
  let cursor = days.has(today) ? today : shiftDay(today, -1);
  let current = 0;
  while (days.has(cursor)) {
    current++;
    cursor = shiftDay(cursor, -1);
  }

  // Mejor racha histórica
  const sorted = [...days].sort();
  let best = 0, run = 0, prev = null;
  for (const k of sorted) {
    run = prev && shiftDay(prev, 1) === k ? run + 1 : 1;
    best = Math.max(best, run);
    prev = k;
  }
  return { current, best, loggedToday: real.has(today) };
}

// ---------------------------------------------------------------------
// Estado derivado del historial
// ---------------------------------------------------------------------

export function computeTotals(log) {
  const stats = Object.fromEntries(STAT_IDS.map(id => [id, 0]));
  let total = 0;
  for (const e of log) {
    total += e.xp;
    if (e.stat in stats) stats[e.stat] += e.xp;
  }
  return { total, stats };
}

export function deriveProfile(state, now = Date.now()) {
  const { total, stats } = computeTotals(state.log);
  const lvl = levelFromXp(total);
  const statLevels = Object.fromEntries(
    STAT_IDS.map(id => [id, { xp: stats[id], ...levelFromXp(stats[id], statXpToNext) }])
  );
  const today = dayKey(now);
  const todayXp = state.log.filter(e => dayKey(e.ts) === today).reduce((a, e) => a + e.xp, 0);
  return {
    totalXp: total,
    ...lvl,
    rank: rankFor(lvl.level),
    stats: statLevels,
    streak: computeStreak(state.log, now, state.shieldDays || []),
    todayXp,
  };
}

// ---------------------------------------------------------------------
// Logros (se recalculan desde el historial: si deshaces, se re-bloquean)
// ---------------------------------------------------------------------

const isBookFinish = e =>
  e.refId === 'def-terminar-libro' || /termin\w*\s.*libro/i.test(e.name || '');

export const ACHIEVEMENTS = [
  { id: 'first-log',   icon: '⚡', name: 'Primer paso',       desc: 'Registra tu primera actividad.',        test: (s, p) => s.log.some(isBase) },
  { id: 'level-2',     icon: '⬆️', name: '¡Primer nivel!',    desc: 'Sube al nivel 2.',                      test: (s, p) => p.level >= 2 },
  { id: 'level-5',     icon: '🥋', name: 'Guerrero',          desc: 'Alcanza el nivel 5.',                   test: (s, p) => p.level >= 5 },
  { id: 'level-10',    icon: '🌟', name: 'Élite',             desc: 'Alcanza el nivel 10.',                  test: (s, p) => p.level >= 10 },
  { id: 'streak-3',    icon: '🔥', name: 'Calentando',        desc: 'Racha de 3 días seguidos.',             test: (s, p) => p.streak.best >= 3 },
  { id: 'streak-7',    icon: '🔥', name: 'Semana imparable',  desc: 'Racha de 7 días seguidos.',             test: (s, p) => p.streak.best >= 7 },
  { id: 'streak-30',   icon: '☄️', name: 'Voluntad de hierro', desc: 'Racha de 30 días seguidos.',           test: (s, p) => p.streak.best >= 30 },
  { id: 'book',        icon: '📚', name: 'Devorador de libros', desc: 'Termina un libro.',                   test: (s, p) => s.log.some(isBookFinish) },
  { id: 'quest-1',     icon: '📜', name: 'Misión cumplida',   desc: 'Completa tu primera misión única.',     test: (s, p) => s.log.some(e => e.type === 'quest') },
  { id: 'all-stats',   icon: '☯️', name: 'Equilibrio',        desc: 'Registra algo en las 6 stats.',         test: (s, p) => STAT_IDS.every(id => p.stats[id].xp > 0) },
  { id: 'stat-5',      icon: '🎯', name: 'Especialista',      desc: 'Lleva una stat al nivel 5.',            test: (s, p) => STAT_IDS.some(id => p.stats[id].level >= 5) },
  { id: 'big-day',     icon: '💥', name: 'Día explosivo',     desc: 'Gana 150 XP en un solo día.',           test: (s, p) => maxDayXp(s.log) >= 150 },
  { id: 'logs-100',    icon: '🏆', name: 'Cien hazañas',      desc: 'Haz 100 registros.',                    test: (s, p) => s.log.filter(isBase).length >= 100 },
  { id: 'weekly-1',    icon: '🗓️', name: 'Semana cumplida',   desc: 'Reclama una misión semanal.',           test: (s, p) => s.log.some(e => e.type === 'weekly') },
  { id: 'weekly-all',  icon: '🎖️', name: 'Semana perfecta',   desc: 'Reclama las 3 misiones de una semana.', test: (s, p) => perfectWeek(s.log) },
  { id: 'boss-1',      icon: '👹', name: 'Cazador de jefes',  desc: 'Derrota a tu primer jefe.',             test: (s, p) => s.log.some(e => e.type === 'boss') },
  { id: 'boss-6',      icon: '👑', name: 'Azote de jefes',    desc: 'Derrota a 6 jefes.',                    test: (s, p) => s.log.filter(e => e.type === 'boss').length >= 6 },
  { id: 'pet-adult',   icon: '🐉', name: 'Criador legendario', desc: 'Lleva a tu mascota a su forma adulta.', test: (s, p) => petStatus(s).stage >= 4 },
];

function perfectWeek(log) {
  const count = {};
  for (const e of log) if (e.type === 'weekly') { const w = e.refId.split(':')[0]; count[w] = (count[w] || 0) + 1; }
  return Object.values(count).some(n => n >= 3);
}

function maxDayXp(log) {
  const byDay = {};
  for (const e of log) byDay[dayKey(e.ts)] = (byDay[dayKey(e.ts)] || 0) + e.xp;
  return Math.max(0, ...Object.values(byDay));
}

export function unlockedAchievements(state, profile = deriveProfile(state)) {
  return ACHIEVEMENTS.filter(a => a.test(state, profile)).map(a => a.id);
}

// ---------------------------------------------------------------------
// Estado inicial y acciones
// ---------------------------------------------------------------------

export const DEFAULT_ACTIVITIES = [
  { id: 'def-gym',            name: 'Entrenar en el gym',         stat: 'fuerza',      xp: 30 },
  { id: 'def-entreno-casa',   name: 'Entreno corto en casa',      stat: 'fuerza',      xp: 15 },
  { id: 'def-mtb',            name: 'Bicicleta',                  stat: 'resistencia', xp: 35, bonus: { label: 'Ruta larga', xp: 15 } },
  { id: 'def-hike',           name: 'Caminata',                   stat: 'resistencia', xp: 25 },
  { id: 'def-estudio',        name: 'Estudiar',                   stat: 'intelecto',   xp: 25 },
  { id: 'def-tarea',          name: 'Entregar una tarea',         stat: 'intelecto',   xp: 40 },
  { id: 'def-programar',      name: 'Avanzar un proyecto propio', stat: 'intelecto',   xp: 25 },
  { id: 'def-leer',           name: 'Leer 20+ min',               stat: 'sabiduria',   xp: 15 },
  { id: 'def-terminar-libro', name: 'Terminar un libro',          stat: 'sabiduria',   xp: 100 },
  { id: 'def-tiempo',         name: 'Tiempo de calidad juntos',   stat: 'vinculo',     xp: 30 },
  { id: 'def-familia',        name: 'Salida con familia o amigos', stat: 'vinculo',    xp: 30 },
  { id: 'def-proyecto-casa',  name: 'Proyecto de la casa',        stat: 'hogar',       xp: 30 },
  { id: 'def-cocinar',        name: 'Cocinar en casa',            stat: 'hogar',       xp: 10 },
];

/**
 * Retos de resistencia: cosas que EVITAS o que te cuestan. Cada uno ataca a
 * un jefe concreto (golpe crítico x3) y solo cuenta una vez al día.
 */
export const DEFAULT_RESIST = [
  { id: 'res-pantallas',  name: 'Sin redes después de las 9 pm',       stat: 'sabiduria',   xp: 15, resist: 'distraccion' },
  { id: 'res-dificil',    name: 'Hice primero lo más difícil',         stat: 'intelecto',   xp: 15, resist: 'procrastinacion' },
  { id: 'res-alarma',     name: 'Me levanté sin posponer la alarma',   stat: 'fuerza',      xp: 10, resist: 'pereza' },
  { id: 'res-orden',      name: 'Dejé todo en su lugar',               stat: 'hogar',       xp: 10, resist: 'desorden' },
  { id: 'res-pausa',      name: 'Pausa para respirar y desconectar',   stat: 'resistencia', xp: 10, resist: 'estres' },
  { id: 'res-contacto',   name: 'Le escribí o llamé a alguien querido', stat: 'vinculo',    xp: 15, resist: 'soledad' },
];

export const SCHEMA_VERSION = 4;

/** Recompensas de la vida real que se compran con monedas (editables). */
export const DEFAULT_REWARDS = [
  { id: 'rw-antojo',      name: 'Un antojo',               cost: 100 },
  { id: 'rw-pelicula',    name: 'Noche de película',       cost: 200 },
  { id: 'rw-restaurante', name: 'Elegir el restaurante',   cost: 250 },
  { id: 'rw-tarde',       name: 'Tarde libre sin culpa',   cost: 400 },
];

export function defaultState() {
  return {
    schema: SCHEMA_VERSION,
    profile: { name: 'Héroe', character: 'guardabosques' },  // nombre y personaje de este perfil
    prefs: { idle: 'sway' },         // animación del personaje en reposo: 'sway' | 'static'
    // La mascota: la especie decide su arte. Los nombres se guardan por especie;
    // si no hay nombre, la app muestra el nombre de la especie.
    pet: { species: 'chispa', names: {}, asked: {} },
    activities: [...DEFAULT_ACTIVITIES, ...DEFAULT_RESIST].map(a => ({ ...a, bonus: a.bonus ? { ...a.bonus } : null })),
    rewards: DEFAULT_REWARDS.map(r => ({ ...r })),  // recompensas reales de la tienda
    purchases: [],                                   // todo lo comprado con monedas
    shieldDays: [],                                  // días salvados por un escudo de racha
    equipped: { sky: 'sky-default', title: null, world: 'atardecer', gear: {} },
    quests: [],
    questHistory: [],
    log: [],
    seenAchievements: [],
    guardianSeen: {},   // forma más alta ya anunciada de cada guardiana
    lastBackup: null,
    createdAt: Date.now(),
  };
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export function clampXp(xp, max = XP_MAX) {
  const n = Math.round(Number(xp));
  if (!Number.isFinite(n)) return XP_MIN;
  return Math.min(max, Math.max(XP_MIN, n));
}

/** Registra una actividad. Devuelve la entrada creada. */
export function logActivity(state, activityId, { bonus = false, now = Date.now() } = {}) {
  const a = state.activities.find(x => x.id === activityId);
  if (!a) throw new Error('Actividad no encontrada');
  if (a.resist && state.log.some(e => e.refId === a.id && dayKey(e.ts) === dayKey(now))) {
    throw new Error('Este reto ya lo hiciste hoy');
  }
  const extra = bonus && a.bonus ? a.bonus.xp : 0;
  // El equipo da un % extra sobre la XP de la actividad (con bono incluido).
  // Se guarda en el registro: si después cambias de equipo, lo ya ganado no cambia.
  const gear = gearExtra(state, a.stat, a.xp + extra);
  const entry = {
    id: uid(), ts: now, type: 'activity', refId: a.id,
    name: bonus && a.bonus ? `${a.name} · ${a.bonus.label}` : a.name,
    stat: a.stat, xp: a.xp + extra + gear,
  };
  if (gear) entry.gearXp = gear;
  if (a.resist) entry.resist = a.resist;
  state.log.push(entry);
  return entry;
}

/** Completa una misión única: sale de la lista y queda en el historial. */
export function completeQuest(state, questId, now = Date.now()) {
  const i = state.quests.findIndex(q => q.id === questId);
  if (i < 0) throw new Error('Misión no encontrada');
  const [q] = state.quests.splice(i, 1);
  const entry = { id: uid(), ts: now, type: 'quest', refId: q.id, name: q.name, stat: q.stat, xp: q.xp };
  state.log.push(entry);
  state.questHistory.push({ ...q, completedAt: now, entryId: entry.id });
  return entry;
}

/** Deshace un registro. Si era una misión, vuelve a la lista de pendientes. */
export function undoEntry(state, entryId) {
  const i = state.log.findIndex(e => e.id === entryId);
  if (i < 0) return null;
  const [entry] = state.log.splice(i, 1);
  if (entry.type === 'quest') {
    const h = state.questHistory.findIndex(q => q.entryId === entryId);
    if (h >= 0) {
      const [q] = state.questHistory.splice(h, 1);
      delete q.completedAt; delete q.entryId;
      state.quests.push(q);
    }
  }
  return entry;
}

// ---------------------------------------------------------------------
// Respaldo: validación de un JSON importado
// ---------------------------------------------------------------------

export function validateImport(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('El archivo no es un respaldo válido.');
  // Acepta respaldos de Kaisen y de su versión anterior (nano-rpg).
  const data = (obj.app === 'kaisen' || obj.app === 'nano-rpg') && obj.data ? obj.data : obj;
  if (!Array.isArray(data.log) || !Array.isArray(data.activities)) {
    throw new Error('Al respaldo le faltan datos (historial o actividades).');
  }
  const base = defaultState();
  const okEntry = e => e && typeof e.id === 'string' && Number.isFinite(e.ts) && Number.isFinite(e.xp) && STAT_IDS.includes(e.stat);
  const okAct = a => a && typeof a.id === 'string' && typeof a.name === 'string' && STAT_IDS.includes(a.stat) && Number.isFinite(a.xp);
  const activities = data.activities.filter(okAct);
  // Migración: los datos anteriores a la v3 no traían retos de resistencia.
  if ((data.schema || 1) < 3) {
    for (const r of DEFAULT_RESIST) if (!activities.some(a => a.id === r.id)) activities.push({ ...r, bonus: null });
  }
  return {
    ...base,
    ...data,
    schema: SCHEMA_VERSION,
    profile: { ...base.profile, ...(data.profile || {}) },
    prefs: { ...base.prefs, ...(data.prefs || {}) },
    pet: migratePet(base.pet, data.pet),
    activities,
    rewards: Array.isArray(data.rewards) ? data.rewards.filter(r => r && typeof r.name === 'string' && Number.isFinite(r.cost)) : base.rewards,
    purchases: Array.isArray(data.purchases) ? data.purchases.filter(x => x && Number.isFinite(x.cost)) : [],
    shieldDays: Array.isArray(data.shieldDays) ? data.shieldDays : [],
    equipped: { ...base.equipped, ...(data.equipped || {}), gear: { ...((data.equipped || {}).gear || {}) } },
    quests: Array.isArray(data.quests) ? data.quests.filter(okAct) : [],
    questHistory: Array.isArray(data.questHistory) ? data.questHistory : [],
    log: data.log.filter(okEntry),
    seenAchievements: Array.isArray(data.seenAchievements) ? data.seenAchievements : [],
    guardianSeen: data.guardianSeen && typeof data.guardianSeen === 'object' ? { ...data.guardianSeen } : {},
    partner: undefined,  // la versión anterior guardaba aquí un segundo nombre; ya no se usa
  };
}

export function exportPayload(state, now = Date.now()) {
  return { app: 'kaisen', exportedAt: new Date(now).toISOString(), data: state };
}

// =====================================================================
// SEGUNDA ETAPA: misiones semanales, jefes y mascota.
// Igual que el resto, todo se calcula a partir del historial.
// =====================================================================

const DAY_MS = 86400000;
const atNoon = (y, m, d) => new Date(y, m, d, 12).getTime();

/** Clave de la semana = fecha de su lunes (hora local). */
export function weekKey(ts) {
  const d = new Date(ts);
  const sinceMonday = (d.getDay() + 6) % 7;
  return dayKey(atNoon(d.getFullYear(), d.getMonth(), d.getDate() - sinceMonday));
}
export function monthKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Generador pseudoaleatorio con semilla: la misma semana da siempre las mismas misiones. */
function seeded(str) {
  let h = 2166136261;
  for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** La stat con menos XP (ahí van los premios generales, para equilibrarte). */
export function weakestStat(log) {
  const { stats } = computeTotals(log);
  return STAT_IDS.reduce((min, id) => (stats[id] < stats[min] ? id : min), STAT_IDS[0]);
}

// ---------------------------------------------------------------------
// Misiones semanales (3 por semana, se renuevan cada lunes)
// ---------------------------------------------------------------------

export function weeklyMissions(state, now = Date.now()) {
  const wk = weekKey(now);
  const rnd = seeded(wk);
  const week = state.log.filter(e => isBase(e) && weekKey(e.ts) === wk);

  // A) Enfocarse en una stat (solo entre las que tienen actividades)
  const usable = STATS.filter(s => state.activities.some(a => a.stat === s.id));
  const pool = usable.length ? usable : STATS;
  const focus = pool[Math.floor(rnd() * pool.length)];
  // B) XP total de la semana
  const xpTarget = [200, 250, 300][Math.floor(rnd() * 3)];
  // C) Constancia o variedad
  const variety = rnd() < 0.5;

  const defs = [
    {
      id: 'a', icon: focus.icon, stat: focus.id, target: 3, rewardXp: 40,
      title: `Semana de ${focus.name}`, desc: `Registra 3 actividades de ${focus.name}.`,
      progress: week.filter(e => e.stat === focus.id).length,
    },
    {
      id: 'b', icon: '⚡', stat: null, target: xpTarget, rewardXp: 50,
      title: 'Poder acumulado', desc: `Gana ${xpTarget} XP esta semana.`,
      progress: week.reduce((a, e) => a + e.xp, 0),
    },
    variety
      ? {
          id: 'c', icon: '☯️', stat: null, target: 4, rewardXp: 50,
          title: 'Entrenamiento completo', desc: 'Registra en 4 stats distintas.',
          progress: new Set(week.map(e => e.stat)).size,
        }
      : {
          id: 'c', icon: '🔥', stat: null, target: 5, rewardXp: 50,
          title: 'Constancia', desc: 'Registra algo en 5 días distintos.',
          progress: new Set(week.map(e => dayKey(e.ts))).size,
        },
  ];
  const [y, m, d] = wk.split('-').map(Number);
  const daysLeft = Math.max(1, Math.round((atNoon(y, m - 1, d + 7) - atNoon(...ymd(now))) / DAY_MS));
  return defs.map(mi => {
    const refId = `${wk}:${mi.id}`;
    const progress = Math.min(mi.progress, mi.target);
    return {
      ...mi, refId, progress, weekKey: wk, daysLeft,
      done: mi.progress >= mi.target,
      claimed: state.log.some(e => e.type === 'weekly' && e.refId === refId),
    };
  });
}
const ymd = ts => { const d = new Date(ts); return [d.getFullYear(), d.getMonth(), d.getDate()]; };

/** Reclama el premio de una misión semanal cumplida. */
export function claimWeekly(state, missionId, now = Date.now()) {
  const m = weeklyMissions(state, now).find(x => x.id === missionId);
  if (!m) throw new Error('Misión no encontrada');
  if (!m.done) throw new Error('La misión aún no está cumplida');
  if (m.claimed) throw new Error('Ya reclamaste esta misión');
  const entry = {
    id: uid(), ts: now, type: 'weekly', refId: m.refId,
    name: `Semanal: ${m.title}`, stat: m.stat || weakestStat(state.log), xp: m.rewardXp,
  };
  state.log.push(entry);
  return entry;
}

// ---------------------------------------------------------------------
// Jefes: uno por mes. Lo dañas con la XP que ganas; su debilidad hace x2.
// ---------------------------------------------------------------------

export const BOSSES = [
  { id: 'pereza',          name: 'Pereza, el Señor del Sofá',      weak: 'fuerza',      taunt: '"Cinco minutitos más…"' },
  { id: 'procrastinacion', name: 'Cronos, el Dejalo-Para-Mañana',  weak: 'intelecto',   taunt: '"Mañana empiezas, hoy no."' },
  { id: 'desorden',        name: 'Gólem del Desorden',             weak: 'hogar',       taunt: '"Eso lo recoges después."' },
  { id: 'estres',          name: 'Ira, el Ogro del Estrés',        weak: 'resistencia', taunt: '"¡No tienes tiempo para nada!"' },
  { id: 'distraccion',     name: 'Scrollax, el de Mil Pantallas',  weak: 'sabiduria',   taunt: '"Solo un video más…"' },
  { id: 'soledad',         name: 'Sombra de la Soledad',           weak: 'vinculo',     taunt: '"Mejor quédate solo."' },
  // T-01 (GPT): todavía sin ilustración. Entran en la rotación cuando llegue
  // su arte, agregando una etapa nueva en BOSS_ERAS (ver abajo).
  { id: 'multitarea',     name: 'Multyra, la Hidra de los Pendientes',   weak: 'intelecto',   taunt: '"¿Ya vas a terminar? Abramos tres cosas más."',
    fear: 'Abrir tareas por impulso y dejar que se acumulen sin elegir una prioridad.',
    challenge: 'Elegí una sola tarea y le dediqué 15 minutos sin saltar a otra', ready: false },
  { id: 'perfeccionismo', name: 'Perfectus, el Caballero de Porcelana',  weak: 'sabiduria',   taunt: '"Si tiene una grieta, tíralo entero."',
    fear: 'El miedo a entregar algo imperfecto y el pensamiento de todo o nada.',
    challenge: 'Definí qué era suficiente y lo di por terminado', ready: false },
  { id: 'inercia',        name: 'Glacior, el Dragón de la Inercia',      weak: 'fuerza',      taunt: '"El primer paso pesa más que toda la montaña."',
    fear: 'El bloqueo ante el primer movimiento, incluso cuando ya elegiste qué hacer.',
    challenge: 'Hice 2 minutos del primer paso de algo pendiente', ready: false },
  { id: 'desvelo',        name: 'Noxveil, el Cuervo del Desvelo',        weak: 'resistencia', taunt: '"Dame otros veinte minutos. Mañana vemos."',
    fear: 'El hábito de alargar la noche con actividades que desplazan el descanso.',
    challenge: 'Cerré lo que me desvelaba y empecé mi rutina de dormir a tiempo', ready: false },
];
export const BOSS_REWARD_XP = 150;
export const activeBosses = () => BOSSES.filter(b => b.ready !== false);

/**
 * Rotación de jefes por etapas. Cada etapa tiene un mes de inicio y su lista.
 * Agregar una etapa con un mes FUTURO no cambia ni el mes en curso ni los
 * pasados (trofeos, daño ya hecho). La primera etapa conserva la fórmula
 * original para que nada de lo ya jugado cambie.
 */
export const BOSS_ERAS = [
  { from: null, ids: ['pereza', 'procrastinacion', 'desorden', 'estres', 'distraccion', 'soledad'] },
  // Cuando lleguen las ilustraciones de T-01, por ejemplo:
  // { from: '2027-02', ids: ['pereza', 'multitarea', 'procrastinacion', 'perfeccionismo', 'desorden',
  //                         'inercia', 'estres', 'desvelo', 'distraccion', 'soledad'] },
];

const monthIndex = mk => { const [y, m] = mk.split('-').map(Number); return y * 12 + (m - 1); };

/** Jefe que corresponde a un mes ('2026-11'). */
export function bossForMonth(mk, eras = BOSS_ERAS) {
  const era = [...eras].reverse().find(e => !e.from || monthIndex(mk) >= monthIndex(e.from));
  const idx = era.from ? monthIndex(mk) - monthIndex(era.from) : monthIndex(mk);
  return BOSSES.find(b => b.id === era.ids[idx % era.ids.length]);
}

/** x3 si es el reto de resistencia de ese jefe, x2 si es su stat débil. */
export function bossMultiplier(entry, boss) {
  if (entry.resist && entry.resist === boss.id) return 3;
  return entry.stat === boss.weak ? 2 : 1;
}

export function bossStatus(state, now = Date.now()) {
  const mk = monthKey(now);
  const [y, m] = mk.split('-').map(Number);
  const boss = bossForMonth(mk);
  const monthStart = new Date(y, m - 1, 1).getTime();
  const daysInMonth = new Date(y, m, 0).getDate();
  const base = state.log.filter(isBase);

  // Vida según tu nivel al empezar el mes (así el reto crece contigo).
  const xpBefore = state.log.filter(e => e.ts < monthStart).reduce((a, e) => a + e.xp, 0);
  let hp = Math.min(3000, 900 + 200 * levelFromXp(xpBefore).level);
  // Si empezaste a jugar a mitad de este mes, la vida se reduce en proporción.
  const firstTs = base.length ? Math.min(...base.map(e => e.ts)) : now;
  if (monthKey(firstTs) === mk) {
    const frac = (daysInMonth - new Date(firstTs).getDate() + 1) / daysInMonth;
    hp *= Math.max(0.25, frac);
  }
  hp = Math.max(200, Math.round(hp / 50) * 50);

  const damage = base
    .filter(e => monthKey(e.ts) === mk)
    .reduce((a, e) => a + e.xp * bossMultiplier(e, boss), 0);
  const refId = `${mk}:${boss.id}`;
  return {
    ...boss, refId, monthKey: mk, hp,
    damage: Math.min(damage, hp),
    hpLeft: Math.max(0, hp - damage),
    pct: Math.min(1, damage / hp),
    defeated: damage >= hp,
    claimed: state.log.some(e => e.type === 'boss' && e.refId === refId),
    daysLeft: daysInMonth - new Date(now).getDate() + 1,
    rewardXp: BOSS_REWARD_XP,
  };
}

/** Daño que haría un registro al jefe actual (para mostrarlo al tocar). */
export function bossDamageFor(entry, boss) {
  return isBase(entry) ? entry.xp * bossMultiplier(entry, boss) : 0;
}

export function claimBoss(state, now = Date.now()) {
  const b = bossStatus(state, now);
  if (!b.defeated) throw new Error('El jefe sigue en pie');
  if (b.claimed) throw new Error('Ya reclamaste este jefe');
  const entry = { id: uid(), ts: now, type: 'boss', refId: b.refId, name: `Jefe derrotado: ${b.name}`, stat: b.weak, xp: b.rewardXp };
  state.log.push(entry);
  return entry;
}

/** Jefes derrotados (trofeos), del más reciente al más antiguo. */
export function bossTrophies(state) {
  return state.log
    .filter(e => e.type === 'boss')
    .sort((a, b) => b.ts - a.ts)
    .map(e => ({ ...BOSSES.find(b => b.id === e.refId.split(':')[1]), ts: e.ts, monthKey: e.refId.split(':')[0] }));
}

// ---------------------------------------------------------------------
// Mascota: crece con los días que has estado activo (nunca retrocede).
// ---------------------------------------------------------------------

export const PET_STAGES = [
  { min: 0,  name: 'Huevo' },
  { min: 2,  name: 'Recién nacido' },
  { min: 7,  name: 'Cachorro' },
  { min: 21, name: 'Joven' },
  { min: 45, name: 'Adulto' },
  { min: 90, name: 'Legendario' },
];

export function petStatus(state, now = Date.now()) {
  const days = new Set(state.log.filter(isBase).map(e => dayKey(e.ts)));
  const activeDays = days.size;
  let stage = 0;
  PET_STAGES.forEach((s, i) => { if (activeDays >= s.min) stage = i; });
  const next = PET_STAGES[stage + 1] || null;
  const from = PET_STAGES[stage].min;

  // Ánimo: según cuántos días llevas sin registrar.
  let idle = 0;
  if (activeDays) {
    const today = dayKey(now);
    let cursor = today;
    while (!days.has(cursor) && idle < 30) { idle++; cursor = shiftDay(cursor, -1); }
  }
  const mood = !activeDays ? 'egg' : idle === 0 ? 'happy' : idle === 1 ? 'hungry' : 'sad';
  return {
    stage, stageName: PET_STAGES[stage].name, activeDays, mood, idleDays: idle,
    next, daysToNext: next ? next.min - activeDays : 0,
    pct: next ? (activeDays - from) / (next.min - from) : 1,
  };
}

// =====================================================================
// TERCERA ETAPA: monedas, tienda, cofre diario y escudo de racha.
// Las monedas ganadas se calculan del historial; lo gastado se guarda en
// `purchases`. Así el nivel (XP) nunca baja por comprar algo.
// =====================================================================

export const COINS = { perXp: 1 / 5, weekly: 15, boss: 60, achievement: 25 };

/** Cofre del día: se abre con el primer registro. El premio depende del día (5–20, a veces 50). */
export function chestFor(day) {
  const rnd = seeded('cofre:' + day);
  return rnd() < 0.07 ? 50 : 5 + Math.floor(rnd() * 16);
}

export function coinsFor(entry) {
  if (entry.type === 'weekly') return COINS.weekly;
  if (entry.type === 'boss') return COINS.boss;
  return Math.max(1, Math.round(entry.xp * COINS.perXp));
}

export function wallet(state, now = Date.now()) {
  const fromLog = state.log.reduce((a, e) => a + coinsFor(e), 0);
  const days = new Set(state.log.filter(isBase).map(e => dayKey(e.ts)));
  const fromChests = [...days].reduce((a, d) => a + chestFor(d), 0);
  const fromAchievements = unlockedAchievements(state, deriveProfile(state, now)).length * COINS.achievement;
  const earned = fromLog + fromChests + fromAchievements;
  const spent = (state.purchases || []).reduce((a, p) => a + p.cost, 0);
  return {
    earned, spent, balance: earned - spent,
    chestToday: days.has(dayKey(now)) ? chestFor(dayKey(now)) : null,
  };
}

export const SHOP = {
  shield: { id: 'shield', name: 'Escudo de racha', cost: 120, max: 2 },
  skies: [
    { id: 'sky-default', name: 'Atardecer',        cost: 0 },
    { id: 'sky-noche',   name: 'Noche estrellada', cost: 300 },
    { id: 'sky-aurora',  name: 'Aurora',           cost: 300 },
    { id: 'sky-rosa',    name: 'Cielo de fresa',   cost: 300 },
  ],
  titles: [
    { id: 't-imparable',  name: 'El Imparable',       cost: 200 },
    { id: 't-libros',     name: 'Devoralibros',       cost: 200 },
    { id: 't-montana',    name: 'Rey de la Montaña',  cost: 200 },
    { id: 't-chef',       name: 'Chef de la Casa',    cost: 200 },
    { id: 't-corazon',    name: 'Corazón de Oro',     cost: 200 },
  ],
};
const cosmetic = id => [...SHOP.skies, ...SHOP.titles].find(x => x.id === id);

export const owns = (state, id) => cosmetic(id)?.cost === 0 || (state.purchases || []).some(p => p.itemId === id);
export const shieldsLeft = state => (state.purchases || []).filter(p => p.kind === 'shield').length - (state.shieldDays || []).length;

function pay(state, purchase, now) {
  if (wallet(state, now).balance < purchase.cost) throw new Error('No te alcanzan las monedas');
  const p = { id: uid(), ts: now, ...purchase };
  state.purchases.push(p);
  return p;
}

/** Compra una recompensa real: genera un cupón para canjear. */
export function buyReward(state, rewardId, now = Date.now()) {
  const r = state.rewards.find(x => x.id === rewardId);
  if (!r) throw new Error('Recompensa no encontrada');
  return pay(state, { kind: 'reward', itemId: r.id, name: r.name, cost: r.cost, used: false }, now);
}
export function useCoupon(state, purchaseId, now = Date.now()) {
  const p = state.purchases.find(x => x.id === purchaseId && x.kind === 'reward');
  if (!p) throw new Error('Cupón no encontrado');
  p.used = true; p.usedAt = now;
  return p;
}
export function buyShield(state, now = Date.now()) {
  if (shieldsLeft(state) >= SHOP.shield.max) throw new Error(`Solo puedes guardar ${SHOP.shield.max} escudos`);
  return pay(state, { kind: 'shield', itemId: 'shield', name: SHOP.shield.name, cost: SHOP.shield.cost }, now);
}
export function buyCosmetic(state, itemId, now = Date.now()) {
  const item = cosmetic(itemId);
  if (!item) throw new Error('Artículo no encontrado');
  if (owns(state, itemId)) throw new Error('Ya lo tienes');
  return pay(state, { kind: itemId.startsWith('sky') ? 'sky' : 'title', itemId, name: item.name, cost: item.cost }, now);
}
export function equip(state, slot, itemId) {
  if (itemId && !owns(state, itemId)) throw new Error('Aún no lo tienes');
  state.equipped[slot] = itemId;
}
/** Compra una pieza de equipo en la Tienda. */
export function buyItem(state, itemId, now = Date.now()) {
  const item = itemById(itemId);
  if (!item || !item.cost) throw new Error('Esa pieza no se vende');
  if (ownsItem(state, itemId)) throw new Error('Ya la tienes');
  return pay(state, { kind: 'item', itemId, name: item.name, cost: item.cost }, now);
}
export { bossDrop };

export const titleName = state => SHOP.titles.find(t => t.id === state.equipped?.title)?.name || null;

/**
 * Usa escudos automáticamente si te saltaste días y eso rompería la racha.
 * Solo se gastan si alcanzan para cubrir TODO el hueco. Devuelve los días salvados.
 */
export function applyShields(state, now = Date.now()) {
  const days = new Set([...state.log.filter(isBase).map(e => dayKey(e.ts)), ...state.shieldDays]);
  const gap = [];
  let cursor = shiftDay(dayKey(now), -1);
  while (!days.has(cursor) && gap.length <= SHOP.shield.max) { gap.push(cursor); cursor = shiftDay(cursor, -1); }
  const hadStreak = days.has(cursor);
  if (!gap.length || !hadStreak || gap.length > shieldsLeft(state)) return [];
  state.shieldDays.push(...gap);
  return gap;
}

// =====================================================================
// Nombre de la mascota (por especie y por perfil)
// =====================================================================
export const PET_NAME_MAX = 14;
const LEGACY_DEFAULT_PET_NAME = 'Chispa'; // nombre automático de versiones anteriores

/** Convierte el formato viejo (pet.name único) al nuevo (pet.names por especie). */
function migratePet(base, pet = {}) {
  const out = { ...base, ...pet, names: { ...(pet.names || {}) }, asked: { ...(pet.asked || {}) } };
  if (typeof pet.name === 'string') {
    const n = pet.name.trim();
    // "Chispa" era el nombre que la app ponía sola: no lo eligió el jugador.
    if (n && n !== LEGACY_DEFAULT_PET_NAME && !out.names[out.species]) out.names[out.species] = n.slice(0, PET_NAME_MAX);
    delete out.name;
  }
  return out;
}

/** Nombre elegido por el jugador para la mascota actual ('' si no tiene). */
export function petCustomName(state) {
  return state.pet?.names?.[state.pet.species] || '';
}

/** Guarda (o borra, si viene vacío) el nombre de la mascota actual. */
export function setPetName(state, name) {
  const n = String(name ?? '').trim().slice(0, PET_NAME_MAX);
  state.pet.names = state.pet.names || {};
  if (n) state.pet.names[state.pet.species] = n;
  else delete state.pet.names[state.pet.species];
  markPetNameAsked(state);
  return n;
}

export function markPetNameAsked(state) {
  state.pet.asked = state.pet.asked || {};
  state.pet.asked[state.pet.species] = true;
}

/** ¿Hay que ofrecer "Ponle nombre a tu compañero"? Solo al eclosionar, una vez por especie. */
export function shouldAskPetName(state, beforeStage, afterStage) {
  return beforeStage === 0 && afterStage >= 1 && !petCustomName(state) && !state.pet?.asked?.[state.pet.species];
}
