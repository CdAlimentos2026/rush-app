// Datos de ejemplo para probar el tablero. Quedan marcados con _demo y nunca se suben al Sheet.
import { db } from './db.js';

const COMERCIOS = [
  ['Minimarket El Trompillo', 'Equipetrol', 'Tienda / minimarket', 'Activa', 7],
  ['Bebidas Don Lucho', 'Plan 3000', 'Especialista en bebidas', 'Recurrente', 7],
  ['Bar La Cueva', 'Las Palmas', 'Punto nocturno', 'Nueva', 7],
  ['Gym Fuerza Norte', 'Norte', 'Gimnasio', 'Creciendo', 14],
  ['Café Ventura', 'Centro', 'Restaurante / cafetería', 'Activa', 14],
  ['Distribuidora Los Pozos', 'Los Pozos', 'Mayorista con capilaridad', 'Recurrente', 7],
  ['Tienda Doña Rosa', 'Villa 1ro de Mayo', 'Tienda / minimarket', 'Caída', 7],
  ['Kiosco 24 Horas', 'Urbarí', 'Tienda / minimarket', 'Activa', 7],
];
const FRASES = ['Los chicos del gym la piden fría, si no está fría no sale.', 'La ZERO se va más los viernes.', 'Si me ponen la heladera, la pongo adelante.', 'El vendedor no pasó la semana pasada.', 'A 10 la compran sin pensar.'];
const OBJ = ['Ya tengo otra energizante y rota bien.', 'No tengo lugar en la heladera.', 'Me queda mucho margen con la otra marca.'];

const r = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[r(a.length)];
const yn = (p) => (Math.random() < p ? 'si' : 'no');
const iso = (d) => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); };

