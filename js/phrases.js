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
