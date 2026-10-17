// modulo de ejemplo.

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
      if (typeof value !== 'string') return null;
      var text = value.trim();
      if (!/^https?:\/\//i.test(text) || /[\s<>"']/.test(text)) return null;
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
      var obj = {};
      if (typeof msg === 'string') {
        try {
          var parsed = JSON.parse(msg);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) obj = parsed;
        } catch (e) {
          obj = { mensaje: msg };
        }
      }
      var text = typeof obj.mensaje === 'string' ? obj.mensaje : '';
      var media = null;
      if (this.is_valid_url_image(text)) {
        media = { tipo: 'imagen', url: text.trim() };
      } else if (this.is_valid_url_video(text)) {
        media = { tipo: 'video', url: text.trim() };
      } else if (this.is_valid_yt_video(text)) {
        media = { tipo: 'youtube', url: 'https://www.youtube.com/embed/' + this.getYTVideoId(text) };
      }
      return JSON.stringify({
        nombre: typeof obj.nombre === 'string' && obj.nombre.trim() ? obj.nombre : 'Anonimo',
        color: typeof obj.color === 'string' && /^#[0-9a-f]{6}$/i.test(obj.color) ? obj.color : '#333333',
        mensaje: text,
        media: media
      });
    }
};

