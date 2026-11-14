// Starts a film: makes a workspace if there is none (the kit and its package.json), then films/NAME from the template.
//
//   node <skill>/kit/tools/new.mjs <workspace> <film-name>
//
// Afterwards: cd <workspace> && npm install && sh kit/audio/fetch.sh. Write storyboard.json first.
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const skill = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const [workspaceArg, name] = process.argv.slice(2);
if (!workspaceArg || !name || !/^[a-z0-9][a-z0-9-]*$/.test(name)) {
  console.error("usage: node kit/tools/new.mjs <workspace> <film-name>   (the name in lower case, digits and dashes)");
  process.exit(1);
}
const workspace = resolve(workspaceArg);
mkdirSync(workspace, { recursive: true });
if (!existsSync(join(workspace, "kit"))) {
  // The sound library is downloaded per workspace, never copied: its licence does not allow passing the files on.
  cpSync(join(skill, "kit"), join(workspace, "kit"), { recursive: true, filter: (source) => !source.includes(join("kit", "audio", "lib")) });
  console.log(`copied the kit into ${workspace}`);
}
if (!existsSync(join(workspace, "package.json"))) {
  const pkg = JSON.parse(readFileSync(join(skill, "package.json"), "utf8"));
  writeFileSync(join(workspace, "package.json"), `${JSON.stringify({ ...pkg, name: "films" }, null, 2)}\n`);
}
const ignore = join(workspace, ".gitignore");
if (!existsSync(ignore)) writeFileSync(ignore, "node_modules/\nout/\nkit/audio/lib/\n");
const film = join(workspace, "films", name);
if (existsSync(film)) {
  console.error(`${film} already exists`);
  process.exit(1);
}
cpSync(join(skill, "templates", "film"), film, { recursive: true });
console.log(`made ${film}\nnext: write ${join(film, "storyboard.json")}, then: node kit/tools/storyboard.mjs films/${name} --png`);
