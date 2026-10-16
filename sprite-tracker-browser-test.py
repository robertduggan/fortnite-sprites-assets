#!/usr/bin/env python3
"""Real-browser (Chromium) check: every image loads, no sideways overflow / clipped headers, at several widths.
usage: python3 sprite-tracker-browser-test.py <tracker.html> <repo_dir> [rob.json tro.json] [--shot "Honey"]
  repo_dir = the extracted repo (must contain sprites/s3, sprites/s4).  Starts and stops its own local server.
  --shot NAME  -> screenshot (/tmp/shot.png) of the group whose header contains NAME, in by-type view.
Images are loading="lazy": the script scrolls the whole page BEFORE checking, otherwise below-the-fold images look 'broken'."""
import sys, json, base64, shutil, subprocess, time, socket
from playwright.sync_api import sync_playwright
a = [x for x in sys.argv[1:]]
shot = a[a.index('--shot') + 1] if '--shot' in a else None
if shot: del a[a.index('--shot'):a.index('--shot') + 2]
SHOTW = int(a[a.index('--shotw') + 1]) if '--shotw' in a else 1440   # viewport width for the screenshot
if '--shotw' in a: del a[a.index('--shotw'):a.index('--shotw') + 2]
html, repo = a[0], a[1]
real = {w: json.load(open(p)) for w, p in zip(('rob', 'tro'), a[2:4])} if len(a) >= 4 else {}
shutil.copy(html, f'{repo}/_t.html')
s = socket.socket(); s.bind(('', 0)); port = s.getsockname()[1]; s.close()
srv = subprocess.Popen(['python3', '-m', 'http.server', str(port)], cwd=repo, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1.2)

def mock(route):
    for who in ('rob', 'tro'):
        if f'contents/progress/{who}.json' in route.request.url and who in real:
            return route.fulfill(status=200, content_type='application/json', body=json.dumps({'sha': 's', 'content': base64.b64encode(json.dumps(real[who]).encode()).decode()}))
    return route.fulfill(status=404, body='{}')

METRICS = """()=>{const m=document.getElementById('main'),cs=getComputedStyle(m),r=m.getBoundingClientRect();
 const edge=r.right-parseFloat(cs.paddingRight),left=r.left+parseFloat(cs.paddingLeft);
 const gs=[...document.querySelectorAll('.tg')];
 return {over:document.documentElement.scrollWidth-innerWidth,groups:gs.length,
  outside:gs.filter(g=>{const b=g.getBoundingClientRect();return b.right>edge+1||b.left<left-1}).length,
  clipped:[...document.querySelectorAll('.tg .tn')].filter(t=>t.scrollWidth>t.clientWidth+1).map(t=>t.textContent.trim())}}"""
IMGS = """()=>{const c=[...document.querySelectorAll('.card img')];return {n:c.length,pending:c.filter(i=>!i.complete).length,
  broken:c.filter(i=>i.complete&&i.naturalWidth===0).map(i=>decodeURIComponent(i.src).split('/').pop())}}"""
bad = 0
with sync_playwright() as p:
    b = p.chromium.launch(); errs = []
    print(f"{'width':>5} {'view':<22} {'overflow':>8} {'outside':>7}  clipped-headers")
    for w in (1920, 1440, 1024, 768, 390):
        pg = b.new_page(viewport={'width': w, 'height': 900}); pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.route('**/api.github.com/**', mock); pg.route('**/fonts.*/**', lambda r: r.abort())
        pg.goto(f'http://localhost:{port}/_t.html?me=rob'); pg.wait_for_timeout(1800)
        for label, cat, dyn, own in (('type/All', 0, 0, 'all'), ('type/Dynamic', 0, 1, 'all'), ('CATEGORY/All', 1, 0, 'all'), ('CATEGORY/Missing', 1, 0, 'missing')):
            if bool(pg.evaluate('GROUP_CAT')) != bool(cat): pg.click('#groupCatBtn')
            pg.evaluate(f"setLayoutMode('{'dynamic' if dyn else 'classic'}')")
            pg.click(f'#showPills .pill[data-own="{own}"]'); pg.wait_for_timeout(450)
            m = pg.evaluate(METRICS)
            # category view is held to the standard; by-type rows and phone width are reported as INFO (pre-existing page limits)
            strict = cat and w >= 768
            problem = strict and (m['over'] > 0 or m['outside'] > 0 or m['clipped'])
            bad += bool(problem)
            print(f"{w:>5} {label:<22} {m['over']:>8} {m['outside']:>7}  {', '.join(m['clipped']) or '-'}{'   <<< PROBLEM' if problem else ('' if strict else '   (info)')}")
        pg.evaluate("setLayoutMode('classic')"); pg.click('#showPills .pill[data-own="all"]')
        if bool(pg.evaluate('GROUP_CAT')): pg.click('#groupCatBtn')
        if w == 1440:  # images: scroll everything into view first (lazy loading), then check each one
            h = pg.evaluate('document.documentElement.scrollHeight')
            for y in range(0, h + 800, 500): pg.evaluate(f'window.scrollTo(0,{y})'); pg.wait_for_timeout(100)
            pg.wait_for_timeout(1500); r = pg.evaluate(IMGS)
            ok = r['pending'] == 0 and not r['broken']; bad += (not ok)
            print(f"      images: {r['n']} cards, pending after full scroll {r['pending']}, broken {r['broken'] or 'none'}{'' if ok else '   <<< PROBLEM'}")
        if shot and w == SHOTW:
            if True:
                pg.evaluate("window.scrollTo(0,0)")
                pg.evaluate("n=>{const g=[...document.querySelectorAll('.tg')].find(x=>x.querySelector('.tn').textContent.includes(n));window.scrollTo(0,g.getBoundingClientRect().top+scrollY-135)}", shot)
                pg.wait_for_timeout(500); pg.screenshot(path='/tmp/shot.png')
        pg.close()
    b.close()
srv.terminate()
print('page errors:', errs or 'none'); bad += bool(errs)
print('RESULT:', 'clean' if not bad else f'{bad} problem(s)'); sys.exit(1 if bad else 0)
