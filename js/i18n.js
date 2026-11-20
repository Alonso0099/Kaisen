// =====================================================================
// Idioma: español (base) e inglés.
//
// - t('Texto en español', { vars }) devuelve la traducción, o el mismo
//   español si todavía no hay traducción (nunca se rompe nada).
// - El contenido del juego (hábitos, recompensas, héroes, jefes…) se
//   traduce por su id. Lo que el jugador escribió o renombró NUNCA se
//   traduce: solo se traduce un nombre si sigue igual al de la plantilla.
// - El idioma se guarda en este dispositivo. No toca el progreso: el
//   historial guarda ids y XP, no textos que dependan del idioma.
// - Todo es estático: funciona sin conexión (el service worker lo guarda).
// =====================================================================

import { DEFAULT_ACTIVITIES, DEFAULT_RESIST, HABIT_TEMPLATES, REWARD_TEMPLATES } from './logic.js';
import { HEROES_EN, STATS_EN, BOSSES_EN, SPECIES_EN, WORLDS_EN } from './names-en.js';

export const LANGS = [
  { id: 'es', name: 'Español' },
  { id: 'en', name: 'English' },
];
const KEY = 'kaizen-lang';

function detect() {
  try { const v = localStorage.getItem(KEY); if (v === 'es' || v === 'en') return v; } catch {}
  return /^en\b/i.test(globalThis.navigator?.language || '') ? 'en' : 'es';
}
let lang = detect();
export const getLang = () => lang;
export function setLang(l) {
  lang = l === 'en' ? 'en' : 'es';
  try { localStorage.setItem(KEY, lang); } catch {}
  if (globalThis.document) document.documentElement.lang = lang;
}

const fill = (str, vars) => vars ? str.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m)) : str;
/** Traduce un texto escrito en español. Las variables van como {nombre}. */
export function t(es, vars) {
  return fill(lang === 'en' && EN[es] !== undefined ? EN[es] : es, vars);
}
/** Singular / plural: tn(n, '{n} día', '{n} días'). */
export const tn = (n, one, many) => t(n === 1 ? one : many, { n });

// ---------------------------------------------------------------------
// Contenido por id
// ---------------------------------------------------------------------
// Nombres en español conocidos por id (una actividad puede venir de la
// lista por defecto o de una plantilla con otro texto).
const ES_NAMES = new Map();
for (const x of [...DEFAULT_ACTIVITIES, ...DEFAULT_RESIST, ...HABIT_TEMPLATES, ...REWARD_TEMPLATES]) {
  if (!ES_NAMES.has(x.id)) ES_NAMES.set(x.id, new Set());
  ES_NAMES.get(x.id).add(x.name);
}

/** Nombre de una actividad o recompensa (o de un registro del historial). */
export function nameOf(item) {
  if (lang !== 'en' || !item) return item?.name || '';
  if (item.type === 'boss' && item.refId) { const id = item.refId.split(':')[1]; return `Boss defeated: ${BOSSES_EN[id] || item.name}`; }
  if (item.type === 'weekly' && item.name.startsWith('Semanal: ')) return `Weekly: ${item.name.slice(9)}`;
  const id = item.refId || item.id;
  const en = CONTENT_EN[id];
  const known = ES_NAMES.get(id);
  if (!en || !known) return item.name;
  if (known.has(item.name)) return en;
  // Registro con bono: «Bicicleta · Ruta larga»
  for (const es of known) if (item.name.startsWith(`${es} · `)) return `${en} · ${t(item.name.slice(es.length + 3))}`;
  return item.name;   // renombrado por el jugador: se respeta
}
export const statName = s => (lang === 'en' && STATS_EN[s.id]) || s.name;
const SHORT_EN = { fuerza: 'STR', resistencia: 'END', intelecto: 'INT', sabiduria: 'WIS', vinculo: 'CON', hogar: 'HEA' };
export const statShort = s => (lang === 'en' && SHORT_EN[s.id]) || s.short;
export const bossName = b => (lang === 'en' && BOSSES_EN[b.id]) || b.name;
export const bossShort = b => bossName(b).split(',')[0];
export const bossTaunt = b => (lang === 'en' && TAUNT_EN[b.id]) || b.taunt;
export const achName = a => (lang === 'en' && ACH_EN[a.id]) || a.name;
export const achDesc = a => (lang === 'en' && ACH_DESC_EN[a.id]) || a.desc;
export const itemName = it => (lang === 'en' && ITEMS_EN[it.id]) || it.name;
export const slotName = sl => (lang === 'en' && SLOTS_EN[sl.type || sl.id]) || sl.name;
export const rarityName = (id, es) => (lang === 'en' && RARITY_EN[id]) || es;
export const titleName = ti => (lang === 'en' && TITLES_EN[ti.id]) || ti.name;
export const elementName = sp => (lang === 'en' && ELEMENTS_EN[sp.element]) || sp.element;
export const stageName = i => (lang === 'en' ? STAGES_EN : STAGES_ES)[i] || '';
export const effortName = l => (lang === 'en' && EFFORT_EN[l.id]) || l;
export const lockName = l => (lang === 'en' && LOCKS_EN[l.id]) || l.name;
export const guardianPhrase = (stat, es) => (lang === 'en' && EVO_EN[stat]) || es;
/** Configuración regional para fechas. */
export const locale = () => (lang === 'en' ? 'en' : 'es');
export const speciesName = sp => (lang === 'en' && SPECIES_EN[sp.id]) || sp.name;
export const worldName = w => (lang === 'en' && WORLDS_EN[w.id]) || w.name;
export const heroName = (c, look) => (lang === 'en' && HEROES_EN[c.id]) || c.names[look];
export const heroTitle = c => (lang === 'en' && HERO_EN[c.id]?.title) || c.title;
export const heroBlurb = c => (lang === 'en' && HERO_EN[c.id]?.blurb) || c.blurb;

/** Texto de una misión semanal (se arma con sus datos, no con el texto guardado). */
export function missionText(m, statLabel) {
  if (lang !== 'en') return { title: m.title, desc: m.desc };
  if (m.id === 'a') return { title: `${statLabel} Week`, desc: `Log 3 ${statLabel} activities.` };
  if (m.id === 'b') return { title: 'Power Build-Up', desc: `Earn ${m.target} XP this week.` };
  if (m.target === 4) return { title: 'Full Training', desc: 'Log in 4 different stats.' };
  return { title: 'Consistency', desc: 'Log something on 5 different days.' };
}

