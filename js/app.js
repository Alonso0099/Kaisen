// =====================================================================
// Kaisen — interfaz. Lee/guarda el estado, dibuja las pantallas y
// conecta los botones. La lógica de juego vive en logic.js.
// =====================================================================
import * as G from './logic.js';
import { embers, sparks } from './fx.js';
import { makeCard, shareCard } from './share.js';
import * as Profiles from './profiles.js';
import * as Gear from './gear.js';
import { art, CHARACTERS, characterById, characterImg, guardianFor, guardianEvolutions, syncGuardianSeen, GUARDIANS, WORLDS, worldById, DEFAULT_WORLD, DEFAULT_PET, PET_SPECIES, speciesById } from './catalog.js';

export const APP_VERSION = '1.10.0';
const BACKUP_REMINDER_DAYS = 7;

const $ = sel => document.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------------------------------------------------------------------
// Persistencia
// ---------------------------------------------------------------------
// Cada perfil guarda su estado por separado (ver profiles.js).
let { id: profileId, state } = Profiles.boot();

function save() {
  try {
    Profiles.saveProfileState(profileId, state);
  } catch (err) {
    toast('⚠️ No se pudo guardar. Exporta un respaldo.', { kind: 'ach' });
  }
}

// Arte que todavía no existe: primero se intenta la imagen de respaldo
// (data-fb) y si tampoco existe se marca como .missing para que el CSS
// muestre "Próximamente" o el emoji de respaldo.
// Las rutas que fallaron se recuerdan para no volver a pedirlas en cada
// redibujado (se olvidan al recargar la app, por si agregaste el arte).
const missingArt = new Set();
document.addEventListener('error', e => {
  const img = e.target;
  if (img?.tagName !== 'IMG') return;
  missingArt.add(img.getAttribute('src'));
  if (img.dataset.fb && !missingArt.has(img.dataset.fb)) { const fb = img.dataset.fb; delete img.dataset.fb; img.src = fb; return; }
  if ('missing' in img.dataset) img.classList.add('missing');
}, true);

/** <img> que, si ya sabemos que falta, se pinta directamente como pendiente. */
function artImg(src, { alt = '', fb = null, cls = '' } = {}) {
  let use = src;
  if (missingArt.has(use)) use = fb && !missingArt.has(fb) ? fb : null;
  if (!use) return `<img class="missing ${cls}" alt="" data-missing>`;
  return `<img class="${cls}" src="${use}" alt="${alt}" ${fb && use !== fb ? `data-fb="${fb}"` : ''} data-missing>`;
}

// La barra superior se vuelve sólida al hacer scroll para que el título se lea.
addEventListener('scroll', () => document.body.classList.toggle('scrolled', scrollY > 24), { passive: true });

// Pide a Safari que no borre los datos (si lo permite).
if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});

// ---------------------------------------------------------------------
// Commit: aplica un cambio, guarda, redibuja y celebra lo que haya subido
// ---------------------------------------------------------------------
function commit(mutate, { celebrate = true } = {}) {
  const before = G.deriveProfile(state);
  const beforeAdv = adventure();
  const result = mutate(state);
  save();
  const after = G.deriveProfile(state);
  renderAll(after);
  if (celebrate) {
    celebrateAdventure(beforeAdv, adventure());
    celebrateChanges(before, after);
  }
  return result;
}

/** Foto del estado de jefe, misiones semanales y mascota. */
function adventure() {
  return { boss: G.bossStatus(state), weekly: G.weeklyMissions(state), pet: G.petStatus(state) };
}
const claimables = adv => adv.weekly.filter(m => m.done && !m.claimed).length + (adv.boss.defeated && !adv.boss.claimed ? 1 : 0);

function celebrateAdventure(before, after) {
  if (after.boss.refId === before.boss.refId && after.boss.damage > before.boss.damage) {
    document.querySelectorAll('.boss-hit').forEach(el => { el.classList.remove('hit-shake'); void el.offsetWidth; el.classList.add('hit-shake'); });
  }
  if (after.boss.defeated && !before.boss.defeated && after.boss.refId === before.boss.refId) {
    toast(`👹 ¡Derrotaste a <b>${esc(after.boss.name)}</b>! Reclama tu premio en Misiones.`, { kind: 'ach', duration: 5000 });
  }
  after.weekly.forEach((m, i) => {
    const b = before.weekly[i];
    if (m.done && b && b.refId === m.refId && !b.done) toast(`🗓️ Misión semanal cumplida: <b>${esc(m.title)}</b>`, { kind: 'ach', duration: 4500 });
  });
  if (after.pet.stage > before.pet.stage) {
    // Se espera un momento: si este mismo registro sube de nivel, la animación
    // de nivel aparece primero y el nombre se pide al cerrarla.
    if (G.shouldAskPetName(state, before.pet.stage, after.pet.stage)) queueModal(askPetNameOnHatch);
    else toast(`🐣 ¡${esc(petName())} evolucionó a <b>${after.pet.stageName}</b>!`, { kind: 'ach', duration: 5000 });
  }
}

// ---------------------------------------------------------------------
// Cola de celebraciones (eclosión, evolución de guardianas): se muestran
// de a una, después de la animación de nivel y sin tapar otra ventana.
// ---------------------------------------------------------------------
const modalQueue = [];
let modalBusy = false;
function queueModal(fn) {
  modalQueue.push(fn);
  setTimeout(runModals, 900); // da tiempo a que aparezca la animación de nivel si la hay
}
async function runModals() {
  if (modalBusy || levelUpOpen || !$('#sheetBackdrop').hidden || !modalQueue.length) return;
  modalBusy = true;
  try { await modalQueue.shift()(); } finally { modalBusy = false; }
  if (modalQueue.length) setTimeout(runModals, 450);
}

/** Aviso de evolución: retrato de la nueva forma, nombre y frase. */
async function showGuardianEvolution(statId, tier) {
  const s = G.statById(statId);
  const g = guardianFor(statId, guardianLevelFor(tier));
  const name = g.name || `Guardiana de ${s.name}`;
  const res = await openSheet(`
    <div class="evo" style="--c:${s.color}">
      <div class="evo-kicker">¡Evolución!</div>
      <div class="evo-art">${artImg(art.guardian(statId, tier), { alt: esc(name), fb: tier > 1 ? art.guardian(statId, 1) : null })}<span class="soon">Próximamente</span></div>
      <h3>${esc(name)}</h3>
      <div class="evo-form">Forma ${tier} de 5 · ${s.name}</div>
      ${GUARDIANS[statId]?.phrase ? `<blockquote class="evo-quote">«${esc(GUARDIANS[statId].phrase)}»</blockquote>` : ''}
    </div>
    <div class="btn-row"><button class="btn" data-close="see">Ver guardianas</button><button class="btn btn-primary" data-close="ok">Continuar</button></div>`);
  if (res === 'see') { showView('achievements'); showView('guardians'); }
}
const guardianLevelFor = tier => [1, 5, 10, 20, 35][tier - 1] || 1;

/** Al eclosionar: "Ponle nombre a tu compañero" (se puede omitir). */
async function askPetNameOnHatch() {
  const sp = speciesById(state.pet.species);
  const p = openSheet(`
    <h3>¡Tu huevo eclosionó!</h3>
    <div class="pet-sheet-art hatch"><img class="pet-img happy" src="${petImg(1)}" alt=""></div>
    <label class="field"><span>Ponle nombre a tu compañero</span>
      <input type="text" id="hatchName" maxlength="${G.PET_NAME_MAX}" placeholder="${esc(sp.name)}" autocomplete="off"></label>
    <p class="small">Si lo dejas vacío se llamará <b>${esc(sp.name)}</b>. Puedes cambiarlo cuando quieras desde su ficha.</p>
    <div class="btn-row"><button class="btn" data-close="skip">Omitir</button><button class="btn btn-primary" id="hatchSave">Guardar</button></div>`);
  $('#hatchSave').onclick = () => closeSheet({ name: $('#hatchName').value });
  $('#hatchName').addEventListener('keydown', e => { if (e.key === 'Enter') $('#hatchSave').click(); });
  const res = await p;
  // Omitir, cerrar tocando fuera o guardar vacío: se recuerda que ya se preguntó.
  if (res && typeof res === 'object') G.setPetName(state, res.name);
  else G.markPetNameAsked(state);
  save();
  renderAll();
  toast(`🐣 ¡Conoce a <b>${esc(petName())}</b>!`, { kind: 'ach', duration: 4000 });
}

function celebrateChanges(before, after) {
  // Subidas de nivel de stats
  for (const s of G.STATS) {
    if (after.stats[s.id].level > before.stats[s.id].level) {
      toast(`${s.icon} ¡${s.name} sube a nivel ${after.stats[s.id].level}!`);
      const el = document.querySelector(`.stat[data-stat="${s.id}"]`);
      el?.classList.remove('pulse'); void el?.offsetWidth; el?.classList.add('pulse');
    }
  }
  // Logros nuevos
  const unlocked = G.unlockedAchievements(state, after);
  const fresh = unlocked.filter(id => !state.seenAchievements.includes(id));
  if (fresh.length) {
    state.seenAchievements = [...new Set([...state.seenAchievements, ...fresh])];
    save();
    fresh.forEach((id, i) => {
      const a = G.ACHIEVEMENTS.find(x => x.id === id);
      setTimeout(() => toast(`${a.icon} Logro: <b>${esc(a.name)}</b>`, { kind: 'ach', duration: 4000 }), 300 + i * 500);
    });
  }
  // Guardianas que cambiaron de forma (solo la forma más alta; nunca se repite)
  const evos = guardianEvolutions(after.stats, state.guardianSeen);
  if (evos.length) {
    for (const { stat, tier } of evos) {
      state.guardianSeen = { ...state.guardianSeen, [stat]: tier };
      queueModal(() => showGuardianEvolution(stat, tier));
    }
    save();
  }
  // Nivel general
  if (after.level > before.level) showLevelUp(after);
}

/** Lo ya conseguido al abrir, cambiar de perfil o importar no se vuelve a anunciar. */
function syncSeen() {
  state.seenAchievements = [...new Set([...state.seenAchievements, ...G.unlockedAchievements(state)])];
  state.guardianSeen = syncGuardianSeen(state.guardianSeen, G.deriveProfile(state).stats);
}

// ---------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------
function renderAll(p = G.deriveProfile(state)) {
  const adv = adventure();
  renderHeader(p, adv);
  renderHome(p);
  renderMinis(adv);
  renderAdventure(adv);
  renderGoal(p, adv);
  renderShop();
  renderQuests();
  renderHistory();
  renderAchievements(p);
  renderGuardians(p);
  renderGear();
  renderSettings();
}

