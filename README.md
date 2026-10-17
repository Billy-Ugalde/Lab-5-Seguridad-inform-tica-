# Laboratorio 5: Chat con URLs multimedia

Chat en tiempo real con Express y Socket.IO.

## Ejecutar en PowerShell

```powershell
npm.cmd install
npm.cmd start
```

Abrir http://localhost:3000. Para detener el servidor, presionar Ctrl+C.

## Compartir contenido

Pegar una URL completa en el campo del mensaje y presionar Send:

- Imagen: URLs HTTP(S) terminadas en `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.webp` o `.avif`.
- Video: URLs HTTP(S) terminadas en `.mp4`, `.webm` o `.ogv`, con controles de reproduccion.
- YouTube: enlaces `youtube.com/watch?v=...`, `youtu.be/...`, `/embed/...` y `/shorts/...`.

Se aceptan parametros y fragmentos despues de la extension. Enviar la URL como mensaje completo, sin texto adicional. Otros mensajes se muestran como texto, sin interpretar HTML.

El archivo debe ser publico y permitir su carga desde otros sitios. La reproduccion depende del formato compatible con el navegador; YouTube puede impedir la insercion de algunos videos. El enlace original queda disponible para abrir el contenido cuando no carga.

Para comprobar la entrega en tiempo real, abrir dos pestanas del chat y enviar una URL desde una de ellas.

## Pruebas

```powershell
npm.cmd test
```

La deteccion analiza la URL en el servidor sin descargar archivos externos. El servidor envia texto y metadatos `media` (`tipo` y `url`); el navegador crea elementos DOM para mostrar el contenido, sin insertar HTML del usuario.

Referencias: [reproductor de YouTube](https://developers.google.com/youtube/player_parameters) y [elemento HTML video](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/video).
