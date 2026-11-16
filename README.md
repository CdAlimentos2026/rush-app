# Rush · App de campo

Proyecto independiente. No tiene relación con la página de Reaktor (`../site`, `../reaktor-tiendanube`, etc.).
Todo lo de esta app vive dentro de esta carpeta.

App para el celular del Encargado de la marca (Monarch, Bolivia). Sirve para cargar cada **visita** a un comercio
y cada **degustación** siempre en el mismo orden. Todo llega a un **Google Sheet** y se ve en el **Tablero**.

- Funciona sin señal: guarda en el celular y sube sola cuando vuelve la conexión.
- Las fotos se achican a ~200 KB y van a una carpeta de Google Drive. En el Sheet queda el link.
- Diseño según [MANUAL-GRAFICO.md](MANUAL-GRAFICO.md). Copy en voseo ("Hacé que pase").

## Estructura

| Archivo | Qué hace |
|---|---|
| `index.html`, `manifest.webmanifest`, `sw.js` | La app instalable (PWA) y su caché sin señal |
| `css/app.css` | Estilos con los tokens del manual |
| `js/schema.js` | **Todos los campos** de Comercios, Visita y Degustaciones. Para agregar o cambiar una pregunta, se edita acá |
| `js/form.js` | Formularios paso a paso (sí/no, opciones, fotos, firma, contadores por hora) |
| `js/app.js` | Pantallas: inicio, visita, comercios, degustaciones, ajustes |
| `js/dashboard.js` | Tablero y alertas |
| `js/sync.js` | Subida y bajada de datos con el Sheet |
| `js/db.js` | Guardado local (IndexedDB) |
| `js/demo.js` | Datos de ejemplo (nunca se suben) |
| `apps-script/Code.gs` | El script que va pegado dentro del Google Sheet |

## Puesta en marcha

### 1. Google Sheet
1. Creá un Google Sheet nuevo (por ejemplo "Rush · Campo") con la cuenta que va a ser dueña de los datos.
2. **Extensiones → Apps Script**. Borrá lo que haya, pegá el contenido de `apps-script/Code.gs` y guardá.
3. Elegí la función `configurar` → **Ejecutar**. Aceptá los permisos (Sheet y Drive).
   Se crean las pestañas Comercios, Visitas, Degustaciones, Parámetros y Pedidos, y la carpeta "Rush App · Fotos" en Drive.
4. **Implementar → Nueva implementación → Aplicación web**. Ejecutar como: *Yo*. Quién tiene acceso: *Cualquier persona*.
5. Volvé al Sheet: menú **Rush App → Ver datos de conexión**. Ahí están la dirección y la clave.
6. Completá la pestaña **Parámetros**: precios sugeridos, marcas de la competencia, vendedores y beneficios.

> Cada vez que cambies `Code.gs`: **Implementar → Gestionar implementaciones → Editar → Versión nueva**. Así la dirección no cambia.

### 2. Publicar la app
Es una carpeta de archivos estáticos. Se publica en un repositorio propio de GitHub Pages, **separado del de Reaktor**.
Tiene que ser `https`, que GitHub Pages ya da; sin `https`, la cámara y el GPS no funcionan.

### 3. En el celular del Encargado
1. Abrir https://cdalimentos2026.github.io/rush-app/ en Chrome (Android) o Safari (iPhone) → **Agregar a pantalla de inicio**.
2. Escribir su nombre y el **código de acceso** (la clave del script). La primera vez necesita señal.

La dirección del Sheet está fija en el código (`SHEET_URL` en `js/sync.js`): desde la app no se puede apuntar a otro Sheet.
Si se genera una clave nueva en el script (función `nuevaClave`), cada celular la carga en Ajustes → Cambiar código de acceso.

## Cómo se usa
- **Visita**: 9 pasos en el orden en que se recorre el comercio (llegás → frío → latas → precio → material → competencia → dueño → premio → cierre).
  Las secciones que no aplican no aparecen (piloto, objeción, premio). Junto a las preguntas que detectan un problema aparece **"Sacale una foto a esto"**.
- **Degustación**: *Antes* (checklist que bloquea el inicio) → *Durante* (contadores +1 por hora) → *A los 7 días* (la app avisa).
- **Comercios**: ficha con el último relevamiento, visitas, premios y pedidos de la embotelladora.
- **Tablero**: disponibilidad efectiva y su tendencia semanal, quiebres, precios, escalera, alertas, qué falla más, competencia, demanda, degustaciones, objeciones, voz del dueño y pedidos para la embotelladora.

## Pedidos de la embotelladora
Se pegan en la pestaña **Pedidos** con estas columnas: Fecha · Comercio · Cajas Original · Cajas ZERO · Nota.
El nombre del comercio tiene que ser igual al de la app. Por ahora se muestran en la ficha de cada comercio. El estado de la escalera lo valida el Encargado.

## Probar en la computadora
```bash
python -m http.server 5180 --directory rush-app
```
Abrir `http://localhost:5180` → Ajustes → **Cargar ejemplo** para ver el tablero con datos de prueba.

## Pendiente / decisiones abiertas
- Faltan las hojas **Revisión mensual** y **Parámetros** del archivo de campos. Parámetros se resolvió con valores por defecto editables en el Sheet. Revisión mensual no está en la app.
- Cálculo automático de la escalera (Nueva / Activa / Recurrente…) a partir de los pedidos: falta definir las reglas exactas.
- Las 10 objeciones conocidas (lección 2.4): hoy se marca "Conocida" o "Nueva". Con la lista, se puede elegir cuál.
- Promotor/a: hoy usa el mismo celular y la misma app que el Encargado.
