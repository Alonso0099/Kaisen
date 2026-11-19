// =====================================================================
// Kaisen — interfaz. Lee/guarda el estado, dibuja las pantallas y
// conecta los botones. La lógica de juego vive en logic.js.
// =====================================================================
import * as G from './logic.js';
import { embers, sparks } from './fx.js';
import { makeCard, shareCard } from './share.js';
import * as Profiles from './profiles.js';
import * as Gear from './gear.js';
import { installInfo, isStandalone } from './install.js';
import { art, CHARACTERS, DEFAULT_CHARACTER, charHero, characterById, characterImg, guardianFor, guardianEvolutions, syncGuardianSeen, GUARDIANS, WORLDS, worldById, DEFAULT_WORLD, DEFAULT_PET, PET_SPECIES, speciesById } from './catalog.js';

export const APP_VERSION = '2.4.1';
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
  lastNews = [];
  if (celebrate) lastNews = collectNews(beforeAdv, adventure(), before, after);
  return result;
}

/**
 * Junta todo lo que desbloqueó un registro en una lista de líneas para UN
 * solo aviso, y muestra como máximo UNA celebración a pantalla completa
 * (prioridad: subir de nivel > eclosión > evolución de guardiana).
 */
let lastNews = [];
function collectNews(beforeAdv, afterAdv, before, after) {
  const lines = [];
  const big = [];  // [prioridad, mostrar, línea si no se muestra]
  // Jefe
  if (afterAdv.boss.refId === beforeAdv.boss.refId && afterAdv.boss.damage > beforeAdv.boss.damage) {
    document.querySelectorAll('.boss-hit').forEach(el => { el.classList.remove('hit-shake'); void el.offsetWidth; el.classList.add('hit-shake'); });
  }
  if (afterAdv.boss.defeated && !beforeAdv.boss.defeated && afterAdv.boss.refId === beforeAdv.boss.refId) {
    lines.push(`👹 ¡Derrotaste a ${esc(afterAdv.boss.name.split(',')[0])}! Reclámalo en Misiones`);
  }
  // Misiones semanales
  afterAdv.weekly.forEach((m, i) => {
    const b = beforeAdv.weekly[i];
    if (m.done && b && b.refId === m.refId && !b.done) lines.push(`🗓️ Misión cumplida: ${esc(m.title)}`);
  });
  // Mascota
  if (afterAdv.pet.stage > beforeAdv.pet.stage) {
    if (G.shouldAskPetName(state, beforeAdv.pet.stage, afterAdv.pet.stage)) {
      big.push([2, () => queueModal(askPetNameOnHatch), '🐣 ¡Tu huevo eclosionó! Ponle nombre en su ficha']);
    } else lines.push(`🐣 ${esc(petName())} ahora es ${afterAdv.pet.stageName}`);
  }
  // Stats
  const ups = G.STATS.filter(s => after.stats[s.id].level > before.stats[s.id].level);
  if (ups.length) lines.push(ups.map(s => `${s.name} nivel ${after.stats[s.id].level}`).join(' · '));
  // Logros
  const fresh = G.unlockedAchievements(state, after).filter(id => !state.seenAchievements.includes(id));
  if (fresh.length) {
    state.seenAchievements = [...new Set([...state.seenAchievements, ...fresh])];
    for (const id of fresh) { const a = G.ACHIEVEMENTS.find(x => x.id === id); lines.push(`${a.icon} Logro: ${esc(a.name)}`); }
  }
  // Guardianas
  for (const { stat, tier } of guardianEvolutions(after.stats, state.guardianSeen)) {
    state.guardianSeen = { ...state.guardianSeen, [stat]: tier };
    const name = GUARDIANS[stat]?.name || G.statById(stat).name;
    big.push([3, () => queueModal(() => showGuardianEvolution(stat, tier)), `✨ ${esc(name)} evolucionó a la forma ${tier}`]);
  }
  // Nivel general
  if (after.level > before.level) big.push([1, () => showLevelUp(after), `⬆️ ¡Nivel ${after.level}!`]);
  big.sort((a, b) => a[0] - b[0]);
  big.forEach(([, show, line], i) => (i === 0 ? show() : lines.unshift(line)));
  save();
  return lines;
}

/** Aviso único de resultado: qué pasó, cuánto ganaste, qué se desbloqueó y "Deshacer". */
function showResult(head, news, onUndo) {
  const MAX = 2;
  const extra = news.length > MAX ? `<span class="res-more">+${news.length - MAX} más en Progreso</span>` : '';
  toast(`<span class="res-head">${head}</span>${news.slice(0, MAX).map(l => `<span class="res-line">${l}</span>`).join('')}${extra}`, {
    kind: 'result', pinned: true, duration: news.length ? 7000 : 5000,
    action: onUndo ? 'Deshacer' : null, onAction: onUndo,
  });
}