function renderHeader(p, adv = adventure()) {
  $('#streakNum').textContent = p.streak.current;
  $('#streakChip').classList.toggle('cold', !p.streak.loggedToday);
  $('#streakChip').title = p.streak.loggedToday
    ? `Racha de ${p.streak.current} días`
    : p.streak.current ? '¡Registra algo hoy para mantener la racha!' : 'Sin racha activa';
  const qb = $('#questBadge');
  // Insignia de Misiones: premios por reclamar + misiones únicas pendientes
  const pending = claimables(adv) + state.quests.length;
  qb.hidden = !pending;
  qb.textContent = pending;
  $('#settingsBadge').hidden = !needsBackup();
  const coins = Math.max(0, G.wallet(state).balance);
  const cn = $('#coinNum');
  if (cn.textContent !== String(coins) && cn.dataset.ready) {
    const chip = $('#coinChip'); chip.classList.remove('pop'); void chip.offsetWidth; chip.classList.add('pop');
  }
  cn.textContent = coins; cn.dataset.ready = '1';
  document.documentElement.dataset.sky = state.equipped?.sky || 'sky-default';
}

const statIcon = id => art.stat(id);
const sceneFx = embers($('#sceneFx'));

/** Gráfico radar de las 6 stats (SVG). */
function radarSvg(p) {
  const R = 62, C = 80;
  const vals = G.STATS.map(s => p.stats[s.id].level - 1 + p.stats[s.id].pct);
  const max = Math.max(2, ...vals) * 1.08;
  const pt = (i, r) => {
    const a = -Math.PI / 2 + i * Math.PI / 3;
    return [C + Math.cos(a) * r, C + Math.sin(a) * r];
  };
  const poly = r => G.STATS.map((_, i) => pt(i, r).map(n => n.toFixed(1)).join(',')).join(' ');
  const shape = G.STATS.map((_, i) => pt(i, R * Math.max(.1, vals[i] / max)).map(n => n.toFixed(1)).join(',')).join(' ');
  return `<svg viewBox="0 0 160 160" aria-label="Gráfico de stats">
    ${[1, .66, .33].map(k => `<polygon class="ring" points="${poly(R * k)}"/>`).join('')}
    ${G.STATS.map((_, i) => { const [x, y] = pt(i, R); return `<line class="axis" x1="${C}" y1="${C}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }).join('')}
    <polygon class="shape" points="${shape}"/>
    ${G.STATS.map((s, i) => { const [x, y] = pt(i, R + 12); return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" fill="${s.color}" style="filter:brightness(1.4)">${s.short}</text>`; }).join('')}
  </svg>`;
}

const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Fondo de Inicio: el mundo elegido (si su imagen existe) o el por defecto. */
let worldShown = null;
function renderWorld() {
  const id = state.equipped?.world || DEFAULT_WORLD;
  if (id === worldShown) return;
  const url = new URL(art.world(id), location.href).href;
  const probe = new Image();
  probe.onload = () => { document.documentElement.style.setProperty('--world', `url("${url}")`); worldShown = id; };
  probe.onerror = () => { if (id !== DEFAULT_WORLD) { state.equipped.world = DEFAULT_WORLD; renderWorld(); } };
  probe.src = url;
}

/** Muestra el personaje del perfil activo y su animación de reposo. */
function renderHero() {
  renderWorld();
  const ch = characterById(state.profile.character);
  const img = $('#heroImg');
  const src = characterImg(ch.id);
  if (img.getAttribute('src') !== src) img.src = src;
  img.alt = ch.name;
  const stage = $('#heroStage');
  stage.style.setProperty('--flash', ch.accent);
  stage.classList.toggle('idle-sway', state.prefs?.idle !== 'static');
  stage.classList.toggle('idle-static', state.prefs?.idle === 'static');
}

/** Destello breve detrás del personaje (al completar misiones). */
let pendingFlash = false;
function heroFlash() {
  if (prefersReducedMotion()) return;
  if (!$('#view-home').classList.contains('active')) { pendingFlash = true; return; }
  pendingFlash = false;
  const f = $('#heroFlash');
  f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
}

let lastLevelShown = null;
function renderHome(p) {
  document.documentElement.style.setProperty('--rank', p.rank.color);
  $('#scene').classList.toggle('has-aura', p.level >= 5);
  sceneFx.set({ color: p.level >= 5 ? p.rank.color : '#ffd23f', amount: Math.min(60, 12 + p.level * 3) });
  renderHero();
  $('#heroName').textContent = state.profile.name || 'Héroe';
  $('#rankBadge').textContent = `Rango ${p.rank.letter} · ${p.rank.title}`;
  const title = G.titleName(state);
  $('#heroTitle').hidden = !title;
  $('#heroTitle').textContent = title ? `« ${title} »` : '';
  const lv = $('#lvNum');
  lv.textContent = p.level;
  if (lastLevelShown !== null && lastLevelShown !== p.level) {
    lv.classList.remove('bump'); void lv.offsetWidth; lv.classList.add('bump');
  }
  lastLevelShown = p.level;
  $('#xpFill').style.width = `${Math.max(p.pct > 0 ? 4 : 0, Math.round(p.pct * 100))}%`;
  $('#xpText').textContent = `${p.into} / ${p.needed} XP`;
  $('#todayText').textContent = `Hoy +${p.todayXp} XP`;

  $('#radar').innerHTML = radarSvg(p);
  $('#statsGrid').innerHTML = G.STATS.map(s => {
    const st = p.stats[s.id];
    return `<div class="stat" data-stat="${s.id}" style="--c:${s.color}">
      <img src="${statIcon(s.id)}" alt="">
      <div>
        <div class="stat-head"><span>${s.name}</span><b>LV ${st.level}</b></div>
        <div class="stat-bar"><i style="width:${Math.round(st.pct * 100)}%"></i></div>
      </div>
    </div>`;
  }).join('');

  const groups = G.STATS.map(s => {
    const acts = state.activities.filter(a => a.stat === s.id && !a.resist);
    if (!acts.length) return '';
    return `<div class="log-group" style="--c:${s.color}">
      <div class="log-group-title">${s.name}</div>
      <div class="log-btns">${acts.map(a => `
        <button class="act-btn" data-act="${esc(a.id)}" style="--c:${s.color}">
          <img class="act-ico" src="${statIcon(s.id)}" alt="">
          <span class="act-text">
            <span class="act-name">${esc(a.name)}</span>
            ${actXp(a)}
            ${a.bonus ? `<span class="act-bonus-tag">★ ${esc(a.bonus.label)} +${a.bonus.xp}</span>` : ''}
          </span>
        </button>`).join('')}
      </div></div>`;
  }).join('');
  $('#quickLog').innerHTML = groups || `<div class="empty">No tienes actividades. Crea una en Ajustes.</div>`;

  // Retos de resistencia: primero el del jefe de este mes
  const boss = G.bossStatus(state);
  const today = G.dayKey(Date.now());
  const resist = state.activities.filter(a => a.resist).sort((a, b) => (b.resist === boss.id) - (a.resist === boss.id));
  $('#resistLog').innerHTML = resist.length
    ? `<div class="log-btns">${resist.map(a => {
        const st = G.statById(a.stat);
        const done = state.log.some(e => e.refId === a.id && G.dayKey(e.ts) === today);
        const now = a.resist === boss.id && !boss.defeated;
        return `<button class="act-btn resist ${now ? 'now' : ''} ${done ? 'done' : ''}" data-act="${esc(a.id)}" style="--c:${st.color}">
          <img class="act-ico" src="${art.boss(a.resist)}" alt="">
          <span class="act-text">
            <span class="act-name">${done ? '✔ ' : ''}${esc(a.name)}</span>
            ${actXp(a)}
            ${now ? '<span class="act-crit">⚡ Crítico ×3 al jefe</span>' : ''}
          </span>
        </button>`;
      }).join('')}</div>`
    : `<div class="empty">Sin retos. Crea uno en Ajustes → Nueva actividad.</div>`;
}

/** Banner de "lo que tienes más cerca": empuja a dar el siguiente paso. */
function renderGoal(p, { boss, weekly, pet }) {
  const el = $('#goalBanner');
  let g;
  if (!p.streak.loggedToday) {
    g = { ico: '🎁', text: p.streak.current ? `Tu cofre del día y tu racha de ${p.streak.current} te esperan` : 'Registra algo y abre el cofre del día', pct: 0, view: null };
  } else {
    const cands = [{ ico: '⬆️', text: `Te faltan ${p.needed - p.into} XP para el nivel ${p.level + 1}`, pct: p.pct, view: null }];
    for (const m of weekly) {
      if (m.done && !m.claimed) cands.push({ ico: '🗓️', text: `¡Reclama "${m.title}"!`, pct: 1.5, view: 'quests' });
      else if (!m.done) cands.push({ ico: '🗓️', text: `${m.title}: te falta ${m.target - m.progress}${m.id === 'b' ? ' XP' : ''}`, pct: m.progress / m.target, view: 'quests' });
    }
    if (boss.defeated && !boss.claimed) cands.push({ ico: '👹', text: '¡Jefe derrotado! Reclama tu premio', pct: 2, view: 'quests' });
    else if (!boss.defeated) cands.push({ ico: '👹', text: `A ${boss.name.split(',')[0]} le quedan ${boss.hpLeft} PV`, pct: boss.pct, view: 'quests' });
    if (pet.next) cands.push({ ico: '🐣', text: `${petName()} evoluciona en ${plural(pet.daysToNext, 'día', 'días')}`, pct: pet.pct * 0.9, view: null });
    g = cands.sort((a, b) => b.pct - a.pct)[0];
  }
  el.dataset.view = g.view || '';
  el.innerHTML = `<span class="g-ico">${g.ico}</span><div>${esc(g.text)}${g.pct > 0 && g.pct <= 1 ? `<div class="g-bar"><i style="width:${Math.round(g.pct * 100)}%"></i></div>` : ''}</div>`;
}

const priceTag = n => `<span class="price"><i class="coin"></i>${n}</span>`;

// ---------------------------------------------------------------------
// Equipo e inventario
// ---------------------------------------------------------------------
const itemIcon = it => `<span class="it-ico">${artImg(art.item(it.id))}<i>${it.icon}</i></span>`;
const bonusText = it => `+${it.pct}% XP ${it.stat === 'all' ? 'en todo' : `en ${G.statById(it.stat).name}`}`;

/** XP que muestra un botón de actividad, con el extra del equipo. */
function actXp(a) {
  const extra = Gear.gearExtra(state, a.stat, a.xp);
  return `<span class="act-xp">+${a.xp + extra} XP${extra ? `<span class="act-gear">⚔+${extra}</span>` : ''}<span class="act-coins">+${G.coinsFor({ xp: a.xp + extra })} 🪙</span></span>`;
}

function dropLine(boss) {
  const d = G.bossDrop(boss.id);
  if (!d) return '';
  const got = Gear.ownsItem(state, d.id);
  return `<div class="drop-line" style="--r:${Gear.RARITY[d.rarity].color}">${itemIcon(d)}
    <span><small>Botín</small><b>${esc(d.name)}</b><em>${bonusText(d)}</em></span>${got ? '<span class="tag">Tuyo</span>' : ''}</div>`;
}

function renderGear() {
  const eq = Gear.equippedItems(state);
  const slotHtml = ({ slot, item }) => `
    <button class="gear-slot ${item ? 'full' : ''}" data-slot="${slot.id}" style="--r:${item ? Gear.RARITY[item.rarity].color : 'transparent'}">
      ${item ? itemIcon(item) : `<span class="it-ico empty"><i>${slot.icon}</i></span>`}
      <small>${item ? esc(item.name) : slot.name}</small>
    </button>`;
  $('#gearLeft').innerHTML = eq.slice(0, 4).map(slotHtml).join('');
  $('#gearRight').innerHTML = eq.slice(4).map(slotHtml).join('');
  const src = characterImg(state.profile.character);
  if ($('#gearHero').getAttribute('src') !== src) $('#gearHero').src = src;

  const sum = Gear.gearSummary(state, G.STAT_IDS);
  $('#gearBonus').innerHTML = sum.length
    ? sum.map(x => { const s = G.statById(x.stat); return `<span class="chip" style="--c:${s.color}"><img src="${statIcon(s.id)}" alt="">+${x.pct}%</span>`; }).join('')
    : '<span class="small muted">Sin bonus todavía. Equipa piezas para ganar XP extra.</span>';
  const best = Math.max(0, ...G.STAT_IDS.map(id => Gear.gearPct(state, id)));
  $('#gearChipBonus').textContent = best ? `+${best}%` : '';

  const owned = Gear.ownedItemIds(state);
  const worn = new Set(eq.filter(x => x.item).map(x => x.item.id));
  $('#invHint').textContent = `${owned.size} de ${Gear.ITEMS.length} piezas. Toca una para ver de dónde sale o equiparla.`;
  const order = Object.keys(Gear.RARITY);
  const items = [...Gear.ITEMS].sort((a, b) => (owned.has(b.id) - owned.has(a.id)) || order.indexOf(a.rarity) - order.indexOf(b.rarity));
  $('#invGrid').innerHTML = items.map(it => `
    <button class="inv-item ${owned.has(it.id) ? 'own' : 'locked'}" data-item="${it.id}" style="--r:${Gear.RARITY[it.rarity].color}">
      ${itemIcon(it)}${worn.has(it.id) ? '<span class="worn">✓</span>' : ''}
    </button>`).join('');
}

/** Ficha de una pieza: bonus, de dónde sale y botón para equipar o comprar. */
async function openItem(id) {
  const it = Gear.itemById(id);
  const own = Gear.ownsItem(state, id);
  const wornIn = Object.entries(state.equipped.gear || {}).find(([, v]) => v === id)?.[0];
  const r = Gear.RARITY[it.rarity];
  const bal = Math.max(0, G.wallet(state).balance);
  const source = it.boss
    ? `Botín de <b>${esc(G.BOSSES.find(b => b.id === it.boss).name)}</b>.`
    : `Se vende en la Tienda por <b>${it.cost} monedas</b>.`;
  const action = own
    ? (wornIn ? `<button class="btn btn-block" data-close="unequip">Quitar</button>` : `<button class="btn btn-primary btn-block" data-close="equip">Equipar</button>`)
    : it.cost ? `<button class="btn btn-yellow btn-block" data-close="buy" ${bal < it.cost ? 'disabled' : ''}>Comprar · ${it.cost} 🪙</button>` : '';
  const res = await openSheet(`
    <div class="item-head" style="--r:${r.color}">${itemIcon(it)}
      <div><h3>${esc(it.name)}</h3><span class="rarity">${r.name} · ${Gear.SLOTS.find(s => (s.type || s.id) === it.type).name}</span></div>
    </div>
    <p><b>${bonusText(it)}</b>. ${source}</p>
    ${!own && it.cost && bal < it.cost ? `<p class="small">Te faltan ${it.cost - bal} monedas.</p>` : ''}
    ${action}
    <button class="btn btn-block" data-close="cancel">Cerrar</button>`);
  if (res === 'equip') commit(s => Gear.equipItem(s, Gear.slotFor(s, it), id), { celebrate: false });
  if (res === 'unequip') commit(s => Gear.equipItem(s, wornIn, null), { celebrate: false });
  if (res === 'buy' && tryPay(s => G.buyItem(s, id), `🎒 ¡${esc(it.name)} es tuya!`)) {
    heroReact();
    if (await confirmSheet('¿Equiparla ahora?', `${esc(it.name)}: ${bonusText(it)}.`, 'Equipar')) {
      commit(s => Gear.equipItem(s, Gear.slotFor(s, it), id), { celebrate: false });
    }
  }
}

/** Elegir qué pieza va en un espacio. */
async function openSlot(slotId) {
  const slot = Gear.SLOTS.find(s => s.id === slotId);
  const type = Gear.slotType(slotId);
  const owned = Gear.ownedItemIds(state);
  const options = Gear.ITEMS.filter(i => i.type === type && owned.has(i.id));
  const current = state.equipped.gear?.[slotId];
  const res = await openSheet(`
    <h3>${slot.name}</h3>
    ${options.length ? `<div class="list">${options.map(it => `
      <button class="row slot-opt ${it.id === current ? 'on' : ''}" data-close="${it.id}" style="--c:${Gear.RARITY[it.rarity].color}">
        ${itemIcon(it)}<div class="row-main"><div class="row-title">${esc(it.name)}</div><div class="row-sub">${bonusText(it)}</div></div>
        ${it.id === current ? '<span class="tag">Puesta</span>' : ''}
      </button>`).join('')}</div>`
      : `<p>No tienes piezas para este espacio. Consíguelas en la <b>Tienda</b> o derrotando jefes.</p>`}
    ${current ? '<button class="btn btn-block" data-close="__none">Dejar vacío</button>' : ''}
    ${options.length ? '' : '<button class="btn btn-primary btn-block" data-close="__shop">Ir a la Tienda</button>'}
    <button class="btn btn-block" data-close="cancel">Cerrar</button>`);
  if (!res || res === 'cancel') return;
  if (res === '__shop') return showView('shop');
  commit(s => Gear.equipItem(s, slotId, res === '__none' ? null : res), { celebrate: false });
}

function renderShop() {
  const w = G.wallet(state);
  const bal = Math.max(0, w.balance);
  $('#walletNum').textContent = bal;
  $('#walletHint').textContent = w.chestToday === null
    ? 'Registra algo hoy para abrir tu cofre del día.'
    : `Cofre de hoy: +${w.chestToday}. Ganas monedas con cada registro, logro, misión y jefe.`;

  const ownedGear = Gear.ownedItemIds(state);
  $('#shopGear').innerHTML = Gear.shopItems().map(it => {
    const own = ownedGear.has(it.id);
    return `<div class="row shop-row" data-item="${it.id}" style="--c:${Gear.RARITY[it.rarity].color}">
      ${itemIcon(it)}
      <div class="row-main"><div class="row-title">${esc(it.name)}</div><div class="row-sub">${bonusText(it)}${own ? '' : ` · ${priceTag(it.cost)}`}</div></div>
      ${own ? '<span class="tag">Tuya</span>' : `<button class="btn btn-yellow" data-item-buy="${it.id}" ${bal < it.cost ? 'disabled' : ''}>Comprar</button>`}
    </div>`;
  }).join('');

  $('#rewardList').innerHTML = state.rewards.length
    ? state.rewards.map(r => `
      <div class="row shop-row" style="--c:#ffd23f">
        <div class="row-main">
          <div class="row-title">${esc(r.name)}</div>
          <div class="row-sub">${priceTag(r.cost)}${bal < r.cost ? ` · te faltan ${r.cost - bal}` : ''}</div>
        </div>
        <button class="icon-btn" data-reward-edit="${esc(r.id)}" aria-label="Editar">✎</button>
        <button class="btn btn-yellow" data-reward-buy="${esc(r.id)}" ${bal < r.cost ? 'disabled' : ''}>Canjear</button>
      </div>`).join('')
    : `<div class="empty">Crea tu primera recompensa.</div>`;

  const coupons = state.purchases.filter(x => x.kind === 'reward').sort((a, b) => (a.used - b.used) || (b.ts - a.ts));
  $('#couponList').innerHTML = coupons.length
    ? coupons.slice(0, 12).map(c => `
      <div class="row coupon shop-row ${c.used ? 'used' : ''}">
        <div class="row-main">
          <div class="row-title">🎟️ ${esc(c.name)}</div>
          <div class="row-sub">${c.used ? `Usado el ${fmtDate(c.usedAt)}` : `Canjeado el ${fmtDate(c.ts)}`}</div>
        </div>
        ${c.used ? '' : `<button class="icon-btn" data-coupon-share="${esc(c.id)}" aria-label="Compartir">↗</button>
        <button class="btn" data-coupon-use="${esc(c.id)}">Usar</button>`}
      </div>`).join('')
    : `<p class="small muted">Aún no tienes cupones.</p>`;

  const left = G.shieldsLeft(state), sh = G.SHOP.shield;
  $('#shieldCard').innerHTML = `
    <div class="panel shield-card">
      <div class="shield-ico">🛡️</div>
      <div>
        <div class="row-title">Tienes ${left} de ${sh.max}</div>
        <div class="row-sub">Si un día no registras, el escudo se usa solo y tu racha sigue viva.</div>
        <button class="btn btn-yellow btn-block" id="buyShieldBtn" ${left >= sh.max || bal < sh.cost ? 'disabled' : ''}>
          ${left >= sh.max ? 'Máximo guardado' : `Comprar · ${sh.cost} 🪙`}</button>
      </div>
    </div>`;

  const lvl = G.deriveProfile(state).level;
  const current = state.equipped.world || DEFAULT_WORLD;
  $('#worldList').innerHTML = WORLDS.map(w => {
    const open = lvl >= w.minLevel, on = current === w.id;
    const rank = G.rankFor(w.minLevel);
    return `<button class="sky-tile world-tile ${on ? 'on' : ''} ${open ? '' : 'locked'}" data-world="${w.id}" ${open ? '' : 'disabled'}>
      <div class="world-prev">${artImg(art.world(w.id))}<span class="soon">Próximamente</span></div>
      <div class="sky-info"><span>${esc(w.name)}</span><small>${on ? '✔ En uso' : open ? 'Usar' : `Rango ${rank.letter}`}</small></div>
    </button>`;
  }).join('');

  $('#skyList').innerHTML = G.SHOP.skies.map(k => {
    const own = G.owns(state, k.id), on = state.equipped.sky === k.id;
    return `<button class="sky-tile ${on ? 'on' : ''}" data-sky-item="${k.id}">
      <div class="sky-prev" data-s="${k.id}"></div>
      <div class="sky-info"><span>${k.name}</span><small>${on ? '✔ En uso' : own ? 'Usar' : `${k.cost} 🪙`}</small></div>
    </button>`;
  }).join('');

  $('#titleList').innerHTML = G.SHOP.titles.map(t => {
    const own = G.owns(state, t.id), on = state.equipped.title === t.id;
    return `<div class="row shop-row" style="--c:#b58cff">
      <div class="row-main"><div class="row-title">« ${t.name} »</div>${own ? '' : `<div class="row-sub">${priceTag(t.cost)}</div>`}</div>
      <button class="btn ${on ? 'btn-primary' : own ? '' : 'btn-yellow'}" data-title-item="${t.id}" ${!own && bal < t.cost ? 'disabled' : ''}>${on ? 'Quitar' : own ? 'Usar' : 'Comprar'}</button>
    </div>`;
  }).join('');
}

const PET_MOOD = {
  egg: n => 'Registra algo para darle calor',
  happy: n => `¡${n} está feliz!`,
  hungry: n => `${n} tiene hambre: registra hoy`,
  sad: n => `${n} te extraña`,
};
/** Nombre visible de la mascota: el que eligió el jugador o el de la especie. */
const petName = () => G.petCustomName(state) || speciesById(state.pet.species).name;

const PET_MOOD_SHORT = { egg: 'Dale calor', happy: '¡Está feliz!', hungry: 'Tiene hambre', sad: 'Te extraña' };
const bossImg = id => art.boss(id);
const petImg = stage => art.pet(state.pet.species || DEFAULT_PET, stage);
const monthName = mk => { const [y, m] = mk.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('es', { month: 'long' }); };
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** Tarjetas pequeñas de Inicio: jefe del mes y mascota. */
function renderMinis({ boss, pet }) {
  const bm = $('#bossMini');
  const canClaim = boss.defeated && !boss.claimed;
  bm.classList.toggle('claim', canClaim);
  bm.innerHTML = `
    <img class="boss-hit" src="${bossImg(boss.id)}" alt="" style="${boss.defeated ? 'filter:grayscale(1) brightness(.9);opacity:.6' : ''}">
    <div class="mini-body">
      <div class="mini-kicker">Jefe del mes</div>
      <div class="mini-title">${esc(boss.name.split(',')[0])}</div>
      ${boss.defeated
        ? `<div class="mini-sub" style="color:var(--yellow)">${boss.claimed ? '✔ Derrotado' : '¡Reclama tu premio!'}</div>`
        : `<div class="hpbar"><i style="width:${Math.round((1 - boss.pct) * 100)}%"></i></div>
           <div class="mini-sub">${boss.hpLeft} PV · ${boss.daysLeft} d</div>`}
    </div>`;
  const name = petName();
  $('#petMini').innerHTML = `
    <img class="pet-img ${pet.mood}" src="${petImg(pet.stage)}" alt="">
    <div class="mini-body">
      <div class="mini-kicker">${pet.stageName}</div>
      <div class="mini-title">${esc(name)}</div>
      <div class="hpbar pet"><i style="width:${Math.round(pet.pct * 100)}%"></i></div>
      <div class="mini-sub">${PET_MOOD_SHORT[pet.mood]}</div>
    </div>`;
}

/** Pestaña Misiones: jefe del mes, misiones semanales y trofeos. */
function renderAdventure({ boss, weekly }) {
  const weak = G.statById(boss.weak);
  $('#bossCard').innerHTML = `
    <div class="boss-card ${boss.defeated ? 'defeated' : ''}">
      <img class="boss-art boss-hit" src="${bossImg(boss.id)}" alt="${esc(boss.name)}">
      ${boss.defeated ? '<div class="boss-stamp">¡Derrotado!</div>' : ''}
      <div class="boss-name">${esc(boss.name)}</div>
      <div class="boss-taunt">${esc(boss.taunt)}</div>
      <div class="hpbar"><i style="width:${Math.round((1 - boss.pct) * 100)}%"></i></div>
      <div class="boss-meta">
        <span>${boss.hpLeft} / ${boss.hp} PV</span>
        <span class="boss-weak"><img src="${statIcon(weak.id)}" alt="">Débil a ${weak.name} <b>×2</b></span>
      </div>
      ${boss.defeated
        ? boss.claimed
          ? `<p class="boss-note">Premio reclamado. Un nuevo jefe llegará el mes que viene.</p>
             <button class="btn btn-block" id="shareBossBtn">Presumir la victoria</button>`
          : `<button class="btn btn-yellow btn-block" id="claimBossBtn">Reclamar +${boss.rewardXp} XP</button>`
        : `<p class="boss-note">Cada XP que ganas le quita 1 PV. Te ${boss.daysLeft === 1 ? 'queda 1 día' : `quedan ${boss.daysLeft} días`} para derrotarlo y ganar <b>+${boss.rewardXp} XP</b>.</p>`}
      ${dropLine(boss)}
    </div>`;

  $('#weeklyHint').textContent = `Se renuevan cada lunes. ${weekly[0].daysLeft === 1 ? 'Queda 1 día' : `Quedan ${weekly[0].daysLeft} días`}.`;
  $('#weeklyList').innerHTML = weekly.map(m => {
    const st = m.stat ? G.statById(m.stat) : null;
    return `<div class="row weekly ${m.claimed ? 'claimed' : ''}" style="--c:${st ? st.color : '#ffd23f'}">
      <div class="w-ico">${st ? `<img src="${statIcon(st.id)}" alt="">` : m.icon}</div>
      <div class="row-main">
        <div class="row-title">${esc(m.title)}</div>
        <div class="row-sub"><span>${esc(m.desc)}</span></div>
        <div class="hpbar goal"><i style="width:${Math.round(m.progress / m.target * 100)}%"></i></div>
        <div class="row-sub"><span>${m.progress} / ${m.target}</span><span class="row-xp">+${m.rewardXp} XP</span></div>
      </div>
      ${m.claimed ? '<span class="w-check">✔</span>' : m.done ? `<button class="btn btn-yellow" data-weekly="${m.id}">Reclamar</button>` : ''}
    </div>`;
  }).join('');

  const trophies = G.bossTrophies(state);
  $('#trophies').innerHTML = trophies.length
    ? trophies.map(t => `<div class="trophy"><img src="${bossImg(t.id)}" alt="${esc(t.name)}"><span>${monthName(t.monthKey)} ${t.monthKey.slice(0, 4)}</span></div>`).join('')
    : `<p class="small muted">Aún no derrotas a ningún jefe.</p>`;
}

function renderQuests() {
  $('#questList').innerHTML = state.quests.length
    ? state.quests.map(q => {
        const s = G.statById(q.stat);
        return `<div class="row quest-row" style="--c:${s.color}">
          <img class="row-ico" src="${statIcon(s.id)}" alt="">
          <div class="row-main">
            <div class="row-title">${esc(q.name)}</div>
            <div class="row-sub">${s.name} · <span class="row-xp">+${q.xp} XP</span></div>
          </div>
          <button class="icon-btn" data-quest-edit="${esc(q.id)}" aria-label="Editar">✎</button>
          <button class="btn btn-yellow" data-quest-done="${esc(q.id)}">¡Hecho!</button>
        </div>`;
      }).join('')
    : `<div class="empty">Sin misiones pendientes.<br>Crea una para ganar XP extra.</div>`;

  const done = [...state.questHistory].sort((a, b) => b.completedAt - a.completedAt);
  $('#questDone').innerHTML = done.length
    ? done.map(q => {
        const s = G.statById(q.stat) || G.STATS[0];
        return `<div class="row done" style="--c:${s.color}">
          <div class="row-main">
            <div class="row-title">✔ ${esc(q.name)}</div>
            <div class="row-sub">${fmtDate(q.completedAt)} · ${s.name}</div>
          </div>
          <span class="row-xp">+${q.xp}</span>
        </div>`;
      }).join('')
    : `<p class="small muted">Aún no completas misiones.</p>`;
}

let historyLimit = 150;
function renderHistory() {
  const log = [...state.log].sort((a, b) => b.ts - a.ts);
  if (!log.length) {
    $('#historyList').innerHTML = `<div class="empty">Tu historia empieza con el primer registro. ⚔️</div>`;
    return;
  }
  const shown = log.slice(0, historyLimit);
  const byDay = new Map();
  for (const e of shown) {
    const k = G.dayKey(e.ts);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k).push(e);
  }
  let html = '';
  for (const [k, entries] of byDay) {
    const sum = log.filter(e => G.dayKey(e.ts) === k).reduce((a, e) => a + e.xp, 0);
    html += `<div class="day-head"><span>${dayLabel(k)}</span><b>+${sum} XP</b></div><div class="list">`;
    html += entries.map(e => {
      const s = G.statById(e.stat);
      return `<div class="row" style="--c:${s.color}">
        <img class="row-ico" src="${statIcon(s.id)}" alt="">
        <div class="row-main">
          <div class="row-title">${{ quest: '📜 ', weekly: '🗓️ ', boss: '👹 ' }[e.type] || ''}${esc(e.name)}</div>
          <div class="row-sub">${fmtTime(e.ts)} · ${s.name} · <span class="row-xp">+${e.xp} XP</span></div>
        </div>
        <button class="icon-btn" data-undo="${esc(e.id)}" aria-label="Deshacer">↶</button>
      </div>`;
    }).join('');
    html += '</div>';
  }
  if (log.length > historyLimit) html += `<button class="btn btn-block" id="moreHistory" style="margin-top:14px">Ver más</button>`;
  $('#historyList').innerHTML = html;
}

/** Galería de guardianas: forma actual de cada una y cuándo evoluciona. */
function renderGuardians(p) {
  $('#guardianGrid').innerHTML = G.STATS.map(s => {
    const st = p.stats[s.id];
    const g = guardianFor(s.id, st.level);
    const name = g.name || `Guardián de ${s.name}`;
    return `<button class="g-card" data-stat="${s.id}" style="--c:${s.color}">
      <div class="g-art">${artImg(g.img, { alt: esc(name), fb: g.tier > 1 ? g.fallback : null })}<span class="soon">Próximamente</span></div>
      <div class="g-info">
        <b>${esc(name)}</b>
        <small>${s.name} · Forma ${g.tier}/5</small>
        <div class="g-pips">${[1, 2, 3, 4, 5].map(t => `<i class="${t <= g.tier ? 'on' : ''}"></i>`).join('')}</div>
        <span class="g-next">${g.nextAt ? `Evoluciona en LV ${g.nextAt}` : 'Forma final'}</span>
      </div>
    </button>`;
  }).join('');
}

function renderAchievements(p) {
  const unlocked = new Set(G.unlockedAchievements(state, p));
  $('#achSummary').textContent = `${unlocked.size} de ${G.ACHIEVEMENTS.length} desbloqueados · cada logro da ${G.COINS.achievement} monedas · mejor racha: ${p.streak.best} días`;
  $('#achList').innerHTML = G.ACHIEVEMENTS.map(a => `
    <div class="ach ${unlocked.has(a.id) ? 'unlocked' : 'locked'}">
      <span class="ach-ico">${artImg(art.badge(a.id))}<i>${a.icon}</i></span>
      <div class="ach-name">${esc(a.name)}</div>
      <div class="ach-desc">${esc(a.desc)}</div>
    </div>`).join('');
}

function renderSettings() {
  const nameInput = $('#charName');
  if (document.activeElement !== nameInput) nameInput.value = state.profile.name || '';
  const profiles = Profiles.listProfiles();
  $('#profileChips').innerHTML = profiles.map(pr => `
    <button class="chip profile ${pr.active ? 'on' : ''}" data-profile="${esc(pr.id)}">
      <img src="${characterImg(pr.character)}" alt="">${esc(pr.name)} <small>LV ${pr.level}</small>
    </button>`).join('') + `<button class="chip" id="newProfileBtn">＋ Nuevo</button>`;
  $('#deleteProfileBtn').hidden = profiles.length < 2;
  $('#charGrid').innerHTML = characterCards(state.profile.character);
  document.querySelectorAll('#idleChips .chip').forEach(c => c.classList.toggle('on', c.dataset.idle === (state.prefs?.idle || 'sway')));

  $('#activityList').innerHTML = G.STATS.flatMap(s =>
    state.activities.filter(a => a.stat === s.id).map(a => `
      <div class="row" style="--c:${s.color}">
        <img class="row-ico" src="${statIcon(s.id)}" alt="">
        <div class="row-main">
 <div class="row-title">${esc(a.name)} ${a.resist ? '<span class="tag">Reto</span>' : ''}</div>
          <div class="row-sub">${s.name} · <span class="row-xp">+${a.xp} XP</span>${a.bonus ? ` · ★ ${esc(a.bonus.label)} +${a.bonus.xp}` : ''}</div>
        </div>
        <button class="icon-btn" data-act-edit="${esc(a.id)}" aria-label="Editar">✎</button>
        <button class="icon-btn" data-act-del="${esc(a.id)}" aria-label="Borrar">🗑</button>
      </div>`)).join('') || `<div class="empty">Sin actividades.</div>`;

  $('#backupInfo').textContent = state.lastBackup
    ? `Último respaldo: ${fmtDate(state.lastBackup)} (${state.log.length} registros en total).`
    : 'Nunca has exportado un respaldo.';
  $('#backupWarn').hidden = !needsBackup();
  $('#backupWarn').textContent = state.lastBackup
    ? `⚠️ Tu último respaldo fue hace más de ${BACKUP_REMINDER_DAYS} días. Safari puede borrar los datos de apps web: exporta uno nuevo.`
    : '⚠️ Aún no tienes respaldo. Safari puede borrar los datos de apps web: exporta uno de vez en cuando.';
  $('#appVersion').textContent = APP_VERSION;
}

function needsBackup() {
  if (!state.log.length) return false;
  if (!state.lastBackup) {
    // Sin respaldo: avisar cuando ya hay algo que perder.
    const first = Math.min(...state.log.map(e => e.ts));
    return state.log.length >= 10 || Date.now() - first > 3 * 86400000;
  }
  return Date.now() - state.lastBackup > BACKUP_REMINDER_DAYS * 86400000;
}

// ---------------------------------------------------------------------
// Fechas en español
// ---------------------------------------------------------------------
function dayLabel(key) {
  const today = G.dayKey(Date.now());
  const yest = G.dayKey(Date.now() - 86400000);
  if (key === today) return 'Hoy';
  if (key === yest) return 'Ayer';
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'short' });
}
const fmtTime = ts => new Date(ts).toLocaleTimeString('es', { hour: 'numeric', minute: '2-digit' });
const fmtDate = ts => new Date(ts).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });

// ---------------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------------
let levelUpOpen = false;
const pendingToasts = [];
function toast(html, opts = {}) {
  // Durante la animación de nivel los avisos esperan, para no taparla.
  if (levelUpOpen) { pendingToasts.push([html, opts]); return; }
  const { kind = '', action, onAction, duration = 3200 } = opts;
  const box = $('#toasts');
  while (box.children.length >= 2) box.firstElementChild.remove();
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.innerHTML = `<span class="toast-msg">${html}</span>${action ? `<button>${esc(action)}</button>` : ''}`;
  const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 250); };
  if (action) el.querySelector('button').onclick = () => { onAction?.(); close(); };
  box.appendChild(el);
  setTimeout(close, duration);
}

function floatXp(x, y, xp) {
  const el = document.createElement('div');
  el.className = 'float-xp';
  el.textContent = `+${xp} XP`;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

/** Chispas que salen del botón tocado. */
function burst(x, y, color) {
  const el = document.createElement('div');
  el.className = 'burst';
  el.style.cssText = `left:${x}px;top:${y}px;--c:${color}`;
  el.innerHTML = Array.from({ length: 10 }, (_, i) => `<i style="--a:${i * 36 + Math.random() * 20}deg"></i>`).join('');
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 600);
}

/** Los personajes "reciben" la energía: destello y más brasas. */
function heroReact() {
  if (prefersReducedMotion()) return;
  const img = $('#heroImg');
  img.classList.remove('hit'); void img.offsetWidth; img.classList.add('hit');
  sceneFx.boost();
}

// ---------------------------------------------------------------------
// Hoja inferior (bottom sheet)
// ---------------------------------------------------------------------
let sheetResolve = null;
function openSheet(html) {
  const back = $('#sheetBackdrop');
  $('#sheet').innerHTML = html;
  $('#toasts').innerHTML = '';
  back.hidden = false;
  return new Promise(res => { sheetResolve = res; });
}
function closeSheet(value = null) {
  $('#sheetBackdrop').hidden = true;
  $('#sheet').innerHTML = '';
  const r = sheetResolve; sheetResolve = null;
  r?.(value);
  setTimeout(runModals, 450);
}
$('#sheetBackdrop').addEventListener('click', e => { if (e.target.id === 'sheetBackdrop') closeSheet(null); });

async function confirmSheet(title, msg, okLabel = 'Sí', danger = false) {
  const p = openSheet(`
    <h3>${esc(title)}</h3>
    <p>${msg}</p>
    <div class="btn-row">
      <button class="btn" data-close="cancel">Cancelar</button>
      <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-close="ok">${esc(okLabel)}</button>
    </div>`);
  return (await p) === 'ok';
}
$('#sheet').addEventListener('click', e => {
  const b = e.target.closest('[data-close]');
  if (b) closeSheet(b.dataset.close);
});

/** Formulario para crear/editar actividades y misiones. */
async function editorSheet({ title, item, maxXp, allowBonus, allowDelete }) {
  const it = item || { name: '', stat: 'fuerza', xp: 20, bonus: null };
  const xpVal = Math.min(maxXp, Math.max(G.XP_MIN, it.xp));
  const p = openSheet(`
    <h3>${esc(title)}</h3>
    <label class="field"><span>Nombre</span>
      <input type="text" id="edName" maxlength="40" value="${esc(it.name)}" placeholder="Ej. Correr 5 km" autocomplete="off">
    </label>
    <div class="field"><span>Stat que sube</span>
      <div class="chips" id="edStats">${G.STATS.map(s =>
        `<button type="button" class="chip stat-chip ${it.stat === s.id ? 'on' : ''}" data-stat="${s.id}" style="--c:${s.color}"><img src="${statIcon(s.id)}" alt="">${s.name}</button>`).join('')}
      </div>
    </div>
    <div class="field"><span>XP (${G.XP_MIN}–${maxXp})</span>
      <div class="range-row">
        <input type="range" id="edXp" min="${G.XP_MIN}" max="${maxXp}" step="5" value="${xpVal}">
        <output id="edXpOut">+${xpVal}</output>
      </div>
    </div>
    ${allowBonus ? `
    <label class="toggle"><input type="checkbox" id="edBonusOn" ${it.bonus ? 'checked' : ''}> <span>Bono opcional (ej. ruta larga)</span></label>
    <div id="edBonus" ${it.bonus ? '' : 'hidden'} class="char-editor">
      <label class="field"><span>Nombre del bono</span>
        <input type="text" id="edBonusLabel" maxlength="24" value="${esc(it.bonus?.label || 'Extra')}">
      </label>
      <div class="field"><span>XP extra (${G.XP_MIN}–${G.XP_MAX})</span>
        <div class="range-row">
          <input type="range" id="edBonusXp" min="${G.XP_MIN}" max="${G.XP_MAX}" step="5" value="${it.bonus?.xp || 15}">
          <output id="edBonusOut">+${it.bonus?.xp || 15}</output>
        </div>
      </div>
    </div>` : ''}
    ${allowBonus ? `
    <label class="field"><span>¿Es un reto de resistencia? (una vez al día, ×3 a su jefe)</span>
      <select id="edResist">
        <option value="">No, actividad normal</option>
        ${G.activeBosses().map(b => `<option value="${b.id}" ${it.resist === b.id ? 'selected' : ''}>Sí, contra ${esc(b.name.split(',')[0])}</option>`).join('')}
      </select>
    </label>` : ''}
    <div class="btn-row">
      <button class="btn" data-close="cancel">Cancelar</button>
      <button class="btn btn-primary" id="edSave">Guardar</button>
    </div>
    ${allowDelete ? `<button class="btn btn-danger btn-block" data-close="delete">Borrar</button>` : ''}
  `);

  let stat = it.stat;
  $('#edStats').onclick = e => {
    const c = e.target.closest('[data-stat]'); if (!c) return;
    stat = c.dataset.stat;
    document.querySelectorAll('#edStats .chip').forEach(x => x.classList.toggle('on', x === c));
  };
  $('#edXp').oninput = e => { $('#edXpOut').textContent = `+${e.target.value}`; };
  if (allowBonus) {
    $('#edBonusOn').onchange = e => { $('#edBonus').hidden = !e.target.checked; };
    $('#edBonusXp').oninput = e => { $('#edBonusOut').textContent = `+${e.target.value}`; };
  }
  $('#edSave').onclick = () => {
    const name = $('#edName').value.trim();
    if (!name) { $('#edName').focus(); $('#edName').placeholder = '¡Ponle un nombre!'; return; }
    const out = { name, stat, xp: G.clampXp($('#edXp').value, maxXp) };
    if (allowBonus) {
      out.bonus = $('#edBonusOn').checked
        ? { label: $('#edBonusLabel').value.trim() || 'Extra', xp: G.clampXp($('#edBonusXp').value) }
        : null;
      out.resist = $('#edResist').value || null;
    }
    closeSheet(out);
  };
  return p;
}

// ---------------------------------------------------------------------
// Acciones
// ---------------------------------------------------------------------
function doLog(activityId, bonus, origin) {
  let entry;
  try { entry = commit(s => G.logActivity(s, activityId, { bonus })); }
  catch (err) { toast(`✋ ${esc(err.message)}`); return; }
  const today = G.dayKey(Date.now());
  const firstToday = state.log.filter(e => G.isBase(e) && G.dayKey(e.ts) === today).length === 1;
  if (origin) {
    const r = origin.getBoundingClientRect();
    floatXp(r.left + r.width / 2, r.top, entry.xp);
    burst(r.left + r.width / 2, r.top + r.height / 2, G.statById(entry.stat).color);
    origin.classList.remove('flash'); void origin.offsetWidth; origin.classList.add('flash');
  }
  heroReact();
  toast(`+${entry.xp} XP · +${G.coinsFor(entry)} 🪙 · ${esc(entry.name)}`, {
    action: 'Deshacer',
    onAction: () => { commit(s => G.undoEntry(s, entry.id), { celebrate: false }); toast('Registro deshecho'); },
  });
  if (firstToday) setTimeout(() => toast(`🎁 Cofre del día: <b>+${G.chestFor(today)} monedas</b>`, { kind: 'ach', duration: 4200 }), 500);
}

async function onActivityTap(btn) {
  const a = state.activities.find(x => x.id === btn.dataset.act);
  if (!a) return;
  if (!a.bonus) return doLog(a.id, false, btn);
  const choice = await openSheet(`
    <h3>${esc(a.name)}</h3>
    <div class="sheet-choice">
      <button class="btn" data-close="normal"><span>Normal</span><span>+${a.xp} XP</span></button>
      <button class="btn btn-yellow" data-close="bonus"><span>★ ${esc(a.bonus.label)}</span><span>+${a.xp + a.bonus.xp} XP</span></button>
    </div>
    <button class="btn btn-block" data-close="cancel">Cancelar</button>`);
  if (choice === 'normal' || choice === 'bonus') doLog(a.id, choice === 'bonus', btn);
}

async function editActivity(id) {
  const a = id ? state.activities.find(x => x.id === id) : null;
  // Las actividades nuevas van de 5 a 50 XP. Si una predeterminada vale más
  // (p. ej. "Terminar libro" = 100), al editarla se respeta su valor como tope.
  const maxXp = Math.max(G.XP_MAX, a?.xp || 0);
  const res = await editorSheet({
    title: a ? 'Editar actividad' : 'Nueva actividad',
    item: a, maxXp, allowBonus: true, allowDelete: !!a,
  });
  if (!res || res === 'cancel') return;
  if (res === 'delete') return deleteActivity(a.id);
  commit(s => {
    if (a) Object.assign(s.activities.find(x => x.id === a.id), res);
    else s.activities.push({ id: G.uid(), ...res });
  }, { celebrate: false });
  toast(a ? 'Actividad actualizada' : 'Actividad creada');
}

async function deleteActivity(id) {
  const a = state.activities.find(x => x.id === id);
  if (!a) return;
  const ok = await confirmSheet('¿Borrar actividad?', `“${esc(a.name)}” desaparecerá de la lista. Tu historial y XP se conservan.`, 'Borrar', true);
  if (!ok) return;
  commit(s => { s.activities = s.activities.filter(x => x.id !== id); }, { celebrate: false });
  toast('Actividad borrada');
}

async function editQuest(id) {
  const q = id ? state.quests.find(x => x.id === id) : null;
  const res = await editorSheet({
    title: q ? 'Editar misión' : 'Nueva misión única',
    item: q || { name: '', stat: 'hogar', xp: 50 },
    maxXp: G.QUEST_XP_MAX, allowBonus: false, allowDelete: !!q,
  });
  if (!res || res === 'cancel') return;
  if (res === 'delete') {
    if (await confirmSheet('¿Borrar misión?', `“${esc(q.name)}” se eliminará sin dar XP.`, 'Borrar', true)) {
      commit(s => { s.quests = s.quests.filter(x => x.id !== id); }, { celebrate: false });
    }
    return;
  }
  commit(s => {
    if (q) Object.assign(s.quests.find(x => x.id === q.id), res);
    else s.quests.push({ id: G.uid(), createdAt: Date.now(), ...res });
  }, { celebrate: false });
}

function finishQuest(id, btn) {
  const entry = commit(s => G.completeQuest(s, id));
  if (btn) {
    const r = btn.getBoundingClientRect();
    floatXp(r.left + r.width / 2, r.top, entry.xp);
    burst(r.left + r.width / 2, r.top + r.height / 2, G.statById(entry.stat).color);
  }
  heroReact();
  heroFlash();
  toast(`📜 ¡Misión cumplida! +${entry.xp} XP`, {
    action: 'Deshacer',
    onAction: () => commit(s => G.undoEntry(s, entry.id), { celebrate: false }),
  });
}

function claimReward(fn, btn, label) {
  let entry;
  try { entry = commit(fn); } catch (err) { toast(`❌ ${esc(err.message)}`); return; }
  if (btn) {
    const r = btn.getBoundingClientRect();
    floatXp(r.left + r.width / 2, r.top, entry.xp);
    burst(r.left + r.width / 2, r.top + r.height / 2, '#ffd23f');
  }
  heroReact();
  heroFlash();
  toast(`${label} +${entry.xp} XP para ${G.statById(entry.stat).name}`, { kind: 'ach' });
}

/** Hoja con la mascota en grande, su progreso y sus etapas. */
async function openPetSheet() {
  const pet = G.petStatus(state);
  const name = petName();
  const p = openSheet(`
    <h3>${esc(name)}</h3>
    <div class="pet-sheet-art"><img class="pet-img ${pet.mood}" src="${petImg(pet.stage)}" alt=""></div>
    <p><b>${pet.stageName}</b> · ${plural(pet.activeDays, 'día activo', 'días activos')} · ${esc(PET_MOOD[pet.mood](name))}</p>
    <div class="hpbar pet" style="height:12px"><i style="width:${Math.round(pet.pct * 100)}%"></i></div>
    <p>${pet.next ? `Evoluciona a <b>${pet.next.name}</b> en ${plural(pet.daysToNext, 'día activo', 'días activos')} más. Crece cada día que registras algo y nunca retrocede.` : '¡Alcanzó su forma final!'}</p>
    <div class="pet-stages">${G.PET_STAGES.map((st, i) => `
      <div class="${i > pet.stage ? 'locked' : i === pet.stage ? 'current' : ''}"><img src="${petImg(i)}" alt="">${i > pet.stage ? `${st.min} días` : st.name}</div>`).join('')}
    </div>
    <div class="field"><span>Huevo</span>
      <p class="small" style="margin:0">${pet.stage === 0
        ? 'Elige qué huevo empollar. Puedes cambiarlo mientras no haya eclosionado.'
        : `Ya eclosionó: es de la especie ${esc(speciesById(state.pet.species).name)}.`}</p>
      <div class="egg-grid" id="eggGrid">${eggCards(pet.stage)}</div>
    </div>
    <label class="field"><span>Nombre de tu compañero</span><input type="text" id="petName" maxlength="${G.PET_NAME_MAX}" value="${esc(G.petCustomName(state))}" placeholder="${esc(speciesById(state.pet.species).name)}" autocomplete="off"></label>
    <button class="btn btn-primary btn-block" data-close="ok">Listo</button>`);
  $('#petName').addEventListener('input', e => {
    G.setPetName(state, e.target.value);  // vacío = se muestra el nombre de la especie
    save();
    document.querySelector('.sheet h3').textContent = petName();
  });
  $('#eggGrid').addEventListener('click', e => {
    const c = e.target.closest('[data-egg]');
    if (!c || c.disabled) return;
    state.pet.species = c.dataset.egg;  // cada especie guarda su propio nombre
    save();
    $('#eggGrid').innerHTML = eggCards(0);
    $('#petName').value = G.petCustomName(state);
    $('#petName').placeholder = speciesById(state.pet.species).name;
    document.querySelector('.pet-sheet-art img').src = petImg(0);
    document.querySelectorAll('.pet-stages img').forEach((img, i) => { img.src = petImg(i); });
    document.querySelector('.sheet h3').textContent = petName();
  });
  await p;
  renderAll();
}

/** Los 8 huevos: el elegido resaltado; los que no tienen arte, "Próximamente". */
function eggCards(stage) {
  const current = state.pet.species || DEFAULT_PET;
  return PET_SPECIES.map(sp => {
    const on = sp.id === current;
    const locked = !sp.ready || (stage > 0 && !on);
    return `<button class="egg-card ${on ? 'on' : ''}" data-egg="${sp.id}" ${locked ? 'disabled' : ''}>
      <div class="egg-art">${artImg(art.egg(sp.id), { fb: art.pet(sp.id, 0) })}<span class="soon">?</span></div>
      <b>${esc(sp.name)}</b><small>${sp.ready ? sp.element : 'Pronto'}</small>
    </button>`;
  }).join('');
}

// ---------------------------------------------------------------------
// Compartir (tarjetas ilustradas) y tienda
// ---------------------------------------------------------------------
async function share(card, text) {
  toast('Preparando tarjeta…', { duration: 1500 });
  try {
    const p = G.deriveProfile(state);
    // Solo datos generales: nivel y racha (sin nombres ni actividades).
    const blob = await makeCard({ footer: `Nivel ${p.level} · Racha ${p.streak.current}`, accent: p.rank.color, art: characterImg(state.profile.character), ...card });
    const result = await shareCard(blob, { text });
    if (result === 'downloaded') toast('Tarjeta guardada como imagen');
  } catch (err) {
    toast(`❌ No se pudo crear la tarjeta`);
    console.error(err);
  }
}
function shareProgress() {
  const p = G.deriveProfile(state);
  return share({ kicker: `Rango ${p.rank.letter} · ${p.rank.title}`, title: `¡Nivel ${p.level}!`, sub: `${p.totalXp} XP · racha de ${plural(p.streak.current, 'día', 'días')} · ${G.unlockedAchievements(state, p).length} logros` },
    `¡Voy en nivel ${p.level} en Kaisen!`);
}
function shareBoss() {
  const b = G.bossStatus(state);
  return share({ kicker: 'Jefe derrotado', title: `¡Vencí a ${b.name.split(',')[0]}!`, sub: b.name, art: art.boss(b.id), accent: '#ff3b4e', dimArt: true },
    `¡Derroté a ${b.name} en Kaisen!`);
}
function shareCoupon(id) {
  const c = state.purchases.find(x => x.id === id);
  if (!c) return;
  return share({ kicker: 'Cupón ganado con esfuerzo', title: c.name, sub: 'Vale por una recompensa. ¡Me lo gané!', art: petImg(G.petStatus(state).stage), accent: '#ffd23f' },
    `Me gané este cupón: ${c.name}`);
}

function tryPay(fn, okMsg) {
  try { commit(fn, { celebrate: false }); toast(okMsg, { kind: 'ach' }); return true; }
  catch (err) { toast(`✋ ${esc(err.message)}`); return false; }
}

async function buyRewardFlow(id) {
  const r = state.rewards.find(x => x.id === id);
  if (!r) return;
  if (!(await confirmSheet('¿Canjear recompensa?', `<b>${esc(r.name)}</b> por <b>${r.cost} monedas</b>. Recibirás un cupón para usar cuando quieras.`, 'Canjear'))) return;
  if (tryPay(s => G.buyReward(s, id), `🎟️ ¡Cupón conseguido: ${esc(r.name)}!`)) heroReact();
}

async function editReward(id) {
  const r = id ? state.rewards.find(x => x.id === id) : null;
  const cost = r?.cost || 150;
  const p = openSheet(`
    <h3>${r ? 'Editar recompensa' : 'Nueva recompensa'}</h3>
    <label class="field"><span>¿Qué te vas a regalar?</span>
      <input type="text" id="rwName" maxlength="40" value="${esc(r?.name || '')}" placeholder="Ej. Salir por un helado" autocomplete="off"></label>
    <div class="field"><span>Precio en monedas</span>
      <div class="range-row"><input type="range" id="rwCost" min="20" max="1000" step="10" value="${cost}"><output id="rwOut">${cost}</output></div>
      <span style="text-transform:none;letter-spacing:0">Referencia: un día normal da unas 25–35 monedas.</span>
    </div>
    <div class="btn-row"><button class="btn" data-close="cancel">Cancelar</button><button class="btn btn-primary" id="rwSave">Guardar</button></div>
    ${r ? '<button class="btn btn-danger btn-block" data-close="delete">Borrar</button>' : ''}`);
  $('#rwCost').oninput = e => { $('#rwOut').textContent = e.target.value; };
  $('#rwSave').onclick = () => {
    const name = $('#rwName').value.trim();
    if (!name) { $('#rwName').focus(); return; }
    closeSheet({ name, cost: Math.min(1000, Math.max(20, Number($('#rwCost').value) || 100)) });
  };
  const res = await p;
  if (!res || res === 'cancel') return;
  commit(s => {
    if (res === 'delete') s.rewards = s.rewards.filter(x => x.id !== id);
    else if (r) Object.assign(s.rewards.find(x => x.id === id), res);
    else s.rewards.push({ id: G.uid(), ...res });
  }, { celebrate: false });
}

async function cosmeticFlow(slot, itemId) {
  const item = [...G.SHOP.skies, ...G.SHOP.titles].find(x => x.id === itemId);
  if (!item) return;
  if (G.owns(state, itemId)) {
    const off = slot === 'title' && state.equipped.title === itemId;
    commit(s => G.equip(s, slot, off ? null : itemId), { celebrate: false });
    return;
  }
  if (!(await confirmSheet('¿Comprar?', `<b>${esc(item.name)}</b> por <b>${item.cost} monedas</b>.`, 'Comprar'))) return;
  if (tryPay(s => { G.buyCosmetic(s, itemId); G.equip(s, slot, itemId); }, `✨ ¡${esc(item.name)} es tuyo!`)) heroReact();
}

/** Usa escudos si hace falta (al abrir la app o volver a ella). */
function checkShields() {
  const saved = G.applyShields(state);
  if (saved.length) {
    save();
    setTimeout(() => toast(`🛡️ ${saved.length === 1 ? 'Un escudo salvó' : `${saved.length} escudos salvaron`} tu racha`, { kind: 'ach', duration: 5000 }), 600);
  }
}

// ---------------------------------------------------------------------
// Perfiles y personajes
// ---------------------------------------------------------------------
function characterCards(selected) {
  return CHARACTERS.map(c => `
    <button class="char-card ${c.id === selected ? 'on' : ''}" data-char="${c.id}" style="--c:${c.accent}">
      ${c.id === selected ? '<span class="char-check">✓</span>' : ''}
      <img class="char-fig" src="${characterImg(c.id)}" alt="">
      <b>${esc(c.name)}</b><small>${esc(c.blurb)}</small>
    </button>`).join('');
}

function useProfile(id, { silent = false } = {}) {
  state = Profiles.switchProfile(id);
  profileId = id;
  lastLevelShown = null;
  syncSeen();
  checkShields();
  save();
  renderAll();
  if (!silent) toast(`Hola, ${esc(state.profile.name)} 👋`);
}

async function newProfileFlow() {
  let chosen = CHARACTERS[0].id;
  const p = openSheet(`
    <h3>Nuevo perfil</h3>
    <p>Cada perfil tiene su propio progreso, personaje y misiones en este teléfono.</p>
    <label class="field"><span>Nombre de héroe</span><input type="text" id="npName" maxlength="16" placeholder="Ej. Kai" autocomplete="off"></label>
    <div class="field"><span>Elige tu personaje</span><div class="char-grid" id="npChars">${characterCards(chosen)}</div></div>
    <div class="btn-row"><button class="btn" data-close="cancel">Cancelar</button><button class="btn btn-primary" id="npSave">Crear</button></div>`);
  $('#npChars').onclick = e => {
    const c = e.target.closest('[data-char]'); if (!c) return;
    chosen = c.dataset.char;
    $('#npChars').innerHTML = characterCards(chosen);
  };
  $('#npSave').onclick = () => closeSheet({ name: $('#npName').value.trim() || 'Héroe', character: chosen });
  const res = await p;
  if (!res || res === 'cancel') return;
  save(); // guarda el perfil actual antes de cambiar
  const { id } = Profiles.createProfile(res);
  useProfile(id);
}

/** Detalle de una stat: nivel, progreso, actividades y su guardián. */
async function openStatDetail(statId) {
  const s = G.statById(statId);
  const st = G.deriveProfile(state).stats[statId];
  const recent = [...state.log].filter(e => e.stat === statId).sort((a, b) => b.ts - a.ts).slice(0, 5);
  const acts = state.activities.filter(a => a.stat === statId);
  const g = guardianFor(statId, st.level);
  const gName = g.name || `Guardián de ${s.name}`;
  const p = openSheet(`
    <div class="stat-detail-head" style="--c:${s.color}">
      <img src="${statIcon(s.id)}" alt="">
      <div><h3>${s.name}</h3><div class="lvl">LV ${st.level}</div></div>
    </div>
    <div class="stat-bar" style="--c:${s.color};height:10px"><i style="width:${Math.round(st.pct * 100)}%"></i></div>
    <p>${st.into} / ${st.needed} XP para el nivel ${st.level + 1} · ${st.xp} XP en total</p>
    <div class="guardian" style="--c:${s.color}">
      <div class="guardian-art">
        ${artImg(g.img, { alt: esc(gName), fb: g.tier > 1 ? g.fallback : null })}
        <span class="soon">Próximamente</span>
      </div>
      <div class="guardian-text">
        <small>Guardián · Evolución ${g.tier}/5</small><b>${esc(gName)}</b>
        <p>${g.nextAt ? `Evoluciona cuando ${s.name} llegue al nivel ${g.nextAt}.` : '¡Alcanzó su forma final!'}</p>
      </div>
    </div>
    <div class="field"><span>Actividades (${acts.length})</span>
      <div class="chips">${acts.map(a => `<span class="chip">${esc(a.name)} · +${a.xp}</span>`).join('') || '<span class="small muted">Ninguna todavía.</span>'}</div>
    </div>
    <div class="field"><span>Últimos registros</span>
      ${recent.length ? recent.map(e => `<div class="small">${fmtDate(e.ts)} · ${esc(e.name)} · <b>+${e.xp}</b></div>`).join('') : '<span class="small muted">Aún no registras nada aquí.</span>'}
    </div>
    <button class="btn btn-primary btn-block" data-close="ok">Cerrar</button>`);
  await p;
}

async function undo(id) {
  const e = state.log.find(x => x.id === id);
  if (!e) return;
  const extra = { quest: ' La misión volverá a tus pendientes.', weekly: ' Podrás reclamarla de nuevo.', boss: ' Podrás reclamarlo de nuevo.' }[e.type] || '';
  if (!(await confirmSheet('¿Deshacer registro?', `Se quitarán <b>${e.xp} XP</b> de “${esc(e.name)}”.${extra}`, 'Deshacer', true))) return;
  commit(s => G.undoEntry(s, id), { celebrate: false });
  toast('Registro deshecho');
}

// ---------------------------------------------------------------------
// Subida de nivel
// ---------------------------------------------------------------------
let stopSparks = null;
function showLevelUp(p) {
  const el = $('#levelup');
  $('#levelupNum').textContent = p.level;
  $('#levelupRank').textContent = `Rango ${p.rank.letter} · ${p.rank.title}`;
  $('#levelupArt').src = characterImg(state.profile.character);
  // Reinicia las animaciones
  el.hidden = true; void el.offsetWidth; el.hidden = false;
  levelUpOpen = true;
  $('#toasts').innerHTML = '';
  stopSparks?.();
  stopSparks = sparks($('#levelupFx'), ['#ffffff', '#ffd23f', '#ff6a13', p.rank.color]);
  const openedAt = Date.now();
  $('#levelupShare').onclick = e => { e.stopPropagation(); shareProgress(); };
  el.onclick = () => {
    if (Date.now() - openedAt < 900) return;
    el.hidden = true;
    stopSparks?.(); stopSparks = null;
    levelUpOpen = false;
    pendingToasts.splice(0).forEach(([h, o], i) => setTimeout(() => toast(h, o), i * 250));
    setTimeout(runModals, 400);
  };
}

// ---------------------------------------------------------------------
// Respaldo
// ---------------------------------------------------------------------
async function exportBackup() {
  const payload = G.exportPayload(state);
  const json = JSON.stringify(payload, null, 2);
  const name = `kaisen-respaldo-${G.dayKey(Date.now())}.json`;
  const file = new File([json], name, { type: 'application/json' });
  let done = false;
  try {
    // En iPhone, compartir permite "Guardar en Archivos" / iCloud Drive.
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Respaldo Kaisen' });
      done = true;
    }
  } catch (err) {
    if (err.name === 'AbortError') return; // el usuario canceló
  }
  if (!done) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  state.lastBackup = Date.now();
  save(); renderAll();
  toast('💾 Respaldo exportado');
}

async function importBackup(file) {
  try {
    const data = G.validateImport(JSON.parse(await file.text()));
    const ok = await confirmSheet('¿Importar respaldo?',
      `Se reemplazarán tus datos actuales por los del archivo (<b>${data.log.length}</b> registros, <b>${data.activities.length}</b> actividades).`,
      'Importar', true);
    if (!ok) return;
    data.lastBackup = Date.now();
    data.seenAchievements = G.unlockedAchievements(data);
    data.guardianSeen = syncGuardianSeen(data.guardianSeen, G.deriveProfile(data).stats);
    state = data;
    save(); renderAll();
    toast('✅ Respaldo importado');
  } catch (err) {
    toast(`❌ ${esc(err.message || 'Archivo inválido')}`, { kind: 'ach', duration: 4500 });
  }
}

// ---------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === `view-${name}`));
  const tabFor = name === 'history' || name === 'guardians' ? 'achievements' : name === 'gear' ? 'home' : name;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === tabFor));
  window.scrollTo({ top: 0 });
  if (name === 'home' && pendingFlash) setTimeout(heroFlash, 120);
}
$('#tabbar').addEventListener('click', e => {
  const t = e.target.closest('.tab');
  if (t) showView(t.dataset.view);
});

document.querySelectorAll('.seg').forEach(seg => seg.addEventListener('click', e => {
  const b = e.target.closest('.seg-btn');
  if (b) showView(b.dataset.view);
}));
$('#coinChip').onclick = () => showView('shop');
$('#goalBanner').onclick = e => { const v = e.currentTarget.dataset.view; if (v) showView(v); else $('#quickLog').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
$('#shareProgressBtn').onclick = shareProgress;

// Tienda
$('#addRewardBtn').onclick = () => editReward(null);
$('#rewardList').addEventListener('click', e => {
  const buy = e.target.closest('[data-reward-buy]');
  if (buy) return buyRewardFlow(buy.dataset.rewardBuy);
  const ed = e.target.closest('[data-reward-edit]');
  if (ed) editReward(ed.dataset.rewardEdit);
});
$('#couponList').addEventListener('click', async e => {
  const sh = e.target.closest('[data-coupon-share]');
  if (sh) return shareCoupon(sh.dataset.couponShare);
  const use = e.target.closest('[data-coupon-use]');
  if (use && await confirmSheet('¿Usar cupón?', 'Se marcará como usado. ¡Disfrútalo!', 'Usar')) {
    commit(s => G.useCoupon(s, use.dataset.couponUse), { celebrate: false });
  }
});
$('#gearChip').onclick = () => showView('gear');
$('#gearBack').onclick = () => showView('home');
$('#gearLeft').addEventListener('click', e => { const s = e.target.closest('[data-slot]'); if (s) openSlot(s.dataset.slot); });
$('#gearRight').addEventListener('click', e => { const s = e.target.closest('[data-slot]'); if (s) openSlot(s.dataset.slot); });
$('#invGrid').addEventListener('click', e => { const i = e.target.closest('[data-item]'); if (i) openItem(i.dataset.item); });
$('#shopGear').addEventListener('click', e => {
  const i = e.target.closest('[data-item]');
  if (i) openItem(i.dataset.item);   // la ficha tiene el botón de compra y ofrece equipar
});

$('#shieldCard').addEventListener('click', e => {
  if (e.target.closest('#buyShieldBtn')) tryPay(s => G.buyShield(s), '🛡️ Escudo guardado');
});
$('#worldList').addEventListener('click', e => {
  const t = e.target.closest('[data-world]');
  if (!t || t.disabled) return;
  if (t.querySelector('img.missing')) return toast('Ese mundo aún no tiene arte');
  commit(s => { s.equipped.world = t.dataset.world; }, { celebrate: false });
});
$('#skyList').addEventListener('click', e => { const t = e.target.closest('[data-sky-item]'); if (t) cosmeticFlow('sky', t.dataset.skyItem); });
$('#titleList').addEventListener('click', e => { const t = e.target.closest('[data-title-item]'); if (t) cosmeticFlow('title', t.dataset.titleItem); });

// Registro rápido: un toque registra; mantener presionado edita.
// (#quickLog y #resistLog comparten el mismo comportamiento)
let pressTimer = null, longPressed = false;
const quick = $('#view-home');
quick.addEventListener('pointerdown', e => {
  const btn = e.target.closest('.act-btn'); if (!btn) return;
  longPressed = false;
  pressTimer = setTimeout(() => { longPressed = true; editActivity(btn.dataset.act); }, 600);
});
['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => quick.addEventListener(ev, () => clearTimeout(pressTimer)));
quick.addEventListener('scroll', () => clearTimeout(pressTimer), { passive: true });
window.addEventListener('scroll', () => clearTimeout(pressTimer), { passive: true });
quick.addEventListener('contextmenu', e => e.preventDefault());
quick.addEventListener('click', e => {
  const btn = e.target.closest('.act-btn'); if (!btn) return;
  if (longPressed) { longPressed = false; return; }
  onActivityTap(btn);
});

$('#bossMini').onclick = () => showView('quests');
$('#petMini').onclick = openPetSheet;
$('#bossCard').addEventListener('click', e => {
  const b = e.target.closest('#claimBossBtn');
  if (b) {
    const drop = G.bossDrop(G.bossStatus(state).id);
    const hadIt = drop && Gear.ownsItem(state, drop.id);
    claimReward(s => G.claimBoss(s), b, '👹 ¡Jefe derrotado!');
    if (drop && !hadIt) setTimeout(() => toast(`🎁 Botín: <b>${esc(drop.name)}</b> · está en tu inventario`, { kind: 'ach', duration: 5000, action: 'Ver', onAction: () => showView('gear') }), 700);
    return;
  }
  if (e.target.closest('#shareBossBtn')) shareBoss();
});
$('#weeklyList').addEventListener('click', e => {
  const b = e.target.closest('[data-weekly]');
  if (b) claimReward(s => G.claimWeekly(s, b.dataset.weekly), b, '🗓️ ¡Misión semanal!');
});

$('#guardianGrid').addEventListener('click', e => {
  const c = e.target.closest('[data-stat]');
  if (c) openStatDetail(c.dataset.stat);
});
$('#statsGrid').addEventListener('click', e => {
  const st = e.target.closest('.stat[data-stat]');
  if (st) openStatDetail(st.dataset.stat);
});

$('#addQuestBtn').onclick = () => editQuest(null);
$('#questList').addEventListener('click', e => {
  const d = e.target.closest('[data-quest-done]');
  if (d) return finishQuest(d.dataset.questDone, d);
  const ed = e.target.closest('[data-quest-edit]');
  if (ed) editQuest(ed.dataset.questEdit);
});

$('#historyList').addEventListener('click', e => {
  const u = e.target.closest('[data-undo]');
  if (u) return undo(u.dataset.undo);
  if (e.target.id === 'moreHistory') { historyLimit += 150; renderHistory(); }
});

$('#addActivityBtn').onclick = () => editActivity(null);
$('#activityList').addEventListener('click', e => {
  const ed = e.target.closest('[data-act-edit]');
  if (ed) return editActivity(ed.dataset.actEdit);
  const del = e.target.closest('[data-act-del]');
  if (del) deleteActivity(del.dataset.actDel);
});

// Perfil: nombre, personaje, animación y cambio de perfil
$('#charName').addEventListener('input', e => {
  state.profile.name = e.target.value.trim() || 'Héroe';
  save(); $('#heroName').textContent = state.profile.name;
});
$('#charName').addEventListener('blur', () => renderSettings());
$('#charGrid').addEventListener('click', e => {
  const c = e.target.closest('[data-char]'); if (!c) return;
  commit(s => { s.profile.character = c.dataset.char; }, { celebrate: false });
  toast(`Ahora juegas como ${characterById(c.dataset.char).name}`);
});
$('#idleChips').addEventListener('click', e => {
  const c = e.target.closest('[data-idle]'); if (!c) return;
  commit(s => { s.prefs = { ...s.prefs, idle: c.dataset.idle }; }, { celebrate: false });
});
$('#profileChips').addEventListener('click', e => {
  if (e.target.closest('#newProfileBtn')) return newProfileFlow();
  const c = e.target.closest('[data-profile]');
  if (c && c.dataset.profile !== profileId) useProfile(c.dataset.profile);
});
$('#deleteProfileBtn').onclick = async () => {
  if (!(await confirmSheet('¿Borrar este perfil?', `Se borrará <b>${esc(state.profile.name)}</b> con todo su progreso en este teléfono. <b>Exporta un respaldo antes</b> si quieres conservarlo.`, 'Borrar', true))) return;
  const next = Profiles.deleteProfile(profileId);
  useProfile(next, { silent: true });
  toast('Perfil borrado');
};

$('#exportBtn').onclick = exportBackup;
$('#importBtn').onclick = () => $('#importFile').click();
$('#importFile').addEventListener('change', e => {
  const f = e.target.files?.[0];
  if (f) importBackup(f);
  e.target.value = '';
});

$('#resetBtn').onclick = async () => {
  if (!(await confirmSheet('¿Borrar TODO?', 'Perderás tu nivel, historial, misiones y actividades personalizadas. <b>Exporta un respaldo antes</b> si quieres conservarlos.', 'Borrar todo', true))) return;
  const keep = { ...state.profile };  // conserva nombre y personaje del perfil
  state = G.defaultState();
  state.profile = { ...state.profile, ...keep };
  save(); lastLevelShown = null; renderAll();
  toast('Nueva aventura iniciada');
};

// Al volver a la app (p. ej. al día siguiente) se recalcula racha y "hoy".
document.addEventListener('visibilitychange', () => { if (!document.hidden) { checkShields(); renderAll(); } });

// ---------------------------------------------------------------------
// Inicio
// ---------------------------------------------------------------------
// Lo ya desbloqueado al abrir no se vuelve a anunciar.
syncSeen();
save();
checkShields();
renderAll();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').catch(err => console.warn('SW no registrado', err));
}

// Exponer para pruebas manuales desde la consola
window.__kaisen = { get state() { return state; }, G, save };
