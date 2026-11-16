# Rush Energy — Manual gráfico

16 nov 2026 · @Creadores de alimentos

Especificación de identidad visual para desarrollo de aplicaciones. Tipografía, color y estilo.

## El principio

Rush no es una marca de superación personal. No dice "superá tus límites" ni "nunca pares". La lógica es otra: la persona ya sabe qué quiere, elige, y empieza a moverlo. Rush pone energía detrás de esa elección. La persona hace que pase.

Rush no es el héroe. La persona y lo que eligió hacer son la historia.

**Personalidad:** activa, directa, segura, cómplice, despierta, resolutiva, cotidiana, sin exageración.

**Jerarquía visual**, en este orden. Cuando algo compite, gana el número más bajo:

1. Rush (la marca)
2. El mensaje
3. La situación humana
4. El producto
5. Los efectos

Los efectos nunca son protagonistas. Rush transmite impacto por precisión, no por acumulación.

## Color

Rush es una marca oscura. El navy es el 75% de cualquier pantalla, el off-white el 20%, el rojo el 5%. Si el rojo pasa de ahí deja de ser acento y se vuelve fondo.

| Token | Hex | RGB | Rol |
|---|---|---|---|
| navy | #151629 | 21, 22, 41 | Fondo base de la app |
| navy-deep | #0E0F1D | 14, 15, 29 | Fondo de scrims, overlays, modales |
| navy-2 | #18192D | 24, 25, 45 | Superficies elevadas (cards, sheets) |
| red | #F20A18 | 242, 10, 24 | Acento único: CTA, acentos del lockup, estados activos |
| red-hi | #FF2432 | 255, 36, 50 | Solo hover / pressed del rojo |
| white | #F5F4F0 | 245, 244, 240 | Todo el texto y los íconos |
| gold | #FFC65C | 255, 198, 92 | Partículas, destellos, detalles de energía |
| amber | #FF923A | 255, 146, 58 | Intermedio entre dorado y rojo |
| halo-navy | #303C94 | 48, 60, 148 | Halos y glows amplios, siempre bajo 40% de opacidad |

El blanco es #F5F4F0, no #FFFFFF. El blanco puro vibra sobre navy y endurece la pantalla.

**Opacidades del texto sobre navy.** No se usan grises: es siempre white con alfa.

| Uso | Opacidad |
|---|---|
| Titulares | 100% |
| Navegación activa, wordmark | 92% |
| Eyebrows, labels | 82% |
| Cuerpo de texto | 80% |
| Texto secundario, captions | 50% |
| Bordes y divisores | 10–16% |

**Nunca:**

- Rojo sobre rojo, o rojo como fondo de una superficie grande.
- Texto rojo sobre navy en tamaño de cuerpo: el contraste no llega a AA. El rojo es para el lockup, botones y acentos de 24px para arriba.
- Degradés de rojo a violeta, a naranja o a cualquier otro color. El rojo Rush es plano.
- Verde, celeste o amarillo como colores semánticos de UI. Si necesitás estados de éxito/error, resolvelos con forma e ícono, no sumando colores al sistema.

## Tipografía

Dos familias, las dos de Google Fonts, las dos gratuitas y con licencia abierta (OFL).

**Archivo — display.** Es variable con eje de ancho (wdth, rango 62–125). Rush la usa siempre condensada: wdth 84. Eso es lo que le da el carácter: condensada, fuerte y simple, sin caer en tipografía futurista ni agresiva. Peso 800 (ExtraBold) para el lockup y titulares grandes; 700 para el resto.

**Public Sans — interfaz y cuerpo.** Ancho normal. Pesos 400, 500 y 600.

Si el stack no soporta ejes variables, el fallback es Archivo Narrow Bold. Si no hay ninguna de las dos, cualquier grotesca neutral — nunca una serif, nunca una display geométrica.

### Escala

Tamaños de referencia para mobile. En desktop el display escala con clamp(); el resto se mantiene.

