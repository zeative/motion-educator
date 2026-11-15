"""A toy flash, to compute the bars of s09 instead of drawing them by eye.

7 blocks of 16 pages (the film's grid: six blocks the user sees and one spare). The user area is 96 pages; a share of
it holds live data. Every write replaces a random live page: the old copy goes stale and the new one is written to
the next erased page. When no erased page is left, greedy garbage collection picks the block with the fewest valid
pages, copies those to erased pages and erases the block. Write amplification = pages written / pages asked for.

    python3 examples/hp-lemot/sim.py      -> sim.json
"""
import json
import random
from pathlib import Path


def run(user_frac, B=7, P=16, user_pages=96, writes=200000, seed=1):
    rnd = random.Random(seed)
    live = round(user_frac * user_pages)
    blocks = [[None] * P for _ in range(B)]  # None erased, -1 stale, else the id of the data
    where = {}
    free = list(range(B))
    state = {"cur": free.pop(0), "ptr": 0, "written": 0}
    moved = []

    def program(lid):
        blocks[state["cur"]][state["ptr"]] = lid
        where[lid] = (state["cur"], state["ptr"])
        state["ptr"] += 1
        state["written"] += 1

    def need_page():
        while state["ptr"] == P:
            if free:
                state["cur"], state["ptr"] = free.pop(0), 0
                continue
            victim = min((b for b in range(B) if b != state["cur"]), key=lambda b: sum(1 for x in blocks[b] if x not in (None, -1)))
            valid = [x for x in blocks[victim] if x not in (None, -1)]
            moved.append(len(valid))
            blocks[victim] = [None] * P
            free.append(victim)
            for lid in valid:
                need_page()
                program(lid)

    for lid in range(live):
        need_page()
        program(lid)
    state["written"] = 0
    moved.clear()
    for _ in range(writes):
        lid = rnd.randrange(live)
        b, p = where[lid]
        blocks[b][p] = -1
        need_page()
        program(lid)
    return state["written"] / writes, sum(moved) / len(moved), len(moved) / writes


out = {"wa": {}, "moved": {}, "gc_per_write": {}, "text": {}}
for pct in [60, 80, 90, 97]:
    wa, mv, rate = run(pct / 100)
    out["wa"][str(pct)] = round(wa, 3)
    out["moved"][str(pct)] = round(mv, 2)
    out["gc_per_write"][str(pct)] = round(rate, 3)
    one = round(wa, 1)
    out["text"][str(pct)] = (f"{one:.1f}".replace(".", ",").replace(",0", "")) + "×"
    print(f"{pct}% full: {wa:.2f} pages written per page asked for, {mv:.1f} moved a clean-up, {rate:.3f} clean-ups a write")
(Path(__file__).parent / "sim.json").write_text(json.dumps(out, ensure_ascii=False) + "\n")
