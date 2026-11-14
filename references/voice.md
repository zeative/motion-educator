# Narration

A film can explain with captions alone, or it can speak. When it speaks, the voice sets the clock: a shot is as long
as its line needs, and the captions keep time with the voice.

## In the storyboard

Name the voice once, and give each shot its line:

```json
{
  "language": "id",
  "voice": { "voice_id": "1ijzBXcD3AIVH8RGMcQd", "name": "Jefri", "model": "eleven_multilingual_v2", "language": "id" },
  "captions": "pill",
  "shots": [{ "id": "s03", "voice": "Padahal, cahaya Matahari itu putih.", "caption": "Cahaya Matahari itu *putih*." }]
}
```

- `voice` on a shot is exactly what is said, written the way it should be spoken: numbers as words where the
  reading is not obvious ("lima koma sembilan kali", "nineteen seventy-one"), no symbols the voice would stumble on.
- `caption` is optional once there is a voice. With no caption, the spoken line is shown as the subtitle. Give a
  caption when the screen should carry a shorter line than the voice says, or to mark the accent word with
  `*stars*`.
- One sentence a shot, sometimes two short ones. A line that needs a breath in the middle is two shots.
- `"caption": false` keeps a shot's line off the screen when the picture itself letters it (a title card that is
  also spoken).
- Write for the ear: short words, the subject first, the new thing last. Read it aloud; if you run out of air, cut.
- A number said aloud is a claim like any other: the shot cites its fact.

## Length: the voice decides

Speech runs at about 15 characters a second in Indonesian and English (a calm explaining pace). A line starts
0.15 s after its shot and has to end 0.2 s before the shot does, so a shot needs `0.35 s + the line`.

1. Write every line. Give each shot a first length from `characters / 15 + 0.35`, rounded up to whole beats.
2. Record (below). `voice.mjs` then prints, for every shot, the measured length, the room to spare, and how many
   beats the shot needs.
3. Change the shot lengths in the storyboard to fit and run the storyboard check again. Do this before building:
   retiming a built film moves every shot after the change.

A short has no room for whole bars of slack. Count its shots in half beats (set `music.beat` to half the track's
beat) so a line of 2.1 seconds gets a 2.4 second shot, not a 2.8 second one.

Prefer changing the line to stretching a shot past five seconds. A shot whose line leaves more than a second and a
half of silence is too long: trim it, or give the silence a purpose (the picture finishing what the voice began).

## Recording

```sh
node kit/audio/voice.mjs films/NAME                 # status: every line, its recording, its length, its fit
node kit/audio/voice.mjs films/NAME --generate      # with ELEVENLABS_API_KEY: records what is missing or stale
node kit/audio/voice.mjs films/NAME --script        # without a key: the lines to record, as JSON
node kit/audio/voice.mjs films/NAME --add s03 URL   # ...and each recording handed back, as a file or an https URL
```

Recordings live in `films/NAME/voice/sNN.mp3` beside `voice.json`, which keeps each line's text, length and the
silence at its ends. A line whose text changed after it was recorded is reported as stale.

**With an API key**, `--generate` calls ElevenLabs once per line and also stores the time of every word, so the
captions land exactly on the voice.

**With a speech connector instead of a key** (an agent that has ElevenLabs tools but no key in the environment):
take the lines from `--script`, generate each one with the storyboard's `voice_id` (one take, not several: the
choice is yours to make by listening to nothing, so do not pay for variations nobody will compare), and pass the
audio URL the connector returns to `--add`. Captions are then spread across each line by word length, which is
close but not exact: say so when you deliver.

Never paste a key into the storyboard, a script or a commit. It lives in the environment.

## Choosing a voice

- Match the audience and the language first, then the register: calm and clear for a lesson, quicker and more
  casual for a short.
- One voice a film. Keep the same `voice_id` across a series.
- For Indonesian, use a voice recorded in Indonesian; a multilingual English voice reads Indonesian with an accent.
- You cannot hear it. Pick by the voice's description and labels, say which you picked, and ask the person to
  listen to the first line before recording the rest when the film is long.

## In the mix

The mixer places each line on its shot, brings the whole narration to one level (-16 LUFS before the master), and
makes room for it: while someone speaks the music sits 9 dB lower and the effects 4 dB lower, opening a little
before each line and closing slowly after it. Change these in `cues.json`:

```json
{ "voice": { "lufs": -16, "lead": 0.15, "duck_db": -9, "sfx_db": -4 } }
```

- Under narration the music is a bed. Choose a track without a lead melody, and set it 2 to 3 dB lower than you
  would for a silent film (`"lufs": -20`).
- Effects go between the words, not on them. A hit lands on the cut, before the line starts.
- `mix.py --no-voice` makes the version without narration, for tracing a complaint to the right layer.

## Captions with a voice

`film.captions()` shows the caption (or the spoken line) in one of two styles:

| Style | Looks like | Use |
| --- | --- | --- |
| `pill` | a glass bar of subtitles near the bottom | landscape films; the default there |
| `pop` | two or three large words at a time, each lighting as it is said | portrait shorts; the default there |

Set `"captions": "pill"` or `"pop"` in the storyboard to choose. A long line is cut into groups that follow one
another; with `pop`, a group is at most three words. In a caption that the screen shows instead of the spoken line,
the words are paced across the time the line takes.

## What to say when you deliver

That nobody has listened: the voice was chosen by its description, the mix was set by measurement, and the captions
follow the voice exactly (word times) or approximately (paced by length), whichever is true. Name the voice. Ask
the person to check the pronunciation of names, numbers and any foreign word.