/** Foto del estado de jefe, misiones semanales y mascota. */
function adventure() {
  return { boss: G.bossStatus(state), weekly: G.weeklyMissions(state), pet: G.petStatus(state) };
}
const claimables = adv => adv.weekly.filter(m => m.done && !m.claimed).length + (adv.boss.defeated && !adv.boss.claimed ? 1 : 0);

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
  // La racha solo se muestra cuando ya es de 3+ días, y nunca como "rota".
  $('#streakNum').textContent = p.streak.current;
  $('#streakChip').hidden = p.streak.current < 3;
  $('#streakChip').title = `Racha de ${p.streak.current} días`;
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
  const src = characterImg(ch.key);
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

  renderQuick();
}

/** Botón de actividad (accesos rápidos de Inicio). */
function actBtn(a) {
  const s = G.statById(a.stat);
  return `<button class="act-btn" data-act="${esc(a.id)}" style="--c:${s.color}">
    <img class="act-ico" src="${statIcon(s.id)}" alt="">
    <span class="act-text">
      <span class="act-name">${G.isPinned(state, a.id) ? '<i class="pin-dot">★</i>' : ''}${esc(a.name)}</span>
      ${actXp(a)}
      ${a.bonus ? `<span class="act-bonus-tag">★ ${esc(a.bonus.label)} +${a.bonus.xp}</span>` : ''}
    </span>
  </button>`;
}

/** Hasta 3 accesos: fijados y luego los más usados. Perfil nuevo: invitación al catálogo. */
/** "Lo básico de hoy": un toque marca el reto diario; se ve cuántos van. */
function renderBasics() {
  const basics = state.activities.filter(a => a.basic);
  const row = $('#basicsRow');
  row.hidden = !basics.length;
  if (!basics.length) return;
  const today = G.dayKey(Date.now());
  const done = new Set(state.log.filter(e => G.dayKey(e.ts) === today).map(e => e.refId));
  const n = basics.filter(a => done.has(a.id)).length;
  row.innerHTML = `
    <div class="basics-head"><b>Lo básico de hoy</b><span class="${n === basics.length ? 'all' : ''}">${n} de ${basics.length}${n === basics.length ? ' ✓' : ''}</span></div>
    <div class="basics-list">${basics.map(a => {
      const st = G.statById(a.stat); const ok = done.has(a.id);
      return `<button class="basic-chip act-btn ${ok ? 'done' : ''}" data-act="${esc(a.id)}" style="--c:${st.color}" ${ok ? 'disabled' : ''}>
        <i>${ok ? '✓' : '+'}</i><span>${esc(a.name)}</span></button>`;
    }).join('')}</div>`;
}

function renderQuick() {
  renderBasics();
  const quick = G.quickActivities(state);
  $('#quickLog').innerHTML = quick.length
    ? quick.map(actBtn).join('')
    : `<button class="quick-empty" id="quickEmpty"><b>¿Qué hiciste hoy?</b><span>Elige una actividad y tu aventura empieza. Las que más uses aparecerán aquí.</span></button>`;
  $('#quickLog').classList.toggle('n1', quick.length === 1);
  $('#quickLog').classList.toggle('n2', quick.length === 2);
}

