// =====================================================================
// Kaizen — lógica pura del juego (sin DOM).
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
  { id: 'hogar',       name: 'Hogar y finanzas', short: 'HOG', icon: '🏠', color: '#2a9d4b' },
];
export const STAT_IDS = STATS.map(s => s.id);
export const statById = id => STATS.find(s => s.id === id);

export const XP_MIN = 5;
export const XP_MAX = 50;         // límite para actividades nuevas
export const QUEST_XP_MAX = 200;  // las misiones únicas pueden valer más
// XP por esfuerzo al crear una actividad (en lugar de un número libre, para
// que no se infle): Fácil, Media, Difícil.
export const EFFORT_LEVELS = [
  { id: 'facil',   name: 'Fácil',   xp: 10, hint: 'Menos de 10 minutos' },
  { id: 'media',   name: 'Media',   xp: 20, hint: 'Te cuesta un poco' },
  { id: 'dificil', name: 'Difícil', xp: 35, hint: 'Un reto de verdad' },
];

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
  const wkOf = k => { const [y, m, d] = k.split('-').map(Number); return weekKey(new Date(y, m - 1, d, 12).getTime()); };
  // Día de gracia: un solo día suelto sin registrar por semana no rompe la
  // racha (no suma, pero tampoco la corta). Así faltar un día no lo borra todo.
  const graceWeeks = new Set();
  const graceDays = [];
  let cursor = days.has(today) ? today : shiftDay(today, -1);
  let current = 0;
  for (;;) {
    if (days.has(cursor)) { current++; cursor = shiftDay(cursor, -1); continue; }
    const prev = shiftDay(cursor, -1);
    if (days.has(prev) && !graceWeeks.has(wkOf(cursor))) { graceWeeks.add(wkOf(cursor)); graceDays.push(cursor); cursor = prev; continue; }
    break;
  }

  // Mejor racha histórica (con la misma regla de gracia)
  const sorted = [...days].sort();
  const used = new Set();
  let best = 0, run = 0, prev = null;
  for (const k of sorted) {
    const gapDay = prev && shiftDay(prev, 2) === k ? shiftDay(prev, 1) : null;
    if (prev && shiftDay(prev, 1) === k) run++;
    else if (gapDay && !used.has(wkOf(gapDay))) { used.add(wkOf(gapDay)); run++; }
    else run = 1;
    best = Math.max(best, run);
    prev = k;
  }
  best = Math.max(best, current);
  // ¿Hoy ya usaste la gracia de esta semana? (para avisar con tiempo)
  const graceLeftThisWeek = !graceDays.some(d => wkOf(d) === wkOf(today));
  return { current, best, loggedToday: real.has(today), graceDays, graceLeftThisWeek };
}

// ---------------------------------------------------------------------
// Estado derivado del historial
// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// Guardianas y Afinidad
// ---------------------------------------------------------------------
export const GUARDIAN_TIERS = [1, 5, 10, 20, 35]; // nivel de stat para cada forma
/** % extra de XP (y por lo tanto de monedas) en las actividades de la stat, por forma 1–5. */
export const AFFINITY_PCT = [0, 5, 10, 15, 20];

/** Forma (1–5) que corresponde a un nivel de stat. */
export function guardianTier(statLevel) {
  let tier = 1;
  GUARDIAN_TIERS.forEach((min, i) => { if (statLevel >= min) tier = i + 1; });
  return tier;
}

/** Afinidad actual de una stat: forma de su guardiana y % extra. */
export function affinityFor(state, stat) {
  const xp = computeTotals(state.log).stats[stat] || 0;
  const tier = guardianTier(levelFromXp(xp, statXpToNext).level);
  return { tier, pct: AFFINITY_PCT[tier - 1] };
}

/**
 * ¿Vuelves después de faltar? Devuelve los días completos sin registrar desde
 * tu último registro (0 si registraste ayer u hoy), para dar la bienvenida sin culpa.
 */
export function daysAway(state, now = Date.now()) {
  const base = state.log.filter(isBase);
  if (!base.length) return 0;
  const today = dayKey(now);
  const last = dayKey(Math.max(...base.map(e => e.ts)));
  if (last >= today) return 0;
  let n = 0;
  for (let d = shiftDay(last, 1); d < today; d = shiftDay(d, 1)) n++;
  return n;
}

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
  // Retos de los jefes de T-01 (agregados en el esquema 5)
  { id: 'res-una-tarea',  name: '15 minutos en una sola tarea',        stat: 'intelecto',   xp: 15, resist: 'multitarea' },
  { id: 'res-suficiente', name: 'Lo di por terminado: era suficiente',  stat: 'sabiduria',   xp: 15, resist: 'perfeccionismo' },
  { id: 'res-primer-paso', name: '2 minutos del primer paso pendiente', stat: 'fuerza',      xp: 10, resist: 'inercia' },
  { id: 'res-dormir',     name: 'Empecé mi rutina de dormir a tiempo', stat: 'resistencia', xp: 15, resist: 'desvelo' },
];
export const RESIST_V5 = ['res-una-tarea', 'res-suficiente', 'res-primer-paso', 'res-dormir'];

