// =====================================================================
// Tarjetas para compartir: dibuja una imagen en un <canvas> (cielo,
// ilustración, título) y la manda por la hoja de compartir del teléfono.
// No usa servidor: la imagen se genera en tu dispositivo.
// =====================================================================

const W = 1080, H = 1350;

const load = src => new Promise((res, rej) => {
  const img = new Image();
  img.onload = () => res(img);
  img.onerror = () => rej(new Error('No se pudo cargar ' + src));
  img.src = src;
});

function cover(ctx, img, x, y, w, h) {
  const s = Math.max(w / img.width, h / img.height);
  const dw = img.width * s, dh = img.height * s;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function wrap(ctx, text, maxWidth) {
  const lines = []; let line = '';
  for (const word of String(text).split(/\s+/)) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function impact(ctx, text, x, y, { size, fill = '#ffd23f', shadow = '#ff3b4e', stroke = 14 }) {
  ctx.font = `${size}px Bangers, "Arial Black", Impact, sans-serif`;
  ctx.lineJoin = 'round';
  ctx.fillStyle = shadow; ctx.fillText(text, x + size * 0.06, y + size * 0.07);
  ctx.strokeStyle = '#000'; ctx.lineWidth = stroke; ctx.strokeText(text, x, y);
  ctx.fillStyle = fill; ctx.fillText(text, x, y);
}

/**
 * @param {object} o { kicker, title, sub, art, footer, accent }
 *   art: ruta de la ilustración (personajes, jefe, mascota…)
 * @returns {Promise<Blob>} imagen PNG
 */
export async function makeCard({ kicker = '', title, sub = '', art, footer = '', accent = '#ff6a13', dimArt = false }) {
  await Promise.all([document.fonts?.load('100px Bangers'), document.fonts?.load('900 40px Nunito')].filter(Boolean)).catch(() => {});
  const [sky, pic] = await Promise.all([load(getComputedStyle(document.documentElement).getPropertyValue('--world').match(/url\("?([^")]+)/)?.[1] || 'art/worlds/atardecer.webp'), load(art)]);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');

  // Fondo: cielo + líneas de velocidad + viñeta
  cover(ctx, sky, 0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2, H * 0.52); ctx.globalAlpha = 0.16; ctx.fillStyle = '#fff';
  for (let i = 0; i < 40; i++) {
    ctx.rotate((Math.PI * 2) / 40);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-22, -1400); ctx.lineTo(22, -1400); ctx.fill();
  }
  ctx.restore();
  const glow = ctx.createRadialGradient(W / 2, H * 0.55, 60, W / 2, H * 0.55, 620);
  glow.addColorStop(0, accent + 'cc'); glow.addColorStop(1, 'transparent');
  ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';

  // Ilustración, apoyada abajo
  const maxW = W * 0.96, maxH = H * 0.62;
  const s = Math.min(maxW / pic.width, maxH / pic.height);
  const pw = pic.width * s, ph = pic.height * s;
  if (dimArt) ctx.filter = 'grayscale(1) brightness(.75)';
  ctx.drawImage(pic, (W - pw) / 2, H - ph - 150, pw, ph);
  ctx.filter = 'none';

  // Degradados para que el texto se lea
  let g = ctx.createLinearGradient(0, 0, 0, 520);
  g.addColorStop(0, 'rgba(8,6,18,.92)'); g.addColorStop(1, 'rgba(8,6,18,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, 520);
  g = ctx.createLinearGradient(0, H - 380, 0, H);
  g.addColorStop(0, 'rgba(8,6,18,0)'); g.addColorStop(0.55, 'rgba(8,6,18,.92)'); g.addColorStop(1, '#0e0c1b');
  ctx.fillStyle = g; ctx.fillRect(0, H - 380, W, 380);

  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  if (kicker) {
    ctx.font = '900 38px Nunito, sans-serif'; ctx.fillStyle = '#fff';
    ctx.fillText(kicker.toUpperCase().split('').join(' '), W / 2, 96);
  }
  ctx.save();
  ctx.translate(W / 2, 0); ctx.rotate(-0.035);
  let size = 150;
  ctx.font = `${size}px Bangers, "Arial Black", Impact, sans-serif`;
  let lines = wrap(ctx, title.toUpperCase(), W - 140);
  while (lines.length > 3 && size > 80) { size -= 12; ctx.font = `${size}px Bangers, "Arial Black", Impact, sans-serif`; lines = wrap(ctx, title.toUpperCase(), W - 140); }
  lines.forEach((ln, i) => impact(ctx, ln, 0, 240 + i * size * 0.95, { size }));
  ctx.restore();

  if (sub) {
    ctx.font = '900 46px Nunito, sans-serif'; ctx.fillStyle = '#fff';
    ctx.shadowColor = '#000'; ctx.shadowBlur = 14;
    wrap(ctx, sub, W - 160).slice(0, 2).forEach((ln, i) => ctx.fillText(ln, W / 2, H - 150 + i * 56));
    ctx.shadowBlur = 0;
  }
  ctx.font = '60px Bangers, "Arial Black", sans-serif';
  const brandW = ctx.measureText('KAISEN').width;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff'; ctx.fillText('KAI', 60, H - 44);
  ctx.fillStyle = '#ffd23f'; ctx.fillText('SEN', 60 + ctx.measureText('KAI').width, H - 44);
  if (footer) {
    ctx.textAlign = 'right'; ctx.font = '900 34px Nunito, sans-serif'; ctx.fillStyle = '#c9c3e6';
    ctx.fillText(footer, W - 60, H - 50, W - 160 - brandW);
  }
  return new Promise(res => c.toBlob(res, 'image/png'));
}

/** Comparte la tarjeta (o la descarga si el navegador no puede compartir archivos). */
export async function shareCard(blob, { text = '', filename = 'kaisen.png' } = {}) {
  const file = new File([blob], filename, { type: 'image/png' });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text });
      return 'shared';
    }
  } catch (err) {
    if (err.name === 'AbortError') return 'cancelled';
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'downloaded';
}
