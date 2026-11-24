"""Marks one template ready with its sample film: three golden frames from the film's picture, template.json
(status, samples, golden), template.md (header, Status, Sample films) and catalog.json. README, gallery and site
are rebuilt separately.

    python3 publish_one.py KEY FILM T1 T2 T3
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path("/home/user/motion-educator")
key, film, *times = sys.argv[1:]
tdir = ROOT / "templates" / key
sb = json.loads((ROOT / "examples" / film / "storyboard.json").read_text())
title = sb["title"]
picture = ROOT / "examples" / film / "out" / "picture.mp4"
sample = film

golden = []
for i, t in enumerate(times, 1):
    name = f"{sample}-{i}.jpg"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(t), "-i", str(picture), "-frames:v", "1",
                    "-vf", "scale=720:-2", "-q:v", "3", str(tdir / "golden" / name)], check=True)
    golden.append(name)

tj = json.loads((tdir / "template.json").read_text())
tj["status"] = "ready"
tj["samples"] = sorted(set(tj.get("samples") or []) | {sample})
tj["golden"] = sorted(set(tj["golden"]) | set(golden))
(tdir / "template.json").write_text(json.dumps(tj, indent=2, ensure_ascii=False) + "\n")

md = (tdir / "template.md").read_text()
md = md.replace(" · concept: no sample film yet", " · ready")
a = md.index("## Status")
rest = md[a + 3:]
b = a + 3 + rest.index("\n## ") + 1 if "\n## " in rest else len(md)
status = (f"## Status\n\nReady: its first sample film is `examples/{film}` ({title}), made with the kit, checked by\n"
          f"`check.mjs` and `lookmatch.mjs`, and reviewed by an independent critic and verified again before it was\n"
          f"published. `golden/` holds three of its frames beside the concept still and the engine proof, so later films are\n"
          f"measured against a real one.\n\n"
          f"## Sample films\n\n- `{sample}`: {title} (`examples/{film}`)\n\n")
md = md[:a] + status + md[b:].lstrip("\n")
(tdir / "template.md").write_text(md.rstrip("\n") + "\n")

cat = ROOT / "templates" / "catalog.json"
c = json.loads(cat.read_text())
for t in c.get("templates", c if isinstance(c, list) else []):
    if t.get("key") == key:
        t["status"] = "ready"
cat.write_text(json.dumps(c, indent=2, ensure_ascii=False) + "\n")
print(key, "ready:", ", ".join(golden))
