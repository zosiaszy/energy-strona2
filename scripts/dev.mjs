// Local preview with a working /api/contact (Vercel-like req/res shim).
// Usage: node scripts/dev.mjs [port]   (reads .env.local if present)
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(root, '.env.local');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && !line.trim().startsWith('#')) process.env[m[1]] ??= m[2];
  }
}
const { default: contact } = await import('../api/contact.js');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json' };
const port = Number(process.argv[2] || process.env.PORT || 4530);

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/contact') {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const ct = String(req.headers['content-type'] || '');
    req.body = ct.includes('application/json') ? (() => { try { return JSON.parse(raw); } catch { return {}; } })()
      : ct.includes('urlencoded') ? Object.fromEntries(new URLSearchParams(raw)) : {};
    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (o) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); };
    res.send = (s) => res.end(s);
    return contact(req, res);
  }
  let file = path.join(root, decodeURIComponent(url.pathname));
  if (!file.startsWith(root)) { res.statusCode = 403; return res.end(); }
  try {
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    const body = await readFile(file);
    const type = TYPES[path.extname(file)] || 'application/octet-stream';
    res.setHeader('Content-Type', type);
    // compress text like Vercel does, so local Lighthouse numbers are comparable
    if (/text|javascript|json|xml|svg/.test(type) && /gzip/.test(req.headers['accept-encoding'] || '')) {
      res.setHeader('Content-Encoding', 'gzip');
      return res.end(gzipSync(body));
    }
    res.end(body);
  } catch { res.statusCode = 404; res.end('Not found'); }
}).listen(port, () => console.log(`Energy Management dev: http://localhost:${port}`));
