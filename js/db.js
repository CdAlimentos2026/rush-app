// Almacenamiento local: IndexedDB para registros y fotos (funciona sin señal),
// localStorage para ajustes y borradores.

const DB_NAME = 'rush-app';
const DB_VER = 1;
let dbp;

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

  // Borra todo lo guardado en el celular (se usa al cerrar sesión).
  async clearAll() {
    for (const store of ['records', 'photos', 'meta']) await tx(store, 'readwrite', (s) => s.clear());
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

export function getDraft(key) {
  try { return JSON.parse(localStorage.getItem('rush.draft.' + key)); } catch { return null; }
}
export function saveDraft(key, v) {
  try { localStorage.setItem('rush.draft.' + key, JSON.stringify(v)); } catch {}
}
export function clearDraft(key) {
  try { localStorage.removeItem('rush.draft.' + key); } catch {}
}

export function uid(prefix = '') {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 7);
  return (prefix ? prefix + '-' : '') + t + r;
}
