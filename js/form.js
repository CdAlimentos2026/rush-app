// Motor de formularios paso a paso. Lee los pasos de schema.js y dibuja cada campo.
import { h, icons, icon, openSheet, storePhoto, storeCanvas, pickPhoto, imgFor, toast, nowTime, todayISO, slug } from './ui.js';
import { saveDraft } from './db.js';
import { disponibilidad, DISP_KEYS, totalesHoras, lift } from './schema.js';

const visible = (f, d) => !f.when || f.when(d);

function isEmpty(f, v) {
  if (f.type === 'check' || f.type === 'consent') return !v;
  if (f.type === 'multi' || f.type === 'photos' || f.type === 'hours' || f.type === 'table') return !Array.isArray(v) || v.length === 0;
  if (f.type === 'multitext') return !Array.isArray(v) || v.filter((x) => x && x.trim()).length < (f.n || 1);
  return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
}
const isRequired = (f, d) => (typeof f.req === 'function' ? f.req(d) : !!f.req);

export function validateStep(step, d) {
  const errs = {};
  for (const f of step.fields) {
    if (!visible(f, d) || f.type === 'info') continue;
    if (isRequired(f, d) && isEmpty(f, d[f.k])) {
      errs[f.k] = f.type === 'check' ? 'Falta marcar.' : f.type === 'multitext' ? `Faltan respuestas (${f.n}).` : 'Este dato es obligatorio.';
    }
  }
  return errs;
}

/**
 * Abre un formulario de varios pasos a pantalla completa.
 * opts: { title, steps, data, snaps, ctx, draftKey, saveLabel, onSave(data, snaps), onClose(), photoMeta(k, data) }
 */
