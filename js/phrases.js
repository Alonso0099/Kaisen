// =====================================================================
// Frases del día: el héroe te anima, cada guardiana habla de su propósito
// y cada jefe se burla. Textos finales de GPT (entrega T-04). Se elige
// una por día, la misma durante todo el día.
// =====================================================================

// Del héroe, según su cualidad. Hablan en plural: el héroe y el jugador son un equipo.
export const HERO_LINES = {
  titan: [
    "Planta los pies. Hoy levantamos lo que esté a nuestro alcance.",
    "Podemos bajar el peso y seguir entrenando.",
    "Empecemos por el esfuerzo que sí cabe en este día.",
    "Hagamos espacio para recuperar el aliento.",
    "Si nos tiembla el pulso, probemos un paso más pequeño.",
    "Ese primer intento ya nos enseñó dónde poner los pies.",
    "Lo que hoy pide las dos manos merece su tiempo.",
  ],
  relampago: [
    "Izamos las velas con el viento que hay.",
    "Elige un rumbo. Podemos corregirlo en el aire.",
    "Con un minuto basta para soltar amarras.",
    "Probemos la ruta corta. También lleva a algún lugar.",
    "Si cambia el viento, cambiamos de rumbo.",
    "Saquemos la brújula. ¿Qué te dan ganas de explorar?",
    "Abramos el mapa por donde lo dejamos.",
  ],
  estratega: [
    "Pongamos una pregunta en el centro del mapa.",
    "Si el plan es largo, marquemos la primera casilla.",
    "Probemos una versión pequeña y veamos qué nos enseña.",
    "Cambiemos una sola pieza y observemos qué pasa.",
    "Si esta puerta se atasca, busquemos otra entrada.",
    "Anotemos lo que funcionó. Mañana nos servirá de pista.",
    "Antes de llenar la página, elijamos la primera línea.",
  ],
  sabio: [
    "Tomemos aire. Hay espacio para elegir con calma.",
    "Dejemos pasar el ruido y volvamos a lo que tenemos delante.",
    "Busquemos un lugar tranquilo para empezar.",
    "Si hay demasiadas ramas, sigamos una hasta el tronco.",
    "Podemos sentir mucho y movernos despacio.",
    "Hagamos una pausa para escuchar qué necesitamos hoy.",
    "Demos a una sola cosa toda nuestra atención.",
  ],
  guardian: [
    "Busquemos una promesa que podamos cuidar hoy.",
    "Reparemos una cosa pequeña. Empecemos por la que tienes a mano.",
    "Si la pieza se calienta demasiado, la dejamos enfriar.",
    "Hoy también podemos cuidarnos con el mismo esmero.",
    "Midamos la promesa con el tiempo que de verdad tenemos.",
    "Antes del siguiente golpe, ajustemos la pieza.",
    "Lo que cuidamos a diario aguanta mejor el paso del tiempo.",
  ],
  implacable: [
    "Repitamos un movimiento hasta que se sienta familiar.",
    "Dejemos listo el primer paso para mañana.",
    "Si cambia el día, ajustemos la práctica.",
    "Hagamos una repetición con toda la atención.",
    "Volvamos a la práctica que ya conocemos.",
    "Busquemos la señal que nos recuerde empezar.",
    "Cerremos la sesión mientras todavía nos queda aire.",
  ],
};