// ---------------------------------------------------------------------
// Inglés: contenido
// ---------------------------------------------------------------------
const CONTENT_EN = {
  // Actividades por defecto y plantillas
  'def-gym': 'Work out at the gym', 'def-entreno-casa': 'Short home workout', 'def-mtb': 'Cycling', 'def-hike': 'Walk or hike',
  'def-estudio': 'Study', 'def-tarea': 'Turn in an assignment', 'def-programar': 'Work on a personal project', 'def-leer': 'Read 20+ min',
  'def-terminar-libro': 'Finish a book', 'def-tiempo': 'Quality time together', 'def-familia': 'Outing with family or friends',
  'def-proyecto-casa': 'Home project', 'def-cocinar': 'Cook at home',
  'tpl-dormir': 'Sleep 7+ hours', 'tpl-agua': 'Drink water', 'bas-fruta': 'Eat fruit or vegetables', 'bas-desayuno': 'Eat a good breakfast',
  'bas-aire': 'Get some fresh air or sun', 'bas-cama': 'Make the bed', 'bas-cuidado': 'Shower and get ready',
  'tpl-correr': 'Run', 'tpl-yoga': 'Yoga or stretching', 'tpl-nadar': 'Swim', 'tpl-deporte': 'Play a sport',
  'tpl-meditar': 'Meditate or breathe 5 min', 'tpl-diario': 'Write 3 good things about today', 'tpl-pausa-redes': 'One hour off social media', 'tpl-reflexion': 'Pray or reflect',
  'tpl-ahorro': 'Save something today', 'tpl-sin-gastos': 'A day without impulse buys', 'tpl-finanzas': 'Review my spending', 'tpl-limpiar': 'Clean or tidy up', 'tpl-plantas': 'Care for plants or pets',
  'tpl-llamar': 'Call someone I love', 'tpl-ayudar': 'Help someone', 'tpl-voluntariado': 'Volunteer',
  'tpl-idioma': 'Practice a language', 'tpl-enfoque': 'Focus 25 min', 'tpl-curso': 'Make progress on a course',
  // Retos de resistencia
  'res-pantallas': 'No social media after 9 pm', 'res-dificil': 'Did the hardest thing first', 'res-alarma': 'Got up without snoozing',
  'res-orden': 'Put everything back in its place', 'res-pausa': 'Paused to breathe and unplug', 'res-contacto': 'Texted or called someone I love',
  'res-una-tarea': '15 minutes on a single task', 'res-suficiente': 'Called it done: it was enough', 'res-primer-paso': '2 minutes on the first pending step',
  'res-dormir': 'Started my bedtime routine on time',
  // Recompensas sugeridas
  'rw-episodio': 'An episode of my show', 'rw-juego': 'An hour of video games', 'rw-siesta': 'A guilt-free nap', 'rw-hobby': 'Time for my hobby',
  'rw-bano': 'A long bath or relaxing shower', 'rw-sin-alarma': 'A morning without an alarm', 'rw-cafe': 'A special coffee or drink',
  'rw-postre': 'My favorite dessert', 'rw-snack': 'A snack I love', 'rw-pelicula': 'Movie night', 'rw-salida': 'A date night',
  'rw-amigos': 'A meal with friends', 'rw-paseo': 'A trip somewhere new', 'rw-libro': 'A new book', 'rw-curso': 'A course or workshop',
  'rw-ropa': 'Workout clothes or gear',
};

const HERO_EN = {
  titan:      { title: 'Strength and courage',     blurb: 'When something is heavy, plant your feet and take the next step.' },
  relampago:  { title: 'Initiative',               blurb: 'Raise the sails before the wind dies down.' },
  estratega:  { title: 'Curiosity and strategy',   blurb: 'When lost, look at the star map again.' },
  sabio:      { title: 'Calm and focus',           blurb: 'Among all the branches, they know which one to follow.' },
  guardian:   { title: 'Character and care',       blurb: 'They keep their promises. They mend what breaks.' },
  implacable: { title: 'Discipline and precision', blurb: 'They practice the same move until they can do it without a sound.' },
};

const ACH_EN = {
  'first-log': 'First step', 'level-2': 'First level!', 'level-5': 'Warrior', 'level-10': 'Elite', 'streak-3': 'Warming up',
  'streak-7': 'Unstoppable week', 'streak-30': 'Iron will', 'book': 'Bookworm', 'quest-1': 'Quest complete', 'all-stats': 'Balance',
  'stat-5': 'Specialist', 'big-day': 'Explosive day', 'logs-100': 'A hundred feats', 'weekly-1': 'Week complete', 'weekly-all': 'Perfect week',
  'boss-1': 'Boss hunter', 'boss-6': 'Scourge of bosses', 'pet-adult': 'Legendary breeder',
};

const ACH_DESC_EN = {
  'first-log': 'Log your first activity.', 'level-2': 'Reach level 2.', 'level-5': 'Reach level 5.', 'level-10': 'Reach level 10.',
  'streak-3': 'A 3-day streak.', 'streak-7': 'A 7-day streak.', 'streak-30': 'A 30-day streak.', 'book': 'Finish a book.',
  'quest-1': 'Complete your first one-time quest.', 'all-stats': 'Log something in all 6 stats.', 'stat-5': 'Get a stat to level 5.',
  'big-day': 'Earn 150 XP in a single day.', 'logs-100': 'Make 100 entries.', 'weekly-1': 'Claim a weekly quest.',
  'weekly-all': 'Claim all 3 quests in one week.', 'boss-1': 'Defeat your first boss.', 'boss-6': 'Defeat 6 bosses.', 'pet-adult': 'Raise your pet to its adult form.',
};
const ITEMS_EN = {
  'casco-cuero': 'Leather helmet', 'jubon': 'Padded doublet', 'guantes-herrero': 'Work gloves', 'botas-viaje': 'Travel boots',
  'espada-practica': 'Practice sword', 'capa-caminante': 'Wanderer\'s cloak', 'amuleto-hogar': 'Hearth amulet', 'marcapaginas': 'Silver bookmark',
  'diadema-sabio': 'Sage\'s circlet', 'guanteletes': 'Iron gauntlets', 'baculo-runas': 'Rune staff', 'botas-aladas': 'Winged boots',
  'anillo-vinculo': 'Ring of connection', 'cota-constancia': 'Mail of Consistency', 'reloj-cronos': 'Watch of Cronos', 'guantes-orden': 'Gloves of Order',
  'yelmo-calma': 'Helm of Calm', 'ojo-enfoque': 'Eye of Focus', 'capa-lazo': 'Cloak of the Bond', 'guantes-prioridad': 'Gloves of Priority',
  'coraza-grieta-dorada': 'Golden Crack Breastplate', 'botas-deshielo': 'Boots of the Thaw', 'capa-ultimo-ocaso': 'Cloak of the Last Dusk',
};
const SLOTS_EN = { casco: 'Helmet', armadura: 'Armor', guantes: 'Gloves', botas: 'Boots', arma: 'Weapon', capa: 'Cloak', accesorio: 'Accessory' };
const RARITY_EN = { comun: 'Common', raro: 'Rare', epico: 'Epic', legendario: 'Legendary' };
const TITLES_EN = { 't-imparable': 'The Unstoppable', 't-libros': 'Bookworm', 't-montana': 'King of the Mountain', 't-chef': 'House Chef', 't-corazon': 'Heart of Gold' };
const ELEMENTS_EN = { Fuego: 'Fire', Viento: 'Wind', Agua: 'Water', Tierra: 'Earth', Trueno: 'Thunder', Hielo: 'Ice', Luz: 'Light', Sombra: 'Shadow' };
const STAGES_ES = ['Huevo', 'Recién nacido', 'Cachorro', 'Joven', 'Adulto', 'Legendario'];
const STAGES_EN = ['Egg', 'Newborn', 'Cub', 'Young', 'Adult', 'Legendary'];
const EFFORT_EN = {
  facil: { name: 'Easy', hint: 'Under 10 minutes' }, media: { name: 'Medium', hint: 'Takes some effort' }, dificil: { name: 'Hard', hint: 'A real challenge' },
};
const LOCKS_EN = { habit: 'Do a habit several days', boss: 'Defeat a boss', guardian: 'Evolve a guardian' };
// Frases de evolución de las guardianas (T-03), traducidas.
const EVO_EN = {
  fuerza: 'Today I can carry what weighed me down yesterday.', resistencia: 'Look how far we\'ve come, step by step.',
  intelecto: 'I asked one more question, and another door opened.', sabiduria: 'I learned to pause before answering.',
  vinculo: 'Every time we reach out, our bond grows stronger.', hogar: 'Little by little, this place feels like ours.',
};

