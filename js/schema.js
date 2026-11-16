// Esquema de campos de la app, tomado de "Tool-Box Rush · Campos de planillas (para la app)" (16/11/2026).
// Cada formulario es una lista de pasos; cada paso, una lista de campos.
// Tipos: text, tel, textarea, number, money, yesno, single, multi, list, date, time,
//        photo, photos, signature, consent, check, table, hours, info, gps

const yes = (v) => v === 'si';
const no = (v) => v === 'no';

export const TIPOS_PDV = [
  'Tienda / minimarket', 'Especialista en bebidas', 'Punto nocturno',
  'Gimnasio', 'Restaurante / cafetería', 'Mayorista con capilaridad',
];
export const ESTADOS = ['Nueva', 'Activa', 'Recurrente', 'Creciendo', 'Caída'];

// ---------------------------------------------------------------- VISITA
export const VISITA = {
  type: 'visita',
  sheet: 'Visitas',
  title: 'Nueva visita',
  steps: [
    {
      eyebrow: 'Llegás', title: '¿Dónde estás?',
      fields: [
        { k: 'comercio', label: '¿Qué comercio?', type: 'list', src: 'comercios', req: true },
        { k: 'tipo', label: 'Tipo de visita', type: 'single', req: true,
          opts: ['Piloto (semanal)', 'Relevamiento de ruta', 'Control de ejecución', 'Entrega de premio', 'Introducción al comerciante'] },
        { k: 'foto_entrada', label: 'Foto de entrada (antes de tocar nada)', type: 'photo', req: true },
      ],
    },
    {
      eyebrow: 'Mirá antes de preguntar', title: 'El frío',
      fields: [
        { k: 'en_frio', label: '¿Rush está en el frigider?', type: 'yesno', req: true, snap: no },
        { k: 'juntas', label: '¿Original y ZERO están juntas?', type: 'yesno', req: true, snap: no },
        { k: 'adelante', label: '¿Está adelante, con el frente de la lata visible?', type: 'yesno', req: true, snap: no },
      ],
    },
    {
      eyebrow: 'Contá una por una', title: 'Las latas',
      fields: [
        { k: 'latas_original', label: '¿Cuántas latas de Original hay? (frío + depósito)', type: 'number', req: true },
        { k: 'latas_zero', label: '¿Cuántas latas de ZERO hay?', type: 'number', req: true },
        { k: 'deposito_visible', label: '¿Viste el depósito?', type: 'yesno', req: true,
          hint: 'Si no lo viste, contá solo lo que hay en frío.' },
        { k: 'stock_alcanza', label: '¿Hay stock para llegar a la próxima visita?', type: 'yesno', req: true, snap: no },
        { k: 'quiebre', label: '¿Faltaba producto?', type: 'single', req: true,
          opts: ['No', 'Faltaba Original', 'Faltaba ZERO', 'Faltaban las dos'], snap: (v) => v && v !== 'No' },
        { k: 'quiebre_dias', label: '¿Desde hace cuántos días? Preguntá "¿desde cuándo no tiene?"', type: 'number',
          req: true, when: (d) => d.quiebre && d.quiebre !== 'No' },
        { k: 'latas_vencidas', label: '¿Cuántas latas vencidas retiraste?', type: 'number', req: true,
          hint: '0 si ninguna.', snap: (v) => Number(v) > 0 },
      ],
    },
    {
      eyebrow: 'Lo que ve el cliente', title: 'Precio',
      fields: [
        { k: 'precio_original', label: 'Precio de la lata de Original', type: 'money', req: true },
        { k: 'precio_zero', label: 'Precio de la lata de ZERO', type: 'money', req: true },
        { k: 'precio_visible', label: '¿El precio está visible para el cliente?', type: 'yesno', req: true, snap: no },
      ],
    },
    {
      eyebrow: 'Exhibición', title: 'Material',
      fields: [
        { k: 'material', label: '¿Qué material de Rush hay?', type: 'multi', req: true,
          opts: ['Cenefa', 'Marco de precio', 'Exhibidor', 'Ninguno'], exclusive: 'Ninguno' },
        { k: 'material_ok', label: '¿Cenefa o marco íntegro y limpio?', type: 'yesno', req: true, snap: no,
          when: (d) => Array.isArray(d.material) && d.material.length && !d.material.includes('Ninguno') },
        { k: 'segunda_ubicacion', label: '¿Segunda ubicación?', type: 'single', opts: ['Sí', 'No', 'No corresponde'], req: true },
        { k: 'exhibidor_numerado', label: '¿Exhibidor numerado en el mostrador?', type: 'single', opts: ['Sí', 'No', 'No tiene'], req: true,
          hint: 'Si no tiene y corresponde, instalalo y asignale N° en la ficha del comercio.' },
        { k: 'material_vencido_retirado', label: '¿Material vencido o roto retirado?', type: 'yesno', req: true },
        { k: 'pack_ok', label: '¿Pack en depósito íntegro y seco?', type: 'single', opts: ['Sí', 'No', 'No hay depósito'], req: true,
          snap: (v) => v === 'No' },
        { k: 'material_instalado', label: 'Material instalado hoy (pieza y cantidad)', type: 'text' },
        { k: 'material_retirado', label: 'Material retirado hoy (pieza y motivo)', type: 'text' },
        { k: 'pack_deteriorado', label: 'Pack deteriorado: cuántos y cómo', type: 'text', snap: (v) => !!v },
      ],
    },
    {
      eyebrow: 'Solo lo que se ve', title: 'Competencia',
      fields: [
        { k: 'comp_frente', label: 'Si Rush no está adelante, ¿qué marca está?', type: 'list', src: 'marcas',
          when: (d) => d.adelante === 'no', snap: (v) => !!v },
        { k: 'comp_promo', label: '¿La competencia tiene alguna promoción a la vista?', type: 'yesno', req: true, snap: yes },
        { k: 'comp_promo_desc', label: 'Marca, mecánica y hasta cuándo', type: 'text', req: true, when: (d) => d.comp_promo === 'si' },
      ],
    },
    {
      eyebrow: 'Ahora sí, preguntá', title: 'El dueño',
      fields: [
        { k: 'demanda', label: '¿La gente la pide o ustedes la ofrecen?', type: 'single', req: true,
          opts: ['La piden', 'La ofrecemos', 'Mitad y mitad', 'Este mes ya pregunté'] },
        { k: 'frase_dueno', label: 'Una frase del dueño, si dijo algo que importa', type: 'text', max: 140 },
        { k: 'piloto_vendedor', label: '¿Pasó el vendedor esta semana?', type: 'yesno', req: true, when: esPiloto, group: 'Piloto' },
        { k: 'piloto_pendiente', label: '¿Le quedó algo pendiente con el vendedor?', type: 'text', when: esPiloto },
        { k: 'piloto_como', label: '¿Cómo viene saliendo Rush? (textual)', type: 'text', req: true, when: esPiloto },
        { k: 'piloto_pidio', label: '¿Pidió esta semana?', type: 'single', opts: ['Pidió', 'No pidió', 'Va a pedir'], req: true, when: esPiloto },
        { k: 'piloto_pidio_fecha', label: '¿Cuándo va a pedir?', type: 'date', req: true, when: (d) => esPiloto(d) && d.piloto_pidio === 'Va a pedir' },
        { k: 'objecion', label: '¿Te contó una objeción o una traba que el vendedor no resolvió?', type: 'yesno', req: true, group: 'Objeción' },
        { k: 'obj_texto', label: 'La objeción, textual, como la dijo', type: 'textarea', req: true, when: hayObjecion },
        { k: 'obj_vendedor', label: 'Qué le respondió el vendedor (según el comerciante)', type: 'textarea', when: hayObjecion },
        { k: 'obj_yo', label: 'Qué le respondiste vos hoy', type: 'textarea', req: true, when: hayObjecion },
        { k: 'obj_resultado', label: 'Resultado', type: 'single', opts: ['Abrió', 'Fecha de vuelta', 'No'], req: true, when: hayObjecion },
        { k: 'obj_conocida', label: '¿Es una de las diez objeciones conocidas?', type: 'single', opts: ['Conocida (de las 10)', 'Nueva'], req: true, when: hayObjecion },
      ],
    },
    {
      eyebrow: 'Si corresponde', title: 'Premio',
      fields: [
        { k: 'premio', label: '¿Hoy se entregó un premio?', type: 'yesno', req: true },
        { k: 'premio_nivel', label: 'Nivel que lo habilita', type: 'single', opts: ['Nueva', 'Activa', 'Recurrente'], req: true, when: hayPremio },
        { k: 'premio_beneficio', label: 'Beneficio entregado', type: 'list', src: 'beneficios', req: true, when: hayPremio },
        { k: 'premio_foto', label: 'Foto del premio entregado', type: 'photo', req: true, when: hayPremio },
        { k: 'premio_conformidad', label: 'Conformidad del comerciante', type: 'consent', req: true, when: hayPremio,
          hint: 'Pasale el celular y que toque para confirmar.' },
      ],
    },
    {
      eyebrow: 'Antes de irte', title: 'Cierre',
      fields: [
        { k: '_disp', label: 'Disponibilidad efectiva', type: 'info', render: 'disponibilidad' },
        { k: 'corregi', label: 'Qué hiciste hoy para corregir', type: 'textarea', req: true, when: (d) => algunNo(d) },
        { k: 'embotelladora', label: 'Lo que necesita la embotelladora (frío, acuerdo, material grande)', type: 'textarea',
          hint: 'Va al informe semanal.' },
        { k: 'pendiente', label: 'Pendiente para la próxima visita', type: 'text' },
        { k: 'proxima_visita', label: 'Próxima visita', type: 'date', req: true },
        { k: 'foto_salida', label: 'Foto de salida (después)', type: 'photo', req: true },
      ],
    },
  ],
};

