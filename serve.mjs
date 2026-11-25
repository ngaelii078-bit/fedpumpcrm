// Serves the built demo from ./out. No dependencies needed.
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { exec } from "node:child_process";

const root = join(import.meta.dirname, "out");
const types = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".webp": "image/webp",
  ".png": "image/png", ".ico": "image/x-icon", ".woff2": "font/woff2", ".json": "application/json",
  ".txt": "text/plain; charset=utf-8", ".svg": "image/svg+xml",
};

const server = http.createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    let file = normalize(join(root, path));
    if (file !== root && !file.startsWith(root + sep)) throw new Error("outside");
    const s = await stat(file).catch(() => null);
    if (s?.isDirectory()) file = join(file, "index.html");
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
});

let port = Number(process.env.PORT || 4311);
// another project may already hold the port, so step to the next free one
server.on("error", (e) => {
  if (e.code === "EADDRINUSE" && port < 4340) server.listen(++port, "127.0.0.1");
  else throw e;
});
server.on("listening", () => {
  const url = `http://localhost:${port}/`;
  console.log(`Fedpump CRM demo: ${url}`);
  if (process.argv.includes("--open")) exec(process.platform === "win32" ? `start "" ${url}` : `open ${url}`);
});
server.listen(port, "127.0.0.1");
