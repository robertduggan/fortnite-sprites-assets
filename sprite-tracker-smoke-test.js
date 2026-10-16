// Sprite tracker smoke test (jsdom). Expectations are READ FROM THE HTML, so no numbers to edit per release.
// usage: node sprite-tracker-smoke-test.js <tracker.html> <repo_files.txt> [rob.json tro.json]     (-v prints passes too)
//   repo_files.txt = lines like "s4/Honey Sprite.webp" (from the repo tarball); rob/tro.json = live progress files.
const { JSDOM } = require('jsdom'); const fs = require('fs');
const args = process.argv.slice(2).filter(a => a !== '-v'), VERBOSE = process.argv.includes('-v');
const [HTML, FILES, ROBJ, TROJ] = args;
const src = fs.readFileSync(HTML, 'utf8');
const repo = new Set(fs.readFileSync(FILES, 'utf8').split('\n').filter(Boolean));
const real = { rob: ROBJ ? JSON.parse(fs.readFileSync(ROBJ)) : {}, tro: TROJ ? JSON.parse(fs.readFileSync(TROJ)) : {} };
const b64 = o => Buffer.from(JSON.stringify(o), 'utf8').toString('base64');

// ---- read the data out of the HTML ----
const suppressed = (src.match(/SUPPRESSED_VARIANTS = new Set\(\[(.*?)\]\)/)[1].match(/'([^']+)'/g) || []).map(x => x.slice(1, -1));
const ovBlock = src.slice(src.indexOf('const ASSET_OVERRIDES'), src.indexOf('};', src.indexOf('const ASSET_OVERRIDES')));
const overrides = Object.fromEntries([...ovBlock.matchAll(/(\d+):\s*"([^"]+)"/g)].map(m => [m[1], m[2]]));
const variantLists = [...src.matchAll(/variants:\s*\[([^\]]*)\]/g)].map(m => m[1].match(/'([^']+)'/g).map(x => x.slice(1, -1)));
const seasons = {};
['3', '4'].forEach((n, i) => {
  const a = src.indexOf('const SPRITES_S' + n + ' = ['), b = src.indexOf('\n];', a);
  const all = [...src.slice(a, b).matchAll(/\{id:(\d+), name:"([^"]+)", type:"([^"]+)", variant:"([^"]+)"/g)].map(m => ({ id: +m[1], name: m[2], type: m[3], variant: m[4] }));
  seasons['s' + n] = { all, active: all.filter(x => !suppressed.includes(x.variant)), variants: variantLists[i].filter(v => v !== 'All' && !suppressed.includes(v)) };
});

let fails = 0, passes = 0;
const chk = (label, ok, detail = '') => { ok ? passes++ : fails++; if (!ok || VERBOSE) console.log((ok ? 'PASS ' : 'FAIL ') + label + (detail ? '  [' + detail + ']' : '')); };

// ---- A. data checks (no browser) ----
const allIds = [...seasons.s3.all, ...seasons.s4.all].map(x => x.id);
chk('ids unique across both seasons', new Set(allIds).size === allIds.length);
for (const [sk, S] of Object.entries(seasons)) {
  const missing = S.all.filter(x => !repo.has(sk + '/' + (overrides[x.id] || x.name + '.webp'))).map(x => x.name);
  chk(`${sk}: every sprite has its image in the repo (${S.all.length} sprites)`, !missing.length, missing.slice(0, 5).join(', '));
  const unknownVar = S.all.filter(x => !variantLists[sk === 's3' ? 0 : 1].includes(x.variant)).map(x => x.name);
  chk(`${sk}: every sprite's variant is in the filter bar`, !unknownVar.length, unknownVar.slice(0, 5).join(', '));
  const empty = S.variants.filter(v => !S.active.some(x => x.variant === v));
  chk(`${sk}: no filter-bar variant is empty`, !empty.length, empty.join(', '));
  const unused = [...repo].filter(f => f.startsWith(sk + '/')).filter(f => !S.all.some(x => (sk + '/' + (overrides[x.id] || x.name + '.webp')) === f));
  if (VERBOSE || unused.length > 1) console.log(`INFO ${sk}: repo files not used by any sprite: ${unused.join(', ') || 'none'}`);
}

// ---- boot helper ----
function boot(url, withRealData = true) {
  return new Promise(res => {
    const errors = []; let puts = [];
    const dom = new JSDOM(src, {
      runScripts: 'dangerously', resources: 'usable', url, beforeParse(w) {
        const s = {}; w.localStorage = { getItem: k => (k in s ? s[k] : null), setItem: (k, v) => { s[k] = String(v); }, removeItem: k => { delete s[k]; }, clear() { } };
        const server = { rob: real.rob, tro: real.tro };
        w.fetch = async (u, o) => {
          const m = String(u).match(/contents\/progress\/(rob|tro)\.json/);
          if (m && (!o || !o.method || o.method === 'GET')) return withRealData && Object.keys(server[m[1]]).length ? { ok: true, status: 200, json: async () => ({ sha: 's-' + m[1], content: b64(server[m[1]]) }) } : { ok: false, status: 404, json: async () => ({}) };
          if (m && o && o.method === 'PUT') { const body = JSON.parse(o.body); puts.push({ who: m[1], decoded: JSON.parse(Buffer.from(body.content, 'base64').toString('utf8')) }); return { ok: true, status: 200, json: async () => ({ content: { sha: 'new' } }) }; }
          return { ok: false, status: 404, json: async () => ({}) };
        };
        w.addEventListener('error', e => errors.push(e.message)); w.onunhandledrejection = e => errors.push(String(e.reason));
      }
    });
    setTimeout(() => res({ dom, w: dom.window, doc: dom.window.document, errors, puts }), 1500);
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const grp = doc => [...doc.querySelectorAll('.tg')].map(g => ({ title: g.querySelector('.tn').textContent.trim().replace(/^\S+\s/, ''), el: g, ids: [...g.querySelectorAll('.card')].map(c => +c.dataset.id), prog: () => g.querySelector('.tp').textContent.replace(/\u00a0/g, ' ') }));
const fire = (w, el, type) => el.dispatchEvent(new w.Event(type));

(async () => {
  const { w, doc, errors, puts } = await boot('https://x.github.io/r/t.html?me=rob');
  for (const [sk, S] of Object.entries(seasons)) {
    if (sk === 's3') w.switchSeason('s3'); else if (sk === 's4') w.switchSeason('s4');
    const types = [...new Set(S.active.map(x => x.type))], N = S.active.length;
    chk(`${sk}: ${N} cards shown, stats total matches`, doc.querySelectorAll('.card').length === N && doc.getElementById('sTotal').textContent === String(N), doc.querySelectorAll('.card').length + ' cards');
    // by type: group sizes + live header counters for EVERY group (catches the old emoji-width bug class)
    let g = grp(doc);
    chk(`${sk}: by-type groups = ${types.length} types, each with the right card count`, g.length === types.length && g.every(x => x.ids.length === S.active.filter(s => s.type === x.title).length), g.length + ' groups');
    const stale = [];
    for (const x of g) {
      const card = x.el.querySelector('.card'), wasOwned = card.classList.contains('own'), before = +x.prog().match(/Me: (\d+)/)[1];
      card.click(); const after = +x.prog().match(/Me: (\d+)/)[1];
      if (after !== before + (wasOwned ? -1 : 1)) stale.push(x.title);
      x.el.querySelector('.card').click(); // revert (group element persists across toggles)
    }
    chk(`${sk}: clicking a card updates its group counter for every type`, !stale.length, stale.join(', '));
    // by category
    doc.getElementById('groupCatBtn').click(); g = grp(doc);
    const wantCats = S.variants.filter(v => S.active.some(x => x.variant === v));
    chk(`${sk}: by-category groups = variants in filter-bar order`, JSON.stringify(g.map(x => x.title)) === JSON.stringify(wantCats), g.map(x => x.title).join(' | '));
    chk(`${sk}: by-category counts add up, every sprite under its own category`, g.reduce((n, x) => n + x.ids.length, 0) === N && g.every(x => x.ids.every(id => S.active.find(s => s.id === id).variant === x.title)));
    doc.getElementById('groupCatBtn').click();
    // variant pills
    const bad = [];
    for (const b of [...doc.querySelectorAll('#varPills .pill')].filter(b => b.textContent !== 'All')) {
      b.click(); const n = doc.querySelectorAll('.card').length, want = S.active.filter(s => s.variant === b.textContent).length;
      if (n !== want) bad.push(`${b.textContent}:${n}/${want}`);
    }
    [...doc.querySelectorAll('#varPills .pill')].find(b => b.textContent === 'All').click();
    chk(`${sk}: each variant filter shows exactly its sprites`, !bad.length, bad.join(', '));
    // search by type name finds every sprite of that type
    const si = doc.getElementById('srch'), miss = [];
    for (const t of types) { si.value = t; fire(w, si, 'input'); const shown = new Set([...doc.querySelectorAll('.card')].map(c => +c.dataset.id)); if (!S.active.filter(s => s.type === t).every(s => shown.has(s.id))) miss.push(t); }
    si.value = ''; fire(w, si, 'input');
    chk(`${sk}: searching each type name finds all of its sprites`, !miss.length, miss.join(', '));
  }
  w.switchSeason('s4');

  // C. save round trip: payload keeps every sprite key, preserves existing progress, adds only the toggled one
  const S4 = seasons.s4, own = id => !!(real.rob.s4 && real.rob.s4[id] && real.rob.s4[id].owned);
  const pick = S4.active.find(s => !own(s.id));
  if (pick) {
    w.localStorage.setItem('fnSprites_ghToken_rob', 'fake');
    doc.querySelector(`.card[data-id="${pick.id}"]`).click(); await sleep(3300);
    const put = puts.find(p => p.who === 'rob');
    chk('save: a PUT for rob.json fired', !!put);
    if (put) {
      chk('save: payload has a key for every sprite in both seasons', Object.keys(put.decoded.s4).length === S4.active.length && Object.keys(put.decoded.s3).length === seasons.s3.active.length);
      const owned4 = Object.entries(put.decoded.s4).filter(([k, v]) => v.owned).map(([k]) => +k).sort((a, b) => a - b);
      const want = [...S4.active.filter(s => own(s.id)).map(s => s.id), pick.id].sort((a, b) => a - b);
      chk(`save: owned set = previous owned + "${pick.name}" (nothing lost)`, JSON.stringify(owned4) === JSON.stringify(want), owned4.length + ' owned');
      const o3 = Object.entries(put.decoded.s3).filter(([k, v]) => v.owned).length, w3 = Object.values(real.rob.s3 || {}).filter(v => v.owned).length;
      chk('save: season 3 progress unchanged', o3 === w3, o3 + ' vs ' + w3);
    }
  }
  // D. profile defaults
  const plain = await boot('https://x.github.io/r/t.html'), rob = await boot('https://x.github.io/r/t.html?me=rob');
  chk('default profile: plain link = Tro, ?me=rob = Rob', plain.doc.body.dataset.profile === 'tro' && rob.doc.body.dataset.profile === 'rob');
  chk('zero runtime errors', !errors.length && !plain.errors.length && !rob.errors.length, errors.concat(plain.errors, rob.errors).join(';').slice(0, 200));
  console.log(`\n${fails ? 'FAILED' : 'ALL PASS'}: ${passes} passed, ${fails} failed`); process.exit(fails ? 1 : 0);
})();
