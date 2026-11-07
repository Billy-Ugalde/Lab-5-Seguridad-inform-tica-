var fs = require('fs');
var path = require('path');
var { Client } = require('pg');

var ca = fs.readFileSync(path.join(__dirname, 'supabase-root-2021-ca.pem'), 'utf8');

// Lee una_chat_auth0_client_secret de Supabase Vault con el rol una_chat_backend.
async function getAuth0ClientSecret(databaseUrl) {
  var url = new URL(databaseUrl);
  url.searchParams.delete('sslmode');
  var client = new Client({
    connectionString: url.toString(),
    ssl: { ca: ca, rejectUnauthorized: true },
    connectionTimeoutMillis: 10000
  });
  await client.connect();
  try {
    var r = await client.query('select una_chat_private.get_auth0_client_secret() as secret');
    return r.rows[0].secret;
  } finally {
    await client.end();
  }
}

module.exports = { getAuth0ClientSecret: getAuth0ClientSecret };
