var assert = require('assert');
var val = require('../libs/unalib');

function message(text, extra) {
  return JSON.parse(val.validateMessage(JSON.stringify(Object.assign({
    nombre: 'Billy', mensaje: text, color: '#123ABC'
  }, extra))));
}

describe('URLs multimedia del chat', function () {
  ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'avif'].forEach(function (ext) {
    it('detecta imagen ' + ext + ' con parametros y fragmento', function () {
      var url = 'https://example.com/foto.' + ext.toUpperCase() + '?size=400#preview';
      assert.strictEqual(val.is_valid_url_image(url), true);
      assert.deepStrictEqual(message(url).media, { tipo: 'imagen', url: url });
    });
  });

  ['mp4', 'webm', 'ogv'].forEach(function (ext) {
    it('detecta video directo ' + ext, function () {
      var url = 'https://example.com/video.' + ext + '?download=1';
      assert.deepStrictEqual(message(url).media, { tipo: 'video', url: url });
    });
  });

  [
    'https://www.youtube.com/watch?v=qYwlqx-JLok&feature=shared',
    'https://youtu.be/qYwlqx-JLok?t=10',
    'https://www.youtube.com/embed/qYwlqx-JLok',
    'https://m.youtube.com/shorts/qYwlqx-JLok'
  ].forEach(function (url) {
    it('incrusta YouTube: ' + url, function () {
      assert.strictEqual(val.is_valid_yt_video(url), true);
      assert.strictEqual(val.getYTVideoId(url), 'qYwlqx-JLok');
      assert.deepStrictEqual(message(url).media, {
        tipo: 'youtube', url: 'https://www.youtube.com/embed/qYwlqx-JLok'
      });
    });
  });

  [
    'https://example.com', 'https://example.com/foto.jpg.exe',
    'https://example.com/?file=foto.jpg', 'javascript:alert(1)',
    'data:image/png;base64,abc', 'ftp://example.com/foto.jpg',
    'https://youtube.com.evil.test/watch?v=qYwlqx-JLok',
    'https://youtu.be/incorrecto', 'https://youtube.com/watch',
    'https://example.com/foto.png" onerror="alert(1)',
    '<img src=x onerror=alert(1)>'
  ].forEach(function (text) {
    it('rechaza URL no compatible o contenido malicioso: ' + text, function () {
      var result = message(text);
      assert.ok(result.error);
      assert.strictEqual(result.mensaje, '');
      assert.strictEqual(result.media, null);
    });
  });

  it('reemplaza metadatos multimedia enviados por un cliente', function () {
    assert.strictEqual(message('hola', {
      media: { tipo: 'youtube', url: 'javascript:alert(1)' }
    }).media, null);
  });

  it('conserva nombre, texto y color validos', function () {
    var result = message('hola', { nombre: 'Billy' });
    assert.strictEqual(result.nombre, 'Billy');
    assert.strictEqual(result.mensaje, 'hola');
    assert.strictEqual(result.color, '#123ABC');
  });

  it('acepta espacios alrededor de una URL', function () {
    assert.strictEqual(message('  https://example.com/foto.png  ').media.tipo, 'imagen');
  });

  it('descarta colores malformados sin interrumpir el chat', function () {
    var result = message('hola', { color: { toString: null, valueOf: null } });
    assert.strictEqual(result.color, '#333333');
  });

  [null, 12, {}, 'no es JSON', 'null', '[]', '{"mensaje":42}'].forEach(function (input) {
    it('maneja mensajes malformados: ' + JSON.stringify(input), function () {
      var result = JSON.parse(val.validateMessage(input));
      assert.strictEqual(typeof result.mensaje, 'string');
      assert.strictEqual(result.media, null);
    });
  });
});
