// =====================================================================
// Kaizen — interfaz. Lee/guarda el estado, dibuja las pantallas y
// conecta los botones. La lógica de juego vive en logic.js.
// =====================================================================
import * as G from './logic.js';
import { embers, sparks } from './fx.js';
import { makeCard, shareCard } from './share.js';
import * as Profiles from './profiles.js';
import * as Gear from './gear.js';
import { installInfo, isStandalone } from './install.js';
import { kaizenMeaning, guideFor, tourSteps as tourStepsFor } from './guide.js';
import { t, tn, getLang, setLang, LANGS, nameOf, statName, bossName, bossShort, bossTaunt, heroName, heroTitle, heroBlurb, missionText, achName, statShort, achDesc, itemName, slotName, rarityName, titleName, worldName, speciesName, elementName, stageName, effortName, lockName, guardianPhrase, locale } from './i18n.js';
import { GUARDIAN_LINES, lineOfDay, heroLines, guardianLines, bossLines, backLines } from './phrases.js';
import { art, CHARACTERS, DEFAULT_CHARACTER, charHero, characterById, characterImg, guardianFor, guardianEvolutions, syncGuardianSeen, GUARDIANS, WORLDS, worldById, DEFAULT_WORLD, DEFAULT_PET, PET_SPECIES, speciesById } from './catalog.js';

export const APP_VERSION = '2.10.0';
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
    toast(t('⚠️ No se pudo guardar. Exporta un respaldo.'), { kind: 'ach' });
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
    lines.push(t('👹 ¡Derrotaste a {boss}! Reclámalo en Misiones', { boss: esc(bossShort(afterAdv.boss)) }));
  }
  // Misiones semanales
  afterAdv.weekly.forEach((m, i) => {
    const b = beforeAdv.weekly[i];
    if (m.done && b && b.refId === m.refId && !b.done) lines.push(t('🗓️ Misión cumplida: {name}', { name: esc(mText(m).title) }));
  });
  // Mascota
  if (afterAdv.pet.stage > beforeAdv.pet.stage) {
    if (G.shouldAskPetName(state, beforeAdv.pet.stage, afterAdv.pet.stage)) {
      big.push([2, () => queueModal(askPetNameOnHatch), t('🐣 ¡Tu huevo eclosionó! Ponle nombre en su ficha')]);
    } else lines.push(t('🐣 {name} ahora es {stage}', { name: esc(petName()), stage: stageName(afterAdv.pet.stage) }));
  }
  // Stats
  const ups = G.STATS.filter(s => after.stats[s.id].level > before.stats[s.id].level);
  if (ups.length) lines.push(ups.map(s => t('{stat} nivel {lv}', { stat: statName(s), lv: after.stats[s.id].level })).join(' · '));
  // Logros
  const fresh = G.unlockedAchievements(state, after).filter(id => !state.seenAchievements.includes(id));
  if (fresh.length) {
    state.seenAchievements = [...new Set([...state.seenAchievements, ...fresh])];
    for (const id of fresh) { const a = G.ACHIEVEMENTS.find(x => x.id === id); lines.push(`${a.icon} ${t('Logro: {name}', { name: esc(achName(a)) })}`); }
  }
  // Guardianas
  for (const { stat, tier } of guardianEvolutions(after.stats, state.guardianSeen)) {
    state.guardianSeen = { ...state.guardianSeen, [stat]: tier };
    const name = GUARDIANS[stat]?.name || G.statById(stat).name;
    big.push([3, () => queueModal(() => showGuardianEvolution(stat, tier)), t('✨ {name} evolucionó a la forma {n}', { name: esc(name), n: tier })]);
  }
  // Nivel general
  if (after.level > before.level) big.push([1, () => showLevelUp(after), `⬆️ ${t('¡Nivel {lv}!', { lv: after.level })}`]);
  big.sort((a, b) => a[0] - b[0]);
  big.forEach(([, show, line], i) => (i === 0 ? show() : lines.unshift(line)));
  save();
  return lines;
}

