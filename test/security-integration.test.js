var assert = require('assert');
var chat = require('../server');

describe('Seguridad del servidor del chat', function () {
  this.timeout(5000);
  var base;
  var clients = [];

  before(function (done) {
    chat.http.listen(0, '127.0.0.1', function () {
      base = 'http://127.0.0.1:' + chat.http.address().port;
      done();
    });
  });

  after(function (done) { chat.io.close(done); });

  // Clientes reales Engine.IO/Socket.IO mediante polling HTTP, sin dependencias nuevas.
  async function connect() {
    var handshake = await fetch(base + '/socket.io/?EIO=4&transport=polling');
    var sid = JSON.parse((await handshake.text()).slice(1)).sid;
    var endpoint = base + '/socket.io/?EIO=4&transport=polling&sid=' + encodeURIComponent(sid);
    async function post(packet) {
      var response = await fetch(endpoint, { method: 'POST', body: packet });
      assert.strictEqual(response.status, 200);
      await response.text();
    }
    await post('40');
    await (await fetch(endpoint)).text();
    var client = {
      send: function (raw) { return post('42' + JSON.stringify(['Evento-Mensaje-Server', raw])); },
      read: async function () {
        var response = await fetch(endpoint, { signal: AbortSignal.timeout(2000) });
        return (await response.text()).split('\x1e').filter(p => p.startsWith('42')).map(p => JSON.parse(p.slice(2)));
      },
      close: function () { return post('1'); }
    };
    clients.push(client);
    return client;
  }

  afterEach(async function () {
    await Promise.all(clients.map(client => client.close()));
    clients = [];
  });

  it('informa solo al remitente y no difunde inyecciones enviadas directamente al socket', async function () {
    var sender = await connect();
    var recipient = await connect();
    for (var fields of [
      { nombre: 'Billy', mensaje: '<img src=x onerror=alert(1)>' },
      { nombre: '<script>alert(1)</script>', mensaje: 'hola' },
      { nombre: 'Billy', mensaje: 'javascript:alert(1)' },
      { nombre: 'Billy', mensaje: 'https://example.com/page.html' }
    ]) {
      await sender.send(JSON.stringify(fields));
      var errors = await sender.read();
      assert.strictEqual(errors.length, 1);
      assert.strictEqual(errors[0][0], 'Error-Mensaje');
      assert.strictEqual(errors[0][1].includes('alert(1)'), false);
    }
    await sender.send(JSON.stringify({ nombre: 'Billy', mensaje: 'hola seguro' }));
    var received = await recipient.read();
    assert.strictEqual(received.length, 1);
    assert.strictEqual(received[0][0], 'Evento-Mensaje-Server');
    assert.strictEqual(JSON.parse(received[0][1]).mensaje, 'hola seguro');
  });

  it('mantiene imagenes, videos y YouTube y elimina metadatos falsificados', async function () {
    var sender = await connect();
    for (var url of ['https://example.com/photo.png', 'https://example.com/clip.mp4', 'https://youtu.be/qYwlqx-JLok']) {
      await sender.send(JSON.stringify({ mensaje: url, media: { tipo: 'youtube', url: 'javascript:alert(1)' } }));
      var received = await sender.read();
      assert.strictEqual(received[0][0], 'Evento-Mensaje-Server');
      var result = JSON.parse(received[0][1]);
      assert.ok(result.media);
      assert.ok(result.media.url.startsWith('https://'));
    }
  });

  it('devuelve CSP con nonce unico, sin scripts inline arbitrarios', async function () {
    var first = await fetch(base);
    var html = await first.text();
    var nonce = html.match(/<script nonce="([^"]+)"/)[1];
    var policy = first.headers.get('content-security-policy');
    assert.ok(policy.includes("script-src 'self' 'nonce-" + nonce + "'"));
    assert.ok(policy.includes("object-src 'none'"));
    assert.ok(!policy.includes("'unsafe-inline'"));
    assert.strictEqual(first.headers.get('x-content-type-options'), 'nosniff');
    assert.ok(!html.includes('__CSP_NONCE__'));
    var next = await fetch(base);
    assert.notStrictEqual(next.headers.get('content-security-policy'), policy);
    await next.text();
  });
});
