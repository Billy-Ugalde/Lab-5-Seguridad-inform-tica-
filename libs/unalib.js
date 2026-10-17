// modulo de ejemplo.

function invalidMessage(error) {
  // No devolver el contenido rechazado al navegador ni a otros usuarios.
  return JSON.stringify({ error: error, mensaje: '', media: null });
}

function isPlainText(value) {
  // No se admite HTML, ni sus delimitadores codificados, en este chat de texto.
  var markup = /[<>]|&(?:lt|gt|#0*6[02]|#x0*3[ce]);?|%(?:25)*3[ce]/i;
  var controls = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
  var unsafeScheme = /\b(?:java\s*script|vb\s*script|data|file|blob)\s*:/i;
  return !markup.test(value) && !controls.test(value) && !unsafeScheme.test(value);
}

module.exports = {


    // logica que valida si un telefono esta correcto...
    is_valid_phone: function (phone) {
      // inicializacion lazy
      var isValid = false;
      // expresion regular copiada de StackOverflow
      var re = /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/i;
  
      // validacion Regex
      try {
        isValid = re.test(phone);
      } catch (e) {
        console.log(e);
      } finally {
          return isValid;
      }
      // fin del try-catch block
    },
  
    // Solo URLs completas HTTP(S), sin credenciales ni caracteres de HTML.
    parseMediaUrl: function (value) {
      if (typeof value !== 'string' || value.length > 4000 || !isPlainText(value)) return null;
      var text = value.trim();
      if (!/^https?:\/\//i.test(text) || /[\s<>"'\\]|%(?:0[0-9a-f]|1[0-9a-f]|7f)/i.test(text)) return null;
      try {
        var url = new URL(text);
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
        return url;
      } catch (e) {
        return null;
      }
    },

    is_valid_url_image: function (value) {
      var url = this.parseMediaUrl(value);
      return !!url && /\.(jpg|jpeg|png|gif|bmp|webp|avif)$/i.test(url.pathname);
    },

    is_valid_url_video: function (value) {
      var url = this.parseMediaUrl(value);
      return !!url && /\.(mp4|webm|ogv)$/i.test(url.pathname);
    },

    is_valid_yt_video: function (value) {
      return this.getYTVideoId(value) !== null;
    },

    is_valid_google_media_url: function (value) {
      var url = this.parseMediaUrl(value);
      if (!url || url.protocol !== 'https:' || url.port) return false;
      if (url.hostname === 'share.google') return /^\/[a-z0-9_-]+$/i.test(url.pathname);
      return ['google.com', 'www.google.com'].includes(url.hostname) &&
        ['/share.google', '/imgres'].includes(url.pathname);
    },

    getYTVideoId: function (value) {
      var url = this.parseMediaUrl(value);
      if (!url) return null;
      var id = null;
      if (url.hostname === 'youtu.be') {
        id = url.pathname.slice(1);
      } else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)) {
        if (url.pathname === '/watch') {
          id = url.searchParams.get('v');
        } else {
          var match = url.pathname.match(/^\/(?:embed|shorts|v)\/([^/]+)\/?$/);
          if (match) id = match[1];
        }
      }
      return /^[\w-]{11}$/.test(id || '') ? id : null;
    },

    validateMessage: function (msg) {
      if (typeof msg !== 'string' || msg.length > 16384) return invalidMessage('Formato de mensaje no válido.');
      var obj;
      try {
        obj = JSON.parse(msg);
      } catch (e) {
        return invalidMessage('Formato de mensaje no válido.');
      }
      if (!obj || typeof obj !== 'object' || Array.isArray(obj) || typeof obj.mensaje !== 'string') {
        return invalidMessage('El mensaje debe ser texto.');
      }
      if (obj.nombre !== undefined && typeof obj.nombre !== 'string') return invalidMessage('Nombre no válido.');
      var name = obj.nombre === undefined || !obj.nombre.trim() ? 'Anonimo' : obj.nombre.trim();
      if (name.length > 60 || !/^[\p{L}\p{M}\p{N} ._'’\-]+$/u.test(name)) {
        return invalidMessage('El nombre solo admite letras, números, espacios, puntos, guiones y apóstrofes (máximo 60 caracteres).');
      }
      var text = obj.mensaje.trim();
      if (!text || obj.mensaje.length > 4000) return invalidMessage('El mensaje debe tener entre 1 y 4000 caracteres.');
      if (!isPlainText(text)) return invalidMessage('No se permite HTML, scripts ni código activo en los mensajes.');
      var media = null;
      if (this.is_valid_url_image(text)) {
        media = { tipo: 'imagen', url: text.trim() };
      } else if (this.is_valid_url_video(text)) {
        media = { tipo: 'video', url: text.trim() };
      } else if (this.is_valid_yt_video(text)) {
        media = { tipo: 'youtube', url: 'https://www.youtube.com/embed/' + this.getYTVideoId(text) };
      }
      var containsUrl = /https?\s*:|[a-z][a-z0-9+.-]*:\/\/|(?:^|\s)\/\/|\bwww\.|\b(?:mailto|tel):/i.test(text);
      if (!media && containsUrl && !this.is_valid_google_media_url(text)) {
        return invalidMessage('Solo se permiten URLs completas de imágenes o videos compatibles.');
      }
      return JSON.stringify({
        nombre: name,
        color: typeof obj.color === 'string' && /^#[0-9a-f]{6}$/i.test(obj.color) ? obj.color : '#333333',
        mensaje: text,
        media: media
      });
    }
};

