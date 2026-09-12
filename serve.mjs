// 本地预览服务器：node serve.mjs [端口]，然后手机同一 Wi-Fi 打开 http://<电脑IP>:端口
import { createServer } from 'node:http'; import { readFile } from 'node:fs/promises'; import { extname, join, normalize } from 'node:path'; import { networkInterfaces } from 'node:os';
const port = +(process.argv[2] || 4173), dir = new URL('.', import.meta.url).pathname;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };
createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p === '/') p = '/index.html';
  try { const f = await readFile(join(dir, normalize(p))); res.writeHead(200, { 'Content-Type': types[extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(f); }
  catch { res.writeHead(404); res.end('404'); }
}).listen(port, () => { const ips = Object.values(networkInterfaces()).flat().filter(i => i.family === 'IPv4' && !i.internal).map(i => i.address); console.log(`刻度 · http://localhost:${port}  手机: ${ips.map(ip => `http://${ip}:${port}`).join('  ')}`); });
