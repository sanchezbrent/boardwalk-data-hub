import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const server = createServer(async (req, res) => {
  if (req.method !== "GET") { res.writeHead(405); res.end(); return; }
  const pathname = new URL(req.url, "http://localhost").pathname;
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Security-Policy", "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  const path = resolve(root, `.${pathname === "/" ? "/examples/demo/index.html" : decodeURIComponent(pathname)}`);
  if (!path.startsWith(root + sep) || ![resolve(root,"dist")+sep,resolve(root,"examples/demo")+sep].some(p => path.startsWith(p))) { res.writeHead(404); res.end(); return; }
  try { const data = await readFile(path); res.setHeader("Content-Type", ({".html":"text/html", ".js":"text/javascript", ".mjs":"text/javascript"})[extname(path)] ?? "application/octet-stream"); res.end(data); }
  catch { res.writeHead(404); res.end(); }
});
server.listen(4173, "127.0.0.1", () => process.stdout.write("Synthetic local pilot: http://127.0.0.1:4173\n"));
