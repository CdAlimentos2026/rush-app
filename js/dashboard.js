// Tablero: los números del período y las alertas.
// Modo simple (encargados de campo) y modo completo (usuarios de consulta, rol "tablero"):
// el completo suma resumen en palabras, comparación con el período anterior, filtro por persona,
// tendencias, rendimiento por persona y estado de cada comercio.
import { db, getSettings, saveSettings } from './db.js';
import { h, fmtDate, todayISO, daysBetween, imgFor } from './ui.js';
import { disponibilidad, totalesHoras, lift, ESTADOS } from './schema.js';

const PERIODOS = { mes: 'Este mes', d30: 'Últimos 30 días', d90: 'Últimos 90 días', todo: 'Todo' };
const ANTERIOR = { mes: 'el mes anterior', d30: 'los 30 días anteriores', d90: 'los 90 días anteriores' };

const iso = (d) => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); };
function rango(p) {
  const hoy = new Date();
  if (p === 'mes') {
    const from = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const pFrom = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const pTo = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
    return { from: iso(from), to: iso(hoy), pFrom: iso(pFrom), pTo: iso(pTo) };
  }
  const n = p === 'd30' ? 30 : p === 'd90' ? 90 : null;
  if (!n) return { from: '0000', to: '9999' };
  const day = (k) => { const d = new Date(hoy); d.setDate(d.getDate() - k); return iso(d); };
  return { from: day(n - 1), to: iso(hoy), pFrom: day(2 * n - 1), pTo: day(n) };
}
const enRango = (f, a, b) => (f || '') >= a && (f || '') <= b;
const pct = (a, b) => (b ? Math.round((a / b) * 100) : null);
const avg = (arr) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null);
const num = (v) => (v === '' || v === undefined || v === null || isNaN(Number(v)) ? null : Number(v));
const fmtN = (n) => (Math.round(n * 10) / 10).toString().replace('.', ',');

// Métricas de un conjunto de visitas y degustaciones
function metricas(vis, degs, params) {
  const conDisp = vis.filter((v) => disponibilidad(v.data) !== null);
  const dispOk = conDisp.filter((v) => disponibilidad(v.data)).length;
  const yn = (k) => { const r = vis.filter((v) => v.data[k]); return pct(r.filter((v) => v.data[k] === 'si').length, r.length); };
  const quiebres = vis.filter((v) => v.data.quiebre && v.data.quiebre !== 'No');
  const pO = avg(vis.map((v) => num(v.data.precio_original)).filter((x) => x !== null));
  const pZ = avg(vis.map((v) => num(v.data.precio_zero)).filter((x) => x !== null));
  const sugO = num(params.precio_sugerido_original), sugZ = num(params.precio_sugerido_zero);
  const tol = (num(params.tolerancia_precio_pct) ?? 10) / 100;
  const fuera = sugO || sugZ ? vis.filter((v) => [[num(v.data.precio_original), sugO], [num(v.data.precio_zero), sugZ]].some(([x, s]) => s && x !== null && Math.abs(x - s) / s > tol)).length : null;
  const objs = vis.filter((v) => v.data.objecion === 'si');
  const dT = degs.map((d) => totalesHoras(d.data.horas));
  const degust = dT.reduce((s, t) => s + t.degustadas, 0);
  const compras = dT.reduce((s, t) => s + t.compras, 0);
  const lifts = degs.map((d) => lift(d.data)).filter((x) => x !== null);
  return {
    visitas: vis.length,
    comercios: new Set(vis.map((v) => v.data.comercio)).size,
    disp: pct(dispOk, conDisp.length), dispOk, dispN: conDisp.length,
    frio: yn('en_frio'), adelante: yn('adelante'), stock: yn('stock_alcanza'), precioVisible: yn('precio_visible'),
    quiebres: quiebres.length, quiebrePct: pct(quiebres.length, vis.length),
    diasQuiebre: avg(quiebres.map((v) => num(v.data.quiebre_dias)).filter((x) => x !== null)),
    pO, pZ, sugO, sugZ, fuera, fueraPct: fuera === null ? null : pct(fuera, vis.length),
    promo: pct(vis.filter((v) => v.data.comp_promo === 'si').length, vis.length),
    objeciones: objs.length, abrio: pct(objs.filter((v) => v.data.obj_resultado === 'Abrió').length, objs.length),
    premios: vis.filter((v) => v.data.premio === 'si').length,
    degs: degs.length, degust, compras, conversion: degust ? pct(compras, degust) : null,
    lift: lifts.length ? avg(lifts) : null,
  };
}

