// The narration. A shot's spoken line is its "voice" in storyboard.json; this tool keeps one recording per line in
// films/NAME/voice/, measures each, and says whether it fits its shot.
//
//   node kit/audio/voice.mjs films/NAME                    status: every line, its recording, its length, its fit
//   node kit/audio/voice.mjs films/NAME --script           the lines still to record, as JSON
//   node kit/audio/voice.mjs films/NAME --add s03 SOURCE   take a recording for shot s03: a file path or an https URL
//   node kit/audio/voice.mjs films/NAME --generate         record the missing lines with the ElevenLabs API
//
// Two ways to record. With an API key (ELEVENLABS_API_KEY in the environment) --generate does it all and also keeps
// the time of every word, so captions follow the voice exactly. Without one, an agent that has a speech connector
// generates each line from --script and hands the result back with --add; captions are then paced across the line.
//
// The storyboard names the voice once:
//   "voice": { "voice_id": "...", "name": "Jefri", "model": "eleven_multilingual_v2", "language": "id" }
// Exit code 1 when a line is missing, stale (its text changed since it was recorded) or too long for its shot.
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const args = process.argv.slice(2);
const film = resolve(args.find((arg) => !arg.startsWith("--") && existsSync(join(arg, "storyboard.json"))) ?? ".");
if (!existsSync(join(film, "storyboard.json"))) throw new Error("pass the film's folder (the one with storyboard.json)");
const sb = JSON.parse(readFileSync(join(film, "storyboard.json"), "utf8"));
const dir = join(film, "voice");
const manifestFile = join(dir, "voice.json");
const manifest = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, "utf8")) : { lines: {} };
// How the mixer places a line: this long after the shot starts, and it must end this long before the shot does.
const LEAD = 0.15;
const TAIL = 0.2;

const sha = (text) => createHash("sha256").update(`${sb.voice?.voice_id ?? ""}\n${text}`).digest("hex").slice(0, 16);
const spoken = (sb.shots ?? []).filter((shot) => typeof shot.voice === "string" && shot.voice.trim());
const save = () => {
  mkdirSync(dir, { recursive: true });
  writeFileSync(manifestFile, `${JSON.stringify({ voice: sb.voice ?? null, lines: manifest.lines }, null, 2)}\n`);
};

// A recording's length, and the silence at each end of it, so the mixer can start it on the first sound.
function measure(file) {
  const duration = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString());
  const log = spawnSync("ffmpeg", ["-hide_banner", "-i", file, "-af", "silencedetect=noise=-40dB:d=0.05", "-f", "null", "-"]).stderr.toString();
  const starts = [...log.matchAll(/silence_start: (-?[\d.]+)/g)].map((m) => Math.max(0, Number(m[1])));
  const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]));
  const lead = starts[0] !== undefined && starts[0] < 0.02 && ends[0] !== undefined ? ends[0] : 0;
  const last = starts.at(-1);
  // The last silence counts as the tail when it runs to the end of the file (an encoder pads the end by a few
  // hundredths of a second, so "the end" is taken loosely).
  const tail = last !== undefined && (ends.length < starts.length || ends.at(-1) >= duration - 0.12) && last > lead ? duration - last : 0;
  const round = (n) => Math.round(n * 1000) / 1000;
  return { duration: round(duration), lead: round(lead), tail: round(tail), speech: round(duration - lead - tail) };
}

function record(shot, source, extra = {}) {
  mkdirSync(dir, { recursive: true });
  const file = `${shot.id}.mp3`;
  copyFileSync(source, join(dir, file));
  manifest.lines[shot.id] = { text: shot.voice, sha: sha(shot.voice), file, ...measure(join(dir, file)), ...extra };
  save();
  return manifest.lines[shot.id];
}

if (args.includes("--script")) {
  const todo = spoken.filter((shot) => manifest.lines[shot.id]?.sha !== sha(shot.voice));
  console.log(JSON.stringify({ voice: sb.voice ?? null, language: sb.voice?.language ?? sb.language, lines: todo.map((shot) => ({ id: shot.id, text: shot.voice })) }, null, 2));
  process.exit(0);
}