| Rol | Familia | Peso | Tamaño | Interlineado | Tracking | Caja |
|---|---|---|---|---|---|---|
| Display / lockup | Archivo wdth 84 | 800 | 40–82px | 0.94 | −0.005em | Mayúsculas |
| Titular 1 | Archivo wdth 84 | 800 | 32px | 1.02 | −0.01em | Mayúsculas |
| Titular 2 | Archivo wdth 88 | 700 | 24px | 1.1 | −0.005em | Normal |
| Titular 3 | Archivo wdth 88 | 700 | 19px | 1.2 | 0 | Normal |
| Eyebrow | Public Sans | 500 | 12px | 1.3 | 0.28em | Mayúsculas |
| Wordmark | Public Sans | 500 | 14px | 1.3 | 0.42em | Mayúsculas |
| Cuerpo | Public Sans | 400 | 16px | 1.62 | 0 | Normal |
| Cuerpo chico | Public Sans | 400 | 14px | 1.6 | 0 | Normal |
| Botón / label | Public Sans | 600 | 16px | 1.2 | 0.005em | Normal |
| Caption | Public Sans | 400 | 13px | 1.5 | 0 | Normal |
| Micro label | Public Sans | 500 | 11px | 1.4 | 0.24em | Mayúsculas |

### Reglas

- El tracking amplio es marca. Eyebrows y wordmarks van a 0.28em y 0.42em. Es mucho a propósito. No lo bajes para que entre: cambiá el texto.
- El cuerpo nunca va en Archivo. Archivo es para titulares y labels cortos. Un párrafo en condensada se lee mal.
- Interlineado 1.62 en el cuerpo, no 1.5. El texto de Rush respira.
- Ancho máximo de párrafo: 470px (unos 65 caracteres). Más ancho y se pierde el renglón.
- Mayúsculas solo en labels cortos. Un titular largo en mayúsculas deja de leerse.

## El lockup

El bloque de marca tiene tres partes, siempre en este orden y alineadas a la izquierda:

1. **Eyebrow** — una pregunta corta en mayúsculas, tracking 0.28em, al 82% de opacidad.
2. **Titular** — Archivo ExtraBold wdth 84, mayúsculas, interlineado 0.94. El verbo va en rojo, el resto en blanco, y el signo de cierre en rojo.
3. **Wordmark** — RUSH ENERGY en Public Sans Medium, tracking 0.42em, al 92%.

Ejemplo canonizado: **HAZ** en rojo + **QUE PASE** en blanco + **!** en rojo.

Debajo va una regla roja de 64 × 3px, y después el cuerpo de texto. Esa regla separa marca de mensaje y no es decorativa: si sacás el texto que viene abajo, sacá la regla también.

**Qué no se toca:**

- El titular va en una sola línea siempre que el ancho lo permita. Si no entra, se corta por palabras completas, nunca con guión.
- El signo de exclamación es parte del titular, no un elemento suelto: va pegado a la última palabra.
- La relación de color no se invierte. Nunca el verbo en blanco y el resto en rojo.
- No se centra. El lockup es siempre bandera izquierda.
- No lleva contorno, sombra, relieve ni degradé.

**Voseo vs. neutro.** El packaging dice "Hacé que pase" (rioplatense). La web usa "Haz que pase" (neutro). Antes de arrancar la app hay que definir cuál de los dos manda — mezclarlos en un mismo producto se lee como descuido.

## Estilo

La app tiene que sentirse **premium, real, activa, editorial, urbana y humana**. Esas seis palabras resuelven la mayoría de las decisiones dudosas.

### Fotografía

Gente real haciendo algo que eligió hacer: ensayar, cocinar, entrenar, trabajar. Interiores con luz cálida y práctica — lámparas, neones tenues, ventanas — nunca luz de estudio. Momentos a media acción, no poses. Nada de atletas profesionales ni de superhéroes.

Toda foto lleva un grading encima: navy casi sólido del lado donde va el texto, que se abre progresivamente hacia el lado de la imagen. No es una división 50/50. Es un degradé continuo — un lado legible, el otro preservando la calidez de la escena.

### El producto

La lata es un PNG con fondo transparente, ubicado por encima de la imagen, nunca integrado al fondo. No se redibuja, no se recolorea, no se deforma, no se le agrega texto. Todo lo que la rodea — glows, sombras, brillos — son capas externas enmascaradas con la silueta del propio PNG, para que nada se salga del contorno.

Siempre apoyada sobre una superficie real de la escena, con sombra de contacto. Una lata flotando se lee como render de stock.

### Luz y energía