// De cada guardiana, sobre el propósito de su stat.
export const GUARDIAN_LINES = {
  fuerza: [
    "Empuja, levanta o estira. Elige cómo mover tu cuerpo hoy.",
    "Elige una carga que puedas mover con control.",
    "Baja el peso con la misma atención con que lo levantaste.",
    "Usa una versión más fácil del movimiento si hoy te sirve.",
    "Recupera el aliento entre esfuerzos.",
    "Fíjate en qué movimiento se siente más estable hoy.",
  ],
  resistencia: [
    "Elige un ritmo que puedas sostener un buen rato.",
    "Un tramo corto también suma al camino.",
    "Baja el ritmo en la subida y recupera el aliento.",
    "Si hoy tienes menos tiempo, elige una vuelta más corta.",
    "Mira cuánto has recorrido antes de elegir el siguiente tramo.",
    "Descansa cuando lo necesites. El sendero sigue ahí.",
  ],
  intelecto: [
    "Lee una página y quédate con una idea.",
    "Escribe una pregunta que quieras explorar.",
    "Explica con tus palabras algo que aprendiste hoy.",
    "Prueba lo que leíste en un ejemplo sencillo.",
    "Dibuja cómo se conectan dos ideas.",
    "Marca dónde dejaste la lectura para retomarla con facilidad.",
  ],
  sabiduria: [
    "Antes de responder, date una respiración.",
    "Ponle nombre a lo que sientes. Puedes empezar por una palabra.",
    "Elige dónde quieres poner tu atención durante este minuto.",
    "Si una decisión puede esperar, dale un poco de espacio.",
    "Observa qué cambia cuando haces una cosa a la vez.",
    "Pregúntate qué necesitas antes de decidir qué sigue.",
  ],
  vinculo: [
    "Un «me acordé de ti» también es una forma de estar cerca.",
    "Pregunta cómo le fue a alguien y dale tiempo para responder.",
    "Pide compañía si hoy te vendría bien.",
    "Pon en palabras un detalle que valoras de alguien.",
    "Comparte un rato sin mirar el teléfono.",
    "A veces cuidar un vínculo empieza por decir lo que necesitas.",
  ],
  hogar: [
    "Deja a mano lo que vas a usar mañana.",
    "Empieza por despejar una superficie pequeña.",
    "Dale un lugar a eso que siempre terminas buscando.",
    "Revisa un gasto y decide si te sirvió para lo que querías.",
    "Si te queda margen, aparta un poco para algo que te importa.",
    "Ordena un rincón para que tu próxima tarea sea más fácil.",
  ],
};

// De cada jefe: variantes que se alternan con su burla principal (BOSSES.taunt).
export const BOSS_LINES = {
  pereza: [
    "\"Mi sofá tiene un imán. Pruébalo con los dos pies arriba.\"",
    "\"La manta y yo ya votamos. Aquí se queda todo el mundo.\"",
    "\"Estirarse para alcanzar el control remoto cuenta, ¿verdad?\"",
  ],
  procrastinacion: [
    "\"Moví el plazo a mañana. Luego hablamos de qué mañana.\"",
    "\"Tengo un calendario entero dedicado a empezar después.\"",
    "\"Reservé una hora para decidir cuándo vamos a empezar.\"",
  ],
  desorden: [
    "\"Si el montón llega al techo, ya cuenta como estantería.\"",
    "\"Las llaves están bajo un papel. ¿Cuál? Gran pregunta.\"",
    "\"Te guardé un sitio en la silla. Debajo de la ropa.\"",
  ],
  estres: [
    "\"Mi lista de urgencias tiene una lista de urgencias.\"",
    "\"Le puse «urgente» hasta al vaso de agua.\"",
    "\"¿Respirar? Dame un segundo para meterlo en la agenda.\"",
  ],
  distraccion: [
    "\"Parpadea dos veces y te cargo otros diez videos.\"",
    "\"Te traje un video sobre cómo dejar de ver videos.\"",
    "\"Tu próxima pausa tiene sonido, subtítulos y reproducción automática.\"",
  ],
  soledad: [
    "\"Ensayemos ese «hola» ocho veces más. Tengo toda la tarde.\"",
    "\"Archivé tu saludo bajo «algún día». Ahí cabe de todo.\"",
    "\"Puse una capa de niebla entre el «hola» y el botón de enviar.\"",
  ],
  multitarea: [
    "\"Con tantas cabezas, alguien debe acordarse de qué estábamos haciendo.\"",
    "\"Tengo tres agendas y todas dicen «a la vez».\"",
    "\"Una pestaña por cabeza. Y otra por si acaso.\"",
  ],
  perfeccionismo: [
    "\"Ya está listo. Solo falta pulir el botón de «entregar».\"",
    "\"¿Me prestas una regla? Ese margen tiene medio milímetro de libertad.\"",
    "\"La versión final se llama «final_final_ahora_sí». Ya voy por la décima.\"",
  ],
  inercia: [
    "\"Calentemos motores mañana. Hoy hace un frío delicioso.\"",
    "\"El primer paso está congelado. Propongo admirarlo desde aquí.\"",
    "\"Un pie fuera de la cueva y ya empieza el deshielo. Qué imprudencia.\"",
  ],
  desvelo: [
    "\"Tengo ofertas de madrugada. La primera hora perdida va por mi cuenta.\"",
    "\"La luna todavía está despierta. Gran argumento, ¿verdad?\"",
    "\"¿Cerrar la app? Justo iba a mostrarte algo que dura diecisiete minutos.\"",
  ],
};