if (args.includes("--add")) {
  const [id, source] = args.slice(args.indexOf("--add") + 1);
  const shot = spoken.find((candidate) => candidate.id === id);
  if (!shot || !source) throw new Error("usage: --add <shot id that has a voice line> <file or https URL>");
  let local = source;
  if (/^https:\/\//.test(source)) {
    const response = await fetch(source);
    if (!response.ok) throw new Error(`could not fetch the recording: ${response.status}`);
    mkdirSync(dir, { recursive: true });
    local = join(dir, `.incoming-${id}`);
    writeFileSync(local, Buffer.from(await response.arrayBuffer()));
  }
  const line = record(shot, local);
  console.log(`${id}: ${line.speech.toFixed(2)} s of speech (file ${line.duration.toFixed(2)} s)`);
}

if (args.includes("--generate")) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("--generate needs ELEVENLABS_API_KEY; without a key, record from --script and hand each line back with --add");
  if (!sb.voice?.voice_id) throw new Error('the storyboard names no voice: add "voice": { "voice_id": "..." }');
  for (const shot of spoken) {
    if (manifest.lines[shot.id]?.sha === sha(shot.voice) && existsSync(join(dir, manifest.lines[shot.id].file))) continue;
    const body = { text: shot.voice, model_id: sb.voice.model ?? "eleven_multilingual_v2", ...(sb.voice.settings ? { voice_settings: sb.voice.settings } : {}) };
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${sb.voice.voice_id}/with-timestamps?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": key, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`ElevenLabs answered ${response.status} for ${shot.id}: ${(await response.text()).slice(0, 200)}`);
    const data = await response.json();
    mkdirSync(dir, { recursive: true });
    const incoming = join(dir, `.incoming-${shot.id}`);
    writeFileSync(incoming, Buffer.from(data.audio_base64, "base64"));
    // The time of every word, from the time of every character.
    const words = [];
    const a = data.alignment;
    if (a?.characters) {
      let word = "";
      let from = 0;
      a.characters.forEach((ch, i) => {
        if (/\s/.test(ch)) {
          if (word) words.push([Math.round(from * 1000) / 1000, Math.round(a.character_end_times_seconds[i - 1] * 1000) / 1000, word]);
          word = "";
        } else {
          if (!word) from = a.character_start_times_seconds[i];
          word += ch;
        }
      });
      if (word) words.push([Math.round(from * 1000) / 1000, Math.round(a.character_end_times_seconds.at(-1) * 1000) / 1000, word]);
    }
    const line = record(shot, incoming, words.length ? { words } : {});
    console.log(`${shot.id}: recorded, ${line.speech.toFixed(2)} s of speech`);
  }
}

// ── Status: does every line exist, is it current, does it fit its shot ──────
const beat = sb.music?.beat;
let bad = 0;
if (!spoken.length) console.log("no shot has a voice line: this film explains with captions only");
for (const shot of spoken) {
  const line = manifest.lines[shot.id];
  const dur = shot.end - shot.start;
  let state;
  if (!line || !existsSync(join(dir, line.file))) state = "MISSING";
  else if (line.sha !== sha(shot.voice)) state = "STALE (the text changed after it was recorded)";
  else {
    const slack = dur - LEAD - line.speech - TAIL;
    const needs = LEAD + line.speech + TAIL;
    state = slack >= 0 ? `fits, ${slack.toFixed(2)} s to spare` : `TOO LONG by ${(-slack).toFixed(2)} s: the shot needs ${needs.toFixed(2)} s${beat ? ` (${Math.ceil(needs / beat)} beats)` : ""}`;
    if (slack >= 0 && beat && dur - needs > beat * 1.5) state += `  (could lose ${Math.floor((dur - needs) / beat)} beat(s))`;
  }
  if (/MISSING|STALE|TOO LONG/.test(state)) bad++;
  console.log(`${shot.id.padEnd(5)} ${dur.toFixed(2).padStart(5)} s  ${line?.speech !== undefined ? `${line.speech.toFixed(2)} s spoken` : "             "}  ${state}`);
}
if (spoken.length) console.log(`${spoken.length} line(s), ${bad} to fix${bad ? "" : `, ${spoken.reduce((n, shot) => n + shot.voice.length, 0)} characters`}`);
process.exit(bad ? 1 : 0);
