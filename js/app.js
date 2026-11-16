// Rush · App de campo del Encargado de la marca
import { db, getSettings, saveSettings, getDraft, clearDraft, uid } from './db.js';
import { h, icons, icon, toast, fmtDate, fmtDateTime, todayISO, nowTime, daysBetween, imgFor, photoLink } from './ui.js';
import { VISITA, COMERCIO, DEGUSTACION, allFields, disponibilidad, totalesHoras, lift } from './schema.js';
import { runWizard, getGPS, photoMetaFor } from './form.js';
import { syncAll, pull, fullSync, pendingCount, onSyncChange, isConfigured, login, getParams, splitList, SHEET_NAME } from './sync.js';
import { renderDashboard } from './dashboard.js';

const root = document.getElementById('app');
const nav = document.getElementById('nav');
const user = () => getSettings().user || 'Encargado';
const norm = (x) => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
// Cada registro es de quien lo cargó; solo esa persona lo puede modificar.
// El rol "tablero" es solo de consulta: ve todo, no carga ni modifica nada.
const soloLectura = () => getSettings().rol === 'tablero';
const esMio = (r) => !soloLectura() && (!r.user || norm(r.user) === norm(user()));

// ---------------------------------------------------------------- contexto compartido
async function context() {
  const [comercios, params] = await Promise.all([db.all('comercio'), getParams()]);
  return {
    comercioRecs: comercios,
    comercios: comercios.map((c) => ({ id: c.id, nombre: c.data.nombre, zona: c.data.zona, ciudad: c.data.ciudad }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    params,
    lists: {
      marcas: splitList(params.marcas_competencia),
      vendedores: splitList(params.vendedores),
      beneficios: splitList(params.beneficios),
    },
  };
}
const comercioName = (ctx) => (d) => ctx.comercios.find((c) => c.id === d.comercio)?.nombre;

// ---------------------------------------------------------------- router
const routes = [
  [/^#?\/?$/, home],
  [/^#\/visita\/nueva$/, nuevaVisita],
  [/^#\/visita\/([\w-]+)$/, verRegistro],
  [/^#\/comercios$/, comercios],
  [/^#\/comercio\/nuevo$/, () => editarComercio(null)],
  [/^#\/comercio\/([\w-]+)\/editar$/, editarComercio],
  [/^#\/comercio\/([\w-]+)$/, fichaComercio],
  [/^#\/degustaciones$/, degustaciones],
  [/^#\/degustacion\/nueva$/, () => degustacionFase(null, 'antes')],
  [/^#\/degustacion\/([\w-]+)\/(antes|durante|despues)$/, degustacionFase],
  [/^#\/degustacion\/([\w-]+)$/, verRegistro],
  [/^#\/tablero$/, tablero],
  [/^#\/ajustes$/, ajustes],
];

async function router() {
  const hash = location.hash || '#/';
  if (!isConfigured()) return bienvenida();
  buildNav();
  // Usuario de consulta: el tablero es su inicio y no entra a ninguna pantalla de carga.
  if (soloLectura() && (hash === '#/' || hash === '#' || /nueva|nuevo|editar|antes|durante|despues/.test(hash))) {
    location.replace('#/tablero');
    return;
  }
  root.classList.toggle('wide', soloLectura() && hash.startsWith('#/tablero'));
  for (const [re, fn] of routes) {
    const m = hash.match(re);
    if (m) {
      const fullscreen = /nueva|nuevo|editar|antes|durante|despues/.test(hash);
      nav.hidden = fullscreen;
      setNav(hash);
      root.replaceChildren();
      window.scrollTo(0, 0);
      await fn(...m.slice(1));
      return;
    }
  }
  location.hash = '#/';
}
window.addEventListener('hashchange', router);
const go = (hash) => { location.hash = hash; };

function setNav(hash) {
  const key = hash.startsWith('#/comercio') ? 'comercios' : hash.startsWith('#/tablero') ? 'tablero' : hash.startsWith('#/degust') ? 'degust' : hash === '#/' ? 'home' : '';
  nav.querySelectorAll('a').forEach((a) => a.classList.toggle('on', a.dataset.k === key));
}

// ---------------------------------------------------------------- piezas comunes
function topBar(extra) {
  const pill = h('button', { class: 'sync-pill', onclick: () => manualSync() }, h('span', { class: 'dot' }), h('span', { class: 'lbl' }, '…'));
  updatePill(pill);
  return h('header', { class: 'top' },
    h('a', { class: 'wordmark', href: '#/' }, 'Rush'),
    h('div', { class: 'top-actions' }, extra, pill,
      h('a', { class: 'icon-btn', href: '#/ajustes', 'aria-label': 'Tu cuenta' }, icon('gear'))));
}
async function updatePill(pill = document.querySelector('.sync-pill')) {
  if (!pill) return;
  const n = await pendingCount();
  pill.classList.toggle('pending', n > 0);
  pill.querySelector('.lbl').textContent = !isConfigured() ? 'Solo en el celular' : n ? `${n} sin subir` : 'Al día';
}
onSyncChange((s) => {
  const pill = document.querySelector('.sync-pill');
  if (pill) pill.classList.toggle('running', !!s.running);
  if (!s.running) updatePill();
});
async function manualSync() {
  if (!isConfigured()) { router(); return; }
  if (!navigator.onLine) { toast('Sin señal. Se sube solo cuando vuelva.'); return; }
  toast('Sincronizando…');
  const r = await fullSync();
  toast(r.failed ? `No se pudo subir ${r.failed}. ${r.lastError || ''}` : `Listo. ${r.done || 0} subidos, ${r.received || 0} recibidos.`);
  router();
}

const rowLink = (href, title, sub, right) => h('a', { class: 'row-link', href },
  h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, title), sub ? h('div', { class: 'row-sub' }, sub) : null),
  right || null, h('span', { class: 'chev', html: icons.chev }));

const syncTag = (r) => (r._demo ? h('span', { class: 'tag' }, 'Ejemplo') : r._sync !== 'ok' ? h('span', { class: 'tag red' }, 'Sin subir') : null);

// ---------------------------------------------------------------- bienvenida
function bienvenida() {
  nav.hidden = true;
  const inp = h('input', { class: 'input', id: 'w-name', placeholder: 'Tu usuario', autocomplete: 'username', autocapitalize: 'words' });
  const pin = h('input', { class: 'input', id: 'w-pin', type: 'password', inputmode: 'numeric', placeholder: 'Código', autocomplete: 'current-password' });
  const msg = h('p', { class: 'caption mt-3', role: 'status' });
  const entrar = async () => {
    if (!inp.value.trim()) { inp.focus(); return; }
    if (!pin.value.trim()) { pin.focus(); return; }
    btn.disabled = true;
    msg.textContent = 'Verificando…';
    try {
      const r = await login(inp.value.trim(), pin.value.trim());
      saveSettings({ user: r.user, pin: pin.value.trim(), rol: r.rol || 'campo' });
      // Antes de mostrar el inicio, trae todo lo que ya está en el Sheet (por si es un celular nuevo).
      msg.textContent = 'Trayendo tus datos…';
      await Promise.race([fullSync().catch(() => {}), new Promise((res) => setTimeout(res, 20000))]);
      updatePill();
      router();
    } catch (e) {
      btn.disabled = false;
      msg.textContent = /incorrect/i.test(e.message) ? 'Usuario o código incorrecto.' : 'No hay conexión. Para entrar la primera vez necesitás señal.';
    }
  };
  pin.addEventListener('keydown', (e) => { if (e.key === 'Enter') entrar(); });
  const btn = h('button', { class: 'btn btn-primary btn-block mt-6', onclick: entrar }, 'Entrar', h('span', { class: 'arrow' }, icon('arrow')));
  root.replaceChildren(h('div', { class: 'enter', style: { paddingTop: '10vh' } },
    h('p', { class: 'lk-eyebrow' }, '¿Qué vas a mover hoy?'),
    h('h1', { class: 'lk-title' }, h('span', { class: 'v' }, 'Hacé'), ' que pase', h('span', { class: 'x' }, '!')),
    h('p', { class: 'lk-word' }, 'Rush Energy'),
    h('hr', { class: 'rule' }),
    h('p', { class: 'body' }, 'Esta es tu herramienta de calle. Cada visita y cada degustación quedan registradas y llegan al tablero.'),
    h('div', { class: 'field mt-6' }, h('label', { class: 'field-label', for: 'w-name' }, 'Usuario'), inp),
    h('div', { class: 'field' }, h('label', { class: 'field-label', for: 'w-pin' }, 'Código de acceso'), pin),
    btn, msg));
}

// ---------------------------------------------------------------- inicio
async function home() {
  const [visitas, degs, ctx] = await Promise.all([db.all('visita'), db.all('degustacion'), context()]);
  const hoy = todayISO();
  const deHoy = visitas.filter((v) => v.data.fecha === hoy && esMio(v)).sort((a, b) => b.createdAt - a.createdAt);
  const draft = getDraft('visita');
  const abiertas = degs.filter((d) => d.status !== 'completa' && esMio(d));
  const vencidas = vencidasList(ctx.comercioRecs, visitas);
  const nombre = user().split(' ')[0];

  root.append(topBar(),
    h('section', { class: 'lockup enter' },
      h('p', { class: 'lk-eyebrow' }, '¿Qué vas a mover hoy?'),
      h('h1', { class: 'lk-title' }, h('span', { class: 'v' }, 'Hacé'), ' que pase', h('span', { class: 'x' }, '!')),
      h('p', { class: 'lk-word' }, 'Rush Energy'),
      h('hr', { class: 'rule' }),
      h('p', { class: 'body' }, `${nombre}, hoy llevás ${deHoy.length} ${deHoy.length === 1 ? 'visita' : 'visitas'}.`,
        vencidas.length ? ` Hay ${vencidas.length} ${vencidas.length === 1 ? 'comercio' : 'comercios'} con la visita vencida.` : ''),
      h('div', { class: 'btn-row mt-6' },
        h('a', { class: 'btn btn-primary', href: '#/visita/nueva' }, draft ? 'Seguir visita' : 'Nueva visita', h('span', { class: 'arrow' }, icon('arrow'))),
        h('a', { class: 'btn btn-secondary', href: '#/degustacion/nueva' }, 'Degustación'))),
  );

  const todos = [...visitas, ...degs, ...ctx.comercioRecs];
  const demos = todos.filter((r) => r._demo).length;
  const conError = todos.filter((r) => !r._demo && r._sync !== 'ok' && r._err);
  if (!isConfigured()) {
    root.append(h('div', { class: 'section' }, h('a', { class: 'card alert', href: '#/ajustes', style: { display: 'flex', textDecoration: 'none' } },
      h('span', { class: 'sym' }),
      h('div', { class: 'alert-body' }, h('div', { class: 'alert-title' }, 'No está conectada al Google Sheet'),
        h('div', { class: 'caption' }, 'Lo que cargues queda solo en este celular. Tocá acá para cargar el código de acceso.')))));
  } else if (conError.length) {
    root.append(h('div', { class: 'section' }, h('button', { class: 'card alert', onclick: manualSync, style: { display: 'flex', width: '100%', textAlign: 'left', color: 'inherit' } },
      h('span', { class: 'sym' }),
      h('div', { class: 'alert-body' }, h('div', { class: 'alert-title' }, `${conError.length} sin poder subir`),
        h('div', { class: 'caption' }, `${conError[0]._err}. Tocá para reintentar.`)))));
  }
  if (demos) {
    root.append(h('div', { class: 'section' }, h('div', { class: 'card alert' },
      h('span', { class: 'sym soft' }),
      h('div', { class: 'alert-body' }, h('div', { class: 'alert-title' }, 'Estás viendo datos de ejemplo'),
        h('div', { class: 'caption' }, 'Los datos de ejemplo no se suben nunca al Sheet. Borralos en Ajustes antes de empezar a cargar de verdad.')))));
  }

  if (draft) {
    const c = ctx.comercios.find((x) => x.id === draft.data?.comercio);
    root.append(h('div', { class: 'section' },
      h('div', { class: 'card flex' },
        h('div', { class: 'grow' }, h('div', { class: 'micro' }, 'Visita sin terminar'), h('div', { class: 'strong' }, c ? c.nombre : 'Sin comercio elegido'),
          h('div', { class: 'caption' }, `Paso ${(draft.i || 0) + 1} de ${VISITA.steps.length}`)),
        h('button', { class: 'btn btn-tertiary', onclick: () => { if (confirm('¿Descartar la visita sin terminar?')) { clearDraft('visita'); router(); } } }, 'Descartar'))));
  }

  if (abiertas.length) {
    root.append(h('div', { class: 'section' },
      h('div', { class: 'section-head' }, h('p', { class: 'eyebrow' }, 'Degustaciones abiertas')),
      abiertas.map((d) => degRow(d, ctx))));
  }

  if (vencidas.length) {
    root.append(h('div', { class: 'section' },
      h('div', { class: 'section-head' }, h('p', { class: 'eyebrow' }, 'Visita vencida'), h('a', { class: 'caption', href: '#/tablero' }, 'Ver tablero')),
      vencidas.slice(0, 5).map((x) => rowLink('#/comercio/' + x.c.id, x.c.data.nombre,
        x.last ? `Última: ${fmtDate(x.last)} · cada ${x.c.data.frecuencia} días` : 'Nunca visitado', h('span', { class: 'tag red' }, x.dias === null ? 'Nuevo' : `+${x.dias} d`)))));
  }

  root.append(h('div', { class: 'section' },
    h('div', { class: 'section-head' }, h('p', { class: 'eyebrow' }, 'Tus visitas de hoy')),
    deHoy.length ? deHoy.map((v) => visitaRow(v, ctx)) : h('p', { class: 'caption' }, 'Todavía no cargaste visitas hoy.')));
}

function vencidasList(comercios, visitas) {
  const lastBy = {};
  for (const v of visitas) {
    const k = v.data.comercio;
    if (!lastBy[k] || v.data.fecha > lastBy[k]) lastBy[k] = v.data.fecha;
  }
  const hoy = todayISO();
  return comercios
    .filter((c) => c.data.estado !== 'Caída' || true)
    .map((c) => {
      const last = lastBy[c.id];
      const freq = Number(c.data.frecuencia) || 7;
      const dias = last ? daysBetween(last, hoy) - freq : null;
      return { c, last, dias };
    })
    .filter((x) => x.dias === null || x.dias > 0)
    .sort((a, b) => (b.dias ?? 999) - (a.dias ?? 999));
}

function visitaRow(v, ctx) {
  const c = ctx.comercios.find((x) => x.id === v.data.comercio);
  const disp = disponibilidad(v.data);
  return rowLink('#/visita/' + v.id, c?.nombre || 'Comercio', `${fmtDate(v.data.fecha)} ${v.data.hora || ''} · ${v.data.tipo || ''}`,
    h('div', { class: 'flex', style: { gap: '6px' } }, syncTag(v), disp === false ? h('span', { class: 'tag red' }, 'Sin disp.') : null));
}

function degRow(d, ctx) {
  const lugar = d.data.lugar_tipo === 'Vía pública' ? d.data.lugar : ctx.comercios.find((c) => c.id === d.data.comercio)?.nombre;
  const st = d.status;
  const dias = d.closedAt ? daysBetween(d.closedAt, Date.now()) : 0;
  let next, href;
  if (st === 'antes') { next = 'Empezar · Durante'; href = `#/degustacion/${d.id}/durante`; }
  else if (st === 'cerrada') { next = dias >= 7 ? 'Cargar resultado de 7 días' : `Resultado en ${7 - dias} días`; href = `#/degustacion/${d.id}/despues`; }
  else { next = 'Completa'; href = `#/degustacion/${d.id}`; }
  if (!esMio(d)) { href = `#/degustacion/${d.id}`; next = `cargada por ${d.user}`; }
  return rowLink(href, lugar || 'Degustación', `${fmtDate(d.data.fecha)} · ${next}`,
    h('div', { class: 'flex', style: { gap: '6px' } }, syncTag(d), st === 'cerrada' && dias >= 7 ? h('span', { class: 'tag red' }, 'Toca hoy') : null));
}

// ---------------------------------------------------------------- visita
async function nuevaVisita() {
  const ctx = await context();
  const draft = getDraft('visita');
  const pre = sessionStorage.getItem('rush.preComercio');
  sessionStorage.removeItem('rush.preComercio');
  const data = draft?.data || { fecha: todayISO(), hora: nowTime() };
  if (pre) data.comercio = pre;
  if (draft) toast('Retomaste la visita sin terminar.');

  ctx.newComercio = () => { sessionStorage.setItem('rush.returnTo', '#/visita/nueva'); go('#/comercio/nuevo'); };
  const state = runWizard(root, {
    title: 'Nueva visita',
    steps: VISITA.steps,
    data,
    snaps: draft?.snaps,
    startStep: draft?.i || 0,
    ctx,
    draftKey: 'visita',
    saveLabel: 'Guardar visita',
    photoMeta: photoMetaFor('visita', comercioName(ctx)),
    onClose: () => go('#/'),
    onSave: async (d, snaps) => {
      const now = Date.now();
      // El nombre del comercio viaja con la visita, por si el comercio todavía no está en el celular que sincroniza.
      d.comercio_nombre = ctx.comercios.find((c) => c.id === d.comercio)?.nombre || '';
      const rec = { id: uid('v'), type: 'visita', createdAt: now, updatedAt: now, user: user(), data: d, snaps, _sync: 'pending' };
      clean(rec.data);
      await db.put(rec);
      clearDraft('visita');
      toast('Visita guardada.');
      syncAll().then(() => updatePill());
      go('#/visita/' + rec.id);
    },
  });
  if (!data.gps) getGPS().then((g) => { state.data.gps = g; }).catch(() => {});
}

function clean(d) { for (const k of Object.keys(d)) if (k.startsWith('_otra_')) delete d[k]; }

// ---------------------------------------------------------------- ver un registro (visita o degustación)
const FORM_OF = { visita: VISITA, comercio: COMERCIO, degustacion: DEGUSTACION };

async function verRegistro(id) {
  const rec = await db.get(id);
  const ctx = await context();
  if (!rec) { root.append(topBar(), h('p', { class: 'body mt-8' }, 'No encontré ese registro.')); return; }
  const form = FORM_OF[rec.type];
  const d = rec.data;
  const c = ctx.comercios.find((x) => x.id === d.comercio);
  const title = rec.type === 'visita' ? (c?.nombre || 'Visita') : (d.lugar || c?.nombre || 'Degustación');

  root.append(topBar(), h('div', { class: 'enter' },
    h('a', { class: 'btn btn-tertiary', href: rec.type === 'visita' ? '#/' : '#/degustaciones', style: { paddingLeft: 0 } }, icon('back'), 'Volver'),
    h('p', { class: 'eyebrow mt-4' }, rec.type === 'visita' ? `Visita · ${fmtDate(d.fecha)} ${d.hora || ''}` : `Degustación · ${fmtDate(d.fecha)}`),
    h('h1', { class: 'h1' }, title),
    h('div', { class: 'flex mt-3', style: { flexWrap: 'wrap', gap: '6px' } },
      syncTag(rec) || h('span', { class: 'tag' }, 'En el Sheet'),
      d.tipo ? h('span', { class: 'tag' }, d.tipo) : null,
      rec.user ? h('span', { class: 'tag' }, rec.user) : null)));

  if (rec.type === 'visita') {
    root.append(h('div', { class: 'section' }, renderInfo(d)));
  }
  if (rec.type === 'degustacion') {
    const t = totalesHoras(d.horas);
    const l = lift(d);
    root.append(h('div', { class: 'section kpis' },
      kpi('Degustadas', t.degustadas), kpi('Compras', t.compras, t.conversion === null ? '' : `${Math.round(t.conversion * 100)}% conversión`),
      kpi('Post-activación', l === null ? '—' : l.toFixed(2) + '×', 'Semana siguiente ÷ anterior', true)));
    if (rec.status !== 'completa' && esMio(rec)) {
      const ph = rec.status === 'antes' ? 'durante' : 'despues';
      root.append(h('a', { class: 'btn btn-primary btn-block mt-6', href: `#/degustacion/${rec.id}/${ph}` }, ph === 'durante' ? 'Seguir con Durante' : 'Cargar resultado de 7 días', h('span', { class: 'arrow' }, icon('arrow'))));
    }
  }

  const steps = form.steps || Object.values(form.phases).flatMap((p) => p.steps);
  for (const s of steps) {
    const items = s.fields.filter((f) => f.type !== 'info' && (!f.when || f.when(d)) && hasVal(d[f.k]));
    const snapItems = s.fields.filter((f) => rec.snaps?.[f.k]?.length);
    if (!items.length && !snapItems.length) continue;
    root.append(h('div', { class: 'section' },
      h('p', { class: 'eyebrow' }, s.title),
      h('div', { class: 'card' }, items.map((f) => valueRow(f, d[f.k], ctx)),
        snapItems.map((f) => h('div', { class: 'mt-3' }, h('div', { class: 'caption' }, 'Foto · ' + f.label),
          h('div', { class: 'snap-thumbs' }, rec.snaps[f.k].map((r) => thumbLink(r))))))));
  }
  root.append(h('div', { class: 'section caption' }, `Registrado ${fmtDateTime(rec.createdAt)}${rec._err ? ' · Error al subir: ' + rec._err : ''}`));
}
const hasVal = (v) => !(v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length));

function renderInfo(d) {
  const disp = disponibilidad(d);
  return h('div', { class: 'result' + (disp === false ? ' bad' : '') },
    h('div', { class: 'ico', html: disp === false ? icons.x : icons.checkThin }),
    h('div', {}, h('div', { class: 'h3' }, disp ? 'Disponibilidad efectiva' : 'Sin disponibilidad efectiva'),
      h('div', { class: 'caption' }, 'Frigider · adelante · stock · precio visible')));
}

function thumbLink(ref) {
  const a = h('a', { class: 'thumb', target: '_blank', rel: 'noopener' }, imgFor(ref));
  photoLink(ref).then((u) => { if (u) a.href = u; });
  return a;
}

function valueRow(f, v, ctx) {
  let out;
  switch (f.type) {
    case 'yesno': out = v === 'si' ? 'Sí' : 'No'; break;
    case 'check': out = v ? 'Sí' : 'No'; break;
    case 'consent': out = 'Confirmada ' + new Date(v).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }); break;
    case 'multi': out = v.join(', '); break;
    case 'money': out = 'Bs ' + v; break;
    case 'date': out = fmtDate(v); break;
    case 'gps': out = `${v.lat.toFixed(5)}, ${v.lng.toFixed(5)}`; break;
    case 'list': out = f.src === 'comercios' ? (ctx.comercios.find((c) => c.id === v)?.nombre || v) : v; break;
    case 'multitext': out = h('div', {}, v.filter(Boolean).map((x) => h('div', { class: 'quote mt-2' }, x))); break;
    case 'photo': case 'signature': out = h('div', { class: 'snap-thumbs' }, thumbLink(v)); break;
    case 'photos': out = h('div', { class: 'snap-thumbs' }, v.map(thumbLink)); break;
    case 'table': out = h('div', {}, v.map((r) => h('div', { class: 'caption' }, f.cols.map((c) => `${c.label}: ${c.type === 'yesno' ? (r[c.k] === 'si' ? 'Sí' : r[c.k] === 'no' ? 'No' : '') : r[c.k] ?? ''}`).join(' · ')))); break;
    case 'hours': out = h('div', {}, v.map((r) => h('div', { class: 'caption' }, `${r.hora} · ${r.abordadas || 0} abordadas · ${r.degustadas || 0} degustadas · ${r.original || 0} O · ${r.zero || 0} Z${r.nota ? ' · ' + r.nota : ''}`))); break;
    default: out = String(v);
  }
  const block = typeof out !== 'string' || out.length > 32;
  return h('div', { style: { padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' } },
    block
      ? [h('div', { class: 'caption' }, f.label), typeof out === 'string' ? h('div', { class: 'strong mt-2' }, out) : out]
      : h('div', { class: 'flex between' }, h('span', { class: 'caption grow' }, f.label), h('span', { class: 'strong', style: { textAlign: 'right' } }, out)));
}

function kpi(label, num, cap, wide) {
  return h('div', { class: 'kpi' + (wide ? ' wide' : '') }, h('span', { class: 'micro' }, label), h('div', {}, h('div', { class: 'kpi-num' }, num), cap ? h('div', { class: 'caption' }, cap) : null));
}

// ---------------------------------------------------------------- comercios
async function comercios() {
  const [ctx, visitas] = await Promise.all([context(), db.all('visita')]);
  const lastBy = {};
  for (const v of visitas) if (!lastBy[v.data.comercio] || v.data.fecha > lastBy[v.data.comercio].data.fecha) lastBy[v.data.comercio] = v;
  const q = h('input', { class: 'input', type: 'search', placeholder: 'Buscar comercio o barrio' });
  const list = h('div', { class: 'mt-4' });
  let filtro = 'Todos';
  const chips = h('div', { class: 'filters mt-3' });
  const drawChips = () => chips.replaceChildren(...['Todos', 'Piloto', 'Nueva', 'Activa', 'Recurrente', 'Creciendo', 'Caída'].map((x) =>
    h('button', { class: 'seg-opt', style: { minHeight: '40px', padding: '8px 14px', flex: 'none' }, 'aria-pressed': String(filtro === x), onclick: () => { filtro = x; drawChips(); draw(); } }, x)));
  const draw = () => {
    const s = q.value.trim().toLowerCase();
    const items = ctx.comercioRecs
      .filter((c) => filtro === 'Todos' || (filtro === 'Piloto' ? c.data.piloto === 'si' : c.data.estado === filtro))
      .filter((c) => !s || `${c.data.nombre} ${c.data.zona}`.toLowerCase().includes(s))
      .sort((a, b) => a.data.nombre.localeCompare(b.data.nombre));
    list.replaceChildren(...items.map((c) => {
      const lv = lastBy[c.id];
      const disp = lv ? disponibilidad(lv.data) : null;
      return rowLink('#/comercio/' + c.id, c.data.nombre, `${c.data.zona || ''} · ${lv ? 'última ' + fmtDate(lv.data.fecha) : 'sin visitas'}`,
        h('div', { class: 'flex', style: { gap: '6px' } }, syncTag(c), h('span', { class: 'tag' + (c.data.estado === 'Caída' || disp === false ? ' red' : '') }, c.data.estado || '—')));
    }), items.length ? '' : h('p', { class: 'caption' }, ctx.comercioRecs.length ? 'No hay coincidencias.' : 'Todavía no hay comercios. Dalos de alta en la primera visita.'));
  };
  q.addEventListener('input', draw);
  drawChips(); draw();
  root.append(topBar(), h('div', { class: 'enter' },
    h('p', { class: 'eyebrow mt-4' }, 'Maestro de cuentas'),
    h('div', { class: 'flex between' }, h('h1', { class: 'h1' }, 'Comercios'), h('span', { class: 'micro' }, ctx.comercioRecs.length)),
    soloLectura() ? null : h('a', { class: 'btn btn-secondary btn-block mt-4', href: '#/comercio/nuevo' }, icon('plus'), 'Alta de comercio'),
    h('div', { class: 'search mt-4' }, h('span', { html: icons.search }), q), chips, list));
}

async function editarComercio(id) {
  const ctx = await context();
  const rec = id ? await db.get(id) : null;
  if (rec && !esMio(rec)) { toast(`Esta ficha la cargó ${rec.user}. No la podés editar.`); go('#/comercio/' + id); return; }
  const draftKey = 'comercio-' + (id || 'nuevo');
  const draft = getDraft(draftKey);
  runWizard(root, {
    title: rec ? 'Editar comercio' : 'Alta de comercio',
    steps: COMERCIO.steps,
    data: draft?.data || rec?.data || {},
    startStep: draft?.i || 0,
    ctx,
    draftKey,
    saveLabel: rec ? 'Guardar cambios' : 'Dar de alta',
    photoMeta: photoMetaFor('comercio', (d) => d.nombre),
    onClose: () => { clearDraft(draftKey); history.length > 1 ? history.back() : go('#/comercios'); },
    onSave: async (d) => {
      clean(d);
      const now = Date.now();
      const prev = rec?.data?.estado;
      const out = rec ? { ...rec, data: d, updatedAt: now, _sync: 'pending' } : { id: uid('c'), type: 'comercio', createdAt: now, updatedAt: now, user: user(), data: d, _sync: 'pending' };
      if (!rec || prev !== d.estado) out.data.estado_desde = todayISO();
      if (!out.data.gps) { try { out.data.gps = await getGPS(); } catch {} }
      await db.put(out);
      clearDraft(draftKey);
      toast(rec ? 'Ficha actualizada.' : 'Comercio dado de alta.');
      syncAll().then(() => updatePill());
      const back = sessionStorage.getItem('rush.returnTo');
      if (back) {
        sessionStorage.removeItem('rush.returnTo');
        sessionStorage.setItem('rush.preComercio', out.id);
        go(back);
      } else go('#/comercio/' + out.id);
    },
  });
}

async function fichaComercio(id) {
  const rec = await db.get(id);
  if (!rec) { root.append(topBar(), h('p', { class: 'body mt-8' }, 'No encontré ese comercio.')); return; }
  const d = rec.data;
  const visitas = (await db.all('visita')).filter((v) => v.data.comercio === id).sort((a, b) => (b.data.fecha + b.data.hora).localeCompare(a.data.fecha + a.data.hora));
  const pedidos = ((await db.getMeta('pedidos', [])) || []).filter((p) => String(p.comercio || p.Comercio || '').trim().toLowerCase() === d.nombre.trim().toLowerCase());
  const ult = visitas[0]?.data;
  const ctx = await context();

  root.append(topBar(), h('div', { class: 'enter' },
    h('a', { class: 'btn btn-tertiary', href: '#/comercios', style: { paddingLeft: 0 } }, icon('back'), 'Comercios'),
    h('p', { class: 'eyebrow mt-4' }, [d.tipo_pdv, d.zona].filter(Boolean).join(' · ')),
    h('h1', { class: 'h1' }, d.nombre),
    h('div', { class: 'flex mt-3', style: { flexWrap: 'wrap', gap: '6px' } },
      h('span', { class: 'tag' + (d.estado === 'Caída' ? ' red' : '') }, d.estado || 'Sin estado'),
      d.piloto === 'si' ? h('span', { class: 'tag' }, 'Piloto · ' + (d.piloto_grupo || '')) : null,
      d.exhibidor_n ? h('span', { class: 'tag' }, 'Exhibidor N° ' + d.exhibidor_n) : null, syncTag(rec)),
    soloLectura() ? null : h('div', { class: 'btn-row mt-6' },
      h('button', { class: 'btn btn-primary', onclick: () => {
        if (getDraft('visita') && !confirm('Tenés una visita sin terminar. ¿Descartarla y empezar una en este comercio?')) return;
        clearDraft('visita'); sessionStorage.setItem('rush.preComercio', id); go('#/visita/nueva');
      } }, 'Visitar ahora', h('span', { class: 'arrow' }, icon('arrow'))),
      esMio(rec) ? h('a', { class: 'btn btn-secondary', href: `#/comercio/${id}/editar` }, 'Editar ficha') : null),
    esMio(rec) || soloLectura() ? null : h('p', { class: 'caption mt-3' }, `Ficha cargada por ${rec.user}. Solo esa persona la puede editar.`)));

  if (d.objetivo) root.append(h('div', { class: 'section' }, h('p', { class: 'eyebrow' }, 'Objetivo a 30 días'), h('div', { class: 'quote' }, d.objetivo)));

  if (ult) {
    const disp = disponibilidad(ult);
    root.append(h('div', { class: 'section' },
      h('p', { class: 'eyebrow' }, `Último relevamiento · ${fmtDate(ult.fecha)}`),
      h('div', { class: 'card' }, h('dl', { class: 'kv', style: { margin: 0 } },
        ...kv('Disponibilidad efectiva', disp === null ? '—' : disp ? 'Sí' : 'No'),
        ...kv('Rush en frío', yn(ult.en_frio)), ...kv('Adelante y visible', yn(ult.adelante)), ...kv('Original y ZERO juntas', yn(ult.juntas)),
        ...kv('Latas Original / ZERO', `${ult.latas_original ?? '—'} / ${ult.latas_zero ?? '—'}`),
        ...kv('Precio Original / ZERO', `Bs ${ult.precio_original ?? '—'} / Bs ${ult.precio_zero ?? '—'}`),
        ...kv('Cómo se vende', ult.demanda || '—'),
        ult.comp_frente ? kv('Al frente en vez de Rush', ult.comp_frente) : [],
        ult.comp_promo === 'si' ? kv('Promo competencia', ult.comp_promo_desc || 'Sí') : [],
        ult.pendiente ? kv('Pendiente', ult.pendiente) : []))));
  }

  root.append(h('div', { class: 'section' },
    h('p', { class: 'eyebrow' }, 'Datos'),
    h('div', { class: 'card' }, h('dl', { class: 'kv', style: { margin: 0 } },
      ...kv('Ciudad', d.ciudad), ...kv('Dirección', d.direccion), ...kv('Decide', d.decisor),
      ...kv('WhatsApp', d.whatsapp ? h('a', { href: 'https://wa.me/' + String(d.whatsapp).replace(/\D/g, ''), target: '_blank', rel: 'noopener' }, d.whatsapp) : '—'),
      ...kv('Distribuidor', d.distribuidor), ...kv('Vendedor', d.vendedor),
      ...kv('Visita', `${d.dia || ''} ${d.horario || ''} · cada ${d.frecuencia || '—'} días`), ...kv('Pide por', d.como_pide),
      d.gps?.lat ? kv('Mapa', h('a', { href: `https://maps.google.com/?q=${d.gps.lat},${d.gps.lng}`, target: '_blank', rel: 'noopener' }, 'Abrir ubicación')) : [],
      d.estado === 'Caída' ? [...kv('Motivo de caída', d.motivo_caida), ...kv('Último pedido', fmtDate(d.ultimo_pedido)), ...kv('Con sus palabras', d.motivo_real)] : [],
      d.frase_comerciante ? kv('Frase para ofrecerla', d.frase_comerciante) : []))));

  if (d.competencia?.length) {
    root.append(h('div', { class: 'section' }, h('p', { class: 'eyebrow' }, 'Lo que compite'),
      h('div', { class: 'card' }, d.competencia.map((c) => h('div', { class: 'flex between', style: { padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' } },
        h('span', { class: 'strong' }, c.marca || '—'), h('span', { class: 'caption' }, [c.precio ? 'Bs ' + c.precio : '', c.formato, c.fria === 'si' ? 'fría' : c.fria === 'no' ? 'no fría' : '', c.ranking ? '#' + c.ranking : ''].filter(Boolean).join(' · ')))))));
  }

  if (pedidos.length) {
    root.append(h('div', { class: 'section' }, h('p', { class: 'eyebrow' }, 'Pedidos reportados por la embotelladora'),
      h('div', { class: 'card' }, pedidos.slice(-8).reverse().map((p) => h('div', { class: 'flex between', style: { padding: '6px 0' } },
        h('span', { class: 'caption' }, fmtDate(p.fecha || p.Fecha)), h('span', { class: 'strong' }, `${p.cajas_original ?? p['Cajas Original'] ?? 0} O · ${p.cajas_zero ?? p['Cajas ZERO'] ?? 0} Z`))))));
  }

  const premios = visitas.filter((v) => v.data.premio === 'si');
  if (premios.length) {
    root.append(h('div', { class: 'section' }, h('p', { class: 'eyebrow' }, 'Premios entregados'),
      premios.map((v) => rowLink('#/visita/' + v.id, v.data.premio_beneficio || 'Premio', `${fmtDate(v.data.fecha)} · nivel ${v.data.premio_nivel}`))));
  }

  root.append(h('div', { class: 'section' }, h('p', { class: 'eyebrow' }, `Visitas (${visitas.length})`),
    visitas.length ? visitas.map((v) => visitaRow(v, ctx)) : h('p', { class: 'caption' }, 'Sin visitas todavía.')));
}
const yn = (v) => (v === 'si' ? 'Sí' : v === 'no' ? 'No' : '—');
const kv = (k, v) => [h('dt', {}, k), h('dd', {}, v === undefined || v === null || v === '' ? '—' : v)];

// ---------------------------------------------------------------- degustaciones
async function degustaciones() {
  const [degs, ctx] = await Promise.all([db.all('degustacion'), context()]);
  degs.sort((a, b) => b.createdAt - a.createdAt);
  root.append(topBar(), h('div', { class: 'enter' },
    h('p', { class: 'eyebrow mt-4' }, 'Antes · durante · a los 7 días'),
    h('h1', { class: 'h1' }, 'Degustaciones'),
    soloLectura() ? null : h('a', { class: 'btn btn-primary btn-block mt-6', href: '#/degustacion/nueva' }, 'Nueva degustación', h('span', { class: 'arrow' }, icon('arrow'))),
    h('div', { class: 'mt-6' }, degs.length ? degs.map((d) => degRow(d, ctx)) : h('p', { class: 'caption' }, 'Todavía no hay degustaciones.'))));
}

async function degustacionFase(id, phase) {
  const ctx = await context();
  ctx.newComercio = () => toast('Dalo de alta desde Comercios y volvé.');
  let rec = id ? await db.get(id) : null;
  if (id && !rec) { go('#/degustaciones'); return; }
  if (rec && !esMio(rec)) { toast(`Esta degustación la cargó ${rec.user}. No la podés modificar.`); go('#/degustacion/' + id); return; }
  const draftKey = `deg-${id || 'nueva'}-${phase}`;
  const draft = getDraft(draftKey);
  const ph = DEGUSTACION.phases[phase];
  const data = draft?.data || { ...(rec?.data || {}) };
  if (phase === 'antes' && !data.promotor) data.promotor = '';
  runWizard(root, {
    title: `Degustación · ${ph.label}`,
    steps: ph.steps,
    data,
    snaps: draft?.snaps || rec?.snaps,
    startStep: draft?.i || 0,
    ctx,
    draftKey,
    saveLabel: phase === 'antes' ? 'Guardar y quedar listo' : phase === 'durante' ? 'Cerrar el evento' : 'Guardar resultado',
    photoMeta: photoMetaFor('degustacion', (d) => (d.lugar_tipo === 'Vía pública' ? d.lugar : comercioName(ctx)(d))),
    onClose: () => go(rec ? '#/degustaciones' : '#/'),
    onSave: async (d, snaps) => {
      clean(d);
      const now = Date.now();
      if (!rec) rec = { id: uid('d'), type: 'degustacion', createdAt: now, user: user(), data: {}, snaps: {} };
      rec.data = { ...rec.data, ...d };
      if (rec.data.comercio) rec.data.comercio_nombre = ctx.comercios.find((c) => c.id === rec.data.comercio)?.nombre || rec.data.comercio_nombre || '';
      rec.snaps = { ...(rec.snaps || {}), ...(snaps || {}) };
      rec.updatedAt = now;
      rec._sync = 'pending';
      if (phase === 'antes') rec.status = 'antes';
      if (phase === 'durante') { rec.status = 'cerrada'; rec.closedAt = now; }
      if (phase === 'despues') rec.status = 'completa';
      await db.put(rec);
      clearDraft(draftKey);
      toast(phase === 'antes' ? 'Listo. Cuando arranque, abrí "Durante".' : phase === 'durante' ? 'Evento cerrado. En 7 días te aviso para el resultado.' : 'Degustación completa.');
      syncAll().then(() => updatePill());
      go(phase === 'antes' ? `#/degustacion/${rec.id}/durante` : '#/degustacion/' + rec.id);
    },
  });
}

// ---------------------------------------------------------------- tablero
async function tablero() {
  root.append(topBar());
  const box = h('div');
  root.append(box);
  await renderDashboard(box, await context(), { full: soloLectura() });
}

// ---------------------------------------------------------------- ajustes
async function ajustes() {
  // Pantalla de solo lectura: no hay nada configurable en la app.
  const status = h('p', { class: 'caption mt-3', role: 'status' });
  const pend = await pendingCount();
  const lastSync = await db.getMeta('lastSync');
  root.append(topBar(), h('div', { class: 'enter' },
    h('p', { class: 'eyebrow mt-4' }, 'Tu cuenta'),
    h('h1', { class: 'h1' }, user()),
    h('div', { class: 'section' },
      h('div', { class: 'card' },
        h('div', { class: 'micro' }, 'Todo se guarda en'),
        h('div', { class: 'h3 mt-2' }, SHEET_NAME),
        h('p', { class: 'caption mt-2' }, soloLectura()
          ? 'Tu usuario es de consulta: ves todos los tableros y registros, pero no podés cargar ni modificar nada.'
          : 'Es fijo y no se puede cambiar. Lo que cargás queda a tu nombre y nadie más lo puede modificar.')),
      h('div', { class: 'btn-row mt-4' },
        h('button', { class: 'btn btn-primary', onclick: async () => {
          status.textContent = 'Sincronizando…';
          try { const x = await fullSync(); status.textContent = x.skipped && !soloLectura() ? 'Sin señal. Se sube solo cuando vuelva.' : `Listo. ${x.done || 0} subidos, ${x.received || 0} recibidos.${x.failed ? ` ${x.failed} con error: ${x.lastError}` : ''}`; updatePill(); }
          catch (e) { status.textContent = 'No se pudo sincronizar: ' + e.message; }
        } }, icon('sync'), 'Sincronizar ahora')),
      status,
      h('p', { class: 'caption mt-3' }, `${pend} registros sin subir · última sincronización: ${lastSync ? fmtDateTime(lastSync) : 'nunca'}`)),
    h('div', { class: 'section' },
      h('hr', { class: 'divider' }),
      h('button', { class: 'btn btn-secondary btn-block', onclick: () => cerrarSesion(status) }, 'Cerrar sesión'),
      h('p', { class: 'caption mt-2' }, 'Al cerrar sesión se borran los datos guardados en este celular. Lo que ya está en el Sheet no se toca.')),
    h('p', { class: 'caption mt-8' }, 'Rush · App de campo · v1.4')));
}

// Cerrar sesión: primero intenta subir lo pendiente; si queda algo sin subir, no deja salir
// (se perdería). Después borra todo lo local para que el próximo usuario empiece limpio.
async function cerrarSesion(status) {
  if (getDraft('visita') && !confirm('Tenés una visita sin terminar. Si cerrás sesión se pierde. ¿Seguir?')) return;
  let pend = await pendingCount();
  if (pend && !soloLectura()) {
    status.textContent = 'Subiendo lo pendiente antes de salir…';
    try { await syncAll(); } catch {}
    pend = await pendingCount();
    if (pend) {
      status.textContent = '';
      alert(`Hay ${pend} ${pend === 1 ? 'registro' : 'registros'} sin subir al Sheet. Conectate a internet, tocá "Sincronizar ahora" y después cerrá sesión. Si salís ahora, se pierden.`);
      return;
    }
  }
  if (!confirm(`¿Cerrar la sesión de ${user()}?`)) return;
  await db.clearAll();
  try {
    Object.keys(localStorage).filter((k) => k.startsWith('rush.')).forEach((k) => localStorage.removeItem(k));
    sessionStorage.clear();
  } catch {}
  navRol = null;
  root.classList.remove('wide');
  location.hash = '#/';
  router();
}

// ---------------------------------------------------------------- navegación según el rol
let navRol = null;
function buildNav() {
  const rol = soloLectura() ? 'tablero' : 'campo';
  if (navRol === rol) return;
  navRol = rol;
  nav.replaceChildren(rol === 'tablero'
    ? h('div', { class: 'nav-in', style: { gridTemplateColumns: 'repeat(3, 1fr)' } },
        h('a', { href: '#/tablero', 'data-k': 'tablero' }, icon('chart'), 'Tablero'),
        h('a', { href: '#/comercios', 'data-k': 'comercios' }, icon('store'), 'Comercios'),
        h('a', { href: '#/degustaciones', 'data-k': 'degust' }, icon('cup'), 'Degust.'))
    : h('div', { class: 'nav-in' },
        h('a', { href: '#/', 'data-k': 'home' }, icon('home'), 'Inicio'),
        h('a', { href: '#/degustaciones', 'data-k': 'degust' }, icon('cup'), 'Degust.'),
        h('a', { href: '#/comercios', 'data-k': 'comercios' }, icon('store'), 'Comercios'),
        h('a', { href: '#/tablero', 'data-k': 'tablero' }, icon('chart'), 'Tablero')));
}

// ---------------------------------------------------------------- arranque
async function boot() {
  await router();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  // Sincroniza al abrir, al volver la señal, al volver a la app y cada 5 minutos.
  // Si llegaron datos nuevos, redibuja la pantalla (salvo que haya un formulario abierto).
  const refresh = async () => {
    if (!isConfigured()) return;
    try {
      const r = await fullSync();
      updatePill();
      if (r.received && nav.hidden === false) router();
    } catch {}
  };
  refresh();
  window.addEventListener('online', refresh);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refresh(); });
  setInterval(refresh, 5 * 60 * 1000);
}
boot();
