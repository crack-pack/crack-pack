// Builds a self-contained, throw-away pack-opening web page (web/pack.html).
// Embeds sheets.json + a faithful JS port of the collation engine, and verifies
// the port matches the TypeScript engine's known seed-42 output before writing.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const SHEETS = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/sets/alpha/sheets.json'), 'utf8'));

// --- Engine port (kept in lockstep with src/; see collation/striped.ts, assembler.ts) ---
// Defined as a string so the SAME code is both parity-checked here and shipped
// into the HTML.
const ENGINE_JS = `
const CYCLE = [2, 3, 4, 5];
const LAYOUTS = {
  booster: [ ['common', 11], ['uncommon', 3], ['rare', 1] ],   // 15-card booster
  starter: [ ['common', 45], ['uncommon', 13], ['rare', 2] ],  // 60-card starter deck
};
const LAYOUT = LAYOUTS.booster;
const LAND = /^(Plains|Island|Swamp|Mountain|Forest) \\(([A-Z])\\)$/;
const mod = (n, m) => ((n % m) + m) % m;

function makeRng(seed) {
  let a = seed >>> 0;
  const nextFloat = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { nextFloat, int: (mn, mx) => mn + Math.floor(nextFloat() * (mx - mn + 1)) };
}
function parseCell(raw) {
  const m = LAND.exec(raw);
  if (!m) return { name: raw, isBasicLand: false };
  const v = m[2];
  return (v === 'A' || v === 'B') ? { name: m[1], isBasicLand: true, variant: v } : { name: m[1], isBasicLand: true };
}
function grid(sheet) { return SHEETS[sheet].map((row) => row.map(parseCell)); }
function cyclicWidths(cycle) { let i = 0; return () => cycle[i++ % cycle.length]; }
function stripedWalk(g, nextWidth) {
  const rows = g.length, cols = g[0].length;
  let bandStartRow = rows - 1, col = cols - 1, k = 0, width = nextWidth();
  let stripeIndex = 0, pos = 0;
  return () => {
    const row = mod(bandStartRow - k, rows);
    const out = { card: g[row][col], col: col + 1, row: row + 1, stripeIndex, width, pos };
    pos += 1; k += 1;
    if (k >= width) { k = 0; col -= 1; if (col < 0) { col = cols - 1; bandStartRow = mod(bandStartRow - width, rows); width = nextWidth(); stripeIndex += 1; } }
    return out;
  };
}
function stripedPeriod(cycle, rows, cols) {
  let bandStartRow = rows - 1, stripeIdx = 0, cards = 0;
  for (let guard = 0; guard < 1000000; guard++) {
    const w = cycle[stripeIdx % cycle.length];
    cards += cols * w; bandStartRow = mod(bandStartRow - w, rows); stripeIdx += 1;
    if (bandStartRow === rows - 1 && stripeIdx % cycle.length === 0) return cards;
  }
  return cards;
}
function assemble(count, startIndex, layout) {
  layout = layout || LAYOUTS.booster;
  const perPack = new Map(); for (const [s, n] of layout) perPack.set(s, (perPack.get(s) || 0) + n);
  const period = stripedPeriod(CYCLE, 11, 11);
  const N = ((startIndex % period) + period) % period;
  const streams = new Map(); const starts = [];
  for (const [sheet] of layout) {
    if (streams.has(sheet)) continue;
    const next = stripedWalk(grid(sheet), cyclicWidths(CYCLE));
    const group = perPack.get(sheet);
    const skip = group * N; // all sheets share the unit index N (phase-locked)
    for (let i = 0; i < skip; i++) next();
    streams.set(sheet, next);
    starts.push({ sheet, group, period, skip });
  }
  const packs = [];
  for (let p = 0; p < count; p++) {
    const pack = [];
    for (const [sheet, n] of layout) {
      const next = streams.get(sheet);
      for (let i = 0; i < n; i++) {
        const e = next();
        pack.push({ name: e.card.name, isBasicLand: e.card.isBasicLand, variant: e.card.variant, fromSheet: sheet, pos: e.pos, col: e.col, row: e.row, stripeIndex: e.stripeIndex, width: e.width });
      }
    }
    packs.push(pack);
  }
  return { packs, starts, startPack: N, period };
}
function openPacks(count, startIndex) { return assemble(count, startIndex, LAYOUTS.booster).packs; }
function label(c) { return c.isBasicLand && c.variant ? c.name + ' (' + c.variant + ')' : c.name; }
`;

