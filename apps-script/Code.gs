/**
 * Rush · App de campo — puente entre la app y este Google Sheet.
 *
 * Instalación (una sola vez):
 *  1. En el Google Sheet: Extensiones → Apps Script. Borrá lo que haya y pegá este archivo.
 *  2. Guardá. Elegí la función "configurar" y tocá Ejecutar (acepta los permisos).
 *  3. Implementar → Nueva implementación → Tipo: Aplicación web.
 *       Ejecutar como: Yo · Quién tiene acceso: Cualquier persona.
 *  4. Copiá la URL que termina en /exec. En el Sheet: menú Rush App → Ver datos de conexión
 *     te muestra la clave. Las dos van en la app, en Ajustes.
 *
 * La app escribe una fila por registro (visita, comercio, degustación). Si el mismo registro
 * se vuelve a subir, se actualiza la misma fila. La columna _data guarda el registro completo
 * para que la app lo pueda leer de vuelta; no la edites.
 */

// Si el script se crea suelto (script.google.com) y no desde el Sheet, poné acá el ID del Sheet
// (la parte entre /d/ y /edit de su dirección). Si está pegado dentro del Sheet, dejalo vacío.
const SHEET_ID = '';

const HOJAS = ['Comercios', 'Visitas', 'Degustaciones'];

// Usuarios: viven en la pestaña "Usuarios" del Sheet (Usuario · Código · Activo), no en este código.
// Cada uno entra a la app con su nombre y su código. Cada registro queda a nombre de quien lo cargó
// y nadie más lo puede modificar.
const HOJA_USUARIOS = 'Usuarios';

function libro() {
  return SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActive();
}
const CARPETA_FOTOS = 'Rush App · Fotos';

const PARAMETROS_INICIALES = [
  ['Parámetro', 'Valor', 'Para qué sirve'],
  ['precio_sugerido_original', '', 'Precio sugerido de la lata Original (Bs). Se usa para alertar precios fuera de rango.'],
  ['precio_sugerido_zero', '', 'Precio sugerido de la lata ZERO (Bs).'],
  ['tolerancia_precio_pct', '10', 'Cuánto se puede alejar el precio del sugerido antes de alertar (%).'],
  ['dias_quiebre_alerta', '3', 'Días de quiebre a partir de los cuales aparece la alerta.'],
  ['marcas_competencia', 'Red Bull, Monster', 'Marcas de la plaza, separadas por coma.'],
  ['vendedores', '', 'Vendedores de la ruta, separados por coma.'],
  ['beneficios', '', 'Beneficios vigentes para premios al comerciante, separados por coma.'],
];

function onOpen() {
  if (SHEET_ID) return;
  SpreadsheetApp.getUi().createMenu('Rush App')
    .addItem('Configurar', 'configurar')
    .addItem('Ver datos de conexión', 'verConexion')
    .addItem('Generar clave nueva', 'nuevaClave')
    .addToUi();
}

function configurar() {
  const ss = libro();
  HOJAS.forEach((n) => {
    let sh = ss.getSheetByName(n);
    if (!sh) sh = ss.insertSheet(n);
    if (sh.getLastRow() === 0) { sh.appendRow(['ID']); estiloEncabezado(sh); }
  });
  let par = ss.getSheetByName('Parámetros');
  if (!par) {
    par = ss.insertSheet('Parámetros');
    par.getRange(1, 1, PARAMETROS_INICIALES.length, 3).setValues(PARAMETROS_INICIALES);
    estiloEncabezado(par);
    par.setColumnWidth(1, 220); par.setColumnWidth(2, 220); par.setColumnWidth(3, 480);
  }
  let ped = ss.getSheetByName('Pedidos');
  if (!ped) {
    ped = ss.insertSheet('Pedidos');
    ped.appendRow(['Fecha', 'Comercio', 'Cajas Original', 'Cajas ZERO', 'Nota']);
    estiloEncabezado(ped);
    ped.getRange('F1').setValue('Pegá acá el reporte de pedidos de la embotelladora. El nombre del comercio tiene que ser igual al de la app.');
  }
  let us = ss.getSheetByName(HOJA_USUARIOS);
  if (!us) {
    us = ss.insertSheet(HOJA_USUARIOS);
    us.appendRow(['Usuario', 'Código', 'Activo']);
    estiloEncabezado(us);
    us.getRange('A:B').setNumberFormat('@');
    us.getRange('E1').setValue('Un usuario por fila. Activo: "no" para bloquearlo. El nombre se escribe en la app tal cual (sin importar mayúsculas).');
  }
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('TOKEN')) props.setProperty('TOKEN', generarClave());
  carpetaFotos();
  verConexion();
}

