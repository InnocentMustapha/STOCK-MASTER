import dns from 'dns';
import { promisify } from 'util';

const lookup = promisify(dns.lookup);

const HOST = 'db.jkjgatjtpzjeyqtbyrky.supabase.co';

console.log(`Attempting to resolve: ${HOST}`);

try {
    const { address, family } = await lookup(HOST);
    console.log(`SUCCESS! Resolved to: ${address} (IPv${family})`);
} catch (err) {
    console.error(`FAILED to resolve ${HOST}`);
    console.error(`Error Code: ${err.code}`);
    console.error(`Message: ${err.message}`);
}
