import { mkdirSync, writeFileSync } from "node:fs";

const build = process.env.GITHUB_SHA || process.env.EXPECTED_BUILD || "local";
const version = process.env.npm_package_version || "0.0.1";

mkdirSync("public", { recursive: true });
writeFileSync("public/version.json", JSON.stringify({ version, build }, null, 2) + "\n");
console.log("RELEASE_VERSION", JSON.stringify({ version, build }));
