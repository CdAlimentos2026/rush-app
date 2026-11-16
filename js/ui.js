// Utilidades de interfaz: helper de DOM, íconos, toast, hoja modal, fotos.
import { db, uid } from './db.js';

export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid === undefined || kid === null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

const P = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
export const icons = {
  home: P('<path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>'),
  plus: P('<path d="M12 5v14M5 12h14"/>'),
  store: P('<path d="M4 9.5 5.5 4h13L20 9.5M4 9.5h16M4 9.5V20h16V9.5M9.5 20v-5.5h5V20"/>'),
  chart: P('<path d="M5 20V10M12 20V4M19 20v-7"/>'),
  gear: P('<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M4.2 7.5l2 1.2M17.8 15.3l2 1.2M4.2 16.5l2-1.2M17.8 8.7l2-1.2"/>'),
  camera: P('<path d="M4 8h3l1.6-2.4h6.8L17 8h3v11H4z"/><circle cx="12" cy="13.2" r="3.6"/>'),
  check: P('<path d="m5 12.5 4.2 4.2L19 7"/>', 'stroke-width="3"'),
  checkThin: P('<path d="m5 12.5 4.2 4.2L19 7"/>'),
  x: P('<path d="M6 6l12 12M18 6 6 18"/>'),
  back: P('<path d="M15 5l-7 7 7 7"/>'),
  chev: P('<path d="m9 5 7 7-7 7"/>'),
  arrow: P('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  pin: P('<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>'),
  search: P('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>'),
  sync: P('<path d="M20 11a8 8 0 0 0-14.3-4.6L4 8.5M4 13a8 8 0 0 0 14.3 4.6L20 15.5"/><path d="M4 4v4.5h4.5M20 20v-4.5h-4.5"/>'),
  cup: P('<path d="M6 4h12l-1.6 16H7.6z"/><path d="M6.6 9h10.8"/>'),
  minus: P('<path d="M5 12h14"/>'),
};
export const icon = (name) => h('span', { html: icons[name], style: { display: 'contents' } });

// ---------------------------------------------------------------- toast
let toastTimer;
export function toast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = h('div', { class: 'toast', role: 'status', 'aria-live': 'polite' }); document.body.append(t); }
  t.textContent = msg;
  requestAnimationFrame(() => t.classList.add('in'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('in'), 2600);
}

// ---------------------------------------------------------------- hoja modal
export function openSheet(build) {
  const scrim = h('div', { class: 'scrim' });
  const sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' });
  const inner = h('div', { class: 'sheet-in' });
  sheet.append(inner);
  const close = () => {
    scrim.classList.remove('in'); sheet.classList.remove('in');
    setTimeout(() => { scrim.remove(); sheet.remove(); }, 360);
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  scrim.addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  inner.append(build(close));
  document.body.append(scrim, sheet);
  requestAnimationFrame(() => { scrim.classList.add('in'); sheet.classList.add('in'); });
  return close;
}

// ---------------------------------------------------------------- fotos
const MAX_SIDE = 1280;
const QUALITY = 0.72;

async function loadImage(file) {
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch {}
  }
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = URL.createObjectURL(file);
  });
}
function draw(img, max) {
  const w = img.width, hgt = img.height;
  const s = Math.min(1, max / Math.max(w, hgt));
  const c = document.createElement('canvas');
  c.width = Math.round(w * s); c.height = Math.round(hgt * s);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c;
}
const toBlob = (c, q) => new Promise((r) => c.toBlob(r, 'image/jpeg', q));

// Achica la foto (~200 KB), guarda una miniatura y devuelve la referencia "p:<id>".
export async function storePhoto(file, meta) {
  const img = await loadImage(file);
  const blob = await toBlob(draw(img, MAX_SIDE), QUALITY);
  const thumb = draw(img, 240).toDataURL('image/jpeg', 0.6);
  const id = uid('f');
  await db.putPhoto({ id, blob, thumb, name: meta.name, folder: meta.folder, createdAt: Date.now() });
  return 'p:' + id;
}
export async function storeCanvas(canvas, meta) {
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
  const id = uid('s');
  await db.putPhoto({ id, blob, thumb: canvas.toDataURL('image/png'), name: meta.name, folder: meta.folder, createdAt: Date.now() });
  return 'p:' + id;
}

export function pickPhoto({ multiple = false } = {}) {
  return new Promise((resolve) => {
    const inp = h('input', { type: 'file', accept: 'image/*', capture: multiple ? undefined : 'environment', multiple: multiple || undefined, style: { display: 'none' } });
    inp.addEventListener('change', () => { resolve([...inp.files]); inp.remove(); });
    document.body.append(inp);
    inp.click();
  });
}

const urlCache = new Map();
export async function photoSrc(ref, full = false) {
  if (!ref) return '';
  if (ref.startsWith('http')) {
    const m = ref.match(/\/d\/([^/]+)/) || ref.match(/[?&]id=([^&]+)/);
    return m ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=w${full ? 1200 : 400}` : ref;
  }
  if (!ref.startsWith('p:')) return ref;
  const id = ref.slice(2);
  const p = await db.photo(id);
  if (!p) return '';
  if (full && p.blob) {
    if (!urlCache.has(id)) urlCache.set(id, URL.createObjectURL(p.blob));
    return urlCache.get(id);
  }
  if (p.thumb) return p.thumb;
  if (p.url) return photoSrc(p.url, full);
  return '';
}
export function imgFor(ref, full = false) {
  const img = h('img', { alt: '', loading: 'lazy' });
  photoSrc(ref, full).then((s) => { if (s) img.src = s; });
  return img;
}
export async function photoLink(ref) {
  if (ref?.startsWith('http')) return ref;
  if (ref?.startsWith('p:')) { const p = await db.photo(ref.slice(2)); return p?.url || null; }
  return null;
}

// ---------------------------------------------------------------- formato
export const fmtDate = (d) => {
  if (!d) return '';
  const x = typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d + 'T12:00:00') : new Date(d);
  return x.toLocaleDateString('es-BO', { day: 'numeric', month: 'short' });
};
export const fmtDateTime = (d) => new Date(d).toLocaleString('es-BO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const todayISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
export const nowTime = () => new Date().toTimeString().slice(0, 5);
export const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
export const slug = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
