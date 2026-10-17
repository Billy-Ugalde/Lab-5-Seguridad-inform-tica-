var assert = require('assert');
var validation = require('../libs/unalib');
var googleMedia = require('../libs/google-media');

function validate(mensaje, nombre = 'Billy') {
  return JSON.parse(validation.validateMessage(JSON.stringify({ nombre, mensaje, color: '#123456' })));
}

describe('Validacion de seguridad de UNA Lib', function () {
  [
    '<script>alert(1)</script>', '<IMG SRC=x onerror=alert(1)>',
    '<svg/onload=alert(1)>', '<iframe src="javascript:alert(1)"></iframe>',
    'hola <img src=x onerror=alert(1)>', '<scr<script>ipt>alert(1)</script>',
    '&lt;script&gt;alert(1)&lt;/script&gt;', '&#60;img src=x onerror=alert(1)&#62;',
    '&#x3c;svg onload=alert(1)&#x3e;', '%3Cscript%3Ealert(1)%3C/script%3E',
    '%253Cscript%253Ealert(1)%253C/script%253E',
    'javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'java\tscript:alert(1)',
    'data:text/html,<script>alert(1)</script>', 'vbscript:msgbox(1)',
    'file:///etc/passwd', 'blob:https://example.com/id',
    'https://example.com/a.png?x=%3Cscript%3E',
    'hola\u0000mundo'
  ].forEach(function (payload) {
    it('rechaza contenido activo: ' + JSON.stringify(payload), function () {
      var result = validate(payload);
      assert.ok(result.error);
      assert.strictEqual(result.mensaje, '');
      assert.strictEqual(result.media, null);
    });
  });

  ['<script>alert(1)</script>', '<img src=x onerror=alert(1)>',
    '&lt;svg onload=alert(1)&gt;', 'javascript:alert(1)', 'Billy\nAdmin'
  ].forEach(function (name) {
    it('rechaza inyeccion en nombre: ' + JSON.stringify(name), function () {
      assert.ok(validate('hola', name).error);
    });
  });

  ['https://example.com', 'https://example.com/foto.svg',
    'https://example.com/foto.png.exe', 'https://youtu.be/invalido',
    'ftp://example.com/video.mp4', '//example.com/foto.png',
    'https://user:pass@example.com/foto.png', 'mira https://example.com/foto.png'
  ].forEach(function (url) {
    it('rechaza enlaces no permitidos: ' + url, function () {
      assert.ok(validate(url).error);
    });
  });

  it('mantiene el texto normal, Unicode y apostrofes', function () {
    var result = validate("¡Hola! ¿Cómo estás? 😊 O'Brien", "José O'Brien");
    assert.strictEqual(result.error, undefined);
    assert.strictEqual(result.nombre, "José O'Brien");
    assert.strictEqual(result.mensaje, "¡Hola! ¿Cómo estás? 😊 O'Brien");
  });

  it('acepta exactamente los limites de longitud', function () {
    assert.strictEqual(validate('a'.repeat(4000), 'a'.repeat(60)).error, undefined);
  });

  [['', 'Billy'], ['a'.repeat(4001), 'Billy'], ['hola', 'a'.repeat(61)]].forEach(function (fields) {
    it('rechaza longitud invalida: ' + fields.map(s => s.length).join('/'), function () {
      assert.ok(validate(fields[0], fields[1]).error);
    });
  });

  [null, {}, 42, 'null', '[]', 'no es JSON', '{"mensaje":{}}', '{"mensaje":"hola","nombre":42}', 'x'.repeat(16385)].forEach(function (raw, i) {
    it('rechaza formato invalido ' + i, function () {
      assert.ok(JSON.parse(validation.validateMessage(raw)).error);
    });
  });

  it('no consulta Google si el nombre contiene una inyeccion', async function () {
    var calls = 0;
    var result = JSON.parse(await googleMedia.resolveMessage(JSON.stringify({
      nombre: '<script>alert(1)</script>', mensaje: 'https://share.google/abc'
    }), async function () { calls++; throw new Error('No debe consultar'); }));
    assert.ok(result.error);
    assert.strictEqual(calls, 0);
  });

  it('descarta campos extra, URLs de interfaz y errores enviados por el cliente', function () {
    var result = JSON.parse(validation.validateMessage(JSON.stringify({
      mensaje: 'hola', nombre: 'Billy', color: "red; background:url(javascript:alert(1))",
      enlace: 'javascript:alert(1)', aviso: '<script>alert(1)</script>',
      error: 'falso', media: { tipo: 'youtube', url: 'https://evil.test' },
      __proto__: { injected: true }
    })));
    assert.deepStrictEqual(result, { nombre: 'Billy', color: '#333333', mensaje: 'hola', media: null });
  });
});
