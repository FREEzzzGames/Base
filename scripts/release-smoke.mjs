import {existsSync,readFileSync} from "node:fs";

const required=["dist/index.html","dist/version.json"];
for(const file of required){
  if(!existsSync(file))throw new Error("Missing release artifact: "+file);
}
const html=readFileSync("dist/index.html","utf8");
const version=JSON.parse(readFileSync("dist/version.json","utf8"));
if(!version.build)throw new Error("Release manifest has no build SHA.");
if(process.env.EXPECTED_BUILD && version.build!==process.env.EXPECTED_BUILD){
  throw new Error(`Release manifest SHA mismatch: expected ${process.env.EXPECTED_BUILD}, got ${version.build}`);
}
if(!html.includes('<div id="app"></div>'))throw new Error("Portal entry point missing.");
if(/constructor|editor-layout|data-editor-/i.test(html))throw new Error("Obsolete constructor/editor runtime leaked into production.");
console.log("RELEASE_SMOKE_OK",JSON.stringify({build:version.build,version:version.version}));