/** Catálogo completo: todas las actividades por stat, con ★ para fijar y ✎ para editar. */
async function openCatalog() {
  const today = G.dayKey(Date.now());
  const boss = G.bossStatus(state);
  const row = a => {
    const st = G.statById(a.stat);
    const done = (a.resist || a.basic) && state.log.some(e => e.refId === a.id && G.dayKey(e.ts) === today);
    const extra = Gear.gearExtra(state, a.stat, a.xp);
    return `<div class="cat-row ${done ? 'done' : ''}" style="--c:${st.color}">
      <button class="cat-main" data-pick="${esc(a.id)}" ${done ? 'disabled' : ''}>
        <img src="${a.resist ? art.boss(a.resist) : statIcon(st.id)}" alt="">
        <span><b>${done ? '✔ ' : ''}${esc(a.name)}</b><small>+${a.xp + extra} XP${a.bonus ? ` · ★ ${esc(a.bonus.label)}` : ''}${a.resist === boss.id ? ' · ⚡ ×3 al jefe' : ''}</small></span>
      </button>
      ${a.resist || a.basic ? '' : `<button class="cat-pin ${G.isPinned(state, a.id) ? 'on' : ''}" data-pin="${esc(a.id)}" aria-label="Fijar en Inicio">★</button>`}
      <button class="cat-edit" data-edit="${esc(a.id)}" aria-label="Editar">✎</button>
    </div>`;
  };
  const basics = state.activities.filter(a => a.basic);
  const body = () => (basics.length ? `<div class="cat-group"><div class="cat-title">Lo básico · una vez al día</div>${basics.map(row).join('')}</div>` : '') + G.STATS.map(st => {
    const acts = state.activities.filter(a => a.stat === st.id && !a.resist && !a.basic);
    return acts.length ? `<div class="cat-group"><div class="cat-title" style="--c:${st.color}">${st.name}</div>${acts.map(row).join('')}</div>` : '';
  }).join('') + (state.activities.some(a => a.resist)
    ? `<div class="cat-group"><div class="cat-title">Retos de resistencia</div><p class="small">Una vez al día cada uno. El del jefe del mes hace ×3.</p>${state.activities.filter(a => a.resist).map(row).join('')}</div>` : '');
  const p = openSheet(`
    <h3>Registrar actividad</h3>
    <p class="small">Toca una para registrarla. ★ la fija en Inicio (hasta 3).</p>
    <div id="catBody">${body()}</div>
    <button class="btn btn-block" data-close="new">＋ Crear actividad</button>
    <button class="btn btn-block" data-close="cancel">Cerrar</button>`);
  $('#catBody').addEventListener('click', e => {
    const pin = e.target.closest('[data-pin]');
    if (pin) { G.togglePin(state, pin.dataset.pin); save(); renderQuick(); $('#catBody').innerHTML = body(); return; }
    const ed = e.target.closest('[data-edit]');
    if (ed) return closeSheet('edit:' + ed.dataset.edit);
    const pick = e.target.closest('[data-pick]');
    if (pick && !pick.disabled) closeSheet('pick:' + pick.dataset.pick);
  });
  const res = await p;
  if (!res || res === 'cancel') return;
  if (res === 'new') return editActivity(null);
  const [kind, id] = res.split(':');
  if (kind === 'edit') return editActivity(id);
  if (kind === 'pick') {
    showView('home');
    const btn = document.querySelector(`#quickLog [data-act="${CSS.escape(id)}"]`) || $('#logMainBtn');
    onActivityTap({ dataset: { act: id }, getBoundingClientRect: () => btn.getBoundingClientRect(), classList: btn.classList });
  }
}

