// =====================================================================
// Instalación de la app (PWA). Lógica pura: decide qué mostrar según el
// dispositivo. La pantalla vive en app.js.
//
//   - Android / escritorio (Chrome, Edge): el navegador avisa con el evento
//     `beforeinstallprompt`; se guarda y se dispara con un botón propio.
//   - iPhone / iPad (Safari): no existe ese evento; solo se puede explicar
//     el camino "Compartir → Agregar a pantalla de inicio".
//   - Ya instalada: se detecta por el modo de pantalla.
// =====================================================================

export const isIOS = ua => /iPad|iPhone|iPod/.test(ua || '') || (/Macintosh/.test(ua || '') && /Mobile/.test(ua || ''));
export const isAndroid = ua => /Android/i.test(ua || '');

/**
 * @param {{ standalone: boolean, hasPrompt: boolean, ua: string }} env
 * @returns {{ kind: 'installed'|'prompt'|'ios'|'android-menu'|'other', title: string, steps?: string[], button?: string }}
 */
export function installInfo({ standalone, hasPrompt, ua }) {
  if (standalone) return { kind: 'installed', title: 'Kaisen está instalada en este dispositivo ✓' };
  if (hasPrompt) return { kind: 'prompt', title: 'Instala Kaisen para abrirla como una app, a pantalla completa y sin conexión.', button: 'Instalar Kaisen' };
  if (isIOS(ua)) return {
    kind: 'ios',
    title: 'En iPhone se instala desde Safari:',
    steps: ['Toca el botón Compartir (el cuadro con la flecha hacia arriba).', 'Elige «Agregar a pantalla de inicio».', 'Toca «Agregar». Ábrela desde su ícono.'],
  };
  if (isAndroid(ua)) return {
    kind: 'android-menu',
    title: 'Para instalarla en Android:',
    steps: ['Abre el menú ⋮ de Chrome.', 'Elige «Instalar aplicación» o «Agregar a pantalla de inicio».'],
  };
  return { kind: 'other', title: 'Busca «Instalar» en el menú de tu navegador (en Chrome y Edge aparece junto a la barra de direcciones).' };
}

/** ¿La app se está ejecutando ya como app instalada? */
export function isStandalone(win = globalThis) {
  return !!(win.matchMedia?.('(display-mode: standalone)').matches
    || win.matchMedia?.('(display-mode: fullscreen)').matches
    || win.navigator?.standalone === true);
}
