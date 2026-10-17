var assert = require('assert');
var validation = require('../libs/unalib');
var resolver = require('../libs/google-media');

var shared = 'https://share.google/WdJo9CZOAHo0MWCqw';
var image = 'https://upload.wikimedia.org/wikipedia/commons/e/e2/UEFA_Champions_League_logo.png';
var imageResult = 'https://www.google.com/imgres?imgurl=' + encodeURIComponent(image);

function redirect(location) {
  return { status: 302, headers: new Headers({ location: location }) };
}

describe('Enlaces compartidos de Google', function () {
  it('resuelve las dos redirecciones de un enlace compartido', async function () {
    var calls = [];
    var result = await resolver.resolveMessage(JSON.stringify({
      nombre: 'Billy', mensaje: shared, color: '#123456'
    }), async function (url, options) {
      calls.push(url);
      assert.strictEqual(options.redirect, 'manual');
      return redirect(calls.length === 1 ? 'https://www.google.com/share.google?q=abc' : imageResult);
    });
    assert.strictEqual(calls.length, 2);
    var parsed = JSON.parse(result);
    assert.strictEqual(parsed.mensaje, shared);
    assert.strictEqual(parsed.nombre, 'Billy');
    assert.deepStrictEqual(parsed.media, { tipo: 'imagen', url: image });
  });

  it('extrae la imagen de Google Imágenes sin descargar la imagen ni la pagina', async function () {
    var calls = 0;
    var result = await resolver.resolveGoogleUrl(imageResult, function () { calls++; });
    assert.strictEqual(result, image);
    assert.strictEqual(calls, 0);
  });

  it('no hace solicitudes para mensajes normales ni URLs directas', async function () {
    for (var text of ['hola', image, 'https://example.com/page']) {
      var result = await resolver.resolveMessage(JSON.stringify({ mensaje: text }), function () {
        throw new Error('No debe descargar URLs arbitrarias');
      });
      assert.deepStrictEqual(JSON.parse(result), JSON.parse(validation.validateMessage(JSON.stringify({ mensaje: text }))));
    }
  });

  [
    'http://www.google.com/share.google?q=abc',
    'https://www.google.com:8443/share.google?q=abc',
    'https://www.google.com.evil.test/share.google?q=abc',
    'https://127.0.0.1/private',
    'https://user:pass@www.google.com/share.google?q=abc',
    'https://www.google.com/url?q=http://127.0.0.1'
  ].forEach(function (location) {
    it('no sigue redirecciones fuera de los destinos permitidos: ' + location, async function () {
      var calls = 0;
      var result = await resolver.resolveGoogleUrl(shared, async function () {
        calls++; return redirect(location);
      });
      assert.strictEqual(result, null);
      assert.strictEqual(calls, 1);
    });
  });

  it('limita los bucles de redireccion', async function () {
    var calls = 0;
    assert.strictEqual(await resolver.resolveGoogleUrl(shared, async function () {
      calls++; return redirect(shared);
    }), null);
    assert.ok(calls <= 4);
  });

  [new Error('Network error'), { status: 404, headers: new Headers() }].forEach(function (response) {
    it('conserva el mensaje cuando Google falla: ' + response, async function () {
      var result = JSON.parse(await resolver.resolveMessage(JSON.stringify({mensaje: shared}), async function () {
        if (response instanceof Error) throw response;
        return response;
      }));
      assert.strictEqual(result.mensaje, shared);
      assert.strictEqual(result.media, null);
      assert.ok(result.aviso.includes('Copiar dirección de imagen'));
    });
  });

  it('no convierte esquemas peligrosos de imgurl en multimedia', async function () {
    assert.strictEqual(await resolver.resolveGoogleUrl('https://www.google.com/imgres?imgurl=javascript:alert(1)'), null);
  });
});