La energía sale de la base del producto, nunca lo rodea. Las capas, de abajo hacia arriba:

| Capa | Qué es | Intensidad |
|---|---|---|
| Sombra de contacto | Elipse negra difusa donde apoya | 72% |
| Glow rojo | Radial desde la base, blur 6px | 22% |
| Halo navy | Radial más amplio, blur 20px | 30% |
| Plume | Calor difuso que sube, blur 12px | 12% |
| Polvo dorado | Partículas de 1–3px que suben y derivan | 26–70% cada una |
| Rim lateral | Reflejo rojo en el borde, enmascarado | 10% |

Todo eso respira: ciclos lentos de 5 a 9 segundos, variando opacidad y escala apenas. El usuario casi debería preguntarse si se está moviendo. Eso está bien.

### Formas y espaciado

- Radios: 40px (píldora) para botones, 16px para cards y sheets, 8px para inputs y chips, 4px para elementos chicos. No hay un radio único aplicado a todo.
- Grilla de espaciado: múltiplos de 4px. Los saltos útiles son 8, 12, 16, 24, 32, 48, 64.
- Márgenes laterales: 20px en mobile, 24px desde tablet.
- Borde, relleno, radio y sombra se gastan por rol, no se estampan en todo. Si todas las superficies tienen el mismo radio y la misma sombra, la jerarquía se aplana.

## Componentes base

| Componente | Especificación |
|---|---|
| Botón primario | Fondo red, texto blanco puro, Public Sans 600 / 16px, padding 17 × 30px, radio 40px, sombra 0 10px 30px -12px rgba(242,10,24,.45). Puede llevar flecha → a la derecha. |
| Botón secundario | Transparente, borde white al 16%, texto white al 92%, mismo radio y padding. |
| Botón terciario | Solo texto white al 82%, con subrayado rojo de 2px × 18px que aparece en activo. |
| Hover / pressed | Rojo pasa a red-hi, escala 1.01, la flecha se corre 4px. Nada más. |
| Deshabilitado | Opacidad 40%, sin sombra. |
| Foco | Contorno sólido red de 2px con 3px de separación. Visible siempre, en todo elemento interactivo. |
| Superficie / card | Fondo navy-2, radio 16px, borde white al 8%. Sin sombra: en una app oscura la sombra no se ve, el borde sí. |
| Input | Fondo navy-deep, borde white al 12%, radio 8px, alto 48px, texto 16px. En foco el borde pasa a red. |
| Navegación | Transparente, integrada sobre el contenido. Nunca una barra opaca independiente. Ítem activo: white al 100% + subrayado rojo corto. |
| Chip / tag | Fondo white al 8%, radio 8px, Public Sans 500 / 12px, tracking 0.08em, mayúsculas. |
| Divisor | 1px, white al 10%. |

Target táctil mínimo: 44 × 44px, aunque el elemento visible sea más chico.

## Motion

El movimiento en Rush es confirmación, no espectáculo. Nada salta, nada rebota, nada gira.

| Tipo | Duración | Curva |
|---|---|---|
| Micro-interacción (hover, pressed, toggle) | 200–320ms | cubic-bezier(.22,.61,.36,1) |
| Transición de pantalla | 320–420ms | cubic-bezier(.22,.61,.36,1) |
| Entrada de contenido | 800–1300ms | cubic-bezier(.16,1,.3,1) |
| Ambiente (respiración, partículas) | 5–15s, infinito | ease-in-out / linear |

**Principios:**

- Una entrada se escalona de arriba hacia abajo, 80ms entre elementos. Todo junto se siente barato; demasiado escalonado se siente lento.
- Lo que entra sube 16px y aparece. No escala desde cero, no viene de los costados.
- Un elemento activo se levanta 4px y escala 1.015. Nunca más que eso.
- Animá solo transform y opacity. Son las dos que resuelve la GPU; cualquier otra cosa genera saltos.
- El contenido tiene que ser legible aunque el JavaScript no corra. El movimiento se suma a algo que ya está ahí, nunca lo revela.
- prefers-reduced-motion: reduce apaga todo y deja estados estáticos. No es opcional.

## Qué evitar

Esta lista no es estética, es de marca. Cada ítem aparece en el 90% de las marcas de energizantes y es exactamente de lo que Rush se diferencia.