function verConexion() {
  const t = PropertiesService.getScriptProperties().getProperty('TOKEN');
  const url = ScriptApp.getService().getUrl() || '(Todavía no implementaste la aplicación web: Implementar → Nueva implementación)';
  const msg = 'Dirección del Apps Script:\n' + url + '\n\nClave:\n' + t + '\n\nPegá las dos en la app, en Ajustes.';
  try { SpreadsheetApp.getUi().alert('Rush App · Conexión', msg, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) { Logger.log(msg); }
}

function nuevaClave() {
  PropertiesService.getScriptProperties().setProperty('TOKEN', generarClave());
  verConexion();
}

function generarClave() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 20);
}

function estiloEncabezado(sh) {
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).setFontWeight('bold').setBackground('#151629').setFontColor('#F5F4F0');
}

// ---------------------------------------------------------------- web app
function doGet() {
  return json({ ok: true, app: 'rush', msg: 'Rush App activa.' });
}

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    const quien = autenticar(req);
    if (!quien) return json({ ok: false, error: 'Usuario o código incorrecto' });
    switch (req.action) {
      case 'login':
      case 'ping': return json({ ok: true, sheet: libro().getName(), user: quien.user });
      case 'upsert': return json(upsert(req.sheet, req.id, req.row, quien));
      case 'photo': return json(guardarFoto(req));
      case 'pull': return json(pull());
      default: return json({ ok: false, error: 'Acción desconocida' });
    }
  } catch (err) {
    return json({ ok: false, error: String(err && err.message || err) });
  }
}

function norm(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
}

// Devuelve { user, admin } o null. La clave privada (TOKEN) es solo para administración.
function autenticar(req) {
  const token = PropertiesService.getScriptProperties().getProperty('TOKEN');
  if (token && req.token === token) return { user: 'Administración', admin: true };
  if (!req.user || req.pin === undefined || req.pin === '') return null;
  const sh = libro().getSheetByName(HOJA_USUARIOS);
  if (!sh || sh.getLastRow() < 2) return null;
  const filas = sh.getRange(2, 1, sh.getLastRow() - 1, 3).getDisplayValues();
  for (const [usuario, codigo, activo] of filas) {
    if (!usuario) continue;
    if (norm(usuario) === norm(req.user) && String(codigo).trim() === String(req.pin).trim() && norm(activo) !== 'no') {
      return { user: String(usuario).trim(), admin: false };
    }
  }
  return null;
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function upsert(nombreHoja, id, row, quien) {
  if (HOJAS.indexOf(nombreHoja) < 0) throw new Error('Hoja no permitida: ' + nombreHoja);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = libro();
    let sh = ss.getSheetByName(nombreHoja);
    if (!sh) { sh = ss.insertSheet(nombreHoja); sh.appendRow(['ID']); }
    const lastCol = Math.max(1, sh.getLastColumn());
    let headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
    // agrega columnas nuevas al final, sin tocar las existentes
    const nuevos = row.map((r) => r[0]).filter((hd) => headers.indexOf(hd) < 0);
    if (nuevos.length) {
      sh.getRange(1, headers.length + 1, 1, nuevos.length).setValues([nuevos]);
      headers = headers.concat(nuevos);
      estiloEncabezado(sh);
    }
    const idCol = headers.indexOf('ID') + 1;
    const quienCol = headers.indexOf('Quién carga') + 1;
    let rowNum = -1;
    if (sh.getLastRow() > 1) {
      const f = sh.getRange(2, idCol, sh.getLastRow() - 1, 1).createTextFinder(String(id)).matchEntireCell(true).findNext();
      if (f) rowNum = f.getRow();
    }
    // Cada registro es de quien lo cargó: nadie más lo puede modificar.
    if (rowNum > 0 && quienCol > 0 && !quien.admin) {
      const duenio = String(sh.getRange(rowNum, quienCol).getValue() || '').trim();
      if (duenio && norm(duenio) !== norm(quien.user)) {
        throw new Error('Esto lo cargó ' + duenio + '. No lo podés modificar.');
      }
    }
    if (rowNum < 0) rowNum = sh.getLastRow() + 1;

    // El autor lo pone el servidor, no el celular.
    row = row.map(([hd, v]) => {
      if (hd === 'Quién carga' && !quien.admin) return [hd, quien.user];
      if (hd === '_data' && !quien.admin) {
        try { const d = JSON.parse(v); d.user = quien.user; return [hd, JSON.stringify(d)]; } catch (e) {}
      }
      return [hd, v];
    });
    const values = headers.map(() => '');
    row.forEach(([hd, v]) => { values[headers.indexOf(hd)] = v === null || v === undefined ? '' : v; });
    // texto plano para que Sheets no convierta números de teléfono, fechas, etc.
    const rng = sh.getRange(rowNum, 1, 1, values.length);
    rng.setNumberFormat('@');
    rng.setValues([values.map((v) => (typeof v === 'string' && v.length > 49000 ? v.slice(0, 49000) : v))]);
    return { ok: true, row: rowNum };
  } finally {
    lock.releaseLock();
  }
}

