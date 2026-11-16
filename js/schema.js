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
// Qué significa cada escalón, en palabras simples (escalera de la cuenta, lección 3.1)
export const ESTADOS_DESC = {
  'Nueva': 'Hizo su primer pedido de Rush (o está por hacerlo).',
  'Activa': 'Ya volvió a pedir: tiene 2 pedidos o más.',
  'Recurrente': 'Pide Rush seguido, todos los meses.',
  'Creciendo': 'Pide seguido y cada vez más cantidad.',
  'Caída': 'Pedía Rush y dejó de pedir.',
};
export const TIPOS_PDV_DESC = {
  'Tienda / minimarket': 'Almacén o tienda de barrio: venta del día a día.',
  'Especialista en bebidas': 'Licorería o negocio que vende sobre todo bebidas.',
  'Punto nocturno': 'Bar, boliche o karaoke: la gente compra de noche.',
  'Gimnasio': 'Gimnasio o club deportivo.',
  'Restaurante / cafetería': 'Lugar donde la gente come o toma algo sentada.',
  'Mayorista con capilaridad': 'Mayorista que le vende a muchas tiendas chicas.',
  'Otro': 'Otro tipo de negocio. Contá cuál abajo.',
};

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
        { k: 'tipo', label: '¿Para qué es esta visita?', type: 'single', req: true,
          opts: ['Piloto (semanal)', 'Relevamiento de ruta', 'Control de ejecución', 'Entrega de premio', 'Introducción al comerciante'],
          labels: { 'Piloto (semanal)': 'Prueba piloto', 'Relevamiento de ruta': 'Visita de recorrido', 'Control de ejecución': 'Volver a revisar algo', 'Entrega de premio': 'Entregar un premio', 'Introducción al comerciante': 'Primera visita' },
          desc: {
            'Piloto (semanal)': 'Es uno de los comercios de la prueba de 90 días. Se visita una vez por semana.',
            'Relevamiento de ruta': 'La visita de siempre: mirar cómo está Rush en el comercio y anotarlo.',
            'Control de ejecución': 'Volvés para ver si se cumplió algo que se acordó: heladera, precio, material.',
            'Entrega de premio': 'Vas a entregarle un premio al comerciante.',
            'Introducción al comerciante': 'Es la primera vez: vas a presentarle Rush a este comercio.',
          } },
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
        { k: 'quiebre', label: '¿Le faltaba Rush al comercio?', type: 'single', req: true,
          labels: { 'No': 'No, tenía de las dos' },
          opts: ['No', 'Faltaba Original', 'Faltaba ZERO', 'Faltaban las dos'], snap: (v) => v && v !== 'No' },
        { k: 'quiebre_dias', label: '¿Hace cuántos días que no tiene Rush?', type: 'number',
          hint: 'Preguntale al comerciante: «¿Desde cuándo no tenés Rush?». Anotá la cantidad de días (por ejemplo, 3).',
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
        { k: 'exhibidor_numerado', label: '¿El exhibidor de Rush está en el mostrador?', type: 'single', opts: ['Sí', 'No', 'No tiene'], req: true,
          labels: { 'Sí': 'Sí, está en el mostrador', 'No': 'Tiene, pero no está en el mostrador', 'No tiene': 'No tiene exhibidor' },
          hint: 'El exhibidor es el soporte de Rush que va sobre el mostrador. Cada uno tiene un número pegado.' },
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
        { k: 'comp_promo_desc', label: 'Contá la promo de la otra marca', type: 'text', req: true, when: (d) => d.comp_promo === 'si',
          hint: 'Qué marca, qué ofrece y hasta cuándo. Ejemplo: Monster, 2 latas por Bs 25, hasta fin de mes.' },
      ],
    },
    {
      eyebrow: 'Ahora sí, preguntá', title: 'El dueño',
      fields: [
        { k: 'demanda', label: 'Ahora sobre Rush: ¿los clientes piden Rush o el comercio se la ofrece?', type: 'single', req: true,
          hint: 'Preguntale al comerciante. Esta pregunta es sobre Rush, no sobre la competencia.',
          opts: ['La piden', 'La ofrecemos', 'Mitad y mitad', 'Este mes ya pregunté'],
          labels: { 'La piden': 'Los clientes la piden', 'La ofrecemos': 'El comercio la ofrece' },
          desc: {
            'La piden': 'La gente entra y pide Rush por su nombre.',
            'La ofrecemos': 'Los clientes no la conocen: el comerciante la recomienda.',
            'Mitad y mitad': 'Pasan las dos cosas.',
            'Este mes ya pregunté': 'Ya lo preguntaste en otra visita este mes.',
          } },
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
        { k: 'obj_resultado', label: '¿Cómo terminó la charla?', type: 'single', opts: ['Abrió', 'Fecha de vuelta', 'No'], req: true, when: hayObjecion,
          labels: { 'Abrió': 'Aceptó', 'Fecha de vuelta': 'Quedamos en volver', 'No': 'No aceptó' },
          desc: { 'Abrió': 'Se convenció: va a comprar o a probar Rush.', 'Fecha de vuelta': 'No dijo que sí todavía. Acordaron otro día para volver.', 'No': 'Siguió diciendo que no.' } },
        { k: 'obj_conocida', label: '¿Es una de las diez objeciones conocidas?', type: 'single', opts: ['Conocida (de las 10)', 'Nueva'], req: true, when: hayObjecion },
      ],
    },
    {
      eyebrow: 'Si corresponde', title: 'Premio',
      fields: [
        { k: 'premio', label: '¿Hoy se entregó un premio?', type: 'yesno', req: true },
        { k: 'premio_nivel', label: '¿En qué escalón está el comercio?', type: 'single', opts: ['Nueva', 'Activa', 'Recurrente'], req: true, when: hayPremio,
          hint: 'El premio depende de cuánto viene comprando el comercio.', desc: ESTADOS_DESC },
        { k: 'premio_beneficio', label: 'Beneficio entregado', type: 'list', src: 'beneficios', req: true, when: hayPremio },
        { k: 'premio_foto', label: 'Foto del premio entregado', type: 'photo', req: true, when: hayPremio },
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
        { k: 'gps', label: 'Ubicación del comercio', type: 'gps',
          hint: 'Parate en la puerta del comercio y tocá el botón. Si el GPS funciona, no hace falta escribir la dirección.' },
        { k: 'nombre', label: 'Nombre del comercio', type: 'text', req: true },
        { k: 'zona', label: 'Zona o barrio', type: 'text', req: sinGps },
        { k: 'ciudad', label: 'Ciudad', type: 'single', opts: ['Santa Cruz', 'Trinidad', 'Otra'], req: true },
        { k: 'direccion', label: 'Dirección', type: 'text', req: sinGps,
          hint: 'Obligatoria solo si no se pudo tomar la ubicación con el GPS.' },
        { k: 'decisor', label: 'Quién decide las compras (nombre y rol)', type: 'text', req: true },
        { k: 'whatsapp', label: 'Contacto / WhatsApp', type: 'tel', req: true },
        { k: 'distribuidor', label: 'Distribuidor que entrega', type: 'text', req: true },
        { k: 'vendedor', label: 'Vendedor responsable', type: 'list', src: 'vendedores', req: true },
        { k: 'tipo_pdv', label: '¿Qué tipo de negocio es?', type: 'single', opts: [...TIPOS_PDV, 'Otro'], req: true,
          hint: 'Elegí el que más se parece.', desc: TIPOS_PDV_DESC },
        { k: 'tipo_pdv_otro', label: '¿Qué tipo de negocio es?', type: 'text', req: true, when: (d) => d.tipo_pdv === 'Otro' },
      ],
    },
    {
      eyebrow: 'Rutina', title: 'Cómo se visita',
      fields: [
        { k: 'horario', label: 'Horario acordado para visitar', type: 'time', req: true },
        { k: 'frecuencia', label: '¿Cada cuántos días vas a visitar este comercio?', type: 'number', req: true,
          hint: 'Ejemplo: 7 = una vez por semana · 14 = cada dos semanas.' },
        { k: 'dia', label: 'Día habitual', type: 'single', opts: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'], req: true },
        { k: 'como_pide', label: 'Cómo pide', type: 'single', opts: ['Visita', 'WhatsApp', 'Otro'], req: true },
      ],
    },
    {
      eyebrow: 'Escalera', title: 'Rush en esta cuenta',
      fields: [
        { k: 'estado', label: '¿Cómo viene comprando Rush este comercio?', type: 'single', opts: ESTADOS, req: true,
          labels: { 'Creciendo': 'En crecimiento' }, desc: ESTADOS_DESC },
        { k: 'motivo_caida', label: 'Motivo si cayó (preguntado, no supuesto)', type: 'single', req: true, when: caida,
          opts: ['No rotó', 'Venció', 'Faltó visita', 'Faltó stock', 'Subió el precio', 'Entró competencia', 'Perdió espacio frío', 'Cambió de dueño', 'Otro'] },
        { k: 'ultimo_pedido', label: 'Fecha del último pedido', type: 'date', req: true, when: caida },
        { k: 'motivo_real', label: 'Motivo real de no recompra, con sus palabras', type: 'text', req: true, when: caida },
        { k: 'frase_comerciante', label: 'Frase que usa el comerciante para ofrecerla', type: 'text' },
        { k: 'objetivo', label: 'Tu meta con este comercio para el próximo mes', type: 'text', req: true,
          hint: 'Esto es para vos: no se lo preguntes al comerciante. Ejemplo: que tenga Rush siempre fría y adelante.' },
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
      eyebrow: 'Exhibidor y prueba piloto', title: 'Programa',
      fields: [
        { k: 'tiene_exhibidor', label: '¿El comercio tiene un exhibidor de Rush?', type: 'yesno', req: true,
          hint: 'El exhibidor es el soporte de Rush que va sobre el mostrador.' },
        { k: 'exhibidor_n', label: 'Número del exhibidor', type: 'text', req: true, when: (d) => d.tiene_exhibidor === 'si',
          hint: 'Cada exhibidor tiene un número pegado. Con ese número el comercio participa del sorteo mensual de premios.' },
        { k: 'piloto', label: '¿Este comercio está en la prueba piloto de 90 días?', type: 'yesno', req: true,
          hint: 'Son los 15 comercios elegidos para la prueba. Si no sabés, poné No.' },
        { k: 'piloto_grupo', label: 'Grupo del piloto', type: 'single', opts: ['Nuevo', 'Activo', 'Caído'], req: true, when: (d) => d.piloto === 'si' },
      ],
    },
  ],
};
function caida(d) { return d.estado === 'Caída'; }
function sinGps(d) { return !(d.gps && d.gps.lat); }

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
