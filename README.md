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

Se aceptan parametros y fragmentos despues de la extension. Enviar la URL como mensaje completo, sin texto adicional. Se permiten mensajes de texto normal. Las URLs de paginas u otros archivos se rechazan.

El chat muestra el nombre y la imagen o el reproductor, sin mostrar la URL enviada. El archivo debe ser publico y permitir su carga desde otros sitios. La reproduccion depende del formato compatible con el navegador; YouTube puede impedir la insercion de algunos videos. Si falla la carga de una imagen o un video directo, aparece un enlace «Abrir contenido», sin mostrar la URL completa.

Para comprobar la entrega en tiempo real, abrir dos pestanas del chat y enviar una URL desde una de ellas.

## Validacion de los inputs

`validateMessage` en `libs/unalib.js` valida los datos en el servidor antes de difundirlos:

- JSON con un campo `mensaje` de tipo texto; maximo 16384 caracteres por solicitud antes de analizar el JSON.
- Nombre de hasta 60 caracteres: letras Unicode, numeros, espacios, puntos, guiones, guion bajo y apostrofes. Nombre vacio: `Anonimo`.
- Mensaje de 1 a 4000 caracteres, sin HTML, delimitadores de etiquetas codificados ni caracteres de control no permitidos.
- Rechazo de protocolos activos o locales como `javascript:`, `vbscript:`, `data:`, `file:` y `blob:`.
- URLs completas HTTP(S) con los formatos multimedia documentados arriba, sin credenciales. Google solo se acepta si puede resolver a multimedia compatible; YouTube requiere un dominio reconocido y un ID valido.
- Color limitado a hexadecimal de seis digitos; los valores no validos se sustituyen por un color seguro. Los metadatos `media` enviados por un cliente se descartan y se calculan en el servidor.

Se rechaza el mensaje completo cuando no cumple las reglas; no se intenta arreglar HTML borrando partes con expresiones regulares. El servidor informa del error solo al remitente mediante `Error-Mensaje` y no difunde el contenido rechazado. La interfaz muestra el aviso como texto y conserva el uso de `textContent` y elementos DOM para los mensajes aceptados.

Como defensa adicional, la pagina usa una politica CSP con nonce distinto por respuesta, sin scripts inline arbitrarios, y cabeceras `nosniff` y de politica de referer. Socket.IO limita los paquetes a 64 KiB. Los atributos `maxlength` del formulario son una ayuda de uso; la validacion del servidor tambien se aplica a clientes que omiten el formulario.

La validacion comprueba el formato de las URLs, no certifica los bytes, la disponibilidad ni la seguridad del servidor remoto. El navegador debe poder cargar y decodificar el archivo; los fallos de carga muestran un aviso. Los archivos de imagen y video no se descargan en el servidor del chat.

## Pruebas

```powershell
npm.cmd test
```

Las pruebas cubren intentos XSS en ambos inputs, HTML codificado, URLs no permitidas, tipos y longitudes invalidas, metadatos falsificados y redirecciones de Google. Las pruebas de integracion envian paquetes Socket.IO reales para comprobar que un rechazo llega solo al remitente, y verifican las cabeceras CSP. Tambien se comprobo en Chrome con dos pestanas la carga de imagenes, reproduccion WebM y la visualizacion de errores privados.

La deteccion analiza la URL en el servidor. Para enlaces compartidos, solo consulta redirecciones HTTPS de `share.google`, `google.com` y `www.google.com`, en rutas permitidas, con un maximo de cuatro consultas y cuatro segundos de espera. No descarga la imagen ni sigue redirecciones a servidores arbitrarios. El servidor envia texto y metadatos `media` (`tipo` y `url`); el navegador crea elementos DOM para mostrar el contenido, sin insertar HTML del usuario.

Referencias: [reproductor de YouTube](https://developers.google.com/youtube/player_parameters) y [elemento HTML video](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/video).

Referencias de seguridad: [validacion de entradas de OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html) y [prevencion de XSS de OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html).
