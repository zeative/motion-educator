// The visual template a film is made in. A template is a look, never a topic: templates/<key>/ holds its lines
// (template.md), its engine settings (template.json) and its type, colours and captions (look.css).
//
//   storyboard.json  { "template": "stickman", ... }
//   const film = await createFilm({ storyboard });   // applies the look before anything is drawn
//   film.look.stage, film.look.palette, film.look.stepped, film.held(t)
//
// A storyboard without "template" gets the house look: the graphite stage, glass, metal type (kit/css/film.css),
// which is also what the four house templates (cutaway, glass, cosmos, micro) are made of.
const HOUSE = {
  key: "house",
  name: "House look",
  stage: "graphite",
  stepped: 0,
  finish: { bloom: 0.34, grain: 5 },
  type: { display: "Sora Variable", body: "Inter Variable", mono: "JetBrains Mono Variable" },
  captions: "house",
  palette: ["#0b0b0c", "#19191b", "#ededf0"],
};

export async function applyLook(storyboard) {
  const key = storyboard?.template;
  if (!key) return { ...HOUSE };
  // films/NAME/index.html sits two folders below the workspace, which holds templates/ beside kit/.
  const base = new URL(`../../templates/${key}/`, location.href);
  const response = await fetch(new URL("template.json", base)).catch(() => null);
  if (!response?.ok) throw new Error(`the storyboard names the template "${key}", but templates/${key}/template.json is missing (node kit/tools/new.mjs copies templates/ into the workspace)`);
  const look = { ...HOUSE, ...(await response.json()) };
  document.documentElement.dataset.look = key;
  if (look.stage !== "graphite") document.documentElement.dataset.flat = "";
  // The template's stylesheet goes after the kit's and before the film's own, so a film can still override it.
  const link = Object.assign(document.createElement("link"), { rel: "stylesheet", href: new URL("look.css", base).href });
  const own = [...document.querySelectorAll('link[rel="stylesheet"]')].find((l) => /(^|\/)film\.css$/.test(l.getAttribute("href")) && !l.href.includes("/kit/"));
  if (own) own.before(link);
  else document.head.append(link);
  await new Promise((ok, fail) => {
    link.onload = ok;
    link.onerror = () => fail(new Error(`templates/${key}/look.css did not load`));
  });
  // Faces declared in a stylesheet load only when something uses them; load the template's now, so frame 0 is right.
  const families = [...new Set([look.type?.display, look.type?.body].filter(Boolean))];
  await Promise.all(families.flatMap((family) => ["400", "700"].map((weight) => document.fonts.load(`${weight} 40px "${family}"`).catch(() => []))));
  return look;
}

// The picture of a stepped template (stop motion, drawings on twos) advances `stepped` times a second and holds in
// between. Every value is drawn from this held time, so a held frame is the same picture, exactly.
export const holder = (stepped) => (stepped > 0 ? (t) => Math.floor(t * stepped + 1e-6) / stepped : (t) => t);
