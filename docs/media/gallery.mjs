// Builds the README's gallery from the finished example films: for every examples/NAME that has been rendered and
// mixed (out/NAME.mp4), a thumbnail, a compact copy that GitHub can play in the browser, and its row in the table
// between the gallery markers in README.md.
//
//   node docs/media/gallery.mjs
//
// A film picks its own thumbnail with "poster": seconds in its storyboard.json; otherwise it is taken at 62%.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const ffmpeg = (...args) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args]);
const LANGUAGES = { id: "Indonesian", en: "English" };
mkdirSync(join(here, "films"), { recursive: true });

const rows = [];
for (const name of readdirSync(join(repo, "examples")).sort()) {
  const film = join(repo, "examples", name);
  const movie = join(film, "out", `${name}.mp4`);
  if (!existsSync(join(film, "storyboard.json")) || !existsSync(movie)) continue;
  const sb = JSON.parse(readFileSync(join(film, "storyboard.json"), "utf8"));
  const [W, H] = (sb.format ?? "1920x1080").split("x").map(Number);
  const portrait = H > W;
  const at = sb.poster ?? sb.duration * 0.62;
  // The thumbnail: 440 px wide for a landscape film, 250 px for a portrait one, so a row is about as tall either way.
  ffmpeg("-ss", String(at), "-i", movie, "-frames:v", "1", "-vf", `scale=${portrait ? 360 : 640}:-2`, "-q:v", "3", join(here, `${name}.jpg`));
  // The compact copy: 720p, 30 frames a second, small enough to keep in the repository and to play on its page.
  ffmpeg("-i", movie, "-vf", `fps=30,scale=${portrait ? "720:1280" : "1280:720"}:flags=lanczos`, "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", join(here, "films", `${name}.mp4`));
  const shots = sb.shots.length;
  const frames = sb.shots.reduce((n, shot) => n + (shot.frames?.length ?? 0), 0);
  const narration = sb.shots.some((shot) => shot.voice) ? `ElevenLabs (${sb.voice?.name ?? "voice"})` : "captions only";
  rows.push({
    duration: sb.duration,
    portrait,
    row: `| <a href="docs/media/films/${name}.mp4"><img src="docs/media/${name}.jpg" width="${portrait ? 130 : 230}" /></a> | [**${sb.title}**](examples/${name})<br/>${Math.round(sb.duration)} s · ${shots} shots · ${frames} storyboard frames · ${sb.facts?.length ?? 0} sourced facts<br/>[▶ watch](docs/media/films/${name}.mp4) · [storyboard](examples/${name}/storyboard) · [source](examples/${name}/film.js) | ${W}×${H} | ${LANGUAGES[sb.language] ?? sb.language} | ${narration} |`,
  });
  console.log(`${name}: thumbnail and compact copy`);
}
// Landscape films first, then the shorts; longest first in each.
rows.sort((a, b) => Number(a.portrait) - Number(b.portrait) || b.duration - a.duration);
const table = ["| | Film | Format | Language | Narration |", "| --- | --- | --- | --- | --- |", ...rows.map((entry) => entry.row)].join("\n");
const readme = join(repo, "README.md");
const text = readFileSync(readme, "utf8");
const start = "<!-- gallery:start -->";
const end = "<!-- gallery:end -->";
if (!text.includes(start) || !text.includes(end)) throw new Error("README.md has no gallery markers");
writeFileSync(readme, `${text.slice(0, text.indexOf(start) + start.length)}\n${table}\n${text.slice(text.indexOf(end))}`);
console.log(`README gallery: ${rows.length} film(s)`);
