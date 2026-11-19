// =====================================================================
// Equipo e inventario (lógica pura, sin pantalla).
//
// Cada pieza va en un espacio (casco, armadura…) y da un % extra de XP
// a una stat (o a todas). El extra se calcula AL REGISTRAR y queda
// guardado en el registro, así deshacer y el historial siguen igual.
//
// Cómo se consiguen:
//   - Comprándolas en la Tienda con monedas (state.purchases, kind 'item').
//   - Derrotando jefes: cada jefe suelta su pieza épica al reclamar el
//     premio (se deduce de los registros 'boss', no se guarda aparte).
// =====================================================================

export const SLOTS = [
  { id: 'casco',     name: 'Casco',      icon: '⛑️' },
  { id: 'armadura',  name: 'Armadura',   icon: '🛡️' },
  { id: 'guantes',   name: 'Guantes',    icon: '🧤' },
  { id: 'botas',     name: 'Botas',      icon: '🥾' },
  { id: 'arma',      name: 'Arma',       icon: '⚔️' },
  { id: 'capa',      name: 'Capa',       icon: '🧣' },
  { id: 'acc1',      name: 'Accesorio',  icon: '💍', type: 'accesorio' },
  { id: 'acc2',      name: 'Accesorio',  icon: '📿', type: 'accesorio' },
];
export const slotType = slotId => SLOTS.find(s => s.id === slotId)?.type || slotId;

export const RARITY = {
  comun:      { name: 'Común',      color: '#9aa0a6' },
  raro:       { name: 'Raro',       color: '#3d8bff' },
  epico:      { name: 'Épico',      color: '#a970ff' },
  legendario: { name: 'Legendario', color: '#ffb020' },
};

/** Tope de bonus por stat, sumando todas las piezas. */
export const GEAR_CAP_PCT = 30;

// stat: id de stat o 'all'. cost: precio en monedas (null = no se vende).
// boss: id del jefe que la suelta.
export const ITEMS = [
  // --- Tienda: comunes (+5 %)
  { id: 'casco-cuero',      name: 'Casco de cuero',          type: 'casco',     rarity: 'comun', stat: 'fuerza',      pct: 5,  cost: 150, icon: '⛑️' },
  { id: 'jubon',            name: 'Jubón acolchado',         type: 'armadura',  rarity: 'comun', stat: 'resistencia', pct: 5,  cost: 150, icon: '🦺' },
  { id: 'guantes-herrero',  name: 'Guantes de faena',        type: 'guantes',   rarity: 'comun', stat: 'hogar',       pct: 5,  cost: 120, icon: '🧤' },
  { id: 'botas-viaje',      name: 'Botas de viaje',          type: 'botas',     rarity: 'comun', stat: 'resistencia', pct: 5,  cost: 150, icon: '🥾' },
  { id: 'espada-practica',  name: 'Espada de práctica',      type: 'arma',      rarity: 'comun', stat: 'fuerza',      pct: 5,  cost: 150, icon: '🗡️' },
  { id: 'capa-caminante',   name: 'Capa del caminante',      type: 'capa',      rarity: 'comun', stat: 'vinculo',     pct: 5,  cost: 150, icon: '🧣' },
  { id: 'amuleto-hogar',    name: 'Amuleto del hogar',       type: 'accesorio', rarity: 'comun', stat: 'hogar',       pct: 5,  cost: 120, icon: '🏮' },
  { id: 'marcapaginas',     name: 'Marcapáginas de plata',   type: 'accesorio', rarity: 'comun', stat: 'sabiduria',   pct: 5,  cost: 120, icon: '🔖' },
  // --- Tienda: raros (+10 %)
  { id: 'diadema-sabio',    name: 'Diadema del sabio',       type: 'casco',     rarity: 'raro',  stat: 'sabiduria',   pct: 10, cost: 400, icon: '👑' },
  { id: 'guanteletes',      name: 'Guanteletes de hierro',   type: 'guantes',   rarity: 'raro',  stat: 'fuerza',      pct: 10, cost: 400, icon: '🥊' },
  { id: 'baculo-runas',     name: 'Báculo de runas',         type: 'arma',      rarity: 'raro',  stat: 'intelecto',   pct: 10, cost: 400, icon: '🪄' },
  { id: 'botas-aladas',     name: 'Botas aladas',            type: 'botas',     rarity: 'raro',  stat: 'resistencia', pct: 10, cost: 400, icon: '👢' },
  { id: 'anillo-vinculo',   name: 'Anillo del vínculo',      type: 'accesorio', rarity: 'raro',  stat: 'vinculo',     pct: 10, cost: 400, icon: '💍' },
  // --- Botín de jefes: épicos
  { id: 'cota-constancia',  name: 'Cota de la Constancia',   type: 'armadura',  rarity: 'epico', stat: 'all',         pct: 5,  boss: 'pereza',          icon: '🛡️' },
  { id: 'reloj-cronos',     name: 'Reloj de Cronos',         type: 'accesorio', rarity: 'epico', stat: 'intelecto',   pct: 15, boss: 'procrastinacion', icon: '⏳' },
  { id: 'guantes-orden',    name: 'Guantes del Orden',       type: 'guantes',   rarity: 'epico', stat: 'hogar',       pct: 15, boss: 'desorden',        icon: '🧹' },
  { id: 'yelmo-calma',      name: 'Yelmo de la Calma',       type: 'casco',     rarity: 'epico', stat: 'resistencia', pct: 15, boss: 'estres',          icon: '🪖' },
  { id: 'ojo-enfoque',      name: 'Ojo del Enfoque',         type: 'accesorio', rarity: 'epico', stat: 'sabiduria',   pct: 15, boss: 'distraccion',     icon: '🧿' },
  { id: 'capa-lazo',        name: 'Capa del Lazo',           type: 'capa',      rarity: 'epico', stat: 'vinculo',     pct: 15, boss: 'soledad',         icon: '🧥' },
  // --- Botín de los jefes de T-01 (A-13)
  { id: 'guantes-prioridad',    name: 'Guantes de la Prioridad',    type: 'guantes',  rarity: 'epico', stat: 'intelecto',   pct: 15, boss: 'multitarea',     icon: '🧤' },
  { id: 'coraza-grieta-dorada', name: 'Coraza de la Grieta Dorada', type: 'armadura', rarity: 'epico', stat: 'sabiduria',   pct: 15, boss: 'perfeccionismo', icon: '🛡️' },
  { id: 'botas-deshielo',       name: 'Botas del Deshielo',         type: 'botas',    rarity: 'epico', stat: 'fuerza',      pct: 15, boss: 'inercia',        icon: '🥾' },
  { id: 'capa-ultimo-ocaso',    name: 'Capa del Último Ocaso',      type: 'capa',     rarity: 'epico', stat: 'resistencia', pct: 15, boss: 'desvelo',        icon: '🧥' },
];
export const itemById = id => ITEMS.find(i => i.id === id);
export const bossDrop = bossId => ITEMS.find(i => i.boss === bossId) || null;
export const shopItems = () => ITEMS.filter(i => i.cost);

