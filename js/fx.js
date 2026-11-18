// =====================================================================
// Efectos en canvas: brasas de energía que suben detrás del personaje
// y la explosión de chispas al subir de nivel. Sin librerías.
// =====================================================================

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function fit(canvas) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const r = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, r.width * dpr);
  canvas.height = Math.max(1, r.height * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: r.width, h: r.height };
}

/** Brasas que flotan hacia arriba. Devuelve { set({color, amount}), boost() }. */
export function embers(canvas) {
  let color = '#ffd23f', target = 14, parts = [], raf = 0, last = 0, boostUntil = 0;
  let { ctx, w, h } = fit(canvas);
  const spawn = (anywhere) => ({
    x: Math.random() * w,
    y: anywhere ? Math.random() * h : h + 10,
    r: 1 + Math.random() * 2.6,
    vy: 18 + Math.random() * 42,
    sway: Math.random() * Math.PI * 2,
    life: 0, max: 3 + Math.random() * 4,
  });
  function frame(t) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (t - last) / 1000 || 0); last = t;
    const boosting = t < boostUntil;
    const want = boosting ? target * 4 : target;
    while (parts.length < want) parts.push(spawn(false));
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    parts = parts.filter(p => p.life < p.max && p.y > -20);
    for (const p of parts) {
      p.life += dt;
      p.y -= p.vy * dt * (boosting ? 3 : 1);
      p.sway += dt * 2;
      const x = p.x + Math.sin(p.sway) * 10;
      const a = Math.min(1, p.life * 2) * (1 - p.life / p.max);
      const g = ctx.createRadialGradient(x, p.y, 0, x, p.y, p.r * 5);
      g.addColorStop(0, '#fff'); g.addColorStop(.25, color); g.addColorStop(1, 'transparent');
      ctx.globalAlpha = a; ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, p.y, p.r * 5, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  const start = () => { if (!raf && !reduced()) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  // Solo se anima cuando la escena está en pantalla (ahorra batería).
  new IntersectionObserver(([e]) => (e.isIntersecting && !document.hidden ? start() : stop())).observe(canvas);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  addEventListener('resize', () => ({ ctx, w, h } = fit(canvas)));
  for (let i = 0; i < target; i++) parts.push(spawn(true));
  return {
    set(opts) { if (opts.color) color = opts.color; if (opts.amount) target = opts.amount; },
    boost(ms = 900) { boostUntil = performance.now() + ms; },
  };
}

/** Explosión de chispas (subida de nivel). Devuelve una función para detenerla. */
export function sparks(canvas, colors) {
  if (reduced()) return () => {};
  const { ctx, w, h } = fit(canvas);
  const cx = w / 2, cy = h * .55;
  const mk = (burst) => {
    const a = Math.random() * Math.PI * 2, s = burst ? 250 + Math.random() * 650 : 60 + Math.random() * 160;
    return {
      x: burst ? cx : Math.random() * w, y: burst ? cy : h + 10,
      vx: burst ? Math.cos(a) * s : (Math.random() - .5) * 40, vy: burst ? Math.sin(a) * s : -s * 2,
      len: 8 + Math.random() * 22, life: 0, max: burst ? .9 + Math.random() * .8 : 2 + Math.random() * 2,
      c: colors[(Math.random() * colors.length) | 0], burst,
    };
  };
  let parts = Array.from({ length: 140 }, () => mk(true)), raf = 0, last = performance.now(), on = true;
  function frame(t) {
    if (!on) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (t - last) / 1000); last = t;
    if (parts.length < 60) parts.push(mk(false));
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    parts = parts.filter(p => p.life < p.max);
    for (const p of parts) {
      p.life += dt;
      if (p.burst) { p.vx *= .97; p.vy = p.vy * .97 + 300 * dt; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      const sp = Math.hypot(p.vx, p.vy) || 1;
      ctx.globalAlpha = 1 - p.life / p.max;
      ctx.strokeStyle = p.c; ctx.lineWidth = 3; ctx.shadowColor = p.c; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx / sp * p.len, p.y - p.vy / sp * p.len); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  }
  raf = requestAnimationFrame(frame);
  return () => { on = false; cancelAnimationFrame(raf); ctx.clearRect(0, 0, w, h); };
}
