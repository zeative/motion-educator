// A smoke test of the whole kit, in both formats: the storyboard check, the scaffold, stills, a short render, the
// narration tool and the mixer. About two minutes on four cores.
//
//   node kit/tools/test.mjs            (or: npm test)
//
// It needs what a film needs (run kit/tools/doctor.mjs first) but not the sound library and not an API key.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sketch } from "./sketch.mjs";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const tool = (name) => join(repo, "kit", "tools", name);
let failed = 0;
let count = 0;
function test(name, fn) {
  count++;
  const began = Date.now();
  try {
    fn();
    console.log(`  pass  ${name}  (${((Date.now() - began) / 1000).toFixed(1)} s)`);
  } catch (error) {
    failed++;
    console.log(`  FAIL  ${name}\n        ${String(error.message).split("\n").slice(0, 6).join("\n        ")}`);
  }
}
const run = (cmd, args, { expect = 0, cwd } = {}) => {
  const result = spawnSync(cmd, args, { encoding: "utf8", cwd });
  if (result.status !== expect) throw new Error(`${cmd} ${args.slice(0, 3).join(" ")} exited with ${result.status}, expected ${expect}\n${(result.stderr || result.stdout).trim().split("\n").slice(-5).join("\n")}`);
  return result.stdout + result.stderr;
};
const assert = (ok, message) => {
  if (!ok) throw new Error(message);
};
const probe = (file, entries) => execFileSync("ffprobe", ["-v", "error", "-show_entries", entries, "-of", "csv=p=0", file]).toString().trim();
// A picture's size as "WxH". Read by pattern: some ffprobe builds add fields after the two numbers.
const size = (file) => {
  const out = execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=s=x:p=0", file]).toString();
  return out.match(/(\d+)x(\d+)/)?.[0] ?? out.trim();
};
// Mean brightness of an image, 0 to 255: a blank frame is under 5.
const brightness = (file) => {
  const out = spawnSync("ffmpeg", ["-hide_banner", "-i", file, "-vf", "format=gray,signalstats,metadata=print:key=lavfi.signalstats.YAVG", "-frames:v", "1", "-f", "null", "-"], { encoding: "utf8" }).stderr;
  return Number(out.match(/YAVG=([0-9.]+)/)?.[1] ?? 0);
};

console.log("Motion Educator: smoke test");

test("the sketcher draws both formats", () => {
  const frame = { at: 0, note: "", draw: [{ glow: [540, 700, 300] }, { title: [540, 800], text: "Why?", size: 120 }, { horizon: [1500] }] };
  assert(sketch(frame, "a").includes('viewBox="0 0 1920 1080"'), "landscape viewBox is wrong");
  assert(sketch(frame, "b", { width: 1080, height: 1920 }).includes('viewBox="0 0 1080 1920"'), "portrait viewBox is wrong");
});

for (const example of readdirSync(join(repo, "examples"))) {
  if (!existsSync(join(repo, "examples", example, "storyboard.json"))) continue;
  test(`examples/${example}: storyboard passes`, () => {
    const out = run("node", [tool("storyboard.mjs"), join(repo, "examples", example)]);
    assert(/ 0 errors/.test(out), out.trim().split("\n").at(-1));
  });
}

