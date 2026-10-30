// Serve the production static export without requiring a global package.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../out/", import.meta.url));
const port = Number(process.env.PORT || 3000);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};
if (!fs.existsSync(path.join(root, "index.html"))) {
  console.error("Production export not found. Run npm.cmd run build first.");
  process.exit(1);
}
const server = http.createServer((req, res) => {
  try {
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405);
      return res.end();
    }
    const requestUrl = new URL(req.url, "http://localhost");
    const pathname = decodeURIComponent(requestUrl.pathname);
    let filename = path.resolve(root, "." + pathname);
    const relative = path.relative(root, filename);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      res.writeHead(403);
      return res.end();
    }
    if (fs.existsSync(filename) && fs.statSync(filename).isDirectory()) {
      if (!pathname.endsWith("/")) {
        res.writeHead(308, {
          Location: `${requestUrl.pathname}/${requestUrl.search}`,
        });
        return res.end();
      }
      filename = path.join(filename, "index.html");
    }
    if (!fs.existsSync(filename) || !fs.statSync(filename).isFile()) {
      const notFound = path.join(root, "404.html");
      if (fs.existsSync(notFound)) {
        res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
        if (req.method === "HEAD") return res.end();
        return fs.createReadStream(notFound).pipe(res);
      }
      res.writeHead(404);
      return res.end("Not found");
    }
    res.writeHead(200, {
      "Content-Type":
        mime[path.extname(filename)] || "application/octet-stream",
      "Content-Length": fs.statSync(filename).size,
      "X-Content-Type-Options": "nosniff",
    });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(filename).pipe(res);
  } catch {
    res.writeHead(400);
    res.end("Bad request");
  }
});
server.listen(port, "127.0.0.1", () =>
  console.log(`Clinical Reference: http://localhost:${port}`),
);
