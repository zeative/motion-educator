// Starts a film: makes a workspace if there is none (the kit, the visual templates and package.json), then
// films/NAME from the scaffold (kit/scaffold).
//
//   node <skill>/kit/tools/new.mjs <workspace> <film-name> [--template KEY] [--portrait | --landscape]
//
// --template names the visual template the film is made in (templates/catalog.json; the person's prompt names it):
// the storyboard records it and takes its default format and narration. --portrait starts a 1080x1920 short,
// --landscape a 1920x1080 film; without either the template's default (or 1920x1080) is used.
//
// Afterwards: cd <workspace> && npm install && bash kit/audio/fetch.sh. Write storyboard.json first.
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const skill = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const argv = process.argv.slice(2);
const templateKey = argv.includes("--template") ? argv[argv.indexOf("--template") + 1] : undefined;
const [workspaceArg, name] = argv.filter((arg, i) => !arg.startsWith("--") && argv[i - 1] !== "--template");
if (!workspaceArg || !name || !/^[a-z0-9][a-z0-9-]*$/.test(name)) {
  console.error("usage: node kit/tools/new.mjs <workspace> <film-name> [--template KEY] [--portrait | --landscape]   (the name in lower case, digits and dashes)");
  process.exit(1);
}
let template = null;
if (templateKey) {
  const file = join(skill, "templates", templateKey, "template.json");
  if (!existsSync(file)) {
    const keys = JSON.parse(readFileSync(join(skill, "templates", "catalog.json"), "utf8")).templates.map((t) => t.key);
    console.error(`no visual template "${templateKey}": choose one of ${keys.join(", ")}`);
    process.exit(1);
  }
  template = JSON.parse(readFileSync(file, "utf8"));
}
const portrait = argv.includes("--portrait") || (!argv.includes("--landscape") && template?.defaults?.format === "1080x1920");
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
// The visual templates travel with the kit: a film loads its template's look.css and template.json from here.
if (!existsSync(join(workspace, "templates", "catalog.json"))) {
  cpSync(join(skill, "templates"), join(workspace, "templates"), { recursive: true });
  console.log(`copied the visual templates into ${workspace}`);
}
const ignore = join(workspace, ".gitignore");
if (!existsSync(ignore)) writeFileSync(ignore, "node_modules/\nout/\nkit/audio/lib/\n");
const film = join(workspace, "films", name);
if (existsSync(film)) {
  console.error(`${film} already exists`);
  process.exit(1);
}
cpSync(join(skill, "kit", "scaffold"), film, { recursive: true });
if (template) {
  const plan = join(film, "storyboard.json");
  const sb = JSON.parse(readFileSync(plan, "utf8"));
  const ordered = { title: sb.title, template: template.key, ...sb };
  ordered.look = { ...sb.look, accent: template.defaults?.accent ?? sb.look?.accent };
  writeFileSync(plan, `${JSON.stringify(ordered, null, 2)}\n`);
}
if (portrait) {
  const plan = join(film, "storyboard.json");
  // A short is replayed: it loops by default (references/narration.md, "The loop"). Its captions pop in under the
  // picture, where every template's caption skin (its strip, box or dialog) is made to sit.
  writeFileSync(
    plan,
    readFileSync(plan, "utf8")
      .replace('"format": "1920x1080"', '"format": "1080x1920"')
      .replace('"standard": 3,', '"standard": 3,\n  "captions": "pop",\n  "loop": { "line": "How the last line runs on into the first: say both, as one sentence.", "picture": "How the last shot ends on the first shot\'s picture." },'),
  );
}
console.log(`made ${film}${template ? ` in the ${template.name} template (read templates/${template.key}/template.md)` : ""}\nnext: write ${join(film, "storyboard.json")}, then: node kit/tools/storyboard.mjs films/${name} --png`);