export function runWizard(root, opts) {
  const state = { i: opts.startStep || 0, data: { ...(opts.data || {}) }, snaps: { ...(opts.snaps || {}) }, errs: {} };
  const steps = opts.steps;
  const persist = () => opts.draftKey && saveDraft(opts.draftKey, { data: state.data, snaps: state.snaps, i: state.i, meta: opts.draftMeta });

  function set(k, v, rerender = true) {
    state.data[k] = v;
    if (state.errs[k]) { delete state.errs[k]; rerender = true; }
    persist();
    if (rerender) renderBody();
  }
  const setSnaps = (k, arr) => { state.snaps[k] = arr; persist(); renderBody(); };

  const top = h('div', { class: 'wiz-top' });
  const head = h('div', { class: 'wiz-head' });
  const body = h('div', { class: 'wiz-body' });
  const foot = h('div', { class: 'wiz-foot' });
  root.replaceChildren(top, head, body, foot);

  function renderChrome() {
    const step = steps[state.i];
    top.replaceChildren(
      h('div', { class: 'wiz-bar' },
        h('button', { class: 'icon-btn', 'aria-label': 'Cerrar', onclick: () => opts.onClose?.() }, icon('x')),
        h('div', { class: 'grow micro', style: { textAlign: 'center' } }, opts.title),
        h('div', { class: 'micro', style: { width: '44px', textAlign: 'right' } }, `${state.i + 1}/${steps.length}`)),
      h('div', { class: 'progress' }, steps.map((_, j) => h('span', { class: j < state.i ? 'done' : j === state.i ? 'now' : '' }))),
    );
    head.replaceChildren(h('div', { class: 'enter' },
      h('p', { class: 'eyebrow' }, step.eyebrow || ''),
      h('h1', { class: 'h1' }, step.title)));
    const last = state.i === steps.length - 1;
    foot.replaceChildren(h('div', { class: 'wiz-foot-in' },
      state.i > 0 ? h('button', { class: 'btn btn-secondary btn-icon', onclick: prev, 'aria-label': 'Paso anterior' }, icon('back')) : null,
      h('button', { class: 'btn btn-primary', onclick: next },
        last ? (opts.saveLabel || 'Guardar') : step.gate ? 'Todo listo, empezar' : 'Siguiente',
        h('span', { class: 'arrow' }, icon('arrow')))));
  }

  function renderBody() {
    const step = steps[state.i];
    const y = window.scrollY;
    const frag = [];
    let lastGroup = null;
    for (const f of step.fields) {
      if (!visible(f, state.data)) continue;
      if (f.group && f.group !== lastGroup) { frag.push(h('p', { class: 'eyebrow group-label' }, f.group)); lastGroup = f.group; }
      frag.push(renderField(f));
    }
    body.replaceChildren(...frag);
    window.scrollTo(0, y);
  }

  function renderField(f) {
    const v = state.data[f.k];
    const err = state.errs[f.k];
    const wrap = h('div', { class: 'field' + (err ? ' invalid' : ''), 'data-k': f.k });
    if (f.type !== 'check' && f.type !== 'info') {
      wrap.append(h('label', { class: 'field-label', for: 'f-' + f.k }, f.label, isRequired(f, state.data) ? h('span', { class: 'req', 'aria-hidden': 'true' }, '*') : null));
    }
    if (f.hint) wrap.append(h('p', { class: 'field-hint' }, f.hint));
    wrap.append(FIELD[f.type](f, v, (nv, rr) => set(f.k, nv, rr), state, opts));
    if (f.snap) wrap.append(...snapUI(f));
    if (err) wrap.append(h('div', { class: 'field-error', role: 'alert' }, err));
    return wrap;
  }

  function snapUI(f) {
    const arr = state.snaps[f.k] || [];
    const suggest = f.snap(state.data[f.k], state.data);
    const btn = h('button', { class: 'snap' + (suggest ? ' suggest' : ''), type: 'button',
      onclick: async () => {
        const files = await pickPhoto();
        if (!files.length) return;
        const ref = await storePhoto(files[0], opts.photoMeta(f.k, state.data));
        setSnaps(f.k, [...arr, ref]);
      } }, icon('camera'), suggest ? 'Sacale una foto a esto' : 'Foto (opcional)');
    const thumbs = arr.length ? h('div', { class: 'snap-thumbs' }, arr.map((ref, j) => h('div', { class: 'thumb' }, imgFor(ref),
      h('button', { class: 'x', 'aria-label': 'Quitar foto', onclick: () => setSnaps(f.k, arr.filter((_, x) => x !== j)) }, '×')))) : null;
    return [btn, thumbs];
  }

  function next() {
    const step = steps[state.i];
    state.errs = validateStep(step, state.data);
    if (Object.keys(state.errs).length) {
      renderBody();
      const first = body.querySelector('.field.invalid');
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast(step.gate ? 'Falta marcar ítems: no se empieza sin el estándar.' : 'Faltan datos obligatorios.');
      return;
    }
    if (state.i === steps.length - 1) { opts.onSave(state.data, state.snaps); return; }
    state.i++;
    persist();
    go();
  }
  function prev() { if (state.i > 0) { state.i--; persist(); go(); } }
  function go() { state.errs = {}; renderChrome(); renderBody(); window.scrollTo(0, 0); }

  go();
  return state;
}

// ---------------------------------------------------------------- campos
const seg = (label, pressed, onclick, cls = '') =>
  h('button', { type: 'button', class: 'seg-opt ' + cls, 'aria-pressed': String(!!pressed), onclick }, label);
const optBtn = (label, pressed, onclick, multi) =>
  h('button', { type: 'button', class: 'seg-opt' + (multi ? ' multi' : ''), 'aria-pressed': String(!!pressed), onclick },
    h('span', { class: 'mark', html: icons.check }), h('span', {}, label));

function textInput(f, v, set, type = 'text', extra = {}) {
  const inp = h('input', { class: 'input', id: 'f-' + f.k, type, value: v ?? '', maxlength: f.max, autocomplete: 'off', ...extra });
  inp.addEventListener('input', () => set(inp.value, false));
  return inp;
}