const workspace = mkdtempSync(join(tmpdir(), "motion-educator-test-"));
try {
  test("the scaffold makes a workspace with a landscape and a portrait film", () => {
    run("node", [tool("new.mjs"), workspace, "wide"]);
    run("node", [tool("new.mjs"), workspace, "tall", "--portrait"]);
    symlinkSync(join(repo, "node_modules"), join(workspace, "node_modules"), "dir");
    assert(existsSync(join(workspace, "kit", "engine", "motion.js")), "the kit was not copied");
    assert(JSON.parse(readFileSync(join(workspace, "films", "tall", "storyboard.json"), "utf8")).format === "1080x1920", "the portrait film is not 1080x1920");
  });

  test("the template's storyboard is refused until it is written", () => {
    const out = run("node", [join(workspace, "kit", "tools", "storyboard.mjs"), join(workspace, "films", "wide")], { expect: 1 });
    assert(/error/.test(out), "expected rule errors for the one-shot template");
  });

  for (const [name, want] of [["wide", "1920x1080"], ["tall", "1080x1920"]]) {
    test(`${name}: a still is ${want} and not blank`, () => {
      const film = join(workspace, "films", name);
      run("node", [join(workspace, "kit", "tools", "render.mjs"), film, "--stills", "1.5"]);
      const still = join(film, "out", "stills", "still-001.50.png");
      assert(size(still) === want, `the still is ${size(still)}`);
      assert(brightness(still) > 8, `the still is nearly black (mean ${brightness(still)})`);
    });
  }

  const tall = join(workspace, "films", "tall");
  test("tall: narration is scripted, taken in, measured and checked for fit", () => {
    const plan = JSON.parse(readFileSync(join(tall, "storyboard.json"), "utf8"));
    plan.voice = { voice_id: "test-voice", name: "Test", language: "en" };
    plan.shots[0].voice = "Why is the sky blue?";
    writeFileSync(join(tall, "storyboard.json"), `${JSON.stringify(plan, null, 2)}\n`);
    const script = JSON.parse(run("node", [join(workspace, "kit", "audio", "voice.mjs"), tall, "--script"]));
    assert(script.lines.length === 1 && script.lines[0].id === "s01", "the script should list one line, s01");
    run("node", [join(workspace, "kit", "audio", "voice.mjs"), tall], { expect: 1 }); // missing
    // A stand-in recording: 0.2 s of silence, 1.4 s of tone, 0.3 s of silence.
    const take = join(workspace, "take.mp3");
    run("ffmpeg", ["-y", "-loglevel", "error", "-f", "lavfi", "-i", "sine=frequency=220:duration=1.4", "-af", "adelay=200:all=1,apad=pad_dur=0.3", "-ar", "44100", take]);
    run("node", [join(workspace, "kit", "audio", "voice.mjs"), tall, "--add", "s01", take]);
    const line = JSON.parse(readFileSync(join(tall, "voice", "voice.json"), "utf8")).lines.s01;
    assert(Math.abs(line.speech - 1.4) < 0.12, `measured ${line.speech} s of speech, expected about 1.4`);
    assert(Math.abs(line.lead - 0.2) < 0.08, `measured ${line.lead} s of leading silence, expected about 0.2`);
    assert(/fits/.test(run("node", [join(workspace, "kit", "audio", "voice.mjs"), tall])), "the line should fit its shot");
  });

  test("tall: a short render has every frame, at 1080x1920", () => {
    run("node", [join(workspace, "kit", "tools", "render.mjs"), tall, "--fps", "10", "--jobs", "2"]);
    const picture = join(tall, "out", "picture.mp4");
    assert(size(picture) === "1080x1920", `the picture is ${size(picture)}, not 1080x1920`);
    const frames = Number(execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-count_frames", "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", picture]).toString().match(/\d+/)?.[0]);
    assert(Math.abs(frames - 28) <= 1, `${frames} frames, expected 28 (2.791 s at 10 fps)`);
  });

  test("tall: the mixer lays the narration on the picture at the target loudness", () => {
    writeFileSync(join(tall, "cues.json"), '{ "music": { "file": "none" }, "events": [] }\n');
    const out = run("python3", [join(workspace, "kit", "audio", "mix.py"), tall, "--no-music"]);
    assert(/1 voice lines/.test(out), `the mix did not report the voice line: ${out.trim()}`);
    const lufs = Number(out.match(/mix: (-?[\d.]+) LUFS/)?.[1]);
    assert(Math.abs(lufs + 14) < 1.5, `mixed at ${lufs} LUFS, expected about -14`);
    assert(probe(join(tall, "out", "tall.mp4"), "stream=codec_type").includes("audio"), "the mixed film has no sound");
  });

  test("tall: the measurements run on the finished film", () => {
    const out = run("node", [join(workspace, "kit", "tools", "check.mjs"), tall]);
    assert(/decodes cleanly/.test(out) && /LUFS/.test(out), out.trim());
  });
} finally {
  rmSync(workspace, { recursive: true, force: true });
}

console.log(failed ? `\n${failed} of ${count} failed` : `\nall ${count} passed`);
process.exit(failed ? 1 : 0);