/** Ids de las piezas que tiene el jugador (compradas + botín de jefes). */
export function ownedItemIds(state) {
  const ids = new Set((state.purchases || []).filter(p => p.kind === 'item').map(p => p.itemId));
  for (const e of state.log || []) {
    if (e.type !== 'boss') continue;
    const drop = bossDrop(String(e.refId).split(':')[1]);
    if (drop) ids.add(drop.id);
  }
  return ids;
}
export const ownsItem = (state, id) => ownedItemIds(state).has(id);

/** Piezas equipadas que todavía posee (ignora las perdidas al deshacer). */
export function equippedItems(state) {
  const gear = state.equipped?.gear || {};
  const owned = ownedItemIds(state);
  return SLOTS.map(s => ({ slot: s, item: owned.has(gear[s.id]) ? itemById(gear[s.id]) : null }));
}

/** % extra de XP para una stat con el equipo actual (con tope). */
export function gearPct(state, statId) {
  let pct = 0;
  for (const { item } of equippedItems(state)) {
    if (item && (item.stat === statId || item.stat === 'all')) pct += item.pct;
  }
  return Math.min(GEAR_CAP_PCT, pct);
}

/** XP extra que daría el equipo a una actividad de `baseXp` en `statId`. */
export const gearExtra = (state, statId, baseXp) => Math.round(baseXp * gearPct(state, statId) / 100);

export function equipItem(state, slotId, itemId) {
  state.equipped = state.equipped || {};
  state.equipped.gear = { ...(state.equipped.gear || {}) };
  if (!itemId) { delete state.equipped.gear[slotId]; return; }
  const item = itemById(itemId);
  if (!item) throw new Error('Pieza no encontrada');
  if (!ownsItem(state, itemId)) throw new Error('Aún no tienes esa pieza');
  if (item.type !== slotType(slotId)) throw new Error('Esa pieza no va en ese espacio');
  // Una misma pieza no puede estar en dos espacios a la vez (accesorios)
  for (const [k, v] of Object.entries(state.equipped.gear)) if (v === itemId) delete state.equipped.gear[k];
  state.equipped.gear[slotId] = itemId;
}

/** Primer espacio libre (o el primero) donde va una pieza. */
export function slotFor(state, item) {
  const fits = SLOTS.filter(s => slotType(s.id) === item.type);
  const gear = state.equipped?.gear || {};
  return (fits.find(s => !gear[s.id]) || fits[0]).id;
}

/** Resumen legible de los bonus: [{ stat, pct }] (stat 'all' aparte). */
export function gearSummary(state, statIds) {
  return statIds.map(id => ({ stat: id, pct: gearPct(state, id) })).filter(x => x.pct > 0);
}
