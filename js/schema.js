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
// Una degustación se carga en tres momentos sobre el mismo registro:
// 1) antes de empezar, 2) mientras pasa, 3) una semana después.
// Los textos están pensados para alguien que nunca hizo una degustación.
// "col" fija el nombre de la columna en el Sheet, para que no cambie si se reescribe la pregunta.
const enComercio = (d) => d.lugar_tipo === 'En un comercio';
const enCalle = (d) => d.lugar_tipo === 'Vía pública';

export const DEGUSTACION = {
  type: 'degustacion',
  sheet: 'Degustaciones',
  title: 'Degustación',
  phases: {
    antes: {
      label: 'Antes de empezar',
      n: 1,
      steps: [
        {
          eyebrow: 'Paso 1 · Antes de empezar', title: '¿Dónde y cuándo?',
          intro: 'Una degustación es dar a probar Rush gratis, en vasitos, para que la gente la conozca y la compre ahí mismo. Primero anotá dónde y cuándo es.',
          fields: [
            { k: 'lugar_tipo', label: '¿Dónde se hace?', type: 'single', opts: ['En un comercio', 'Vía pública'], req: true, col: '¿Dónde es?',
              labels: { 'Vía pública': 'En la calle o en un evento' },
              desc: {
                'En un comercio': 'En una tienda, gimnasio, bar, etc. La gente prueba y compra en la heladera del comercio.',
                'Vía pública': 'En una plaza, feria, club o evento, fuera de un comercio.',
              } },
            { k: 'comercio', label: '¿En qué comercio?', type: 'list', src: 'comercios', req: true, when: enComercio, col: 'Comercio' },
            { k: 'lugar', label: '¿Cómo se llama el lugar?', type: 'text', req: true, when: enCalle, col: 'Nombre del lugar (plaza, club…)',
              hint: 'Ejemplo: Plaza 24 de Septiembre, Feria del Cambódromo.' },
            // Se completa sola al guardar: el tipo del comercio, o "Vía pública".
            { k: 'tipo_pdv', label: 'Tipo de PDV', type: 'text', when: () => false },
            { k: 'fecha', label: '¿Qué día es?', type: 'date', req: true, auto: 'today', col: 'Fecha' },
            { k: 'desde', label: '¿A qué hora empieza?', type: 'time', req: true, col: 'Desde' },
            { k: 'hasta', label: '¿A qué hora termina?', type: 'time', req: true, col: 'Hasta' },
            { k: 'promotor', label: '¿Quién da a probar?', type: 'text', req: true, col: 'Promotor/a',
              hint: 'Nombre de la persona que ofrece Rush a la gente (promotor o promotora). Si sos vos, poné tu nombre.' },
            { k: 'precio_original', label: '¿A cuánto se vende la lata de Original?', type: 'money', req: true, col: 'Precio Original en el PDV',
              hint: 'Lo que paga el cliente por una lata, en bolivianos.' },
            { k: 'precio_zero', label: '¿A cuánto se vende la lata de ZERO?', type: 'money', req: true, col: 'Precio ZERO en el PDV' },
          ],
        },
        {
          eyebrow: 'Paso 1 · Antes de empezar', title: '¿Está todo listo?',
          intro: 'Revisá cada cosa y marcala cuando esté lista. Si falta algo, no empieces: primero resolvelo. Así la degustación vende.',
          gate: true,
          fields: [
            { k: 'ck_stock', label: 'Hay Rush fría para vender', type: 'check', req: true, when: enComercio,
              col: 'Stock frío a la venta en el frigider (Original y ZERO)',
              desc: 'En la heladera del comercio hay latas frías de Original y de ZERO. Quien prueba tiene que poder comprar en el momento.' },
            { k: 'ck_stock_calle', label: 'Tenés latas frías para vender', type: 'check', req: true, when: enCalle,
              col: 'Stock frío para vender en el lugar',
              desc: 'Además de las de convidar, llevás latas de Original y ZERO para vender ahí mismo.' },
            { k: 'ck_frente', label: 'Rush se ve bien en la heladera', type: 'check', req: true, when: enComercio,
              col: 'Rush al frente, cenefa y precio a la vista',
              desc: 'Las latas están adelante, con el precio y la cenefa (la tira de Rush del estante) a la vista.' },
            { k: 'ck_comerciante', label: 'El dueño del comercio está avisado', type: 'check', req: true, when: enComercio,
              col: 'Comerciante avisado: sabe el horario y qué va a pasar',
              desc: 'Sabe a qué hora empieza, cuánto dura y qué van a hacer.' },
            { k: 'ck_mesa', label: 'La mesa está cerca de la heladera', type: 'check', req: true, when: enComercio,
              col: 'Mesa a menos de 3 m del frigider, frigider a la vista',
              desc: 'A menos de 3 metros (unos 4 pasos) y desde la mesa se ve la heladera. Así quien prueba va directo a comprar.' },
            { k: 'ck_latas', label: 'Hay latas frías para convidar y vasitos', type: 'check', req: true,
              col: 'Latas de degustación frías en conservadora + vasos',
              desc: 'Las latas para dar a probar van frías en la conservadora (la caja con hielo). Llevá vasitos.' },
            { k: 'ck_cartel', label: 'Está el cartel de Rush', type: 'check', req: true,
              col: 'Cartel con las dos latas y el precio',
              desc: 'El cartel muestra las dos latas (Original y ZERO) y el precio.' },
            { k: 'ck_guion', label: 'Quien da a probar sabe qué decir', type: 'check', req: true,
              col: 'Guion dicho al supervisor en menos de 20 s',
              desc: 'Le pediste que te diga lo que le va a decir a la gente, y lo dijo bien en menos de 20 segundos.' },
            { k: 'ck_bateria', label: 'Tu celular tiene batería', type: 'check', req: true,
              col: 'Celular con batería',
              desc: 'Vas a cargar datos durante todo el evento.' },
          ],
        },
        {
          eyebrow: 'Paso 1 · Antes de empezar', title: '¿Cuánto Rush hay?',
          intro: 'Anotá cómo está todo antes de arrancar. Así después se puede ver cuánto cambió gracias a la degustación.',
          fields: [
            { k: 'stock_ini_original', label: '¿Cuántas latas frías de Original hay para vender?', type: 'number', req: true, col: 'Stock frío inicial: Original',
              hint: 'Contalas una por una antes de empezar. No cuentes las de convidar.' },
            { k: 'stock_ini_zero', label: '¿Cuántas latas frías de ZERO hay para vender?', type: 'number', req: true, col: 'Stock frío inicial: ZERO' },
            { k: 'venta_sem_anterior', label: '¿Cuántas latas le compró este comercio a la embotelladora la semana pasada?', type: 'number', req: true, when: enComercio,
              col: 'Venta de la semana anterior (pedidos reportados por la embotelladora)',
              hint: 'Buscalo en el reporte de pedidos de la embotelladora, no le preguntes al vendedor. Si no pidió nada, poné 0. Dentro de una semana vas a cargar lo mismo para comparar.' },
          ],
        },
      ],
    },
    durante: {
      label: 'Durante',
      n: 2,
      steps: [
        {
          eyebrow: 'Paso 2 · Durante la degustación', title: 'Contá lo que pasa',
          intro: 'Tocá «Empezar a contar». Cada vez que pase algo, sumalo con el botón +. Cuando pase una hora, agregá la siguiente: así se ve en qué horario se vende más.',
          fields: [
            { k: 'horas', label: 'Hora por hora', type: 'hours', req: true, col: 'Registro por hora' },
          ],
        },
        {
          eyebrow: 'Paso 2 · Durante la degustación', title: 'Lo que dijo la gente',
          intro: 'Esto sirve para entender qué busca la gente cuando toma Rush. Escribí con las mismas palabras que usaron, aunque sean cortas.',
          fields: [
            { k: 'respuestas', label: 'Preguntale a 5 personas: «¿Qué querés que pase hoy?»', type: 'multitext', n: 5, req: true,
              col: '"¿Qué querés que pase hoy?": cinco respuestas textuales',
              hint: 'Anotá lo que responda cada una, tal cual. Ejemplo: «aguantar el turno de noche», «rendir en el gimnasio».' },
            { k: 'faq', label: '¿Qué preguntó la gente? ¿Cómo pedían la lata?', type: 'textarea',
              col: 'Preguntas frecuentes / palabras que usaron para pedir',
              hint: 'Opcional. Ejemplo: «¿tiene azúcar?», «dame una Rush», «¿cuál es la light?».' },
            { k: 'comerciante_vio', label: '¿Qué vio el dueño del comercio y qué dijo?', type: 'textarea', when: enComercio,
              col: 'Lo que vio el comerciante (qué le mostramos y qué dijo)',
              hint: 'Opcional. Ejemplo: vio que se vendieron 12 latas y dijo que va a pedir más.' },
            { k: 'fotos', label: 'Fotos de la degustación', type: 'photos', col: 'Fotos del evento (pedí permiso)',
              hint: 'La mesa, el cartel, la gente probando. Pedí permiso antes de sacarle una foto a alguien.' },
            { k: 'firma_promotor', label: 'Firma de quien dio a probar', type: 'signature', req: true, col: 'Firma del promotor/a',
              hint: 'Al terminar, pedile que firme con el dedo. Confirma que los números que cargaste están bien.' },
          ],
        },
      ],
    },
    despues: {
      label: 'Una semana después',
      n: 3,
      steps: [
        {
          eyebrow: 'Paso 3 · Una semana después', title: '¿Sirvió la degustación?',
          intro: 'Pasaron 7 días. Ahora se ve si la gente siguió comprando Rush cuando ya no había degustación.',
          fields: [
            { k: 'venta_sem_siguiente', label: '¿Cuántas latas le compró este comercio a la embotelladora en la semana después de la degustación?', type: 'number', req: true, when: enComercio,
              col: 'Venta de la semana siguiente, sin acción',
              hint: 'Del mismo reporte de pedidos de la embotelladora. Solo esa semana. Si no pidió nada, poné 0.' },
            { k: 'repuso', label: '¿El comercio volvió a pedir Rush por su cuenta?', type: 'yesno', req: true, when: enComercio,
              col: '¿Repuso stock sin que se lo pidieran?',
              hint: 'Sí = pidió más latas sin que nadie tuviera que insistirle.' },
            { k: '_lift', label: 'Antes y después', type: 'info', render: 'lift', when: enComercio },
            { k: 'vuelve', label: '¿Vale la pena hacer otra degustación acá?', type: 'yesno', req: true,
              col: '¿Este PDV vuelve a tener degustación?' },
            { k: 'firma_encargado', label: 'Tu firma', type: 'signature', req: true, col: 'Firma del Encargado',
              hint: 'Firmá con el dedo para cerrar la degustación.' },
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