function esPiloto(d) { return d.tipo === 'Piloto (semanal)'; }
function hayObjecion(d) { return d.objecion === 'si'; }
function hayPremio(d) { return d.premio === 'si'; }

// Las cuatro preguntas que definen disponibilidad efectiva: 2, 4, 7 y 10 de la planilla.
export const DISP_KEYS = ['en_frio', 'adelante', 'stock_alcanza', 'precio_visible'];
export function disponibilidad(d) {
  if (DISP_KEYS.some((k) => !d[k])) return null;
  return DISP_KEYS.every((k) => d[k] === 'si');
}
function algunNo(d) {
  const yn = ['en_frio', 'juntas', 'adelante', 'stock_alcanza', 'precio_visible', 'material_ok'];
  return yn.some((k) => d[k] === 'no') || (d.quiebre && d.quiebre !== 'No');
}

// ---------------------------------------------------------------- COMERCIO
export const COMERCIO = {
  type: 'comercio',
  sheet: 'Comercios',
  title: 'Comercio',
  steps: [
    {
      eyebrow: 'Alta', title: 'El comercio',
      fields: [
        { k: 'nombre', label: 'Nombre del comercio', type: 'text', req: true },
        { k: 'zona', label: 'Zona / barrio', type: 'text', req: true },
        { k: 'ciudad', label: 'Ciudad', type: 'single', opts: ['Santa Cruz', 'Trinidad', 'Otra'], req: true },
        { k: 'direccion', label: 'Dirección', type: 'text', req: true },
        { k: 'gps', label: 'Ubicación', type: 'gps' },
        { k: 'decisor', label: 'Quién decide las compras (nombre y rol)', type: 'text', req: true },
        { k: 'whatsapp', label: 'Contacto / WhatsApp', type: 'tel', req: true },
        { k: 'distribuidor', label: 'Distribuidor que entrega', type: 'text', req: true },
        { k: 'vendedor', label: 'Vendedor responsable', type: 'list', src: 'vendedores', req: true },
        { k: 'tipo_pdv', label: 'Tipo de PDV', type: 'single', opts: TIPOS_PDV, req: true,
          hint: 'Se clasifica por mecanismo, no por rubro.' },
      ],
    },
    {
      eyebrow: 'Rutina', title: 'Cómo se visita',
      fields: [
        { k: 'horario', label: 'Horario acordado para visitar', type: 'time', req: true },
        { k: 'frecuencia', label: 'Frecuencia (cada cuántos días)', type: 'number', req: true },
        { k: 'dia', label: 'Día habitual', type: 'single', opts: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'], req: true },
        { k: 'como_pide', label: 'Cómo pide', type: 'single', opts: ['Visita', 'WhatsApp', 'Otro'], req: true },
      ],
    },
    {
      eyebrow: 'Escalera', title: 'Rush en esta cuenta',
      fields: [
        { k: 'estado', label: 'Estado de la cuenta', type: 'single', opts: ESTADOS, req: true,
          hint: 'Cuando entren los pedidos de la embotelladora, la app lo va a sugerir y vos lo validás.' },
        { k: 'motivo_caida', label: 'Motivo si cayó (preguntado, no supuesto)', type: 'single', req: true, when: caida,
          opts: ['No rotó', 'Venció', 'Faltó visita', 'Faltó stock', 'Subió el precio', 'Entró competencia', 'Perdió espacio frío', 'Cambió de dueño', 'Otro'] },
        { k: 'ultimo_pedido', label: 'Fecha del último pedido', type: 'date', req: true, when: caida },
        { k: 'motivo_real', label: 'Motivo real de no recompra, con sus palabras', type: 'text', req: true, when: caida },
        { k: 'frase_comerciante', label: 'Frase que usa el comerciante para ofrecerla', type: 'text' },
        { k: 'objetivo', label: 'Qué querés que pase con esta cuenta en los próximos 30 días', type: 'text', req: true,
          hint: 'Una línea concreta.' },
      ],
    },
    {
      eyebrow: 'Solo lo que se ve', title: 'Lo que compite',
      fields: [
        { k: 'competencia', label: 'Marcas que compiten acá', type: 'table',
          cols: [
            { k: 'marca', label: 'Marca', type: 'text' },
            { k: 'precio', label: 'Precio (Bs)', type: 'money' },
            { k: 'formato', label: 'Formato', type: 'text' },
            { k: 'fria', label: '¿Fría?', type: 'yesno' },
            { k: 'ranking', label: 'Ranking según el comerciante', type: 'number' },
          ] },
      ],
    },
    {
      eyebrow: 'Premios y piloto', title: 'Programa',
      fields: [
        { k: 'exhibidor_n', label: 'N° de exhibidor asignado', type: 'text', hint: 'Para el sorteo mensual. Se asigna una sola vez.' },
        { k: 'piloto', label: '¿Está en la prueba piloto de 90 días?', type: 'yesno', req: true },
        { k: 'piloto_grupo', label: 'Grupo del piloto', type: 'single', opts: ['Nuevo', 'Activo', 'Caído'], req: true, when: (d) => d.piloto === 'si' },
      ],
    },
  ],
};
function caida(d) { return d.estado === 'Caída'; }

// ---------------------------------------------------------------- DEGUSTACION
// Una degustación se carga en tres momentos sobre el mismo registro.
export const DEGUSTACION = {
  type: 'degustacion',
  sheet: 'Degustaciones',
  title: 'Degustación',
  phases: {
    antes: {
      label: 'Antes',
      steps: [
        {
          eyebrow: 'Antes', title: 'El evento',
          fields: [
            { k: 'lugar_tipo', label: '¿Dónde es?', type: 'single', opts: ['En un comercio', 'Vía pública'], req: true },
            { k: 'comercio', label: 'Comercio', type: 'list', src: 'comercios', req: true, when: (d) => d.lugar_tipo === 'En un comercio' },
            { k: 'lugar', label: 'Nombre del lugar (plaza, club…)', type: 'text', req: true, when: (d) => d.lugar_tipo === 'Vía pública' },
            { k: 'tipo_pdv', label: 'Tipo de PDV', type: 'single', req: true,
              opts: ['Tienda', 'Especialista', 'Nocturno', 'Gimnasio', 'Restaurante', 'Mayorista', 'Vía pública'] },
            { k: 'fecha', label: 'Fecha', type: 'date', req: true, auto: 'today' },
            { k: 'desde', label: 'Desde', type: 'time', req: true },
            { k: 'hasta', label: 'Hasta', type: 'time', req: true },
            { k: 'promotor', label: 'Promotor/a', type: 'text', req: true },
            { k: 'precio_original', label: 'Precio Original en el PDV', type: 'money', req: true },
            { k: 'precio_zero', label: 'Precio ZERO en el PDV', type: 'money', req: true },
          ],
        },
        {
          eyebrow: 'Todo marcado o no se empieza', title: 'Checklist',
          gate: true,
          fields: [
            { k: 'ck_stock', label: 'Stock frío a la venta en el frigider (Original y ZERO)', type: 'check', req: true },
            { k: 'ck_frente', label: 'Rush al frente, cenefa y precio a la vista', type: 'check', req: true },
            { k: 'ck_comerciante', label: 'Comerciante avisado: sabe el horario y qué va a pasar', type: 'check', req: true },
            { k: 'ck_mesa', label: 'Mesa a menos de 3 m del frigider, frigider a la vista', type: 'check', req: true },
            { k: 'ck_latas', label: 'Latas de degustación frías en conservadora + vasos', type: 'check', req: true },
            { k: 'ck_cartel', label: 'Cartel con las dos latas y el precio', type: 'check', req: true },
            { k: 'ck_guion', label: 'Guion dicho al supervisor en menos de 20 s', type: 'check', req: true },
            { k: 'ck_bateria', label: 'Celular con batería', type: 'check', req: true },
          ],
        },
        {
          eyebrow: 'Antes', title: 'Punto de partida',
          fields: [
            { k: 'stock_ini_original', label: 'Stock frío inicial: Original', type: 'number', req: true },
            { k: 'stock_ini_zero', label: 'Stock frío inicial: ZERO', type: 'number', req: true },
            { k: 'venta_sem_anterior', label: 'Venta de la semana anterior (pedidos reportados por la embotelladora)', type: 'number', req: true,
              hint: 'Sale del reporte de pedidos, no del vendedor.' },
          ],
        },
      ],
    },
    durante: {
      label: 'Durante',
      steps: [
        {
          eyebrow: 'Durante', title: 'Hora por hora',
          fields: [
            { k: 'horas', label: 'Registro por hora', type: 'hours', req: true },
          ],
        },
        {
          eyebrow: 'Durante', title: 'Contenido',
          fields: [
            { k: 'respuestas', label: '"¿Qué querés que pase hoy?": cinco respuestas textuales', type: 'multitext', n: 5, req: true },
            { k: 'faq', label: 'Preguntas frecuentes / palabras que usaron para pedir', type: 'textarea' },
            { k: 'comerciante_vio', label: 'Lo que vio el comerciante (qué le mostramos y qué dijo)', type: 'textarea' },
            { k: 'fotos', label: 'Fotos del evento (pedí permiso)', type: 'photos' },
            { k: 'firma_promotor', label: 'Firma del promotor/a', type: 'signature', req: true },
          ],
        },
      ],
    },
    despues: {
      label: 'A los 7 días',
      steps: [
        {
          eyebrow: 'A los 7 días', title: 'Lo que dejó',
          fields: [
            { k: 'venta_sem_siguiente', label: 'Venta de la semana siguiente, sin acción', type: 'number', req: true },
            { k: 'repuso', label: '¿Repuso stock sin que se lo pidieran?', type: 'yesno', req: true },
            { k: '_lift', label: 'Nivel post-activación', type: 'info', render: 'lift' },
            { k: 'vuelve', label: '¿Este PDV vuelve a tener degustación?', type: 'yesno', req: true },
            { k: 'firma_encargado', label: 'Firma del Encargado', type: 'signature', req: true },
          ],
        },
      ],
    },
  },
};

export function totalesHoras(horas = []) {
  const t = { abordadas: 0, degustadas: 0, original: 0, zero: 0 };
  for (const h of horas) for (const k in t) t[k] += Number(h[k]) || 0;
  t.compras = t.original + t.zero;
  t.conversion = t.degustadas ? t.compras / t.degustadas : null;
  return t;
}
export function lift(d) {
  const a = Number(d.venta_sem_anterior), s = Number(d.venta_sem_siguiente);
  if (!a || d.venta_sem_siguiente === undefined || d.venta_sem_siguiente === '') return null;
  return s / a;
}

export const FORMS = { visita: VISITA, comercio: COMERCIO };

export function allFields(form) {
  if (form.steps) return form.steps.flatMap((s) => s.fields);
  return Object.values(form.phases).flatMap((p) => p.steps.flatMap((s) => s.fields));
}