/** Aviso único de resultado: qué pasó, cuánto ganaste, qué se desbloqueó y "Deshacer". */
function showResult(head, news, onUndo) {
  const MAX = 3;
  const extra = news.length > MAX ? `<span class="res-more">${t('+{n} más en Progreso', { n: news.length - MAX })}</span>` : '';
  toast(`<span class="res-head">${head}</span>${news.slice(0, MAX).map(l => `<span class="res-line">${l}</span>`).join('')}${extra}`, {
    kind: 'result', pinned: true, duration: news.length ? 7000 : 5000,
    action: onUndo ? t('Deshacer') : null, onAction: onUndo,
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
  const name = g.name || t('Guardiana de {stat}', { stat: statName(s) });
  const res = await openSheet(`
    <div class="evo" style="--c:${s.color}">
      <div class="evo-kicker">${t('¡Evolución!')}</div>
      <div class="evo-art">${artImg(art.guardian(statId, tier), { alt: esc(name), fb: tier > 1 ? art.guardian(statId, 1) : null })}<span class="soon">${t('Próximamente')}</span></div>
      <h3>${esc(name)}</h3>
      <div class="evo-form">${t('Forma {n} de 5 · {stat}', { n: tier, stat: statName(s) })}</div>
      ${GUARDIANS[statId]?.phrase ? `<blockquote class="evo-quote">«${esc(guardianPhrase(statId, GUARDIANS[statId].phrase))}»</blockquote>` : ''}
    </div>
    <div class="btn-row"><button class="btn" data-close="see">${t('Ver guardianas')}</button><button class="btn btn-primary" data-close="ok">${t('Continuar')}</button></div>`);
  if (res === 'see') { showView('achievements'); showView('guardians'); }
}
const guardianLevelFor = tier => [1, 5, 10, 20, 35][tier - 1] || 1;

/** Al eclosionar: "Ponle nombre a tu compañero" (se puede omitir). */
async function askPetNameOnHatch() {
  const sp = speciesById(state.pet.species);
  const p = openSheet(`
    <h3>${t('¡Tu huevo eclosionó!')}</h3>
    <div class="pet-sheet-art hatch"><img class="pet-img happy" src="${petImg(1)}" alt=""></div>
    <label class="field"><span>${t('Ponle nombre a tu compañero')}</span>
      <input type="text" id="hatchName" maxlength="${G.PET_NAME_MAX}" placeholder="${esc(speciesName(sp))}" autocomplete="off"></label>
    <p class="small">${t('Si lo dejas vacío se llamará <b>{name}</b>. Puedes cambiarlo cuando quieras desde su ficha.', { name: esc(speciesName(sp)) })}</p>
    <div class="btn-row"><button class="btn" data-close="skip">${t('Omitir')}</button><button class="btn btn-primary" id="hatchSave">${t('Guardar')}</button></div>`);
  $('#hatchSave').onclick = () => closeSheet({ name: $('#hatchName').value });
  $('#hatchName').addEventListener('keydown', e => { if (e.key === 'Enter') $('#hatchSave').click(); });
  const res = await p;
  // Omitir, cerrar tocando fuera o guardar vacío: se recuerda que ya se preguntó.
  if (res && typeof res === 'object') G.setPetName(state, res.name);
  else G.markPetNameAsked(state);
  save();
  renderAll();
  toast(t('🐣 ¡Conoce a <b>{name}</b>!', { name: esc(petName()) }), { kind: 'ach', duration: 4000 });
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
  $('#streakChip').title = tn(p.streak.current, 'Racha de {n} día', 'Racha de {n} días');
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
  return `<svg viewBox="0 0 160 160" aria-label="${t('Gráfico de stats')}">
    ${[1, .66, .33].map(k => `<polygon class="ring" points="${poly(R * k)}"/>`).join('')}
    ${G.STATS.map((_, i) => { const [x, y] = pt(i, R); return `<line class="axis" x1="${C}" y1="${C}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }).join('')}
    <polygon class="shape" points="${shape}"/>
    ${G.STATS.map((s, i) => { const [x, y] = pt(i, R + 12); return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" fill="${s.color}" style="filter:brightness(1.4)">${statShort(s)}</text>`; }).join('')}
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
  img.alt = heroName(ch, ch.look);
  const stage = $('#heroStage');
  stage.style.setProperty('--flash', ch.accent);
  stage.classList.toggle('idle-sway', state.prefs?.idle !== 'static');
  stage.classList.toggle('idle-static', state.prefs?.idle === 'static');
}

/**
 * Frase del día del héroe, en una burbuja sobre la escena. Sale sola la
 * primera vez que abres la app cada día; tocando al héroe se vuelve a ver.
 */
let saySeq = 0;
function heroSays({ force = false } = {}) {
  if (!state.onboarded || !$('#tour').hidden) return;
  const today = G.dayKey(Date.now());
  if (!force && state.notices?.saidDay === today) return;
  if (!force) { state.notices = { ...state.notices, saidDay: today }; save(); }
  const hero = characterById(state.profile.character);
  const el = $('#heroSay');
  el.innerHTML = `<b>${esc(state.profile.name || heroName(hero, hero.look))}</b>${esc(lineOfDay(heroLines(hero.hero), hero.hero, today))}`;
  el.hidden = false;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  const n = ++saySeq;
  setTimeout(() => { if (n === saySeq) el.hidden = true; }, 9000);
}
// Tocar la escena (el héroe) vuelve a mostrar su frase del día.
$('#scene').addEventListener('click', e => { if (!e.target.closest('button, .hud')) heroSays({ force: true }); });
$('#heroSay').addEventListener('click', () => { saySeq++; $('#heroSay').hidden = true; });

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
  $('#heroName').textContent = !state.profile.name || state.profile.name === 'Héroe' ? t('Héroe') : state.profile.name;
  $('#rankBadge').textContent = t('Rango {letter} · {title}', { letter: p.rank.letter, title: t(p.rank.title) });
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
  $('#todayText').textContent = t('Hoy +{n} XP', { n: p.todayXp });

  $('#radar').innerHTML = radarSvg(p);
  $('#statsGrid').innerHTML = G.STATS.map(s => {
    const st = p.stats[s.id];
    return `<div class="stat" data-stat="${s.id}" style="--c:${s.color}">
      <img src="${statIcon(s.id)}" alt="">
      <div>
        <div class="stat-head"><span>${statName(s)}</span><b>LV ${st.level}</b></div>
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
      <span class="act-name">${G.isPinned(state, a.id) ? '<i class="pin-dot">★</i>' : ''}${esc(nameOf(a))}</span>
      ${actXp(a)}
      ${a.bonus ? `<span class="act-bonus-tag">★ ${esc(t(a.bonus.label))} +${a.bonus.xp}</span>` : ''}
      ${(() => { const st = G.planStatus(state, a); return st ? `<span class="act-plan">${planProgress(st)}</span>` : ''; })()}
      ${a.measure ? `<span class="act-measure" ${state.timer?.act === a.id ? 'data-timer-tag' : ''}>${measureTag(a)}</span>` : ''}
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
    <div class="basics-head"><b>${t('Lo básico de hoy')}</b><span class="${n === basics.length ? 'all' : ''}">${t('{n} de {total}', { n, total: basics.length })}${n === basics.length ? ' ✓' : ''}</span></div>
    <div class="basics-list">${basics.map(a => {
      const st = G.statById(a.stat); const ok = done.has(a.id);
      return `<button class="basic-chip act-btn ${ok ? 'done' : ''}" data-act="${esc(a.id)}" style="--c:${st.color}" ${ok ? 'disabled' : ''}>
        <i>${ok ? '✓' : a.measure?.kind === 'count' ? '💧' : '+'}</i><span>${esc(nameOf(a))}${a.measure ? `<small ${state.timer?.act === a.id ? 'data-timer-tag' : ''}>${measureTag(a)}</small>` : ''}</span></button>`;
    }).join('')}</div>`;
}

/** Texto corto del plan de una actividad: «lun · mié · vie» o «3 por semana». */
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const weekdayShort = d => new Date(2026, 10, 15 + d).toLocaleDateString(locale(), { weekday: 'short' }).replace('.', '');
function planLabel(plan) {
  const p = G.normalizePlan(plan);
  if (!p) return '';
  return p.kind === 'days' ? WEEKDAY_ORDER.filter(d => p.days.includes(d)).map(weekdayShort).join(' · ') : t('{n} por semana', { n: p.target });
}
/** Progreso de la semana de una actividad con plan: «2 de 3 esta semana». */
const planProgress = st => st.met ? t('✓ Meta de la semana') : t('{n} de {total} esta semana', { n: st.done, total: st.target });

/** "Para hoy": lo que toca hoy según el plan de cada actividad. */
// (la píldora del temporizador se actualiza con cada render de Inicio)
function renderPlan() {
  const row = $('#planRow');
  const items = G.todayPlan(state);
  row.hidden = !items.length;
  if (!items.length) return;
  const n = items.filter(x => x.st.doneToday).length;
  row.innerHTML = `
    <div class="basics-head"><b>${t('Para hoy')}</b><span class="${n === items.length ? 'all' : ''}">${t('{n} de {total}', { n, total: items.length })}${n === items.length ? ' ✓' : ''}</span></div>
    <div class="basics-list">${items.map(({ act: a, st }) => {
      const c = G.statById(a.stat).color;
      return `<button class="basic-chip plan-chip act-btn ${st.doneToday ? 'done' : ''}" data-act="${esc(a.id)}" style="--c:${c}" ${st.doneToday ? 'disabled' : ''}>
        <i>${st.doneToday ? '✓' : '+'}</i><span>${esc(nameOf(a))}<small>${planProgress(st)}${a.measure ? ` · ${measureTag(a)}` : ''}</small></span></button>`;
    }).join('')}</div>`;
}

function renderQuick() {
  renderTimer();
  renderPlan();
  renderBasics();
  // Lo que ya está en «Para hoy» no se repite en los accesos rápidos.
  const inPlan = new Set(G.todayPlan(state).map(x => x.act.id));
  const quick = G.quickActivities(state, Date.now(), 12).filter(a => !inPlan.has(a.id)).slice(0, G.QUICK_MAX);
  $('#quickLog').innerHTML = quick.length
    ? quick.map(actBtn).join('')
    : inPlan.size ? ''
    : `<button class="quick-empty" id="quickEmpty"><b>${t('¿Qué hiciste hoy?')}</b><span>${t('Elige una actividad y tu aventura empieza. Las que más uses aparecerán aquí.')}</span></button>`;
  $('#quickLog').classList.toggle('n1', quick.length === 1);
  $('#quickLog').classList.toggle('n2', quick.length === 2);
}

// ---------------------------------------------------------------------
// Contador y temporizador
// ---------------------------------------------------------------------
/** Etiqueta corta de cómo se registra: «3/8 vasos» o «⏱ 25 min». */
function measureTag(a) {
  const m = G.normalizeMeasure(a.measure);
  if (!m) return '';
  if (m.kind === 'count') return `${G.counterValue(state, a.id)}/${m.goal}${m.unit ? ` ${t(m.unit)}` : ''}`;
  if (state.timer?.act === a.id) return `⏳ ${fmtLeft(state.timer.endsAt - Date.now())}`;
  return `⏱ ${t('{n} min', { n: m.minutes })}`;
}
const fmtLeft = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

function tapCounterFlow(a, m, btn) {
  const next = G.counterValue(state, a.id) + 1;
  if (next >= m.goal) return doLog(a.id, false, btn, s => G.tapCounter(s, a.id).entry);
  try { commit(s => G.tapCounter(s, a.id), { celebrate: false }); }
  catch (err) { return toast(`✋ ${esc(t(err.message))}`); }
  if (btn?.getBoundingClientRect) { const r = btn.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, G.statById(a.stat).color); }
  toast(t('{name}: {n} de {goal}', { name: esc(nameOf(a)), n: next, goal: m.goal }) + (m.unit ? ` ${t(m.unit)}` : ''), { duration: 1600 });
}

async function openTimer(a, m) {
  const running = state.timer?.act === a.id;
  if (state.timer && !running) {
    const other = state.activities.find(x => x.id === state.timer.act);
    if (!(await confirmSheet(t('¿Cambiar de temporizador?'), t('«{name}» sigue contando. Si empiezas otro, ese se cancela sin XP.', { name: esc(other ? nameOf(other) : '') }), t('Empezar este')))) return;
  }
  if (!running) commit(s => G.startTimer(s, a.id), { celebrate: false });
  const total = m.minutes * 60000;
  const p = openSheet(`
    <h3>${esc(nameOf(a))}</h3>
    <div class="timer-face"><b class="timer-live" data-left>${fmtLeft(state.timer.endsAt - Date.now())}</b>
      <div class="hpbar goal"><i class="timer-bar" style="width:${Math.round((1 - (state.timer.endsAt - Date.now()) / total) * 100)}%"></i></div></div>
    <p class="small center">${t('Al terminar se registra solo: +{xp} XP. Puedes cerrar esta hoja; el tiempo sigue corriendo.', { xp: a.xp })}</p>
    <div class="btn-row"><button class="btn btn-danger" data-close="cancel-timer">${t('Cancelar')}</button><button class="btn btn-primary" data-close="ok">${t('Seguir')}</button></div>`);
  const res = await p;
  if (res === 'cancel-timer' && state.timer?.act === a.id) { commit(s => G.cancelTimer(s), { celebrate: false }); toast(t('Temporizador cancelado')); }
  renderTimer();
}

/** Píldora con el tiempo restante y revisión cada segundo. Al terminar, se registra. */
function renderTimer() {
  const tm = state.timer;
  const pill = $('#timerPill');
  pill.hidden = !tm;
  if (!tm) return;
  if (Date.now() >= tm.endsAt) {
    const id = tm.act;
    pill.hidden = true;
    doLog(id, false, null, s => G.checkTimer(s));
    return;
  }
  const a = state.activities.find(x => x.id === tm.act);
  pill.textContent = `⏳ ${a ? nameOf(a) : ''} · ${fmtLeft(tm.endsAt - Date.now())}`;
  const live = document.querySelector('#sheet .timer-live');
  if (live) {
    live.textContent = fmtLeft(tm.endsAt - Date.now());
    const bar = document.querySelector('#sheet .timer-bar');
    if (bar) bar.style.width = `${Math.round((1 - (tm.endsAt - Date.now()) / (tm.endsAt - tm.startedAt)) * 100)}%`;
  }
}
setInterval(() => { if (state.timer) { renderTimer(); document.querySelectorAll('[data-timer-tag]').forEach(el => { el.textContent = `⏳ ${fmtLeft(state.timer.endsAt - Date.now())}`; }); } }, 1000);
$('#timerPill').onclick = () => { const a = state.activities.find(x => x.id === state.timer?.act); if (a) openTimer(a, G.normalizeMeasure(a.measure)); };

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
        <span><b>${done ? '✔ ' : ''}${esc(nameOf(a))}</b><small>+${a.xp + extra} XP${a.bonus ? ` · ★ ${esc(t(a.bonus.label))}` : ''}${a.resist === boss.id ? t(' · ⚡ ×3 al jefe') : ''}${a.plan ? ` · 📅 ${planLabel(a.plan)}` : ''}${a.measure ? ` · ${measureTag(a)}` : ''}</small></span>
      </button>
      ${a.resist || a.basic ? '' : `<button class="cat-pin ${G.isPinned(state, a.id) ? 'on' : ''}" data-pin="${esc(a.id)}" aria-label="${t('Fijar en Inicio')}">★</button>`}
      <button class="cat-edit" data-edit="${esc(a.id)}" aria-label="${t('Editar')}">✎</button>
    </div>`;
  };
  const basics = state.activities.filter(a => a.basic);
  const body = () => (basics.length ? `<div class="cat-group"><div class="cat-title">${t('Lo básico · una vez al día')}</div>${basics.map(row).join('')}</div>` : '') + G.STATS.map(st => {
    const acts = state.activities.filter(a => a.stat === st.id && !a.resist && !a.basic);
    return acts.length ? `<div class="cat-group"><div class="cat-title" style="--c:${st.color}">${statName(st)}</div>${acts.map(row).join('')}</div>` : '';
  }).join('') + (state.activities.some(a => a.resist)
    ? `<div class="cat-group"><div class="cat-title">${t('Retos de resistencia')}</div><p class="small">${t('Una vez al día cada uno. El del jefe del mes hace ×3.')}</p>${state.activities.filter(a => a.resist).map(row).join('')}</div>` : '');
  const p = openSheet(`
    <h3>${t('Registrar actividad')}</h3>
    <p class="small">${t('Toca una para registrarla. ★ la fija en Inicio (hasta 3).')}</p>
    <div id="catBody">${body()}</div>
    <button class="btn btn-block" data-close="new">${t('＋ Crear actividad')}</button>
    <button class="btn btn-block" data-close="cancel">${t('Cerrar')}</button>`);
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
    cands.push({ ico: '🥚', text: t('Registra tu primera actividad para que tu huevo empiece a calentarse'), pct: 3, view: null });
  } else {
    // Mascota: lo más tangible al empezar
    if (pet.stage === 0) cands.push({ ico: '🐣', text: pet.daysToNext === 1 ? t('Registra un día más para que nazca tu mascota') : t('Registra {n} días más para que nazca tu mascota', { n: pet.daysToNext }), pct: 1.2 + pet.pct, view: null });
    else if (pet.next && pet.daysToNext <= 3) cands.push({ ico: '🐾', text: (pet.daysToNext === 1 ? t('Un día activo más y {name} será {stage}', { name: nameP, stage: stageName(pet.stage + 1) }) : t('{n} días activos más y {name} será {stage}', { n: pet.daysToNext, name: nameP, stage: stageName(pet.stage + 1) })), pct: 1 + pet.pct * .2, view: null });
    // Premios por reclamar
    if (boss.defeated && !boss.claimed) cands.push({ ico: '👹', text: t('¡Derrotaste al jefe! Reclama tu premio en Misiones'), pct: 2.5, view: 'quests' });
    const ex = G.expeditionFor(state);
    if (ex?.done && !ex.claimed) cands.push({ ico: '🧭', text: t('{name} volvió de la expedición: recibe el botín en Misiones', { name: GUARDIANS[ex.stat]?.name || '' }), pct: 2.45, view: 'quests' });
    else if (ex && !ex.done && ex.target - ex.progress === 1) cands.push({ ico: '🧭', text: t('Una actividad de {stat} más y {name} vuelve con el botín', { stat: statName(G.statById(ex.stat)), name: GUARDIANS[ex.stat]?.name || '' }), pct: 1.1, view: 'quests' });
    for (const m of weekly) if (m.done && !m.claimed) cands.push({ ico: '🗓️', text: t('Misión cumplida: reclama «{name}»', { name: mText(m).title }), pct: 2.4, view: 'quests' });
    // Guardiana a punto de evolucionar
    for (const st of G.STATS) {
      const s = p.stats[st.id]; const g = guardianFor(st.id, s.level);
      if (g.nextAt && g.nextAt - s.level === 1) cands.push({ ico: '✨', text: t('{stat} está a un nivel de que {name} evolucione', { stat: statName(st), name: g.name || t('su guardiana') }), pct: .8 + s.pct * .3, view: null });
    }
    // Nivel general (solo si está cerca)
    if (p.pct >= .6) cands.push({ ico: '⬆️', text: t('Te faltan {n} XP para el nivel {lv}', { n: p.needed - p.into, lv: p.level + 1 }), pct: .6 + p.pct * .3, view: null });
    // Misión semanal con progreso real
    for (const m of weekly) if (!m.done && m.progress > 0) cands.push({ ico: '🗓️', text: t('{title}: {n} de {target}', { title: mText(m).title, n: m.progress, target: m.target }), pct: .5 + (m.progress / m.target) * .3, view: 'quests' });
    if (!boss.defeated) cands.push({ ico: '👹', text: t('A {boss} le quedan {hp} PV', { boss: bossShort(boss), hp: boss.hpLeft }), pct: .3 + boss.pct * .2, view: 'quests' });
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
const bonusText = it => it.stat === 'all' ? t('+{n}% XP en todo', { n: it.pct }) : t('+{n}% XP en {stat}', { n: it.pct, stat: statName(G.statById(it.stat)) });

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
    <span><small>${t('Botín')}</small><b>${esc(itemName(d))}</b><em>${bonusText(d)}</em></span>${got ? `<span class="tag">${t('Tuyo')}</span>` : ''}</div>`;
}

function renderGear() {
  const eq = Gear.equippedItems(state);
  const slotHtml = ({ slot, item }) => `
    <button class="gear-slot ${item ? 'full' : ''}" data-slot="${slot.id}" style="--r:${item ? Gear.RARITY[item.rarity].color : 'transparent'}">
      ${item ? itemIcon(item) : `<span class="it-ico empty"><i>${slot.icon}</i></span>`}
      <small>${item ? esc(itemName(item)) : slotName(slot)}</small>
    </button>`;
  $('#gearLeft').innerHTML = eq.slice(0, 4).map(slotHtml).join('');
  $('#gearRight').innerHTML = eq.slice(4).map(slotHtml).join('');
  const src = characterImg(state.profile.character);
  if ($('#gearHero').getAttribute('src') !== src) $('#gearHero').src = src;

  const sum = Gear.gearSummary(state, G.STAT_IDS);
  $('#gearBonus').innerHTML = sum.length
    ? sum.map(x => { const s = G.statById(x.stat); return `<span class="chip" style="--c:${s.color}"><img src="${statIcon(s.id)}" alt="">+${x.pct}%</span>`; }).join('')
    : `<span class="small muted">${t('Sin bonus todavía. Equipa piezas para ganar XP extra.')}</span>`;
  const best = Math.max(0, ...G.STAT_IDS.map(id => Gear.gearPct(state, id)));
  $('#gearChipBonus').textContent = best ? `+${best}%` : '';

  const owned = Gear.ownedItemIds(state);
  const worn = new Set(eq.filter(x => x.item).map(x => x.item.id));
  $('#invHint').textContent = t('{n} de {total} piezas. Toca una para ver de dónde sale o equiparla.', { n: owned.size, total: Gear.ITEMS.length });
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
    ? t('Botín de <b>{boss}</b>.', { boss: esc(bossName(G.BOSSES.find(b => b.id === it.boss))) })
    : t('Se vende en la Tienda por <b>{n} monedas</b>.', { n: it.cost });
  const action = own
    ? (wornIn ? `<button class="btn btn-block" data-close="unequip">${t('Quitar')}</button>` : `<button class="btn btn-primary btn-block" data-close="equip">${t('Equipar')}</button>`)
    : it.cost ? `<button class="btn btn-yellow btn-block" data-close="buy" ${bal < it.cost ? 'disabled' : ''}>${t('Comprar')} · ${it.cost} 🪙</button>` : '';
  const res = await openSheet(`
    <div class="item-head" style="--r:${r.color}">${itemIcon(it)}
      <div><h3>${esc(itemName(it))}</h3><span class="rarity">${rarityName(it.rarity, r.name)} · ${slotName(Gear.SLOTS.find(s => (s.type || s.id) === it.type))}</span></div>
    </div>
    <p><b>${bonusText(it)}</b>. ${source}</p>
    ${!own && it.cost && bal < it.cost ? `<p class="small">${t('Te faltan {n} monedas.', { n: it.cost - bal })}</p>` : ''}
    ${action}
    <button class="btn btn-block" data-close="cancel">${t('Cerrar')}</button>`);
  if (res === 'equip') commit(s => Gear.equipItem(s, Gear.slotFor(s, it), id), { celebrate: false });
  if (res === 'unequip') commit(s => Gear.equipItem(s, wornIn, null), { celebrate: false });
  if (res === 'buy' && tryPay(s => G.buyItem(s, id), t('🎒 ¡{name} es tuya!', { name: esc(itemName(it)) }))) {
    heroReact();
    if (await confirmSheet(t('¿Equiparla ahora?'), `${esc(itemName(it))}: ${bonusText(it)}.`, t('Equipar'))) {
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
    <h3>${slotName(slot)}</h3>
    ${options.length ? `<div class="list">${options.map(it => `
      <button class="row slot-opt ${it.id === current ? 'on' : ''}" data-close="${it.id}" style="--c:${Gear.RARITY[it.rarity].color}">
        ${itemIcon(it)}<div class="row-main"><div class="row-title">${esc(itemName(it))}</div><div class="row-sub">${bonusText(it)}</div></div>
        ${it.id === current ? `<span class="tag">${t('Puesta')}</span>` : ''}
      </button>`).join('')}</div>`
      : `<p>${t('No tienes piezas para este espacio. Consíguelas en la <b>Tienda</b> o derrotando jefes.')}</p>`}
    ${current ? `<button class="btn btn-block" data-close="__none">${t('Dejar vacío')}</button>` : ''}
    ${options.length ? '' : `<button class="btn btn-primary btn-block" data-close="__shop">${t('Ir a la Tienda')}</button>`}
    <button class="btn btn-block" data-close="cancel">${t('Cerrar')}</button>`);
  if (!res || res === 'cancel') return;
  if (res === '__shop') return showView('shop');
  commit(s => Gear.equipItem(s, slotId, res === '__none' ? null : res), { celebrate: false });
}

function renderShop() {
  const w = G.wallet(state);
  const bal = Math.max(0, w.balance);
  $('#walletNum').textContent = bal;
  $('#walletHint').textContent = w.chestToday === null
    ? t('Registra algo hoy para abrir tu cofre del día.')
    : t('Cofre de hoy: +{n}. Ganas monedas con cada registro, logro, misión y jefe.', { n: w.chestToday });

  const ownedGear = Gear.ownedItemIds(state);
  $('#shopGear').innerHTML = Gear.shopItems().map(it => {
    const own = ownedGear.has(it.id);
    return `<div class="row shop-row" data-item="${it.id}" style="--c:${Gear.RARITY[it.rarity].color}">
      ${itemIcon(it)}
      <div class="row-main"><div class="row-title">${esc(itemName(it))}</div><div class="row-sub">${bonusText(it)}${own ? '' : ` · ${priceTag(it.cost)}`}</div></div>
      ${own ? `<span class="tag">${t('Tuya')}</span>` : `<button class="btn btn-yellow" data-item-buy="${it.id}" ${bal < it.cost ? 'disabled' : ''}>${t('Comprar')}</button>`}
    </div>`;
  }).join('');

  $('#rewardList').innerHTML = state.rewards.length
    ? [...state.rewards].sort((a, b) => a.cost - b.cost).map(r => {
      const lock = G.rewardLock(state, r);
      return `
      <div class="row shop-row ${lock?.locked ? 'locked' : ''}" style="--c:#ffd23f">
        <div class="row-main">
          <div class="row-title">${lock ? (lock.locked ? '🔒 ' : '🔓 ') : ''}${esc(nameOf(r))}</div>
          <div class="row-sub">${priceTag(r.cost)}${bal < r.cost ? t(' · te faltan {n}', { n: r.cost - bal }) : ''}</div>
          ${lock ? `<div class="rw-lock"><span>${t('Reto: {label}', { label: esc(lockLabel(r.lock, lock)) })}</span><div class="hpbar pet"><i style="width:${Math.round(lock.progress / lock.target * 100)}%"></i></div><small>${lock.progress}/${lock.target}${lock.locked ? '' : t(' · ¡Cumplido!')}</small></div>` : ''}
        </div>
        <button class="icon-btn" data-reward-edit="${esc(r.id)}" aria-label="${t('Editar')}">✎</button>
        <button class="btn btn-yellow" data-reward-buy="${esc(r.id)}" ${bal < r.cost || lock?.locked ? 'disabled' : ''}>${t('Canjear')}</button>
      </div>`;
    }).join('')
    : `<div class="empty">${t('Crea tu primera recompensa.')}</div>`;

  const coupons = state.purchases.filter(x => x.kind === 'reward').sort((a, b) => (a.used - b.used) || (b.ts - a.ts));
  $('#couponList').innerHTML = coupons.length
    ? coupons.slice(0, 12).map(c => `
      <div class="row coupon shop-row ${c.used ? 'used' : ''}">
        <div class="row-main">
          <div class="row-title">🎟️ ${esc(nameOf({ id: c.itemId, name: c.name }))}</div>
          <div class="row-sub">${c.used ? t('Usado el {date}', { date: fmtDate(c.usedAt) }) : t('Canjeado el {date}', { date: fmtDate(c.ts) })}</div>
        </div>
        ${c.used ? '' : `<button class="icon-btn" data-coupon-share="${esc(c.id)}" aria-label="${t('Compartir')}">↗</button>
        <button class="btn" data-coupon-use="${esc(c.id)}">${t('Usar')}</button>`}
      </div>`).join('')
    : `<p class="small muted">${t('Aún no tienes cupones.')}</p>`;

  const left = G.shieldsLeft(state), sh = G.SHOP.shield;
  $('#shieldCard').innerHTML = `
    <div class="panel shield-card">
      <div class="shield-ico">🛡️</div>
      <div>
        <div class="row-title">${t('Tienes {n} de {max}', { n: left, max: sh.max })}</div>
        <div class="row-sub">${t('Si faltas más días de los que cubre tu día de gracia, el escudo se usa solo y tu racha sigue viva.')}</div>
        <button class="btn btn-yellow btn-block" id="buyShieldBtn" ${left >= sh.max || bal < sh.cost ? 'disabled' : ''}>
          ${left >= sh.max ? t('Máximo guardado') : `${t('Comprar')} · ${sh.cost} 🪙`}</button>
      </div>
    </div>`;

  const lvl = G.deriveProfile(state).level;
  const current = state.equipped.world || DEFAULT_WORLD;
  $('#worldList').innerHTML = WORLDS.map(w => {
    const open = lvl >= w.minLevel, on = current === w.id;
    const rank = G.rankFor(w.minLevel);
    return `<button class="sky-tile world-tile ${on ? 'on' : ''} ${open ? '' : 'locked'}" data-world="${w.id}" ${open ? '' : 'disabled'}>
      <div class="world-prev">${artImg(art.world(w.id))}<span class="soon">${t('Próximamente')}</span></div>
      <div class="sky-info"><span>${esc(worldName(w))}</span><small>${on ? t('✔ En uso') : open ? t('Usar') : t('Rango {letter}', { letter: rank.letter })}</small></div>
    </button>`;
  }).join('');

  $('#titleList').innerHTML = G.SHOP.titles.map(ti => {
    const own = G.owns(state, ti.id), on = state.equipped.title === ti.id;
    return `<div class="row shop-row" style="--c:#b58cff">
      <div class="row-main"><div class="row-title">« ${titleName(ti)} »</div>${own ? '' : `<div class="row-sub">${priceTag(ti.cost)}</div>`}</div>
      <button class="btn ${on ? 'btn-primary' : own ? '' : 'btn-yellow'}" data-title-item="${ti.id}" ${!own && bal < ti.cost ? 'disabled' : ''}>${on ? t('Quitar') : own ? t('Usar') : t('Comprar')}</button>
    </div>`;
  }).join('');
}

const PET_MOOD = {
  egg: n => t('Cada día que registras algo le das calor'),
  happy: n => t('¡{name} está feliz!', { name: n }),
  rest: n => t('{name} descansa y te espera', { name: n }),
  welcome: n => t('¡{name} está feliz de verte de nuevo!', { name: n }),
};
/** Nombre visible de la mascota: el que eligió el jugador o el de la especie. */
const petName = () => G.petCustomName(state) || speciesName(speciesById(state.pet.species));

const PET_MOOD_SHORT = { egg: 'Dale calor', happy: '¡Está feliz!', rest: 'Te espera', welcome: '¡Qué bueno verte!' };
const bossImg = id => art.boss(id);
const petImg = stage => art.pet(state.pet.species || DEFAULT_PET, stage);
const monthName = mk => { const [y, m] = mk.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString(locale(), { month: 'long' }); };
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
      <div class="mini-kicker">${t('Jefe del mes')}</div>
      <div class="mini-title">${esc(bossShort(boss))}</div>
      ${boss.defeated
        ? `<div class="mini-sub" style="color:var(--yellow)">${boss.claimed ? t('✔ Derrotado') : t('¡Reclama tu premio!')}</div>`
        : `<div class="hpbar"><i style="width:${Math.round((1 - boss.pct) * 100)}%"></i></div>
           <div class="mini-sub">${boss.hpLeft} ${t('PV')} · ${boss.daysLeft} d${boss.defenseToday ? ' · 🛡️' : ''}</div>`}
    </div>
    ${challenge && !boss.defeated ? `<button class="boss-challenge act-btn ${doneToday ? 'done' : ''}" data-act="${esc(challenge.id)}" style="--c:${G.statById(challenge.stat).color}" ${doneToday ? 'disabled' : ''}>
      <span>${doneToday ? t('✔ Reto de hoy hecho') : `⚡ ${esc(nameOf(challenge))}`}</span><b>${doneToday ? '' : `+${challenge.xp} XP · ×3`}</b>
    </button>` : ''}`;
  const name = petName();
  $('#petMini').innerHTML = `
    <img class="pet-img ${pet.mood}" src="${petImg(pet.stage)}" alt="">
    <div class="mini-body">
      <div class="mini-kicker">${stageName(pet.stage)}</div>
      <div class="mini-title">${esc(name)}</div>
      <div class="hpbar pet"><i style="width:${Math.round(pet.pct * 100)}%"></i></div>
      <div class="mini-sub">${t(PET_MOOD_SHORT[pet.mood])}</div>
    </div>`;
}

// ---------------------------------------------------------------------
// Expedición de la semana
// ---------------------------------------------------------------------
let expedDraft = { stat: null, route: 'segura' };
const guardianImg = (stat, p) => guardianFor(stat, (p || G.deriveProfile(state)).stats[stat].level);
function renderExpedition() {
  const p = G.deriveProfile(state);
  const x = G.expeditionFor(state);
  const card = $('#expedCard');
  const past = G.pastExpeditions(state).slice(0, 8);
  const album = past.length ? `
    <h3 class="sub-title">${t('Postales de expediciones')}</h3>
    <div class="postcards">${past.map(px => { const gg = guardianImg(px.stat, p); return `
      <div class="postcard ${px.success ? 'ok' : 'miss'}">${artImg(art.world(px.world))}${artImg(gg.img, { fb: gg.fallback })}
        <span>${esc(worldName(worldById(px.world)))} · ${esc(gg.name)} ${px.success ? '✓' : '·'}</span></div>`; }).join('')}</div>` : '';
  if (!x) {
    const d = expedDraft;
    card.innerHTML = `
      <div class="panel exped">
        <p class="small">${t('Elige una guardiana y una ruta. Las actividades de su stat esta semana la hacen avanzar. Si no llega, vuelve sin botín y sin castigo.')}</p>
        <div class="exped-guards">${G.STATS.map(s => {
          const g = guardianImg(s.id, p);
          return `<button class="exped-g ${d.stat === s.id ? 'on' : ''}" data-exped-stat="${s.id}" style="--c:${s.color}">
            ${artImg(g.img, { fb: g.tier > 1 ? g.fallback : null })}<b>${esc(g.name || statName(s))}</b><small>${statName(s)}</small></button>`;
        }).join('')}</div>
        <div class="exped-routes">${Object.entries(G.EXPED_ROUTES).map(([id, r]) => `
          <button class="exped-route ${d.route === id ? 'on' : ''}" data-exped-route="${id}">
            <b>${id === 'segura' ? t('🛡️ Ruta segura') : t('⚔️ Ruta arriesgada')}</b>
            <small>${t('{n} actividades esta semana', { n: r.target })}</small><em>+${r.coins} 🪙</em></button>`).join('')}</div>
        <button class="btn btn-primary btn-block" id="expedGo" ${d.stat ? '' : 'disabled'}>${d.stat ? t('Enviar a {name}', { name: esc(GUARDIANS[d.stat]?.name || '') }) : t('Elige una guardiana')}</button>
      </div>${album}`;
    return;
  }
  const s = G.statById(x.stat);
  const g = guardianImg(x.stat, p);
  const w = worldById(x.world);
  const days = G.weeklyMissions(state)[0].daysLeft;
  card.innerHTML = `
    <div class="panel exped live ${x.done ? 'done' : ''}" style="--c:${s.color}">
      <div class="exped-scene">${artImg(art.world(x.world))}${artImg(g.img, { fb: g.tier > 1 ? g.fallback : null })}</div>
      <div class="exped-body">
        <b>${x.done ? (x.claimed ? t('{name} ya volvió de {world}', { name: esc(g.name), world: esc(worldName(w)) }) : t('¡{name} volvió de {world} con el botín!', { name: esc(g.name), world: esc(worldName(w)) }))
          : t('{name} explora {world}', { name: esc(g.name), world: esc(worldName(w)) })}</b>
        <small>${x.route === 'segura' ? t('🛡️ Ruta segura') : t('⚔️ Ruta arriesgada')} · ${t('{n} de {total} actividades de {stat}', { n: x.progress, total: x.target, stat: statName(s) })}</small>
        <div class="hpbar goal"><i style="width:${Math.round(x.progress / x.target * 100)}%"></i></div>
        ${x.done
          ? (x.claimed ? `<small>${t('Puedes enviar otra expedición el lunes.')}</small>` : `<button class="btn btn-yellow btn-block" id="expedClaim">${t('Recibir +{n} 🪙', { n: x.coins })}</button>`)
          : `<small>${days === 1 ? t('Vuelve mañana: queda 1 día.') : t('Vuelve el domingo: quedan {n} días.', { n: days })}</small>`}
      </div>
    </div>`;
  card.innerHTML += album;
}
async function claimExpeditionFlow() {
  const x = G.expeditionFor(state);
  if (!x) return;
  let coins;
  try { commit(s => { coins = G.claimExpedition(s); }, { celebrate: false }); } catch (err) { return toast(`✋ ${esc(t(err.message))}`); }
  const g = guardianImg(x.stat);
  heroReact();
  await openSheet(`
    <div class="exped-result" style="--c:${G.statById(x.stat).color}">
      <div class="exped-scene big">${artImg(art.world(x.world))}${artImg(g.img, { fb: g.fallback })}</div>
      <h3>${t('¡{name} volvió con el botín!', { name: esc(g.name) })}</h3>
      <p class="exped-loot">+${coins} 🪙</p>
      <p class="small center">${t('Guardamos una postal de {world} en tu álbum.', { world: esc(worldName(worldById(x.world))) })}</p>
    </div>
    <button class="btn btn-primary btn-block" data-close="ok">${t('Genial')}</button>`);
}
$('#expedCard').addEventListener('click', e => {
  const st = e.target.closest('[data-exped-stat]');
  if (st) { expedDraft.stat = st.dataset.expedStat; return renderExpedition(); }
  const rt = e.target.closest('[data-exped-route]');
  if (rt) { expedDraft.route = rt.dataset.expedRoute; return renderExpedition(); }
  if (e.target.closest('#expedGo') && expedDraft.stat) {
    try { commit(s => G.startExpedition(s, expedDraft.stat, expedDraft.route, s.equipped?.world || DEFAULT_WORLD), { celebrate: false }); }
    catch (err) { return toast(`✋ ${esc(t(err.message))}`); }
    toast(t('🧭 ¡{name} salió de expedición!', { name: esc(GUARDIANS[expedDraft.stat]?.name || '') }));
    expedDraft = { stat: null, route: 'segura' };
    return;
  }
  if (e.target.closest('#expedClaim')) claimExpeditionFlow();
});

/** Pestaña Misiones: jefe del mes, misiones semanales y trofeos. */
function renderAdventure({ boss, weekly }) {
  renderExpedition();
  const weak = G.statById(boss.weak);
  $('#bossCard').innerHTML = `
    <div class="boss-card ${boss.defeated ? 'defeated' : ''}">
      <img class="boss-art boss-hit" src="${bossImg(boss.id)}" alt="${esc(bossName(boss))}">
      ${boss.defeated ? `<div class="boss-stamp">${t('¡Derrotado!')}</div>` : ''}
      <div class="boss-name">${esc(bossName(boss))}</div>
      <div class="boss-taunt">${esc(lineOfDay([bossTaunt(boss), ...bossLines(boss.id)], boss.id, G.dayKey(Date.now())))}</div>
      <div class="hpbar"><i style="width:${Math.round((1 - boss.pct) * 100)}%"></i></div>
      <div class="boss-meta">
        <span>${boss.hpLeft} / ${boss.hp} ${t('PV')}</span>
        <span class="boss-weak"><img src="${statIcon(weak.id)}" alt="">${t('Débil a {stat}', { stat: statName(weak) })} <b>×2</b></span>
      </div>
      ${boss.defeated
        ? boss.claimed
          ? `<p class="boss-note">${t('Premio reclamado. Un nuevo jefe llegará el mes que viene.')}</p>
             <button class="btn btn-block" id="shareBossBtn">${t('Presumir la victoria')}</button>`
          : `<button class="btn btn-yellow btn-block" id="claimBossBtn">${t('Reclamar +{n} XP', { n: boss.rewardXp })}</button>`
        : `<p class="boss-note">${boss.daysLeft === 1 ? t('Cada XP que ganas le quita 1 PV. Te queda 1 día para derrotarlo y ganar <b>+{xp} XP</b>.', { xp: boss.rewardXp }) : t('Cada XP que ganas le quita 1 PV. Te quedan {n} días para derrotarlo y ganar <b>+{xp} XP</b>.', { n: boss.daysLeft, xp: boss.rewardXp })}</p>
           <p class="boss-note small">${boss.defenseToday
             ? t('🛡️ <b>Defensa activa:</b> cumpliste su reto ayer, así que hoy no puede recuperarse.')
             : t('Si pasa un día sin que registres nada de {stat} ni su reto, recupera un poco de vida (nunca te quita nada a ti). Cumplir su reto te da <b>Defensa</b> para el día siguiente.', { stat: statName(weak) })}${boss.healed ? t(' Este mes ha recuperado {n} PV.', { n: boss.healed }) : ''}</p>`}
      ${dropLine(boss)}
    </div>`;

  $('#weeklyHint').textContent = weekly[0].daysLeft === 1 ? t('Se renuevan cada lunes. Queda 1 día.') : t('Se renuevan cada lunes. Quedan {n} días.', { n: weekly[0].daysLeft });
  $('#weeklyList').innerHTML = weekly.map(m => {
    const st = m.stat ? G.statById(m.stat) : null;
    return `<div class="row weekly ${m.claimed ? 'claimed' : ''}" style="--c:${st ? st.color : '#ffd23f'}">
      <div class="w-ico">${st ? `<img src="${statIcon(st.id)}" alt="">` : m.icon}</div>
      <div class="row-main">
        <div class="row-title">${esc(mText(m).title)}</div>
        <div class="row-sub"><span>${esc(mText(m).desc)}</span></div>
        <div class="hpbar goal"><i style="width:${Math.round(m.progress / m.target * 100)}%"></i></div>
        <div class="row-sub"><span>${m.progress} / ${m.target}</span><span class="row-xp">+${m.rewardXp} XP</span></div>
      </div>
      ${m.claimed ? '<span class="w-check">✔</span>' : m.done ? `<button class="btn btn-yellow" data-weekly="${m.id}">${t('Reclamar')}</button>` : ''}
    </div>`;
  }).join('');

  const trophies = G.bossTrophies(state);
  $('#trophies').innerHTML = trophies.length
    ? trophies.map(tr => `<div class="trophy"><img src="${bossImg(tr.id)}" alt="${esc(bossName(tr))}"><span>${monthName(tr.monthKey)} ${tr.monthKey.slice(0, 4)}</span></div>`).join('')
    : `<p class="small muted">${t('Aún no derrotas a ningún jefe.')}</p>`;
}

function renderQuests() {
  $('#questList').innerHTML = state.quests.length
    ? state.quests.map(q => {
        const s = G.statById(q.stat);
        return `<div class="row quest-row" style="--c:${s.color}">
          <img class="row-ico" src="${statIcon(s.id)}" alt="">
          <div class="row-main">
            <div class="row-title">${esc(q.name)}</div>
            <div class="row-sub">${statName(s)} · <span class="row-xp">+${q.xp} XP</span></div>
          </div>
          <button class="icon-btn" data-quest-edit="${esc(q.id)}" aria-label="${t('Editar')}">✎</button>
          <button class="btn btn-yellow" data-quest-done="${esc(q.id)}">${t('¡Hecho!')}</button>
        </div>`;
      }).join('')
    : `<div class="empty">${t('Sin misiones pendientes.<br>Crea una para ganar XP extra.')}</div>`;

  const done = [...state.questHistory].sort((a, b) => b.completedAt - a.completedAt);
  $('#questDone').innerHTML = done.length
    ? done.map(q => {
        const s = G.statById(q.stat) || G.STATS[0];
        return `<div class="row done" style="--c:${s.color}">
          <div class="row-main">
            <div class="row-title">✔ ${esc(q.name)}</div>
            <div class="row-sub">${fmtDate(q.completedAt)} · ${statName(s)}</div>
          </div>
          <span class="row-xp">+${q.xp}</span>
        </div>`;
      }).join('')
    : `<p class="small muted">${t('Aún no completas misiones.')}</p>`;
}

let historyLimit = 150;
function renderHistory() {
  const log = [...state.log].sort((a, b) => b.ts - a.ts);
  if (!log.length) {
    $('#historyList').innerHTML = `<div class="empty">${t('Tu historia empieza con el primer registro. ⚔️')}</div>`;
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
          <div class="row-title">${{ quest: '📜 ', weekly: '🗓️ ', boss: '👹 ' }[e.type] || ''}${esc(nameOf(e))}</div>
          <div class="row-sub">${fmtTime(e.ts)} · ${statName(s)} · <span class="row-xp">+${e.xp} XP</span></div>
        </div>
        <button class="icon-btn" data-undo="${esc(e.id)}" aria-label="${t('Deshacer')}">↶</button>
      </div>`;
    }).join('');
    html += '</div>';
  }
  if (log.length > historyLimit) html += `<button class="btn btn-block" id="moreHistory" style="margin-top:14px">${t('Ver más')}</button>`;
  $('#historyList').innerHTML = html;
}

/** Galería de guardianas: forma actual de cada una y cuándo evoluciona. */
function renderGuardians(p) {
  $('#guardianGrid').innerHTML = G.STATS.map(s => {
    const st = p.stats[s.id];
    const g = guardianFor(s.id, st.level);
    const name = g.name || t('Guardiana de {stat}', { stat: statName(s) });
    return `<button class="g-card" data-stat="${s.id}" style="--c:${s.color}">
      <div class="g-art">${artImg(g.img, { alt: esc(name), fb: g.tier > 1 ? g.fallback : null })}<span class="soon">${t('Próximamente')}</span></div>
      <div class="g-info">
        <b>${esc(name)}</b>
        <small>${t('{stat} · Forma {n}/5', { stat: statName(s), n: g.tier })}</small>
        <div class="g-pips">${[1, 2, 3, 4, 5].map(k => `<i class="${k <= g.tier ? 'on' : ''}"></i>`).join('')}</div>
        <span class="g-next">${G.AFFINITY_PCT[g.tier - 1] ? t('Afinidad +{n} % · ', { n: G.AFFINITY_PCT[g.tier - 1] }) : ''}${g.nextAt ? t('Evoluciona en LV {n}', { n: g.nextAt }) : t('Forma final')}</span>
      </div>
    </button>`;
  }).join('');
}

function renderStreakPanel(p) {
  const shields = G.shieldsLeft(state);
  $('#streakPanel').innerHTML = `
    <div class="sp-item"><b>${p.streak.current}</b><small>${t('Racha actual')}</small></div>
    <div class="sp-item"><b>${p.streak.best}</b><small>${t('Mejor racha')}</small></div>
    <div class="sp-item"><b>${shields}</b><small>${t('Escudos 🛡️')}</small></div>`;
}

function renderAchievements(p) {
  renderStreakPanel(p);
  const unlocked = new Set(G.unlockedAchievements(state, p));
  $('#achSummary').textContent = t('{n} de {total} desbloqueados · cada logro da {coins} monedas · mejor racha: {best} días', { n: unlocked.size, total: G.ACHIEVEMENTS.length, coins: G.COINS.achievement, best: p.streak.best });
  $('#achList').innerHTML = G.ACHIEVEMENTS.map(a => `
    <div class="ach ${unlocked.has(a.id) ? 'unlocked' : 'locked'}">
      <span class="ach-ico">${artImg(art.badge(a.id))}<i>${a.icon}</i></span>
      <div class="ach-name">${esc(achName(a))}</div>
      <div class="ach-desc">${esc(achDesc(a))}</div>
    </div>`).join('');
}

function renderSettings() {
  const nameInput = $('#charName');
  if (document.activeElement !== nameInput) nameInput.value = state.profile.name || '';
  const profiles = Profiles.listProfiles();
  $('#profileChips').innerHTML = profiles.map(pr => `
    <button class="chip profile ${pr.active ? 'on' : ''}" data-profile="${esc(pr.id)}">
      <img src="${characterImg(pr.character)}" alt="">${esc(pr.name)} <small>LV ${pr.level}</small>
    </button>`).join('') + `<button class="chip" id="newProfileBtn">${t('＋ Nuevo')}</button>`;
  $('#deleteProfileBtn').hidden = profiles.length < 2;
  $('#charGrid').innerHTML = heroPicker(state.profile.character);
  $('#langChips').innerHTML = LANGS.map(l => `<button class="chip ${getLang() === l.id ? 'on' : ''}" data-lang="${l.id}">${l.name}</button>`).join('');
  document.querySelectorAll('#idleChips .chip').forEach(c => c.classList.toggle('on', c.dataset.idle === (state.prefs?.idle || 'sway')));

  $('#activityList').innerHTML = G.STATS.flatMap(s =>
    state.activities.filter(a => a.stat === s.id).map(a => `
      <div class="row" style="--c:${s.color}">
        <img class="row-ico" src="${statIcon(s.id)}" alt="">
        <div class="row-main">
 <div class="row-title">${esc(nameOf(a))} ${a.resist ? `<span class="tag">${t('Reto')}</span>` : ''}</div>
          <div class="row-sub">${statName(s)} · <span class="row-xp">+${a.xp} XP</span>${a.bonus ? ` · ★ ${esc(t(a.bonus.label))} +${a.bonus.xp}` : ''}${a.plan ? ` · 📅 ${planLabel(a.plan)}` : ''}</div>
        </div>
        <button class="icon-btn" data-act-edit="${esc(a.id)}" aria-label="${t('Editar')}">✎</button>
        <button class="icon-btn" data-act-del="${esc(a.id)}" aria-label="${t('Borrar')}">🗑</button>
      </div>`)).join('') || `<div class="empty">${t('Sin actividades.')}</div>`;

  $('#backupInfo').textContent = state.lastBackup
    ? t('Último respaldo: {date} ({n} registros en total).', { date: fmtDate(state.lastBackup), n: state.log.length })
    : t('Nunca has exportado un respaldo.');
  $('#backupWarn').hidden = !needsBackup();
  $('#backupWarn').textContent = state.lastBackup
    ? t('⚠️ Tu último respaldo fue hace más de {n} días. Safari puede borrar los datos de apps web: exporta uno nuevo.', { n: BACKUP_REMINDER_DAYS })
    : t('⚠️ Aún no tienes respaldo. Safari puede borrar los datos de apps web: exporta uno de vez en cuando.');
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
  if (key === today) return t('Hoy');
  if (key === yest) return t('Ayer');
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'short' });
}
const fmtTime = ts => new Date(ts).toLocaleTimeString(locale(), { hour: 'numeric', minute: '2-digit' });
const fmtDate = ts => new Date(ts).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' });

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

async function confirmSheet(title, msg, okLabel = t('Sí'), danger = false) {
  const p = openSheet(`
    <h3>${esc(title)}</h3>
    <p>${msg}</p>
    <div class="btn-row">
      <button class="btn" data-close="cancel">${t('Cancelar')}</button>
      <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-close="ok">${esc(okLabel)}</button>
    </div>`);
  return (await p) === 'ok';
}
$('#sheet').addEventListener('click', e => {
  const h = e.target.closest('[data-help]');
  if (h) { closeSheet(); return h.dataset.help === 'tour' ? startTour() : showKaizen(); }
  const b = e.target.closest('[data-close]');
  if (b) closeSheet(b.dataset.close);
});

// ---------------------------------------------------------------------
// Idioma
// ---------------------------------------------------------------------
const mText = m => missionText(m, m.stat ? statName(G.statById(m.stat)) : '');
/** Texto del reto de una recompensa, armado con sus datos (para poder traducirlo). */
function lockLabel(lock, st) {
  if (lock.kind === 'habit') { const a = state.activities.find(x => x.id === lock.act); return t('«{name}» {n} días', { name: a ? nameOf(a) : t('Hábito borrado'), n: st.target }); }
  if (lock.kind === 'boss') return t('Derrota a un jefe');
  if (lock.kind === 'guardian') return t('Guardiana de {stat} en forma {n}', { stat: statName(G.statById(lock.stat)), n: st.target });
  return st.label;
}
// Textos fijos de index.html: se traducen en el lugar y se guarda el original
// para volver al español.
const staticOrig = new WeakMap();
const STATIC_ATTRS = ['placeholder', 'aria-label', 'title'];
function translateStatic() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.parentElement?.closest('#welcomeInner, #sheet, #toasts, script, style')) continue;
    let orig = staticOrig.get(n);
    if (orig === undefined) {
      const k = n.nodeValue.trim();
      if (getLang() === 'es' || !k || t(k) === k) continue;   // nada que traducir
      orig = n.nodeValue; staticOrig.set(n, orig);
    }
    n.nodeValue = getLang() === 'es' ? orig : orig.replace(orig.trim(), t(orig.trim()));
  }
  document.querySelectorAll(STATIC_ATTRS.map(a => `[${a}]`).join(',')).forEach(el => {
    for (const a of STATIC_ATTRS) {
      if (!el.hasAttribute(a)) continue;
      const key = `data-es-${a}`;
      if (!el.hasAttribute(key)) el.setAttribute(key, el.getAttribute(a));
      el.setAttribute(a, t(el.getAttribute(key)));
    }
  });
}
function changeLang(l) {
  if (l === getLang()) return;
  setLang(l);
  translateStatic();
  renderAll();
  renderInstall();
  if (!$('#welcome').hidden) { const y = $('#welcomeInner').scrollTop; renderWelcome(); $('#welcomeInner').scrollTop = y; }
  toast(t('Idioma cambiado'));
}

// ---------------------------------------------------------------------
// Ayuda: guía de cada sección, significado de Kaizen y tour
// ---------------------------------------------------------------------
const currentView = () => document.querySelector('.view.active')?.id.replace('view-', '') || 'home';

function showKaizen() {
  const k = kaizenMeaning();
  openSheet(`
    <div class="kz-kanji" lang="ja">${k.kanji}</div>
    <h3>${k.title}</h3>
    ${k.body.map(p => `<p>${p}</p>`).join('')}
    <button class="btn btn-primary btn-block" data-close="ok">${t('Entendido')}</button>`);
}

function showHelp() {
  const g = guideFor(currentView());
  openSheet(`
    <h3>${t('{title}: qué hace cada cosa', { title: g.title })}</h3>
    <ul class="guide-list">${g.points.map(p => `<li>${p}</li>`).join('')}</ul>
    <div class="btn-row">
      <button class="btn" data-help="kaizen">${t('¿Qué es Kaizen?')}</button>
      <button class="btn btn-primary" data-help="tour">${t('Ver tour')}</button>
    </div>
    <button class="w-skip" data-close="cancel">${t('Cerrar')}</button>`);
}

let tourSteps = [], tourIdx = -1;
const visible = el => el && !el.hidden && el.getClientRects().length > 0;
function startTour() {
  if (!$('#sheetBackdrop').hidden) closeSheet();
  showView('home');
  tourSteps = tourStepsFor().filter(st => visible(document.querySelector(st.sel)));
  tourIdx = 0;
  $('#tour').hidden = false;
  document.body.classList.add('touring');
  renderTour();
}
function endTour() {
  $('#tour').hidden = true;
  document.body.classList.remove('touring');
  tourIdx = -1;
  commit(s => { s.notices = { ...(s.notices || {}), tourSeen: true }; }, { celebrate: false });
}
function renderTour() {
  const st = tourSteps[tourIdx];
  if (!st) return endTour();
  const el = document.querySelector(st.sel);
  el.scrollIntoView({ block: 'center' });
  requestAnimationFrame(() => {
    const r = el.getBoundingClientRect(), pad = 6;
    Object.assign($('#tourSpot').style, { left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` });
    const last = tourIdx === tourSteps.length - 1;
    const b = $('#tourBubble');
    b.innerHTML = `
      <small>${t('{n} de {total}', { n: tourIdx + 1, total: tourSteps.length })}</small>
      <b>${st.title}</b><p>${st.text}</p>
      <div class="btn-row">
        ${last ? '' : `<button class="btn" data-tour="skip">${t('Saltar')}</button>`}
        <button class="btn btn-primary" data-tour="next">${last ? t('Terminar') : t('Siguiente')}</button>
      </div>`;
    const below = r.top + r.height / 2 < innerHeight / 2;
    b.style.top = below ? `${Math.min(r.bottom + 14, innerHeight - 200)}px` : '';
    b.style.bottom = below ? '' : `${Math.min(innerHeight - r.top + 14, innerHeight - 200)}px`;
  });
}
$('#tour').addEventListener('click', e => {
  const b = e.target.closest('[data-tour]');
  if (b?.dataset.tour === 'skip') return endTour();
  tourIdx++; renderTour();   // tocar en cualquier parte avanza
});
$('#helpBtn').onclick = showHelp;
$('#kaizenBtn').onclick = showKaizen;
$('#tourBtn').onclick = startTour;

/** Formulario para crear/editar actividades y misiones. */
async function editorSheet({ title, item, maxXp, allowBonus, allowDelete }) {
  const it = item || { name: '', stat: 'fuerza', xp: 20, bonus: null };
  const xpVal = Math.min(maxXp, Math.max(G.XP_MIN, it.xp));
  const p = openSheet(`
    <h3>${esc(title)}</h3>
    <label class="field"><span>${t('Nombre')}</span>
      <input type="text" id="edName" maxlength="40" value="${esc(nameOf(it))}" placeholder="${t('Ej. Correr 5 km')}" autocomplete="off">
    </label>
    <div class="field"><span>${t('Stat que sube')}</span>
      <div class="chips" id="edStats">${G.STATS.map(s =>
        `<button type="button" class="chip stat-chip ${it.stat === s.id ? 'on' : ''}" data-stat="${s.id}" style="--c:${s.color}"><img src="${statIcon(s.id)}" alt="">${statName(s)}</button>`).join('')}
      </div>
    </div>
    ${allowBonus ? `
    <div class="field"><span>${t('¿Cuánto esfuerzo te pide?')}</span>
      <div class="effort" id="edEffort">${G.EFFORT_LEVELS.map(l => `
        <button type="button" class="effort-btn ${it.xp === l.xp ? 'on' : ''}" data-xp="${l.xp}"><b>${effortName(l).name}</b><small>${effortName(l).hint}</small><em>+${l.xp} XP</em></button>`).join('')}
        ${G.EFFORT_LEVELS.some(l => l.xp === it.xp) ? '' : `<button type="button" class="effort-btn on" data-xp="${it.xp}"><b>${t('Actual')}</b><small>${t('Como estaba')}</small><em>+${it.xp} XP</em></button>`}
      </div>
      <input type="hidden" id="edXp" value="${it.xp}">
    </div>` : `
    <div class="field"><span>XP (${G.XP_MIN}–${maxXp})</span>
      <div class="range-row">
        <input type="range" id="edXp" min="${G.XP_MIN}" max="${maxXp}" step="5" value="${xpVal}">
        <output id="edXpOut">+${xpVal}</output>
      </div>
    </div>`}
    ${allowBonus ? `
    <div class="field"><span>${t('¿Cuándo?')}</span>
      <div class="chips" id="edPlanKind">
        ${[['', t('Cuando pueda')], ['days', t('Días fijos')], ['week', t('Veces por semana')]].map(([k, l]) => `<button type="button" class="chip ${(it.plan?.kind || '') === k ? 'on' : ''}" data-plan="${k}">${l}</button>`).join('')}
      </div>
      <div class="chips weekdays" id="edPlanDays" ${it.plan?.kind === 'days' ? '' : 'hidden'}>
        ${WEEKDAY_ORDER.map(d => `<button type="button" class="chip ${it.plan?.days?.includes(d) ? 'on' : ''}" data-day="${d}">${weekdayShort(d)}</button>`).join('')}
      </div>
      <div class="chips" id="edPlanWeek" ${it.plan?.kind === 'week' ? '' : 'hidden'}>
        ${[1, 2, 3, 4, 5, 6].map(n => `<button type="button" class="chip ${(it.plan?.target || 3) === n && it.plan?.kind === 'week' ? 'on' : ''}" data-target="${n}">${n}×</button>`).join('')}
      </div>
      <small class="plan-hint">${t('Aparecerá en «Para hoy» los días que toca. Un día fuera de agenda nunca cuenta como falta.')}</small>
    </div>
    <div class="field"><span>${t('¿Cómo se registra?')}</span>
      <div class="chips" id="edMeasureKind">
        ${[['', t('Un toque')], ['count', t('Contador')], ['timer', t('Temporizador')]].map(([k, l]) => `<button type="button" class="chip ${(it.measure?.kind || '') === k ? 'on' : ''}" data-measure="${k}">${l}</button>`).join('')}
      </div>
      <div id="edCount" class="rw-lock-opts" ${it.measure?.kind === 'count' ? '' : 'hidden'}>
        <select id="edCountGoal">${[3, 4, 5, 6, 8, 10, 12].map(n => `<option value="${n}" ${(it.measure?.goal || 8) === n ? 'selected' : ''}>${t('Meta: {n}', { n })}</option>`).join('')}</select>
        <input type="text" id="edCountUnit" maxlength="16" placeholder="${t('vasos')}" value="${esc(it.measure?.unit ? t(it.measure.unit) : '')}">
      </div>
      <div class="chips" id="edTimer" ${it.measure?.kind === 'timer' ? '' : 'hidden'} style="margin-top:8px">
        ${G.TIMER_MINUTES.map(n => `<button type="button" class="chip ${(it.measure?.minutes || 25) === n ? 'on' : ''}" data-min="${n}">${t('{n} min', { n })}</button>`).join('')}
      </div>
      <small class="plan-hint">${t('La XP es la misma: se gana una vez al llegar a la meta o al terminar el tiempo.')}</small>
    </div>
    <label class="toggle"><input type="checkbox" id="edBonusOn" ${it.bonus ? 'checked' : ''}> <span>${t('Bono opcional (ej. ruta larga)')}</span></label>
    <div id="edBonus" ${it.bonus ? '' : 'hidden'} class="char-editor">
      <label class="field"><span>${t('Nombre del bono')}</span>
        <input type="text" id="edBonusLabel" maxlength="24" value="${esc(it.bonus?.label || 'Extra')}">
      </label>
      <div class="field"><span>${t('XP extra ({min}–{max})', { min: G.XP_MIN, max: G.XP_MAX })}</span>
        <div class="range-row">
          <input type="range" id="edBonusXp" min="${G.XP_MIN}" max="${G.XP_MAX}" step="5" value="${it.bonus?.xp || 15}">
          <output id="edBonusOut">+${it.bonus?.xp || 15}</output>
        </div>
      </div>
    </div>` : ''}
    ${allowBonus ? `
    <label class="field"><span>${t('¿Es un reto de resistencia? (una vez al día, ×3 a su jefe)')}</span>
      <select id="edResist">
        <option value="">${t('No, actividad normal')}</option>
        ${G.activeBosses().map(b => `<option value="${b.id}" ${it.resist === b.id ? 'selected' : ''}>${t('Sí, contra {boss}', { boss: esc(bossShort(b)) })}</option>`).join('')}
      </select>
    </label>` : ''}
    <div class="btn-row">
      <button class="btn" data-close="cancel">${t('Cancelar')}</button>
      <button class="btn btn-primary" id="edSave">${t('Guardar')}</button>
    </div>
    ${allowDelete ? `<button class="btn btn-danger btn-block" data-close="delete">${t('Borrar')}</button>` : ''}
  `);

  let stat = it.stat;
  $('#edStats').onclick = e => {
    const c = e.target.closest('[data-stat]'); if (!c) return;
    stat = c.dataset.stat;
    document.querySelectorAll('#edStats .chip').forEach(x => x.classList.toggle('on', x === c));
  };
  let plan = G.normalizePlan(it.plan);
  let mKind = it.measure?.kind || '', minutes = it.measure?.minutes || 25;
  if (allowBonus) {
    $('#edMeasureKind').onclick = e => {
      const b = e.target.closest('[data-measure]'); if (!b) return;
      mKind = b.dataset.measure;
      document.querySelectorAll('#edMeasureKind .chip').forEach(x => x.classList.toggle('on', x === b));
      $('#edCount').hidden = mKind !== 'count'; $('#edTimer').hidden = mKind !== 'timer';
    };
    $('#edTimer').onclick = e => {
      const b = e.target.closest('[data-min]'); if (!b) return;
      minutes = +b.dataset.min;
      document.querySelectorAll('#edTimer .chip').forEach(x => x.classList.toggle('on', x === b));
    };
    $('#edPlanKind').onclick = e => {
      const b = e.target.closest('[data-plan]'); if (!b) return;
      const k = b.dataset.plan;
      plan = k === 'days' ? { kind: 'days', days: plan?.kind === 'days' ? plan.days : [new Date().getDay()] } : k === 'week' ? { kind: 'week', target: plan?.target || 3 } : null;
      document.querySelectorAll('#edPlanKind .chip').forEach(x => x.classList.toggle('on', x === b));
      $('#edPlanDays').hidden = k !== 'days'; $('#edPlanWeek').hidden = k !== 'week';
      document.querySelectorAll('#edPlanDays .chip').forEach(x => x.classList.toggle('on', plan?.kind === 'days' && plan.days.includes(+x.dataset.day)));
      document.querySelectorAll('#edPlanWeek .chip').forEach(x => x.classList.toggle('on', plan?.kind === 'week' && plan.target === +x.dataset.target));
    };
    $('#edPlanDays').onclick = e => {
      const b = e.target.closest('[data-day]'); if (!b) return;
      const d = +b.dataset.day;
      const days = plan.days.includes(d) ? plan.days.filter(x => x !== d) : [...plan.days, d];
      if (!days.length) return;   // al menos un día
      plan = { kind: 'days', days };
      b.classList.toggle('on', days.includes(d));
    };
    $('#edPlanWeek').onclick = e => {
      const b = e.target.closest('[data-target]'); if (!b) return;
      plan = { kind: 'week', target: +b.dataset.target };
      document.querySelectorAll('#edPlanWeek .chip').forEach(x => x.classList.toggle('on', x === b));
    };
  }
  if (allowBonus) $('#edEffort').onclick = e => {
    const b = e.target.closest('[data-xp]'); if (!b) return;
    $('#edXp').value = b.dataset.xp;
    document.querySelectorAll('#edEffort .effort-btn').forEach(x => x.classList.toggle('on', x === b));
  };
  else $('#edXp').oninput = e => { $('#edXpOut').textContent = `+${e.target.value}`; };
  if (allowBonus) {
    $('#edBonusOn').onchange = e => { $('#edBonus').hidden = !e.target.checked; };
    $('#edBonusXp').oninput = e => { $('#edBonusOut').textContent = `+${e.target.value}`; };
  }
  $('#edSave').onclick = () => {
    const name = $('#edName').value.trim();
    if (!name) { $('#edName').focus(); $('#edName').placeholder = t('¡Ponle un nombre!'); return; }
    // Si el nombre traducido no cambió, se guarda el original (así se sigue traduciendo).
    const out = { name: item && name === nameOf(item) ? item.name : name, stat, xp: G.clampXp($('#edXp').value, maxXp) };
    if (allowBonus) {
      out.bonus = $('#edBonusOn').checked
        ? { label: $('#edBonusLabel').value.trim() || 'Extra', xp: G.clampXp($('#edBonusXp').value) }
        : null;
      out.resist = $('#edResist').value || null;
      out.plan = G.normalizePlan(plan);
      const unitIn = $('#edCountUnit').value.trim();
      // Si la unidad traducida no cambió, se guarda la original («vasos»).
      const unit = it.measure?.unit && unitIn === t(it.measure.unit) ? it.measure.unit : unitIn;
      out.measure = mKind === 'count' ? G.normalizeMeasure({ kind: 'count', goal: +$('#edCountGoal').value, unit })
        : mKind === 'timer' ? G.normalizeMeasure({ kind: 'timer', minutes }) : null;
    }
    closeSheet(out);
  };
  return p;
}

// ---------------------------------------------------------------------
// Acciones
// ---------------------------------------------------------------------
function doLog(activityId, bonus, origin, run = s => G.logActivity(s, activityId, { bonus })) {
  const planAct = state.activities.find(x => x.id === activityId);
  const planBefore = G.planStatus(state, planAct);
  let entry;
  try { entry = commit(run); }
  catch (err) { toast(`✋ ${esc(t(err.message))}`); return; }
  if (!entry) return;
  const today = G.dayKey(Date.now());
  const firstToday = state.log.filter(e => G.isBase(e) && G.dayKey(e.ts) === today).length === 1;
  if (origin) {
    const r = origin.getBoundingClientRect();
    floatXp(r.left + r.width / 2, r.top, entry.xp);
    burst(r.left + r.width / 2, r.top + r.height / 2, G.statById(entry.stat).color);
    origin.classList.remove('flash'); void origin.offsetWidth; origin.classList.add('flash');
  }
  heroReact();
  // Qué avanzó en el RPG: la guardiana de esa stat (con su Afinidad) y el jefe.
  const boss = G.bossStatus(state);
  const dmg = boss.claimed ? 0 : G.bossDamageFor(entry, boss);
  const gName = GUARDIANS[entry.stat]?.name || statName(G.statById(entry.stat));
  const rpg = `${gName} +${entry.xp}${entry.guardXp ? ` <small>${t('(Afinidad +{n})', { n: entry.guardXp })}</small>` : ''}${dmg ? ` · ${t('{boss} −{n} PV', { boss: esc(bossShort(boss)), n: dmg })}` : ''}`;
  const news = [rpg, ...lastNews];
  const planAfter = G.planStatus(state, planAct);
  if (planBefore && !planBefore.met && planAfter?.met) news.unshift(t('🎯 Meta de la semana cumplida: {name} {n}/{n}', { name: esc(nameOf(planAct)), n: planAfter.target }));
  else if (planAfter && !planAfter.met && planAfter.done > (planBefore?.done || 0)) news.unshift(t('📅 {name}: {n} de {total} esta semana', { name: esc(nameOf(planAct)), n: planAfter.done, total: planAfter.target }));
  // La primera vez del día en esa stat, su guardiana dice algo de su propósito.
  const firstOfStat = state.log.filter(e => e.type === 'activity' && e.stat === entry.stat && G.dayKey(e.ts) === today).length === 1;
  if (firstOfStat && !lastNews.length && GUARDIAN_LINES[entry.stat]) news.push(`<i>${esc(gName)}: «${esc(lineOfDay(guardianLines(entry.stat), entry.stat, today))}»</i>`);
  const coins = G.coinsFor(entry) + (firstToday ? G.chestFor(today) : 0);
  showResult(`<b>${esc(nameOf(entry))}</b> · +${entry.xp} XP · +${coins} 🪙`, news,
    () => { commit(s => G.undoEntry(s, entry.id), { celebrate: false }); toast(t('Registro deshecho')); });
}

async function onActivityTap(btn) {
  const a = state.activities.find(x => x.id === btn.dataset.act);
  if (!a) return;
  const m = G.normalizeMeasure(a.measure);
  if (m?.kind === 'count') return tapCounterFlow(a, m, btn);
  if (m?.kind === 'timer') return openTimer(a, m);
  if (!a.bonus) return doLog(a.id, false, btn);
  const choice = await openSheet(`
    <h3>${esc(nameOf(a))}</h3>
    <div class="sheet-choice">
      <button class="btn" data-close="normal"><span>${t('Normal')}</span><span>+${a.xp} XP</span></button>
      <button class="btn btn-yellow" data-close="bonus"><span>★ ${esc(t(a.bonus.label))}</span><span>+${a.xp + a.bonus.xp} XP</span></button>
    </div>
    <button class="btn btn-block" data-close="cancel">${t('Cancelar')}</button>`);
  if (choice === 'normal' || choice === 'bonus') doLog(a.id, choice === 'bonus', btn);
}

async function editActivity(id) {
  const a = id ? state.activities.find(x => x.id === id) : null;
  // Las actividades nuevas van de 5 a 50 XP. Si una predeterminada vale más
  // (p. ej. "Terminar libro" = 100), al editarla se respeta su valor como tope.
  const maxXp = Math.max(G.XP_MAX, a?.xp || 0);
  const res = await editorSheet({
    title: a ? t('Editar actividad') : t('Nueva actividad'),
    item: a, maxXp, allowBonus: true, allowDelete: !!a,
  });
  if (!res || res === 'cancel') return;
  if (res === 'delete') return deleteActivity(a.id);
  commit(s => {
    if (a) Object.assign(s.activities.find(x => x.id === a.id), res);
    else { const id = G.uid(); s.activities.push({ id, ...res }); G.pinIfRoom(s, id); }
  }, { celebrate: false });
  toast(a ? t('Actividad actualizada') : t('Actividad creada'));
}

async function deleteActivity(id) {
  const a = state.activities.find(x => x.id === id);
  if (!a) return;
  const ok = await confirmSheet(t('¿Borrar actividad?'), t('“{name}” desaparecerá de la lista. Tu historial y XP se conservan.', { name: esc(nameOf(a)) }), t('Borrar'), true);
  if (!ok) return;
  commit(s => { s.activities = s.activities.filter(x => x.id !== id); }, { celebrate: false });
  toast(t('Actividad borrada'));
}

async function editQuest(id) {
  const q = id ? state.quests.find(x => x.id === id) : null;
  const res = await editorSheet({
    title: q ? t('Editar misión') : t('Nueva misión única'),
    item: q || { name: '', stat: 'hogar', xp: 50 },
    maxXp: G.QUEST_XP_MAX, allowBonus: false, allowDelete: !!q,
  });
  if (!res || res === 'cancel') return;
  if (res === 'delete') {
    if (await confirmSheet(t('¿Borrar misión?'), t('“{name}” se eliminará sin dar XP.', { name: esc(q.name) }), t('Borrar'), true)) {
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
    () => { commit(s => G.undoEntry(s, entry.id), { celebrate: false }); toast(t('Misión devuelta a pendientes')); });
}

function claimReward(fn, btn, label) {
  let entry;
  try { entry = commit(fn); } catch (err) { toast(`❌ ${esc(t(err.message))}`); return; }
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
    <p><b>${stageName(pet.stage)}</b> · ${tn(pet.activeDays, '{n} día activo', '{n} días activos')} · ${esc(PET_MOOD[pet.mood](name))}</p>
    <div class="hpbar pet" style="height:12px"><i style="width:${Math.round(pet.pct * 100)}%"></i></div>
    <p>${pet.next ? t('Evoluciona a <b>{stage}</b> en {days} más. Crece cada día que registras algo y nunca retrocede.', { stage: stageName(pet.stage + 1), days: tn(pet.daysToNext, '{n} día activo', '{n} días activos') }) : t('¡Alcanzó su forma final!')}</p>
    <div class="pet-stages">${G.PET_STAGES.map((st, i) => `
      <div class="${i > pet.stage ? 'locked' : i === pet.stage ? 'current' : ''}"><img src="${petImg(i)}" alt="">${i > pet.stage ? tn(st.min, '{n} día', '{n} días') : stageName(i)}</div>`).join('')}
    </div>
    <div class="field"><span>${t('Huevo')}</span>
      <p class="small" style="margin:0">${pet.stage === 0
        ? t('Elige qué huevo empollar. Puedes cambiarlo mientras no haya eclosionado.')
        : t('Ya eclosionó: es de la especie {name}.', { name: esc(speciesName(speciesById(state.pet.species))) })}</p>
      <div class="egg-grid" id="eggGrid">${eggCards(pet.stage)}</div>
    </div>
    <label class="field"><span>${t('Nombre de tu compañero')}</span><input type="text" id="petName" maxlength="${G.PET_NAME_MAX}" value="${esc(G.petCustomName(state))}" placeholder="${esc(speciesName(speciesById(state.pet.species)))}" autocomplete="off"></label>
    <button class="btn btn-primary btn-block" data-close="ok">${t('Listo')}</button>`);
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
      <b>${esc(speciesName(sp))}</b><small>${sp.ready ? elementName(sp) : t('Pronto')}</small>
    </button>`;
  }).join('');
}

// ---------------------------------------------------------------------
// Compartir (tarjetas ilustradas) y tienda
// ---------------------------------------------------------------------
async function share(card, text) {
  toast(t('Preparando tarjeta…'), { duration: 1500 });
  try {
    const p = G.deriveProfile(state);
    // Solo datos generales: nivel y racha (sin nombres ni actividades).
    const blob = await makeCard({ footer: t('Nivel {lv} · Racha {n}', { lv: p.level, n: p.streak.current }), accent: p.rank.color, art: characterImg(state.profile.character), ...card });
    const result = await shareCard(blob, { text });
    if (result === 'downloaded') toast(t('Tarjeta guardada como imagen'));
  } catch (err) {
    toast(t('❌ No se pudo crear la tarjeta'));
    console.error(err);
  }
}
function shareProgress() {
  const p = G.deriveProfile(state);
  return share({ kicker: t('Rango {letter} · {title}', { letter: p.rank.letter, title: t(p.rank.title) }), title: t('¡Nivel {lv}!', { lv: p.level }), sub: t('{xp} XP · racha de {days} · {ach} logros', { xp: p.totalXp, days: tn(p.streak.current, '{n} día', '{n} días'), ach: G.unlockedAchievements(state, p).length }) },
    t('¡Voy en nivel {lv} en Kaizen!', { lv: p.level }));
}
function shareBoss() {
  const b = G.bossStatus(state);
  return share({ kicker: t('Jefe derrotado'), title: t('¡Vencí a {boss}!', { boss: bossShort(b) }), sub: bossName(b), art: art.boss(b.id), accent: '#ff3b4e', dimArt: true },
    t('¡Derroté a {boss} en Kaizen!', { boss: bossName(b) }));
}
function shareCoupon(id) {
  const c = state.purchases.find(x => x.id === id);
  if (!c) return;
  return share({ kicker: t('Cupón ganado con esfuerzo'), title: nameOf({ id: c.itemId, name: c.name }), sub: t('Vale por una recompensa. ¡Me lo gané!'), art: petImg(G.petStatus(state).stage), accent: '#ffd23f' },
    t('Me gané este cupón: {name}', { name: nameOf({ id: c.itemId, name: c.name }) }));
}

function tryPay(fn, okMsg) {
  try { commit(fn, { celebrate: false }); toast(okMsg, { kind: 'ach' }); return true; }
  catch (err) { toast(`✋ ${esc(t(err.message))}`); return false; }
}

async function buyRewardFlow(id) {
  const r = state.rewards.find(x => x.id === id);
  if (!r) return;
  if (!(await confirmSheet(t('¿Canjear recompensa?'), t('<b>{name}</b> por <b>{n} monedas</b>. Recibirás un cupón para usar cuando quieras.', { name: esc(nameOf(r)), n: r.cost }), t('Canjear')))) return;
  if (tryPay(s => G.buyReward(s, id), t('🎟️ ¡Cupón conseguido: {name}!', { name: esc(nameOf(r)) }))) heroReact();
}

/** Ideas de recompensas por tipo, para agregar a la Tienda. */
async function openRewardIdeas() {
  const have = new Set(state.rewards.map(r => r.id));
  let pick = [];
  const list = () => G.REWARD_TYPES.map(ty => {
    const opts = G.REWARD_TEMPLATES.filter(r => r.type === ty.id && !have.has(r.id));
    return opts.length ? `<div class="w-group"><div class="w-group-title">${esc(t(ty.name))}</div><div class="w-habits">${opts.map(r =>
      `<button class="w-habit w-reward ${pick.includes(r.id) ? 'on' : ''}" data-reward="${r.id}">${esc(nameOf(r))} <small>${r.cost} 🪙</small></button>`).join('')}</div></div>` : '';
  }).join('') || `<p>${t('Ya tienes todas las ideas. Crea una propia.')}</p>`;
  const p = openSheet(`
    <h3>${t('Ideas de recompensas')}</h3>
    <p class="small">${t('Los premios gratis cuestan menos: así premiarte no deshace tus metas.')}</p>
    <div id="riList">${list()}</div>
    <div class="btn-row"><button class="btn" data-close="cancel">${t('Cancelar')}</button><button class="btn btn-primary" id="riAdd">${t('Agregar')}</button></div>`);
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
  toast(tn(n, 'Recompensa agregada', '{n} recompensas agregadas'));
}

async function editReward(id) {
  const r = id ? state.rewards.find(x => x.id === id) : null;
  const cost = r?.cost || 150;
  let type = r?.type || (cost <= 100 ? 'gratis' : cost <= 250 ? 'gusto' : cost <= 600 ? 'experiencia' : 'inversion');
  const lk = r?.lock || null;
  const acts = state.activities.filter(a => !a.resist);
  const p = openSheet(`
    <h3>${r ? t('Editar recompensa') : t('Nueva recompensa')}</h3>
    <label class="field"><span>${t('¿Qué te vas a regalar?')}</span>
      <input type="text" id="rwName" maxlength="40" value="${esc(r ? nameOf(r) : '')}" placeholder="${t('Ej. Salir por un helado')}" autocomplete="off"></label>
    <div class="field"><span>${t('Tipo')}</span>
      <div class="chips" id="rwType">${G.REWARD_TYPES.map(ty => `<button type="button" class="chip ${ty.id === type ? 'on' : ''}" data-type="${ty.id}">${esc(t(ty.name))}</button>`).join('')}</div>
    </div>
    <div class="field"><span>${t('Precio en monedas')}</span>
      <div class="range-row"><input type="range" id="rwCost" min="20" max="1000" step="10" value="${cost}"><output id="rwOut">${cost}</output></div>
      <span class="rw-guide" id="rwGuide"></span>
    </div>
    <div class="field"><span>${t('Reto para desbloquearla (opcional)')}</span>
      <select id="rwLock">
        <option value="">${t('Sin reto: solo el precio')}</option>
        ${G.REWARD_LOCKS.map(l => `<option value="${l.id}" ${lk?.kind === l.id ? 'selected' : ''}>${esc(lockName(l))}</option>`).join('')}
      </select>
      <div id="rwLockHabit" class="rw-lock-opts" ${lk?.kind === 'habit' ? '' : 'hidden'}>
        <select id="rwLockAct">${acts.map(a => `<option value="${esc(a.id)}" ${lk?.act === a.id ? 'selected' : ''}>${esc(nameOf(a))}</option>`).join('')}</select>
        <select id="rwLockN">${[3, 5, 7, 10, 14].map(n => `<option value="${n}" ${(lk?.n || 5) === n ? 'selected' : ''}>${tn(n, '{n} día', '{n} días')}</option>`).join('')}</select>
      </div>
      <div id="rwLockGuard" class="rw-lock-opts" ${lk?.kind === 'guardian' ? '' : 'hidden'}>
        <select id="rwLockStat">${G.STATS.map(s => `<option value="${s.id}" ${lk?.stat === s.id ? 'selected' : ''}>${esc(GUARDIANS[s.id]?.name || statName(s))} (${esc(statName(s))})</option>`).join('')}</select>
        <select id="rwLockTier">${[2, 3, 4, 5].map(k => `<option value="${k}" ${(lk?.tier || 2) === k ? 'selected' : ''}>${t('Forma {n}', { n: k })}</option>`).join('')}</select>
      </div>
      <span class="rw-guide">${t('Un reto hace que el premio se sienta ganado. Cada canje pide cumplirlo otra vez (salvo el de guardiana).')}</span>
    </div>
    <div class="btn-row"><button class="btn" data-close="cancel">${t('Cancelar')}</button><button class="btn btn-primary" id="rwSave">${t('Guardar')}</button></div>
    ${r ? `<button class="btn btn-danger btn-block" data-close="delete">${t('Borrar')}</button>` : ''}`);
  const guide = () => {
    const h = G.rewardPriceHint(type, Number($('#rwCost').value));
    $('#rwGuide').innerHTML = h ? t('Precio guía para este tipo: <b>{min}–{max}</b> monedas (un día normal da unas 25–35).', { min: h.min, max: h.max }) + (h.low ? `<br><b class="warn">${t('Muy barata: una recompensa así deja de sentirse ganada.')}</b>` : '') : '';
  };
  guide();
  $('#rwCost').oninput = e => { $('#rwOut').textContent = e.target.value; guide(); };
  $('#rwType').onclick = e => {
    const c = e.target.closest('[data-type]'); if (!c) return;
    type = c.dataset.type;
    document.querySelectorAll('#rwType .chip').forEach(x => x.classList.toggle('on', x === c));
    guide();
  };
  $('#rwLock').onchange = e => { $('#rwLockHabit').hidden = e.target.value !== 'habit'; $('#rwLockGuard').hidden = e.target.value !== 'guardian'; };
  $('#rwSave').onclick = () => {
    const name = $('#rwName').value.trim();
    if (!name) { $('#rwName').focus(); return; }
    const kind = $('#rwLock').value;
    const same = lk && lk.kind === kind;
    const lock = !kind ? null
      : kind === 'habit' ? { kind, act: $('#rwLockAct').value, n: Number($('#rwLockN').value), since: same && lk.act === $('#rwLockAct').value ? lk.since : Date.now() }
      : kind === 'guardian' ? { kind, stat: $('#rwLockStat').value, tier: Number($('#rwLockTier').value) }
      : { kind, since: same ? lk.since : Date.now() };
    closeSheet({ name: r && name === nameOf(r) ? r.name : name, type, lock, cost: Math.min(1000, Math.max(20, Number($('#rwCost').value) || 100)) });
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
  if (!(await confirmSheet(t('¿Comprar?'), t('<b>{name}</b> por <b>{n} monedas</b>.', { name: esc(titleName(item)), n: item.cost }), t('Comprar')))) return;
  if (tryPay(s => { G.buyCosmetic(s, itemId); G.equip(s, slot, itemId); }, t('✨ ¡{name} es tuyo!', { name: esc(titleName(item)) }))) heroReact();
}

/** Usa escudos si hace falta (al abrir la app o volver a ella). */
function checkShields() {
  const saved = G.applyShields(state);
  if (saved.length) {
    save();
    setTimeout(() => toast(`🛡️ ${tn(saved.length, 'Un escudo salvó tu racha', '{n} escudos salvaron tu racha')}`, { kind: 'ach', duration: 5000 }), 600);
  }
}

// ---------------------------------------------------------------------
// Perfiles y personajes
// ---------------------------------------------------------------------
/**
 * Selector de héroe: primero «¿Cómo quieres que se vea?» (Hombre / Mujer, con
 * el mismo peso visual) y luego los seis héroes en ese look. En Ajustes el
 * look se cambia con un selector arriba de la lista. Elegir héroe o look solo
 * cambia el avatar: la XP es la misma con cualquiera.
 */
function heroPicker(selected, { askLook = false, compact = false, chosen = true } = {}) {
  const cur = characterById(selected);
  if (askLook) {
    const card = (lk, label) => `
      <button class="look-pick" data-look="${lk}">
        <span class="look-mosaic">${['relampago', 'titan', 'implacable'].map(h => `<img src="${characterImg(`${h}-${lk}`)}" alt="">`).join('')}</span>
        <b>${t(label)}</b>
      </button>`;
    return `
      <div class="hp-head"><b>${t('¿Cómo quieres que se vea tu héroe?')}</b></div>
      <p class="hp-hint">${t('Los seis héroes existen en las dos versiones. Puedes cambiarlo cuando quieras.')}</p>
      <div class="look-picks">${card('m', 'Hombre')}${card('f', 'Mujer')}</div>`;
  }
  const lk = cur.look;
  const cards = CHARACTERS.map(c => {
    const key = `${c.id}-${lk}`, on = chosen && c.id === cur.hero;
    return `
      <button class="char-card ${on ? 'on' : ''}" data-char="${key}" style="--c:${c.accent}" aria-label="${esc(heroName(c, lk))}: ${esc(heroTitle(c))}">
        ${on ? '<span class="char-check">✓</span>' : ''}
        <img class="char-fig" src="${characterImg(key)}" alt="">
        <b>${esc(heroName(c, lk))}</b><em>${esc(heroTitle(c))}</em>${compact ? '' : `<small>${esc(heroBlurb(c))}</small>`}
      </button>`;
  }).join('');
  return `
    <div class="hp-head"><b>${t('Elige tu héroe')}</b>
      <span class="hp-looks" role="group" aria-label="Look">
        <button class="${lk === 'm' ? 'on' : ''}" data-look="m">${t('Hombre')}</button><button class="${lk === 'f' ? 'on' : ''}" data-look="f">${t('Mujer')}</button>
      </span></div>
    <p class="hp-hint">${t('Elige un héroe que te represente o que encarne algo que quieres cultivar.')}</p>
    <div class="char-grid ${compact ? 'w-chars' : ''}">${cards}</div>
    <p class="hp-note">${t('Todas las actividades dan la misma XP con cualquier héroe, y puedes cambiarlo cuando quieras sin perder progreso.')}</p>`;
}
const withLook = (id, lk) => `${charHero(id)}-${lk}`;

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
  if (!silent && state.onboarded) toast(t('Hola, {name} 👋', { name: esc(state.profile.name) }));
}

async function newProfileFlow() {
  const ok = await confirmSheet(t('¿Crear otro perfil?'), t('Cada perfil tiene su propio progreso, personaje y hábitos en este teléfono. Podrás volver a este cuando quieras desde Ajustes.'), t('Crear perfil'));
  if (!ok) return;
  save(); // guarda el perfil actual antes de cambiar
  const { id } = Profiles.createProfile({ name: 'Héroe', character: DEFAULT_CHARACTER });
  useProfile(id, { silent: true });   // la bienvenida se abre sola
}

// ---------------------------------------------------------------------
// Bienvenida: 3 pasos para empezar (nombre y personaje → hábitos → listo)
// ---------------------------------------------------------------------
const welcomeDraft = { step: 1, name: '', character: DEFAULT_CHARACTER, lookChosen: false, heroChosen: false, habits: [], rewards: [] };
const W_STEPS = 4;
const habitChips = (ids, selected) => ids.map(t => {
  const st = G.statById(t.stat);
  return `<button class="w-habit ${selected.includes(t.id) ? 'on' : ''}" data-habit="${t.id}" style="--c:${st.color}">${esc(nameOf(t))}</button>`;
}).join('');
const areaGroups = (selected, filter = () => true) => G.HABIT_AREAS.map(ar => {
  const opts = G.HABIT_TEMPLATES.filter(t => t.area === ar.id && filter(t));
  return opts.length ? `<div class="w-group"><div class="w-group-title ${ar.id === 'basico' ? 'basic' : ''}">${esc(t(ar.name))}</div>
    ${ar.hint ? `<p class="w-hint">${esc(t(ar.hint))}</p>` : ''}<div class="w-habits">${habitChips(opts, selected)}</div></div>` : '';
}).join('');

function maybeWelcome() {
  if (state.onboarded) { $('#welcome').hidden = true; return; }
  Object.assign(welcomeDraft, { step: 1, name: state.profile.name === 'Héroe' ? '' : state.profile.name, character: state.profile.character, lookChosen: false, heroChosen: false, habits: [], rewards: [] });
  $('#welcome').hidden = false;
  renderWelcome();
}

function renderWelcome() {
  const d = welcomeDraft;
  const dots = Array.from({ length: W_STEPS }, (_, k) => k + 1).map(i => `<i class="${i === d.step ? 'on' : i < d.step ? 'done' : ''}"></i>`).join('');
  let body = '';
  if (d.step === 1) {
    body = `
      <div class="w-brand">KAI<span>ZEN</span></div>
      <div class="w-lang" role="group" aria-label="Idioma / Language">${LANGS.map(l => `<button class="${getLang() === l.id ? 'on' : ''}" data-lang="${l.id}">${l.name}</button>`).join('')}</div>
      <button class="w-kaizen" data-kaizen><span lang="ja">${kaizenMeaning().kanji}</span> ${kaizenMeaning().short} <u>${t('¿Qué significa?')}</u></button>
      <h2>${t('Tu vida es la aventura')}</h2>
      <p>${t('Cada cosa buena que haces en la vida real le da experiencia a tu héroe. Empecemos por conocerte.')}</p>
      <label class="field"><span>${t('¿Cómo se llama tu héroe?')}</span>
        <input type="text" id="wName" maxlength="16" placeholder="${t('Héroe')}" value="${esc(d.name)}" autocomplete="off"></label>
      <div class="field hero-picker" id="wChars">${heroPicker(d.character, { askLook: !d.lookChosen, compact: true, chosen: d.heroChosen })}</div>
      <button class="btn btn-primary btn-block ${d.heroChosen ? '' : 'pending'}" data-w="next">${t('Siguiente')}</button>`;
  } else if (d.step === 2) {
    body = `
      <h2>${t('¿Qué quieres hacer más seguido?')}</h2>
      <p>${t('Empieza por lo básico (dormir, agua, comer): son retos de todos los días. Luego elige lo que quieres construir. De {min} a {max} en total.', { min: G.ONBOARD_MIN, max: G.ONBOARD_MAX })}</p>
      ${areaGroups(d.habits)}
      <div class="w-foot">
        <span class="w-count">${tn(d.habits.length, '{n} elegido', '{n} elegidos')}</span>
        <div class="btn-row">
          <button class="btn" data-w="back">${t('Atrás')}</button>
          <button class="btn btn-primary" data-w="next" ${d.habits.length < G.ONBOARD_MIN ? 'disabled' : ''}>${t('Siguiente')}</button>
        </div>
        <button class="w-skip" data-w="skip">${t('Saltar y usar los hábitos sugeridos')}</button>
      </div>`;
  } else if (d.step === 3) {
    const groups = G.REWARD_TYPES.map(ty => `
      <div class="w-group"><div class="w-group-title">${esc(t(ty.name))}</div>
        <div class="w-habits">${G.REWARD_TEMPLATES.filter(r => r.type === ty.id).map(r => `
          <button class="w-habit w-reward ${d.rewards.includes(r.id) ? 'on' : ''}" data-reward="${r.id}">${esc(nameOf(r))} <small>${r.cost} 🪙</small></button>`).join('')}</div>
      </div>`).join('');
    body = `
      <h2>${t('¿Con qué te vas a premiar?')}</h2>
      <p>${t('Con lo que hagas ganas monedas para canjear premios reales. Los gratis son los más baratos: un premio no debería deshacer tu meta. Opcional, hasta {n}.', { n: G.REWARD_PICK_MAX })}</p>
      ${groups}
      <div class="w-foot">
        <span class="w-count">${d.rewards.length ? t('{n} de {max}', { n: d.rewards.length, max: G.REWARD_PICK_MAX }) : t('Si no eliges, te dejamos algunas para empezar')}</span>
        <div class="btn-row"><button class="btn" data-w="back">${t('Atrás')}</button><button class="btn btn-primary" data-w="next">${t('Siguiente')}</button></div>
      </div>`;
  } else {
    const first = G.HABIT_TEMPLATES.find(t => t.id === d.habits[0]);
    body = `
      <div class="w-hero"><img src="${characterImg(d.character)}" alt=""></div>
      <h2>${t('¡Listo, {name}!', { name: esc(d.name || t('Héroe')) })}</h2>
      <ul class="w-rules">
        <li>${t('<b>Registra</b> lo que hiciste con un toque. Si te equivocas, toca <b>Deshacer</b>.')}</li>
        <li>${t('<b>Lo básico</b> se marca una vez al día desde Inicio.')}</li>
        <li>${t('Cada día que registras algo, tu <b>huevo</b> se calienta. En 2 días nace tu mascota.')}</li>
        <li>${t('Lo demás (jefes, guardianas, tienda) lo irás descubriendo. Toca <b>?</b> arriba cuando tengas dudas.')}</li>
      </ul>
      <button class="btn btn-primary btn-block" data-w="finish">${first ? t('Empezar: registrar «{name}»', { name: esc(nameOf(first)) }) : t('Empezar')}</button>
      <button class="btn btn-block" data-w="finish-tour">${t('Entrar y ver un tour rápido')}</button>
      <button class="w-skip" data-w="finish-only">${t('Entrar sin registrar todavía')}</button>`;
  }
  $('#welcomeInner').innerHTML = `<div class="w-dots">${dots}</div>${body}`;
  $('#welcomeInner').scrollTop = 0;
}

function finishWelcome({ habits = welcomeDraft.habits, logFirst = false, quiet = false } = {}) {
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
  else if (!quiet) toast(t('¡Bienvenido, {name}! Registra algo cuando lo hagas. Si tienes dudas, toca <b>?</b> arriba.', { name: esc(state.profile.name) }));
}

$('#welcome').addEventListener('input', e => { if (e.target.id === 'wName') welcomeDraft.name = e.target.value; });
$('#welcome').addEventListener('click', e => {
  const d = welcomeDraft;
  if (e.target.closest('[data-kaizen]')) return showKaizen();
  const lg = e.target.closest('[data-lang]');
  if (lg) { changeLang(lg.dataset.lang); return; }
  const hp = e.target.closest('#wChars [data-look], #wChars [data-char]');
  if (hp) {
    if (hp.dataset.look) { d.character = withLook(d.character, hp.dataset.look); d.lookChosen = true; }
    else { d.character = hp.dataset.char; d.heroChosen = true; }
    $('#wChars').innerHTML = heroPicker(d.character, { compact: true, chosen: d.heroChosen });
    $('#welcomeInner [data-w="next"]').classList.toggle('pending', !d.heroChosen);
    return;
  }
  const rw = e.target.closest('[data-reward]');
  if (rw) {
    const id = rw.dataset.reward;
    if (d.rewards.includes(id)) d.rewards = d.rewards.filter(x => x !== id);
    else if (d.rewards.length < G.REWARD_PICK_MAX) d.rewards.push(id);
    else return toast(t('Hasta {n}. Después puedes agregar más en la Tienda.', { n: G.REWARD_PICK_MAX }));
    const y = $('#welcomeInner').scrollTop; renderWelcome(); $('#welcomeInner').scrollTop = y;
    return;
  }
  const h = e.target.closest('[data-habit]');
  if (h) {
    const id = h.dataset.habit;
    if (d.habits.includes(id)) d.habits = d.habits.filter(x => x !== id);
    else if (d.habits.length < G.ONBOARD_MAX) d.habits.push(id);
    else return toast(t('Puedes elegir hasta {n}. Después podrás agregar más.', { n: G.ONBOARD_MAX }));
    const y = $('#welcomeInner').scrollTop; renderWelcome(); $('#welcomeInner').scrollTop = y;
    return;
  }
  const a = e.target.closest('[data-w]'); if (!a || a.disabled) return;
  const act = a.dataset.w;
  if (act === 'next') {
    // Paso 1: no se avanza sin elegir cómo se ve y qué héroe es.
    if (d.step === 1 && (!d.lookChosen || !d.heroChosen)) {
      const box = $('#wChars');
      box.classList.remove('need'); void box.offsetWidth; box.classList.add('need');
      box.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return toast(!d.lookChosen ? t('Primero elige cómo quieres que se vea tu héroe: Hombre o Mujer.') : t('Elige tu héroe tocando una de las tarjetas.'));
    }
    d.step = Math.min(W_STEPS, d.step + 1); renderWelcome();
  }
  if (act === 'back') { d.step = Math.max(1, d.step - 1); renderWelcome(); }
  if (act === 'skip') finishWelcome({ habits: [] });
  if (act === 'finish') finishWelcome({ logFirst: true });
  if (act === 'finish-only') finishWelcome();
  if (act === 'finish-tour') { finishWelcome({ quiet: true }); setTimeout(startTour, 400); }
});

/** Ajustes: agregar más hábitos de la lista. */
async function openHabitPicker() {
  const have = new Set(state.activities.map(a => a.id));
  let pick = [];
  const list = () => areaGroups(pick, tp => !have.has(tp.id)) || `<p>${t('Ya tienes todos los hábitos de la lista. Puedes crear uno propio.')}</p>`;
  const p = openSheet(`
    <h3>${t('Elegir de la lista')}</h3>
    <div id="hpList">${list()}</div>
    <div class="btn-row"><button class="btn" data-close="cancel">${t('Cancelar')}</button><button class="btn btn-primary" id="hpAdd">${t('Agregar')}</button></div>`);
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
  toast(tn(n, 'Hábito agregado', '{n} hábitos agregados'));
}

/** Detalle de una stat: nivel, progreso, actividades y su guardián. */
async function openStatDetail(statId) {
  const s = G.statById(statId);
  const st = G.deriveProfile(state).stats[statId];
  const recent = [...state.log].filter(e => e.stat === statId).sort((a, b) => b.ts - a.ts).slice(0, 5);
  const acts = state.activities.filter(a => a.stat === statId);
  const g = guardianFor(statId, st.level);
  const gName = g.name || t('Guardiana de {stat}', { stat: statName(s) });
  const aff = G.affinityFor(state, statId);
  const p = openSheet(`
    <div class="stat-detail-head" style="--c:${s.color}">
      <img src="${statIcon(s.id)}" alt="">
      <div><h3>${statName(s)}</h3><div class="lvl">LV ${st.level}</div></div>
    </div>
    <div class="stat-bar" style="--c:${s.color};height:10px"><i style="width:${Math.round(st.pct * 100)}%"></i></div>
    <p>${t('{into} / {needed} XP para el nivel {lv} · {xp} XP en total', { into: st.into, needed: st.needed, lv: st.level + 1, xp: st.xp })}</p>
    <div class="guardian" style="--c:${s.color}">
      <div class="guardian-art">
        ${artImg(g.img, { alt: esc(gName), fb: g.tier > 1 ? g.fallback : null })}
        <span class="soon">${t('Próximamente')}</span>
      </div>
      <div class="guardian-text">
        <small>${t('Guardiana · Forma {n}/5', { n: g.tier })}</small><b>${esc(gName)}</b>
        <q class="g-say">${esc(lineOfDay(guardianLines(statId), statId, G.dayKey(Date.now())))}</q>
        <p class="g-aff"><strong>${aff.pct ? t('Afinidad: +{n} %', { n: aff.pct }) : t('Afinidad: aún no')}</strong> ${t('de XP y monedas en actividades de {stat}.', { stat: statName(s) })}
          ${g.nextAt ? t('En el nivel {lv} evoluciona y sube a +{n} %.', { lv: g.nextAt, n: G.AFFINITY_PCT[g.tier] }) : t('¡Forma final!')}</p>
      </div>
    </div>
    <div class="field"><span>${t('Actividades ({n})', { n: acts.length })}</span>
      <div class="chips">${acts.map(a => `<span class="chip">${esc(nameOf(a))} · +${a.xp}</span>`).join('') || `<span class="small muted">${t('Ninguna todavía.')}</span>`}</div>
    </div>
    <div class="field"><span>${t('Últimos registros')}</span>
      ${recent.length ? recent.map(e => `<div class="small">${fmtDate(e.ts)} · ${esc(nameOf(e))} · <b>+${e.xp}</b></div>`).join('') : `<span class="small muted">${t('Aún no registras nada aquí.')}</span>`}
    </div>
    <button class="btn btn-primary btn-block" data-close="ok">${t('Cerrar')}</button>`);
  await p;
}

async function undo(id) {
  const e = state.log.find(x => x.id === id);
  if (!e) return;
  const extra = { quest: t(' La misión volverá a tus pendientes.'), weekly: t(' Podrás reclamarla de nuevo.'), boss: t(' Podrás reclamarlo de nuevo.') }[e.type] || '';
  if (!(await confirmSheet(t('¿Deshacer registro?'), t('Se quitarán <b>{xp} XP</b> de “{name}”.', { xp: e.xp, name: esc(nameOf(e)) }) + extra, t('Deshacer'), true))) return;
  commit(s => G.undoEntry(s, id), { celebrate: false });
  toast(t('Registro deshecho'));
}

// ---------------------------------------------------------------------
// Subida de nivel
// ---------------------------------------------------------------------
let stopSparks = null;
function showLevelUp(p) {
  const el = $('#levelup');
  $('#levelupNum').textContent = p.level;
  $('#levelupRank').textContent = t('Rango {letter} · {title}', { letter: p.rank.letter, title: t(p.rank.title) });
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
  const name = `kaizen-respaldo-${G.dayKey(Date.now())}.json`;
  const file = new File([json], name, { type: 'application/json' });
  let done = false;
  try {
    // En iPhone, compartir permite "Guardar en Archivos" / iCloud Drive.
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Respaldo Kaizen' });
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
  toast(t('💾 Respaldo exportado'));
}

async function importBackup(file) {
  try {
    const data = G.validateImport(JSON.parse(await file.text()));
    const ok = await confirmSheet(t('¿Importar respaldo?'),
      t('Se reemplazarán tus datos actuales por los del archivo (<b>{n}</b> registros, <b>{a}</b> actividades).', { n: data.log.length, a: data.activities.length }),
      'Importar', true);
    if (!ok) return;
    data.lastBackup = Date.now();
    data.seenAchievements = G.unlockedAchievements(data);
    data.guardianSeen = syncGuardianSeen(data.guardianSeen, G.deriveProfile(data).stats);
    state = data;
    save(); renderAll();
    toast(t('✅ Respaldo importado'));
  } catch (err) {
    toast(`❌ ${esc(t(err.message || 'Archivo inválido'))}`, { kind: 'ach', duration: 4500 });
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
  if (use && await confirmSheet(t('¿Usar cupón?'), t('Se marcará como usado. ¡Disfrútalo!'), t('Usar'))) {
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
  if (e.target.closest('#buyShieldBtn')) tryPay(s => G.buyShield(s), t('🛡️ Escudo guardado'));
});
$('#worldList').addEventListener('click', e => {
  const t = e.target.closest('[data-world]');
  if (!t || t.disabled) return;
  if (t.querySelector('img.missing')) return toast(t('Ese mundo aún no tiene arte'));
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
    claimReward(s => G.claimBoss(s), b, t('👹 ¡Jefe derrotado!'));
    if (drop && !hadIt) setTimeout(() => toast(t('🎁 Botín: <b>{name}</b> · está en tu inventario', { name: esc(itemName(drop)) }), { kind: 'ach', duration: 5000, action: t('Ver'), onAction: () => showView('gear') }), 700);
    return;
  }
  if (e.target.closest('#shareBossBtn')) shareBoss();
});
$('#weeklyList').addEventListener('click', e => {
  const b = e.target.closest('[data-weekly]');
  if (b) claimReward(s => G.claimWeekly(s, b.dataset.weekly), b, t('🗓️ ¡Misión semanal!'));
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
  const l = e.target.closest('[data-look]');
  const c = e.target.closest('[data-char]');
  if (!l && !c) return;
  const next = l ? withLook(state.profile.character, l.dataset.look) : c.dataset.char;
  if (next === G.migrateCharacter(state.profile.character)) return;
  // Solo cambia el avatar: nivel, XP, historial y guardianas siguen igual.
  commit(s => { s.profile.character = next; }, { celebrate: false });
  if (l) return;
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
  if (!(await confirmSheet(t('¿Borrar este perfil?'), t('Se borrará <b>{name}</b> con todo su progreso en este teléfono. <b>Exporta un respaldo antes</b> si quieres conservarlo.', { name: esc(state.profile.name) }), t('Borrar'), true))) return;
  const next = Profiles.deleteProfile(profileId);
  useProfile(next, { silent: true });
  toast(t('Perfil borrado'));
};

$('#exportBtn').onclick = exportBackup;
$('#importBtn').onclick = () => $('#importFile').click();
$('#importFile').addEventListener('change', e => {
  const f = e.target.files?.[0];
  if (f) importBackup(f);
  e.target.value = '';
});

$('#resetBtn').onclick = async () => {
  if (!(await confirmSheet(t('¿Borrar TODO?'), t('Perderás tu nivel, historial, misiones y actividades personalizadas. <b>Exporta un respaldo antes</b> si quieres conservarlos.'), t('Borrar todo'), true))) return;
  const keep = { ...state.profile };  // conserva nombre y personaje del perfil
  state = G.defaultState();
  state.profile = { ...state.profile, ...keep };
  save(); lastLevelShown = null; renderAll();
  maybeWelcome();
};

/**
 * Al volver después de faltar uno o más días: bienvenida sin culpa. Dice que
 * el progreso sigue intacto, cómo quedó la racha y si el jefe se recuperó.
 */
function welcomeBack() {
  if (!state.onboarded) return;
  const away = G.daysAway(state);
  const today = G.dayKey(Date.now());
  if (!away || state.notices?.backDay === today) return;
  state.notices = { ...state.notices, backDay: today };
  save();
  const p = G.deriveProfile(state);
  const b = G.bossStatus(state);
  const lines = [p.streak.current > 0
    ? (p.streak.graceDays.length ? t('Tu racha sigue en <b>{n}</b> gracias al día de gracia. Registra algo hoy para mantenerla.', { n: p.streak.current }) : t('Tu racha sigue en <b>{n}</b>. Registra algo hoy para mantenerla.', { n: p.streak.current }))
    : t('Tu racha empieza de nuevo hoy. Tu nivel, tus guardianas y tus monedas siguen igual.')];
  // Lo que el jefe recuperó desde tu último registro (solo si es el mismo mes).
  const lastTs = Math.max(...state.log.filter(G.isBase).map(e => e.ts));
  const healedAway = b.healed - (G.monthKey(lastTs) === b.monthKey ? G.bossStatus(state, lastTs).healed : 0);
  if (healedAway > 0 && !b.defeated) {
    const ch = state.activities.find(a => a.resist === b.id);
    lines.push(t('{boss} recuperó {n} PV mientras no estabas.', { boss: esc(bossShort(b)), n: healedAway }) + (ch ? t(' Hoy «{name}» le pega ×3.', { name: esc(nameOf(ch)) }) : ''));
  }
  setTimeout(() => toast(`<span class="res-head">💪 ${esc(lineOfDay(backLines(), 'back', today))}</span>${lines.map(l => `<span class="res-line">${l}</span>`).join('')}`,
    { kind: 'result', duration: 8000 }), 700);
}

// Al volver a la app (p. ej. al día siguiente) se recalcula racha y "hoy".
document.addEventListener('visibilitychange', () => { if (!document.hidden) { checkShields(); renderAll(); welcomeBack(); heroSays(); } });

// ---------------------------------------------------------------------
// Inicio
// ---------------------------------------------------------------------
$('#langChips').addEventListener('click', e => { const b = e.target.closest('[data-lang]'); if (b) changeLang(b.dataset.lang); });

// Lo ya desbloqueado al abrir no se vuelve a anunciar.
setLang(getLang());
translateStatic();
syncSeen();
save();
checkShields();
renderAll();
noticeSkyRefund();
maybeWelcome();
welcomeBack();
heroSays();

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
  const steps = info.steps ? `<ol class="install-steps">${info.steps.map(st => `<li>${esc(t(st))}</li>`).join('')}</ol>` : '';
  $('#installCard').innerHTML = `
    <p class="install-title">${esc(t(info.title))}</p>
    ${steps}
    ${info.button ? `<button class="btn btn-primary btn-block" id="installBtn">${esc(t(info.button))}</button>` : ''}`;
  $('#installCard').dataset.kind = info.kind;
}
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; renderInstall(); });
addEventListener('appinstalled', () => { installPrompt = null; justInstalled = true; renderInstall(); toast(t('📲 ¡Kaizen instalada!'), { kind: 'ach' }); });
$('#installCard').addEventListener('click', async e => {
  if (!e.target.closest('#installBtn') || !installPrompt) return;
  const p = installPrompt; installPrompt = null;
  p.prompt();
  const choice = await p.userChoice.catch(() => ({ outcome: 'dismissed' }));
  // Si lo cancela, Chrome no vuelve a ofrecer el aviso hasta más tarde: se explica el menú.
  if (choice.outcome === 'accepted') justInstalled = true;
  else toast(t('Puedes instalarla después desde Ajustes o el menú del navegador'));
  renderInstall();
});
matchMedia('(display-mode: standalone)').addEventListener?.('change', renderInstall);
renderInstall();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').catch(err => console.warn('SW no registrado', err));
}

// Exponer para pruebas manuales desde la consola
window.__kaisen = { get state() { return state; }, G, save };
