import { pathToFileURL } from 'node:url';

export function isOwnDatabase(connection) {
  try {
    const url = new URL(connection);
    return ['postgres:', 'postgresql:'].includes(url.protocol)
      && (!url.port || url.port === '5432')
      && url.pathname === '/postgres'
      && ((url.hostname === 'db.zutmkpremkfthdlpgmsi.supabase.co' && url.username === 'postgres')
        || (url.hostname.endsWith('.pooler.supabase.com') && decodeURIComponent(url.username) === 'postgres.zutmkpremkfthdlpgmsi'));
  } catch { return false; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!isOwnDatabase(process.env.SUPABASE_DB_URL)) {
    console.error('New-project database connection required. Set SUPABASE_DB_URL to the zutmkpremkfthdlpgmsi Session pooler (5432).');
    process.exitCode = 1;
  } else console.log('Database deployment target verified.');
}
