// =====================================================================
// Guías de cada sección, tour y significado de Kaizen (solo textos).
// =====================================================================

export const KAIZEN_MEANING = {
  title: '¿Qué es Kaizen?',
  kanji: '改善',
  short: 'Mejorar un poco cada día.',
  body: [
    '<b>Kaizen</b> (改善) es una palabra japonesa: <b>改</b> «cambio» y <b>善</b> «bueno». Significa <b>mejora continua</b>.',
    'La idea es avanzar un poco cada día en lugar de esperar un gran cambio de golpe. Diez minutos hoy valen más que un plan perfecto para mañana.',
    'Por eso aquí no necesitas un día perfecto: cada cosa pequeña que haces cuenta, se acumula y hace crecer a tu héroe.',
  ],
};

// Guía por pantalla: título y 3 puntos cortos.
export const GUIDES = {
  home: { title: 'Inicio', points: [
    'Cuando hagas algo bueno en tu vida real, toca <b>Registrar actividad</b> o uno de los accesos rápidos. Si te equivocas, toca <b>Deshacer</b>.',
    '<b>Para hoy</b> muestra lo que toca según los días o la meta semanal de cada hábito (se elige al editarlo). <b>Lo básico de hoy</b> (agua, dormir, comer…) se marca con un toque, una vez al día.',
    'La tarjeta del <b>jefe</b> muestra su reto de hoy; la <b>mascota</b> crece con cada día que registras algo.',
  ] },
  quests: { title: 'Misiones', points: [
    'El <b>jefe del mes</b> recibe daño con todo lo que registras: su stat débil pega ×2 y su reto pega ×3. Si pasa un día sin golpes, se recupera un poco; cumplir su reto te da <b>Defensa</b> para el día siguiente.',
    'Las <b>misiones semanales</b> cambian cada lunes y dan XP extra.',
    'Las <b>misiones únicas</b> son tareas que haces una sola vez (una cita, un trámite).',
  ] },
  shop: { title: 'Tienda', points: [
    'Ganas <b>monedas</b> con la XP de tus actividades, el cofre de cada día y los logros.',
    'Las <b>recompensas</b> son premios reales que tú eliges. Las grandes pueden llevar un <b>reto</b>: se desbloquean al cumplirlo.',
    'También puedes comprar <b>escudos de racha</b>, equipo y títulos.',
  ] },
  achievements: { title: 'Progreso', points: [
    '<b>Logros</b>: insignias que ganas al avanzar. Cada una da monedas.',
    '<b>Stats</b>: cada stat tiene una guardiana que evoluciona al subir de nivel y te da <b>Afinidad</b>: más XP y monedas en las actividades de su stat.',
    '<b>Historial</b>: todo lo que registraste. Puedes deshacer cualquier registro.',
  ] },
  gear: { title: 'Equipo', points: [
    'Cada pieza da un % extra de XP en su stat.',
    'Toca un espacio para ver qué piezas tienes y equiparlas.',
    'Las piezas épicas se ganan al derrotar jefes.',
  ] },
  settings: { title: 'Ajustes', points: [
    '<b>Perfil</b>: tu nombre, tu héroe y su look. Cambiarlo no toca tu progreso: todos los héroes ganan la misma XP.',
    '<b>Actividades</b>: crea, edita o agrega hábitos de la lista.',
    '<b>Respaldo</b>: guarda tu progreso en un archivo para no perderlo si cambias de teléfono.',
  ] },
};
GUIDES.guardians = GUIDES.achievements;
GUIDES.history = GUIDES.achievements;

// Pasos del tour. `sel` es lo que se resalta; si no está visible se omite.
export const TOUR = [
  { view: 'home', sel: '#heroStage', title: 'Tu héroe', text: 'Sube de nivel con lo que haces en la vida real. Cada día te dice una frase para arrancar.' },
  { view: 'home', sel: '#logMainBtn', title: 'Registrar', text: '¿Hiciste algo bueno? Regístralo aquí. Un toque y listo.' },
  { view: 'home', sel: '#planRow', title: 'Para hoy', text: 'Lo que toca hoy según tus días fijos o tu meta de la semana: «2 de 3 esta semana».' },
  { view: 'home', sel: '#basicsRow', title: 'Lo básico de hoy', text: 'Agua, dormir, comer bien… Se marcan una vez al día.' },
  { view: 'home', sel: '#bossMini', title: 'Jefe del mes', text: 'Todo lo que registras le hace daño. Su reto pega ×3.' },
  { view: 'home', sel: '#petMini', title: 'Tu mascota', text: 'Nace y crece con los días que registras algo.' },
  { view: 'home', sel: '.tab[data-view="quests"]', title: 'Misiones', text: 'El jefe, las misiones de la semana y tus tareas únicas.' },
  { view: 'home', sel: '.tab[data-view="shop"]', title: 'Tienda', text: 'Cambia tus monedas por premios reales que tú eliges.' },
  { view: 'home', sel: '.tab[data-view="achievements"]', title: 'Progreso', text: 'Logros, stats y tus guardianas, que te dan más XP y monedas al evolucionar.' },
  { view: 'home', sel: '#helpBtn', title: '¿Dudas?', text: 'Toca ? en cualquier pantalla para ver qué hace cada cosa o repetir este tour.' },
];

