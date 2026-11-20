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
export const bossName = b => (lang === 'en' && BOSSES_EN[b.id]) || b.name;
export const bossShort = b => bossName(b).split(',')[0];
export const bossTaunt = b => (lang === 'en' && TAUNT_EN[b.id]) || b.taunt;
export const achName = a => (lang === 'en' && ACH_EN[a.id]) || a.name;
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
  'tpl-dormir': 'Sleep 7+ hours', 'tpl-agua': 'Drink my glasses of water', 'bas-fruta': 'Eat fruit or vegetables', 'bas-desayuno': 'Eat a good breakfast',
  'bas-aire': 'Get some fresh air or sun', 'bas-cama': 'Make the bed', 'bas-cuidado': 'Shower and get ready',
  'tpl-correr': 'Run', 'tpl-yoga': 'Yoga or stretching', 'tpl-nadar': 'Swim', 'tpl-deporte': 'Play a sport',
  'tpl-meditar': 'Meditate or breathe 5 min', 'tpl-diario': 'Write 3 good things about today', 'tpl-pausa-redes': 'One hour off social media', 'tpl-reflexion': 'Pray or reflect',
  'tpl-ahorro': 'Save something today', 'tpl-sin-gastos': 'A day without impulse buys', 'tpl-finanzas': 'Review my spending', 'tpl-limpiar': 'Clean or tidy up', 'tpl-plantas': 'Care for plants or pets',
  'tpl-llamar': 'Call someone I love', 'tpl-ayudar': 'Help someone', 'tpl-voluntariado': 'Volunteer',
  'tpl-idioma': 'Practice a language', 'tpl-curso': 'Make progress on a course',
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
  sabio:      { title: 'Calm and focus',           blurb: 'Among so many branches, knows where to put attention.' },
  guardian:   { title: 'Character and care',       blurb: 'What is promised gets done. What breaks gets repaired.' },
  implacable: { title: 'Discipline and precision', blurb: 'Practices the same move until it comes out silent.' },
};

const ACH_EN = {
  'first-log': 'First step', 'level-2': 'First level!', 'level-5': 'Warrior', 'level-10': 'Elite', 'streak-3': 'Warming up',
  'streak-7': 'Unstoppable week', 'streak-30': 'Iron will', 'book': 'Bookworm', 'quest-1': 'Quest complete', 'all-stats': 'Balance',
  'stat-5': 'Specialist', 'big-day': 'Explosive day', 'logs-100': 'A hundred feats', 'weekly-1': 'Week complete', 'weekly-all': 'Perfect week',
  'boss-1': 'Boss hunter', 'boss-6': 'Scourge of bosses', 'pet-adult': 'Legendary breeder',
};

const TAUNT_EN = {
  pereza: '"Five more minutes…"', procrastinacion: '"Start tomorrow, not today."', desorden: '"You can put that away later."',
  estres: '"You have no time for anything!"', distraccion: '"Just one more video…"', soledad: '"Better stay alone."',
  multitarea: '"Almost done? Let\'s open three more things."', perfeccionismo: '"If it has a crack, throw it all away."',
  inercia: '"The first step weighs more than the whole mountain."', desvelo: '"Give me twenty more minutes. We\'ll see tomorrow."',
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
  'Elige un héroe que te represente o que encarne algo que quieres cultivar.': 'Choose a hero who represents you or something you want to grow.',
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
  'Tu progreso sigue intacto. Elige por dónde quieres seguir hoy.': 'Your progress is intact. Choose where you want to continue today.',

  // Tarjetas para compartir
  'Preparando tarjeta…': 'Preparing card…', 'Tarjeta guardada como imagen': 'Card saved as an image', '❌ No se pudo crear la tarjeta': '❌ Couldn\'t create the card',
  'Nivel {lv} · Racha {n}': 'Level {lv} · Streak {n}', 'Rango {letter} · {title}': 'Rank {letter} · {title}', '¡Nivel {lv}!': 'Level {lv}!',
  '{xp} XP · racha de {days} · {ach} logros': '{xp} XP · {days} streak · {ach} achievements', '{n} día': '{n} day', '{n} días': '{n} days',
  '¡Voy en nivel {lv} en Kaizen!': 'I\'m at level {lv} in Kaizen!', 'Jefe derrotado': 'Boss defeated', '¡Vencí a {boss}!': 'I beat {boss}!',
  '¡Derroté a {boss} en Kaizen!': 'I defeated {boss} in Kaizen!', 'Cupón ganado con esfuerzo': 'A coupon earned with effort',
  'Vale por una recompensa. ¡Me lo gané!': 'Good for one reward. I earned it!', 'Me gané este cupón: {name}': 'I earned this coupon: {name}',
  'Idioma cambiado': 'Language changed', 'Hoy +{n} XP': 'Today +{n} XP',
  '{title}: qué hace cada cosa': '{title}: what each thing does', 'Entendido': 'Got it', 'Saltar': 'Skip', 'Terminar': 'Finish', 'PV': 'HP',
  'Logro: {name}': 'Achievement: {name}', '{stat} nivel {lv}': '{stat} level {lv}',
  '🐣 ¡Tu huevo eclosionó! Ponle nombre en su ficha': '🐣 Your egg hatched! Name it on its card', '✨ {name} evolucionó a la forma {n}': '✨ {name} evolved to form {n}',
};
