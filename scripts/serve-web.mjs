#!/usr/bin/env node
// 프로덕션 웹 빌드를 확인하는 정적 서버입니다. 없는 경로는 index.html로 돌려줍니다.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const root = resolve(process.argv[2] ?? 'dist');
const port = Number(process.argv[3] ?? 8081);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.png': 'image/png', '.ico': 'image/x-icon' };

createServer((req, res) => {
  let path = join(root, normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  if (!path.startsWith(root + sep) && path !== root) return res.writeHead(403).end();
  if (!existsSync(path) || statSync(path).isDirectory()) path = join(root, 'index.html');
  res.writeHead(200, { 'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream' });
  createReadStream(path).pipe(res);
}).listen(port, () => console.log(`웹 빌드: http://localhost:${port}`));
