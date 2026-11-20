// =====================================================================
// Frases del día: el héroe te anima, cada guardiana habla de su propósito
// y cada jefe se burla. Textos provisionales; la versión final es el
// pedido T-04 a GPT (ver COORDINACION.md). Se elige una por día.
// =====================================================================

// Del héroe, según su cualidad. Hablan en primera persona del plural:
// el héroe y el jugador son un equipo.
export const HERO_LINES = {
  titan: [
    'No hace falta tener ganas. Hace falta dar el primer paso.',
    'Lo que hoy pesa, mañana lo vamos a levantar sin pensarlo.',
    'Un poco más fuerte que ayer. Eso es todo lo que pido.',
    'Cuando cueste, planta los pies. Ahí empieza la fuerza.',
    'Hoy no buscamos un día perfecto. Buscamos un día con algo hecho.',
  ],
  relampago: [
    'Empieza antes de pensarlo dos veces. Ya vamos ganando.',
    'Dos minutos de algo valen más que una hora de planear.',
    'El viento está a favor. Iza las velas y arranca.',
    'No esperes el momento ideal. Hagamos el momento.',
    'Lo primero que hagas hoy marca el rumbo. Que sea bueno.',
  ],
  estratega: [
    'Una cosa a la vez. La más importante, primero.',
    '¿Qué aprendemos hoy? Una pregunta basta para empezar.',
    'Si te pierdes, vuelve a mirar el mapa. Siempre hay un camino.',
    'Pequeños pasos bien elegidos ganan cualquier partida.',
    'Hoy no hay que saberlo todo. Solo un poco más que ayer.',
  ],
  sabio: [
    'Respira. Elige una sola cosa y dale toda tu atención.',
    'No todo es urgente. Lo importante sí merece tu calma.',
    'Un minuto de pausa puede cambiar el resto del día.',
    'Hoy basta con estar presente en lo que haces.',
    'Entre tanto ruido, escucha lo que de verdad quieres.',
  ],
  guardian: [
    'Lo que prometiste, cúmplelo. Aunque sea en pequeño.',
    'Cada promesa cumplida es un golpe de martillo a tu carácter.',
    'Si algo se rompió ayer, hoy lo reparamos.',
    'Cuidar a los tuyos empieza por cuidarte a ti.',
    'No hace falta hacerlo todo. Hace falta no rendirse.',
  ],
  implacable: [
    'La disciplina es hacer lo que dijiste, aunque nadie mire.',
    'Mismo movimiento, cada día. Así se vuelve silencioso.',
    'Hoy no negociamos con la excusa. Hacemos una parte.',
    'La constancia no hace ruido, pero lo cambia todo.',
    'Un día más en el camino. Eso es ser imparable.',
  ],
};

// De cada guardiana, sobre el propósito de su stat.
export const GUARDIAN_LINES = {
  fuerza: [
    'La fuerza no es no cansarse: es seguir un poco más.',
    'Tu cuerpo recuerda cada esfuerzo. Ninguno se pierde.',
    'Mover el cuerpo también mueve el ánimo.',
    'Hoy, aunque sea diez minutos. Eso también cuenta.',
  ],
  resistencia: [
    'Paso a paso se cruza cualquier montaña.',
    'Descansar bien también es entrenar.',
    'El ritmo constante llega más lejos que la prisa.',
    'Cuando quieras parar, da un paso más y luego decide.',
  ],
  intelecto: [
    'Cada página te abre una puerta nueva.',
    'Aprender un poco cada día es la forma más lenta y más segura de saber mucho.',
    'Una buena pregunta vale más que mil respuestas.',
    'Lo que entiendes hoy nadie te lo quita.',
  ],
  sabiduria: [
    'Antes de responder, respira. La calma también es sabiduría.',
    'No tienes que tener todo resuelto. Solo el siguiente paso.',
    'Escucharte es el principio de entenderte.',
    'Elegir qué no hacer también es una decisión sabia.',
  ],
  vinculo: [
    'Un mensaje a tiempo puede alegrarle el día a alguien.',
    'Los lazos se cuidan con detalles pequeños y frecuentes.',
    'Pedir ayuda también es una forma de acercarse.',
    'Escuchar de verdad es un regalo que pocos dan.',
  ],
  hogar: [
    'Un espacio en orden aclara la mente.',
    'Cada moneda que guardas hoy es tranquilidad mañana.',
    'Cuidar tu casa es cuidarte a ti.',
    'Cinco minutos de orden valen más que una limpieza que nunca llega.',
  ],
};

// De cada jefe: además de su burla principal (BOSSES.taunt), un par más.
export const BOSS_LINES = {
  pereza:          ['"El sofá te extraña."', '"Hoy no, mejor mañana empiezas en serio."'],
  procrastinacion: ['"Todavía tienes tiempo… ¿o no?"', '"Primero revisa el teléfono, luego ya."'],
  desorden:        ['"Una cosa más en la silla no hace daño."', '"Para qué ordenar si se va a desordenar."'],
  estres:          ['"¡Todo es urgente!"', '"Si paras a respirar, pierdes."'],
  distraccion:     ['"Mira, una notificación."', '"Solo cinco minutos de scroll…"'],
  soledad:         ['"Nadie va a contestar."', '"Mejor no molestes a nadie."'],
  multitarea:      ['"¿Y si haces las tres cosas a la vez?"', '"Abre otra pestaña, total…"'],
  perfeccionismo:  ['"Si no es perfecto, no vale."', '"Mejor no lo entregues todavía."'],
  inercia:         ['"Moverse cuesta demasiado."', '"Quédate quieto, es más cómodo."'],
  desvelo:         ['"Un capítulo más."', '"Dormir es para los débiles."'],
};

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