const FIELD = {
  text(f, v, set) {
    if (!f.max) return textInput(f, v, set);
    const inp = textInput(f, v, set);
    const c = h('div', { class: 'counter-text' }, `${(v || '').length}/${f.max}`);
    inp.addEventListener('input', () => { c.textContent = `${inp.value.length}/${f.max}`; });
    return h('div', {}, inp, c);
  },
  tel: (f, v, set) => textInput(f, v, set, 'tel', { inputmode: 'tel', placeholder: '+591 …' }),
  textarea(f, v, set) {
    const t = h('textarea', { class: 'input', id: 'f-' + f.k, rows: 4 });
    t.value = v ?? '';
    t.addEventListener('input', () => set(t.value, false));
    return t;
  },
  number: (f, v, set) => {
    const inp = textInput(f, v, set, 'number', { inputmode: 'numeric', min: 0, step: 1, placeholder: '0' });
    inp.addEventListener('change', () => set(inp.value, true));
    return inp;
  },
  money: (f, v, set) => h('div', { class: 'input-money' }, textInput(f, v, set, 'number', { inputmode: 'decimal', min: 0, step: '0.5', placeholder: '0' })),
  date: (f, v, set, st) => {
    if (!v && f.auto === 'today') { v = todayISO(); st.data[f.k] = v; }
    const inp = textInput(f, v, set, 'date');
    inp.addEventListener('change', () => set(inp.value, true));
    return inp;
  },
  time: (f, v, set) => {
    const inp = textInput(f, v, set, 'time');
    inp.addEventListener('change', () => set(inp.value, true));
    return inp;
  },
  yesno: (f, v, set) => h('div', { class: 'seg', role: 'group' },
    seg('Sí', v === 'si', () => set(v === 'si' ? undefined : 'si')),
    seg('No', v === 'no', () => set(v === 'no' ? undefined : 'no'))),
  single: (f, v, set) => h('div', { class: 'opts' + (f.opts.length <= 3 && f.opts.every((o) => o.length < 16) ? ' wrap' : ''), role: 'radiogroup' },
    f.opts.map((o) => optBtn(o, v === o, () => set(v === o ? undefined : o)))),
  multi: (f, v, set) => {
    const cur = Array.isArray(v) ? v : [];
    return h('div', { class: 'opts' }, f.opts.map((o) => optBtn(o, cur.includes(o), () => {
      let n = cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o];
      if (f.exclusive) n = o === f.exclusive && n.includes(o) ? [o] : n.filter((x) => x !== f.exclusive || o === f.exclusive);
      set(n);
    }, true)));
  },
  list(f, v, set, st, opts) {
    if (f.src === 'comercios') return comercioPicker(f, v, set, opts);
    const options = opts.ctx.lists[f.src] || [];
    if (!options.length) return textInput(f, v, set, 'text', { placeholder: 'Escribilo' });
    const other = v && !options.includes(v);
    const wrap = h('div', { class: 'opts' },
      options.map((o) => optBtn(o, v === o, () => { st.data['_otra_' + f.k] = false; set(v === o ? undefined : o); })),
      optBtn('Otra', other || st.data['_otra_' + f.k], () => { st.data['_otra_' + f.k] = !(other || st.data['_otra_' + f.k]); set(undefined); }));
    if (other || st.data['_otra_' + f.k]) {
      const inp = textInput(f, other ? v : '', set, 'text', { placeholder: '¿Cuál?' });
      wrap.append(inp);
    }
    return wrap;
  },
  check: (f, v, set) => h('button', { type: 'button', class: 'check', 'aria-pressed': String(!!v), onclick: () => set(!v) },
    h('span', { class: 'box', html: icons.check }), h('span', {}, f.label)),
  consent: (f, v, set) => v
    ? h('div', { class: 'result' }, h('div', { class: 'ico', html: icons.checkThin }),
        h('div', { class: 'grow' }, h('div', { class: 'h3' }, 'Conformidad registrada'), h('div', { class: 'caption' }, new Date(v).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }))),
        h('button', { class: 'btn btn-tertiary', onclick: () => set(undefined) }, 'Deshacer'))
    : h('button', { type: 'button', class: 'btn btn-secondary btn-block', onclick: () => set(Date.now()) }, 'Recibí el premio: confirmar'),
  photo(f, v, set, st, opts) {
    const slot = h('button', { type: 'button', class: 'photo-slot' + (v ? ' has' : ''), id: 'f-' + f.k,
      onclick: async () => {
        const files = await pickPhoto();
        if (!files.length) return;
        set(await storePhoto(files[0], opts.photoMeta(f.k, st.data)));
      } });
    if (v) slot.append(imgFor(v, true), h('span', { class: 'retake btn btn-secondary', style: { minHeight: '40px', padding: '8px 16px', background: 'rgba(14,15,29,.8)' } }, 'Repetir'));
    else slot.append(h('span', { html: icons.camera }), h('span', { class: 'small' }, 'Tocá para sacar la foto'));
    return slot;
  },
  photos(f, v, set, st, opts) {
    const arr = Array.isArray(v) ? v : [];
    return h('div', { class: 'thumbs' },
      arr.map((ref, j) => h('div', { class: 'thumb' }, imgFor(ref), h('button', { class: 'x', 'aria-label': 'Quitar', onclick: () => set(arr.filter((_, x) => x !== j)) }, '×'))),
      h('button', { type: 'button', class: 'thumb-add', 'aria-label': 'Agregar fotos', html: icons.plus,
        onclick: async () => {
          const files = await pickPhoto({ multiple: true });
          const refs = [];
          for (const file of files) refs.push(await storePhoto(file, opts.photoMeta(f.k, st.data)));
          if (refs.length) set([...arr, ...refs]);
        } }));
  },
  signature(f, v, set, st, opts) { return signaturePad(f, v, set, st, opts); },
  multitext(f, v, set) {
    const arr = Array.isArray(v) ? [...v] : [];
    return h('div', { class: 'stack' }, Array.from({ length: f.n }, (_, i) => {
      const inp = h('input', { class: 'input', value: arr[i] || '', placeholder: `Respuesta ${i + 1}` });
      inp.addEventListener('input', () => { arr[i] = inp.value; set([...arr], false); });
      return inp;
    }));
  },
  gps(f, v, set) {
    const status = h('div', { class: 'caption mt-2' }, v?.lat ? `${v.lat.toFixed(5)}, ${v.lng.toFixed(5)} · ±${Math.round(v.acc)} m` : 'Sin ubicación todavía.');
    return h('div', {},
      h('button', { type: 'button', class: 'btn btn-secondary', onclick: () => {
        status.textContent = 'Buscando…';
        getGPS().then((g) => set(g)).catch(() => { status.textContent = 'No se pudo tomar la ubicación. Revisá el permiso.'; });
      } }, icon('pin'), v?.lat ? 'Actualizar ubicación' : 'Tomar ubicación'),
      status);
  },
  info(f, v, set, st) {
    if (f.render === 'disponibilidad') return dispCard(st.data);
    if (f.render === 'lift') {
      const l = lift(st.data);
      return h('div', { class: 'result' + (l !== null && l < 1 ? ' bad' : '') },
        h('div', { class: 'ico', html: l !== null && l < 1 ? icons.x : icons.checkThin }),
        h('div', {}, h('div', { class: 'h3' }, l === null ? 'Nivel post-activación' : `${l.toFixed(2)}×`),
          h('div', { class: 'caption' }, l === null ? 'Se calcula con la venta de la semana siguiente.' : `Semana siguiente ÷ semana anterior (${st.data.venta_sem_siguiente} / ${st.data.venta_sem_anterior}).`)));
    }
    return h('div');
  },
  table(f, v, set) {
    const rows = Array.isArray(v) ? v.map((r) => ({ ...r })) : [];
    const upd = (rr = true) => set(rows.map((r) => ({ ...r })), rr);
    return h('div', {},
      rows.map((r, j) => h('div', { class: 'card trow' },
        h('div', { class: 'trow-head' }, h('span', { class: 'micro' }, `${f.label.split(' ')[0]} ${j + 1}`),
          h('button', { class: 'btn btn-tertiary', onclick: () => { rows.splice(j, 1); upd(); } }, 'Quitar')),
        f.cols.map((c) => {
          const inner = c.type === 'yesno'
            ? h('div', { class: 'seg' }, seg('Sí', r[c.k] === 'si', () => { r[c.k] = 'si'; upd(); }), seg('No', r[c.k] === 'no', () => { r[c.k] = 'no'; upd(); }))
            : (() => {
                const inp = h('input', { class: 'input', type: c.type === 'text' ? 'text' : 'number', inputmode: c.type === 'money' ? 'decimal' : c.type === 'number' ? 'numeric' : undefined, value: r[c.k] ?? '' });
                inp.addEventListener('input', () => { r[c.k] = inp.value; upd(false); });
                return c.type === 'money' ? h('div', { class: 'input-money' }, inp) : inp;
              })();
          return h('div', { class: 'field' }, h('label', { class: 'field-label' }, c.label), inner);
        }))),
      h('button', { type: 'button', class: 'btn btn-secondary mt-3', onclick: () => { rows.push({}); upd(); } }, icon('plus'), rows.length ? 'Agregar otra' : 'Agregar marca'));
  },
  hours(f, v, set) {
    const rows = Array.isArray(v) ? v.map((r) => ({ ...r })) : [];
    const upd = (rr = true) => set(rows.map((r) => ({ ...r })), rr);
    const t = totalesHoras(rows);
    const counter = (r, k, label) => {
      const num = h('span', { class: 'num' }, r[k] || 0);
      const bump = (d) => { r[k] = Math.max(0, (Number(r[k]) || 0) + d); num.textContent = r[k]; upd(true); };
      return h('div', { class: 'counter' }, h('div', { class: 'lbl' }, label),
        h('div', { class: 'ctl' },
          h('button', { type: 'button', class: 'minus', 'aria-label': 'Restar ' + label, onclick: () => bump(-1) }, '−'),
          num,
          h('button', { type: 'button', class: 'plus', 'aria-label': 'Sumar ' + label, onclick: () => bump(1) }, '+')));
    };
    return h('div', {},
      h('div', { class: 'kpis' },
        h('div', { class: 'kpi' }, h('span', { class: 'micro' }, 'Degustadas'), h('div', { class: 'kpi-num' }, t.degustadas)),
        h('div', { class: 'kpi' }, h('span', { class: 'micro' }, 'Compras'), h('div', { class: 'kpi-num' }, t.compras),
          h('div', { class: 'caption' }, t.conversion === null ? '—' : `${Math.round(t.conversion * 100)}% de conversión`))),
      rows.map((r, j) => h('div', { class: 'card hour-card mt-3' },
        h('div', { class: 'hour-head' },
          (() => { const inp = h('input', { class: 'input', type: 'time', value: r.hora || '', style: { width: '130px' } }); inp.addEventListener('change', () => { r.hora = inp.value; upd(false); }); return inp; })(),
          h('button', { class: 'btn btn-tertiary', onclick: () => { if (confirm('¿Borrar esta hora?')) { rows.splice(j, 1); upd(); } } }, 'Borrar')),
        h('div', { class: 'counters' },
          counter(r, 'abordadas', 'Abordadas'), counter(r, 'degustadas', 'Degustadas'),
          counter(r, 'original', 'Compra Original'), counter(r, 'zero', 'Compra ZERO')),
        (() => { const inp = h('input', { class: 'input mt-3', placeholder: 'Nota (opcional)', value: r.nota || '' }); inp.addEventListener('input', () => { r.nota = inp.value; upd(false); }); return inp; })(),
      )).reverse(),
      h('button', { type: 'button', class: 'btn btn-secondary btn-block mt-3', onclick: () => {
        rows.push({ hora: nowTime().slice(0, 2) + ':00', abordadas: 0, degustadas: 0, original: 0, zero: 0 }); upd();
      } }, icon('plus'), rows.length ? 'Nueva hora' : 'Empezar primera hora'));
  },
};

