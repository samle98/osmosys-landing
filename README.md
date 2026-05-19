# Osmosys — Landing

Refactor del prototipo `Osmosys Landing.html` (un único HTML con CSS y JS inline)
en una estructura web mantenible. **Mismo render visual y mismo comportamiento**
que el artefacto original: solo se reorganiza el código.

## Estructura

```
PAGINA WEB/
├── index.html          ← markup semántico, sin estilos ni scripts inline
├── README.md           ← este archivo
├── assets/
│   └── logo-white.png  ← logotipo del colectivo
├── css/
│   ├── base.css        ← reset, variables (:root), tipografía global, botones compartidos
│   ├── boot.css        ← overlay de arranque
│   ├── scan.css        ← efecto de transición entre cápsulas
│   ├── cursor.css      ← cursor personalizado (anillo + punto)
│   ├── nav.css         ← navbar superior + botón de audio
│   ├── hero.css        ← sección hero (fondo, partículas, texto, preview)
│   ├── nodes.css       ← tira de nodos 01–05
│   ├── capsules.css    ← escenario y cabecera compartidos por las cápsulas
│   ├── manifesto.css   ← cápsula 01 — manifiesto
│   ├── gallery-360.css ← cápsula 02 — galería panorámica
│   ├── lab.css         ← cápsula 03 — laboratorio
│   ├── community.css   ← cápsula 04 — foro
│   ├── invite.css      ← cápsula 05 — invitación / dropzone
│   ├── tweaks.css      ← panel flotante de ajustes
│   └── footer.css      ← pie de página
└── js/
    ├── cursor.js          ← seguimiento del cursor + estado :hover
    ├── boot.js            ← descarte del overlay de arranque
    ├── particles.js       ← sembrado de partículas del hero
    ├── capsule-switch.js  ← cambio entre cápsulas con flicker de escaneo
    ├── audio-toggle.js    ← mute/unmute del botón de audio
    ├── gallery-360.js     ← paralaje horizontal de la panorámica
    └── tweaks.js          ← color de acento, barras y protocolo edit-mode
```

## Cómo arrancar un servidor local

El proyecto es HTML/CSS/JS vanilla — no necesita build. Pero **debe servirse
por HTTP** (no abrir `index.html` con doble clic) para que las rutas relativas
y los `postMessage` funcionen como en el original.

Desde la carpeta `PAGINA WEB/`, abre una terminal y elige una opción:

**Python 3** (preinstalado en muchas máquinas):

```sh
python -m http.server 8000
```

**Node.js**:

```sh
npx serve .
# o
npx http-server -p 8000
```

**PHP**:

```sh
php -S localhost:8000
```

Después abre <http://localhost:8000> en el navegador.

## Notas de diseño

- El `<meta viewport>` está fijado en `width=1440`: es un diseño de ancho fijo.
- Las tipografías (`Bebas Neue`, `DM Sans`, `Space Mono`) se cargan desde Google
  Fonts; necesitas conexión a internet la primera vez.
- Los colores y fuentes están centralizados como **variables CSS** en
  `:root` dentro de `css/base.css`. Cambiar `--neon` ahí (o desde el panel
  Tweaks en runtime) propaga el acento por toda la página.
- El orden de carga es: `base.css` primero y luego los módulos en el orden en
  que aparecen sus secciones en el DOM.
- Los scripts viven al final de `<body>` con `defer` para no bloquear el
  parser.