function carpetaFotos() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  const it = DriveApp.getFoldersByName(CARPETA_FOTOS);
  const f = it.hasNext() ? it.next() : DriveApp.createFolder(CARPETA_FOTOS);
  props.setProperty('FOLDER_ID', f.getId());
  return f;
}

function subcarpeta(padre, nombre) {
  nombre = String(nombre || 'otros').slice(0, 80);
  const it = padre.getFoldersByName(nombre);
  return it.hasNext() ? it.next() : padre.createFolder(nombre);
}

function guardarFoto(req) {
  let folder = carpetaFotos();
  (req.folder || []).forEach((n) => { folder = subcarpeta(folder, n); });
  const blob = Utilities.newBlob(Utilities.base64Decode(req.data), req.mime || 'image/jpeg', req.name || 'foto.jpg');
  const file = folder.createFile(blob);
  return { ok: true, id: file.getId(), url: file.getUrl() };
}

function pull() {
  const ss = libro();
  const records = [];
  HOJAS.forEach((n) => {
    const sh = ss.getSheetByName(n);
    if (!sh || sh.getLastRow() < 2) return;
    const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    const col = headers.indexOf('_data');
    if (col < 0) return;
    sh.getRange(2, col + 1, sh.getLastRow() - 1, 1).getValues().forEach(([v]) => {
      if (!v) return;
      try { records.push(JSON.parse(v)); } catch (e) {}
    });
  });

  const parametros = {};
  const par = ss.getSheetByName('Parámetros');
  if (par && par.getLastRow() > 1) {
    par.getRange(2, 1, par.getLastRow() - 1, 2).getValues().forEach(([k, v]) => { if (k) parametros[String(k).trim()] = String(v); });
  }

  const pedidos = [];
  const ped = ss.getSheetByName('Pedidos');
  if (ped && ped.getLastRow() > 1) {
    ped.getRange(2, 1, ped.getLastRow() - 1, 5).getValues().forEach(([fecha, comercio, o, z, nota]) => {
      if (!comercio) return;
      const f = fecha instanceof Date ? Utilities.formatDate(fecha, ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd') : String(fecha);
      pedidos.push({ fecha: f, comercio: String(comercio), cajas_original: Number(o) || 0, cajas_zero: Number(z) || 0, nota: String(nota || '') });
    });
  }
  return { ok: true, records: records, parametros: parametros, pedidos: pedidos };
}
