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
    '<b>Lo básico de hoy</b> (agua, dormir, comer…) se marca con un toque, una vez al día.',
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
  { view: 'home', sel: '#basicsRow', title: 'Lo básico de hoy', text: 'Agua, dormir, comer bien… Se marcan una vez al día.' },
  { view: 'home', sel: '#bossMini', title: 'Jefe del mes', text: 'Todo lo que registras le hace daño. Su reto pega ×3.' },
  { view: 'home', sel: '#petMini', title: 'Tu mascota', text: 'Nace y crece con los días que registras algo.' },
  { view: 'home', sel: '.tab[data-view="quests"]', title: 'Misiones', text: 'El jefe, las misiones de la semana y tus tareas únicas.' },
  { view: 'home', sel: '.tab[data-view="shop"]', title: 'Tienda', text: 'Cambia tus monedas por premios reales que tú eliges.' },
  { view: 'home', sel: '.tab[data-view="achievements"]', title: 'Progreso', text: 'Logros, stats y tus guardianas, que te dan más XP y monedas al evolucionar.' },
  { view: 'home', sel: '#helpBtn', title: '¿Dudas?', text: 'Toca ? en cualquier pantalla para ver qué hace cada cosa o repetir este tour.' },
];
