var crypto = require('crypto');
var vault = require('./vault');

var COOKIE = 'una_session';
var TX_COOKIE = 'una_tx';

function b64url(buf) { return Buffer.from(buf).toString('base64url'); }

function parseCookies(req) {
  var out = {};
  (req.headers.cookie || '').split(';').forEach(function (p) {
    var i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

// Auth0 con Client Secret (Post); el secreto se obtiene de Vault al arrancar.
function createAuth(env) {
  var domain = (env.AUTH0_DOMAIN || '').trim();
  var clientId = (env.AUTH0_CLIENT_ID || '').trim();
  var enabled = !!(domain && clientId);
  var baseUrl = (env.APP_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
  var secure = baseUrl.indexOf('https://') === 0;
  var clientSecret = null;
  var key = null;

  function sign(payload) {
    var body = b64url(JSON.stringify(payload));
    return body + '.' + crypto.createHmac('sha256', key).update(body).digest('base64url');
  }

  function verify(token) {
    if (!token || !key) return null;
    var parts = token.split('.');
    if (parts.length !== 2) return null;
    var expected = crypto.createHmac('sha256', key).update(parts[0]).digest();
    var given = Buffer.from(parts[1], 'base64url');
    if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
    try {
      var p = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
      return p.exp > Date.now() ? p : null;
    } catch (e) { return null; }
  }

  function setCookie(res, name, value, maxAgeSec) {
    res.append('Set-Cookie', name + '=' + encodeURIComponent(value) + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' +
      maxAgeSec + (secure ? '; Secure' : ''));
  }

  function getUser(req) {
    var s = verify(parseCookies(req)[COOKIE]);
    return s ? s.user : null;
  }

  async function tokenRequest(params) {
    var r = await fetch('https://' + domain + '/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(Object.assign({ client_id: clientId, client_secret: clientSecret }, params))
    });
    return { status: r.status, body: await r.json().catch(function () { return {}; }) };
  }

  // Lee el secreto de Vault y prueba la credencial: invalid_grant es lo esperado.
  async function init() {
    if (!enabled) return;
    if (env.VAULT_DATABASE_URL) clientSecret = await vault.getAuth0ClientSecret(env.VAULT_DATABASE_URL);
    else if (env.AUTH0_CLIENT_SECRET) clientSecret = env.AUTH0_CLIENT_SECRET;
    else throw new Error('Falta VAULT_DATABASE_URL o AUTH0_CLIENT_SECRET');
    key = crypto.createHmac('sha256', clientSecret).update('una-chat-session').digest();
    var probe = await tokenRequest({
      grant_type: 'authorization_code', code: 'vault-startup-probe',
      redirect_uri: baseUrl + '/auth/callback', code_verifier: 'x'.repeat(43)
    });
    console.log('Auth0 startup probe: HTTP ' + probe.status + ' error=' + probe.body.error);
  }

  function register(app) {
    app.get('/auth/config', function (req, res) {
      res.json(enabled ? { enabled: true, domain: domain, clientId: clientId } : { enabled: false });
    });

    app.get('/auth/me', function (req, res) {
      if (!enabled) return res.json({ enabled: false });
      var user = getUser(req);
      if (!user) return res.status(401).json({ error: 'No autenticado' });
      res.json({ enabled: true, user: user });
    });

    app.get('/auth/login', function (req, res) {
      if (!enabled) return res.status(404).end();
      var verifier = b64url(crypto.randomBytes(48));
      var state = b64url(crypto.randomBytes(16));
      var nonce = b64url(crypto.randomBytes(16));
      setCookie(res, TX_COOKIE, sign({ verifier: verifier, state: state, nonce: nonce, exp: Date.now() + 600000 }), 600);
      var q = new URLSearchParams({
        response_type: 'code', client_id: clientId, redirect_uri: baseUrl + '/auth/callback',
        scope: 'openid profile email', state: state, nonce: nonce,
        code_challenge: crypto.createHash('sha256').update(verifier).digest('base64url'),
        code_challenge_method: 'S256'
      });
      res.redirect(302, 'https://' + domain + '/authorize?' + q);
    });

    app.get('/auth/callback', async function (req, res) {
      if (!enabled) return res.status(404).end();
      var tx = verify(parseCookies(req)[TX_COOKIE]);
      if (!tx || !req.query.code || req.query.state !== tx.state) return res.status(400).send('Solicitud de login inválida');
      try {
        var t = await tokenRequest({
          grant_type: 'authorization_code', code: String(req.query.code),
          redirect_uri: baseUrl + '/auth/callback', code_verifier: tx.verifier
        });
        if (t.status !== 200 || !t.body.id_token) return res.status(401).send('Auth0 rechazó el login: ' + (t.body.error || t.status));
        var claims = JSON.parse(Buffer.from(t.body.id_token.split('.')[1], 'base64url').toString());
        var aud = [].concat(claims.aud);
        if (claims.iss !== 'https://' + domain + '/' || aud.indexOf(clientId) < 0 ||
            claims.nonce !== tx.nonce || claims.exp * 1000 < Date.now()) {
          return res.status(401).send('id_token inválido');
        }
        setCookie(res, COOKIE, sign({
          user: { sub: claims.sub, name: claims.name || claims.nickname || claims.email, email: claims.email },
          exp: Date.now() + 8 * 3600 * 1000
        }), 8 * 3600);
        setCookie(res, TX_COOKIE, '', 0);
        res.redirect(302, '/');
      } catch (e) {
        res.status(502).send('No se pudo completar el login');
      }
    });

    app.get('/auth/logout', function (req, res) {
      setCookie(res, COOKIE, '', 0);
      if (!enabled) return res.redirect(302, '/');
      res.redirect(302, 'https://' + domain + '/v2/logout?' + new URLSearchParams({ client_id: clientId, returnTo: baseUrl }));
    });
  }

  // 401 sin sesión cuando Auth0 está configurado.
  function requireSession(req, res, next) {
    if (!enabled || getUser(req)) return next();
    res.status(401).json({ error: 'Inicia sesión', login: '/auth/login' });
  }

  function socketGuard(socket, next) {
    if (!enabled || getUser(socket.request)) return next();
    next(new Error('No autenticado'));
  }

  return { init: init, register: register, requireSession: requireSession, socketGuard: socketGuard,
           getUser: getUser, isEnabled: function () { return enabled; } };
}

module.exports = { createAuth: createAuth };
