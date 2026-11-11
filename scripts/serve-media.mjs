#!/usr/bin/env node
// 개발과 E2E에서 쓰는 정적 미디어 서버입니다. GitHub Pages처럼 Range 요청과 CORS를 지원합니다.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const root = resolve(process.argv[2] ?? 'public-media');
const port = Number(process.argv[3] ?? 8787);
const TYPES = { '.flac': 'audio/flac', '.json': 'application/json; charset=utf-8', '.jpg': 'image/jpeg', '.webp': 'image/webp' };

createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Accept-Ranges', 'bytes');
  const path = join(root, normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  if (!path.startsWith(root + sep)) return res.writeHead(403).end();

  let size;
  try {
    size = statSync(path).size;
  } catch {
    return res.writeHead(404).end();
  }
  res.setHeader('Content-Type', TYPES[extname(path)] ?? 'application/octet-stream');

  const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
  if (!match) {
    res.writeHead(200, { 'Content-Length': size });
    return req.method === 'HEAD' ? res.end() : createReadStream(path).pipe(res);
  }
  const start = match[1] ? Number(match[1]) : size - Number(match[2]);
  const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  if (start > end || start < 0) return res.writeHead(416, { 'Content-Range': `bytes */${size}` }).end();
  res.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
  return req.method === 'HEAD' ? res.end() : createReadStream(path, { start, end }).pipe(res);
}).listen(port, () => console.log(`미디어 서버: http://localhost:${port}`));