// --- Parity check against the TS engine's known seed-42 output ---
const factory = new Function('SHEETS', ENGINE_JS + '\nreturn { openPacks, label };');
const { openPacks, label } = factory(SHEETS);
const pack = openPacks(1, 0)[0]; // the canonical first-ever pack
const got = { common: [], uncommon: [], rare: [] };
for (const c of pack) got[c.fromSheet].push(label(c));

const EXPECTED = {
  common: ['Island (B)', 'Stone Rain', 'Flight', 'Gray Ogre', 'Psychic Venom', 'Mountain (A)', 'Island (A)', 'Earthbind', 'Circle of Protection: Green', 'Weakness', 'Plains (A)'],
  uncommon: ['Psionic Blast', 'Goblin Balloon Brigade', 'Phantasmal Forces'],
  rare: ['Timetwister'],
};
const same = JSON.stringify(got) === JSON.stringify(EXPECTED);
if (!same) {
  console.error('❌ PARITY FAILED — web engine does not reproduce the canonical first-ever pack (pack 0)');
  console.error('got     :', JSON.stringify(got));
  console.error('expected:', JSON.stringify(EXPECTED));
  process.exit(1);
}
console.log('✅ Parity confirmed — web engine reproduces the canonical first-ever pack (pack 0).');

// --- Fetch a name -> CDN image URL map once, at build time ---
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(url, tries = 6) {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': 'crackpack/0.1 (pack collation demo)', 'Accept': 'application/json' } });
    if (r.status === 429) { await sleep(1500 * (i + 1)); continue; }
    if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + url);
    return r.json();
  }
  throw new Error('rate-limited after retries: ' + url);
}
async function fetchLeaImages() {
  const cacheFile = path.join(ROOT, 'web/.img-cache.json');
  if (fs.existsSync(cacheFile)) {
    console.log('Using cached image map (web/.img-cache.json).');
    return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  }
  const map = {};
  let url = 'https://api.scryfall.com/cards/search?q=set%3Alea&unique=prints&order=set';
  for (let page = 0; page < 6 && url; page++) {
    const data = await getJson(url);
    for (const c of data.data) {
      const img = c.image_uris && (c.image_uris.normal || c.image_uris.large || c.image_uris.small);
      if (img && !map[c.name]) map[c.name] = img; // base name -> first printing's image
    }
    url = data.has_more ? data.next_page : null;
    if (url) await sleep(150);
  }
  fs.mkdirSync(path.join(ROOT, 'web'), { recursive: true });
  fs.writeFileSync(cacheFile, JSON.stringify(map));
  return map;
}
const IMG_MAP = await fetchLeaImages();
console.log('Fetched ' + Object.keys(IMG_MAP).length + ' card images from Scryfall.');