export async function renderDashboard(box, ctx, opts = {}) {
  const full = !!opts.full;
  const st = getSettings();
  let periodo = st.periodo || 'mes';
  let ciudad = st.ciudad || 'Todas';
  let persona = st.persona || 'Todos';
  const [visitasAll, degsAll] = await Promise.all([db.all('visita'), db.all('degustacion')]);
  const comercios = ctx.comercioRecs;
  const byId = Object.fromEntries(comercios.map((c) => [c.id, c]));
  const ciudades = ['Todas', ...new Set(comercios.map((c) => c.data.ciudad).filter(Boolean))];
  const personas = ['Todos', ...new Set([...visitasAll, ...degsAll].map((r) => r.user).filter(Boolean))];
  const nombreC = (id, d) => byId[id]?.data.nombre || d?.comercio_nombre || d?.lugar || 'Comercio';

  function draw() {
    const R = rango(periodo);
    const enCiudad = (cid) => ciudad === 'Todas' || byId[cid]?.data.ciudad === ciudad;
    const dePersona = (r) => !full || persona === 'Todos' || r.user === persona;
    const comer = comercios.filter((c) => enCiudad(c.id));
    const vAll = visitasAll.filter((v) => enCiudad(v.data.comercio) && dePersona(v));
    const dAll = degsAll.filter((d) => (d.data.lugar_tipo === 'Vía pública' ? ciudad === 'Todas' : enCiudad(d.data.comercio)) && dePersona(d));
    const vis = vAll.filter((v) => enRango(v.data.fecha, R.from, R.to));
    const degs = dAll.filter((d) => enRango(d.data.fecha, R.from, R.to));
    const p = ctx.params;
    const M = metricas(vis, degs, p);
    let P = R.pFrom ? metricas(vAll.filter((v) => enRango(v.data.fecha, R.pFrom, R.pTo)), dAll.filter((d) => enRango(d.data.fecha, R.pFrom, R.pTo)), p) : null;
    const sinAnterior = !!(P && !P.visitas && !P.degs);
    if (sinAnterior) P = null; // se avisa una sola vez arriba, no en cada tarjeta

    // última visita por comercio (sobre todo el historial)
    const last = {};
    for (const v of vAll) {
      const k = v.data.comercio;
      if (!last[k] || (v.data.fecha + v.data.hora) > (last[k].data.fecha + last[k].data.hora)) last[k] = v;
    }

    // tendencias semanales (8 semanas)
    const semanas = [];
    for (let i = 7; i >= 0; i--) {
      const end = new Date(); end.setDate(end.getDate() - i * 7);
      const start = new Date(end); start.setDate(start.getDate() - 6);
      const a = iso(start), b = iso(end);
      const sv = vAll.filter((v) => enRango(v.data.fecha, a, b));
      const sd = sv.filter((v) => disponibilidad(v.data) !== null);
      semanas.push({ lbl: fmtDate(a).replace('.', ''), disp: pct(sd.filter((x) => disponibilidad(x.data)).length, sd.length), visitas: sv.length });
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
      if (atraso > 0) alerts.push({ w: 3 + Math.min(atraso, 10) / 10, t: `${nombre}: visita vencida hace ${atraso} ${atraso === 1 ? 'día' : 'días'}`, s: `Se visita cada ${freq} días. Última: ${fmtDate(d.fecha)}${lv.user ? ' (' + lv.user + ')' : ''}.`, href });
      if (d.quiebre && d.quiebre !== 'No' && (num(d.quiebre_dias) ?? 0) >= maxQ) alerts.push({ w: 5, t: `${nombre}: ${minus(d.quiebre)} hace ${d.quiebre_dias} días`, s: `Relevado el ${fmtDate(d.fecha)}.`, href, snaps: lv.snaps?.quiebre });
      if (disponibilidad(d) === false) {
        const fallas = [d.en_frio === 'no' && 'no está en frío', d.adelante === 'no' && 'no está adelante', d.stock_alcanza === 'no' && 'no alcanza el stock', d.precio_visible === 'no' && 'precio no visible'].filter(Boolean);
        alerts.push({ w: 4, t: `${nombre}: Rush no está bien exhibido`, s: fallas.join(' · ') + (d.comp_frente ? ` · al frente: ${d.comp_frente}` : ''), href,
          snaps: [...(lv.snaps?.en_frio || []), ...(lv.snaps?.adelante || []), ...(lv.snaps?.comp_frente || []), ...(lv.snaps?.precio_visible || [])] });
      }
      for (const [k, sug, lbl] of [['precio_original', num(p.precio_sugerido_original), 'Original'], ['precio_zero', num(p.precio_sugerido_zero), 'ZERO']]) {
        const v = num(d[k]);
        if (sug && v !== null && Math.abs(v - sug) / sug > tol) alerts.push({ w: 3, t: `${nombre}: ${lbl} a Bs ${v}`, s: `Sugerido Bs ${sug} (±${Math.round(tol * 100)}%).`, href });
      }
      if (d.comp_promo === 'si' && daysBetween(d.fecha, hoy) <= 14) alerts.push({ w: 2.5, t: `${nombre}: promo de la competencia`, s: d.comp_promo_desc || '', href, snaps: lv.snaps?.comp_promo });
      if (c.data.estado === 'Caída') alerts.push({ w: 3.5, t: `${nombre}: cuenta caída`, s: [c.data.motivo_caida, c.data.motivo_real].filter(Boolean).join(' · '), href });
    }
    for (const dg of dAll) {
      if (dg.status === 'cerrada' && dg.closedAt && daysBetween(dg.closedAt, Date.now()) >= 7) {
        alerts.push({ w: 2.8, t: `${nombreC(dg.data.comercio, dg.data)}: falta el resultado de 7 días`, s: `Degustación del ${fmtDate(dg.data.fecha)}${dg.user ? ' (' + dg.user + ')' : ''}.`, href: `#/degustacion/${dg.id}` });
      }
    }
    alerts.sort((a, b) => b.w - a.w);

    // ---- qué falla más
    const preguntas = [
      ['en_frio', 'Rush en la heladera'], ['adelante', 'Rush adelante y visible'], ['stock_alcanza', 'Stock hasta la próxima visita'],
      ['precio_visible', 'Precio visible'], ['juntas', 'Original y ZERO juntas'], ['material_ok', 'Material en buen estado'],
    ].map(([k, l]) => {
      const r = vis.filter((v) => v.data[k]);
      return { l, v: pct(r.filter((v) => v.data[k] === 'no').length, r.length), n: r.length };
    }).filter((x) => x.n).sort((a, b) => b.v - a.v);

    const comp = count(vis.map((v) => v.data.comp_frente).filter(Boolean));
    const demanda = count(vis.map((v) => v.data.demanda).filter((x) => x && x !== 'Este mes ya pregunté'));
    const objs = vis.filter((v) => v.data.objecion === 'si');
    const nuevas = objs.filter((v) => v.data.obj_conocida === 'Nueva');
    const premios = count(vis.filter((v) => v.data.premio === 'si').map((v) => v.data.premio_beneficio || 'Sin especificar'));
    const frases = vis.filter((v) => v.data.frase_dueno).sort((a, b) => b.createdAt - a.createdAt).slice(0, full ? 10 : 5);
    const embot = vis.filter((v) => v.data.embotelladora).sort((a, b) => b.createdAt - a.createdAt).slice(0, full ? 12 : 6);
    const escalera = Object.fromEntries(ESTADOS.map((e) => [e, comer.filter((c) => c.data.estado === e).length]));
    const conDesp = degs.filter((d) => d.data.repuso);
    const repuso = conDesp.filter((d) => d.data.repuso === 'si').length;

    // ---- por persona (modo completo)
    const porPersona = full ? personas.filter((x) => x !== 'Todos').map((u) => {
      const vv = visitasAll.filter((v) => v.user === u && enCiudad(v.data.comercio) && enRango(v.data.fecha, R.from, R.to));
      const dd = degsAll.filter((d) => d.user === u && enRango(d.data.fecha, R.from, R.to));
      const m = metricas(vv, dd, p);
      const fotos = vv.reduce((s, v) => s + Object.values(v.snaps || {}).reduce((a, b) => a + (b?.length || 0), 0), 0);
      return { u, m, fotos };
    }) : [];

    // ---- estado por comercio (modo completo): primero los que tienen problemas
    const porComercio = full ? comer.map((c) => {
      const lv = last[c.id];
      const d = lv?.data || {};
      const disp = lv ? disponibilidad(d) : null;
      const atraso = lv ? daysBetween(d.fecha, hoy) - (num(c.data.frecuencia) || 7) : null;
      const prob = [
        !lv && 'sin visitas',
        disp === false && 'mal exhibido',
        d.quiebre && d.quiebre !== 'No' && minus(d.quiebre),
        atraso > 0 && `visita vencida ${atraso} d`,
        c.data.estado === 'Caída' && 'cuenta caída',
      ].filter(Boolean);
      return { c, lv, d, disp, prob };
    }).sort((a, b) => b.prob.length - a.prob.length || a.c.data.nombre.localeCompare(b.c.data.nombre)) : [];

    // ---- resumen en palabras (modo completo)
    const resumen = [];
    if (full && M.visitas) {
      resumen.push(`Se hicieron ${M.visitas} ${M.visitas === 1 ? 'visita' : 'visitas'} a ${M.comercios} ${M.comercios === 1 ? 'comercio' : 'comercios'}${persona !== 'Todos' ? ` (${persona})` : ''}.`);
      if (M.disp !== null) resumen.push(`En ${M.dispOk} de ${M.dispN} visitas Rush estaba bien exhibido: en la heladera, adelante, con stock y con precio a la vista (${M.disp}%).`);
      if (preguntas.length && preguntas[0].v > 0) resumen.push(`Lo que más falla: "${preguntas[0].l}", que no se cumplió en el ${preguntas[0].v}% de las visitas.`);
      if (M.quiebres) resumen.push(`Hubo faltante de producto en ${M.quiebres} ${M.quiebres === 1 ? 'visita' : 'visitas'}${M.diasQuiebre !== null ? `, con ${fmtN(M.diasQuiebre)} días sin producto en promedio` : ''}.`);
      if (comp.length) resumen.push(`Cuando Rush no está adelante, la marca que ocupa el frente es sobre todo ${comp[0][0]}.`);
      if (M.degs) resumen.push(`${M.degs} ${M.degs === 1 ? 'degustación' : 'degustaciones'}: ${M.degust} latas probadas y ${M.compras} compras (${M.conversion ?? '—'}% de conversión).`);
      const urg = alerts.filter((a) => a.w >= 3.5).length;
      resumen.push(urg ? `Hay ${urg} ${urg === 1 ? 'alerta importante' : 'alertas importantes'} para mirar abajo.` : 'No hay alertas importantes.');
    }

    // ---- render
    const filtros = h('div', { class: 'enter' },
      h('p', { class: 'eyebrow mt-4' }, `Tablero · ${PERIODOS[periodo]}${ciudad !== 'Todas' ? ' · ' + ciudad : ''}${full && persona !== 'Todos' ? ' · ' + persona : ''}`),
      h('h1', { class: 'h1' }, 'Cómo viene Rush'),
      h('div', { class: 'filters mt-4' }, Object.entries(PERIODOS).map(([k, l]) => chip(l, periodo === k, () => { periodo = k; saveSettings({ ...getSettings(), periodo }); draw(); }))),
      ciudades.length > 2 ? h('div', { class: 'filters mt-2' }, ciudades.map((c) => chip(c, ciudad === c, () => { ciudad = c; saveSettings({ ...getSettings(), ciudad }); draw(); }))) : null,
      full && personas.length > 2 ? h('div', { class: 'filters mt-2' }, personas.map((u) => chip(u, persona === u, () => { persona = u; saveSettings({ ...getSettings(), persona }); draw(); }))) : null,
      full && sinAnterior ? h('p', { class: 'caption mt-3' }, `Todavía no hay datos de ${ANTERIOR[periodo]} para comparar. Las flechas ▲▼ van a aparecer cuando los haya.`) : null);

    const vacio = !visitasAll.length && !degsAll.length
      ? h('div', { class: 'card empty section' }, h('div', { class: 'h3' }, 'Todavía no hay datos'),
          h('p', { class: 'body small mt-2' }, 'Cuando el equipo cargue visitas, acá vas a ver la exhibición, los faltantes, los precios y las alertas.'))
      : null;

    const dispCard = h('div', { class: 'kpi wide' },
      h('div', { class: 'flex between' }, h('span', { class: 'micro' }, full ? 'Rush bien exhibido' : 'Disponibilidad efectiva'), h('span', { class: 'caption' }, `${M.dispOk} de ${M.dispN} visitas`)),
      h('div', { class: 'kpi-num' + (M.disp !== null && M.disp < 60 ? ' red' : ''), style: { fontSize: '64px', marginTop: '8px' } }, M.disp ?? '—', M.disp !== null ? h('small', {}, '%') : null),
      full && P ? delta(M.disp, P.disp, 'pts', ANTERIOR[periodo]) : null,
      h('div', { class: 'caption' }, 'Visitas donde Rush estaba en la heladera, adelante, con stock y con precio visible, las cuatro cosas a la vez. Es el número más importante: si baja, se pierden ventas.'),
      trend(semanas, 'disp', '%', 'Por semana, últimas 8 semanas'));

    const kpisFull = full ? h('div', { class: 'section kpis k4' },
      kpiX('Visitas', M.visitas, `${M.comercios} de ${comer.length} comercios`, 'Cuántas visitas se registraron.', P && delta(M.visitas, P.visitas, '', ANTERIOR[periodo])),
      kpiX('Rush en la heladera', fmtPct(M.frio), 'de las visitas', 'Si no está fría, no se vende.', P && delta(M.frio, P.frio, 'pts', ANTERIOR[periodo])),
      kpiX('Rush adelante', fmtPct(M.adelante), 'de las visitas', 'Con el frente de la lata a la vista del cliente.', P && delta(M.adelante, P.adelante, 'pts', ANTERIOR[periodo])),
      kpiX('Precio a la vista', fmtPct(M.precioVisible), 'de las visitas', 'El cliente ve cuánto cuesta.', P && delta(M.precioVisible, P.precioVisible, 'pts', ANTERIOR[periodo])),
      kpiX('Faltantes', fmtPct(M.quiebrePct), `${M.quiebres} visitas${M.diasQuiebre !== null ? ' · ' + fmtN(M.diasQuiebre) + ' días prom.' : ''}`, 'Visitas donde faltaba Original, ZERO o las dos. Cuanto más bajo, mejor.', P && delta(M.quiebrePct, P.quiebrePct, 'pts', ANTERIOR[periodo], true), M.quiebres > 0),
      kpiX('Precio Original', M.pO === null ? '—' : 'Bs ' + fmtN(M.pO), M.sugO ? `Sugerido Bs ${M.sugO}` : 'Promedio relevado', 'Precio promedio de la lata en los comercios.'),
      kpiX('Precio ZERO', M.pZ === null ? '—' : 'Bs ' + fmtN(M.pZ), M.sugZ ? `Sugerido Bs ${M.sugZ}` : 'Promedio relevado', 'Precio promedio de la lata en los comercios.'),
      kpiX('Promos de la competencia', fmtPct(M.promo), 'de las visitas', 'Visitas donde otra marca tenía una promoción a la vista.'),
    ) : h('div', { class: 'section kpis' },
      kpi('Visitas', M.visitas, `${M.comercios} de ${comer.length} comercios visitados`),
      kpi('Quiebres', M.quiebres, M.quiebres ? `${M.quiebrePct}% de las visitas · ${M.diasQuiebre === null ? '—' : M.diasQuiebre.toFixed(1)} días prom.` : 'Sin faltantes', M.quiebres > 0),
      kpi('Precio Original', M.pO === null ? '—' : 'Bs ' + fmtN(M.pO), M.sugO ? `Sugerido Bs ${M.sugO}` : 'Promedio relevado'),
      kpi('Precio ZERO', M.pZ === null ? '—' : 'Bs ' + fmtN(M.pZ), M.sugZ ? `Sugerido Bs ${M.sugZ}` : 'Promedio relevado'));

    const alertasSec = section(`Alertas (${alerts.length})`, alerts.length
      ? h('div', {}, alerts.slice(0, full ? 40 : 12).map((a) => h('a', { class: 'card alert', href: a.href, style: { display: 'flex', textDecoration: 'none' } },
          h('span', { class: 'sym' + (a.w < 3 ? ' soft' : '') }),
          h('div', { class: 'alert-body' }, h('div', { class: 'alert-title' }, a.t), a.s ? h('div', { class: 'caption' }, a.s) : null,
            a.snaps?.length ? h('div', { class: 'snap-thumbs' }, a.snaps.slice(0, 4).map((r) => h('div', { class: 'thumb' }, imgFor(r)))) : null))),
          alerts.length > (full ? 40 : 12) ? h('p', { class: 'caption mt-3' }, `Y ${alerts.length - (full ? 40 : 12)} más.`) : null)
      : h('p', { class: 'caption' }, 'Nada urgente.'), full && 'Lo que hay que resolver, de lo más urgente a lo menos. El rombo rojo es urgente; el contorno, para tener en cuenta. Tocá una para ver el comercio.');

    const escaleraSec = section('Escalera de cuentas', h('div', { class: 'ladder' }, ESTADOS.map((e) =>
      h('div', { class: 'step' + (e === 'Caída' ? ' caida' : '') }, h('div', { class: 'kpi-num' }, escalera[e]), h('span', { class: 'micro' }, e)))),
      full && 'En qué etapa está cada comercio: Nueva (recién empieza), Activa (compra), Recurrente (repite), Creciendo (compra más), Caída (dejó de comprar).');

    const fallaSec = preguntas.length ? section('Qué falla más', h('div', { class: 'card bars' }, preguntas.map((q) => bar(q.l, q.v, 100, `${q.v}% no`, q.v >= 30))),
      full && 'Porcentaje de visitas en que cada punto NO se cumplía. La barra roja marca lo que falla en 3 de cada 10 visitas o más.') : null;

    const compSec = comp.length ? section('Quién ocupa el frente', h('div', { class: 'card bars' }, comp.map(([k, n]) => bar(k, n, comp[0][1], n + (n === 1 ? ' visita' : ' visitas')))),
      full && 'Cuando Rush no estaba adelante, qué marca estaba en su lugar.') : null;

    const demandaSec = demanda.length ? section('¿La piden o la ofrecen?', h('div', { class: 'card bars' }, demanda.map(([k, n]) => bar(k, n, demanda.reduce((s, x) => s + x[1], 0), pct(n, demanda.reduce((s, x) => s + x[1], 0)) + '%'))),
      full && 'Si los clientes la piden por nombre, la marca está instalada. Si el comercio tiene que ofrecerla, todavía falta.') : null;

    const degSec = degs.length ? section('Degustaciones', h('div', { class: 'kpis' + (full ? ' k4' : '') },
      kpi('Eventos', M.degs, `${M.degust} latas degustadas`),
      kpi('Conversión', M.conversion === null ? '—' : M.conversion + '%', `${M.compras} compras`),
      kpi('Post-activación', M.lift === null ? '—' : M.lift.toFixed(2) + '×', 'Venta semana siguiente ÷ anterior', M.lift !== null && M.lift < 1),
      kpi('Repuso solo', conDesp.length ? pct(repuso, conDesp.length) + '%' : '—', `${conDesp.length} con resultado a 7 días`)),
      full && 'Conversión: de cada 100 personas que probaron, cuántas compraron. Post-activación: si es mayor a 1×, el comercio vendió más la semana después de la degustación.') : null;

    const objSec = objs.length ? section('Objeciones de los comerciantes', h('div', {},
      h('div', { class: 'kpis' }, kpi('Contadas', objs.length, `${M.abrio ?? 0}% terminó en "aceptó"`), kpi('Nuevas', nuevas.length, 'Van a la revisión mensual', nuevas.length > 0)),
      nuevas.length ? h('div', { class: 'card mt-3' }, nuevas.slice(0, full ? 10 : 5).map((v) => h('div', { class: 'quote' }, v.data.obj_texto, h('div', { class: 'caption' }, nombreC(v.data.comercio, v.data))))) : null),
      full && 'Los "no" o trabas que contaron los comerciantes, y en cuántas el comerciante terminó aceptando.') : null;

    const premiosSec = premios.length ? section('Premios entregados', h('div', { class: 'card bars' }, premios.map(([k, n]) => bar(k, n, premios[0][1], String(n))))) : null;

    const frasesSec = frases.length ? section('Voz del dueño', h('div', { class: 'card' }, frases.map((v) => h('div', { class: 'quote' }, `"${v.data.frase_dueno}"`, h('div', { class: 'caption' }, `${nombreC(v.data.comercio, v.data)} · ${fmtDate(v.data.fecha)}`)))),
      full && 'Frases textuales de los comerciantes. Sirven para entender qué piensan sin interpretar.') : null;

    const embotSec = embot.length ? section('Pedidos para la embotelladora', h('div', {}, embot.map((v) => h('div', { class: 'card' },
      h('div', { class: 'micro' }, `${nombreC(v.data.comercio, v.data)} · ${fmtDate(v.data.fecha)}`), h('p', { class: 'body small mt-2' }, v.data.embotelladora))))) : null;

    // ---------- secciones exclusivas del modo completo
    const resumenSec = full && resumen.length ? h('div', { class: 'section card' },
      h('p', { class: 'eyebrow' }, 'En pocas palabras'),
      h('ul', { class: 'resumen' }, resumen.map((t) => h('li', {}, t)))) : null;

    const visitasTrend = full ? section('Visitas por semana', h('div', { class: 'card' }, trend(semanas, 'visitas', '', 'Cantidad de visitas registradas cada semana')),
      'Si una semana baja mucho, puede ser que no se salió a la calle o que no se cargó.') : null;

    const personaSec = full && porPersona.length ? section('Por persona', h('div', { class: 'card tabla' },
      h('div', { class: 'trow-h' }, h('span', {}, 'Persona'), h('span', {}, 'Visitas'), h('span', {}, 'Bien exhib.'), h('span', {}, 'Faltantes'), h('span', {}, 'Fotos')),
      porPersona.map(({ u, m, fotos }) => h('div', { class: 'trow-r' },
        h('span', { class: 'strong' }, u), h('span', {}, m.visitas), h('span', {}, fmtPct(m.disp)), h('span', {}, m.quiebres), h('span', {}, fotos)))),
      'Qué cargó cada integrante del equipo en el período. "Fotos" cuenta las fotos de problemas encontrados.') : null;

    const comercioSec = full && porComercio.length ? section(`Estado de cada comercio (${porComercio.length})`, h('div', {},
      porComercio.map(({ c, lv, d, disp, prob }) => h('a', { class: 'card alert', href: '#/comercio/' + c.id, style: { display: 'flex', textDecoration: 'none' } },
        h('span', { class: 'sym' + (prob.length ? '' : ' soft') }),
        h('div', { class: 'alert-body' },
          h('div', { class: 'flex between' }, h('div', { class: 'alert-title' }, c.data.nombre), h('span', { class: 'tag' + (c.data.estado === 'Caída' ? ' red' : '') }, c.data.estado || '—')),
          h('div', { class: 'caption' }, lv
            ? `Última visita ${fmtDate(d.fecha)}${lv.user ? ' · ' + lv.user : ''} · ${disp === null ? 'sin dato de exhibición' : disp ? 'bien exhibido' : 'mal exhibido'}${d.precio_original ? ' · Original Bs ' + d.precio_original : ''}${d.latas_original ? ' · ' + d.latas_original + ' latas' : ''}`
            : 'Todavía sin visitas'),
          prob.length ? h('div', { class: 'caption strong' }, 'Atención: ' + prob.join(' · ')) : null)))),
      'Todos los comercios, primero los que tienen problemas. Tocá uno para ver su ficha y su historial.') : null;

    const parts = full
      ? [filtros, vacio, resumenSec, h('div', { class: 'section' }, dispCard), kpisFull,
          h('div', { class: 'dash-cols' }, h('div', {}, alertasSec, escaleraSec, personaSec, visitasTrend, degSec), h('div', {}, comercioSec, fallaSec, compSec, demandaSec, objSec, premiosSec, frasesSec, embotSec))]
      : [filtros, vacio, h('div', { class: 'section kpis' }, dispCard), kpisFull, alertasSec, escaleraSec, fallaSec, compSec, demandaSec, degSec, objSec, premiosSec, frasesSec, embotSec];
    box.replaceChildren(...parts.filter(Boolean));
  }
  draw();
}