**Gráfica:**

- Rayos y electricidad literal
- Fuego, llamas, explosiones
- Neón excesivo, glows exagerados
- Partículas tipo videojuego, efectos sci-fi
- Estética gamer genérica
- Tipografías futuristas, itálicas forzadas, biseles, metalizados
- Degradés multicolor
- Superhéroes, atletas profesionales, cuerpos imposibles

**De copy:**

- "Superá tus límites"
- "Nunca pares"
- "Convertite en tu mejor versión"
- "Sé imparable"
- "Energía extrema"

Todas esas frases ponen a la marca como entrenador y a la persona como alguien que no alcanza. Rush dice lo contrario: vos ya sabés qué querés, yo pongo la energía.

**La prueba rápida:** si una pantalla le sacaras el logo y podría ser de cualquier otro energizante, está mal resuelta.

## Tokens

Para copiar y pegar. Los nombres son los que usa la web de Rush, así que mantenerlos hace que app y sitio hablen el mismo idioma.

```css
:root {
  /* Color */
  --rush-navy:        #151629;
  --rush-navy-deep:   #0E0F1D;
  --rush-navy-2:      #18192D;
  --rush-red:         #F20A18;
  --rush-red-hi:      #FF2432;
  --rush-white:       #F5F4F0;
  --rush-gold:        #FFC65C;
  --rush-amber:       #FF923A;
  --rush-halo:        #303C94;

  /* Texto sobre navy */
  --text-primary:     rgba(245, 244, 240, 1);
  --text-strong:      rgba(245, 244, 240, 0.92);
  --text-label:       rgba(245, 244, 240, 0.82);
  --text-body:        rgba(245, 244, 240, 0.80);
  --text-muted:       rgba(245, 244, 240, 0.50);
  --border-subtle:    rgba(245, 244, 240, 0.10);
  --border-strong:    rgba(245, 244, 240, 0.16);

  /* Tipografia */
  --font-display:     "Archivo", "Archivo Narrow", sans-serif;
  --font-ui:          "Public Sans", system-ui, sans-serif;
  --display-wdth:     84;

  /* Espaciado */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px;
  --space-4: 16px; --space-6: 24px; --space-8: 32px;
  --space-12: 48px; --space-16: 64px;

  /* Radios */
  --radius-pill:   40px;
  --radius-card:   16px;
  --radius-input:  8px;
  --radius-chip:   4px;

  /* Motion */
  --ease-rush:     cubic-bezier(0.22, 0.61, 0.36, 1);
  --ease-enter:    cubic-bezier(0.16, 1, 0.3, 1);
  --dur-micro:     240ms;
  --dur-screen:    360ms;
  --dur-enter:     900ms;
}
```

## Equivalencias nativas

**iOS (SwiftUI).** Los colores como `Color(red:green:blue:)` en escala 0–1 — navy es (0.082, 0.086, 0.161), red es (0.949, 0.039, 0.094). Archivo y Public Sans se embeben como fuentes custom en el bundle y se registran en `UIAppFonts`. El eje de ancho se aplica con `UIFontDescriptor` y la clave `kCTFontVariationAttribute` sobre el eje wdth; si complica, usá Archivo Narrow como estática.

**Android (Compose).** Los colores van a `Color(0xFF151629)` y derivados. Las fuentes se declaran como recursos en `res/font/`; Archivo variable se soporta con `FontVariation.Settings(FontVariation.width(84f))` desde API 26.

**Tema.** Rush es dark-only por diseño. Si el producto necesita modo claro, hay que diseñarlo — no se resuelve invirtiendo la paleta: el navy invertido no da nada parecido a la marca.

## Fuentes

Archivo y Public Sans están en Google Fonts bajo SIL Open Font License 1.1: uso comercial libre, embebido en apps incluido, sin regalías.

---

## Pendientes antes de arrancar la app

- [ ] Definir voseo ("Hacé que pase") vs. neutro ("Haz que pase").
- [ ] Definir qué hace la app (funcionalidad).
- [ ] Definir stack (web/PWA, React Native, SwiftUI, Compose…).
- [ ] Notas: el manual tiene una inconsistencia menor — la tabla de componentes dice chips con radio 8px, pero el token `--radius-chip` es 4px.
