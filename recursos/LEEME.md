# Recursos del laboratorio

Estos archivos van junto al documento *El Client Secret de Auth0 vive en Supabase Vault*. Ábrelos en el SQL Editor de tu proyecto de prueba, o copia `.env.example` a la raíz de UNA Chat.

No contienen el Client Secret, la contraseña del rol ni una URI real. Cuando sustituyas un marcador, no captures esa pantalla y no entregues el archivo ya rellenado.

`server/vault.js`, `server/auth.js` y `server/supabase-root-2021-ca.pem` no están aquí. Viajan con el repositorio de UNA Chat.

| Archivo | Paso del laboratorio | Qué hace |
|---|---|---|
| `01-crear-rol.sql` | 7 | Crea el rol `una_chat_backend`. Sustituye la contraseña, ejecútalo y borra el editor. |
| `una_chat_vault_access.sql` | 7 | Crea el esquema, la función y los permisos. En el repo también está en `sql/`. |
| `check_vault_privileges.sql` | 8 | Booleanos de privilegio y el nombre del secreto. En el repo también está en `sql/`. |
| `02-probar-roles-sin-permiso.sql` | 8 | `anon` y `authenticated` deben recibir `42501`. |
| `03-probar-anon-no-lee-vault.sql` | 8 | `anon` no lee `vault.decrypted_secrets`. |
| `04-probar-longitud.sql` | 8 | El rol de backend devuelve solo la longitud, y el permiso prestado se revoca. |
| `05-comprobar-miembro.sql` | 8 | El usuario del dashboard ya no debe ser miembro del rol. |
| `06-rotar-secreto.sql` | 14 | Pide el id y deja la plantilla de `vault.update_secret`. No lo captures con el valor nuevo. |
| `.env.example` | 10 | Plantilla de variables. Cópiala a `.env` dentro del proyecto. No la rellenes en esta carpeta. |