export const SCHEMA_VERSION = 5;

/** Recompensas de la vida real que se compran con monedas (editables). */
export const DEFAULT_REWARDS = [
  { id: 'rw-episodio',    name: 'Un episodio de mi serie',  cost: 60,  type: 'gratis' },
  { id: 'rw-juego',       name: 'Una hora de videojuegos',  cost: 80,  type: 'gratis' },
  { id: 'rw-cafe',        name: 'Un café o bebida especial', cost: 120, type: 'gusto' },
  { id: 'rw-pelicula',    name: 'Noche de película',        cost: 250, type: 'experiencia' },
];

export function defaultState() {
  return {
    schema: SCHEMA_VERSION,
    profile: { name: 'Héroe', character: 'titan-m' },  // nombre y personaje de este perfil
    prefs: { idle: 'sway' },         // animación del personaje en reposo: 'sway' | 'static'
    // La mascota: la especie decide su arte. Los nombres se guardan por especie;
    // si no hay nombre, la app muestra el nombre de la especie.
    pet: { species: 'chispa', names: {}, asked: {} },
    activities: [...DEFAULT_ACTIVITIES, ...DEFAULT_RESIST].map(a => ({ ...a, bonus: a.bonus ? { ...a.bonus } : null })),
    rewards: DEFAULT_REWARDS.map(r => ({ ...r })),  // recompensas reales de la tienda
    purchases: [],                                   // todo lo comprado con monedas
    shieldDays: [],                                  // días salvados por un escudo de racha
    equipped: { title: null, world: 'atardecer', gear: {} },
    pinned: [],          // actividades fijadas como acceso rápido en Inicio (máx. 3)
    onboarded: false,    // ya pasó por la bienvenida (elegir nombre, personaje y hábitos)
    notices: {},         // avisos únicos ya mostrados (p. ej. devolución de Ambientes)
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
  if ((a.resist || a.basic) && state.log.some(e => e.refId === a.id && dayKey(e.ts) === dayKey(now))) {
    throw new Error(a.basic ? 'Ya lo marcaste hoy' : 'Este reto ya lo hiciste hoy');
  }
  const extra = bonus && a.bonus ? a.bonus.xp : 0;
  // El equipo da un % extra sobre la XP de la actividad (con bono incluido).
  // Se guarda en el registro: si después cambias de equipo, lo ya ganado no cambia.
  const gear = gearExtra(state, a.stat, a.xp + extra);
  // Afinidad: la guardiana de esa stat da un % extra según su forma. Depende
  // del nivel de la stat, nunca del héroe (regla A-14). Se guarda en el
  // registro, igual que el equipo.
  const { pct } = affinityFor(state, a.stat);
  const guard = pct ? Math.round((a.xp + extra) * pct / 100) : 0;
  const entry = {
    id: uid(), ts: now, type: 'activity', refId: a.id,
    name: bonus && a.bonus ? `${a.name} · ${a.bonus.label}` : a.name,
    stat: a.stat, xp: a.xp + extra + gear + guard,
  };
  if (gear) entry.gearXp = gear;
  if (guard) entry.guardXp = guard;
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

// A-14: los avatares anteriores pasan al héroe equivalente con el mismo look.
const LEGACY_CHAR = { guardabosques: 'guardian-m', exploradora: 'relampago-f', forjador: 'titan-m', cartografo: 'estratega-m', tejedora: 'sabio-f', duelista: 'implacable-f' };
const HERO_IDS = ['titan', 'relampago', 'estratega', 'sabio', 'guardian', 'implacable'];
export function migrateCharacter(id) {
  if (LEGACY_CHAR[id]) return LEGACY_CHAR[id];
  const [hero, look] = String(id || '').split('-');
  return HERO_IDS.includes(hero) ? `${hero}-${look === 'f' ? 'f' : 'm'}` : 'titan-m';
}
function migrateProfile(base, p) {
  const out = { ...base, ...(p || {}) };
  out.character = migrateCharacter(out.character);
  return out;
}

export function validateImport(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('El archivo no es un respaldo válido.');
  // Acepta respaldos de Kaizen (también los de cuando se llamaba Kaisen) y de nano-rpg.
  const data = (obj.app === 'kaizen' || obj.app === 'kaisen' || obj.app === 'nano-rpg') && obj.data ? obj.data : obj;
  if (!Array.isArray(data.log) || !Array.isArray(data.activities)) {
    throw new Error('Al respaldo le faltan datos (historial o actividades).');
  }
  const base = defaultState();
  const okEntry = e => e && typeof e.id === 'string' && Number.isFinite(e.ts) && Number.isFinite(e.xp) && STAT_IDS.includes(e.stat);
  const okAct = a => a && typeof a.id === 'string' && typeof a.name === 'string' && STAT_IDS.includes(a.stat) && Number.isFinite(a.xp);
  const activities = data.activities.filter(okAct);
  // Migración: los datos anteriores a la v3 no traían retos de resistencia.
  if ((data.schema || 1) < 3) {
    for (const r of DEFAULT_RESIST) if (!RESIST_V5.includes(r.id) && !activities.some(a => a.id === r.id)) activities.push({ ...r, bonus: null });
  }
  // Esquema 5: retos de los cuatro jefes nuevos (una sola vez; si los borras no vuelven).
  if ((data.schema || 1) < 5) {
    for (const r of DEFAULT_RESIST) if (RESIST_V5.includes(r.id) && !activities.some(a => a.id === r.id)) activities.push({ ...r, bonus: null });
  }
  for (const a of activities) if (a.basic === undefined && BASIC_IDS.has(a.id)) a.basic = true;
  return {
    ...base,
    ...data,
    schema: SCHEMA_VERSION,
    profile: migrateProfile(base.profile, data.profile),
    prefs: { ...base.prefs, ...(data.prefs || {}) },
    pet: migratePet(base.pet, data.pet),
    activities,
    rewards: Array.isArray(data.rewards) ? data.rewards.filter(r => r && typeof r.name === 'string' && Number.isFinite(r.cost)) : base.rewards,
    purchases: Array.isArray(data.purchases) ? data.purchases.filter(x => x && Number.isFinite(x.cost)) : [],
    shieldDays: Array.isArray(data.shieldDays) ? data.shieldDays : [],
    equipped: (({ sky, ...rest }) => rest)({ ...base.equipped, ...(data.equipped || {}), gear: { ...((data.equipped || {}).gear || {}) } }),
    pinned: Array.isArray(data.pinned) ? data.pinned.filter(x => typeof x === 'string').slice(0, 3) : [],
    // Quien ya tenía progreso (o venía de antes de la bienvenida) no la vuelve a ver.
    onboarded: typeof data.onboarded === 'boolean' ? data.onboarded || data.log.length > 0 : true,
    notices: data.notices && typeof data.notices === 'object' ? { ...data.notices } : {},
    quests: Array.isArray(data.quests) ? data.quests.filter(okAct) : [],
    questHistory: Array.isArray(data.questHistory) ? data.questHistory : [],
    log: data.log.filter(okEntry),
    seenAchievements: Array.isArray(data.seenAchievements) ? data.seenAchievements : [],
    guardianSeen: data.guardianSeen && typeof data.guardianSeen === 'object' ? { ...data.guardianSeen } : {},
    partner: undefined,  // la versión anterior guardaba aquí un segundo nombre; ya no se usa
  };
}

export function exportPayload(state, now = Date.now()) {
  return { app: 'kaizen', exportedAt: new Date(now).toISOString(), data: state };
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
  // T-01 / A-12 (GPT): entran en la rotación desde diciembre de 2026.
  { id: 'multitarea',     name: 'Multyra, la Hidra de los Pendientes',   weak: 'intelecto',   taunt: '"¿Ya vas a terminar? Abramos tres cosas más."',
    fear: 'Abrir tareas por impulso y dejar que se acumulen sin elegir una prioridad.',
    challenge: 'Elegí una sola tarea y le dediqué 15 minutos sin saltar a otra' },
  { id: 'perfeccionismo', name: 'Perfectus, el Caballero de Porcelana',  weak: 'sabiduria',   taunt: '"Si tiene una grieta, tíralo entero."',
    fear: 'El miedo a entregar algo imperfecto y el pensamiento de todo o nada.',
    challenge: 'Definí qué era suficiente y lo di por terminado' },
  { id: 'inercia',        name: 'Glacior, el Dragón de la Inercia',      weak: 'fuerza',      taunt: '"El primer paso pesa más que toda la montaña."',
    fear: 'El bloqueo ante el primer movimiento, incluso cuando ya elegiste qué hacer.',
    challenge: 'Hice 2 minutos del primer paso de algo pendiente' },
  { id: 'desvelo',        name: 'Noxveil, el Cuervo del Desvelo',        weak: 'resistencia', taunt: '"Dame otros veinte minutos. Mañana vemos."',
    fear: 'El hábito de alargar la noche con actividades que desplazan el descanso.',
    challenge: 'Cerré lo que me desvelaba y empecé mi rutina de dormir a tiempo' },
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
  // Desde diciembre de 2026: los 10 jefes, intercalando nuevos y conocidos.
  // Empieza con uno nuevo; Scrollax (noviembre) queda lo más lejos posible.
  { from: '2026-12', ids: ['multitarea', 'pereza', 'perfeccionismo', 'procrastinacion', 'inercia',
                           'desorden', 'desvelo', 'estres', 'soledad', 'distraccion'] },
];

const monthIndex = mk => { const [y, m] = mk.split('-').map(Number); return y * 12 + (m - 1); };

/** Jefe que corresponde a un mes ('2026-11'). */
export function bossForMonth(mk, eras = BOSS_ERAS) {
  const era = [...eras].reverse().find(e => !e.from || monthIndex(mk) >= monthIndex(e.from));
  const idx = era.from ? monthIndex(mk) - monthIndex(era.from) : monthIndex(mk);
  return BOSSES.find(b => b.id === era.ids[idx % era.ids.length]);
}

/** Recuperación del jefe: 3 % de su vida por día sin golpes en su contra, máximo 15 % al mes. */
export const BOSS_HEAL = { perDay: 0.03, maxMonth: 0.15 };

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

  // Día por día: daño de ese día y si hubo un golpe "contra el jefe" (su stat
  // débil o su reto). Un día completo sin golpes contra él, el jefe se recupera
  // un poco (nunca te quita nada a ti). Cumplir su reto da Defensa: al día
  // siguiente no puede recuperarse.
  const month = base.filter(e => monthKey(e.ts) === mk && e.ts <= now);
  const byDay = new Map();
  for (const e of month) {
    const d = byDay.get(dayKey(e.ts)) || { dmg: 0, hit: false, resist: false };
    d.dmg += e.xp * bossMultiplier(e, boss);
    if (e.stat === boss.weak || e.resist === boss.id) d.hit = true;
    if (e.resist === boss.id) d.resist = true;
    byDay.set(dayKey(e.ts), d);
  }
  const today = dayKey(now);
  const startDay = dayKey(Math.max(monthStart, firstTs));
  const healStep = Math.round(hp * BOSS_HEAL.perDay / 5) * 5;
  const healCap = Math.round(hp * BOSS_HEAL.maxMonth);
  let net = 0, healed = 0, healedYesterday = 0, defeated = false, prevResist = false;
  for (let d = startDay; d <= today && !defeated; d = shiftDay(d, 1)) {
    const day = byDay.get(d) || { dmg: 0, hit: false, resist: false };
    net += day.dmg;
    if (net >= hp) { defeated = true; break; }
    // Al terminar un día ya pasado sin golpes ni Defensa, recupera vida.
    if (d < today && !day.hit && !prevResist && net > 0 && healed < healCap) {
      const h = Math.min(healStep, net, healCap - healed);
      net -= h; healed += h;
      if (d === shiftDay(today, -1)) healedYesterday = h;
    }
    prevResist = day.resist;
  }
  const damage = Math.max(0, net);
  const defenseToday = !!byDay.get(shiftDay(today, -1))?.resist;
  const refId = `${mk}:${boss.id}`;
  return {
    ...boss, refId, monthKey: mk, hp,
    damage: Math.min(damage, hp),
    hpLeft: defeated ? 0 : Math.max(0, hp - damage),
    pct: defeated ? 1 : Math.min(1, damage / hp),
    defeated, healed, healedYesterday, defenseToday,
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

  // Ánimo: nunca castiga la ausencia. 'happy' si registraste hoy, 'rest' si
  // todavía no, y 'welcome' el día que vuelves después de 2+ días sin registrar.
  let idle = 0;
  const today = dayKey(now);
  if (activeDays) {
    let cursor = today;
    while (!days.has(cursor) && idle < 30) { idle++; cursor = shiftDay(cursor, -1); }
  }
  let gapBeforeToday = 0;
  if (days.has(today)) {
    let cursor = shiftDay(today, -1);
    while (!days.has(cursor) && gapBeforeToday < 30) { gapBeforeToday++; cursor = shiftDay(cursor, -1); }
    if (gapBeforeToday >= 30) gapBeforeToday = 0; // primer día de juego: no es "volver"
  }
  const mood = !activeDays ? 'egg' : idle > 0 ? 'rest' : gapBeforeToday >= 2 ? 'welcome' : 'happy';
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
  // Los "Ambientes" (kind 'sky') se retiraron de la tienda: no cuentan como gasto,
  // así se devuelven solos. La compra queda en el historial.
  const spent = (state.purchases || []).filter(p => p.kind !== 'sky').reduce((a, p) => a + p.cost, 0);
  return {
    earned, spent, balance: earned - spent,
    chestToday: days.has(dayKey(now)) ? chestFor(dayKey(now)) : null,
  };
}

export const SHOP = {
  shield: { id: 'shield', name: 'Escudo de racha', cost: 120, max: 2 },
  titles: [
    { id: 't-imparable',  name: 'El Imparable',       cost: 200 },
    { id: 't-libros',     name: 'Devoralibros',       cost: 200 },
    { id: 't-montana',    name: 'Rey de la Montaña',  cost: 200 },
    { id: 't-chef',       name: 'Chef de la Casa',    cost: 200 },
    { id: 't-corazon',    name: 'Corazón de Oro',     cost: 200 },
  ],
};
const cosmetic = id => SHOP.titles.find(x => x.id === id);

export const owns = (state, id) => cosmetic(id)?.cost === 0 || (state.purchases || []).some(p => p.itemId === id);
export const shieldsLeft = state => (state.purchases || []).filter(p => p.kind === 'shield').length - (state.shieldDays || []).length;

function pay(state, purchase, now) {
  if (wallet(state, now).balance < purchase.cost) throw new Error('No te alcanzan las monedas');
  const p = { id: uid(), ts: now, ...purchase };
  state.purchases.push(p);
  return p;
}

// ---------------------------------------------------------------------
// Recompensas: precio guía y retos (contra el autosabotaje)
// ---------------------------------------------------------------------
/** Rango de precio sugerido por tipo de recompensa. */
export const REWARD_PRICE = { gratis: [40, 100], gusto: [120, 250], experiencia: [300, 600], inversion: [600, 1000] };
/** ¿El precio está por debajo de la guía de su tipo? */
export function rewardPriceHint(type, cost) {
  const range = REWARD_PRICE[type];
  if (!range) return null;
  return { min: range[0], max: range[1], low: cost < range[0] };
}

/** Retos que se le pueden poner a una recompensa grande. */
export const REWARD_LOCKS = [
  { id: 'habit',    name: 'Cumplir un hábito varios días' },
  { id: 'boss',     name: 'Derrotar a un jefe' },
  { id: 'guardian', name: 'Evolucionar una guardiana' },
];
/**
 * Estado del reto de una recompensa. Los retos de hábito y de jefe se cuentan
 * desde que se puso el reto o desde el último canje de esa recompensa (cada
 * canje pide cumplirlo de nuevo). El de guardiana queda cumplido para siempre.
 * Devuelve null si no tiene reto.
 */
export function rewardLock(state, r, now = Date.now()) {
  const lock = r?.lock;
  if (!lock) return null;
  const lastBuy = Math.max(0, ...state.purchases.filter(p => p.kind === 'reward' && p.itemId === r.id).map(p => p.ts || 0));
  const since = Math.max(lock.since || 0, lastBuy);
  let progress = 0, target = 1, label = '';
  if (lock.kind === 'habit') {
    const a = state.activities.find(x => x.id === lock.act);
    target = Math.max(1, lock.n || 5);
    progress = new Set(state.log.filter(e => isBase(e) && e.refId === lock.act && e.ts > since && e.ts <= now).map(e => dayKey(e.ts))).size;
    label = `«${a ? a.name : 'Hábito borrado'}» ${target} días`;
  } else if (lock.kind === 'boss') {
    progress = state.log.some(e => e.type === 'boss' && e.ts > since && e.ts <= now) ? 1 : 0;
    label = 'Derrota a un jefe';
  } else if (lock.kind === 'guardian') {
    target = Math.max(2, lock.tier || 2);
    progress = affinityFor(state, lock.stat).tier;
    label = `Guardiana de ${statById(lock.stat)?.name || lock.stat} en forma ${target}`;
  }
  progress = Math.min(progress, target);
  return { locked: progress < target, progress, target, label };
}

/** Compra una recompensa real: genera un cupón para canjear. */
export function buyReward(state, rewardId, now = Date.now()) {
  const r = state.rewards.find(x => x.id === rewardId);
  if (!r) throw new Error('Recompensa no encontrada');
  const lock = rewardLock(state, r, now);
  if (lock?.locked) throw new Error(`Primero cumple su reto: ${lock.label} (${lock.progress}/${lock.target})`);
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
  return pay(state, { kind: 'title', itemId, name: item.name, cost: item.cost }, now);
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
  if (!gap.length || !hadStreak) return [];
  // Gasta los menos escudos posibles: el día de gracia de la semana puede
  // cubrir uno de los días del hueco.
  for (let k = 0; k <= Math.min(gap.length, shieldsLeft(state)); k++) {
    const use = gap.slice(0, k);
    if (computeStreak(state.log, now, [...state.shieldDays, ...use]).current > k) {   // conecta con la racha de antes
      state.shieldDays.push(...use);
      return use;
    }
  }
  return [];
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

// =====================================================================
// Claridad: accesos rápidos y devoluciones
// =====================================================================
export const QUICK_MAX = 3;

/** Monedas devueltas por los Ambientes retirados de la tienda. */
export const skyRefund = state => (state.purchases || []).filter(p => p.kind === 'sky').reduce((a, p) => a + p.cost, 0);

/**
 * Accesos rápidos de Inicio: primero las fijadas por el jugador y después las
 * que más usa (últimos 60 días; empate → la más reciente). Los retos de
 * resistencia no entran solos (el del jefe del mes ya está en su tarjeta).
 */
export function quickActivities(state, now = Date.now(), n = QUICK_MAX) {
  const exists = id => state.activities.find(a => a.id === id);
  const out = (state.pinned || []).map(exists).filter(Boolean).slice(0, n);
  const since = now - 60 * 86400000;
  const stats = {};
  for (const e of state.log) {
    if (e.type !== 'activity' || e.ts < since) continue;
    const s = (stats[e.refId] ||= { count: 0, last: 0 });
    s.count++; s.last = Math.max(s.last, e.ts);
  }
  const freq = Object.entries(stats)
    .sort(([, a], [, b]) => b.count - a.count || b.last - a.last)
    .map(([id]) => exists(id))
    .filter(a => a && !a.resist && !a.basic && !out.includes(a));
  return [...out, ...freq].slice(0, n);
}

export const isPinned = (state, id) => (state.pinned || []).includes(id);

/** Fija una actividad nueva en Inicio si queda espacio (sin soltar ninguna). */
export function pinIfRoom(state, id) {
  const a = state.activities.find(x => x.id === id);
  if (!a || a.basic || a.resist) return false;
  state.pinned = (state.pinned || []).filter(x => state.activities.some(y => y.id === x));
  if (state.pinned.includes(id) || state.pinned.length >= QUICK_MAX) return false;
  state.pinned.push(id);
  return true;
}

// ---------------------------------------------------------------------
// Plan: qué toca hoy. Una actividad puede tener días fijos de la semana
// ({ kind: 'days', days: [1, 3, 5] }, 0 = domingo) o una meta semanal
// flexible ({ kind: 'week', target: 3 }). Sin plan, es libre. Un día fuera
// de agenda nunca cuenta como falta: solo se mide lo hecho en la semana.
// ---------------------------------------------------------------------
export function normalizePlan(plan) {
  if (!plan || typeof plan !== 'object') return null;
  if (plan.kind === 'days') {
    const days = [...new Set((plan.days || []).map(Number).filter(d => d >= 0 && d <= 6))].sort();
    return days.length ? { kind: 'days', days } : null;
  }
  if (plan.kind === 'week') {
    const target = Math.min(7, Math.max(1, Math.round(Number(plan.target) || 0)));
    return target ? { kind: 'week', target } : null;
  }
  return null;
}

/** Estado de una actividad con plan en la semana actual (lunes a domingo). */
export function planStatus(state, act, now = Date.now()) {
  const plan = normalizePlan(act?.plan);
  if (!plan) return null;
  const wk = weekKey(now);
  const today = dayKey(now);
  const doneDays = new Set(state.log.filter(e => isBase(e) && e.refId === act.id && weekKey(e.ts) === wk).map(e => dayKey(e.ts)));
  const doneToday = doneDays.has(today);
  const weekday = new Date(now).getDay();
  const target = plan.kind === 'days' ? plan.days.length : plan.target;
  const done = Math.min(doneDays.size, target);
  const met = doneDays.size >= target;
  const scheduledToday = plan.kind === 'days' ? plan.days.includes(weekday) : !met || doneToday;
  return { plan, done, target, met, doneToday, scheduledToday, dueToday: scheduledToday && !doneToday && !met };
}

/** Lo que toca hoy: actividades con plan programadas para hoy o con meta semanal pendiente. */
export function todayPlan(state, now = Date.now()) {
  return state.activities
    .map(a => ({ act: a, st: planStatus(state, a, now) }))
    .filter(x => x.st && (x.st.scheduledToday || x.st.doneToday))
    .sort((a, b) => (a.st.doneToday - b.st.doneToday) || (b.st.dueToday - a.st.dueToday));
}

/** Fija o suelta una actividad. Si ya hay 3 fijadas, suelta la más antigua. */
export function togglePin(state, id) {
  const p = (state.pinned || []).filter(x => x !== id);
  if (p.length === (state.pinned || []).length) { p.push(id); while (p.length > QUICK_MAX) p.shift(); }
  state.pinned = p;
  return p.includes(id);
}

// =====================================================================
// Bienvenida: lista de hábitos para elegir al empezar
// Los ids "def-…" coinciden con las actividades sugeridas de siempre, así
// el historial y las misiones siguen reconociéndolas.
// =====================================================================
// area: grupo en la bienvenida. basic: true = "Lo básico", cuenta una vez al día.
export const HABIT_AREAS = [
  { id: 'basico',   name: 'Lo básico',       hint: 'Retos de todos los días. Uno por día cada uno, poco XP pero constante.' },
  { id: 'mover',    name: 'Moverme' },
  { id: 'mente',    name: 'Mente y calma' },
  { id: 'dinero',   name: 'Dinero y hogar' },
  { id: 'personas', name: 'Personas' },
  { id: 'crecer',   name: 'Crecer' },
];
export const HABIT_TEMPLATES = [
  // Lo básico (una vez al día)
  { id: 'tpl-dormir',         name: 'Dormir 7 horas o más',          stat: 'resistencia', xp: 10, area: 'basico', basic: true },
  { id: 'tpl-agua',           name: 'Tomar mis vasos de agua',       stat: 'resistencia', xp: 5,  area: 'basico', basic: true },
  { id: 'bas-fruta',          name: 'Comer fruta o verdura',         stat: 'fuerza',      xp: 5,  area: 'basico', basic: true },
  { id: 'bas-desayuno',       name: 'Desayunar bien',                stat: 'fuerza',      xp: 5,  area: 'basico', basic: true },
  { id: 'bas-aire',           name: 'Salir a tomar aire o sol',      stat: 'sabiduria',   xp: 5,  area: 'basico', basic: true },
  { id: 'bas-cama',           name: 'Tender la cama',                stat: 'hogar',       xp: 5,  area: 'basico', basic: true },
  { id: 'bas-cuidado',        name: 'Ducharme y arreglarme',         stat: 'resistencia', xp: 5,  area: 'basico', basic: true },
  // Moverme
  { id: 'def-hike',           name: 'Caminata',                      stat: 'resistencia', xp: 25, area: 'mover' },
  { id: 'def-gym',            name: 'Entrenar en el gym',            stat: 'fuerza',      xp: 30, area: 'mover' },
  { id: 'def-entreno-casa',   name: 'Entreno corto en casa',         stat: 'fuerza',      xp: 15, area: 'mover' },
  { id: 'tpl-correr',         name: 'Correr',                        stat: 'resistencia', xp: 30, area: 'mover' },
  { id: 'def-mtb',            name: 'Bicicleta',                     stat: 'resistencia', xp: 35, area: 'mover', bonus: { label: 'Ruta larga', xp: 15 } },
  { id: 'tpl-yoga',           name: 'Yoga o estiramientos',          stat: 'fuerza',      xp: 15, area: 'mover' },
  { id: 'tpl-nadar',          name: 'Nadar',                         stat: 'resistencia', xp: 30, area: 'mover' },
  { id: 'tpl-deporte',        name: 'Jugar un deporte',              stat: 'fuerza',      xp: 30, area: 'mover' },
  // Mente y calma
  { id: 'tpl-meditar',        name: 'Meditar o respirar 5 min',      stat: 'sabiduria',   xp: 15, area: 'mente' },
  { id: 'tpl-diario',         name: 'Escribir 3 cosas buenas del día', stat: 'sabiduria', xp: 15, area: 'mente' },
  { id: 'tpl-pausa-redes',    name: 'Una hora sin redes',            stat: 'sabiduria',   xp: 15, area: 'mente' },
  { id: 'def-leer',           name: 'Leer 20+ min',                  stat: 'sabiduria',   xp: 15, area: 'mente' },
  { id: 'def-terminar-libro', name: 'Terminar un libro',             stat: 'sabiduria',   xp: 100, area: 'mente' },
  { id: 'tpl-reflexion',      name: 'Orar o reflexionar',            stat: 'sabiduria',   xp: 15, area: 'mente' },
  // Dinero y hogar
  { id: 'tpl-ahorro',         name: 'Ahorrar algo hoy',              stat: 'hogar',       xp: 15, area: 'dinero' },
  { id: 'tpl-sin-gastos',     name: 'Un día sin compras impulsivas', stat: 'hogar',       xp: 15, area: 'dinero' },
  { id: 'def-cocinar',        name: 'Cocinar en vez de pedir',       stat: 'hogar',       xp: 10, area: 'dinero' },
  { id: 'tpl-finanzas',       name: 'Revisar mis gastos',            stat: 'hogar',       xp: 20, area: 'dinero' },
  { id: 'def-proyecto-casa',  name: 'Proyecto de la casa',           stat: 'hogar',       xp: 30, area: 'dinero' },
  { id: 'tpl-limpiar',        name: 'Limpiar u ordenar',             stat: 'hogar',       xp: 15, area: 'dinero' },
  { id: 'tpl-plantas',        name: 'Cuidar plantas o mascotas',     stat: 'hogar',       xp: 10, area: 'dinero' },
  // Personas
  { id: 'tpl-llamar',         name: 'Llamar a alguien querido',      stat: 'vinculo',     xp: 15, area: 'personas' },
  { id: 'def-tiempo',         name: 'Tiempo de calidad juntos',      stat: 'vinculo',     xp: 30, area: 'personas' },
  { id: 'def-familia',        name: 'Salida con familia o amigos',   stat: 'vinculo',     xp: 30, area: 'personas' },
  { id: 'tpl-ayudar',         name: 'Ayudar a alguien',              stat: 'vinculo',     xp: 20, area: 'personas' },
  { id: 'tpl-voluntariado',   name: 'Voluntariado',                  stat: 'vinculo',     xp: 30, area: 'personas' },
  // Crecer
  { id: 'def-estudio',        name: 'Estudiar',                      stat: 'intelecto',   xp: 25, area: 'crecer' },
  { id: 'tpl-idioma',         name: 'Practicar un idioma',           stat: 'intelecto',   xp: 20, area: 'crecer' },
  { id: 'def-programar',      name: 'Avanzar un proyecto propio',    stat: 'intelecto',   xp: 25, area: 'crecer' },
  { id: 'tpl-curso',          name: 'Avanzar un curso',              stat: 'intelecto',   xp: 25, area: 'crecer' },
  { id: 'def-tarea',          name: 'Entregar una tarea',            stat: 'intelecto',   xp: 40, area: 'crecer' },
];
export const BASIC_IDS = new Set(HABIT_TEMPLATES.filter(t => t.basic).map(t => t.id));

// Ideas de recompensas, por tipo. Las gratis cuestan menos y salen primero:
// un premio no debería deshacer la meta (p. ej. gastar cuando quieres ahorrar).
export const REWARD_TYPES = [
  { id: 'gratis',      name: 'Gratis' },
  { id: 'gusto',       name: 'Pequeño gusto' },
  { id: 'experiencia', name: 'Experiencia' },
  { id: 'inversion',   name: 'Inversión en mí' },
];
export const REWARD_TEMPLATES = [
  { id: 'rw-episodio',    name: 'Un episodio de mi serie',      cost: 60,  type: 'gratis' },
  { id: 'rw-juego',       name: 'Una hora de videojuegos',      cost: 80,  type: 'gratis' },
  { id: 'rw-siesta',      name: 'Una siesta sin culpa',         cost: 80,  type: 'gratis' },
  { id: 'rw-hobby',       name: 'Un rato para mi hobby',        cost: 80,  type: 'gratis' },
  { id: 'rw-bano',        name: 'Un baño largo o una ducha relajada', cost: 60, type: 'gratis' },
  { id: 'rw-sin-alarma',  name: 'Una mañana sin alarma',        cost: 150, type: 'gratis' },
  { id: 'rw-cafe',        name: 'Un café o bebida especial',    cost: 120, type: 'gusto' },
  { id: 'rw-postre',      name: 'Mi postre favorito',           cost: 120, type: 'gusto' },
  { id: 'rw-snack',       name: 'Un snack que me encanta',      cost: 100, type: 'gusto' },
  { id: 'rw-pelicula',    name: 'Noche de película',            cost: 250, type: 'experiencia' },
  { id: 'rw-salida',      name: 'Una salida en pareja',         cost: 300, type: 'experiencia' },
  { id: 'rw-amigos',      name: 'Comer con amigos',             cost: 300, type: 'experiencia' },
  { id: 'rw-paseo',       name: 'Un paseo a un lugar nuevo',    cost: 250, type: 'experiencia' },
  { id: 'rw-libro',       name: 'Un libro nuevo',               cost: 350, type: 'inversion' },
  { id: 'rw-curso',       name: 'Un curso o taller',            cost: 500, type: 'inversion' },
  { id: 'rw-ropa',        name: 'Ropa o equipo para entrenar',  cost: 450, type: 'inversion' },
];
export const REWARD_PICK_MAX = 6;

/** Agrega recompensas sugeridas sin duplicar. Devuelve cuántas agregó. */
export function addRewards(state, ids = []) {
  let n = 0;
  for (const id of ids) {
    const t = REWARD_TEMPLATES.find(r => r.id === id);
    if (!t || state.rewards.some(r => r.id === id)) continue;
    state.rewards.push({ ...t });
    n++;
  }
  return n;
}
export const ONBOARD_MIN = 1;
export const ONBOARD_MAX = 12;

/**
 * Termina la bienvenida: guarda nombre y personaje, deja como actividades
 * SOLO los hábitos elegidos (los retos de resistencia se conservan) y fija
 * los 3 primeros como accesos rápidos de Inicio.
 * Si no se eligió ninguno, se quedan las actividades sugeridas.
 */
export function applyOnboarding(state, { name, character, habitIds = [], rewardIds = [] } = {}) {
  if (name !== undefined) state.profile.name = String(name).trim().slice(0, 16) || 'Héroe';
  if (character) state.profile.character = migrateCharacter(character);
  const chosen = habitIds.map(id => HABIT_TEMPLATES.find(t => t.id === id)).filter(Boolean).slice(0, ONBOARD_MAX);
  if (chosen.length) {
    const resist = state.activities.filter(a => a.resist);
    state.activities = [...chosen.map(t => ({ ...t, bonus: t.bonus ? { ...t.bonus } : null })), ...resist];
    state.pinned = chosen.filter(t => !t.basic).slice(0, QUICK_MAX).map(t => t.id);
  }
  const rewards = rewardIds.map(id => REWARD_TEMPLATES.find(r => r.id === id)).filter(Boolean).slice(0, REWARD_PICK_MAX);
  if (rewards.length) state.rewards = rewards.map(r => ({ ...r }));
  state.onboarded = true;
  return state;
}

/** Agrega hábitos de la lista a un perfil existente (sin duplicar). Devuelve cuántos agregó. */
export function addHabits(state, habitIds = []) {
  let n = 0;
  for (const id of habitIds) {
    const t = HABIT_TEMPLATES.find(x => x.id === id);
    if (!t || state.activities.some(a => a.id === id)) continue;
    const firstResist = state.activities.findIndex(a => a.resist);
    const act = { ...t, bonus: t.bonus ? { ...t.bonus } : null };
    if (firstResist < 0) state.activities.push(act); else state.activities.splice(firstResist, 0, act);
    pinIfRoom(state, act.id);
    n++;
  }
  return n;
}