// ---------------------------------------------------------------------
// English
// ---------------------------------------------------------------------
import { getLang } from './i18n.js';

const KAIZEN_MEANING_EN = {
  title: 'What is Kaizen?', kanji: '改善', short: 'Get a little better every day.',
  body: [
    '<b>Kaizen</b> (改善) is a Japanese word: <b>改</b> "change" and <b>善</b> "good". It means <b>continuous improvement</b>.',
    'The idea is to move forward a little every day instead of waiting for one big change. Ten minutes today beat a perfect plan for tomorrow.',
    'That\'s why you don\'t need a perfect day here: every small thing you do counts, adds up and makes your hero grow.',
  ],
};
const GUIDES_EN = {
  home: { title: 'Home', points: [
    'When you do something good in real life, tap <b>Log activity</b> or one of the shortcuts. If you make a mistake, tap <b>Undo</b>.',
    '<b>For today</b> shows what\'s due based on each habit\'s days or weekly goal (set it when editing). <b>Today\'s basics</b> (water, sleep, food…) are checked with one tap, once a day.',
    'The <b>boss</b> card shows today\'s challenge; your <b>pet</b> grows with every day you log something.',
  ] },
  quests: { title: 'Quests', points: [
    'The <b>boss of the month</b> takes damage from everything you log: its weak stat hits ×2 and its challenge hits ×3. If a day goes by with no hits, it recovers a little; doing its challenge gives you <b>Defense</b> for the next day.',
    '<b>Weekly quests</b> reset every Monday and give extra XP.',
    '<b>One-time quests</b> are tasks you do once (an appointment, an errand).',
  ] },
  shop: { title: 'Shop', points: [
    'You earn <b>coins</b> from your activities\' XP, the daily chest and achievements.',
    '<b>Rewards</b> are real prizes you choose. Big ones can have a <b>challenge</b>: they unlock when you complete it.',
    'You can also buy <b>streak shields</b>, gear and titles.',
  ] },
  achievements: { title: 'Progress', points: [
    '<b>Achievements</b>: badges you earn as you progress. Each one gives coins.',
    '<b>Stats</b>: each stat has a guardian who evolves as it levels up and gives you <b>Affinity</b>: more XP and coins for that stat\'s activities.',
    '<b>History</b>: everything you logged. You can undo any entry.',
  ] },
  gear: { title: 'Gear', points: [
    'Each piece gives extra % XP in its stat.',
    'Tap a slot to see your pieces and equip them.',
    'Epic pieces are earned by defeating bosses.',
  ] },
  settings: { title: 'Settings', points: [
    '<b>Profile</b>: your name, your hero and their look. Changing it doesn\'t touch your progress: every hero earns the same XP.',
    '<b>Activities</b>: create, edit or add habits from the list.',
    '<b>Backup</b>: save your progress to a file so you don\'t lose it if you change phones.',
  ] },
};
GUIDES_EN.guardians = GUIDES_EN.achievements;
GUIDES_EN.history = GUIDES_EN.achievements;
const TOUR_EN = [
  'Levels up with what you do in real life. Every day it gives you a line to get going.',
  'Did something good? Log it here. One tap and done.',
  'What\'s due today based on your set days or weekly goal: "2 of 3 this week".',
  'Water, sleep, eating well… Checked once a day.',
  'Everything you log damages it. Its challenge hits ×3.',
  'Hatches and grows with the days you log something.',
  'The boss, this week\'s quests and your one-time tasks.',
  'Trade your coins for real prizes you choose.',
  'Achievements, stats and your guardians, who give you more XP and coins as they evolve.',
  'Tap ? on any screen to see what each thing does or repeat this tour.',
];
const TOUR_TITLES_EN = ['Your hero', 'Log', 'For today', 'Today\'s basics', 'Boss of the month', 'Your pet', 'Quests', 'Shop', 'Progress', 'Questions?'];

export const kaizenMeaning = () => (getLang() === 'en' ? KAIZEN_MEANING_EN : KAIZEN_MEANING);
export const guideFor = view => (getLang() === 'en' ? GUIDES_EN : GUIDES)[view] || (getLang() === 'en' ? GUIDES_EN : GUIDES).home;
export const tourSteps = () => TOUR.map((st, i) => (getLang() === 'en' ? { ...st, title: TOUR_TITLES_EN[i], text: TOUR_EN[i] } : st));
