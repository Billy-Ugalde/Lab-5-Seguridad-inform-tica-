var assert = require('assert');
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var JSDOM = require('jsdom').JSDOM;
var validation = require('../libs/unalib');

var html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

describe('Pruebas unitarias de la interfaz del chat', function () {
  var dom;
  var document;
  var handlers;
  var sent;

  beforeEach(async function () {
    // Sin recursos externos ni scripts del HTML ejecutados automaticamente.
    dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost:3000' });
    document = dom.window.document;
    handlers = {};
    sent = [];
    dom.window.scrollTo = function () {};
    dom.window.io = function () {
      return {
        on: function (event, handler) { handlers[event] = handler; },
        emit: function (event, payload) { sent.push({ event: event, payload: payload }); }
      };
    };
    // Ejecutar exclusivamente el script propio del proyecto, nunca los payloads.
    var source = document.querySelector('script:not([src])').textContent;
    new vm.Script(source, { filename: 'index.html' }).runInContext(dom.getInternalVMContext());
    await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
  });

  afterEach(function () { dom.window.close(); });

  function receive(text) {
    var result = validation.validateMessage(JSON.stringify({ nombre: 'Billy', mensaje: text }));
    assert.strictEqual(JSON.parse(result).error, undefined);
    handlers['Evento-Mensaje-Server'](result);
    return document.querySelector('#messages li:last-child');
  }

  describe('URLs de imagenes', function () {
    ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'avif'].forEach(function (ext) {
      it('muestra una imagen ' + ext + ' sin mostrar la URL', function () {
        var url = 'https://example.com/foto.' + ext + '?size=400#preview';
        var item = receive(url);
        var image = item.querySelector('img');
        assert.ok(image);
        assert.strictEqual(image.src, url);
        assert.strictEqual(image.alt, 'Imagen compartida');
        assert.strictEqual(item.querySelectorAll('img').length, 1);
        assert.strictEqual(item.textContent, 'Billy: ');
        assert.strictEqual(item.querySelector('a, video, iframe'), null);
      });
    });

    it('reemplaza una imagen que no carga por un aviso y un enlace seguro', function () {
      var item = receive('https://example.com/no-existe.png');
      item.querySelector('img').dispatchEvent(new dom.window.Event('error'));
      assert.strictEqual(item.querySelector('img'), null);
      assert.ok(item.textContent.includes('No se pudo cargar el contenido.'));
      assert.strictEqual(item.querySelector('a').href, 'https://example.com/no-existe.png');
      assert.strictEqual(item.querySelector('a').textContent, 'Abrir contenido');
      assert.strictEqual(item.querySelector('a').rel, 'noopener noreferrer');
    });
  });

  describe('URLs de videos', function () {
    ['mp4', 'webm', 'ogv'].forEach(function (ext) {
      it('crea el reproductor ' + ext + ' con controles y sin autoplay', function () {
        var url = 'https://example.com/video.' + ext + '?download=1';
        var item = receive(url);
        var video = item.querySelector('video');
        assert.ok(video);
        assert.strictEqual(video.src, url);
        assert.strictEqual(video.controls, true);
        assert.strictEqual(video.autoplay, false);
        assert.strictEqual(video.preload, 'metadata');
        assert.strictEqual(item.querySelector('img, iframe, a'), null);
        assert.ok(!item.textContent.includes(url));
      });
    });

    it('incrusta YouTube con el dominio y el ID validados', function () {
      var item = receive('https://youtu.be/qYwlqx-JLok?t=10');
      var iframe = item.querySelector('iframe');
      assert.ok(iframe);
      assert.strictEqual(iframe.src, 'https://www.youtube.com/embed/qYwlqx-JLok');
      assert.strictEqual(iframe.title, 'Video de YouTube compartido');
      assert.strictEqual(iframe.allowFullscreen, true);
      assert.strictEqual(item.textContent, 'Billy: ');
      assert.strictEqual(item.querySelector('a, video, img'), null);
    });

    it('muestra un aviso si falla la carga del video directo', function () {
      var item = receive('https://example.com/no-existe.mp4');
      item.querySelector('video').dispatchEvent(new dom.window.Event('error'));
      assert.strictEqual(item.querySelector('video'), null);
      assert.ok(item.textContent.includes('No se pudo cargar el contenido.'));
      assert.strictEqual(item.querySelector('a').href, 'https://example.com/no-existe.mp4');
    });
  });

  describe('Prevencion de inyeccion de scripts', function () {
    [
      '<script>alert("Inyección de script");</script>',
      '<img src=x onerror=alert(1)>',
      '&lt;script&gt;alert(1)&lt;/script&gt;',
      'javascript:alert(1)'
    ].forEach(function (payload) {
      it('muestra el rechazo sin insertar el payload: ' + payload, function () {
        var result = JSON.parse(validation.validateMessage(JSON.stringify({ nombre: 'Billy', mensaje: payload })));
        assert.ok(result.error);
        handlers['Error-Mensaje'](result.error);
        assert.strictEqual(document.querySelector('#messages').children.length, 0);
        assert.strictEqual(document.querySelector('#chat-error').hidden, false);
        assert.strictEqual(document.querySelector('#chat-error').textContent, result.error);
        assert.strictEqual(document.querySelector('#chat-error').children.length, 0);
      });
    });

    it('rechaza la inyeccion en el nombre sin agregar un mensaje al chat', function () {
      var result = JSON.parse(validation.validateMessage(JSON.stringify({
        nombre: '<img src=x onerror=alert(1)>', mensaje: 'hola'
      })));
      assert.ok(result.error);
      handlers['Error-Mensaje'](result.error);
      assert.strictEqual(document.querySelector('#messages').children.length, 0);
      assert.strictEqual(document.querySelector('#chat-error').hidden, false);
      assert.strictEqual(document.querySelector('#chat-error').children.length, 0);
    });

    it('permite volver a enviar texto normal despues de un error', function () {
      handlers['Error-Mensaje']('Mensaje rechazado.');
      document.querySelector('#nombre').value = 'Billy';
      document.querySelector('#m').value = 'Hola seguro';
      document.querySelector('form').dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
      assert.strictEqual(document.querySelector('#chat-error').hidden, true);
      assert.strictEqual(sent.length, 1);
      assert.strictEqual(sent[0].event, 'Evento-Mensaje-Server');
      assert.strictEqual(JSON.parse(sent[0].payload).mensaje, 'Hola seguro');
    });
  });
});
