/**
 * Writes config.json into the build output from the API_URL environment
 * variable.
 *
 * The file committed under public/ points at "/api", which is what the dev
 * server proxies — keeping it that way means local development and phone
 * testing keep working. A deployed site needs the API's real address instead,
 * and that belongs to the environment rather than the repository, so the host
 * supplies it at build time and the same source produces either.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const OUTPUT = join('dist', 'digital-bank-web', 'browser', 'config.json');
const apiUrl = (process.env.API_URL ?? '').trim().replace(/\/$/, '') || '/api';

if (!process.env.API_URL) {
  console.warn('API_URL is not set — the build will call /api on its own origin.');
}

await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify({ apiUrl }, null, 2)}\n`, 'utf8');
console.log(`config.json -> apiUrl: ${apiUrl}`);
