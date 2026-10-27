import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";

const publicRoot = resolve("public");
const htmlFiles = [];
function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (extname(entry.name).toLowerCase() === ".html") htmlFiles.push(file);
  }
}
walk(publicRoot);

const missing = [];
for (const file of htmlFiles) {
  const source = await import("node:fs/promises").then(fs => fs.readFile(file, "utf8"));
  const virtualFile = relative(publicRoot, file).split(sep).join("/");
  const virtualDirectory = dirname(virtualFile) === "." ? "" : dirname(virtualFile);
  for (const match of source.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)) {
    const raw = match[1].trim();
    if (!raw || /^(?:https?:|data:|blob:|mailto:|tel:|#|javascript:)/i.test(raw) || raw.startsWith("//")) continue;
    const pathname = raw.split(/[?#]/, 1)[0];
    if (!pathname || pathname.endsWith("/")) continue;
    const target = resolve(publicRoot, virtualDirectory, pathname);
    if (!target.startsWith(publicRoot + sep) && target !== publicRoot) {
      missing.push(file + " -> path escapes public/: " + raw);
      continue;
    }
    // Vite's src/index.html is emitted as the root index.html.
    if (pathname === "./index.html" || pathname === "index.html") continue;
    if (!existsSync(target)) missing.push(virtualFile + " -> " + raw);
  }
}
assert.deepEqual(missing, [], "Broken local HTML routes/assets found:\n" + missing.join("\n"));
console.log("LOCAL_HTML_ROUTES_OK", JSON.stringify({ pages: htmlFiles.length, missing: 0 }));
