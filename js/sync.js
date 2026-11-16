// Sincronización con el Google Sheet a través del Apps Script (ver apps-script/Code.gs).
// Todo se guarda primero en el celular; esto sube lo pendiente cuando hay señal.

import { db, getSettings } from './db.js';
import { VISITA, COMERCIO, DEGUSTACION, allFields, disponibilidad, totalesHoras, lift } from './schema.js';

const FORMS = { visita: VISITA, comercio: COMERCIO, degustacion: DEGUSTACION };

export const DEFAULT_PARAMS = {
  precio_sugerido_original: '',
  precio_sugerido_zero: '',
  tolerancia_precio_pct: '10',
  dias_quiebre_alerta: '3',
  marcas_competencia: 'Red Bull, Monster',
  vendedores: '',
  beneficios: '',
};

export async function getParams() {
  const p = await db.getMeta('params', {});
  return { ...DEFAULT_PARAMS, ...p };
}
export const splitList = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);

let running = false;
const listeners = new Set();
export function onSyncChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit(state) { listeners.forEach((f) => f(state)); }

// La app está atada a un único Google Sheet ("Rush · App de campo"). La dirección está fija acá y
// no se puede cambiar desde la app. Cada persona entra con su usuario y su código (pestaña
// "Usuarios" del Sheet); el Sheet verifica cada envío y no deja modificar lo que cargó otro.
export const SHEET_URL = 'https://script.google.com/macros/s/AKfycbybNx5pXn0Z08DpeXJ_1XIwb9uTcLP2Yw1SFJzkHig5xIFHvklHq3nVR3MaIrWfK95cwg/exec';
export const SHEET_NAME = 'Rush · App de campo';

export function isConfigured() {
  const s = getSettings();
  return !!(s.user && s.pin);
}

export async function post(body, cred) {
  const s = getSettings();
  const auth = cred || { user: s.user, pin: s.pin };
  const r = await fetch(SHEET_URL, { method: 'POST', body: JSON.stringify({ ...body, user: auth.user, pin: auth.pin }) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || 'Error del Sheet');
  return j;
}

export async function login(user, pin) { return post({ action: 'login' }, { user, pin }); }
export async function ping() { return post({ action: 'ping' }); }

export async function pendingCount() {
  const recs = await db.all();
  return recs.filter((r) => r._sync !== 'ok' && !r._demo).length;
}

// ---------------------------------------------------------------- fotos
export function photoRefs(rec) {
  const out = [];
  const walk = (v) => {
    if (typeof v === 'string' && v.startsWith('p:')) out.push(v.slice(2));
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(rec.data);
  walk(rec.snaps);
  return out;
}

function blobToBase64(blob) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result).split(',')[1]);
    fr.onerror = rej;
    fr.readAsDataURL(blob);
  });
}

async function uploadPhoto(id) {
  const p = await db.photo(id);
  if (!p) return null;
  if (p.url) return p.url;
  const data = await blobToBase64(p.blob);
  const j = await post({ action: 'photo', name: p.name, folder: p.folder, mime: p.blob.type || 'image/jpeg', data });
  p.url = j.url;
  p.fileId = j.id;
  delete p.blob; // en el celular queda solo la miniatura; la foto completa vive en Drive
  await db.putPhoto(p);
  return p.url;
}

async function resolveRefs(v, map) {
  if (typeof v === 'string' && v.startsWith('p:')) return map[v.slice(2)] || v;
  if (Array.isArray(v)) return Promise.all(v.map((x) => resolveRefs(x, map)));
  if (v && typeof v === 'object') {
    const o = {};
    for (const k in v) o[k] = await resolveRefs(v[k], map);
    return o;
  }
  return v;
}

// ---------------------------------------------------------------- filas del Sheet
const fmtYN = (v) => (v === 'si' ? 'Sí' : v === 'no' ? 'No' : v ?? '');

function fmtValue(f, v) {
  if (v === undefined || v === null || v === '') return '';
  switch (f.type) {
    case 'yesno': return fmtYN(v);
    case 'check': case 'consent': return v ? 'Sí' : '';
    case 'multi': return (v || []).join(', ');
    case 'multitext': return (v || []).filter(Boolean).map((x, i) => `${i + 1}. ${x}`).join('\n');
    case 'photos': return (v || []).join('\n');
    case 'gps': return v.lat ? `${v.lat.toFixed(6)}, ${v.lng.toFixed(6)}` : '';
    case 'table': return (v || []).map((r) => f.cols.map((c) => `${c.label}: ${c.type === 'yesno' ? fmtYN(r[c.k]) : r[c.k] ?? ''}`).join(' · ')).join('\n');
    case 'hours': return (v || []).map((h) => `${h.hora} · ${h.abordadas || 0} abordadas · ${h.degustadas || 0} degustadas · ${h.original || 0} Original · ${h.zero || 0} ZERO${h.nota ? ' · ' + h.nota : ''}`).join('\n');
    case 'list':
      if (f.src === 'comercios' && typeof v === 'object') return v.nombre || '';
      return v;
    default: return v;
  }
}

