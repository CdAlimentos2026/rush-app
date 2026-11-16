// Almacenamiento local: IndexedDB para registros y fotos (funciona sin señal),
// localStorage para ajustes y borradores.
// Cada usuario tiene su propio espacio en el celular (una base por usuario): al cerrar sesión no se
// borra nada, y lo de una persona nunca se mezcla ni se sube con el usuario de otra.

const LEGACY_DB = 'rush-app'; // base compartida de versiones anteriores
const DB_VER = 1;
let DB_NAME = LEGACY_DB;
let dbp;

const userKey = (u) => String(u || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');

// Elige el espacio del usuario que está usando la app.
export function useUserSpace(user) {
  const name = user ? `${LEGACY_DB}::${userKey(user)}` : LEGACY_DB;
  if (name === DB_NAME) return;
  if (dbp) dbp.then((d) => d.close()).catch(() => {});
  dbp = null;
  DB_NAME = name;
}

function open() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, DB_VER);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('records')) {
        const s = db.createObjectStore('records', { keyPath: 'id' });
        s.createIndex('type', 'type');
      }
      if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'k' });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}

async function tx(store, mode, fn) {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let out;
    Promise.resolve(fn(s)).then((v) => { out = v; });
    t.oncomplete = () => res(out);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  });
}
const req2p = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

export const db = {
  async all(type) {
    return tx('records', 'readonly', (s) => req2p(type ? s.index('type').getAll(type) : s.getAll()));
  },
  async get(id) { return tx('records', 'readonly', (s) => req2p(s.get(id))); },
  async put(rec) { await tx('records', 'readwrite', (s) => s.put(rec)); return rec; },
  async del(id) { return tx('records', 'readwrite', (s) => s.delete(id)); },
  async putMany(recs) { return tx('records', 'readwrite', (s) => { recs.forEach((r) => s.put(r)); }); },

  async photo(id) { return tx('photos', 'readonly', (s) => req2p(s.get(id))); },
  async putPhoto(p) { return tx('photos', 'readwrite', (s) => s.put(p)); },
  async delPhoto(id) { return tx('photos', 'readwrite', (s) => s.delete(id)); },
  async allPhotos() { return tx('photos', 'readonly', (s) => req2p(s.getAll())); },

  // Pasa al espacio del usuario lo que había en la base compartida de versiones anteriores
  // (solo lo suyo). Se hace una vez por usuario y no borra la base vieja.
  async migrateLegacy(user) {
    if (await this.getMeta('legacyChecked')) return 0;
    let moved = 0;
    try {
      const list = indexedDB.databases ? await indexedDB.databases() : [];
      if (list.some((d) => d.name === LEGACY_DB)) {
        const old = await new Promise((res, rej) => { const r = indexedDB.open(LEGACY_DB, DB_VER); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
        if (old.objectStoreNames.contains('records')) {
          const getAll = (store) => new Promise((res, rej) => { const q = old.transaction(store, 'readonly').objectStore(store).getAll(); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
          const recs = (await getAll('records')).filter((r) => !r._demo && userKey(r.user) === userKey(user));
          const photos = old.objectStoreNames.contains('photos') ? await getAll('photos') : [];
          if (recs.length) await this.putMany(recs);
          for (const p of photos) await this.putPhoto(p);
          moved = recs.length;
        }
        old.close();
      }
    } catch {}
    await this.setMeta('legacyChecked', Date.now());
    return moved;
  },

  async getMeta(k, def) { const r = await tx('meta', 'readonly', (s) => req2p(s.get(k))); return r ? r.v : def; },
  async setMeta(k, v) { return tx('meta', 'readwrite', (s) => s.put({ k, v })); },
};

// ---- Ajustes (localStorage, con try/catch por si el navegador lo bloquea)
const SKEY = 'rush.settings';
export function getSettings() {
  try { return JSON.parse(localStorage.getItem(SKEY)) || {}; } catch { return {}; }
}
export function saveSettings(s) {
  try { localStorage.setItem(SKEY, JSON.stringify(s)); } catch {}
}

// Los borradores (formularios a medio llenar) también son de cada usuario.
const draftKey = (key) => `rush.draft.${userKey(getSettings().user)}.${key}`;
export function getDraft(key) {
  try { return JSON.parse(localStorage.getItem(draftKey(key))); } catch { return null; }
}
export function saveDraft(key, v) {
  try { localStorage.setItem(draftKey(key), JSON.stringify(v)); } catch {}
}
export function clearDraft(key) {
  try { localStorage.removeItem(draftKey(key)); } catch {}
}

export function uid(prefix = '') {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 7);
  return (prefix ? prefix + '-' : '') + t + r;
}
