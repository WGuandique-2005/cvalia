'use strict';
/* ==========================================================================
   CValia — prototipo conceptual NO funcional.
   Simulación client-side para fines académicos (Laboratorio 2 — Bloque 3).
   Arquitectura: SPA con router por hash + datos ficticios en data.js.
   ========================================================================== */

/* --------------------------------------------------------------------------
   1. Utilidades
   -------------------------------------------------------------------------- */
const $ = (sel, el) => (el || document).querySelector(sel);
const $$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

const fmtDate = (iso) => {
  try { return new Intl.DateTimeFormat('es-SV', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso)); }
  catch (_) { return String(iso); }
};
const fmtTime = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
};
const fmtSize = (bytes) => {
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  if (bytes >= 1024) return Math.round(bytes / 1024) + ' KB';
  return bytes + ' B';
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Tema: la preferencia se conserva por navegador y el valor inicial se aplica
   en <head> para que la interfaz no parpadee al cargar. */
const THEME_KEY = 'cvalia_theme';
const isDarkTheme = () => document.documentElement.classList.contains('dark');
function themeToggleContent(compact) {
  const dark = isDarkTheme();
  return ic(dark ? 'sun' : 'moon', 'w-4 h-4') + (compact ? '' : '<span>' + (dark ? 'Claro' : 'Oscuro') + '</span>');
}
function themeToggle(compact) {
  const dark = isDarkTheme();
  const action = dark ? 'Activar modo claro' : 'Activar modo oscuro';
  return '<button type="button" data-action="toggle-theme" data-theme-toggle aria-pressed="' + dark + '" aria-label="' + action + '" title="' + action + '" ' +
    'class="theme-toggle inline-flex items-center justify-center gap-1.5 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors">' +
    themeToggleContent(compact) + '</button>';
}
function applyTheme(theme, persist) {
  const dark = theme === 'dark';
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  if (persist) { try { localStorage.setItem(THEME_KEY, theme); } catch (_) {} }
  $$('[data-theme-toggle]').forEach((button) => {
    const compact = !button.querySelector('span');
    const action = dark ? 'Activar modo claro' : 'Activar modo oscuro';
    button.setAttribute('aria-pressed', String(dark));
    button.setAttribute('aria-label', action);
    button.setAttribute('title', action);
    button.innerHTML = themeToggleContent(compact);
  });
  refreshIcons();
}

/* Iconos: el UMD de Lucide reemplaza <i data-lucide> por un SVG. */
const ic = (name, cls, label) =>
  '<i data-lucide="' + name + '" class="' + (cls || 'w-4 h-4') + '"' +
  (label ? ' aria-label="' + esc(label) + '" role="img"' : '') + '></i>';
function refreshIcons() { if (window.lucide && window.lucide.createIcons) window.lucide.createIcons(); }

/* --------------------------------------------------------------------------
   2. Toast y drawer (capas fijas fuera de #app)
   -------------------------------------------------------------------------- */
function toast(msg, tone) {
  const tones = {
    ok: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    warn: 'border-amber-200 bg-amber-50 text-amber-900',
    err: 'border-rose-200 bg-rose-50 text-rose-800',
    info: 'border-stone-300 bg-white text-stone-800',
  };
  const icons = { ok: 'circle-check', warn: 'triangle-alert', err: 'circle-x', info: 'info' };
  const host = $('#toasts');
  if (!host) return;
  const el = document.createElement('div');
  el.className = 'flex items-start gap-2 rounded-lg border px-3.5 py-2.5 text-sm shadow-sm max-w-xs ' + (tones[tone] || tones.info);
  el.setAttribute('role', 'status');
  el.innerHTML = ic(icons[tone] || icons.info, 'w-4 h-4 mt-0.5 shrink-0') + '<span>' + esc(msg) + '</span>';
  host.appendChild(el);
  refreshIcons();
  setTimeout(() => {
    el.style.transition = 'opacity .3s, transform .3s';
    el.style.opacity = '0';
    el.style.transform = 'translateY(4px)';
    setTimeout(() => el.remove(), 320);
  }, 3200);
}

let lastFocus = null;
let drawerCandidateId = null;
function openDrawer(html) {
  const host = $('#drawer-root');
  if (!host) return;
  lastFocus = document.activeElement;
  host.innerHTML =
    '<div class="fixed inset-0 z-50 no-print">' +
      '<div class="absolute inset-0 bg-stone-950/40" data-action="close-drawer" aria-hidden="true"></div>' +
      '<div class="drawer-in absolute inset-y-0 right-0 w-full max-w-xl bg-stone-50 border-l border-stone-200 shadow-xl flex flex-col" role="dialog" aria-modal="true" aria-label="Detalle">' +
        '<div class="flex items-center justify-between px-5 py-3.5 border-b border-stone-200 bg-white">' +
          '<span class="mono-tag">Detalle · prototipo</span>' +
          '<button type="button" class="rounded-md p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800 transition-colors" data-action="close-drawer" aria-label="Cerrar panel" data-autofocus>' + ic('x') + '</button>' +
        '</div>' +
        '<div class="flex-1 overflow-y-auto scroll-thin p-5">' + html + '</div>' +
      '</div>' +
    '</div>';
  refreshIcons();
  animateIn(host);
  const f = host.querySelector('[data-autofocus]');
  if (f) f.focus();
}
function closeDrawer() {
  const host = $('#drawer-root');
  if (host) host.innerHTML = '';
  drawerCandidateId = null;
  if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (_) {} lastFocus = null; }
}
const drawerOpen = () => !!($('#drawer-root') && $('#drawer-root').firstElementChild);

/* --------------------------------------------------------------------------
   3. Motor de evaluación (reglas del prototipo)
   -------------------------------------------------------------------------- */
const vacancyById = (id) => VACANCIES.find((v) => v.id === id) || VACANCIES[0];
const profileById = (id) => PROFILES[id] || PROFILES.ana;

const FACTORS = [
  { key: 'skills', label: 'Habilidades técnicas', weight: 40 },
  { key: 'exp', label: 'Experiencia relevante', weight: 30 },
  { key: 'edu', label: 'Formación académica', weight: 15 },
  { key: 'extra', label: 'Señales adicionales', weight: 15 },
];
const EDU_SCORE = { tecnico: 0.5, grado: 0.9, maestria: 1 };

function verdictOf(score) {
  if (score >= 75) return { key: 'alta', label: 'Recomendado para entrevista', tone: 'ok' };
  if (score >= 55) return { key: 'media', label: 'Con reservas — revisión sugerida', tone: 'warn' };
  return { key: 'baja', label: 'No recomendado para esta vacante', tone: 'err' };
}

function evaluate(profileId, vacancyId) {
  const p = profileById(profileId);
  const v = vacancyById(vacancyId);
  const have = new Map(p.skills.map((s) => [s.name.toLowerCase(), s.level]));

  let got = 0, total = 0;
  const matched = [], missing = [];
  v.reqs.forEach((r) => {
    total += r.w;
    const lv = have.get(r.skill.toLowerCase());
    if (lv) { got += r.w * LEVEL_FACTOR[lv]; matched.push({ name: r.skill, level: lv, w: r.w }); }
    else { missing.push({ name: r.skill, w: r.w }); }
  });

  const fSkills = total ? got / total : 0;
  const fExp = Math.min(1, p.years / v.expYears);
  const fEdu = EDU_SCORE[p.eduLevel] != null ? EDU_SCORE[p.eduLevel] : 0.6;
  const fExtra = Math.min(1, p.certs.length * 0.2 + (p.languages.length ? 0.1 : 0) + (p.oss ? 0.2 : 0));

  const factors = FACTORS.map((f) => {
    const val = { skills: fSkills, exp: fExp, edu: fEdu, extra: fExtra }[f.key];
    return { key: f.key, label: f.label, weight: f.weight, val: val, pts: Math.round(f.weight * val) };
  });
  const score = Math.min(100, Math.max(0, factors.reduce((a, f) => a + f.pts, 0)));

  const flags = p.flags.slice();
  const critical = missing.filter((m) => m.w >= 5);
  if (critical.length) flags.push('Brecha crítica en un requerimiento principal: ' + critical.map((m) => m.name).join(', ') + '.');
  if (p.years < v.expYears) flags.push('Experiencia (' + p.years + ' años) por debajo del rango de la vacante (' + v.expYears + ' años).');

  return {
    profileId, vacancyId,
    result: {
      score,
      verdict: verdictOf(score),
      percentile: Math.min(99, Math.max(1, Math.round(score * 1.08))),
      factors,
      matched: matched.sort((a, b) => b.w - a.w),
      missing: missing.sort((a, b) => b.w - a.w),
      extra: p.skills.map((s) => s.name).filter((n) => !v.reqs.some((r) => r.skill.toLowerCase() === n.toLowerCase())),
      flags,
    },
  };
}

function makeEval(profileId, vacancyId, opts) {
  const o = opts || {};
  const base = evaluate(profileId, vacancyId);
  const rec = {
    id: o.id || nextEvalId(),
    profileId, vacancyId,
    createdAt: o.date || new Date().toISOString(),
    fileName: o.fileName || profileById(profileId).fileName,
    source: o.source || 'ejemplo',
    result: base.result,
    decision: o.decision || null,
    trail: o.trail || [
      { ts: o.date || new Date().toISOString(), actor: 'Sistema', ev: 'Evaluación generada y auditada. Pendiente de decisión humana.' },
    ],
  };
  if (rec.decision) {
    rec.trail.push({ ts: rec.decision.at, actor: rec.decision.by, ev: 'Decisión registrada: ' + STATUS_META[rec.decision.status].label.toLowerCase() + '.' });
  }
  return rec;
}

function nextEvalId() {
  let max = 130;
  state.evals.forEach((e) => { const n = parseInt(String(e.id).replace(/\D/g, ''), 10); if (n > max) max = n; });
  return 'TS-0' + (max + 1);
}

