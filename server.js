
// npm install para descargar los paquetes...

// libreriuas
var googleMedia = require('./libs/google-media');
var express = require('express');
var app = express();
var crypto = require('crypto');
var auth = require('./server/auth').createAuth(process.env);
var chatHtml = require('fs').readFileSync(__dirname + '/index.html', 'utf8');
var http = require('http').Server(app);
var io = require('socket.io')(http, { maxHttpBufferSize: 64 * 1024 });
var port = process.env.PORT || 3000;
app.disable('x-powered-by');
app.use(express.json());
auth.register(app);

// presentar html
function sendChat(req, res){
  var nonce = crypto.randomBytes(18).toString('base64');
  res.set({
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'nonce-" + nonce +
      "'; style-src 'self' 'nonce-" + nonce + "'; img-src http: https:; media-src http: https:; " +
      "frame-src https://www.youtube.com; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  });
  res.type('html').send(chatHtml.replaceAll('__CSP_NONCE__', nonce));
}
app.get('/', function(req, res){
  if (auth.isEnabled() && !auth.getUser(req)) return res.redirect(302, '/auth/login');
  sendChat(req, res);
});
app.get('/sala', auth.requireSession, sendChat);

// endpoint HTTP para envio de mensajes
app.post('/mensaje', auth.requireSession, async function(req, res){
  try {
    var raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    var msg = await googleMedia.resolveMessage(raw);
    var result = JSON.parse(msg);
    if (result.error) {
      return res.status(400).json(result);
    }
    io.emit('Evento-Mensaje-Server', msg);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: 'No se pudo procesar el mensaje.' });
  }
});

io.use(auth.socketGuard);

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
  auth.init().then(function(){
    http.listen(port, function(){
      console.log('listening on *:' + port);
    });
  }).catch(function(e){
    console.error('Auth0/Vault init failed: ' + e.message);
    process.exit(1);
  });
}

module.exports = { http: http, io: io, app: app };