/** Banner de "lo que tienes más cerca": empuja a dar el siguiente paso. */
function renderGoal(p, { boss, weekly, pet }) {
  const el = $('#goalBanner');
  const nameP = petName();
  const cands = [];
  const anyLog = state.log.some(G.isBase);
  if (!anyLog) {
    cands.push({ ico: '🥚', text: 'Registra tu primera actividad para que tu huevo empiece a calentarse', pct: 3, view: null });
  } else {
    // Mascota: lo más tangible al empezar
    if (pet.stage === 0) cands.push({ ico: '🐣', text: pet.daysToNext === 1 ? 'Registra un día más para que nazca tu mascota' : `Registra ${pet.daysToNext} días más para que nazca tu mascota`, pct: 1.2 + pet.pct, view: null });
    else if (pet.next && pet.daysToNext <= 3) cands.push({ ico: '🐾', text: `${pet.daysToNext === 1 ? 'Un día activo más' : `${pet.daysToNext} días activos más`} y ${nameP} será ${pet.next.name}`, pct: 1 + pet.pct * .2, view: null });
    // Premios por reclamar
    if (boss.defeated && !boss.claimed) cands.push({ ico: '👹', text: '¡Derrotaste al jefe! Reclama tu premio en Misiones', pct: 2.5, view: 'quests' });
    for (const m of weekly) if (m.done && !m.claimed) cands.push({ ico: '🗓️', text: `Misión cumplida: reclama «${m.title}»`, pct: 2.4, view: 'quests' });
    // Guardiana a punto de evolucionar
    for (const st of G.STATS) {
      const s = p.stats[st.id]; const g = guardianFor(st.id, s.level);
      if (g.nextAt && g.nextAt - s.level === 1) cands.push({ ico: '✨', text: `${st.name} está a un nivel de que ${g.name || 'su guardiana'} evolucione`, pct: .8 + s.pct * .3, view: null });
    }
    // Nivel general (solo si está cerca)
    if (p.pct >= .6) cands.push({ ico: '⬆️', text: `Te faltan ${p.needed - p.into} XP para el nivel ${p.level + 1}`, pct: .6 + p.pct * .3, view: null });
    // Misión semanal con progreso real
    for (const m of weekly) if (!m.done && m.progress > 0) cands.push({ ico: '🗓️', text: `${m.title}: ${m.progress} de ${m.target}`, pct: .5 + (m.progress / m.target) * .3, view: 'quests' });
    if (!boss.defeated) cands.push({ ico: '👹', text: `A ${boss.name.split(',')[0]} le quedan ${boss.hpLeft} PV`, pct: .3 + boss.pct * .2, view: 'quests' });
  }
  const g = cands.sort((a, b) => b.pct - a.pct)[0];
  if (!g) { el.hidden = true; return; }
  el.hidden = false;
  el.dataset.view = g.view || '';
  el.innerHTML = `<span class="g-ico">${g.ico}</span><div>${esc(g.text)}</div>`;
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
    ? [...state.rewards].sort((a, b) => a.cost - b.cost).map(r => `
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

  $('#titleList').innerHTML = G.SHOP.titles.map(t => {
    const own = G.owns(state, t.id), on = state.equipped.title === t.id;
    return `<div class="row shop-row" style="--c:#b58cff">
      <div class="row-main"><div class="row-title">« ${t.name} »</div>${own ? '' : `<div class="row-sub">${priceTag(t.cost)}</div>`}</div>
      <button class="btn ${on ? 'btn-primary' : own ? '' : 'btn-yellow'}" data-title-item="${t.id}" ${!own && bal < t.cost ? 'disabled' : ''}>${on ? 'Quitar' : own ? 'Usar' : 'Comprar'}</button>
    </div>`;
  }).join('');
}

const PET_MOOD = {
  egg: n => 'Cada día que registras algo le das calor',
  happy: n => `¡${n} está feliz!`,
  rest: n => `${n} descansa y te espera`,
  welcome: n => `¡${n} está feliz de verte de nuevo!`,
};
/** Nombre visible de la mascota: el que eligió el jugador o el de la especie. */
const petName = () => G.petCustomName(state) || speciesById(state.pet.species).name;

const PET_MOOD_SHORT = { egg: 'Dale calor', happy: '¡Está feliz!', rest: 'Te espera', welcome: '¡Qué bueno verte!' };
const bossImg = id => art.boss(id);
const petImg = stage => art.pet(state.pet.species || DEFAULT_PET, stage);
const monthName = mk => { const [y, m] = mk.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('es', { month: 'long' }); };
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** Tarjetas pequeñas de Inicio: jefe del mes y mascota. */
function renderMinis({ boss, pet }) {
  const bm = $('#bossMini');
  const today = G.dayKey(Date.now());
  const challenge = state.activities.find(a => a.resist === boss.id);
  const doneToday = challenge && state.log.some(e => e.refId === challenge.id && G.dayKey(e.ts) === today);
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
    </div>
    ${challenge && !boss.defeated ? `<button class="boss-challenge act-btn ${doneToday ? 'done' : ''}" data-act="${esc(challenge.id)}" style="--c:${G.statById(challenge.stat).color}" ${doneToday ? 'disabled' : ''}>
      <span>${doneToday ? '✔ Reto de hoy hecho' : `⚡ ${esc(challenge.name)}`}</span><b>${doneToday ? '' : `+${challenge.xp} XP · ×3`}</b>
    </button>` : ''}`;
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

function renderStreakPanel(p) {
  const shields = G.shieldsLeft(state);
  $('#streakPanel').innerHTML = `
    <div class="sp-item"><b>${p.streak.current}</b><small>Racha actual</small></div>
    <div class="sp-item"><b>${p.streak.best}</b><small>Mejor racha</small></div>
    <div class="sp-item"><b>${shields}</b><small>Escudos 🛡️</small></div>`;
}

function renderAchievements(p) {
  renderStreakPanel(p);
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
  $('#charGrid').innerHTML = heroPicker(state.profile.character, settingsPickHero);
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
  const { kind = '', action, onAction, duration = 3200, pinned = false } = opts;
  const box = $('#toasts');
  // Se muestran como mucho dos. Un aviso "fijo" (el resultado con Deshacer)
  // solo lo reemplaza otro aviso fijo, nunca un aviso común.
  if (pinned) box.querySelectorAll('.toast.pinned').forEach(t => t.remove());
  while (box.children.length >= 2) (box.querySelector('.toast:not(.pinned)') || box.firstElementChild).remove();
  const el = document.createElement('div');
  el.className = `toast ${kind} ${pinned ? 'pinned' : ''}`;
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
  const news = [...lastNews];
  const coins = G.coinsFor(entry) + (firstToday ? G.chestFor(today) : 0);
  showResult(`<b>${esc(entry.name)}</b> · +${entry.xp} XP · +${coins} 🪙`, news,
    () => { commit(s => G.undoEntry(s, entry.id), { celebrate: false }); toast('Registro deshecho'); });
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
  showResult(`📜 <b>${esc(entry.name)}</b> · +${entry.xp} XP`, [...lastNews],
    () => { commit(s => G.undoEntry(s, entry.id), { celebrate: false }); toast('Misión devuelta a pendientes'); });
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
  showResult(`${label} +${entry.xp} XP`, [...lastNews], null);
}

/** Hoja con la mascota en grande, su progreso y sus etapas. */
async function openPetSheet() {
  const pet = G.petStatus(state);
  if (pet.stage > 0) G.markPetNameAsked(state);  // el campo de nombre está en esta misma ficha
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

/** Ideas de recompensas por tipo, para agregar a la Tienda. */
async function openRewardIdeas() {
  const have = new Set(state.rewards.map(r => r.id));
  let pick = [];
  const list = () => G.REWARD_TYPES.map(ty => {
    const opts = G.REWARD_TEMPLATES.filter(r => r.type === ty.id && !have.has(r.id));
    return opts.length ? `<div class="w-group"><div class="w-group-title">${esc(ty.name)}</div><div class="w-habits">${opts.map(r =>
      `<button class="w-habit w-reward ${pick.includes(r.id) ? 'on' : ''}" data-reward="${r.id}">${esc(r.name)} <small>${r.cost} 🪙</small></button>`).join('')}</div></div>` : '';
  }).join('') || '<p>Ya tienes todas las ideas. Crea una propia.</p>';
  const p = openSheet(`
    <h3>Ideas de recompensas</h3>
    <p class="small">Los premios gratis cuestan menos: así premiarte no deshace tus metas.</p>
    <div id="riList">${list()}</div>
    <div class="btn-row"><button class="btn" data-close="cancel">Cancelar</button><button class="btn btn-primary" id="riAdd">Agregar</button></div>`);
  $('#riList').addEventListener('click', e => {
    const r = e.target.closest('[data-reward]'); if (!r) return;
    pick = pick.includes(r.dataset.reward) ? pick.filter(x => x !== r.dataset.reward) : [...pick, r.dataset.reward];
    $('#riList').innerHTML = list();
  });
  $('#riAdd').onclick = () => closeSheet({ ids: pick });
  const res = await p;
  if (!res?.ids?.length) return;
  let n = 0;
  commit(s => { n = G.addRewards(s, res.ids); }, { celebrate: false });
  toast(n === 1 ? 'Recompensa agregada' : `${n} recompensas agregadas`);
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
  const item = G.SHOP.titles.find(x => x.id === itemId);
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
/**
 * Selector en dos pasos: «Elige tu héroe» (6 héroes con su cualidad) y
 * «Elige tu look» (sus dos versiones, con el mismo peso visual).
 * `pickHero` es el héroe abierto en el paso 2, o null para el paso 1.
 */
function heroPicker(selected, pickHero, { compact = false } = {}) {
  const cur = characterById(selected);
  if (!pickHero) {
    const cards = CHARACTERS.map(c => {
      const key = `${c.id}-${cur.look}`, on = c.id === cur.hero;
      return `
      <button class="char-card ${on ? 'on' : ''}" data-hero="${c.id}" style="--c:${c.accent}" aria-label="${esc(c.names[cur.look])}: ${esc(c.title)}">
        ${on ? '<span class="char-check">✓</span>' : ''}
        <img class="char-fig" src="${characterImg(key)}" alt="">
        <b>${esc(c.names[cur.look])}</b><em>${esc(c.title)}</em>${compact ? '' : `<small>${esc(c.blurb)}</small>`}
      </button>`;
    }).join('');
    return `
      <div class="hp-head"><b>Elige tu héroe</b></div>
      <p class="hp-hint">Elige un héroe que te represente o que encarne algo que quieres cultivar.</p>
      <div class="char-grid ${compact ? 'w-chars' : ''}">${cards}</div>
      <p class="hp-note">Todas las actividades dan la misma XP con cualquier héroe, y puedes cambiarlo cuando quieras sin perder progreso.</p>`;
  }
  const c = CHARACTERS.find(x => x.id === pickHero);
  const looks = ['m', 'f'].map(lk => {
    const key = `${c.id}-${lk}`, on = key === cur.key;
    return `
      <button class="char-card look-card ${on ? 'on' : ''}" data-char="${key}" style="--c:${c.accent}" aria-label="${esc(c.names[lk])}">
        ${on ? '<span class="char-check">✓</span>' : ''}
        <img class="char-fig" src="${characterImg(key)}" alt="">
        <b>${esc(c.names[lk])}</b>
      </button>`;
  }).join('');
  return `
    <div class="hp-head"><button class="hp-back" data-hero-back>‹ Héroes</button><b>Elige tu look</b></div>
    <p class="hp-hint"><em style="--c:${c.accent}">${esc(c.title)}</em> · «${esc(c.blurb)}»</p>
    <div class="char-grid look-grid">${looks}</div>`;
}
let settingsPickHero = null;

function useProfile(id, { silent = false } = {}) {
  state = Profiles.switchProfile(id);
  profileId = id;
  lastLevelShown = null;
  syncSeen();
  checkShields();
  save();
  renderAll();
  noticeSkyRefund();
  maybeWelcome();
  if (!silent && state.onboarded) toast(`Hola, ${esc(state.profile.name)} 👋`);
}

async function newProfileFlow() {
  const ok = await confirmSheet('¿Crear otro perfil?', 'Cada perfil tiene su propio progreso, personaje y hábitos en este teléfono. Podrás volver a este cuando quieras desde Ajustes.', 'Crear perfil');
  if (!ok) return;
  save(); // guarda el perfil actual antes de cambiar
  const { id } = Profiles.createProfile({ name: 'Héroe', character: DEFAULT_CHARACTER });
  useProfile(id, { silent: true });   // la bienvenida se abre sola
}

// ---------------------------------------------------------------------
// Bienvenida: 3 pasos para empezar (nombre y personaje → hábitos → listo)
// ---------------------------------------------------------------------
const welcomeDraft = { step: 1, name: '', character: DEFAULT_CHARACTER, pickHero: null, habits: [], rewards: [] };
const W_STEPS = 4;
const habitChips = (ids, selected) => ids.map(t => {
  const st = G.statById(t.stat);
  return `<button class="w-habit ${selected.includes(t.id) ? 'on' : ''}" data-habit="${t.id}" style="--c:${st.color}">${esc(t.name)}</button>`;
}).join('');
const areaGroups = (selected, filter = () => true) => G.HABIT_AREAS.map(ar => {
  const opts = G.HABIT_TEMPLATES.filter(t => t.area === ar.id && filter(t));
  return opts.length ? `<div class="w-group"><div class="w-group-title ${ar.id === 'basico' ? 'basic' : ''}">${esc(ar.name)}</div>
    ${ar.hint ? `<p class="w-hint">${esc(ar.hint)}</p>` : ''}<div class="w-habits">${habitChips(opts, selected)}</div></div>` : '';
}).join('');

function maybeWelcome() {
  if (state.onboarded) { $('#welcome').hidden = true; return; }
  Object.assign(welcomeDraft, { step: 1, name: state.profile.name === 'Héroe' ? '' : state.profile.name, character: state.profile.character, pickHero: null, habits: [], rewards: [] });
  $('#welcome').hidden = false;
  renderWelcome();
}

function renderWelcome() {
  const d = welcomeDraft;
  const dots = Array.from({ length: W_STEPS }, (_, k) => k + 1).map(i => `<i class="${i === d.step ? 'on' : i < d.step ? 'done' : ''}"></i>`).join('');
  let body = '';
  if (d.step === 1) {
    body = `
      <div class="w-brand">KAI<span>SEN</span></div>
      <h2>Tu vida es la aventura</h2>
      <p>Cada cosa buena que haces en la vida real le da experiencia a tu héroe. Empecemos por conocerte.</p>
      <label class="field"><span>¿Cómo se llama tu héroe?</span>
        <input type="text" id="wName" maxlength="16" placeholder="Héroe" value="${esc(d.name)}" autocomplete="off"></label>
      <div class="field hero-picker" id="wChars">${heroPicker(d.character, d.pickHero, { compact: true })}</div>
      <button class="btn btn-primary btn-block" data-w="next">Siguiente</button>`;
  } else if (d.step === 2) {
    body = `
      <h2>¿Qué quieres hacer más seguido?</h2>
      <p>Empieza por lo básico (dormir, agua, comer): son retos de todos los días. Luego elige lo que quieres construir. De ${G.ONBOARD_MIN} a ${G.ONBOARD_MAX} en total.</p>
      ${areaGroups(d.habits)}
      <div class="w-foot">
        <span class="w-count">${d.habits.length === 1 ? '1 elegido' : `${d.habits.length} elegidos`}</span>
        <div class="btn-row">
          <button class="btn" data-w="back">Atrás</button>
          <button class="btn btn-primary" data-w="next" ${d.habits.length < G.ONBOARD_MIN ? 'disabled' : ''}>Siguiente</button>
        </div>
        <button class="w-skip" data-w="skip">Saltar y usar los hábitos sugeridos</button>
      </div>`;
  } else if (d.step === 3) {
    const groups = G.REWARD_TYPES.map(ty => `
      <div class="w-group"><div class="w-group-title">${esc(ty.name)}</div>
        <div class="w-habits">${G.REWARD_TEMPLATES.filter(r => r.type === ty.id).map(r => `
          <button class="w-habit w-reward ${d.rewards.includes(r.id) ? 'on' : ''}" data-reward="${r.id}">${esc(r.name)} <small>${r.cost} 🪙</small></button>`).join('')}</div>
      </div>`).join('');
    body = `
      <h2>¿Con qué te vas a premiar?</h2>
      <p>Con lo que hagas ganas monedas para canjear premios reales. Los gratis son los más baratos: un premio no debería deshacer tu meta. Opcional, hasta ${G.REWARD_PICK_MAX}.</p>
      ${groups}
      <div class="w-foot">
        <span class="w-count">${d.rewards.length ? `${d.rewards.length} de ${G.REWARD_PICK_MAX}` : 'Si no eliges, te dejamos algunas para empezar'}</span>
        <div class="btn-row"><button class="btn" data-w="back">Atrás</button><button class="btn btn-primary" data-w="next">Siguiente</button></div>
      </div>`;
  } else {
    const first = G.HABIT_TEMPLATES.find(t => t.id === d.habits[0]);
    body = `
      <div class="w-hero"><img src="${characterImg(d.character)}" alt=""></div>
      <h2>¡Listo, ${esc(d.name || 'Héroe')}!</h2>
      <ul class="w-rules">
        <li><b>Registra</b> lo que hiciste con un toque. Si te equivocas, toca <b>Deshacer</b>.</li>
        <li><b>Lo básico</b> se marca una vez al día desde Inicio.</li>
        <li>Cada día que registras algo, tu <b>huevo</b> se calienta. En 2 días nace tu mascota.</li>
        <li>Lo demás (jefes, guardianas, tienda) lo irás descubriendo.</li>
      </ul>
      <button class="btn btn-primary btn-block" data-w="finish">${first ? `Empezar: registrar «${esc(first.name)}»` : 'Empezar'}</button>
      <button class="w-skip" data-w="finish-only">Entrar sin registrar todavía</button>`;
  }
  $('#welcomeInner').innerHTML = `<div class="w-dots">${dots}</div>${body}`;
  $('#welcomeInner').scrollTop = 0;
}

function finishWelcome({ habits = welcomeDraft.habits, logFirst = false } = {}) {
  const d = welcomeDraft;
  G.applyOnboarding(state, { name: d.name, character: d.character, habitIds: habits, rewardIds: d.rewards });
  save();
  $('#welcome').hidden = true;
  lastLevelShown = null;
  renderAll();
  showView('home');
  if (logFirst && habits[0]) setTimeout(() => {
    const btn = document.querySelector(`#quickLog [data-act="${CSS.escape(habits[0])}"], #basicsRow [data-act="${CSS.escape(habits[0])}"]`);
    if (btn) onActivityTap(btn);
  }, 350);
  else toast(`¡Bienvenido, ${esc(state.profile.name)}! Registra algo cuando lo hagas.`);
}

$('#welcome').addEventListener('input', e => { if (e.target.id === 'wName') welcomeDraft.name = e.target.value; });
$('#welcome').addEventListener('click', e => {
  const d = welcomeDraft;
  const hp = e.target.closest('[data-hero], [data-hero-back], [data-char]');
  if (hp) {
    if (hp.dataset.char) d.character = hp.dataset.char;
    d.pickHero = hp.dataset.hero || (hp.dataset.char ? charHero(hp.dataset.char) : null);
    $('#wChars').innerHTML = heroPicker(d.character, d.pickHero, { compact: true });
    if (hp.dataset.hero) $('#wChars').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    return;
  }
  const rw = e.target.closest('[data-reward]');
  if (rw) {
    const id = rw.dataset.reward;
    if (d.rewards.includes(id)) d.rewards = d.rewards.filter(x => x !== id);
    else if (d.rewards.length < G.REWARD_PICK_MAX) d.rewards.push(id);
    else return toast(`Hasta ${G.REWARD_PICK_MAX}. Después puedes agregar más en la Tienda.`);
    const y = $('#welcomeInner').scrollTop; renderWelcome(); $('#welcomeInner').scrollTop = y;
    return;
  }
  const h = e.target.closest('[data-habit]');
  if (h) {
    const id = h.dataset.habit;
    if (d.habits.includes(id)) d.habits = d.habits.filter(x => x !== id);
    else if (d.habits.length < G.ONBOARD_MAX) d.habits.push(id);
    else return toast(`Puedes elegir hasta ${G.ONBOARD_MAX}. Después podrás agregar más.`);
    const y = $('#welcomeInner').scrollTop; renderWelcome(); $('#welcomeInner').scrollTop = y;
    return;
  }
  const a = e.target.closest('[data-w]'); if (!a || a.disabled) return;
  const act = a.dataset.w;
  if (act === 'next') { d.step = Math.min(W_STEPS, d.step + 1); renderWelcome(); }
  if (act === 'back') { d.step = Math.max(1, d.step - 1); renderWelcome(); }
  if (act === 'skip') finishWelcome({ habits: [] });
  if (act === 'finish') finishWelcome({ logFirst: true });
  if (act === 'finish-only') finishWelcome();
});

/** Ajustes: agregar más hábitos de la lista. */
async function openHabitPicker() {
  const have = new Set(state.activities.map(a => a.id));
  let pick = [];
  const list = () => areaGroups(pick, t => !have.has(t.id)) || '<p>Ya tienes todos los hábitos de la lista. Puedes crear uno propio.</p>';
  const p = openSheet(`
    <h3>Elegir de la lista</h3>
    <div id="hpList">${list()}</div>
    <div class="btn-row"><button class="btn" data-close="cancel">Cancelar</button><button class="btn btn-primary" id="hpAdd">Agregar</button></div>`);
  $('#hpList').addEventListener('click', e => {
    const h = e.target.closest('[data-habit]'); if (!h) return;
    const id = h.dataset.habit;
    pick = pick.includes(id) ? pick.filter(x => x !== id) : [...pick, id];
    $('#hpList').innerHTML = list();
  });
  $('#hpAdd').onclick = () => closeSheet({ ids: pick });
  const res = await p;
  if (!res || !res.ids?.length) return;
  let n = 0;
  commit(s => { n = G.addHabits(s, res.ids); }, { celebrate: false });
  toast(n === 1 ? 'Hábito agregado' : `${n} hábitos agregados`);
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
$('#rewardIdeasBtn').onclick = openRewardIdeas;
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
$('#titleList').addEventListener('click', e => { const t = e.target.closest('[data-title-item]'); if (t) cosmeticFlow('title', t.dataset.titleItem); });

// Registro rápido: un toque registra; mantener presionado edita.
// (accesos rápidos y el reto del jefe comparten el mismo comportamiento)
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

$('#bossMini').addEventListener('click', e => { if (!e.target.closest('.boss-challenge')) showView('quests'); });
$('#bossMini').addEventListener('keydown', e => { if (e.key === 'Enter') showView('quests'); });
$('#logMainBtn').onclick = openCatalog;
$('#quickLog').addEventListener('click', e => { if (e.target.closest('#quickEmpty')) openCatalog(); });
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
$('#addHabitsBtn').onclick = openHabitPicker;
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
  const h = e.target.closest('[data-hero]');
  if (h) { settingsPickHero = h.dataset.hero; renderSettings(); return; }
  if (e.target.closest('[data-hero-back]')) { settingsPickHero = null; renderSettings(); return; }
  const c = e.target.closest('[data-char]'); if (!c) return;
  settingsPickHero = null;
  // Solo cambia el avatar: nivel, XP, historial y guardianas siguen igual.
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
  maybeWelcome();
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
noticeSkyRefund();
maybeWelcome();

/** Una sola vez: avisa que se devolvieron las monedas de los Ambientes retirados. */
function noticeSkyRefund() {
  const refund = G.skyRefund(state);
  if (!refund || state.notices?.skyRefund) return;
  state.notices = { ...state.notices, skyRefund: true };
  save();
  setTimeout(() => toast(`🪙 Retiramos los Ambientes de la Tienda y te devolvimos <b>${refund} monedas</b>`, { kind: 'ach', duration: 6000 }), 800);
}

// ---------------------------------------------------------------------
// Instalar la app (ver install.js)
// ---------------------------------------------------------------------
let installPrompt = null;   // evento beforeinstallprompt guardado (Android / escritorio)
let justInstalled = false;  // se instaló durante esta visita (la pestaña sigue siendo la del navegador)
function renderInstall() {
  const info = installInfo({ standalone: isStandalone() || justInstalled, hasPrompt: !!installPrompt, ua: navigator.userAgent });
  const steps = info.steps ? `<ol class="install-steps">${info.steps.map(t => `<li>${esc(t)}</li>`).join('')}</ol>` : '';
  $('#installCard').innerHTML = `
    <p class="install-title">${esc(info.title)}</p>
    ${steps}
    ${info.button ? `<button class="btn btn-primary btn-block" id="installBtn">${esc(info.button)}</button>` : ''}`;
  $('#installCard').dataset.kind = info.kind;
}
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; renderInstall(); });
addEventListener('appinstalled', () => { installPrompt = null; justInstalled = true; renderInstall(); toast('📲 ¡Kaisen instalada!', { kind: 'ach' }); });
$('#installCard').addEventListener('click', async e => {
  if (!e.target.closest('#installBtn') || !installPrompt) return;
  const p = installPrompt; installPrompt = null;
  p.prompt();
  const choice = await p.userChoice.catch(() => ({ outcome: 'dismissed' }));
  // Si lo cancela, Chrome no vuelve a ofrecer el aviso hasta más tarde: se explica el menú.
  if (choice.outcome === 'accepted') justInstalled = true;
  else toast('Puedes instalarla después desde Ajustes o el menú del navegador');
  renderInstall();
});
matchMedia('(display-mode: standalone)').addEventListener?.('change', renderInstall);
renderInstall();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').catch(err => console.warn('SW no registrado', err));
}

// Exponer para pruebas manuales desde la consola
window.__kaisen = { get state() { return state; }, G, save };