// Al volver después de faltar (cualquier contexto de regreso).
export const BACK_LINES = [
  "¡Qué bueno verte! Tu progreso sigue aquí.",
  "Volviste. Puedes retomar desde donde lo dejaste.",
  "Tu progreso sigue intacto. Elige por dónde quieres seguir hoy."
];

/** Número estable para un texto (para elegir la frase del día). */
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
/** Elige una frase del día: la misma durante todo el día, distinta al siguiente. */
export function lineOfDay(list, key, day) {
  if (!list?.length) return '';
  return list[hash(`${key}:${day}`) % list.length];
}

// ---------------------------------------------------------------------
// Inglés (traducción provisional de Claude; GPT puede revisarla)
// ---------------------------------------------------------------------
import { getLang } from './i18n.js';

const HERO_LINES_EN = {
  titan: [
    'Plant your feet. Today we lift whatever is within reach.',
    'We can lower the weight and keep training.',
    'Let\'s start with the effort that fits in this day.',
    'Let\'s make room to catch our breath.',
    'If our grip shakes, let\'s try a smaller step.',
    'That first try already taught us where to put our feet.',
    'What takes both hands today deserves its time.',
  ],
  relampago: [
    'We raise the sails with the wind we have.',
    'Pick a heading. We can correct it in the air.',
    'One minute is enough to cast off.',
    'Let\'s try the short route. It leads somewhere too.',
    'If the wind changes, we change course.',
    'Let\'s take out the compass. What do you feel like exploring?',
    'Let\'s open the map where we left it.',
  ],
  estratega: [
    'Let\'s put one question at the center of the map.',
    'If the plan is long, let\'s check the first box.',
    'Let\'s try a small version and see what it teaches us.',
    'Let\'s change a single piece and watch what happens.',
    'If this door is stuck, let\'s find another way in.',
    'Let\'s note what worked. Tomorrow it\'ll be a clue.',
    'Before filling the page, let\'s choose the first line.',
  ],
  sabio: [
    'Let\'s take a breath. There\'s room to choose calmly.',
    'Let\'s let the noise pass and come back to what\'s in front of us.',
    'Let\'s find a quiet place to begin.',
    'If there are too many branches, let\'s follow one to the trunk.',
    'We can feel a lot and still move slowly.',
    'Let\'s pause to listen to what we need today.',
    'Let\'s give one single thing all our attention.',
  ],
  guardian: [
    'Let\'s find a promise we can keep today.',
    'Let\'s repair one small thing. Start with the one at hand.',
    'If the piece gets too hot, we let it cool.',
    'Today we can also take care of ourselves with the same care.',
    'Let\'s size the promise to the time we really have.',
    'Before the next strike, let\'s adjust the piece.',
    'What we care for daily stands the test of time.',
  ],
  implacable: [
    'Let\'s repeat one move until it feels familiar.',
    'Let\'s get the first step ready for tomorrow.',
    'If the day changes, let\'s adjust the practice.',
    'Let\'s do one rep with full attention.',
    'Let\'s go back to the practice we already know.',
    'Let\'s find the cue that reminds us to start.',
    'Let\'s end the session while we still have breath left.',
  ],
};
const GUARDIAN_LINES_EN = {
  fuerza: ['Push, lift or stretch. Choose how to move your body today.', 'Choose a load you can move with control.', 'Lower the weight with the same care you lifted it.', 'Use an easier version of the move if it helps today.', 'Catch your breath between efforts.', 'Notice which move feels most stable today.'],
  resistencia: ['Choose a pace you can hold for a good while.', 'A short stretch still adds to the path.', 'Slow down on the climb and catch your breath.', 'If you have less time today, choose a shorter loop.', 'Look how far you\'ve come before choosing the next stretch.', 'Rest when you need to. The trail is still there.'],
  intelecto: ['Read one page and keep one idea.', 'Write down a question you want to explore.', 'Explain in your own words something you learned today.', 'Try what you read on a simple example.', 'Draw how two ideas connect.', 'Mark where you stopped reading so it\'s easy to pick up.'],
  sabiduria: ['Before you answer, take a breath.', 'Name what you feel. One word is a start.', 'Choose where to put your attention for this minute.', 'If a decision can wait, give it some space.', 'Notice what changes when you do one thing at a time.', 'Ask yourself what you need before deciding what\'s next.'],
  vinculo: ['A "thought of you" is also a way to be close.', 'Ask someone how their day went and give them time to answer.', 'Ask for company if it would help today.', 'Put into words something you value about someone.', 'Share some time without looking at your phone.', 'Sometimes caring for a bond starts with saying what you need.'],
  hogar: ['Leave what you\'ll use tomorrow within reach.', 'Start by clearing one small surface.', 'Give a home to that thing you\'re always looking for.', 'Review one expense and decide if it served its purpose.', 'If you have some margin, set a little aside for something that matters.', 'Tidy a corner so your next task is easier.'],
};
const BOSS_LINES_EN = {
  pereza: ['"My couch has a magnet. Try it with both feet up."', '"The blanket and I already voted. Everyone stays here."', '"Reaching for the remote counts, right?"'],
  procrastinacion: ['"I moved the deadline to tomorrow. Which tomorrow? We\'ll see."', '"I have a whole calendar devoted to starting later."', '"I booked an hour to decide when we\'ll start."'],
  desorden: ['"If the pile reaches the ceiling, it counts as a shelf."', '"The keys are under a paper. Which one? Great question."', '"I saved you a seat on the chair. Under the clothes."'],
  estres: ['"My urgent list has its own urgent list."', '"I even marked the glass of water as urgent."', '"Breathe? Give me a second to put it on the schedule."'],
  distraccion: ['"Blink twice and I\'ll load ten more videos."', '"I brought you a video about how to stop watching videos."', '"Your next break has sound, subtitles and autoplay."'],
  soledad: ['"Let\'s rehearse that "hi" eight more times. I have all afternoon."', '"I filed your greeting under "someday". Everything fits there."', '"I put a layer of fog between the "hi" and the send button."'],
  multitarea: ['"With so many heads, someone must remember what we were doing."', '"I have three planners and they all say "at the same time"."', '"One tab per head. And one more just in case."'],
  perfeccionismo: ['"It\'s ready. I just need to polish the "submit" button."', '"Can I borrow a ruler? That margin has half a millimeter of freedom."', '"The final version is called "final_final_really". I\'m on the tenth."'],
  inercia: ['"Let\'s warm up tomorrow. Today it\'s deliciously cold."', '"The first step is frozen. I propose admiring it from here."', '"One foot out of the cave and the thaw begins. How reckless."'],
  desvelo: ['"I have late-night deals. The first lost hour is on me."', '"The moon is still awake. Great argument, right?"', '"Close the app? I was just about to show you something seventeen minutes long."'],
};
const BACK_LINES_EN = [
  'So good to see you! Your progress is still here.',
  'You\'re back. You can pick up where you left off.',
  'Your progress is intact. Choose where you want to continue today.',
];

const en = () => getLang() === 'en';
export const heroLines = id => (en() ? HERO_LINES_EN : HERO_LINES)[id] || [];
export const guardianLines = stat => (en() ? GUARDIAN_LINES_EN : GUARDIAN_LINES)[stat] || [];
export const bossLines = id => (en() ? BOSS_LINES_EN : BOSS_LINES)[id] || [];
export const backLines = () => (en() ? BACK_LINES_EN : BACK_LINES);