export async function loadDemo() {
  await clearDemo();
  const recs = [];
  const now = Date.now();
  const comercios = COMERCIOS.map(([nombre, zona, tipo, estado, freq], i) => {
    const c = {
      id: 'demo-c' + i, type: 'comercio', _demo: true, _sync: 'ok', createdAt: now - 70 * 864e5, updatedAt: now, user: 'Ejemplo',
      data: {
        nombre, zona, ciudad: i === 4 ? 'Trinidad' : 'Santa Cruz', direccion: 'Calle ejemplo ' + (100 + i), decisor: 'Dueño/a', whatsapp: '+591 7000000' + i,
        distribuidor: 'Embotelladora', vendedor: pick(['Vendedor A', 'Vendedor B']), tipo_pdv: tipo, horario: '10:00', frecuencia: String(freq), dia: pick(['Lunes', 'Miércoles', 'Viernes']),
        como_pide: 'Visita', estado, objetivo: 'Que Rush quede adelante en la heladera y no le falte ZERO.', piloto: i < 5 ? 'si' : 'no', piloto_grupo: i < 5 ? pick(['Nuevo', 'Activo', 'Caído']) : undefined,
        ...(estado === 'Caída' ? { motivo_caida: 'Entró competencia', ultimo_pedido: iso(now - 40 * 864e5), motivo_real: 'Le dieron un frigider de otra marca.' } : {}),
        competencia: [{ marca: 'Red Bull', precio: '15', formato: 'Lata 250', fria: 'si', ranking: '1' }],
      },
    };
    recs.push(c);
    return c;
  });

  let n = 0;
  for (const c of comercios) {
    const freq = Number(c.data.frecuencia);
    const malo = c.data.estado === 'Caída';
    for (let back = 60; back >= 0; back -= freq + r(3) - 1) {
      if (c.id === 'demo-c2' && back < 18) break; // uno con visita vencida
      const t = now - back * 864e5;
      const mejora = 1 - back / 120; // la disponibilidad mejora con el tiempo
      const quiebre = Math.random() < (malo ? 0.5 : 0.15) ? pick(['Faltaba Original', 'Faltaba ZERO', 'Faltaban las dos']) : 'No';
      const adelante = yn(malo ? 0.3 : 0.55 + mejora * 0.3);
      const promo = Math.random() < 0.15;
      const obj = Math.random() < 0.12;
      const d = {
        fecha: iso(t), hora: `${10 + r(8)}:${String(r(60)).padStart(2, '0')}`, comercio: c.id,
        tipo: c.data.piloto === 'si' ? 'Piloto (semanal)' : pick(['Relevamiento de ruta', 'Control de ejecución']),
        en_frio: yn(malo ? 0.4 : 0.7 + mejora * 0.2), juntas: yn(0.7), adelante,
        latas_original: String(r(30)), latas_zero: String(r(15)), deposito_visible: yn(0.6), stock_alcanza: yn(quiebre === 'No' ? 0.85 : 0.2),
        quiebre, quiebre_dias: quiebre !== 'No' ? String(1 + r(7)) : undefined, latas_vencidas: String(Math.random() < 0.1 ? 1 + r(3) : 0),
        precio_original: String(pick([10, 10, 10, 12, 9])), precio_zero: String(pick([10, 10, 11, 12])), precio_visible: yn(0.6 + mejora * 0.25),
        material: [pick(['Cenefa', 'Marco de precio', 'Exhibidor'])], material_ok: yn(0.8), segunda_ubicacion: pick(['Sí', 'No', 'No corresponde']),
        exhibidor_numerado: pick(['Sí', 'No tiene']), material_vencido_retirado: 'si', pack_ok: pick(['Sí', 'No hay depósito']),
        comp_frente: adelante === 'no' ? pick(['Red Bull', 'Monster', 'Red Bull']) : undefined,
        comp_promo: promo ? 'si' : 'no', comp_promo_desc: promo ? 'Red Bull: 2x Bs 25 hasta fin de mes' : undefined,
        demanda: pick(['La piden', 'La ofrecemos', 'Mitad y mitad', 'La ofrecemos']),
        frase_dueno: Math.random() < 0.25 ? pick(FRASES) : undefined,
        objecion: obj ? 'si' : 'no', obj_texto: obj ? pick(OBJ) : undefined, obj_yo: obj ? 'Le mostré la rotación de la ZERO en la zona.' : undefined,
        obj_resultado: obj ? pick(['Abrió', 'Fecha de vuelta', 'No']) : undefined, obj_conocida: obj ? pick(['Conocida (de las 10)', 'Nueva']) : undefined,
        premio: Math.random() < 0.08 ? 'si' : 'no', proxima_visita: iso(t + freq * 864e5),
        embotelladora: Math.random() < 0.1 ? 'Necesita frigider propio; hoy usa el de otra marca.' : undefined,
      };
      if (d.premio === 'si') { d.premio_nivel = pick(['Activa', 'Recurrente']); d.premio_beneficio = pick(['Caja bonificada', 'Cenefa premium']); d.premio_conformidad = t; }
      Object.keys(d).forEach((k) => d[k] === undefined && delete d[k]);
      recs.push({ id: 'demo-v' + n++, type: 'visita', _demo: true, _sync: 'ok', createdAt: t, updatedAt: t, user: 'Ejemplo', data: d, snaps: {} });
    }
  }

  const degBase = (i, back, status) => {
    const t = now - back * 864e5;
    return {
      id: 'demo-d' + i, type: 'degustacion', _demo: true, _sync: 'ok', status, createdAt: t, updatedAt: t, closedAt: t, user: 'Ejemplo',
      data: {
        lugar_tipo: 'En un comercio', comercio: 'demo-c' + i, tipo_pdv: 'Tienda', fecha: iso(t), desde: '17:00', hasta: '20:00', promotor: 'Promotora ejemplo',
        precio_original: '10', precio_zero: '10', stock_ini_original: '24', stock_ini_zero: '12', venta_sem_anterior: String(8 + r(6)),
        horas: [17, 18, 19].map((hh) => ({ hora: hh + ':00', abordadas: 20 + r(15), degustadas: 15 + r(10), original: 2 + r(5), zero: 1 + r(3) })),
        respuestas: ['Terminar la tesis', 'Entrenar después del laburo', 'Abrir mi local', 'Ensayar con la banda', 'Llegar al turno noche'],
        ...(status === 'completa' ? { venta_sem_siguiente: String(12 + r(8)), repuso: yn(0.6), vuelve: 'si' } : {}),
      },
      snaps: {},
    };
  };
  recs.push(degBase(0, 25, 'completa'), degBase(1, 12, 'cerrada'), degBase(5, 40, 'completa'));

  await db.putMany(recs);
}

export async function clearDemo() {
  const all = await db.all();
  for (const r of all) if (r._demo) await db.del(r.id);
}