function dispCard(d) {
  const disp = disponibilidad(d);
  const names = { en_frio: 'Rush en el frigider', adelante: 'Adelante y visible', stock_alcanza: 'Stock hasta la próxima visita', precio_visible: 'Precio visible' };
  return h('div', { class: 'result' + (disp === false ? ' bad' : '') },
    h('div', { class: 'ico', html: disp === false ? icons.x : icons.checkThin }),
    h('div', { class: 'grow' },
      h('div', { class: 'h3' }, disp === null ? 'Disponibilidad incompleta' : disp ? 'Disponibilidad efectiva' : 'Sin disponibilidad efectiva'),
      h('ul', { class: 'result-list' }, DISP_KEYS.map((k) => h('li', { class: d[k] === 'si' ? 'ok' : 'ko' }, names[k] + (d[k] === 'si' ? '' : d[k] === 'no' ? ': no' : ': sin dato'))))));
}

function comercioPicker(f, v, set, opts) {
  const list = opts.ctx.comercios;
  const cur = list.find((c) => c.id === v);
  const open = () => openSheet((close) => {
    const q = h('input', { class: 'input', type: 'search', placeholder: 'Buscar por nombre o barrio', autocomplete: 'off' });
    const res = h('div', { class: 'mt-4' });
    const draw = () => {
      const s = q.value.trim().toLowerCase();
      const items = list.filter((c) => !s || `${c.nombre} ${c.zona}`.toLowerCase().includes(s)).slice(0, 60);
      res.replaceChildren(
        ...items.map((c) => h('button', { class: 'row-link', onclick: () => { set(c.id); close(); } },
          h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, c.nombre), h('div', { class: 'row-sub' }, [c.zona, c.ciudad].filter(Boolean).join(' · '))),
          c.id === v ? h('span', { class: 'tag red' }, 'Elegido') : null)),
        items.length ? '' : h('p', { class: 'caption' }, list.length ? 'No hay coincidencias.' : 'Todavía no hay comercios cargados.'),
        h('button', { class: 'btn btn-secondary btn-block mt-4', onclick: () => { close(); opts.ctx.newComercio?.(); } }, icon('plus'), 'Dar de alta un comercio nuevo'));
    };
    q.addEventListener('input', draw);
    draw();
    setTimeout(() => q.focus(), 100);
    return h('div', {}, h('p', { class: 'eyebrow' }, 'Elegí el comercio'), h('div', { class: 'search' }, h('span', { html: icons.search }), q), res);
  });
  return h('button', { type: 'button', class: 'row-link', id: 'f-' + f.k, onclick: open },
    h('div', { class: 'row-main' },
      h('div', { class: 'row-title' }, cur ? cur.nombre : 'Elegir comercio'),
      h('div', { class: 'row-sub' }, cur ? [cur.zona, cur.ciudad].filter(Boolean).join(' · ') : `${list.length} en la lista`)),
    h('span', { class: 'chev', html: icons.chev }));
}