export function toRow(rec, comerciosById = {}) {
  const form = FORMS[rec.type];
  const d = rec.data || {};
  const row = [
    ['ID', rec.id],
    ['Registrado', new Date(rec.createdAt).toLocaleString('es-BO')],
    ['Actualizado', new Date(rec.updatedAt || rec.createdAt).toLocaleString('es-BO')],
    ['Quién carga', rec.user || ''],
  ];
  if (rec.type === 'visita') {
    row.push(['Fecha', d.fecha || ''], ['Hora', d.hora || ''], ['GPS', d.gps ? fmtValue({ type: 'gps' }, d.gps) : '']);
  }
  if (rec.type === 'degustacion') row.push(['Estado', rec.status || '']);
  for (const f of allFields(form)) {
    if (f.type === 'info') continue;
    let v = d[f.k];
    if (f.src === 'comercios' && v) v = comerciosById[v]?.data?.nombre || d.comercio_nombre || v;
    row.push([f.label, fmtValue(f, v)]);
  }
  if (rec.type === 'visita') {
    const disp = disponibilidad(d);
    row.push(['Disponibilidad efectiva', disp === null ? '' : disp ? 'Sí' : 'No']);
  }
  if (rec.type === 'degustacion') {
    const t = totalesHoras(d.horas);
    const l = lift(d);
    row.push(['Total abordadas', t.abordadas], ['Total degustadas', t.degustadas], ['Total compras Original', t.original],
      ['Total compras ZERO', t.zero], ['Conversión (compras / degustadas)', t.conversion === null ? '' : Math.round(t.conversion * 100) + '%'],
      ['Nivel post-activación (siguiente / anterior)', l === null ? '' : l.toFixed(2)]);
  }
  const snaps = Object.entries(rec.snaps || {}).flatMap(([k, arr]) => (arr || []).map((u) => `${labelOf(form, k)}: ${u}`));
  row.push(['Fotos de hallazgos', snaps.join('\n')]);
  row.push(['_data', JSON.stringify({ id: rec.id, type: rec.type, createdAt: rec.createdAt, updatedAt: rec.updatedAt, user: rec.user, status: rec.status, data: rec.data, snaps: rec.snaps })]);
  return row;
}
function labelOf(form, k) { return allFields(form).find((f) => f.k === k)?.label || k; }

// ---------------------------------------------------------------- push / pull
export async function syncAll() {
  if (running || !isConfigured() || !navigator.onLine) return { skipped: true };
  running = true;
  emit({ running: true });
  let done = 0, failed = 0, lastError = null;
  try {
    const all = await db.all();
    const comerciosById = Object.fromEntries(all.filter((r) => r.type === 'comercio').map((r) => [r.id, r]));
    // los comercios primero, para que las visitas encuentren el nombre
    const pend = all.filter((r) => r._sync !== 'ok' && !r._demo)
      .sort((a, b) => (a.type === 'comercio' ? -1 : 0) - (b.type === 'comercio' ? -1 : 0));
    for (const rec of pend) {
      try {
        const map = {};
        for (const id of photoRefs(rec)) map[id] = await uploadPhoto(id);
        const out = { ...rec, data: await resolveRefs(rec.data, map), snaps: await resolveRefs(rec.snaps || {}, map) };
        await post({ action: 'upsert', sheet: FORMS[rec.type].sheet, id: rec.id, row: toRow(out, comerciosById) });
        const fresh = await db.get(rec.id);
        if (fresh && (fresh.updatedAt || 0) === (rec.updatedAt || 0)) {
          fresh._sync = 'ok';
          fresh.syncedAt = Date.now();
          delete fresh._err;
          await db.put(fresh);
        }
        done++;
        emit({ running: true, done });
      } catch (e) {
        failed++;
        lastError = e.message;
        const fresh = await db.get(rec.id);
        if (fresh) { fresh._err = e.message; await db.put(fresh); }
      }
    }
    await db.setMeta('lastSync', Date.now());
  } finally {
    running = false;
    emit({ running: false, done, failed, lastError });
  }
  return { done, failed, lastError };
}

export async function pull() {
  if (!isConfigured() || !navigator.onLine) return { skipped: true };
  const j = await post({ action: 'pull' });
  const local = Object.fromEntries((await db.all()).map((r) => [r.id, r]));
  const incoming = [];
  for (const r of j.records || []) {
    const mine = local[r.id];
    if (mine && mine._sync !== 'ok') continue; // lo local sin subir manda
    if (mine && (mine.updatedAt || 0) >= (r.updatedAt || 0)) continue; // ya lo tengo igual o más nuevo
    incoming.push({ ...r, _sync: 'ok' });
  }
  await db.putMany(incoming);
  if (j.parametros) await db.setMeta('params', j.parametros);
  if (j.pedidos) await db.setMeta('pedidos', j.pedidos);
  await db.setMeta('lastPull', Date.now());
  return { received: incoming.length };
}

export async function fullSync() {
  // Primero trae lo del Sheet (así se conocen los comercios cargados por otros) y después sube.
  let b = {};
  try { b = await pull(); } catch (e) { b = { error: e.message }; }
  const a = await syncAll();
  return { ...b, ...a };
}
