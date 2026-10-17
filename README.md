# Laboratorio 5: Chat con URLs multimedia

Chat en tiempo real con Express y Socket.IO.

Requiere Node.js 18 o posterior (usa `fetch` para resolver enlaces compartidos de Google).

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
- Google Imagenes: enlaces `share.google/...` y `google.com/imgres?imgurl=...`. Se obtiene la URL original de la imagen a partir de las redirecciones de Google. Si el enlace no expone una imagen compatible, el chat muestra una indicacion para copiar la direccion de la imagen original.

Se aceptan parametros y fragmentos despues de la extension. Enviar la URL como mensaje completo, sin texto adicional. Otros mensajes se muestran como texto, sin interpretar HTML.

El chat muestra el nombre y la imagen o el reproductor, sin mostrar la URL enviada. El archivo debe ser publico y permitir su carga desde otros sitios. La reproduccion depende del formato compatible con el navegador; YouTube puede impedir la insercion de algunos videos. Si falla la carga de una imagen o un video directo, aparece un enlace «Abrir contenido», sin mostrar la URL completa.

Para comprobar la entrega en tiempo real, abrir dos pestanas del chat y enviar una URL desde una de ellas.

## Pruebas

```powershell
npm.cmd test
```

La deteccion analiza la URL en el servidor. Para enlaces compartidos, solo consulta redirecciones HTTPS de `share.google`, `google.com` y `www.google.com`, en rutas permitidas, con un maximo de cuatro consultas y cuatro segundos de espera. No descarga la imagen ni sigue redirecciones a servidores arbitrarios. El servidor envia texto y metadatos `media` (`tipo` y `url`); el navegador crea elementos DOM para mostrar el contenido, sin insertar HTML del usuario.

Referencias: [reproductor de YouTube](https://developers.google.com/youtube/player_parameters) y [elemento HTML video](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/video).