function signaturePad(f, v, set, st, opts) {
  const canvas = h('canvas');
  const wrap = h('div', { class: 'sig-wrap' }, canvas, h('div', { class: 'sig-line' }), h('div', { class: 'sig-hint' }, 'Firmá con el dedo'));
  let ctx, drawing = false, dirty = false, last;
  const setup = () => {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return requestAnimationFrame(setup);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = r.width * dpr; canvas.height = r.height * dpr;
    ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#F5F4F0';
    if (v) imgFor(v).addEventListener('load', function () { ctx.drawImage(this, 0, 0, r.width, r.height); });
  };
  requestAnimationFrame(setup);
  const pt = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  canvas.addEventListener('pointerdown', (e) => { drawing = true; dirty = true; last = pt(e); canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const p = pt(e);
    ctx.beginPath(); ctx.moveTo(...last); ctx.lineTo(...p); ctx.stroke(); last = p;
  });
  const end = async () => {
    if (!drawing) return;
    drawing = false;
    if (dirty) set(await storeCanvas(canvas, opts.photoMeta(f.k, st.data)), false);
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  return h('div', {}, wrap, h('div', { class: 'sig-actions' },
    h('button', { type: 'button', class: 'btn btn-tertiary', onclick: () => { ctx.clearRect(0, 0, canvas.width, canvas.height); dirty = false; set(undefined, false); } }, 'Borrar firma')));
}

export function getGPS() {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error('sin gps'));
    navigator.geolocation.getCurrentPosition(
      (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }),
      rej, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  });
}

export function photoMetaFor(type, comercioName) {
  return (k, d) => {
    const fecha = d.fecha || todayISO();
    const who = comercioName(d) || d.lugar || d.nombre || 'sin-comercio';
    return { name: `${fecha}_${slug(who)}_${type}_${k}.jpg`, folder: [fecha.slice(0, 7), who] };
  };
}
