
// npm install para descargar los paquetes...

// libreriuas
var googleMedia = require('./libs/google-media');
var app = require('express')();
var crypto = require('crypto');
var chatHtml = require('fs').readFileSync(__dirname + '/index.html', 'utf8');
var http = require('http').Server(app);
var io = require('socket.io')(http, { maxHttpBufferSize: 64 * 1024 });
var port = process.env.PORT || 3000;
app.disable('x-powered-by');

// root: presentar html
app.get('/', function(req, res){
  var nonce = crypto.randomBytes(18).toString('base64');
  res.set({
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'nonce-" + nonce +
      "'; style-src 'self' 'nonce-" + nonce + "'; img-src http: https:; media-src http: https:; " +
      "frame-src https://www.youtube.com; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  });
  res.type('html').send(chatHtml.replaceAll('__CSP_NONCE__', nonce));
});

// escuchar una conexion por socket
io.on('connection', function(socket){
  // si se escucha "chat message"
  socket.on('Evento-Mensaje-Server', async function(msg){

    try {
      msg = await googleMedia.resolveMessage(msg);
      var result = JSON.parse(msg);
      if (result.error) {
        socket.emit('Error-Mensaje', result.error);
        return;
      }
      // Solo se difunden mensajes que pasaron la validación del servidor.
      io.emit('Evento-Mensaje-Server', msg);
    } catch (e) {
      socket.emit('Error-Mensaje', 'No se pudo procesar el mensaje.');
    }
  });
});

if (require.main === module) {
  http.listen(port, function(){
    console.log('listening on *:' + port);
  });
}

module.exports = { http: http, io: io };