// --- Emit the HTML ---
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>crackpack — Alpha pack opener</title>
<style>
  :root { --bg:#0e0f13; --panel:#171922; --ink:#eef1f7; --muted:#9aa3b2;
          --common:#c9ccd6; --uncommon:#9fb6d6; --rare:#e6b455; --line:#262a36; }
  * { box-sizing:border-box; }
  body { margin:0; background:radial-gradient(1200px 600px at 50% -10%, #1c2030, var(--bg)); color:var(--ink);
         font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
  header { padding:28px 20px 8px; text-align:center; }
  h1 { margin:0; font-size:22px; letter-spacing:.5px; }
  h1 span { color:var(--rare); }
  .sub { color:var(--muted); font-size:13px; margin-top:4px; }
  .controls { display:flex; gap:10px; justify-content:center; align-items:center; flex-wrap:wrap; padding:16px; }
  input { background:var(--panel); border:1px solid var(--line); color:var(--ink); border-radius:8px; padding:9px 11px; width:120px; }
  button { background:var(--rare); color:#241a06; border:0; border-radius:8px; padding:10px 16px; font-weight:700; cursor:pointer; }
  button.ghost { background:var(--panel); color:var(--ink); border:1px solid var(--line); }
  button:active { transform:translateY(1px); }
  .meta { text-align:center; color:var(--muted); font-size:12px; min-height:18px; }
  .pack { max-width:1100px; margin:8px auto 32px; padding:0 16px; }
  .group-label { color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:.14em; margin:18px 0 8px; border-bottom:1px solid var(--line); padding-bottom:6px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:12px; }
  .card { position:relative; aspect-ratio:5/7; border-radius:11px; overflow:hidden; background:var(--panel);
          border:1px solid var(--line); box-shadow:0 6px 18px rgba(0,0,0,.35); animation:pop .28s ease both; }
  .card img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block; z-index:1; }
  .card .fallback { position:absolute; inset:0; z-index:0; display:flex; align-items:center; justify-content:center; text-align:center;
                    padding:10px; font-weight:600; color:var(--ink); background:linear-gradient(160deg,#20232f,#12141c); }
  .card.rare { box-shadow:0 0 0 1px var(--rare), 0 8px 26px rgba(230,180,85,.28); }
  .name { position:absolute; bottom:0; left:0; right:0; z-index:2; padding:6px 8px; font-size:12px; background:linear-gradient(transparent,rgba(0,0,0,.82)); }
  .land-pill { font-size:10px; color:var(--muted); }
  @keyframes pop { from { opacity:0; transform:translateY(8px) scale(.98); } to { opacity:1; transform:none; } }
  .dbg { position:absolute; top:8px; left:6px; right:6px; z-index:4; display:none;
         font:10px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace; background:rgba(6,8,14,.86); color:#bfe0ff;
         padding:5px 7px; border-radius:6px; border:1px solid rgba(120,160,220,.4); }
  body.debug-on .dbg { display:block; }
  #dbgpanel { display:none; max-width:1100px; margin:4px auto 0; padding:0 16px; }
  body.debug-on #dbgpanel { display:block; }
  .dbgcard { background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:11px 13px;
             font:12px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace; color:var(--muted); }
  .dbgcard b { color:var(--ink); }
  button.on { background:var(--rare); color:#241a06; }
  .boxpack { max-width:1100px; margin:14px auto 0; padding:10px 16px; }
  .boxhead { display:flex; align-items:baseline; gap:10px; margin-bottom:7px; }
  .boxhead .pn { color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:.12em; }
  .boxhead .rarename { color:var(--rare); font-weight:700; font-size:13px; }
  .boxrow { display:grid; grid-template-columns:repeat(15,1fr); gap:5px; }
  .mini { position:relative; aspect-ratio:5/7; border-radius:5px; overflow:hidden; background:var(--panel); border:1px solid var(--line); }
  .mini img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
  .mini.common { box-shadow:inset 0 2px 0 var(--common); } .mini.uncommon { box-shadow:inset 0 2px 0 var(--uncommon); } .mini.rare { box-shadow:inset 0 0 0 1px var(--rare); }
  @media (max-width:720px){ .boxrow { grid-template-columns:repeat(8,1fr); } }
  footer { text-align:center; color:var(--muted); font-size:11px; padding:0 16px 30px; }
  a { color:var(--muted); }
</style>
</head>
<body>
  <header>
    <h1><span>crackpack</span> · Limited Edition Alpha</h1>
    <div class="sub">Deterministic striped collation — stripe cycle 2,3,4,5 · packs cut pack-aligned from the print sheets</div>
  </header>
  <div class="controls">
    <button id="m_pack" class="ghost on">Booster pack</button>
    <button id="m_box" class="ghost">Booster box (36)</button>
    <button id="m_starter" class="ghost">Starter deck (60)</button>
    <button id="m_starterbox" class="ghost">Starter box (10)</button>
  </div>
  <div class="controls">
    <button id="first" class="ghost">⏮ First</button>
    <button id="prev" class="ghost">‹ Prev</button>
    <label style="color:var(--muted);font-size:13px"><span id="pnlabel">pack&nbsp;#</span><input id="packno" type="number" min="0" value="0" /></label>
    <button id="next" class="ghost">Next ›</button>
    <button id="random">Random</button>
    <button id="debug" class="ghost">Debug</button>
  </div>
  <div class="meta" id="meta"></div>
  <div id="dbgpanel"></div>
  <div class="pack" id="pack"></div>
  <footer>
    A <b>crackpack</b> demo. Card images &amp; data via <a href="https://scryfall.com" target="_blank" rel="noopener">Scryfall</a>;
    Magic: The Gathering is © Wizards of the Coast. Collation model from <a href="https://www.lethe.xyz/mtg/collation/" target="_blank" rel="noopener">The Collation Project</a>.
  </footer>

<script>
const SHEETS = ${JSON.stringify(SHEETS)};
${ENGINE_JS}

const SLOTS = [['common','Commons'],['uncommon','Uncommons'],['rare','Rare']];
const IMG_MAP = ${JSON.stringify(IMG_MAP)};

const NAMES = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare' };

function buildDebugPanel(result, kind) {
  const N = result.startPack;
  const rows = result.starts.map((s) =>
    '<b>' + s.sheet + '</b> — start @ card ' + s.skip + ' (= ' + s.group + ' × ' + kind.toLowerCase() + ' ' + N +
    ') · period ' + s.period + ' cards (' + (s.period / 121) + ' sheets)'
  ).join('<br>');
  document.getElementById('dbgpanel').innerHTML =
    '<div class="dbgcard"><b>' + kind + ' #</b> ' + N + ' of ' + result.period + ' distinct · <b>stripe cycle</b> 2,3,4,5 · position 1 = (col 11, row 11)<br>' +
    rows + '<br><span style="opacity:.8">card overlay = #streamPos · col,row on sheet · stripe# (width)</span></div>';
}

function renderUnit(result, kind) {
  const pack = result.packs[0], N = result.startPack;
  const root = document.getElementById('pack');
  root.innerHTML = '';
  const ranges = result.starts.map((s) => s.sheet + ' ' + s.skip + '–' + (s.skip + s.group - 1)).join(', ');
  document.getElementById('meta').textContent =
    kind + ' #' + N + ' of ' + result.period + ' · positions: ' + ranges + ' · basic lands are sheet filler';
  buildDebugPanel(result, kind);
  for (const slot of ['common', 'uncommon', 'rare']) {
    const cards = pack.filter((c) => c.fromSheet === slot);
    const title = NAMES[slot] + (cards.length === 1 ? '' : 's');
    const h = document.createElement('div'); h.className = 'group-label'; h.textContent = title + ' · ' + cards.length;
    root.appendChild(h);
    const g = document.createElement('div'); g.className = 'grid'; root.appendChild(g);
    for (const c of cards) {
      const card = document.createElement('div'); card.className = 'card ' + slot;
      const fb = document.createElement('div'); fb.className = 'fallback'; fb.textContent = label(c); card.appendChild(fb);
      const url = IMG_MAP[c.name];
      if (url) {
        const img = document.createElement('img'); img.alt = label(c); img.loading = 'lazy';
        img.onerror = () => { img.remove(); }; // fall back to the name plate underneath
        img.src = url;
        card.appendChild(img);
      }
      const dbg = document.createElement('div'); dbg.className = 'dbg';
      dbg.innerHTML = 'pos ' + (c.pos + 1) + ' · col ' + c.col + ', row ' + c.row + '<br>stripe ' + c.stripeIndex + ' · width ' + c.width;
      card.appendChild(dbg);
      const nm = document.createElement('div'); nm.className = 'name';
      nm.innerHTML = label(c) + (c.isBasicLand ? ' <span class="land-pill">land</span>' : '');
      card.appendChild(nm);
      g.appendChild(card);
    }
  }
}

const PERIOD = stripedPeriod(CYCLE, 11, 11); // 1694-card walk period
function gcd(a, b) { while (b) { const t = b; b = a % b; a = t; } return a; }
function lcm(a, b) { return a / gcd(a, b) * b; }
function unitCount(layout) { let l = 1; for (const [, n] of layout) l = lcm(l, PERIOD / gcd(PERIOD, n)); return l; }

const MODES = {
  pack:       { layout: LAYOUTS.booster, box: 1,  unit: 'Booster pack', boxLabel: '' },
  box:        { layout: LAYOUTS.booster, box: 36, unit: 'Booster pack', boxLabel: 'Booster box' },
  starter:    { layout: LAYOUTS.starter, box: 1,  unit: 'Starter deck', boxLabel: '' },
  starterbox: { layout: LAYOUTS.starter, box: 10, unit: 'Starter deck', boxLabel: 'Starter box' },
};
function rangeFor(m) {
  const cfg = MODES[m];
  const units = unitCount(cfg.layout);
  return cfg.box === 1 ? units : units / gcd(units, cfg.box);
}

let mode = 'pack', current = 0;

function renderBox(cfg, boxNum) {
  const units = unitCount(cfg.layout);
  const start = (cfg.box * boxNum) % units;
  const { packs } = assemble(cfg.box, start, cfg.layout);
  const boxes = units / gcd(units, cfg.box);
  const cardsPer = cfg.layout.reduce((a, kv) => a + kv[1], 0);
  const root = document.getElementById('pack'); root.innerHTML = '';
  document.getElementById('meta').textContent =
    cfg.boxLabel + ' #' + boxNum + ' of ' + boxes + ' · ' + cfg.box + ' ' + cfg.unit.toLowerCase() + 's (#' + start + '–#' + ((start + cfg.box - 1) % units) + ') · ' + (cfg.box * cardsPer) + ' cards';
  document.getElementById('dbgpanel').innerHTML =
    '<div class="dbgcard"><b>' + cfg.boxLabel + ' #</b> ' + boxNum + ' = ' + cfg.unit.toLowerCase() + ' indices ' + start + '…' + (start + cfg.box - 1) +
    ' (' + cfg.box + ' consecutive units; box b = units ' + cfg.box + 'b…' + cfg.box + 'b+' + (cfg.box - 1) + ')</div>';
  packs.forEach((pack, i) => {
    const uIndex = (start + i) % units;
    const block = document.createElement('div'); block.className = 'boxpack';
    const head = document.createElement('div'); head.className = 'boxhead';
    const rares = pack.filter((c) => c.fromSheet === 'rare').map(label).join(', ');
    head.innerHTML = '<span class="pn">' + cfg.unit + ' #' + uIndex + '</span> <span class="rarename">' + rares + '</span>';
    block.appendChild(head);
    const row = document.createElement('div'); row.className = 'boxrow';
    for (const c of pack) {
      const mini = document.createElement('div'); mini.className = 'mini ' + c.fromSheet; mini.title = label(c);
      const url = IMG_MAP[c.name];
      if (url) { const img = document.createElement('img'); img.loading = 'lazy'; img.alt = label(c); img.onerror = () => img.remove(); img.src = url.replace('/normal/', '/small/'); mini.appendChild(img); }
      row.appendChild(mini);
    }
    block.appendChild(row);
    root.appendChild(block);
  });
}

function render() {
  const cfg = MODES[mode];
  if (cfg.box === 1) renderUnit(assemble(1, current, cfg.layout), cfg.unit);
  else renderBox(cfg, current);
}
function show(n) {
  const span = rangeFor(mode);
  current = ((n % span) + span) % span;
  document.getElementById('packno').value = current;
  render();
}
const LABELS = { pack: 'pack', box: 'box', starter: 'deck', starterbox: 'box' };
function setMode(m) {
  mode = m;
  for (const id of ['m_pack', 'm_box', 'm_starter', 'm_starterbox']) document.getElementById(id).classList.toggle('on', id === 'm_' + m);
  document.getElementById('pnlabel').innerHTML = LABELS[m] + '&nbsp;#';
  show(0);
}
document.getElementById('m_pack').onclick = () => setMode('pack');
document.getElementById('m_box').onclick = () => setMode('box');
document.getElementById('m_starter').onclick = () => setMode('starter');
document.getElementById('m_starterbox').onclick = () => setMode('starterbox');
document.getElementById('first').onclick = () => show(0);
document.getElementById('prev').onclick = () => show(current - 1);
document.getElementById('next').onclick = () => show(current + 1);
document.getElementById('random').onclick = () => show(Math.floor(Math.random() * rangeFor(mode)));
document.getElementById('packno').onchange = (e) => show(Number(e.target.value) || 0);
document.getElementById('debug').onclick = (e) => {
  const on = document.body.classList.toggle('debug-on');
  e.target.classList.toggle('on', on);
};
show(0); // first paint = the first-ever Alpha booster pack
</script>
</body>
</html>
`;

fs.mkdirSync(path.join(ROOT, 'web'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'web/pack.html'), html);
fs.writeFileSync(path.join(ROOT, 'web/index.html'), html); // clean root URL when hosted
console.log('Wrote web/pack.html + web/index.html (' + (html.length / 1024).toFixed(0) + ' KB each)');