const STATUS_META = {
  pending:   { label: 'Pendiente de decisión humana', dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-800 border-amber-200' },
  entrevista:{ label: 'Entrevista aprobada',          dot: 'bg-emerald-600', chip: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  revision:  { label: 'Segunda revisión solicitada',  dot: 'bg-teal-600', chip: 'bg-teal-50 text-teal-800 border-teal-200' },
  descartado:{ label: 'Descartado',                   dot: 'bg-rose-600', chip: 'bg-rose-50 text-rose-700 border-rose-200' },
};
function statusOf(rec) { return rec.decision ? rec.decision.status : 'pending'; }

function chipStatus(status) {
  const m = STATUS_META[status] || STATUS_META.pending;
  return '<span class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ' + m.chip + '">' +
    '<span class="w-1.5 h-1.5 rounded-full ' + m.dot + '"></span>' + esc(m.label) + '</span>';
}
function chipVerdict(v) {
  const map = {
    ok:   'bg-emerald-50 text-emerald-800 border-emerald-200',
    warn: 'bg-amber-50 text-amber-900 border-amber-200',
    err:  'bg-rose-50 text-rose-700 border-rose-200',
  };
  return '<span class="inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ' + map[v.tone] + '">' + esc(v.label) + '</span>';
}
function chipSkill(text, tone) {
  const map = {
    ok:   'bg-emerald-50 text-emerald-800 border-emerald-200',
    err:  'bg-rose-50 text-rose-700 border-rose-200',
    neutral: 'bg-stone-100 text-stone-700 border-stone-200',
  };
  return '<span class="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ' + (map[tone] || map.neutral) + '">' + esc(text) + '</span>';
}

/* --------------------------------------------------------------------------
   4. Estado + persistencia local (solo demo; se puede restablecer)
   -------------------------------------------------------------------------- */
const STORE_KEY = 'cvalia_demo_v1';
let state = { evals: [], log: [] };
const filters = { q: '', vacancy: '', status: '' };

function seedState() {
  return {
    evals: SEEDS.map((s) => makeEval(s.profileId, s.vacancyId, s)),
    log: LOG_SEED.slice(),
  };
}
function saveState() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (_) {} }
function loadState() {
  let loaded = null;
  try { loaded = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (_) {}
  if (loaded && loaded.evals && loaded.evals.length) state = loaded; else { state = seedState(); saveState(); }
}
function logEvent(actor, ev) {
  state.log.push({ ts: new Date().toISOString(), actor, ev });
  saveState();
}
function resetDemo() {
  try { localStorage.removeItem(STORE_KEY); } catch (_) {}
  state = seedState();
  saveState();
  toast('Datos de demostración restablecidos.', 'ok');
  route();
}

/* --------------------------------------------------------------------------
   5. Componentes compartidos
   -------------------------------------------------------------------------- */
function logomark(cls) {
  return '<svg viewBox="0 0 32 32" class="' + (cls || 'w-8 h-8') + '" aria-hidden="true">' +
    '<rect width="32" height="32" rx="7" fill="#0F766E"/>' +
    '<path d="M9 10.5h14M9 15h9" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>' +
    '<path d="M9 19.5h6" stroke="#99F6E4" stroke-width="2" stroke-linecap="round"/>' +
    '<circle cx="21" cy="19" r="4.6" fill="#0F766E" stroke="#5EEAD4" stroke-width="2"/>' +
    '<path d="m24.6 22.6 2.9 2.9" stroke="#5EEAD4" stroke-width="2" stroke-linecap="round"/>' +
  '</svg>';
}

function gauge(score, size, showLabel) {
  const s = size || 128, stroke = Math.max(8, Math.round(s / 13));
  const r = (s - stroke) / 2 - 1, c = 2 * Math.PI * r;
  const off = c * (1 - score / 100);
  const col = score >= 75 ? '#059669' : score >= 55 ? '#D97706' : '#E11D48';
  const fs = Math.round(s / 4.2);
  return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 ' + s + ' ' + s + '" role="img" aria-label="Puntaje ' + score + ' de 100" class="shrink-0">' +
    '<circle class="gauge-track" cx="' + s / 2 + '" cy="' + s / 2 + '" r="' + r + '" fill="none" stroke="#E7E5E4" stroke-width="' + stroke + '"/>' +
    '<circle class="gauge-ring" cx="' + s / 2 + '" cy="' + s / 2 + '" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="' + stroke + '" stroke-linecap="round" ' +
      'stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + c.toFixed(1) + '" data-target="' + off.toFixed(1) + '" ' +
      'transform="rotate(-90 ' + s / 2 + ' ' + s / 2 + ')"/>' +
    (showLabel === false ? '' :
      '<text class="gauge-score" x="50%" y="50%" text-anchor="middle" dominant-baseline="central" font-family="JetBrains Mono, monospace" font-size="' + fs + '" font-weight="600" fill="#1C1917">' +
        '<tspan data-count="' + score + '">0</tspan></text>') +
  '</svg>';
}

function bar(label, weight, pts, max, val, tone) {
  const col = tone || 'bg-teal-600';
  return '<div>' +
    '<div class="flex items-baseline justify-between gap-3 mb-1.5">' +
      '<span class="text-sm font-medium text-stone-800">' + esc(label) +
        ' <span class="text-stone-400 font-normal">· ' + weight + '%</span></span>' +
      '<span class="font-mono text-xs text-stone-500">' + pts + ' / ' + max + ' pts</span>' +
    '</div>' +
    '<div class="h-2 rounded-full bg-stone-200 overflow-hidden">' +
      '<div class="bar-fill h-full rounded-full ' + col + '" style="width:0%" data-target="' + Math.round(val * 100) + '"></div>' +
    '</div>' +
  '</div>';
}

function footer() {
  return '<footer class="mt-auto border-t border-stone-200 bg-white no-print">' +
    '<div class="mx-auto max-w-6xl px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">' +
      '<div class="flex items-center gap-2.5">' + logomark('w-7 h-7') +
        '<div><p class="text-sm font-semibold text-stone-800">' + BRAND.name + '</p>' +
        '<p class="text-xs text-stone-500">' + esc(BRAND.version) + '</p></div>' +
      '</div>' +
      '<p class="text-xs text-stone-500 max-w-md sm:text-right">Prototipo académico — Laboratorio 2 · Bloque 3 · Universidad Gerardo Barrios. Simulación con datos ficticios; no recolecta ni procesa datos personales reales.</p>' +
    '</div>' +
  '</footer>';
}

function demoBadge() {
  return '<span class="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-900">' +
    ic('triangle-alert', 'w-3.5 h-3.5') + 'Modo demostración · datos ficticios</span>';
}

/* Anima gauges, barras y contadores tras el render. */
function animateIn(root) {
  const scope = root || document;
  requestAnimationFrame(() => {
    $$('.gauge-ring[data-target]', scope).forEach((el) => {
      if (reduceMotion()) { el.style.strokeDashoffset = el.dataset.target; return; }
      requestAnimationFrame(() => { el.style.strokeDashoffset = el.dataset.target; });
    });
    $$('.bar-fill[data-target]', scope).forEach((el) => {
      if (reduceMotion()) { el.style.width = el.dataset.target + '%'; return; }
      requestAnimationFrame(() => { el.style.width = el.dataset.target + '%'; });
    });
    $$('[data-count]', scope).forEach((el) => {
      const target = parseInt(el.dataset.count, 10) || 0;
      if (reduceMotion() || target === 0) { el.textContent = target; return; }
      const t0 = performance.now(), dur = 900;
      const tick = (t) => {
        const k = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - k, 3);
        el.textContent = Math.round(target * eased);
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  });
}

/* --------------------------------------------------------------------------
   6. Shell de aplicación (sidebar + contenido) y shell de landing
   -------------------------------------------------------------------------- */
const NAV = [
  { key: 'evaluar', href: '#/evaluar', icon: 'upload', label: 'Nueva evaluación' },
  { key: 'candidatos', href: '#/candidatos', icon: 'users', label: 'Candidatos' },
  { key: 'cumplimiento', href: '#/cumplimiento', icon: 'scale', label: 'Cumplimiento' },
];

function sideLink(item, active) {
  const on = active === item.key;
  return '<a href="' + item.href + '" data-action="go" data-to="' + item.href + '" ' +
    'class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ' +
    (on ? 'bg-stone-100 text-stone-900 font-semibold' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900') + '">' +
    ic(item.icon, 'w-4 h-4 shrink-0') + esc(item.label) +
    (on ? '<span class="ml-auto w-1.5 h-1.5 rounded-full bg-teal-700"></span>' : '') +
  '</a>';
}

function appShell(active, title, contentHTML) {
  const nav = NAV.map((n) => sideLink(n, active)).join('');
  return '<div class="min-h-screen flex flex-col bg-stone-50">' +
    '<div class="flex flex-1 min-h-0">' +
      '<aside class="hidden md:flex w-60 shrink-0 flex-col border-r border-stone-200 bg-white no-print">' +
        '<a href="#/" data-action="go" data-to="#/" class="flex items-center gap-2.5 px-4 py-4 border-b border-stone-100">' +
          logomark('w-8 h-8') +
          '<div><p class="text-sm font-bold tracking-tight text-stone-900">' + BRAND.name + '</p>' +
          '<p class="text-[10px] text-stone-400 font-mono uppercase tracking-widest">Panel de talento</p></div>' +
        '</a>' +
        '<nav class="flex-1 p-3 space-y-1" aria-label="Principal">' + nav +
          '<div class="pt-3 mt-3 border-t border-stone-100">' +
            '<a href="#/" data-action="go" data-to="#/" class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-colors">' +
            ic('arrow-right', 'w-4 h-4 rotate-180') + 'Volver al sitio</a>' +
            '<button type="button" data-action="reset-demo" id="btn-reset" class="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-colors">' +
            ic('rotate-ccw') + '<span>Restablecer demo</span></button>' +
          '</div>' +
        '</nav>' +
        '<div class="p-4 border-t border-stone-100">' +
          '<p class="font-mono text-[10px] uppercase tracking-widest text-stone-400">Evaluaciones</p>' +
          '<p class="text-2xl font-semibold text-stone-800 mt-1" id="side-count">' + state.evals.length + '</p>' +
          '<p class="text-xs text-stone-500 mt-0.5">Candidatos evaluados en esta demo</p>' +
        '</div>' +
      '</aside>' +
      '<div class="flex-1 min-w-0 flex flex-col">' +
        '<header class="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-stone-200 no-print">' +
          '<div class="flex items-center gap-2 px-4 py-3">' + logomark('w-7 h-7') +
            '<span class="font-bold text-stone-900">' + BRAND.name + '</span>' +
            '<span class="ml-auto">' + themeToggle(true) + '</span>' + demoBadge() +
          '</div>' +
          '<nav class="flex gap-1 overflow-x-auto px-3 pb-2.5" aria-label="Principal móvil">' +
            NAV.concat([{ key: 'sitio', href: '#/', icon: 'home', label: 'Sitio' }]).map((n) => {
              const on = active === n.key;
              return '<a href="' + n.href + '" class="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium ' +
                (on ? 'bg-stone-900 text-white' : 'text-stone-600 bg-stone-100') + '">' + esc(n.label) + '</a>';
            }).join('') +
          '</nav>' +
        '</header>' +
        '<div class="hidden md:flex items-center justify-between gap-4 px-6 lg:px-8 py-3.5 border-b border-stone-200 bg-white no-print">' +
          '<h1 class="text-sm font-semibold text-stone-800">' + esc(title) + '</h1>' +
          '<div class="flex items-center gap-3">' + demoBadge() + themeToggle() +
            '<button type="button" data-action="reset-demo" class="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 transition-colors">' +
            ic('rotate-ccw', 'w-3.5 h-3.5') + 'Restablecer demo</button>' +
          '</div>' +
        '</div>' +
        '<main class="flex-1 w-full">' + contentHTML + '</main>' +
        footer() +
      '</div>' +
    '</div>' +
  '</div>';
}

/* --------------------------------------------------------------------------
   7. Vista: Landing
   -------------------------------------------------------------------------- */
function landingNav() {
  const links = [['#problema', 'El problema'], ['#flujo', 'Cómo funciona'], ['#modulos', 'Módulos'], ['#ficha', 'Ficha técnica'], ['#riesgos', 'Cumplimiento']];
  return '<header class="sticky top-0 z-40 border-b border-stone-200 bg-stone-50/90 backdrop-blur no-print">' +
    '<div class="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center gap-6">' +
      '<a href="#/" class="flex items-center gap-2.5">' + logomark('w-8 h-8') +
        '<span class="font-bold tracking-tight text-stone-900">' + BRAND.name + '</span></a>' +
      '<nav class="hidden lg:flex items-center gap-1 text-sm" aria-label="Secciones">' +
        links.map((l) => '<a href="' + l[0] + '" class="px-3 py-2 rounded-md text-stone-600 hover:text-stone-900 hover:bg-white transition-colors">' + l[1] + '</a>').join('') +
      '</nav>' +
      '<div class="ml-auto flex items-center gap-3">' + themeToggle(true) +
        '<span class="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-2.5 py-1 text-[11px] font-medium text-stone-500">' +
          '<span class="w-1.5 h-1.5 rounded-full bg-teal-600"></span>Prototipo no funcional</span>' +
        '<a href="#/evaluar" data-action="go" data-to="#/evaluar" class="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 transition-colors">' +
          'Abrir demostración ' + ic('arrow-right', 'w-4 h-4') + '</a>' +
      '</div>' +
    '</div>' +
  '</header>';
}

function heroCard() {
  const g = gauge(86, 116);
  return '<div class="relative">' +
    '<div class="dotgrid absolute -inset-8 rounded-2xl" aria-hidden="true"></div>' +
    '<div class="relative bg-white border border-stone-200 rounded-xl shadow-sm p-6 w-full max-w-sm float-soft">' +
      '<div class="flex items-center justify-between mb-4">' +
        '<p class="mono-tag">Reporte de evaluación · TS-0131</p>' +
        chipVerdict(verdictOf(86)) +
      '</div>' +
      '<div class="flex items-center gap-5">' + g +
        '<div class="text-sm space-y-1">' +
          '<p class="text-stone-500">Vacante</p>' +
          '<p class="font-semibold text-stone-900">Backend Developer · Sr</p>' +
          '<p class="text-stone-500 pt-1">Identidad</p>' +
          '<p class="font-mono text-xs text-stone-700">Protegida hasta decisión</p>' +
        '</div>' +
      '</div>' +
      '<div class="mt-5 space-y-2.5">' +
        [['Java / Spring Boot', 88], ['Docker / AWS', 62], ['Kubernetes', 40]].map((r) =>
          '<div class="flex items-center gap-3">' +
            '<span class="text-xs text-stone-600 w-36 shrink-0">' + r[0] + '</span>' +
            '<div class="flex-1 h-1.5 rounded-full bg-stone-200 overflow-hidden"><div class="bar-fill h-full rounded-full ' +
              (r[1] >= 75 ? 'bg-emerald-600' : r[1] >= 55 ? 'bg-amber-500' : 'bg-rose-500') + '" style="width:0%" data-target="' + r[1] + '"></div></div>' +
            '<span class="font-mono text-[11px] text-stone-500 w-8 text-right">' + r[1] + '%</span>' +
          '</div>').join('') +
      '</div>' +
      '<div class="mt-5 pt-4 border-t border-stone-100 flex items-center justify-between">' +
        '<span class="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-medium">' + ic('shield-check', 'w-4 h-4') + 'Sesgo auditado · datos anonimizados</span>' +
        '<span class="font-mono text-[10px] text-stone-400">AUD-2411-0187</span>' +
      '</div>' +
    '</div>' +
    '<div class="absolute -right-3 -top-4 bg-white border border-stone-200 rounded-lg shadow-sm px-3 py-2 flex items-center gap-2 text-xs font-medium text-stone-700">' +
      ic('fingerprint', 'w-4 h-4 text-teal-700') + 'Explicable por factor</div>' +
  '</div>';
}

function landingView() {
  const steps = [
    { icon: 'upload', title: 'Carga del CV', text: 'El reclutador sube el currículum en PDF y selecciona la vacante objetivo.' },
    { icon: 'shield-check', title: 'Anonimización', text: 'Nombre, contacto, género, edad y foto se remueven antes de cualquier análisis.' },
    { icon: 'scan-line', title: 'Extracción', text: 'El sistema identifica habilidades, experiencia y formación con NLP.' },
    { icon: 'gauge', title: 'Puntaje explicable', text: 'Comparación ponderada contra la vacante: desglose por factor y brechas.' },
    { icon: 'user-check', title: 'Decisión humana', text: 'El reclutador revisa, decide y firma; el sistema nunca descarta solo.' },
  ];
  const modules = [
    { tag: 'M-01', icon: 'file-text', title: 'Motor de extracción', text: 'NLP sobre el PDF: entidades de habilidades, experiencia, formación y certificaciones.' },
    { tag: 'M-02', icon: 'git-branch', title: 'Motor de matching', text: 'Clasificación ponderada: compara el perfil contra los requerimientos de la vacante.' },
    { tag: 'M-03', icon: 'eye', title: 'Panel de explicabilidad', text: 'Cada puntaje se descompone por factor y se traduce a lenguaje natural.' },
    { tag: 'M-04', icon: 'shield-check', title: 'Auditoría de sesgo', text: 'Chequeos de paridad y trazas de auditoría por evaluación, visibles para el comité.' },
    { tag: 'M-05', icon: 'fingerprint', title: 'Registro de decisiones', text: 'Toda decisión humana queda firmada con autor, fecha y nota (supervisión documentada).' },
    { tag: 'M-06', icon: 'link', title: 'Integración ATS', text: 'API prevista para sincronizar vacantes y reportes con el sistema de reclutamiento.' },
  ];
  const ficha = [
    ['Tipo de IA', 'Clasificación + scoring supervisado. No es generativa: no produce texto libre ni decide por sí sola.'],
    ['Datos de entrada', 'CV en PDF estructurado + vacante con requerimientos ponderados por el área de talento.'],
    ['Datos de referencia', 'Histórico anonimizado de decisiones de contratación, con consentimiento informado del candidato.'],
    ['Salidas', 'Puntaje 0–100, desglose por factor, brechas detectadas, observaciones y recomendación de entrevista.'],
    ['Métricas objetivo', 'Precisión top-5 ≥ 85% · paridad demográfica ≥ 0.9 · tiempo de evaluación ≤ 90 s por CV.'],
    ['Supervisión', 'Toda recomendación requiere decisión humana registrada antes de cualquier efecto sobre el candidato.'],
  ];

  return '<div class="min-h-screen flex flex-col bg-stone-50">' +
    landingNav() +
    '<main class="flex-1">' +

      /* Hero */
      '<section class="relative overflow-hidden border-b border-stone-200">' +
        '<div class="mx-auto max-w-6xl px-4 sm:px-6 py-14 lg:py-20 grid lg:grid-cols-2 gap-12 items-center">' +
          '<div>' +
            '<p class="mono-tag mb-4">Sistema de IA · Talento tecnológico</p>' +
            '<h1 class="text-4xl sm:text-5xl font-bold tracking-tight text-stone-900 text-balance">Menos corazonadas, más criterio.</h1>' +
            '<p class="mt-4 text-lg text-stone-600 leading-relaxed max-w-lg">' + esc(BRAND.name) + ' evalúa currículums para perfiles tecnológicos y devuelve un puntaje explicable, la lista de brechas y una recomendación — con la última palabra siempre en manos humanas.</p>' +
            '<div class="mt-7 flex flex-wrap items-center gap-3">' +
              '<a href="#/evaluar" data-action="go" data-to="#/evaluar" class="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 transition-colors">' +
                ic('play', 'w-4 h-4') + 'Ejecutar demostración</a>' +
              '<button type="button" data-action="sample-report" class="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-100 transition-colors">' +
                ic('eye', 'w-4 h-4') + 'Ver un reporte de ejemplo</button>' +
            '</div>' +
            '<dl class="mt-10 grid grid-cols-3 gap-4 max-w-md">' +
              [['≤ 90 s', 'por CV evaluado'], ['4 factores', 'con pesos públicos'], ['0', 'decisiones sin firma humana']].map((s) =>
                '<div><dt class="font-mono text-lg font-semibold text-stone-900">' + s[0] + '</dt>' +
                '<dd class="text-xs text-stone-500 mt-0.5 leading-snug">' + s[1] + '</dd></div>').join('') +
            '</dl>' +
          '</div>' +
          '<div class="flex justify-center lg:justify-end">' + heroCard() + '</div>' +
        '</div>' +
      '</section>' +

      /* 01 · Problema */
      '<section id="problema" class="mx-auto max-w-6xl px-4 sm:px-6 py-14 lg:py-20 scroll-mt-16">' +
        '<p class="mono-tag mb-3">01 · El problema</p>' +
        '<h2 class="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 max-w-xl text-balance">La preselección técnica es lenta, inconsistente y difícil de auditar.</h2>' +
        '<div class="mt-8 grid md:grid-cols-3 gap-4">' +
          [
            ['file-text', '250+', 'currículums en promedio por cada vacante técnica publicada.'],
            ['clock', '23 h', 'de lectura y filtrado manual por vacante antes de la primera entrevista.'],
            ['git-branch', '41%', 'de discrepancia entre dos evaluadores que revisan el mismo CV.'],
          ].map((c) =>
            '<div class="bg-white border border-stone-200 rounded-xl p-6">' +
              ic(c[0], 'w-5 h-5 text-teal-700') +
              '<p class="mt-3 font-mono text-3xl font-semibold text-stone-900">' + c[1] + '</p>' +
              '<p class="mt-1.5 text-sm text-stone-600 leading-relaxed">' + c[2] + '</p>' +
            '</div>').join('') +
        '</div>' +
        '<p class="mt-4 font-mono text-[10px] uppercase tracking-widest text-stone-400">Cifras ilustrativas del dominio del problema — no corresponden a una medición real.</p>' +
        '<p class="mt-6 max-w-2xl text-stone-600 leading-relaxed">Además, el filtrado manual expone a sesgos difíciles de detectar: afinidad con el perfil del evaluador, peso inconsciente de nombres o instituciones, y criterios que cambian entre revisores. El resultado: buenos candidatos descartados sin trazabilidad de por qué.</p>' +
      '</section>' +

      /* 02 · Flujo */
      '<section id="flujo" class="border-y border-stone-200 bg-white scroll-mt-16">' +
        '<div class="mx-auto max-w-6xl px-4 sm:px-6 py-14 lg:py-20">' +
          '<p class="mono-tag mb-3">02 · Flujo básico de uso</p>' +
          '<h2 class="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 max-w-xl text-balance">Cinco pasos, una decisión firmada.</h2>' +
          '<ol class="mt-10 grid sm:grid-cols-2 lg:grid-cols-5 gap-4">' +
            steps.map((s, i) =>
              '<li class="relative bg-stone-50 border border-stone-200 rounded-xl p-5">' +
                '<div class="flex items-center gap-2 mb-3">' +
                  '<span class="font-mono text-[10px] text-stone-400">0' + (i + 1) + '</span>' +
                  '<span class="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 border border-teal-100 text-teal-800">' + ic(s.icon, 'w-4 h-4') + '</span>' +
                '</div>' +
                '<p class="text-sm font-semibold text-stone-900">' + esc(s.title) + '</p>' +
                '<p class="mt-1.5 text-xs text-stone-600 leading-relaxed">' + esc(s.text) + '</p>' +
              '</li>').join('') +
          '</ol>' +
          '<p class="mt-6 text-sm text-stone-500 max-w-2xl">La salida esperada por evaluación: puntaje global, desglose por factor, coincidencias y brechas contra la vacante, observaciones y una recomendación que el reclutador acepta o rechaza con su firma.</p>' +
        '</div>' +
      '</section>' +

      /* 03 · Módulos */
      '<section id="modulos" class="mx-auto max-w-6xl px-4 sm:px-6 py-14 lg:py-20 scroll-mt-16">' +
        '<p class="mono-tag mb-3">03 · Módulos del sistema</p>' +
        '<h2 class="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 max-w-xl text-balance">Seis módulos, una regla: explicar y dejar rastro.</h2>' +
        '<div class="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-4">' +
          modules.map((m) =>
            '<div class="bg-white border border-stone-200 rounded-xl p-6 hover:border-stone-300 transition-colors">' +
              '<div class="flex items-center justify-between mb-4">' +
                '<span class="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-100 text-stone-700">' + ic(m.icon, 'w-4.5 h-4.5') + '</span>' +
                '<span class="font-mono text-[10px] text-stone-400 tracking-widest">' + m.tag + '</span>' +
              '</div>' +
              '<p class="text-sm font-semibold text-stone-900">' + esc(m.title) + '</p>' +
              '<p class="mt-1.5 text-sm text-stone-600 leading-relaxed">' + esc(m.text) + '</p>' +
            '</div>').join('') +
        '</div>' +
      '</section>' +

      /* 04 · Ficha técnica */
      '<section id="ficha" class="border-y border-stone-200 bg-white scroll-mt-16">' +
        '<div class="mx-auto max-w-6xl px-4 sm:px-6 py-14 lg:py-20">' +
          '<p class="mono-tag mb-3">04 · Ficha técnica</p>' +
          '<h2 class="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 max-w-xl text-balance">Qué tipo de IA es y con qué datos operaría.</h2>' +
          '<dl class="mt-8 grid md:grid-cols-2 gap-x-10 gap-y-6 max-w-4xl">' +
            ficha.map((f) =>
              '<div><dt class="mono-tag mb-1.5">' + f[0] + '</dt>' +
              '<dd class="text-sm text-stone-700 leading-relaxed">' + esc(f[1]) + '</dd></div>').join('') +
          '</dl>' +
        '</div>' +
      '</section>' +

      /* 05 · Riesgos / cumplimiento */
      '<section id="riesgos" class="mx-auto max-w-6xl px-4 sm:px-6 py-14 lg:py-20 scroll-mt-16">' +
        '<div class="rounded-xl border border-stone-200 bg-white p-6 lg:p-8 flex flex-col lg:flex-row gap-8 items-start">' +
          '<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 border border-amber-200 text-amber-800">' + ic('scale', 'w-6 h-6') + '</div>' +
          '<div class="flex-1">' +
            '<p class="mono-tag mb-2">05 · Diseño responsable</p>' +
            '<h2 class="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">Un sistema que influye en el acceso al empleo exige salvaguardas.</h2>' +
            '<div class="mt-4 grid sm:grid-cols-3 gap-3 text-sm">' +
              ['Clasificación de riesgo medio, con justificación documentada.',
               'Anonimización de datos personales antes de cada scoring.',
               'Supervisión humana registrada en el 100% de las decisiones.'].map((t) =>
                '<p class="flex gap-2 text-stone-600 leading-relaxed"><span class="text-teal-700 mt-0.5">' + ic('check', 'w-4 h-4 shrink-0') + '</span>' + esc(t) + '</p>').join('') +
            '</div>' +
            '<a href="#/cumplimiento" data-action="go" data-to="#/cumplimiento" class="mt-6 inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-100 transition-colors">' +
              'Ver el plan de cumplimiento ' + ic('arrow-right', 'w-4 h-4') + '</a>' +
          '</div>' +
        '</div>' +

        /* CTA final */
        '<div class="mt-14 rounded-xl bg-teal-900 text-white px-6 py-10 lg:px-10 lg:py-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">' +
          '<div>' +
            '<h2 class="text-2xl font-bold tracking-tight text-balance">Recorre el prototipo como si fueras el reclutador.</h2>' +
            '<p class="mt-2 text-teal-100 text-sm max-w-lg">Carga un CV (simulado), elige una vacante y observa el análisis completo: pipeline, puntaje, brechas y decisión humana.</p>' +
          '</div>' +
          '<a href="#/evaluar" data-action="go" data-to="#/evaluar" class="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-teal-900 hover:bg-teal-50 transition-colors shrink-0">' +
            ic('play', 'w-4 h-4') + 'Iniciar demostración</a>' +
        '</div>' +
      '</section>' +
    '</main>' +
    footer() +
  '</div>';
}

/* --------------------------------------------------------------------------
   8. Vista: Nueva evaluación (flujo simulado)
   -------------------------------------------------------------------------- */
const flow = { step: 'form', vacancyId: null, file: null, cancel: false };

function fileChip() {
  if (!flow.file) return '';
  const isSample = flow.file.type === 'ejemplo';
  const name = isSample ? profileById(flow.file.profileId).fileName : flow.file.name;
  const size = isSample ? '42 KB' : fmtSize(flow.file.size || 0);
  return '<div class="mt-4 flex items-center gap-3 rounded-lg border border-teal-200 bg-teal-50 px-3.5 py-3">' +
    ic('file-check', 'w-5 h-5 text-teal-800 shrink-0') +
    '<div class="min-w-0 flex-1">' +
      '<p class="text-sm font-semibold text-teal-950 truncate">' + esc(name) + '</p>' +
      '<p class="text-xs text-teal-800 mt-0.5">' + size + ' · ' + (isSample ? 'Documento de ejemplo' : 'Documento recibido (el archivo real no se procesa)') + '</p>' +
    '</div>' +
    '<button type="button" data-action="clear-file" class="rounded-md p-1.5 text-teal-800 hover:bg-teal-100 transition-colors" aria-label="Quitar documento">' + ic('x') + '</button>' +
  '</div>';
}

function vacancyOption(v) {
  const on = flow.vacancyId === v.id;
  return '<button type="button" data-action="pick-vacancy" data-vac="' + v.id + '" aria-pressed="' + on + '" ' +
    'class="w-full text-left rounded-lg border p-4 transition-all ' +
    (on ? 'border-teal-700 ring-2 ring-teal-700/20 bg-teal-50/50' : 'border-stone-200 bg-white hover:border-stone-300') + '">' +
    '<div class="flex items-center justify-between gap-2">' +
      '<span class="text-sm font-semibold text-stone-900">' + esc(v.title) + '</span>' +
      '<span class="font-mono text-[10px] uppercase tracking-wider text-stone-400">' + esc(v.seniority) + '</span>' +
    '</div>' +
    '<p class="text-xs text-stone-500 mt-1">' + esc(v.summary) + '</p>' +
    '<div class="mt-2.5 flex flex-wrap gap-1.5">' +
      v.reqs.slice(0, 4).map((r) => chipSkill(r.skill, 'neutral')).join('') +
      (v.reqs.length > 4 ? '<span class="font-mono text-[10px] text-stone-400 self-center">+' + (v.reqs.length - 4) + ' req.</span>' : '') +
    '</div>' +
  '</button>';
}

function evalFormHTML() {
  return appShell('evaluar', 'Nueva evaluación',
    '<div class="mx-auto max-w-6xl px-4 sm:px-6 py-8">' +
      '<div class="max-w-2xl mb-8">' +
        '<h2 class="text-xl font-bold tracking-tight text-stone-900">Evaluar un candidato</h2>' +
        '<p class="mt-1.5 text-sm text-stone-600 leading-relaxed">Selecciona el CV y la vacante objetivo. El prototipo simula el pipeline completo: extracción, anonimización, matching, puntaje y auditoría.</p>' +
      '</div>' +
      '<div class="grid lg:grid-cols-5 gap-6">' +
        '<section class="lg:col-span-3 bg-white border border-stone-200 rounded-xl p-6" aria-label="Cargar currículum">' +
          '<div class="flex items-center justify-between mb-4"><h3 class="text-sm font-semibold text-stone-900">1 · Currículum</h3><span class="font-mono text-[10px] text-stone-400">PASO 1 DE 2</span></div>' +
          '<label id="dropzone" class="group flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 px-6 py-10 text-center cursor-pointer hover:border-teal-600 hover:bg-teal-50/40 transition-colors" ' +
            'tabindex="0" role="button" aria-label="Cargar currículum en PDF">' +
            '<span class="flex h-12 w-12 items-center justify-center rounded-full bg-white border border-stone-200 text-teal-700 group-hover:scale-105 transition-transform">' + ic('upload', 'w-5 h-5') + '</span>' +
            '<span class="text-sm font-medium text-stone-700">Arrastra el PDF aquí o haz clic para seleccionarlo</span>' +
            '<span class="text-xs text-stone-400">Solo simulación: el archivo no sale de tu navegador</span>' +
            '<input id="file-input" type="file" accept=".pdf,application/pdf" class="sr-only" />' +
          '</label>' +
          '<div id="file-slot">' + fileChip() + '</div>' +
          '<div class="mt-5 pt-5 border-t border-stone-100">' +
            '<p class="text-xs text-stone-500 mb-2.5">¿Sin archivo a mano? Usa un CV de ejemplo:</p>' +
            '<div class="flex flex-wrap gap-2">' +
              SAMPLE_CVS.map((id) => '<button type="button" data-action="pick-sample" data-profile="' + id + '" class="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:border-teal-600 hover:text-teal-800 transition-colors">' + ic('file-text', 'w-3.5 h-3.5') + esc(profileById(id).fileName) + '</button>').join('') +
            '</div>' +
          '</div>' +
        '</section>' +
        '<section class="lg:col-span-2" aria-label="Seleccionar vacante">' +
          '<div class="bg-white border border-stone-200 rounded-xl p-6">' +
            '<div class="flex items-center justify-between mb-4"><h3 class="text-sm font-semibold text-stone-900">2 · Vacante objetivo</h3><span class="font-mono text-[10px] text-stone-400">PASO 2 DE 2</span></div>' +
            '<div class="space-y-3">' + VACANCIES.map(vacancyOption).join('') + '</div>' +
          '</div>' +
        '</section>' +
      '</div>' +
      '<div class="mt-6 flex flex-col sm:flex-row sm:items-center gap-4">' +
        '<button type="button" id="btn-start" data-action="start-analysis" disabled ' +
          'class="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-40 disabled:pointer-events-none transition-all">' +
          ic('scan-line', 'w-4 h-4') + 'Iniciar análisis simulado</button>' +
        '<p id="start-hint" class="text-sm text-stone-500">Selecciona un CV y una vacante para habilitar el análisis.</p>' +
      '</div>' +
      '<p class="mt-4 flex items-center gap-1.5 text-xs text-stone-400 max-w-lg">' + ic('info', 'w-3.5 h-3.5 shrink-0') +
        'El prototipo no procesa el archivo real: al iniciar, se simula el análisis sobre un perfil de ejemplo con el mismo pipeline conceptual.</p>' +
    '</div>');
}

function bindEvalForm(root) {
  const dz = $('#dropzone', root), input = $('#file-input', root);
  if (!dz || !input) return;
  const setFile = (f) => {
    if (!f) return;
    const ok = /\.pdf$/i.test(f.name) || f.type === 'application/pdf';
    flow.file = ok ? { type: 'archivo', name: f.name, size: f.size } : null;
    if (ok) flow.sampleId = SAMPLE_CVS[Math.floor(Math.random() * SAMPLE_CVS.length)];
    if (!ok) { toast('El sistema espera un PDF. Para la demo, usa un CV de ejemplo.', 'warn'); }
    $('#file-slot').innerHTML = fileChip();
    refreshIcons();
    updateStartState();
  };
  input.addEventListener('change', () => { if (input.files && input.files[0]) setFile(input.files[0]); input.value = ''; });
  dz.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
  ['dragover', 'dragenter'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('border-teal-600', 'bg-teal-50/60'); }));
  ['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('border-teal-600', 'bg-teal-50/60'); }));
  dz.addEventListener('drop', (e) => { const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) setFile(f); });
  updateStartState();
}

function updateStartState() {
  const btn = $('#btn-start'), hint = $('#start-hint');
  if (!btn) return;
  const ready = !!(flow.file && flow.vacancyId);
  btn.disabled = !ready;
  hint.textContent = ready
    ? 'Listo: se simulará el análisis con el pipeline completo.'
    : flow.file ? 'Falta seleccionar la vacante objetivo.' : 'Selecciona un CV y una vacante para habilitar el análisis.';
}

/* --- pipeline en ejecución --- */
const PIPELINE = [
  { key: 'ingesta', icon: 'file-text', label: 'Ingesta y extracción de texto',
    logs: ['Leyendo documento: {file}', 'PDF → texto plano: 2 páginas, 412 palabras', 'Estructura detectada: encabezados, 2 bloques de experiencia, 1 bloque educativo'] },
  { key: 'anon', icon: 'shield-check', label: 'Anonimización de datos personales',
    logs: ['Campos removidos: nombre, correo, teléfono, género, edad, fotografía', 'Sustitución por identificador: {id}', 'La identidad queda custodiada y se revela solo tras decisión humana'] },
  { key: 'entidades', icon: 'scan-line', label: 'Reconocimiento de entidades (NLP)',
    logs: ['Habilidades detectadas: {skills} · Experiencias: 2 · Certificaciones: {certs}', 'Nivel estimado por habilidad mediante taxonomía interna', 'Señales adicionales: contribuciones open source e idiomas'] },
  { key: 'matching', icon: 'gauge', label: 'Matching y cálculo de puntaje',
    logs: ['Comparando contra vacante: {vac} ({n} requerimientos ponderados)', 'Factores: habilidades 40% · experiencia 30% · formación 15% · señales 15%', 'Puntaje global calculado'] },
  { key: 'auditoria', icon: 'eye', label: 'Auditoría de sesgo y reporte',
    logs: ['Chequeo de paridad: el score no considera atributos protegidos — sin señales', 'Traza de auditoría generada: AUD-{aud}', 'Reporte explicable listo para revisión humana'] },
];

function pipelineHTML(profile, vac) {
  return appShell('evaluar', 'Análisis en curso',
    '<div class="mx-auto max-w-6xl px-4 sm:px-6 py-8">' +
      '<div class="max-w-2xl mb-8">' +
        '<h2 class="text-xl font-bold tracking-tight text-stone-900">Analizando candidato</h2>' +
        '<p class="mt-1.5 text-sm text-stone-600">Vacante: <span class="font-medium text-stone-800">' + esc(vac.title) + ' · ' + esc(vac.seniority) + '</span> · Documento: <span class="font-mono text-xs">' + esc(flow.file ? (flow.file.type === 'ejemplo' ? profile.fileName : flow.file.name) : profile.fileName) + '</span></p>' +
      '</div>' +
      '<div class="bg-white border border-stone-200 rounded-xl overflow-hidden">' +
        '<div class="h-1 bg-stone-100"><div id="pipe-bar" class="bar-fill h-full bg-teal-600 rounded-full" style="width:0%" data-target="0"></div></div>' +
        '<div class="grid lg:grid-cols-2 gap-0">' +
          '<div class="p-6 border-b lg:border-b-0 lg:border-r border-stone-100">' +
            '<ol id="pipe-stages" class="space-y-1" aria-label="Etapas del análisis"></ol>' +
            '<div class="mt-5 flex items-center gap-3">' +
              '<button type="button" data-action="cancel-analysis" class="inline-flex items-center gap-2 rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors">' + ic('x', 'w-4 h-4') + 'Cancelar</button>' +
              '<span class="text-xs text-stone-400">Simulación a fines demostrativos</span>' +
            '</div>' +
          '</div>' +
          '<div class="p-6 bg-stone-950 min-h-[320px]">' +
            '<div class="flex items-center gap-2 mb-3"><span class="w-2 h-2 rounded-full bg-emerald-500"></span><span class="font-mono text-[10px] uppercase tracking-widest text-stone-500">Pipeline · registro en vivo</span></div>' +
            '<div id="pipe-log" class="font-mono text-xs leading-6 h-64 overflow-y-auto scroll-thin text-stone-300" aria-live="polite"></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>');
}

function stageRow(st, status) {
  const map = {
    pending: '<span class="text-stone-300">' + ic('clock', 'w-4 h-4') + '</span>',
    running: '<span class="text-teal-700">' + ic('loader', 'w-4 h-4 spinner') + '</span>',
    done: '<span class="text-emerald-600">' + ic('circle-check', 'w-4 h-4') + '</span>',
  };
  return '<li class="flex items-center gap-3 rounded-lg px-3 py-2.5 ' +
    (status === 'running' ? 'bg-teal-50 border border-teal-100' : status === 'done' ? 'opacity-80' : 'opacity-50') + '">' +
    map[status] +
    '<span class="text-sm ' + (status === 'done' ? 'text-stone-500 line-through decoration-stone-300' : 'text-stone-800 font-medium') + '">' + esc(st.label) + '</span>' +
    (status === 'running' ? '<span class="ml-auto font-mono text-[10px] uppercase tracking-widest text-teal-700">procesando</span>' : '') +
  '</li>';
}

function appendLog(msg) {
  const el = $('#pipe-log');
  if (!el) return;
  const line = document.createElement('div');
  line.className = 'log-line';
  line.innerHTML = '<span class="text-teal-400/80">' + esc(fmtTime(flow.clock)) + '</span> <span class="text-stone-300">' + esc(msg) + '</span>';
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
  flow.clock = new Date(flow.clock.getTime() + 300 + Math.random() * 500);
}

async function runAnalysis() {
  const profile = profileById(flow.file && flow.file.type === 'ejemplo' ? flow.file.profileId : flow.sampleId || 'ana');
  const vac = vacancyById(flow.vacancyId);
  flow.step = 'running'; flow.cancel = false;
  flow.clock = new Date();

  render(pipelineHTML(profile, vac));

  const nReqs = vac.reqs.length;
  const audId = '2411-0' + (100 + Math.floor(Math.random() * 800));
  const tmp = makeEval(profile.id, flow.vacancyId, { fileName: flow.file && flow.file.type === 'archivo' ? flow.file.name : profile.fileName });
  const fill = (s) => s
    .replace('{file}', flow.file && flow.file.type === 'archivo' ? flow.file.name : profile.fileName)
    .replace('{id}', tmp.id)
    .replace('{skills}', String(tmp.result.matched.length + tmp.result.extra.length))
    .replace('{certs}', String(profile.certs.length))
    .replace('{vac}', vac.title + ' · ' + vac.seniority)
    .replace('{n}', String(nReqs))
    .replace('{aud}', audId);

  const stagesEl = $('#pipe-stages');
  const drawStages = (idx, status) => {
    stagesEl.innerHTML = PIPELINE.map((st, i) => stageRow(st, i < idx ? 'done' : i === idx ? status : 'pending')).join('');
    refreshIcons();
  };

  let done = 0;
  for (let i = 0; i < PIPELINE.length; i++) {
    if (flow.cancel) { flow.step = 'form'; route(); toast('Análisis cancelado.', 'info'); return; }
    const st = PIPELINE[i];
    drawStages(i, 'running');
    for (const line of st.logs) {
      if (flow.cancel) { flow.step = 'form'; route(); toast('Análisis cancelado.', 'info'); return; }
      await sleep(reduceMotion() ? 40 : 420 + Math.random() * 380);
      appendLog(fill(line));
    }
    done += 1;
    drawStages(i + 1, 'done');
    $('#pipe-bar').dataset.target = String(Math.round((done / PIPELINE.length) * 100));
    requestAnimationFrame(() => { const b = $('#pipe-bar'); if (b) b.style.width = b.dataset.target + '%'; });
  }

  const fileName = flow.file && flow.file.type === 'archivo' ? flow.file.name : profile.fileName;
  const rec = tmp;
  rec.fileName = fileName;
  rec.createdAt = new Date().toISOString();
  rec.trail = [{ ts: rec.createdAt, actor: 'Sistema', ev: 'Evaluación generada y auditada (AUD-' + audId + '). Pendiente de decisión humana.' }];
  state.evals.unshift(rec);
  logEvent('Sistema', 'Evaluación ' + rec.id + ' generada (' + vac.title + '). Puntaje: ' + rec.result.score + '/100.');
  flow.step = 'form'; flow.file = null;
  saveState();
  toast('Análisis completado: ' + rec.id + ' · puntaje ' + rec.result.score + '/100.', 'ok');
  await sleep(500);
  location.hash = '#/resultado/' + rec.id;
}

/* --------------------------------------------------------------------------
   9. Vista: Resultado de evaluación / reporte
   -------------------------------------------------------------------------- */
function skillGroups(r) {
  const lvlChip = (l) => '<span class="font-mono text-[10px] text-stone-400">' + LEVELS[l] + '</span>';
  return '<div class="space-y-5">' +
    '<div><p class="mono-tag mb-2">Coinciden (' + r.matched.length + ')</p>' +
      '<div class="flex flex-wrap gap-1.5">' +
        (r.matched.length ? r.matched.map((m) => chipSkill(m.name + ' · ' + LEVELS[m.level], 'ok')).join('') : '<p class="text-sm text-stone-500">Sin coincidencias directas.</p>') +
      '</div></div>' +
    '<div><p class="mono-tag mb-2">Brechas (' + r.missing.length + ')</p>' +
      '<div class="flex flex-wrap gap-1.5">' +
        (r.missing.length ? r.missing.map((m) => chipSkill(m.name + (m.w >= 4 ? ' · clave' : ''), 'err')).join('') : '<p class="text-sm text-stone-500">Cubre todos los requerimientos.</p>') +
      '</div></div>' +
    '<div><p class="mono-tag mb-2">Habilidades adicionales (' + r.extra.length + ')</p>' +
      '<div class="flex flex-wrap gap-1.5">' +
        (r.extra.length ? r.extra.map((n) => chipSkill(n, 'neutral')).join('') : '<p class="text-sm text-stone-500">Ninguna adicional.</p>') +
      '</div></div>' +
  '</div>';
}

function extractedProfile(p) {
  return '<dl class="space-y-3 text-sm">' +
    '<div class="flex gap-3"><dt class="text-stone-500 w-28 shrink-0">Experiencia</dt><dd class="text-stone-800 font-medium">' + p.years + ' años en roles tecnológicos</dd></div>' +
    '<div class="flex gap-3"><dt class="text-stone-500 w-28 shrink-0">Formación</dt><dd class="text-stone-800">' + esc(p.edu) + '</dd></div>' +
    '<div><dt class="text-stone-500 mb-1.5">Trayectoria reciente</dt><dd>' +
      p.lastRoles.map((r) => '<p class="text-stone-800"><span class="font-medium">' + esc(r.title) + '</span> · ' + esc(r.org) + ' <span class="font-mono text-xs text-stone-400">(' + esc(r.period) + ')</span></p>').join('') +
    '</dd></div>' +
    (p.certs.length ? '<div><dt class="text-stone-500 mb-1.5">Certificaciones</dt><dd class="text-stone-800">' + p.certs.map((c) => esc(c)).join(' · ') + '</dd></div>' : '') +
    (p.languages.length ? '<div class="flex gap-3"><dt class="text-stone-500 w-28 shrink-0">Idiomas</dt><dd class="text-stone-800">' + p.languages.map(esc).join(', ') + '</dd></div>' : '') +
  '</dl>';
}

function explicabilityBox(rec) {
  const v = vacancyById(rec.vacancyId);
  const r = rec.result;
  const top = r.factors.slice().sort((a, b) => b.val - a.val)[0];
  const bullets = [
    'Coincide en ' + r.matched.length + ' de ' + (r.matched.length + r.missing.length) + ' requerimientos ponderados de la vacante ' + esc(v.title) + '.',
    'Su factor más sólido es ' + top.label.toLowerCase() + ' (' + Math.round(top.val * 100) + '% del máximo posible para ese factor).',
    top.key === 'skills'
      ? 'Las brechas detectadas pesan directamente en el resultado: son el 40% del cálculo.'
      : 'Las habilidades se comparan contra la taxonomía de la vacante, no contra autoevaluaciones.',
    'Limitación declarada: el puntaje resume señales del CV; la competencia real se valida en entrevista técnica.',
  ];
  return '<div class="rounded-xl border border-teal-200 bg-teal-50/50 p-5">' +
    '<p class="flex items-center gap-2 mono-tag text-teal-800 mb-3">' + ic('info', 'w-3.5 h-3.5') + 'Por qué este puntaje (explicabilidad)</p>' +
    '<ul class="space-y-2">' +
      bullets.map((b) => '<li class="flex gap-2 text-sm text-teal-950 leading-relaxed"><span class="mt-1 text-teal-700">' + ic('dot', 'w-3 h-3 shrink-0') + '</span>' + b + '</li>').join('') +
    '</ul>' +
  '</div>';
}

function ethicsStrip() {
  return '<div class="rounded-xl border border-stone-200 bg-white p-5">' +
    '<p class="mono-tag mb-3">Salvaguardas aplicadas</p>' +
    '<ul class="space-y-2.5 text-sm">' +
      '<li class="flex gap-2.5 text-stone-700"><span class="text-emerald-600 mt-0.5">' + ic('circle-check', 'w-4 h-4 shrink-0') + '</span>Datos personales anonimizados antes del scoring.</li>' +
      '<li class="flex gap-2.5 text-stone-700"><span class="text-emerald-600 mt-0.5">' + ic('circle-check', 'w-4 h-4 shrink-0') + '</span>Atributos protegidos excluidos del cálculo (género, edad, foto).</li>' +
      '<li class="flex gap-2.5 text-stone-700"><span class="text-emerald-600 mt-0.5">' + ic('circle-check', 'w-4 h-4 shrink-0') + '</span>Chequeo de paridad sin señales en esta evaluación.</li>' +
    '</ul>' +
    '<a href="#/cumplimiento" data-action="go" data-to="#/cumplimiento" class="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 hover:text-teal-900">Ver plan de cumplimiento ' + ic('arrow-right', 'w-3.5 h-3.5') + '</a>' +
  '</div>';
}

function decisionPanel(rec) {
  const st = statusOf(rec);
  const decided = !!rec.decision;
  return '<div class="rounded-xl border ' + (decided ? 'border-stone-200 bg-white' : 'border-amber-300 bg-amber-50/60') + ' p-5">' +
    '<p class="mono-tag mb-3">Decisión humana (M-05)</p>' +
    '<div class="mb-4">' + chipStatus(st) + '</div>' +
    (decided
      ? '<div class="space-y-2 text-sm">' +
          '<p class="text-stone-700"><span class="text-stone-500">Decidida por:</span> ' + esc(rec.decision.by) + '</p>' +
          '<p class="text-stone-700"><span class="text-stone-500">Fecha:</span> <span class="font-mono text-xs">' + esc(fmtDate(rec.decision.at)) + '</span></p>' +
          (rec.decision.note ? '<p class="text-stone-700"><span class="text-stone-500">Nota:</span> ' + esc(rec.decision.note) + '</p>' : '') +
        '</div>'
      : '<p class="text-sm text-stone-600 leading-relaxed mb-4">Este sistema recomienda, no decide. Registra tu decisión para completar el ciclo de supervisión — la identidad del candidato se revelará con tu firma.</p>' +
        '<label class="block text-xs font-medium text-stone-600 mb-1.5" for="decision-note">Nota de revisión (opcional)</label>' +
        '<input id="decision-note" type="text" placeholder="Motivo o contexto de la decisión…" class="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm placeholder:text-stone-400 focus:border-teal-700" />' +
        '<div class="mt-3 grid gap-2">' +
          '<button type="button" data-action="decide" data-decision="entrevista" class="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors">' + ic('user-check', 'w-4 h-4') + 'Aprobar para entrevista</button>' +
          '<button type="button" data-action="decide" data-decision="revision" class="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-100 transition-colors">' + ic('eye', 'w-4 h-4') + 'Solicitar segunda revisión</button>' +
          '<button type="button" data-action="decide" data-decision="descartado" class="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 transition-colors">' + ic('x', 'w-4 h-4') + 'Descartar con motivo</button>' +
        '</div>') +
  '</div>';
}

function identityBlock(rec) {
  const p = profileById(rec.profileId);
  const revealed = !!rec.decision;
  return revealed
    ? '<div class="flex items-center gap-3">' +
        '<span class="flex h-11 w-11 items-center justify-center rounded-full bg-teal-50 border border-teal-200 text-teal-800 font-semibold">' + esc(p.name.split(' ').map((w) => w[0]).slice(0, 2).join('')) + '</span>' +
        '<div><p class="text-sm font-semibold text-stone-900">' + esc(p.name) + '</p>' +
        '<p class="text-xs text-emerald-700 font-medium mt-0.5">Identidad revelada tras decisión registrada</p></div>' +
      '</div>'
    : '<div class="flex items-center gap-3">' +
        '<span class="flex h-11 w-11 items-center justify-center rounded-full bg-stone-100 border border-stone-200 text-stone-400">' + ic('lock', 'w-4 h-4') + '</span>' +
        '<div><p class="text-sm font-semibold text-stone-900">Identidad protegida</p>' +
        '<p class="text-xs text-stone-500 mt-0.5">Se revela al registrar una decisión humana</p></div>' +
      '</div>';
}

function trailList(rec, limit) {
  const items = rec.trail.slice().reverse().slice(0, limit || 6);
  return '<ol class="space-y-3">' +
    items.map((t) =>
      '<li class="flex gap-3 text-sm">' +
        '<span class="mt-1.5 h-2 w-2 rounded-full bg-stone-300 shrink-0"></span>' +
        '<div><p class="text-stone-800 leading-snug">' + esc(t.ev) + '</p>' +
        '<p class="font-mono text-[10px] text-stone-400 mt-0.5">' + esc(fmtDate(t.ts)) + ' · ' + esc(fmtTime(new Date(t.ts))) + ' · ' + esc(t.actor) + '</p></div>' +
      '</li>').join('') +
  '</ol>';
}

/* Cuerpo del reporte (compartido entre vista completa y drawer). */
function reportBody(rec, compact) {
  const p = profileById(rec.profileId);
  const v = vacancyById(rec.vacancyId);
  const r = rec.result;
  const tone = { ok: 'bg-emerald-600', warn: 'bg-amber-500', err: 'bg-rose-600' }[r.verdict.tone];

  return '<div class="space-y-5">' +
    '<div class="bg-white border border-stone-200 rounded-xl p-6">' +
      '<div class="flex flex-col sm:flex-row sm:items-center gap-5">' +
        identityBlock(rec) +
        '<div class="sm:ml-auto text-left sm:text-right">' +
          '<p class="text-sm text-stone-500">Vacante evaluada</p>' +
          '<p class="text-sm font-semibold text-stone-900">' + esc(v.title) + ' · <span class="font-normal text-stone-500">' + esc(v.seniority) + '</span></p>' +
          '<p class="font-mono text-[11px] text-stone-400 mt-1">' + esc(rec.id) + ' · ' + esc(fmtDate(rec.createdAt)) + '</p>' +
        '</div>' +
      '</div>' +
      '<div class="mt-6 pt-6 border-t border-stone-100 flex flex-col md:flex-row md:items-center gap-6">' +
        gauge(r.score, compact ? 104 : 128) +
        '<div class="space-y-2">' +
          chipVerdict(r.verdict) +
          '<p class="text-sm text-stone-600">Percentil estimado del pool: <span class="font-mono font-semibold text-stone-900">' + r.percentile + '</span></p>' +
          '<p class="text-sm text-stone-600">Archivo evaluado: <span class="font-mono text-xs text-stone-700">' + esc(rec.fileName) + '</span></p>' +
        '</div>' +
        '<div class="md:ml-auto md:text-right">' +
          '<p class="font-mono text-[10px] uppercase tracking-widest text-stone-400 mb-1">Recomendación del sistema</p>' +
          '<p class="text-sm text-stone-700 max-w-xs leading-relaxed">' +
            (r.verdict.key === 'alta' ? 'Cubrir en la próxima ronda de entrevistas técnicas.'
              : r.verdict.key === 'media' ? 'Validar brechas en entrevista antes de avanzar.'
              : 'Revisar para vacantes alternativas más afines al perfil.') + '</p>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div class="grid lg:grid-cols-3 gap-5">' +
      '<div class="lg:col-span-2 space-y-5">' +
        '<section class="bg-white border border-stone-200 rounded-xl p-6">' +
          '<h3 class="text-sm font-semibold text-stone-900 mb-5">Desglose del puntaje</h3>' +
          '<div class="space-y-4">' +
            r.factors.map((f) => bar(f.label, f.weight, f.pts, f.weight, f.val, tone)).join('') +
          '</div>' +
          '<p class="mt-5 pt-4 border-t border-stone-100 text-xs text-stone-500">Puntaje global = Σ(factor × peso). Los pesos están publicados en la vacante y son idénticos para todos los candidatos.</p>' +
        '</section>' +
        '<section class="bg-white border border-stone-200 rounded-xl p-6">' +
          '<h3 class="text-sm font-semibold text-stone-900 mb-5">Habilidades evaluadas</h3>' +
          skillGroups(r) +
        '</section>' +
        '<section class="bg-white border border-stone-200 rounded-xl p-6">' +
          '<h3 class="text-sm font-semibold text-stone-900 mb-5">Perfil extraído del CV</h3>' +
          extractedProfile(p) +
          (r.flags.length
            ? '<div class="mt-5 pt-4 border-t border-stone-100"><p class="mono-tag mb-2 text-amber-700">Observaciones (' + r.flags.length + ')</p>' +
              '<ul class="space-y-2">' + r.flags.map((f) =>
                '<li class="flex gap-2 text-sm text-amber-900 leading-relaxed"><span class="mt-0.5 shrink-0">' + ic('triangle-alert', 'w-4 h-4 text-amber-600') + '</span>' + esc(f) + '</li>').join('') + '</ul></div>'
            : '') +
        '</section>' +
        explicabilityBox(rec) +
      '</div>' +
      '<div class="space-y-5">' +
        ethicsStrip() +
        decisionPanel(rec) +
        '<section class="bg-white border border-stone-200 rounded-xl p-5">' +
          '<p class="mono-tag mb-3">Traza de la evaluación</p>' +
          trailList(rec, 6) +
        '</section>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function resultView(id) {
  const rec = state.evals.find((e) => e.id === id);
  if (!rec) {
    return appShell('evaluar', 'Reporte',
      '<div class="mx-auto max-w-6xl px-4 sm:px-6 py-16 text-center">' +
        '<span class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-stone-100 text-stone-400">' + ic('file-search', 'w-6 h-6') + '</span>' +
        '<h2 class="mt-4 text-lg font-semibold text-stone-900">Reporte no encontrado</h2>' +
        '<p class="mt-1 text-sm text-stone-500">La evaluación ' + esc(id || '') + ' no existe en esta demo.</p>' +
        '<a href="#/candidatos" data-action="go" data-to="#/candidatos" class="mt-6 inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">Ir a candidatos ' + ic('arrow-right', 'w-4 h-4') + '</a>' +
      '</div>');
  }
  return appShell('evaluar', 'Reporte de evaluación · ' + rec.id,
    '<div class="mx-auto max-w-6xl px-4 sm:px-6 py-8">' +
      '<div class="flex flex-wrap items-center justify-between gap-3 mb-6 no-print">' +
        '<nav class="flex items-center gap-1.5 text-sm text-stone-500" aria-label="Migas de pan">' +
          '<a href="#/candidatos" data-action="go" data-to="#/candidatos" class="hover:text-stone-800">Candidatos</a>' +
          ic('chevron-right', 'w-3.5 h-3.5') +
          '<span class="font-mono text-stone-800">' + esc(rec.id) + '</span>' +
        '</nav>' +
        '<button type="button" data-action="print-report" class="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition-colors">' + ic('printer', 'w-3.5 h-3.5') + 'Imprimir / Guardar PDF</button>' +
      '</div>' +
      reportBody(rec, false) +
    '</div>');
}

/* --------------------------------------------------------------------------
   10. Vista: Candidatos
   -------------------------------------------------------------------------- */
function miniBar(score) {
  const col = score >= 75 ? 'bg-emerald-600' : score >= 55 ? 'bg-amber-500' : 'bg-rose-500';
  return '<div class="flex items-center gap-2.5">' +
    '<div class="w-20 h-1.5 rounded-full bg-stone-200 overflow-hidden"><div class="bar-fill h-full rounded-full ' + col + '" style="width:0%" data-target="' + score + '"></div></div>' +
    '<span class="font-mono text-xs font-semibold text-stone-800">' + score + '</span>' +
  '</div>';
}

function candidateRow(rec) {
  const v = vacancyById(rec.vacancyId);
  const p = profileById(rec.profileId);
  const name = rec.decision ? p.name : null;
  return '<tr class="cursor-pointer hover:bg-stone-100/70 transition-colors" data-action="open-candidate" data-id="' + esc(rec.id) + '" tabindex="0" role="button" aria-label="Abrir evaluación ' + esc(rec.id) + '">' +
    '<td class="px-4 py-3.5 border-b border-stone-100 whitespace-nowrap">' +
      '<span class="font-mono text-xs font-semibold text-stone-800">' + esc(rec.id) + '</span>' +
      (name ? '<p class="text-xs text-stone-500 mt-0.5">' + esc(name) + '</p>' : '<p class="text-xs text-stone-400 mt-0.5">Identidad protegida</p>') +
    '</td>' +
    '<td class="px-4 py-3.5 border-b border-stone-100"><p class="text-sm text-stone-800 font-medium">' + esc(v.title) + '</p><p class="text-xs text-stone-500">' + esc(v.seniority) + '</p></td>' +
    '<td class="px-4 py-3.5 border-b border-stone-100">' + miniBar(rec.result.score) + '</td>' +
    '<td class="px-4 py-3.5 border-b border-stone-100">' + chipVerdict(rec.result.verdict) + '</td>' +
    '<td class="px-4 py-3.5 border-b border-stone-100">' + chipStatus(statusOf(rec)) + '</td>' +
    '<td class="px-4 py-3.5 border-b border-stone-100 whitespace-nowrap text-xs text-stone-500 font-mono">' + esc(fmtDate(rec.createdAt)) + '</td>' +
    '<td class="px-4 py-3.5 border-b border-stone-100 text-right text-stone-300">' + ic('chevron-right', 'w-4 h-4') + '</td>' +
  '</tr>';
}

function filteredEvals() {
  const q = filters.q.trim().toLowerCase();
  return state.evals.filter((e) => {
    if (filters.vacancy && e.vacancyId !== filters.vacancy) return false;
    if (filters.status && statusOf(e) !== filters.status) return false;
    if (q) {
      const p = profileById(e.profileId);
      const hay = (e.id + ' ' + vacancyById(e.vacancyId).title + ' ' + (e.decision ? p.name : '')).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function candidatesTableBody() {
  const rows = filteredEvals();
  if (!rows.length) {
    return '<tr><td colspan="7" class="px-4 py-14 text-center">' +
      '<span class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-400">' + ic('inbox', 'w-5 h-5') + '</span>' +
      '<p class="mt-3 text-sm font-medium text-stone-800">Ningún candidato coincide con los filtros</p>' +
      '<p class="mt-1 text-sm text-stone-500">Ajusta la búsqueda o evalúa un nuevo CV.</p>' +
      '<button type="button" data-action="clear-filters" class="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-stone-300 px-3.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100">' + ic('rotate-ccw', 'w-3.5 h-3.5') + 'Limpiar filtros</button>' +
    '</td></tr>';
  }
  return rows.map(candidateRow).join('');
}

function candidatesView() {
  const statusOptions = [['', 'Todos los estados'], ['pending', 'Pendientes'], ['entrevista', 'Entrevista aprobada'], ['revision', 'Segunda revisión'], ['descartado', 'Descartados']];
  return appShell('candidatos', 'Candidatos',
    '<div class="mx-auto max-w-6xl px-4 sm:px-6 py-8">' +
      '<div class="flex flex-wrap items-end justify-between gap-4 mb-5">' +
        '<div>' +
          '<h2 class="text-xl font-bold tracking-tight text-stone-900">Candidatos evaluados</h2>' +
          '<p class="mt-1 text-sm text-stone-600">Cada fila es una evaluación con reporte explicable y decisión humana registrada.</p>' +
        '</div>' +
        '<a href="#/evaluar" data-action="go" data-to="#/evaluar" class="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 transition-colors">' + ic('plus', 'w-4 h-4') + 'Nueva evaluación</a>' +
      '</div>' +
      '<div class="bg-white border border-stone-200 rounded-xl overflow-hidden">' +
        '<div class="flex flex-col sm:flex-row gap-3 p-4 border-b border-stone-100">' +
          '<div class="relative flex-1">' +
            '<span class="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">' + ic('search', 'w-4 h-4') + '</span>' +
            '<input id="filter-q" type="search" value="' + esc(filters.q) + '" placeholder="Buscar por ID o vacante…" aria-label="Buscar candidatos" ' +
              'class="w-full rounded-lg border border-stone-300 pl-9 pr-3 py-2 text-sm placeholder:text-stone-400 focus:border-teal-700" />' +
          '</div>' +
          '<select id="filter-vacancy" aria-label="Filtrar por vacante" class="rounded-lg border border-stone-300 px-3 py-2 text-sm bg-white focus:border-teal-700">' +
            '<option value="">Todas las vacantes</option>' +
            VACANCIES.map((v) => '<option value="' + v.id + '"' + (filters.vacancy === v.id ? ' selected' : '') + '>' + esc(v.title) + '</option>').join('') +
          '</select>' +
          '<select id="filter-status" aria-label="Filtrar por estado" class="rounded-lg border border-stone-300 px-3 py-2 text-sm bg-white focus:border-teal-700">' +
            statusOptions.map((o) => '<option value="' + o[0] + '"' + (filters.status === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') +
          '</select>' +
        '</div>' +
        '<div class="overflow-x-auto scroll-thin">' +
          '<table class="w-full text-sm min-w-[720px]">' +
            '<thead><tr class="bg-stone-50">' +
              ['Candidato', 'Vacante', 'Puntaje', 'Resultado del sistema', 'Estado de decisión', 'Fecha', ''].map((h, i) =>
                '<th scope="col" class="px-4 py-3 text-left font-medium text-stone-500 border-b border-stone-200 ' + (h === '' ? 'w-10' : '') + '">' + esc(h) + '</th>').join('') +
            '</tr></thead>' +
            '<tbody id="candidates-body">' + candidatesTableBody() + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>' +
      '<p class="mt-3 text-xs text-stone-400">Los datos mostrados son ficticios y se restablecen desde la barra lateral.</p>' +
    '</div>');
}

function bindCandidates(root) {
  const updateBody = () => {
    const body = $('#candidates-body');
    if (!body) return;
    body.innerHTML = candidatesTableBody();
    refreshIcons();
    animateIn(body);
  };
  const q = $('#filter-q', root);
  if (q) q.addEventListener('input', () => { filters.q = q.value; updateBody(); });
  const vac = $('#filter-vacancy', root);
  if (vac) vac.addEventListener('change', () => { filters.vacancy = vac.value; updateBody(); });
  const st = $('#filter-status', root);
  if (st) st.addEventListener('change', () => { filters.status = st.value; updateBody(); });
}

function candidateDrawer(rec) {
  const p = profileById(rec.profileId);
  const r = rec.result;
  return '<div class="space-y-5">' +
    '<div class="flex items-start justify-between gap-4">' +
      '<div>' +
        '<p class="font-mono text-sm font-semibold text-stone-800">' + esc(rec.id) + '</p>' +
        '<p class="text-sm text-stone-500 mt-0.5">' + esc(vacancyById(rec.vacancyId).title) + ' · ' + esc(fmtDate(rec.createdAt)) + '</p>' +
      '</div>' +
      '<span class="font-mono text-2xl font-semibold ' + (r.score >= 75 ? 'text-emerald-700' : r.score >= 55 ? 'text-amber-700' : 'text-rose-700') + '">' + r.score + '<span class="text-sm text-stone-400">/100</span></span>' +
    '</div>' +
    '<div class="flex flex-wrap gap-2">' + chipVerdict(r.verdict) + chipStatus(statusOf(rec)) + '</div>' +
    '<div class="bg-white border border-stone-200 rounded-xl p-5">' +
      '<p class="mono-tag mb-4">Desglose por factor</p>' +
      '<div class="space-y-3.5">' + r.factors.map((f) => bar(f.label, f.weight, f.pts, f.weight, f.val)).join('') + '</div>' +
    '</div>' +
    '<div class="bg-white border border-stone-200 rounded-xl p-5">' +
      '<p class="mono-tag mb-4">Coincidencias y brechas</p>' +
      '<div class="mb-3 flex flex-wrap gap-1.5">' + (r.matched.length ? r.matched.map((m) => chipSkill(m.name, 'ok')).join('') : '') + '</div>' +
      '<div class="flex flex-wrap gap-1.5">' + (r.missing.length ? r.missing.map((m) => chipSkill(m.name, 'err')).join('') : '<p class="text-sm text-stone-500">Sin brechas.</p>') + '</div>' +
    '</div>' +
    decisionPanel(rec) +
    '<div class="bg-white border border-stone-200 rounded-xl p-5">' +
      '<p class="mono-tag mb-3">Traza</p>' + trailList(rec, 5) +
    '</div>' +
    '<a href="#/resultado/' + esc(rec.id) + '" data-action="go" data-to="#/resultado/' + esc(rec.id) + '" class="inline-flex items-center gap-2 text-sm font-semibold text-teal-800 hover:text-teal-900">Abrir reporte completo ' + ic('arrow-right', 'w-4 h-4') + '</a>' +
  '</div>';
}

/* --------------------------------------------------------------------------
   11. Vista: Cumplimiento
   -------------------------------------------------------------------------- */
function complianceView() {
  const c = COMPLIANCE;
  return appShell('cumplimiento', 'Plan de cumplimiento',
    '<div class="mx-auto max-w-6xl px-4 sm:px-6 py-8">' +
      '<div class="max-w-2xl mb-8">' +
        '<h2 class="text-xl font-bold tracking-tight text-stone-900">Plan de cumplimiento legal y ético</h2>' +
        '<p class="mt-1.5 text-sm text-stone-600 leading-relaxed">Aplicado a la ' + esc(c.ley) + '. Este panel resume las salvaguardas operativas del sistema y su evidencia dentro del prototipo.</p>' +
      '</div>' +

      '<section class="grid lg:grid-cols-3 gap-5 mb-5" aria-label="Clasificación de riesgo">' +
        '<div class="lg:col-span-1 rounded-xl border border-amber-300 bg-amber-50/70 p-6">' +
          '<p class="mono-tag text-amber-800 mb-2">Clasificación de riesgo</p>' +
          '<div class="flex items-end gap-3"><span class="text-4xl font-bold text-amber-900 leading-none">' + esc(c.risk.level) + '</span>' +
            '<span class="pb-1 inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-900">' + ic('triangle-alert', 'w-3 h-3') + 'Requiere salvaguardas</span></div>' +
          '<p class="mt-4 text-sm text-amber-950 leading-relaxed">' + esc(c.risk.justification[0]) + '</p>' +
        '</div>' +
        '<div class="lg:col-span-2 rounded-xl border border-stone-200 bg-white p-6">' +
          '<p class="mono-tag mb-4">Justificación de la clasificación</p>' +
          '<ul class="space-y-2.5">' +
            c.risk.justification.map((j) => '<li class="flex gap-2.5 text-sm text-stone-700 leading-relaxed"><span class="mt-0.5 text-teal-700 shrink-0">' + ic('check', 'w-4 h-4') + '</span>' + esc(j) + '</li>').join('') +
          '</ul>' +
          '<div class="mt-5 pt-4 border-t border-stone-100 grid sm:grid-cols-2 gap-3 text-sm">' +
            '<p class="text-stone-600">' + esc(c.risk.scope) + '</p>' +
            '<p class="text-stone-600">' + esc(c.risk.autonomy) + '</p>' +
          '</div>' +
        '</div>' +
      '</section>' +

      '<section class="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8" aria-label="Salvaguardas">' +
        c.cards.map((card) =>
          '<div class="bg-white border border-stone-200 rounded-xl p-6">' +
            '<div class="flex items-center justify-between mb-4">' +
              '<span class="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-100 text-stone-700">' + ic(card.icon, 'w-4.5 h-4.5') + '</span>' +
              '<span class="font-mono text-[10px] text-stone-400 tracking-widest">' + esc(card.tag) + '</span>' +
            '</div>' +
            '<h3 class="text-sm font-semibold text-stone-900">' + esc(card.title) + '</h3>' +
            '<ul class="mt-3 space-y-2">' +
              card.points.map((pt) => '<li class="flex gap-2 text-sm text-stone-600 leading-relaxed"><span class="mt-1 text-stone-300 shrink-0">' + ic('dot', 'w-3 h-3') + '</span>' + esc(pt) + '</li>').join('') +
            '</ul>' +
          '</div>').join('') +
      '</section>' +

      '<section class="mb-8" aria-label="Registro de riesgos">' +
        '<div class="flex items-center justify-between mb-4"><h3 class="text-sm font-semibold text-stone-900">Registro de riesgos</h3>' +
        (() => {
          const now = new Date();
          const next = new Date(now); next.setMonth(next.getMonth() + 3);
          const mes = (d) => new Intl.DateTimeFormat('es-SV', { month: 'short', year: 'numeric' }).format(d).toUpperCase();
          return '<span class="font-mono text-[10px] text-stone-400">REVISADO: ' + esc(mes(now)) + ' · PRÓXIMA AUDITORÍA: ' + esc(mes(next)) + '</span>';
        })() + '</div>' +
        '<div class="bg-white border border-stone-200 rounded-xl overflow-hidden overflow-x-auto scroll-thin">' +
          '<table class="w-full text-sm min-w-[760px]">' +
            '<thead><tr class="bg-stone-50">' +
              ['Riesgo', 'Prob.', 'Impacto', 'Mitigación', 'Responsable'].map((h) => '<th scope="col" class="px-4 py-3 text-left font-medium text-stone-500 border-b border-stone-200 whitespace-nowrap">' + esc(h) + '</th>').join('') +
            '</tr></thead><tbody>' +
            c.risks.map((r) => {
              const pill = (v) => {
                const cls = v === 'Alto' || v === 'Alta' ? 'bg-rose-50 text-rose-700 border-rose-200' : v === 'Media' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-stone-100 text-stone-600 border-stone-200';
                return '<span class="inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ' + cls + '">' + esc(v) + '</span>';
              };
              return '<tr class="align-top">' +
                '<td class="px-4 py-3.5 border-b border-stone-100 text-stone-800 font-medium max-w-[240px]">' + esc(r.name) + '</td>' +
                '<td class="px-4 py-3.5 border-b border-stone-100">' + pill(r.prob) + '</td>' +
                '<td class="px-4 py-3.5 border-b border-stone-100">' + pill(r.imp) + '</td>' +
                '<td class="px-4 py-3.5 border-b border-stone-100 text-stone-600 leading-relaxed max-w-[320px]">' + esc(r.mitigation) + '</td>' +
                '<td class="px-4 py-3.5 border-b border-stone-100 text-stone-600 whitespace-nowrap">' + esc(r.owner) + '</td>' +
              '</tr>';
            }).join('') +
            '</tbody></table>' +
        '</div>' +
      '</section>' +

      '<section class="grid lg:grid-cols-2 gap-5 mb-8" aria-label="Incidentes">' +
        '<div class="bg-white border border-stone-200 rounded-xl p-6">' +
          '<h3 class="text-sm font-semibold text-stone-900 mb-4">Protocolo ante incidentes</h3>' +
          '<ol class="space-y-3">' +
            c.incident.map((s, i) =>
              '<li class="flex gap-3">' +
                '<span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-50 border border-teal-200 font-mono text-xs font-semibold text-teal-800">' + (i + 1) + '</span>' +
                '<div><p class="text-sm font-semibold text-stone-800">' + esc(s.step) + '</p>' +
                '<p class="text-sm text-stone-600 leading-relaxed mt-0.5">' + esc(s.text) + '</p></div>' +
              '</li>').join('') +
          '</ol>' +
        '</div>' +
        '<div class="bg-white border border-stone-200 rounded-xl p-6">' +
          '<h3 class="text-sm font-semibold text-stone-900 mb-4">Registro de auditoría (en vivo)</h3>' +
          '<div class="max-h-64 overflow-y-auto scroll-thin pr-1">' + trailList({ trail: state.log.map((l) => ({ ts: l.ts, actor: l.actor, ev: l.ev })) }, 8) + '</div>' +
          '<p class="mt-3 pt-3 border-t border-stone-100 text-xs text-stone-400">El prototipo agrega entradas reales al registrar decisiones en la demo.</p>' +
        '</div>' +
      '</section>' +

      '<section class="rounded-xl border border-stone-200 bg-stone-100/60 p-5 flex items-start gap-3">' +
        ic('info', 'w-4 h-4 text-stone-500 mt-0.5 shrink-0') +
        '<p class="text-sm text-stone-600 leading-relaxed">Contenido demostrativo elaborado con fines académicos. No constituye asesoría legal; la clasificación definitiva debe validarse con la normativa vigente y asesores calificados.</p>' +
      '</section>' +
    '</div>');
}

/* --------------------------------------------------------------------------
   12. Router
   -------------------------------------------------------------------------- */
function parseHash() {
  const h = location.hash || '';
  if (!h.startsWith('#/')) return { name: '', arg: null };
  const parts = h.slice(2).split('/').filter(Boolean);
  return { name: parts[0] || '', arg: parts[1] || null };
}

function render(html) {
  const app = $('#app');
  app.innerHTML = html;
  app.firstElementChild.classList.add('view-enter');
  refreshIcons();
  animateIn(app);
}

function route() {
  closeDrawer();
  if (flow.step === 'running') flow.cancel = true;
  const { name, arg } = parseHash();
  let html, bind = null, title;
  switch (name) {
    case 'evaluar':
      if (flow.step === 'running') { html = pipelineHTML(profileById(flow.file && flow.file.type === 'ejemplo' ? flow.file.profileId : flow.sampleId || 'ana'), vacancyById(flow.vacancyId)); }
      else { flow.step = 'form'; html = evalFormHTML(); bind = bindEvalForm; }
      title = 'Nueva evaluación'; break;
    case 'candidatos': html = candidatesView(); bind = bindCandidates; title = 'Candidatos'; break;
    case 'cumplimiento': html = complianceView(); title = 'Plan de cumplimiento'; break;
    case 'resultado': html = resultView(arg); title = 'Reporte de evaluación'; break;
    default: html = landingView(); title = 'Evaluador de currículums para perfiles tecnológicos';
  }
  document.title = BRAND.name + ' — ' + title;
  render(html);
  if (bind) bind($('#app'));
}

/* --------------------------------------------------------------------------
   13. Acciones (delegación de eventos)
   -------------------------------------------------------------------------- */
const actions = {
  go: (el) => { const to = el.dataset.to; if (to && location.hash !== to) location.hash = to; else route(); },
  'close-drawer': () => closeDrawer(),
  'toggle-theme': () => {
    const next = isDarkTheme() ? 'light' : 'dark';
    applyTheme(next, true);
    toast(next === 'dark' ? 'Modo oscuro activado.' : 'Modo claro activado.', 'info');
  },
  'sample-report': () => {
    drawerCandidateId = null;
    const rec = state.evals.find((e) => e.id === 'TS-0131') || makeEval('ana', 'backend-sr');
    openDrawer('<p class="mono-tag mb-4">Ejemplo ilustrativo de salida esperada</p>' + reportBody(rec, true));
  },
  'pick-sample': (el) => {
    const id = el.dataset.profile;
    flow.file = { type: 'ejemplo', profileId: id };
    flow.sampleId = id;
    const slot = $('#file-slot'); if (slot) slot.innerHTML = fileChip();
    refreshIcons(); updateStartState();
    toast('CV de ejemplo seleccionado: ' + profileById(id).fileName, 'info');
  },
  'clear-file': () => {
    flow.file = null;
    const slot = $('#file-slot'); if (slot) slot.innerHTML = '';
    updateStartState();
  },
  'pick-vacancy': (el) => {
    flow.vacancyId = el.dataset.vac;
    $$('[data-action="pick-vacancy"]').forEach((b) => {
      const on = b.dataset.vac === flow.vacancyId;
      b.setAttribute('aria-pressed', String(on));
      b.className = 'w-full text-left rounded-lg border p-4 transition-all ' + (on ? 'border-teal-700 ring-2 ring-teal-700/20 bg-teal-50/50' : 'border-stone-200 bg-white hover:border-stone-300');
    });
    updateStartState();
  },
  'start-analysis': () => { if (flow.file && flow.vacancyId) runAnalysis(); },
  'cancel-analysis': () => { flow.cancel = true; },
  'open-candidate': (el) => {
    const rec = state.evals.find((e) => e.id === el.dataset.id);
    if (rec) { drawerCandidateId = rec.id; openDrawer(candidateDrawer(rec)); }
  },
  decide: (el) => {
    const status = el.dataset.decision;
    const id = parseHash().arg || drawerCandidateId;
    const rec = state.evals.find((e) => e.id === id);
    if (!rec) return;
    const noteEl = $('#decision-note');
    const note = noteEl ? noteEl.value.trim() : '';
    rec.decision = { status, by: 'Tú · Reclutador (demo)', at: new Date().toISOString(), note: note || '' };
    rec.trail.push({ ts: rec.decision.at, actor: rec.decision.by, ev: 'Decisión registrada: ' + STATUS_META[status].label.toLowerCase() + (note ? ' — "' + note + '"' : '') + '.' });
    const p = profileById(rec.profileId);
    logEvent(rec.decision.by, 'Decisión registrada sobre ' + rec.id + ': ' + STATUS_META[status].label.toLowerCase() + '. Identidad revelada: ' + p.name + '.');
    saveState();
    toast('Decisión registrada. Identidad revelada: ' + p.name + '.', 'ok');
    const { name, arg } = parseHash();
    if (name === 'resultado' && arg === rec.id) route();
    else {
      closeDrawer();
      if (name === 'candidatos') {
        const body = $('#candidates-body');
        if (body) { body.innerHTML = candidatesTableBody(); refreshIcons(); animateIn(body); }
      } else route();
    }
  },
  'print-report': () => { drawerCandidateId = null; window.print(); },
  'reset-demo': (el) => {
    if (el.dataset.confirm) { delete el.dataset.confirm; resetDemo(); return; }
    el.dataset.confirm = '1';
    const span = el.querySelector('span');
    if (span) { span.textContent = '¿Confirmar restablecer?'; span.classList.add('text-rose-700'); }
    toast('Pulsa de nuevo para confirmar el restablecimiento.', 'info');
    setTimeout(() => {
      if (!el.isConnected) return;
      delete el.dataset.confirm;
      const s2 = el.querySelector('span');
      if (s2) { s2.textContent = 'Restablecer demo'; s2.classList.remove('text-rose-700'); }
    }, 3200);
  },
  'clear-filters': () => {
    filters.q = ''; filters.vacancy = ''; filters.status = '';
    const q = $('#filter-q'); if (q) q.value = '';
    const v = $('#filter-vacancy'); if (v) v.value = '';
    const s = $('#filter-status'); if (s) s.value = '';
    const body = $('#candidates-body');
    if (body) { body.innerHTML = candidatesTableBody(); refreshIcons(); animateIn(body); }
  },
};
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const fn = actions[el.dataset.action];
  if (fn) { if (el.tagName === 'A') e.preventDefault(); fn(el, e); }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && drawerOpen()) closeDrawer();
  if (e.key === 'Enter') {
    const row = e.target.closest && e.target.closest('tr[data-action="open-candidate"]');
    if (row) { const rec = state.evals.find((x) => x.id === row.dataset.id); if (rec) openDrawer(candidateDrawer(rec)); }
  }
});

window.addEventListener('hashchange', () => {
  /* Solo las rutas de aplicación re-renderizan; las anclas de la landing
     (#problema, #flujo…) dejan que el navegador desplace de forma nativa. */
  if (location.hash.startsWith('#/')) route();
});

/* El reporte conserva su salida clara al imprimir, incluso si la interfaz se
   está usando en oscuro. La preferencia no se modifica ni se persiste. */
let themeBeforePrint = null;
window.addEventListener('beforeprint', () => {
  themeBeforePrint = isDarkTheme() ? 'dark' : 'light';
  if (themeBeforePrint === 'dark') applyTheme('light', false);
});
window.addEventListener('afterprint', () => {
  if (themeBeforePrint === 'dark') applyTheme('dark', false);
  themeBeforePrint = null;
});

/* --------------------------------------------------------------------------
   14. Arranque
   -------------------------------------------------------------------------- */
loadState();
route();
