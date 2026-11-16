// Tablero: los números del período y las alertas que convierten al Encargado en sensor.
import { db, getSettings, saveSettings } from './db.js';
import { h, fmtDate, todayISO, daysBetween, imgFor } from './ui.js';
import { disponibilidad, totalesHoras, lift, ESTADOS } from './schema.js';

const PERIODOS = { mes: 'Este mes', d30: '30 días', d90: '90 días', todo: 'Todo' };

function desde(p) {
  const d = new Date();
  if (p === 'mes') return todayISO().slice(0, 8) + '01';
  if (p === 'd30') d.setDate(d.getDate() - 30);
  else if (p === 'd90') d.setDate(d.getDate() - 90);
  else return '0000';
  return d.toISOString().slice(0, 10);
}
const pct = (a, b) => (b ? Math.round((a / b) * 100) : null);
const avg = (arr) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null);
const num = (v) => (v === '' || v === undefined || v === null || isNaN(Number(v)) ? null : Number(v));

export async function renderDashboard(box, ctx) {
  const st = getSettings();
  let periodo = st.periodo || 'mes';
  let ciudad = st.ciudad || 'Todas';
  const [visitasAll, degsAll] = await Promise.all([db.all('visita'), db.all('degustacion')]);
  const comercios = ctx.comercioRecs;
  const byId = Object.fromEntries(comercios.map((c) => [c.id, c]));
  const ciudades = ['Todas', ...new Set(comercios.map((c) => c.data.ciudad).filter(Boolean))];

  function draw() {
    const from = desde(periodo);
    const enCiudad = (cid) => ciudad === 'Todas' || byId[cid]?.data.ciudad === ciudad;
    const comer = comercios.filter((c) => enCiudad(c.id));
    const vAll = visitasAll.filter((v) => enCiudad(v.data.comercio));
    const vis = vAll.filter((v) => (v.data.fecha || '') >= from);
    const degs = degsAll.filter((d) => (d.data.fecha || '') >= from && (d.data.lugar_tipo === 'Vía pública' ? ciudad === 'Todas' : enCiudad(d.data.comercio)));
    const p = ctx.params;

    // última visita por comercio (sobre todo el historial)
    const last = {};
    for (const v of vAll) {
      const k = v.data.comercio;
      if (!last[k] || (v.data.fecha + v.data.hora) > (last[k].data.fecha + last[k].data.hora)) last[k] = v;
    }

    // ---- números
    const conDisp = vis.filter((v) => disponibilidad(v.data) !== null);
    const dispOk = conDisp.filter((v) => disponibilidad(v.data)).length;
    const dispPct = pct(dispOk, conDisp.length);
    const quiebres = vis.filter((v) => v.data.quiebre && v.data.quiebre !== 'No');
    const diasQ = avg(quiebres.map((v) => num(v.data.quiebre_dias)).filter((x) => x !== null));
    const visitados = new Set(vis.map((v) => v.data.comercio));
    const pO = avg(vis.map((v) => num(v.data.precio_original)).filter((x) => x !== null));
    const pZ = avg(vis.map((v) => num(v.data.precio_zero)).filter((x) => x !== null));
    const sugO = num(p.precio_sugerido_original), sugZ = num(p.precio_sugerido_zero);

    // tendencia semanal de disponibilidad (8 semanas)
    const semanas = [];
    for (let i = 7; i >= 0; i--) {
      const end = new Date(); end.setDate(end.getDate() - i * 7);
      const start = new Date(end); start.setDate(start.getDate() - 6);
      const a = start.toISOString().slice(0, 10), b = end.toISOString().slice(0, 10);
      const sv = vAll.filter((v) => v.data.fecha >= a && v.data.fecha <= b && disponibilidad(v.data) !== null);
      semanas.push({ lbl: fmtDate(a), v: pct(sv.filter((x) => disponibilidad(x.data)).length, sv.length), n: sv.length });
    }

    // ---- alertas
    const alerts = [];
    const hoy = todayISO();
    const maxQ = num(p.dias_quiebre_alerta) ?? 3;
    const tol = (num(p.tolerancia_precio_pct) ?? 10) / 100;
    for (const c of comer) {
      const lv = last[c.id];
      const freq = num(c.data.frecuencia) || 7;
      const nombre = c.data.nombre;
      const href = '#/comercio/' + c.id;
      if (!lv) { alerts.push({ w: 2, t: `${nombre}: nunca visitado`, s: 'Dado de alta sin visitas registradas.', href }); continue; }
      const d = lv.data;
      const atraso = daysBetween(d.fecha, hoy) - freq;
      if (atraso > 0) alerts.push({ w: 3 + Math.min(atraso, 10) / 10, t: `${nombre}: visita vencida hace ${atraso} ${atraso === 1 ? 'día' : 'días'}`, s: `Se visita cada ${freq} días. Última: ${fmtDate(d.fecha)}.`, href });
      if (d.quiebre && d.quiebre !== 'No' && (num(d.quiebre_dias) ?? 0) >= maxQ) alerts.push({ w: 5, t: `${nombre}: ${d.quiebre.toLowerCase()} hace ${d.quiebre_dias} días`, s: `Relevado el ${fmtDate(d.fecha)}.`, href, snaps: lv.snaps?.quiebre });
      if (disponibilidad(d) === false) {
        const fallas = [d.en_frio === 'no' && 'no está en frío', d.adelante === 'no' && 'no está adelante', d.stock_alcanza === 'no' && 'no alcanza el stock', d.precio_visible === 'no' && 'precio no visible'].filter(Boolean);
        alerts.push({ w: 4, t: `${nombre}: sin disponibilidad efectiva`, s: fallas.join(' · ') + (d.comp_frente ? ` · al frente: ${d.comp_frente}` : ''), href,
          snaps: [...(lv.snaps?.en_frio || []), ...(lv.snaps?.adelante || []), ...(lv.snaps?.comp_frente || []), ...(lv.snaps?.precio_visible || [])] });
      }
      for (const [k, sug, lbl] of [['precio_original', sugO, 'Original'], ['precio_zero', sugZ, 'ZERO']]) {
        const v = num(d[k]);
        if (sug && v !== null && Math.abs(v - sug) / sug > tol) alerts.push({ w: 3, t: `${nombre}: ${lbl} a Bs ${v}`, s: `Sugerido Bs ${sug} (±${Math.round(tol * 100)}%).`, href });
      }
      if (d.comp_promo === 'si' && daysBetween(d.fecha, hoy) <= 14) alerts.push({ w: 2.5, t: `${nombre}: promo de la competencia`, s: d.comp_promo_desc || '', href, snaps: lv.snaps?.comp_promo });
      if (c.data.estado === 'Caída') alerts.push({ w: 3.5, t: `${nombre}: cuenta caída`, s: [c.data.motivo_caida, c.data.motivo_real].filter(Boolean).join(' · '), href });
    }
    for (const dg of degsAll) {
      if (dg.status === 'cerrada' && dg.closedAt && daysBetween(dg.closedAt, Date.now()) >= 7) {
        const lugar = dg.data.lugar || byId[dg.data.comercio]?.data.nombre || 'Degustación';
        alerts.push({ w: 2.8, t: `${lugar}: falta el resultado de 7 días`, s: `Degustación del ${fmtDate(dg.data.fecha)}.`, href: `#/degustacion/${dg.id}/despues` });
      }
    }
    alerts.sort((a, b) => b.w - a.w);

    // ---- qué falla más
    const preguntas = [
      ['en_frio', 'Rush en el frigider'], ['adelante', 'Adelante y visible'], ['stock_alcanza', 'Stock hasta la próxima'],
      ['precio_visible', 'Precio visible'], ['juntas', 'Original y ZERO juntas'], ['material_ok', 'Material íntegro'],
    ].map(([k, l]) => {
      const r = vis.filter((v) => v.data[k]);
      return { l, v: pct(r.filter((v) => v.data[k] === 'no').length, r.length), n: r.length };
    }).filter((x) => x.n).sort((a, b) => b.v - a.v);

    const comp = count(vis.map((v) => v.data.comp_frente).filter(Boolean));
    const demanda = count(vis.map((v) => v.data.demanda).filter((x) => x && x !== 'Este mes ya pregunté'));
    const objs = vis.filter((v) => v.data.objecion === 'si');
    const abrio = objs.filter((v) => v.data.obj_resultado === 'Abrió').length;
    const nuevas = objs.filter((v) => v.data.obj_conocida === 'Nueva');
    const premios = count(vis.filter((v) => v.data.premio === 'si').map((v) => v.data.premio_beneficio || 'Sin especificar'));
    const frases = vis.filter((v) => v.data.frase_dueno).sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
    const embot = vis.filter((v) => v.data.embotelladora).sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);

    const dT = degs.map((d) => totalesHoras(d.data.horas));
    const degust = dT.reduce((s, t) => s + t.degustadas, 0);
    const compras = dT.reduce((s, t) => s + t.compras, 0);
    const lifts = degs.map((d) => lift(d.data)).filter((x) => x !== null);
    const conDesp = degs.filter((d) => d.data.repuso);
    const repuso = conDesp.filter((d) => d.data.repuso === 'si').length;

    const escalera = Object.fromEntries(ESTADOS.map((e) => [e, comer.filter((c) => c.data.estado === e).length]));

    // ---- render
    box.replaceChildren(...[
      h('div', { class: 'enter' },
        h('p', { class: 'eyebrow mt-4' }, `Tablero · ${PERIODOS[periodo]}${ciudad !== 'Todas' ? ' · ' + ciudad : ''}`),
        h('h1', { class: 'h1' }, 'Cómo viene Rush'),
        h('div', { class: 'filters mt-4' }, Object.entries(PERIODOS).map(([k, l]) => chip(l, periodo === k, () => { periodo = k; saveSettings({ ...getSettings(), periodo }); draw(); }))),
        ciudades.length > 2 ? h('div', { class: 'filters mt-2' }, ciudades.map((c) => chip(c, ciudad === c, () => { ciudad = c; saveSettings({ ...getSettings(), ciudad }); draw(); }))) : null,
      ),

      !visitasAll.length && !degsAll.length
        ? h('div', { class: 'card empty section' }, h('div', { class: 'h3' }, 'Todavía no hay datos'),
            h('p', { class: 'body small mt-2' }, 'Cuando cargues visitas, acá vas a ver la disponibilidad, los quiebres, los precios y las alertas. Para ver un ejemplo, andá a Ajustes → Cargar ejemplo.'))
        : null,

      h('div', { class: 'section kpis' },
        h('div', { class: 'kpi wide' },
          h('div', { class: 'flex between' }, h('span', { class: 'micro' }, 'Disponibilidad efectiva'), h('span', { class: 'caption' }, `${dispOk} de ${conDisp.length} visitas`)),
          h('div', { class: 'kpi-num' + (dispPct !== null && dispPct < 60 ? ' red' : ''), style: { fontSize: '64px', marginTop: '8px' } }, dispPct ?? '—', dispPct !== null ? h('small', {}, '%') : null),
          h('div', { class: 'caption' }, 'Rush en frío, adelante, con stock y con precio visible, las cuatro a la vez.'),
          h('div', { class: 'trend mt-3', role: 'img', 'aria-label': 'Disponibilidad por semana, últimas 8 semanas' },
            semanas.map((s, i) => h('div', { class: 'col' + (i === semanas.length - 1 ? ' last' : '') },
              h('span', { class: 'v' }, s.v === null ? '' : s.v + '%'),
              h('div', { class: 'colbar', style: { height: (s.v ?? 0) * 0.8 + '%', opacity: s.v === null ? .2 : 1 } }),
              h('span', { class: 'lbl' }, s.lbl.replace('.', '')))))),
        kpi('Visitas', vis.length, `${visitados.size} de ${comer.length} comercios visitados`),
        kpi('Quiebres', quiebres.length, quiebres.length ? `${pct(quiebres.length, vis.length)}% de las visitas · ${diasQ === null ? '—' : diasQ.toFixed(1)} días prom.` : 'Sin faltantes', quiebres.length > 0),
        kpi('Precio Original', pO === null ? '—' : 'Bs ' + fmtN(pO), sugO ? `Sugerido Bs ${sugO}` : 'Promedio relevado'),
        kpi('Precio ZERO', pZ === null ? '—' : 'Bs ' + fmtN(pZ), sugZ ? `Sugerido Bs ${sugZ}` : 'Promedio relevado'),
      ),

      section(`Alertas (${alerts.length})`, alerts.length
        ? h('div', {}, alerts.slice(0, 12).map((a) => h('a', { class: 'card alert', href: a.href, style: { display: 'flex', textDecoration: 'none' } },
            h('span', { class: 'sym' + (a.w < 3 ? ' soft' : '') }),
            h('div', { class: 'alert-body' }, h('div', { class: 'alert-title' }, a.t), a.s ? h('div', { class: 'caption' }, a.s) : null,
              a.snaps?.length ? h('div', { class: 'snap-thumbs' }, a.snaps.slice(0, 4).map((r) => h('div', { class: 'thumb' }, imgFor(r)))) : null))),
            alerts.length > 12 ? h('p', { class: 'caption mt-3' }, `Y ${alerts.length - 12} más.`) : null)
        : h('p', { class: 'caption' }, 'Nada urgente.')),

      section('Escalera de cuentas', h('div', { class: 'ladder' }, ESTADOS.map((e) =>
        h('div', { class: 'step' + (e === 'Caída' ? ' caida' : '') }, h('div', { class: 'kpi-num' }, escalera[e]), h('span', { class: 'micro' }, e))))),

      preguntas.length ? section('Qué falla más', h('div', { class: 'card bars' }, preguntas.map((q) => bar(q.l, q.v, 100, `${q.v}% no`, q.v >= 30)))) : null,

      comp.length ? section('Quién ocupa el frente', h('div', { class: 'card bars' }, comp.map(([k, n]) => bar(k, n, comp[0][1], n + (n === 1 ? ' visita' : ' visitas'))))) : null,

      demanda.length ? section('¿La piden o la ofrecen?', h('div', { class: 'card bars' }, demanda.map(([k, n]) => bar(k, n, vis.length, pct(n, demanda.reduce((s, x) => s + x[1], 0)) + '%')))) : null,

      degs.length ? section('Degustaciones', h('div', { class: 'kpis' },
        kpi('Eventos', degs.length, `${degust} latas degustadas`),
        kpi('Conversión', degust ? pct(compras, degust) + '%' : '—', `${compras} compras`),
        kpi('Post-activación', lifts.length ? avg(lifts).toFixed(2) + '×' : '—', 'Venta semana siguiente ÷ anterior', lifts.length && avg(lifts) < 1),
        kpi('Repuso solo', conDesp.length ? pct(repuso, conDesp.length) + '%' : '—', `${conDesp.length} con resultado a 7 días`))) : null,

      objs.length ? section('Objeciones', h('div', {},
        h('div', { class: 'kpis' }, kpi('Contadas', objs.length, `${pct(abrio, objs.length)}% terminó en "abrió"`), kpi('Nuevas', nuevas.length, 'Van a la revisión mensual', nuevas.length > 0)),
        nuevas.length ? h('div', { class: 'card mt-3' }, nuevas.slice(0, 5).map((v) => h('div', { class: 'quote' }, v.data.obj_texto, h('div', { class: 'caption' }, byId[v.data.comercio]?.data.nombre || '')))) : null)) : null,

      premios.length ? section('Premios entregados', h('div', { class: 'card bars' }, premios.map(([k, n]) => bar(k, n, premios[0][1], String(n))))) : null,

      frases.length ? section('Voz del dueño', h('div', { class: 'card' }, frases.map((v) => h('div', { class: 'quote' }, `"${v.data.frase_dueno}"`, h('div', { class: 'caption' }, `${byId[v.data.comercio]?.data.nombre || ''} · ${fmtDate(v.data.fecha)}`))))) : null,

      embot.length ? section('Para la embotelladora', h('div', {}, embot.map((v) => h('div', { class: 'card' },
        h('div', { class: 'micro' }, `${byId[v.data.comercio]?.data.nombre || ''} · ${fmtDate(v.data.fecha)}`), h('p', { class: 'body small mt-2' }, v.data.embotelladora))))) : null,
    ].filter(Boolean));
  }
  draw();
}

function count(arr) {
  const m = {};
  for (const x of arr) m[x] = (m[x] || 0) + 1;
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}
const fmtN = (n) => (Math.round(n * 10) / 10).toString().replace('.', ',');
const chip = (l, on, onclick) => h('button', { class: 'seg-opt', style: { minHeight: '40px', padding: '8px 14px', flex: 'none' }, 'aria-pressed': String(on), onclick }, l);
const section = (title, content) => h('div', { class: 'section' }, h('p', { class: 'eyebrow' }, title), content);
function kpi(label, n, cap, alert) {
  return h('div', { class: 'kpi' }, h('span', { class: 'micro' }, label),
    h('div', {}, h('div', { class: 'kpi-num' + (alert ? ' red' : '') }, n), cap ? h('div', { class: 'caption' }, cap) : null));
}
function bar(name, v, max, label, red) {
  return h('div', { class: 'bar-row' }, h('span', { class: 'name' }, name), h('span', { class: 'val' }, label),
    h('div', { class: 'bar-track' }, h('div', { class: 'bar-fill' + (red ? ' red' : ''), style: { width: Math.max(2, max ? (v / max) * 100 : 0) + '%' } })));
}
