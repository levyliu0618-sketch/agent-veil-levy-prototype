import sys
from playwright.sync_api import sync_playwright
url = sys.argv[1]; out = sys.argv[2]; w = int(sys.argv[3]); h = int(sys.argv[4])
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": w, "height": h})
    errs = []
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(url); pg.wait_for_timeout(800)
    pg.screenshot(path=out)
    print("errors:", errs)
    b.close()
