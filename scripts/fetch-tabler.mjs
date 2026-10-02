import { mkdir, writeFile } from "node:fs/promises";

const ROOT = new URL("../src/public/assets/tabler/", import.meta.url);
const TABLER_COMMIT = "f7c848a9382d1f806d569d3866c0e02b8709c340";
const NAMES = ["boy","video","chatbot","game","music","archive","welcome-on-board","message","search","loading","calendar","boy-refresh","error","good-news","wait","neutral-info","shopping","reading","podcast","exit","icons-drawing","dart","electric-scooter"];

await mkdir(ROOT, { recursive: true });
for (const name of NAMES) {
  const url = `https://raw.githubusercontent.com/tabler/tabler/${TABLER_COMMIT}/shared/static/illustrations/dark/${name}.png`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Tabler illustration download failed: ${name} (${response.status})`);
  await writeFile(new URL(`${name}.png`, ROOT), Buffer.from(await response.arrayBuffer()));
}
console.log(`TABLER_ILLUSTRATIONS_OK ${NAMES.length}`);
