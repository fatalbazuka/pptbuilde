import http from 'node:http';
import { readFile } from 'node:fs/promises';
const port = Number(process.env.PORT || 3000);
const root = new URL('../', import.meta.url);
const allowed = new Set(['index.html', 'styles.css', 'app.mjs', 'core.mjs', 'favicon.svg']);
const mime = {
  html: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  svg: 'image/svg+xml',
};
http
  .createServer(async (req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    const file = path === '/' ? 'index.html' : path.slice(1);
    if (!allowed.has(file)) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    try {
      const body = await readFile(new URL(file, root));
      res.writeHead(200, {
        'Content-Type': mime[file.split('.').at(-1)],
        'Cache-Control': 'no-store',
      });
      res.end(body);
    } catch {
      res.writeHead(500);
      res.end('Unable to load file');
    }
  })
  .listen(port, '127.0.0.1', () => console.log(`PPT Builder: http://127.0.0.1:${port}`));