function count(arr) {
  const m = {};
  for (const x of arr) m[x] = (m[x] || 0) + 1;
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}
const minus = (t) => String(t || '').replace(/^\S/, (c) => c.toLowerCase()); // "Faltaba ZERO" → "faltaba ZERO"
const fmtPct = (v) => (v === null || v === undefined ? '—' : v + '%');
const chip = (l, on, onclick) => h('button', { class: 'seg-opt', style: { minHeight: '40px', padding: '8px 14px', flex: 'none' }, 'aria-pressed': String(on), onclick }, l);
function section(title, content, hint) {
  return h('div', { class: 'section' }, h('p', { class: 'eyebrow' }, title), hint ? h('p', { class: 'caption hint' }, hint) : null, content);
}
function kpi(label, n, cap, alert) {
  return h('div', { class: 'kpi' }, h('span', { class: 'micro' }, label),
    h('div', {}, h('div', { class: 'kpi-num' + (alert ? ' red' : '') }, n), cap ? h('div', { class: 'caption' }, cap) : null));
}
// KPI del modo completo: valor, contexto, qué mide y comparación con el período anterior
function kpiX(label, n, cap, mide, cmp, alert) {
  return h('div', { class: 'kpi' }, h('span', { class: 'micro' }, label),
    h('div', {}, h('div', { class: 'kpi-num' + (alert ? ' red' : '') }, n), cap ? h('div', { class: 'caption' }, cap) : null, cmp || null,
      h('div', { class: 'caption mide' }, mide)));
}
// Flecha de comparación. menosEsMejor: para faltantes, bajar es bueno.
function delta(cur, prev, unidad, contra, menosEsMejor) {
  if (cur === null || cur === undefined) return null;
  if (prev === null || prev === undefined) return h('div', { class: 'caption delta' }, `Sin datos de ${contra} para comparar`);
  const d = Math.round(cur - prev);
  if (d === 0) return h('div', { class: 'caption delta' }, `= Igual que ${contra}`);
  const peor = menosEsMejor ? d > 0 : d < 0;
  return h('div', { class: 'caption delta' + (peor ? ' peor' : '') }, `${d > 0 ? '▲' : '▼'} ${Math.abs(d)}${unidad ? ' ' + unidad : ''} vs ${contra}`);
}
function trend(semanas, key, suf, label) {
  const max = Math.max(1, ...semanas.map((s) => s[key] || 0));
  return h('div', { class: 'trend mt-3', role: 'img', 'aria-label': label },
    semanas.map((s, i) => h('div', { class: 'col' + (i === semanas.length - 1 ? ' last' : '') },
      h('span', { class: 'v' }, s[key] === null ? '' : s[key] + suf),
      h('div', { class: 'colbar', style: { height: ((s[key] ?? 0) / (suf === '%' ? 100 : max)) * 80 + '%', opacity: s[key] === null ? 0.2 : 1 } }),
      h('span', { class: 'lbl' }, s.lbl))));
}
function bar(name, v, max, label, red) {
  return h('div', { class: 'bar-row' }, h('span', { class: 'name' }, name), h('span', { class: 'val' }, label),
    h('div', { class: 'bar-track' }, h('div', { class: 'bar-fill' + (red ? ' red' : ''), style: { width: Math.max(2, max ? (v / max) * 100 : 0) + '%' } })));
}
