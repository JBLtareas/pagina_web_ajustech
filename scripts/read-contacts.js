/**
 * Lista contactos descifrados desde server/data/contacts.json
 * Uso en el VPS: npm run contacts
 * Requiere la misma CONTACT_ENCRYPTION_KEY del .env.
 */
import { listContactsDecrypted, contactStorePath } from '../server/contactStore.js';

const rows = listContactsDecrypted();
console.log(`Archivo: ${contactStorePath}`);
console.log(`Total: ${rows.length}\n`);

if (rows.length === 0) {
  console.log('Sin mensajes todavía.');
  process.exit(0);
}

for (const row of rows.reverse()) {
  console.log('─'.repeat(48));
  console.log(`Fecha:  ${row.createdAt}`);
  console.log(`Nombre: ${row.name}`);
  console.log(`Email:  ${row.email}`);
  console.log(`Msg:    ${row.message}`);
}