const TAUNT_EN = {
  pereza: '"Five more minutes…"', procrastinacion: '"Start tomorrow, not today."', desorden: '"You can put that away later."',
  estres: '"You have no time for anything!"', distraccion: '"Just one more video…"', soledad: '"Why not keep to yourself?"',
  multitarea: '"Almost done? Let\'s open three more things."', perfeccionismo: '"If it has a crack, throw it all away."',
  inercia: '"That first step is heavier than the whole mountain."', desvelo: '"Give me twenty more minutes. Tomorrow can wait."',
};

// ---------------------------------------------------------------------
// Inglés: interfaz (clave = texto en español)
// ---------------------------------------------------------------------
const EN = {
  // Navegación y pantallas fijas (index.html)
  'Inicio': 'Home', 'Misiones': 'Quests', 'Tienda': 'Shop', 'Progreso': 'Progress', 'Ajustes': 'Settings',
  'Novato': 'Rookie', 'Aprendiz': 'Apprentice', 'Guerrero': 'Warrior', 'Élite': 'Elite', 'Campeón': 'Champion', 'Héroe': 'Hero', 'Leyenda': 'Legend', 'Mito': 'Myth',
  '🎒 Equipo': '🎒 Gear', 'Equipo': 'Gear', 'Hoy +0': 'Today +0', '＋ Registrar actividad': '＋ Log activity',
  'Jefe del mes': 'Boss of the month', 'Misiones semanales': 'Weekly quests', 'Misiones únicas': 'One-time quests',
  'Tareas de una sola vez. Al completarlas desaparecen y quedan en el registro.': 'One-off tasks. Once done they disappear and stay in your history.',
  '＋ Nueva misión': '＋ New quest', 'Misiones completadas': 'Completed quests', 'Jefes derrotados': 'Defeated bosses',
  'Tus monedas': 'Your coins', 'Recompensas': 'Rewards',
  'Premios de la vida real que tú defines. Al canjear recibes un cupón para enseñar.': 'Real-life prizes you choose. When you redeem one you get a coupon to show.',
  'Ideas': 'Ideas', '＋ Crear propia': '＋ Create my own', 'Mis cupones': 'My coupons',
  'Cada pieza da XP extra en una stat. Equípalas desde Inicio → 🎒 Equipo. Los jefes sueltan piezas épicas.': 'Each piece gives extra XP in one stat. Equip them from Home → 🎒 Gear. Bosses drop epic pieces.',
  'Escudo de racha': 'Streak shield', 'Mundos': 'Worlds', 'Se desbloquean al subir de rango.': 'Unlocked as your rank goes up.', 'Títulos': 'Titles',
  'Logros': 'Achievements', 'Stats': 'Stats', 'Historial': 'History', 'Compartir mi progreso': 'Share my progress', '‹ Inicio': '‹ Home',
  'Inventario': 'Inventory', 'Guardianas': 'Guardians',
  'Cada stat tiene una guardiana que evoluciona cuando esa stat sube de nivel. Toca una para ver su detalle.': 'Each stat has a guardian who evolves when that stat levels up. Tap one to see her details.',
  '¿Te equivocaste? Toca ↶ para deshacer un registro.': 'Made a mistake? Tap ↶ to undo an entry.',
  'Perfil': 'Profile', 'Perfiles en este teléfono': 'Profiles on this phone', 'Nombre de héroe': 'Hero name', 'Tu héroe': 'Your hero',
  'Animación en reposo': 'Idle animation', 'Balanceo suave': 'Gentle sway', 'Quieto': 'Still', 'Borrar este perfil': 'Delete this profile',
  'Actividades': 'Activities', '＋ Crear': '＋ Create', 'Elegir de la lista': 'Pick from the list', 'Instalar la app': 'Install the app',
  'Respaldo': 'Backup', 'Nunca has exportado un respaldo.': 'You have never exported a backup.', '⬇ Exportar': '⬇ Export', '⬆ Importar': '⬆ Import',
  'El respaldo es un archivo .json. Guárdalo en Archivos o iCloud Drive.': 'The backup is a .json file. Save it in Files or iCloud Drive.',
  'Ayuda': 'Help', '¿Qué es Kaizen?': 'What is Kaizen?', 'Ver tour': 'Take the tour', 'Zona peligrosa': 'Danger zone',
  'Borrar todo y empezar de cero': 'Erase everything and start over', 'Idioma': 'Language',
  '¡Subiste': 'You reached', 'de nivel!': 'a new level!', 'Compartir': 'Share', 'Toca para continuar': 'Tap to continue',
  'Ayuda: qué hace cada cosa': 'Help: what each thing does', 'Monedas': 'Coins', 'Racha de días': 'Day streak', 'Mascota': 'Pet', 'Guardianes': 'Guardians',

  // Bienvenida
  'Mejorar un poco cada día.': 'Get a little better every day.', '¿Qué significa?': 'What does it mean?',
  'Tu vida es la aventura': 'Your life is the adventure',
  'Cada cosa buena que haces en la vida real le da experiencia a tu héroe. Empecemos por conocerte.': 'Every good thing you do in real life gives your hero experience. Let\'s get to know you.',
  '¿Cómo se llama tu héroe?': 'What\'s your hero\'s name?', 'Siguiente': 'Next', 'Atrás': 'Back',
  '¿Cómo quieres que se vea tu héroe?': 'How do you want your hero to look?',
  'Los seis héroes existen en las dos versiones. Puedes cambiarlo cuando quieras.': 'All six heroes come in both versions. You can change it anytime.',
  'Hombre': 'Man', 'Mujer': 'Woman', 'Elige tu héroe': 'Choose your hero',
  'Elige un héroe que te represente o que encarne algo que quieres cultivar.': 'Choose a hero who reflects who you are or who you want to become.',
  'Todas las actividades dan la misma XP con cualquier héroe, y puedes cambiarlo cuando quieras sin perder progreso.': 'Every activity gives the same XP with any hero, and you can switch anytime without losing progress.',
  'Primero elige cómo quieres que se vea tu héroe: Hombre o Mujer.': 'First choose how your hero looks: Man or Woman.',
  'Elige tu héroe tocando una de las tarjetas.': 'Choose your hero by tapping one of the cards.',
  '¿Qué quieres hacer más seguido?': 'What do you want to do more often?',
  'Empieza por lo básico (dormir, agua, comer): son retos de todos los días. Luego elige lo que quieres construir. De {min} a {max} en total.': 'Start with the basics (sleep, water, food): they are everyday challenges. Then pick what you want to build. {min} to {max} in total.',
  '{n} elegido': '{n} selected', '{n} elegidos': '{n} selected', 'Saltar y usar los hábitos sugeridos': 'Skip and use the suggested habits',
  'Puedes elegir hasta {n}. Después podrás agregar más.': 'You can pick up to {n}. You can add more later.',
  '¿Con qué te vas a premiar?': 'How will you reward yourself?',
  'Con lo que hagas ganas monedas para canjear premios reales. Los gratis son los más baratos: un premio no debería deshacer tu meta. Opcional, hasta {n}.': 'What you do earns coins to redeem real prizes. Free ones are the cheapest: a reward shouldn\'t undo your goal. Optional, up to {n}.',
  '{n} de {max}': '{n} of {max}', 'Si no eliges, te dejamos algunas para empezar': 'If you don\'t pick any, we\'ll add a few to start',
  'Hasta {n}. Después puedes agregar más en la Tienda.': 'Up to {n}. You can add more in the Shop later.',
  '¡Listo, {name}!': 'All set, {name}!',
  '<b>Registra</b> lo que hiciste con un toque. Si te equivocas, toca <b>Deshacer</b>.': '<b>Log</b> what you did with one tap. If you make a mistake, tap <b>Undo</b>.',
  '<b>Lo básico</b> se marca una vez al día desde Inicio.': '<b>The basics</b> are checked once a day from Home.',
  'Cada día que registras algo, tu <b>huevo</b> se calienta. En 2 días nace tu mascota.': 'Every day you log something, your <b>egg</b> warms up. In 2 days your pet hatches.',
  'Lo demás (jefes, guardianas, tienda) lo irás descubriendo. Toca <b>?</b> arriba cuando tengas dudas.': 'You\'ll discover the rest (bosses, guardians, shop) as you go. Tap <b>?</b> at the top if you have questions.',
  'Empezar: registrar «{name}»': 'Start: log "{name}"', 'Empezar': 'Start', 'Entrar y ver un tour rápido': 'Enter and take a quick tour',
  'Entrar sin registrar todavía': 'Enter without logging yet',
  '¡Bienvenido, {name}! Registra algo cuando lo hagas. Si tienes dudas, toca <b>?</b> arriba.': 'Welcome, {name}! Log something when you do it. If you have questions, tap <b>?</b> at the top.',
  // Áreas y tipos
  'Lo básico': 'The basics', 'Moverme': 'Move', 'Mente y calma': 'Mind and calm', 'Dinero y hogar': 'Money and home', 'Personas': 'People', 'Crecer': 'Grow',
  'Retos de todos los días. Uno por día cada uno, poco XP pero constante.': 'Everyday challenges. Once a day each, little XP but steady.',
  'Gratis': 'Free', 'Pequeño gusto': 'Small treat', 'Experiencia': 'Experience', 'Inversión en mí': 'Investing in me', 'Ruta larga': 'Long route',

  // Inicio
  'Lo básico de hoy': 'Today\'s basics', '{n} de {total}': '{n} of {total}', '¿Qué hiciste hoy?': 'What did you do today?',
  'Elige una actividad y tu aventura empieza. Las que más uses aparecerán aquí.': 'Pick an activity and your adventure begins. The ones you use most will show up here.',
  'Registrar actividad': 'Log activity', 'Toca una para registrarla. ★ la fija en Inicio (hasta 3).': 'Tap one to log it. ★ pins it to Home (up to 3).',
  'Lo básico · una vez al día': 'The basics · once a day', 'Retos de resistencia': 'Resistance challenges',
  'Una vez al día cada uno. El del jefe del mes hace ×3.': 'Once a day each. The one for this month\'s boss does ×3.',
  '＋ Crear actividad': '＋ Create activity', 'Cerrar': 'Close', ' · ⚡ ×3 al jefe': ' · ⚡ ×3 to the boss', 'Fijar en Inicio': 'Pin to Home', 'Editar': 'Edit',
  'Dale calor': 'Keep it warm', '¡Está feliz!': 'It\'s happy!', 'Te espera': 'Waiting for you', '¡Qué bueno verte!': 'So good to see you!',
  '✔ Derrotado': '✔ Defeated', '¡Reclama tu premio!': 'Claim your prize!', '✔ Reto de hoy hecho': '✔ Today\'s challenge done',
  'Registra tu primera actividad para que tu huevo empiece a calentarse': 'Log your first activity so your egg starts warming up',
  'Registra un día más para que nazca tu mascota': 'Log one more day for your pet to hatch',
  'Registra {n} días más para que nazca tu mascota': 'Log {n} more days for your pet to hatch',
  '¡Derrotaste al jefe! Reclama tu premio en Misiones': 'You defeated the boss! Claim your prize in Quests',
  'Misión cumplida: reclama «{name}»': 'Quest complete: claim "{name}"',
  'Te faltan {n} XP para el nivel {lv}': '{n} XP to level {lv}', '{title}: {n} de {target}': '{title}: {n} of {target}',
  'A {boss} le quedan {hp} PV': '{boss} has {hp} HP left',
  'Registro deshecho': 'Entry undone', 'Deshacer': 'Undo',
  '{g} +{xp}': '{g} +{xp}', '(Afinidad +{n})': '(Affinity +{n})', '{boss} −{n} PV': '{boss} −{n} HP',

  // Misiones
  'Débil a {stat}': 'Weak to {stat}', '¡Derrotado!': 'Defeated!',
  'Premio reclamado. Un nuevo jefe llegará el mes que viene.': 'Prize claimed. A new boss arrives next month.',
  'Presumir la victoria': 'Show off the victory', 'Reclamar +{n} XP': 'Claim +{n} XP',
  'Cada XP que ganas le quita 1 PV. Te queda 1 día para derrotarlo y ganar <b>+{xp} XP</b>.': 'Every XP you earn takes 1 HP. You have 1 day left to defeat it and earn <b>+{xp} XP</b>.',
  'Cada XP que ganas le quita 1 PV. Te quedan {n} días para derrotarlo y ganar <b>+{xp} XP</b>.': 'Every XP you earn takes 1 HP. You have {n} days left to defeat it and earn <b>+{xp} XP</b>.',
  '🛡️ <b>Defensa activa:</b> cumpliste su reto ayer, así que hoy no puede recuperarse.': '🛡️ <b>Defense active:</b> you did its challenge yesterday, so it can\'t recover today.',
  'Si pasa un día sin que registres nada de {stat} ni su reto, recupera un poco de vida (nunca te quita nada a ti). Cumplir su reto te da <b>Defensa</b> para el día siguiente.': 'If a day goes by without logging any {stat} or its challenge, it recovers a little HP (it never takes anything from you). Doing its challenge gives you <b>Defense</b> for the next day.',
  ' Este mes ha recuperado {n} PV.': ' It has recovered {n} HP this month.',
  'Se renuevan cada lunes. Queda 1 día.': 'They reset every Monday. 1 day left.', 'Se renuevan cada lunes. Quedan {n} días.': 'They reset every Monday. {n} days left.',
  'Reclamar': 'Claim', 'Reclamada': 'Claimed', 'Reclamado': 'Claimed',

  // Al volver
  'Tu racha sigue en <b>{n}</b>. Registra algo hoy para mantenerla.': 'Your streak is still at <b>{n}</b>. Log something today to keep it.',
  'Tu racha sigue en <b>{n}</b> gracias al día de gracia. Registra algo hoy para mantenerla.': 'Your streak is still at <b>{n}</b> thanks to the grace day. Log something today to keep it.',
  'Tu racha empieza de nuevo hoy. Tu nivel, tus guardianas y tus monedas siguen igual.': 'Your streak starts again today. Your level, guardians and coins are unchanged.',
  '{boss} recuperó {n} PV mientras no estabas.': '{boss} recovered {n} HP while you were away.', ' Hoy «{name}» le pega ×3.': ' Today "{name}" hits it ×3.',
  '¡Qué bueno verte! Tu progreso sigue aquí.': 'So good to see you! Your progress is still here.',
  'Volviste. Puedes retomar desde donde lo dejaste.': 'You\'re back. You can pick up where you left off.',
  'Tu progreso sigue intacto. Elige por dónde quieres seguir hoy.': 'Your progress is still here. Pick where you\'d like to start today.',

  // Tarjetas para compartir
  'Preparando tarjeta…': 'Preparing card…', 'Tarjeta guardada como imagen': 'Card saved as an image', '❌ No se pudo crear la tarjeta': '❌ Couldn\'t create the card',
  'Nivel {lv} · Racha {n}': 'Level {lv} · Streak {n}', 'Rango {letter} · {title}': 'Rank {letter} · {title}', '¡Nivel {lv}!': 'Level {lv}!',
  '{xp} XP · racha de {days} · {ach} logros': '{xp} XP · {days} streak · {ach} achievements', '{n} día': '{n} day', '{n} días': '{n} days',
  '¡Voy en nivel {lv} en Kaizen!': 'I\'m at level {lv} in Kaizen!', 'Jefe derrotado': 'Boss defeated', '¡Vencí a {boss}!': 'I beat {boss}!',
  '¡Derroté a {boss} en Kaizen!': 'I defeated {boss} in Kaizen!', 'Cupón ganado con esfuerzo': 'A coupon earned with effort',
  'Vale por una recompensa. ¡Me lo gané!': 'Good for one reward. I earned it!', 'Me gané este cupón: {name}': 'I earned this coupon: {name}',
  "⚠️ No se pudo guardar. Exporta un respaldo.": "⚠️ Couldn't save. Export a backup.",
  "👹 ¡Derrotaste a {boss}! Reclámalo en Misiones": "👹 You defeated {boss}! Claim it in Quests",
  "🗓️ Misión cumplida: {name}": "🗓️ Quest complete: {name}",
  "🐣 {name} ahora es {stage}": "🐣 {name} is now {stage}",
  "+{n} más en Progreso": "+{n} more in Progress",
  "Guardiana de {stat}": "Guardian of {stat}",
  "¡Evolución!": "Evolution!",
  "Próximamente": "Coming soon",
  "Forma {n} de 5 · {stat}": "Form {n} of 5 · {stat}",
  "Ver guardianas": "See guardians",
  "Continuar": "Continue",
  "¡Tu huevo eclosionó!": "Your egg hatched!",
  "Ponle nombre a tu compañero": "Name your companion",
  "Si lo dejas vacío se llamará <b>{name}</b>. Puedes cambiarlo cuando quieras desde su ficha.": "If you leave it empty it'll be called <b>{name}</b>. You can change it anytime from its card.",
  "Omitir": "Skip",
  "Guardar": "Save",
  "🐣 ¡Conoce a <b>{name}</b>!": "🐣 Meet <b>{name}</b>!",
  "Gráfico de stats": "Stats chart",
  "Un día activo más y {name} será {stage}": "One more active day and {name} will be {stage}",
  "{n} días activos más y {name} será {stage}": "{n} more active days and {name} will be {stage}",
  "{stat} está a un nivel de que {name} evolucione": "{stat} is one level away from {name} evolving",
  "su guardiana": "its guardian",
  "+{n}% XP en todo": "+{n}% XP on everything",
  "+{n}% XP en {stat}": "+{n}% XP in {stat}",
  "Botín": "Loot",
  "Tuyo": "Yours",
  "Sin bonus todavía. Equipa piezas para ganar XP extra.": "No bonus yet. Equip pieces to earn extra XP.",
  "{n} de {total} piezas. Toca una para ver de dónde sale o equiparla.": "{n} of {total} pieces. Tap one to see where it comes from or equip it.",
  "Botín de <b>{boss}</b>.": "Dropped by <b>{boss}</b>.",
  "Se vende en la Tienda por <b>{n} monedas</b>.": "Sold in the Shop for <b>{n} coins</b>.",
  "Quitar": "Remove",
  "Equipar": "Equip",
  "Comprar": "Buy",
  "Te faltan {n} monedas.": "You need {n} more coins.",
  "🎒 ¡{name} es tuya!": "🎒 {name} is yours!",
  "¿Equiparla ahora?": "Equip it now?",
  "Puesta": "Equipped",
  "No tienes piezas para este espacio. Consíguelas en la <b>Tienda</b> o derrotando jefes.": "You don't have pieces for this slot. Get them in the <b>Shop</b> or by defeating bosses.",
  "Dejar vacío": "Leave empty",
  "Ir a la Tienda": "Go to the Shop",
  "Registra algo hoy para abrir tu cofre del día.": "Log something today to open today's chest.",
  "Cofre de hoy: +{n}. Ganas monedas con cada registro, logro, misión y jefe.": "Today's chest: +{n}. You earn coins with every entry, achievement, quest and boss.",
  "Tuya": "Yours",
  " · te faltan {n}": " · {n} short",
  "Reto: {label}": "Challenge: {label}",
  " · ¡Cumplido!": " · Done!",
  "Canjear": "Redeem",
  "Crea tu primera recompensa.": "Create your first reward.",
  "Usado el {date}": "Used on {date}",
  "Canjeado el {date}": "Redeemed on {date}",
  "Usar": "Use",
  "Aún no tienes cupones.": "You don't have coupons yet.",
  "Tienes {n} de {max}": "You have {n} of {max}",
  "Si faltas más días de los que cubre tu día de gracia, el escudo se usa solo y tu racha sigue viva.": "If you miss more days than your grace day covers, the shield is used automatically and your streak stays alive.",
  "Máximo guardado": "Maximum stored",
  "✔ En uso": "✔ In use",
  "Rango {letter}": "Rank {letter}",
  "Cada día que registras algo le das calor": "Every day you log something you keep it warm",
  "¡{name} está feliz!": "{name} is happy!",
  "{name} descansa y te espera": "{name} is resting and waiting for you",
  "¡{name} está feliz de verte de nuevo!": "{name} is happy to see you again!",
  "Aún no derrotas a ningún jefe.": "You haven't defeated any boss yet.",
  "¡Hecho!": "Done!",
  "Sin misiones pendientes.<br>Crea una para ganar XP extra.": "No pending quests.<br>Create one to earn extra XP.",
  "Aún no completas misiones.": "You haven't completed any quests yet.",
  "Tu historia empieza con el primer registro. ⚔️": "Your story begins with your first entry. ⚔️",
  "Ver más": "See more",
  "{stat} · Forma {n}/5": "{stat} · Form {n}/5",
  "Afinidad +{n} % · ": "Affinity +{n}% · ",
  "Evoluciona en LV {n}": "Evolves at LV {n}",
  "Forma final": "Final form",
  "Racha actual": "Current streak",
  "Mejor racha": "Best streak",
  "Escudos 🛡️": "Shields 🛡️",
  "{n} de {total} desbloqueados · cada logro da {coins} monedas · mejor racha: {best} días": "{n} of {total} unlocked · each achievement gives {coins} coins · best streak: {best} days",
  "＋ Nuevo": "＋ New",
  "Reto": "Challenge",
  "Borrar": "Delete",
  "Sin actividades.": "No activities.",
  "Último respaldo: {date} ({n} registros en total).": "Last backup: {date} ({n} entries in total).",
  "⚠️ Tu último respaldo fue hace más de {n} días. Safari puede borrar los datos de apps web: exporta uno nuevo.": "⚠️ Your last backup was more than {n} days ago. Safari can erase web app data: export a new one.",
  "⚠️ Aún no tienes respaldo. Safari puede borrar los datos de apps web: exporta uno de vez en cuando.": "⚠️ You don't have a backup yet. Safari can erase web app data: export one now and then.",
  "Hoy": "Today",
  "Ayer": "Yesterday",
  "Sí": "Yes",
  "Cancelar": "Cancel",
  "«{name}» {n} días": "\"{name}\" {n} days",
  "Hábito borrado": "Deleted habit",
  "Derrota a un jefe": "Defeat a boss",
  "Guardiana de {stat} en forma {n}": "Guardian of {stat} in form {n}",
  "Nombre": "Name",
  "Ej. Correr 5 km": "E.g. Run 5 km",
  "Stat que sube": "Stat it raises",
  "¿Cuánto esfuerzo te pide?": "How much effort does it take?",
  "Actual": "Current",
  "Como estaba": "As it was",
  "Bono opcional (ej. ruta larga)": "Optional bonus (e.g. long route)",
  "Nombre del bono": "Bonus name",
  "XP extra ({min}–{max})": "Extra XP ({min}–{max})",
  "¿Es un reto de resistencia? (una vez al día, ×3 a su jefe)": "Is it a resistance challenge? (once a day, ×3 to its boss)",
  "No, actividad normal": "No, regular activity",
  "Sí, contra {boss}": "Yes, against {boss}",
  "¡Ponle un nombre!": "Give it a name!",
  "Editar actividad": "Edit activity",
  "Nueva actividad": "New activity",
  "Actividad actualizada": "Activity updated",
  "Actividad creada": "Activity created",
  "¿Borrar actividad?": "Delete activity?",
  "“{name}” desaparecerá de la lista. Tu historial y XP se conservan.": "\"{name}\" will disappear from the list. Your history and XP are kept.",
  "Actividad borrada": "Activity deleted",
  "Editar misión": "Edit quest",
  "Nueva misión única": "New one-time quest",
  "¿Borrar misión?": "Delete quest?",
  "“{name}” se eliminará sin dar XP.": "\"{name}\" will be deleted without giving XP.",
  "Misión devuelta a pendientes": "Quest moved back to pending",
  "Evoluciona a <b>{stage}</b> en {days} más. Crece cada día que registras algo y nunca retrocede.": "Evolves to <b>{stage}</b> in {days} more. It grows every day you log something and never goes back.",
  "¡Alcanzó su forma final!": "It reached its final form!",
  "Huevo": "Egg",
  "Elige qué huevo empollar. Puedes cambiarlo mientras no haya eclosionado.": "Choose which egg to hatch. You can change it until it hatches.",
  "Ya eclosionó: es de la especie {name}.": "It already hatched: it is a {name}.",
  "Nombre de tu compañero": "Your companion's name",
  "Listo": "Done",
  "Pronto": "Soon",
  "¿Canjear recompensa?": "Redeem reward?",
  "<b>{name}</b> por <b>{n} monedas</b>. Recibirás un cupón para usar cuando quieras.": "<b>{name}</b> for <b>{n} coins</b>. You'll get a coupon to use whenever you want.",
  "🎟️ ¡Cupón conseguido: {name}!": "🎟️ Coupon earned: {name}!",
  "Ya tienes todas las ideas. Crea una propia.": "You already have all the ideas. Create your own.",
  "Ideas de recompensas": "Reward ideas",
  "Los premios gratis cuestan menos: así premiarte no deshace tus metas.": "Free prizes cost less: that way rewarding yourself doesn't undo your goals.",
  "Agregar": "Add",
  "Editar recompensa": "Edit reward",
  "Nueva recompensa": "New reward",
  "¿Qué te vas a regalar?": "What will you treat yourself to?",
  "Ej. Salir por un helado": "E.g. Go out for ice cream",
  "Tipo": "Type",
  "Precio en monedas": "Price in coins",
  "Reto para desbloquearla (opcional)": "Challenge to unlock it (optional)",
  "Sin reto: solo el precio": "No challenge: just the price",
  "Forma {n}": "Form {n}",
  "Un reto hace que el premio se sienta ganado. Cada canje pide cumplirlo otra vez (salvo el de guardiana).": "A challenge makes the prize feel earned. Each redemption asks you to complete it again (except the guardian one).",
  "Precio guía para este tipo: <b>{min}–{max}</b> monedas (un día normal da unas 25–35).": "Suggested price for this type: <b>{min}–{max}</b> coins (a normal day gives about 25–35).",
  "Muy barata: una recompensa así deja de sentirse ganada.": "Too cheap: a reward like this stops feeling earned.",
  "¿Comprar?": "Buy?",
  "<b>{name}</b> por <b>{n} monedas</b>.": "<b>{name}</b> for <b>{n} coins</b>.",
  "✨ ¡{name} es tuyo!": "✨ {name} is yours!",
  "Hola, {name} 👋": "Hi, {name} 👋",
  "¿Crear otro perfil?": "Create another profile?",
  "Cada perfil tiene su propio progreso, personaje y hábitos en este teléfono. Podrás volver a este cuando quieras desde Ajustes.": "Each profile has its own progress, character and habits on this phone. You can come back to this one anytime from Settings.",
  "Crear perfil": "Create profile",
  "Ya tienes todos los hábitos de la lista. Puedes crear uno propio.": "You already have every habit on the list. You can create your own.",
  "{into} / {needed} XP para el nivel {lv} · {xp} XP en total": "{into} / {needed} XP to level {lv} · {xp} XP total",
  "Guardiana · Forma {n}/5": "Guardian · Form {n}/5",
  "Afinidad: +{n} %": "Affinity: +{n}%",
  "Afinidad: aún no": "Affinity: not yet",
  "de XP y monedas en actividades de {stat}.": "XP and coins on {stat} activities.",
  "En el nivel {lv} evoluciona y sube a +{n} %.": "At level {lv} she evolves and it rises to +{n}%.",
  "¡Forma final!": "Final form!",
  "Actividades ({n})": "Activities ({n})",
  "Ninguna todavía.": "None yet.",
  "Últimos registros": "Latest entries",
  "Aún no registras nada aquí.": "You haven't logged anything here yet.",
  " La misión volverá a tus pendientes.": " The quest will go back to pending.",
  " Podrás reclamarla de nuevo.": " You can claim it again.",
  " Podrás reclamarlo de nuevo.": " You can claim it again.",
  "¿Deshacer registro?": "Undo entry?",
  "Se quitarán <b>{xp} XP</b> de “{name}”.": "<b>{xp} XP</b> from \"{name}\" will be removed.",
  "💾 Respaldo exportado": "💾 Backup exported",
  "¿Importar respaldo?": "Import backup?",
  "Se reemplazarán tus datos actuales por los del archivo (<b>{n}</b> registros, <b>{a}</b> actividades).": "Your current data will be replaced with the file's (<b>{n}</b> entries, <b>{a}</b> activities).",
  "✅ Respaldo importado": "✅ Backup imported",
  "¿Usar cupón?": "Use coupon?",
  "Se marcará como usado. ¡Disfrútalo!": "It'll be marked as used. Enjoy it!",
  "🛡️ Escudo guardado": "🛡️ Shield stored",
  "Ese mundo aún no tiene arte": "That world doesn't have art yet",
  "👹 ¡Jefe derrotado!": "👹 Boss defeated!",
  "🎁 Botín: <b>{name}</b> · está en tu inventario": "🎁 Loot: <b>{name}</b> · it's in your inventory",
  "Ver": "See",
  "🗓️ ¡Misión semanal!": "🗓️ Weekly quest!",
  "¿Borrar este perfil?": "Delete this profile?",
  "Se borrará <b>{name}</b> con todo su progreso en este teléfono. <b>Exporta un respaldo antes</b> si quieres conservarlo.": "<b>{name}</b> and all its progress on this phone will be deleted. <b>Export a backup first</b> if you want to keep it.",
  "Perfil borrado": "Profile deleted",
  "¿Borrar TODO?": "Delete EVERYTHING?",
  "Perderás tu nivel, historial, misiones y actividades personalizadas. <b>Exporta un respaldo antes</b> si quieres conservarlos.": "You'll lose your level, history, quests and custom activities. <b>Export a backup first</b> if you want to keep them.",
  "Borrar todo": "Delete everything",
  "📲 ¡Kaizen instalada!": "📲 Kaizen installed!",
  "Puedes instalarla después desde Ajustes o el menú del navegador": "You can install it later from Settings or the browser menu",
  "Racha de {n} día": "{n}-day streak",
  "Racha de {n} días": "{n}-day streak",
  "{n} día activo": "{n} active day",
  "{n} días activos": "{n} active days",
  "Recompensa agregada": "Reward added",
  "{n} recompensas agregadas": "{n} rewards added",
  "Un escudo salvó tu racha": "A shield saved your streak",
  "{n} escudos salvaron tu racha": "{n} shields saved your streak",
  "Hábito agregado": "Habit added",
  "{n} hábitos agregados": "{n} habits added",
  "Kaizen está instalada en este dispositivo ✓": "Kaizen is installed on this device ✓",
  "Instala Kaizen para abrirla como una app, a pantalla completa y sin conexión.": "Install Kaizen to open it like an app, full screen and offline.",
  "Instalar Kaizen": "Install Kaizen",
  "En iPhone se instala desde Safari:": "On iPhone, install it from Safari:",
  "Para instalarla en Android:": "To install it on Android:",
  "Busca «Instalar» en el menú de tu navegador (en Chrome y Edge aparece junto a la barra de direcciones).": "Look for \"Install\" in your browser menu (in Chrome and Edge it appears next to the address bar).",
  "Toca el botón Compartir (el cuadro con la flecha hacia arriba).": "Tap the Share button (the square with the up arrow).",
  "Elige «Agregar a pantalla de inicio».": "Choose \"Add to Home Screen\".",
  "Toca «Agregar». Ábrela desde su ícono.": "Tap \"Add\". Open it from its icon.",
  "Abre el menú ⋮ de Chrome.": "Open Chrome's ⋮ menu.",
  "Elige «Instalar aplicación» o «Agregar a pantalla de inicio».": "Choose \"Install app\" or \"Add to Home screen\".",
  "Actividad no encontrada": "Activity not found",
  "Misión no encontrada": "Quest not found",
  "El archivo no es un respaldo válido.": "The file is not a valid backup.",
  "Al respaldo le faltan datos (historial o actividades).": "The backup is missing data (history or activities).",
  "La misión aún no está cumplida": "The quest is not complete yet",
  "Ya reclamaste esta misión": "You already claimed this quest",
  "El jefe sigue en pie": "The boss is still standing",
  "Ya reclamaste este jefe": "You already claimed this boss",
  "No te alcanzan las monedas": "You don't have enough coins",
  "Recompensa no encontrada": "Reward not found",
  "Cupón no encontrado": "Coupon not found",
  "Artículo no encontrado": "Item not found",
  "Ya lo tienes": "You already have it",
  "Aún no lo tienes": "You don't have it yet",
  "Esa pieza no se vende": "That piece isn't for sale",
  "Ya la tienes": "You already have it",
  "Pieza no encontrada": "Piece not found",
  "Aún no tienes esa pieza": "You don't have that piece yet",
  "Esa pieza no va en ese espacio": "That piece doesn't go in that slot",
  "Ya lo marcaste hoy": "You already checked it today",
  "Este reto ya lo hiciste hoy": "You already did this challenge today",
  "Solo puedes guardar 2 escudos": "You can only store 2 shields",
  "Archivo inválido": "Invalid file",
  'Idioma cambiado': 'Language changed',
  'Expedición de la semana': 'Weekly expedition',
  'Elige una guardiana y una ruta. Las actividades de su stat esta semana la hacen avanzar. Si no llega, vuelve sin botín y sin castigo.': 'Choose a guardian and a route. Her stat\'s activities this week move her forward. If she doesn\'t make it, she comes back without loot and without penalty.',
  '🛡️ Ruta segura': '🛡️ Safe route', '⚔️ Ruta arriesgada': '⚔️ Risky route', '{n} actividades esta semana': '{n} activities this week',
  'Enviar a {name}': 'Send {name}', 'Elige una guardiana': 'Choose a guardian', '{name} ya volvió de {world}': '{name} is back from {world}',
  '¡{name} volvió de {world} con el botín!': '{name} came back from {world} with the loot!', '{name} explora {world}': '{name} is exploring {world}',
  '{n} de {total} actividades de {stat}': '{n} of {total} {stat} activities', 'Puedes enviar otra expedición el lunes.': 'You can send another expedition on Monday.',
  'Recibir +{n} 🪙': 'Collect +{n} 🪙', 'Vuelve mañana: queda 1 día.': 'Back tomorrow: 1 day left.', 'Vuelve el domingo: quedan {n} días.': 'Back on Sunday: {n} days left.',
  'Postales de expediciones': 'Expedition postcards', '¡{name} volvió con el botín!': '{name} came back with the loot!',
  'Guardamos una postal de {world} en tu álbum.': 'We saved a postcard from {world} in your album.', 'Genial': 'Great',
  '🧭 ¡{name} salió de expedición!': '🧭 {name} set off on an expedition!',
  '{name} volvió de la expedición: recibe el botín en Misiones': '{name} is back from the expedition: collect the loot in Quests',
  'Una actividad de {stat} más y {name} vuelve con el botín': 'One more {stat} activity and {name} comes back with the loot',
  'Expedición no válida': 'Invalid expedition', 'Ya hay una expedición esta semana': 'There\'s already an expedition this week',
  'La expedición todavía no vuelve': 'The expedition isn\'t back yet', 'Ya recibiste este botín': 'You already collected this loot',
  '¿Cómo se registra?': 'How do you log it?', 'Un toque': 'One tap', 'Contador': 'Counter', 'Temporizador': 'Timer', 'Meta: {n}': 'Goal: {n}',
  'La XP es la misma: se gana una vez al llegar a la meta o al terminar el tiempo.': 'Same XP: you earn it once when you reach the goal or the time is up.',
  'vasos': 'glasses', '{n} min': '{n} min', '{name}: {n} de {goal}': '{name}: {n} of {goal}', '¿Cambiar de temporizador?': 'Switch timer?',
  '«{name}» sigue contando. Si empiezas otro, ese se cancela sin XP.': '"{name}" is still running. If you start another, that one is canceled without XP.',
  'Empezar este': 'Start this one', 'Al terminar se registra solo: +{xp} XP. Puedes cerrar esta hoja; el tiempo sigue corriendo.': 'When it ends it logs itself: +{xp} XP. You can close this sheet; the time keeps running.',
  'Seguir': 'Keep going', 'Temporizador cancelado': 'Timer canceled', 'Ya cumpliste la meta de hoy': 'You already reached today\'s goal',
  '{n} por semana': '{n} per week', '✓ Meta de la semana': '✓ Weekly goal', '{n} de {total} esta semana': '{n} of {total} this week',
  'Para hoy': 'For today', '¿Cuándo?': 'When?', 'Cuando pueda': 'Whenever I can', 'Días fijos': 'Set days', 'Veces por semana': 'Times per week',
  'Aparecerá en «Para hoy» los días que toca. Un día fuera de agenda nunca cuenta como falta.': 'It will show up in "For today" on the days it\'s due. A day off the schedule never counts as missed.',
  '🎯 Meta de la semana cumplida: {name} {n}/{n}': '🎯 Weekly goal reached: {name} {n}/{n}', '📅 {name}: {n} de {total} esta semana': '📅 {name}: {n} of {total} this week', 'Hoy +{n} XP': 'Today +{n} XP',
  '{title}: qué hace cada cosa': '{title}: what each thing does', 'Entendido': 'Got it', 'Saltar': 'Skip', 'Terminar': 'Finish', 'PV': 'HP',
  'Logro: {name}': 'Achievement: {name}', '{stat} nivel {lv}': '{stat} level {lv}',
  '🐣 ¡Tu huevo eclosionó! Ponle nombre en su ficha': '🐣 Your egg hatched! Name it on its card', '✨ {name} evolucionó a la forma {n}': '✨ {name} evolved to form {n}',
};
