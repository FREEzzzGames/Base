import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const root = resolve("public");
const pages = [];
function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (extname(entry.name).toLowerCase() === ".html") pages.push(file);
  }
}
walk(root);

const errors = [];
let checked = 0;
for (const page of pages) {
  const html = readFileSync(page, "utf8");
  let index = 0;
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const attributes = match[1];
    const source = match[2];
    index++;
    if (/\bsrc\s*=/.test(attributes) || !source.trim()) continue;
    const type = attributes.match(/\btype\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase() || "";
    if (type && !["module", "text/javascript", "application/javascript"].includes(type)) continue;
    checked++;
    try {
      execFileSync(process.execPath, ["--check", "--input-type=module"], {
        input: source,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"]
      });
    } catch (error) {
      const detail = error?.stderr?.toString() || error?.message || String(error);
      errors.push(page + " inline script #" + index + ": " + detail.trim());
    }
  }
}
assert.deepEqual(errors, [], "Inline JavaScript syntax errors found:\n" + errors.join("\n"));
console.log("INLINE_HTML_SCRIPT_SYNTAX_OK", JSON.stringify({ pages: pages.length, scripts: checked, errors: 0 }));
