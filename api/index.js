// Entrada para Vercel (serverless). Render sigue usando server.js directamente.
var Sentry = require('@sentry/node');
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: 'vercel',
  tracesSampleRate: 0 // solo errores, sin trazas
});
var app = require('../server').app;

Sentry.setupExpressErrorHandler(app);
module.exports = app;
