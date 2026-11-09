import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 3000;
const DIST_DIR = path.join(process.cwd(), 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.vcf': 'text/vcard; charset=utf-8'
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath.endsWith('/')) {
    reqPath += 'index.html';
  }

  let filePath = path.join(DIST_DIR, reqPath);

  // If path has no extension and directory exists, serve index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  console.log(`\n🎉 Preview Server running at: http://localhost:${PORT}`);
  console.log(`👉 电子名片总览中心: http://localhost:${PORT}/`);
  console.log(`👉 01 号名片 (带照片): http://localhost:${PORT}/c/01/`);
  console.log(`👉 02 号名片 (首字母圆圈 KG): http://localhost:${PORT}/c/02/`);
  console.log(`👉 03 号名片 (Mark Roach): http://localhost:${PORT}/c/03/\n`);
});
