var validation = require('./unalib');

function isGoogleLink(url) {
  if (!url || url.protocol !== 'https:' || url.port || url.username || url.password) return false;
  if (url.hostname === 'share.google') return /^\/[a-z0-9_-]+$/i.test(url.pathname);
  return ['google.com', 'www.google.com'].includes(url.hostname) &&
    ['/share.google', '/imgres'].includes(url.pathname);
}

function mediaFor(url) {
  return JSON.parse(validation.validateMessage(JSON.stringify({ mensaje: url }))).media;
}

async function resolveGoogleUrl(text, fetchUrl = fetch) {
  var url = validation.parseMediaUrl(text);
  if (!isGoogleLink(url)) return null;
  // Solo consultar redirecciones de Google. Nunca descargar destinos arbitrarios.
  var signal = AbortSignal.timeout(4000);
  try {
    for (var count = 0; count < 4; count++) {
      if (url.pathname === '/imgres') {
        var imageUrl = url.searchParams.get('imgurl');
        return validation.is_valid_url_image(imageUrl) ? imageUrl : null;
      }
      var response = await fetchUrl(url.href, { redirect: 'manual', signal: signal });
      if (response.body) await response.body.cancel();
      if (![301, 302, 303, 307, 308].includes(response.status)) return null;
      var location = response.headers.get('location');
      if (!location) return null;
      var next = validation.parseMediaUrl(new URL(location, url).href);
      if (!next) return null;
      if (mediaFor(next.href)) return next.href;
      if (!isGoogleLink(next)) return null;
      url = next;
    }
  } catch (e) {
    // Enlaces vencidos, errores de red o tiempo agotado: conservar el mensaje.
    return null;
  }
  return null;
}

async function resolveMessage(msg, fetchUrl = fetch) {
  var result = JSON.parse(validation.validateMessage(msg));
  var url = validation.parseMediaUrl(result.mensaje);
  if (!result.media && isGoogleLink(url)) {
    var resolved = await resolveGoogleUrl(result.mensaje, fetchUrl);
    if (resolved) result.media = mediaFor(resolved);
    if (!result.media) {
      result.enlace = url.href;
      result.aviso = 'No se pudo obtener la imagen del enlace de Google. Abra la imagen original y use «Copiar dirección de imagen».';
    }
  }
  return JSON.stringify(result);
}

module.exports = { resolveGoogleUrl, resolveMessage };
