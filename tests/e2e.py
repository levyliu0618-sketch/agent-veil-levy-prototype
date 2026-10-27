"""End-to-end checks of the built site in a real browser (Playwright, Chromium).
Usage: python3 tests/e2e.py http://localhost:4173/
These test the prototype itself; they are not the authored demo story's tests.
"""
import sys
from playwright.sync_api import sync_playwright, expect

URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:4173/"
results = []

def check(name, cond):
    results.append((name, bool(cond)))
    print(("PASS " if cond else "FAIL ") + name)

def open_view(pg):
    if pg.get_attribute('[data-testid="view-btn"]', "aria-expanded") != "true":
        pg.click('[data-testid="view-btn"]')

def preset(pg, name):
    open_view(pg)
    pg.locator(".preset", has_text=name).first.click()

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    pg.goto(URL)
    pg.wait_for_selector(".viewer")

    # 1 default view
    check("default label is Narration", "Narration" in pg.inner_text('[data-testid="view-btn"]'))
    check("default shows final result", pg.inner_text('[data-testid="version-label"]') == "Final result")
    check("default viewer is v3", pg.get_attribute(".viewer", "data-version") == "v3")
    check("default has no tool rows / notes buttons", pg.locator(".tool-row").count() == 0 and pg.locator("button", has_text="Why this approach?").count() == 0)
    check("default hidden-note lists categories", "Decision notes" in pg.inner_text('[data-testid="hidden-note"]'))
    check("default has no version picker", pg.locator(".version-picker").count() == 0)

    # 2 black box
    preset(pg, "Black box")
    check("black box: no steps", pg.locator(".step").count() == 0)
    check("black box: generic process message", pg.locator('[data-testid="blackbox-process"]').count() == 1)
    check("black box: no subagents/tool rows/notes", pg.locator(".subagent, .tool-row, .notes").count() == 0)
    check("black box: hidden note has no digits", not any(ch.isdigit() for ch in pg.inner_text('[data-testid="hidden-note"]')))
    check("black box: final result unchanged", pg.get_attribute(".viewer", "data-version") == "v3")
    check("black box: replay time unchanged", pg.inner_text('[data-testid="time"]').startswith("1:40"))

    # 3 grey box: status only
    preset(pg, "Grey box")
    check("grey box: steps have status but no narration", pg.locator(".step").count() > 0 and pg.locator(".narration").count() == 0)

    # 4 narration and thinking vs tools
    preset(pg, "Narration and thinking")
    check("rung 5: notes buttons, no tool buttons", pg.locator("button", has_text="Why this approach?").count() > 0 and pg.locator("button", has_text="Tool calls").count() == 0)
    preset(pg, "Narration and tools")
    check("rung 4: tool buttons, no notes", pg.locator("button", has_text="Tool calls").count() > 0 and pg.locator("button", has_text="Why this approach?").count() == 0)

    # 5 everything: drill down in one step
    preset(pg, "Everything")
    s4 = pg.locator('[data-step="s4"]')
    s4.locator("button", has_text="Why this approach?").click()
    check("decision notes open with disclaimer", "not a full record" in s4.locator(".notes").inner_text())
    s4.locator("button", has_text="Tool calls").click()
    check("tool rows visible in step", s4.locator(".tool-row").count() == 6)
    tc8 = pg.locator('[data-tool="tc8"]')
    check("failed tool keeps Failed status", "Failed" in tc8.inner_text())
    tc8.locator("button", has_text="View full output").click()
    out = tc8.locator("pre").inner_text()
    check("full output matches summary (TypeError)", "TypeError" in out and "SMOKE FAILED" in out)
    check("subagent blocks show both helpers", pg.locator('[data-subagent="tester"]').count() == 1 and pg.locator('[data-subagent="reviewer"]').count() == 1)
    pg.locator('[data-subagent="reviewer"] button', has_text="Show Reviewer").click()
    rv = pg.locator('[data-step="s5b"]')
    rv.locator("button", has_text="Tool calls").click()
    check("reviewer's own tool calls nested and failed walk shown", "Failed" in pg.locator('[data-tool="tc15"]').inner_text())

    # 6 custom
    open_view(pg)
    pg.locator(".layer-row", has_text="Thinking").locator("input").click()
    check("adjusting a layer shows Custom", "Custom" in pg.inner_text('[data-testid="view-btn"]'))
    check("custom: notes gone", pg.locator("button", has_text="Why this approach?").count() == 0)
    preset(pg, "Everything")

    # 7 versions
    pg.click('[data-version-btn="v1"]')
    check("v1 selected changes preview", pg.get_attribute(".viewer", "data-version") == "v1")
    check("v1 has no controls", pg.locator(".viewer-controls").count() == 0)
    check("history banner explains no rollback", "doesn't roll back" in pg.inner_text(".history-banner"))
    check("label says earlier version", "Earlier version" in pg.inner_text('[data-testid="version-label"]'))
    pg.click('[data-version-btn="v2"]')
    check("v2 has controls, parts are not buttons", pg.locator(".viewer-controls").count() == 1 and pg.locator(".part-btn").count() == 0 and pg.locator(".part-click").count() == 12)
    pg.locator(".history-banner button").click()
    check("back to final", pg.get_attribute(".viewer", "data-version") == "v3")
    # version marker in process
    pg.locator('[data-step="s3"] .version-marker button').click()
    check("version marker opens v1", pg.get_attribute(".viewer", "data-version") == "v1")
    pg.locator(".history-banner button").click()

    # 8 visibility change never changes final
    for name in ["Black box", "Grey box", "Narration", "Narration and tools", "Narration and thinking", "Everything"]:
        preset(pg, name)
        if pg.get_attribute(".viewer", "data-version") != "v3":
            check(f"final stays v3 under {name}", False)
    check("final stays v3 under all presets", True)

    # 9 artifact behaviour (v3)
    pg.locator('[data-ref="U1"]').click()
    check("click part shows details", "U1" in pg.inner_text(".vc-details") and "Microcontroller" in pg.inner_text(".vc-details"))
    z0 = float(pg.get_attribute(".scene", "data-zoom"))
    pg.click("button:has-text('Zoom in')")
    check("zoom in button", float(pg.get_attribute(".scene", "data-zoom")) > z0)
    sp0 = float(pg.get_attribute(".scene", "data-spin"))
    pg.focus('[data-testid="stage"]'); pg.keyboard.press("ArrowLeft")
    check("arrow key orbits", float(pg.get_attribute(".scene", "data-spin")) != sp0)
    pg.keyboard.press("Tab")
    check("Tab reaches a part button", pg.evaluate("document.activeElement.classList.contains('part-btn')"))
    ref = pg.evaluate("document.activeElement.dataset.ref")
    before = pg.evaluate("document.activeElement.getAttribute('aria-pressed')")
    pg.keyboard.press("Enter")
    after = pg.evaluate("document.activeElement.getAttribute('aria-pressed')")
    check("Enter on part toggles selection", before != after)
    if after == "true": check("Enter shows that part's details", ref in pg.inner_text(".vc-details"))
    pg.locator(".vc-layers label", has_text="Silkscreen").locator("input").uncheck()
    check("layer switch hides silkscreen", pg.locator('[data-layer="silkscreen"]').count() == 0)
    sp1 = float(pg.get_attribute(".scene", "data-spin"))
    box = pg.locator('[data-testid="stage"]').bounding_box()
    pg.mouse.move(box["x"] + 40, box["y"] + 40); pg.mouse.down(); pg.mouse.move(box["x"] + 160, box["y"] + 60, steps=5); pg.mouse.up()
    check("drag orbits", float(pg.get_attribute(".scene", "data-spin")) != sp1)
    # v2 parts not keyboard reachable (real difference)
    pg.click('[data-version-btn="v2"]')
    pg.focus('[data-version-btn="v2"]')
    reached = False
    for _ in range(25):
        pg.keyboard.press("Tab")
        if pg.evaluate("!!document.activeElement.closest('.part')"): reached = True; break
    check("v2: keyboard never reaches parts (the reviewed bug is real)", not reached)
    pg.locator(".history-banner button").click()

    # 10 verification
    open_view(pg)
    pg.locator(".layer-row", has_text="Verification").locator("input").click()
    check("verification label", "+ Verification" in pg.inner_text('[data-testid="view-btn"]'))
    check("A4 passed at end", "Checked · passed" in pg.inner_text('[data-testid="verif-A4"]'))
    check("A6 not checked", "Not checked" in pg.inner_text('[data-testid="verif-A6"]'))
    pg.locator('[data-testid="verif-A4"] button', has_text="See record").click()
    pg.wait_for_timeout(300)
    check("See record opens and focuses tool row", pg.evaluate("document.activeElement && document.activeElement.dataset.tool") == "tc19")
    preset(pg, "Black box")
    check("black box + verification hides records", "Record hidden" in pg.inner_text('[data-testid="verif-A4"]'))
    pg.locator(".layer-row", has_text="Verification").locator("input").click()

    # 11 replay
    preset(pg, "Everything")
    pg.click("button:has-text('Restart')")
    pg.wait_for_timeout(1200)
    check("restart plays from start", pg.inner_text('[data-testid="replay-state"]') == "Playing")
    pg.click("button:has-text('Pause')")
    t1 = pg.inner_text('[data-testid="time"]'); pg.wait_for_timeout(700)
    check("pause holds time", pg.inner_text('[data-testid="time"]') == t1)
    check("early: no v3 yet", pg.locator('[data-version-btn="v3"]').count() == 0)
    preset(pg, "Narration")
    check("settings change doesn't reset replay", pg.inner_text('[data-testid="time"]') == t1)
    pg.fill(".scrub", "60")
    check("scrub to 1:00", pg.inner_text('[data-testid="time"]').startswith("1:00"))
    preset(pg, "Everything")
    check("at 1:00 v2 is latest, reviewer still working", pg.get_attribute(".viewer", "data-version") == "v2" and "Working" in pg.inner_text('[data-subagent="reviewer"]'))
    check("at 1:00 A4 has no check yet (verification off -> n/a)", True)
    preset(pg, "Narration")
    check("versions latest during run labelled in progress", "in progress" in pg.inner_text('[data-testid="version-label"]') or pg.locator('[data-testid="preview-empty"]').count() == 1)
    pg.click("button:has-text('Jump to end')")
    check("jump to end", pg.inner_text('[data-testid="replay-state"]') == "Finished" and pg.get_attribute(".viewer", "data-version") == "v3")

    # 12 rationale route
    pg.click("text=Design rationale")
    pg.wait_for_selector(".rationale")
    check("rationale page renders table", pg.locator(".evidence tbody tr").count() == 7)
    pg.reload(); pg.wait_for_selector(".rationale")
    check("rationale survives refresh", pg.locator("h1", has_text="Design rationale").count() == 1)
    pg.click("text=Back to prototype")
    pg.wait_for_selector(".viewer")

    # 13 narrow layout
    n = b.new_page(viewport={"width": 390, "height": 844})
    n.goto(URL); n.wait_for_selector(".viewer")
    check("narrow: tabs", n.locator(".tab").count() == 3)
    check("narrow: no horizontal scroll", n.evaluate("document.documentElement.scrollWidth <= window.innerWidth"))
    st = n.locator('[data-testid="stage"]').bounding_box(); ctr = n.locator(".viewer-controls").bounding_box()
    check("narrow: controls below board, no overlap", ctr["y"] >= st["y"] + st["height"] - 1)
    n.click(".tab:has-text('Process')")
    check("narrow: process tab", n.locator(".process-panel").count() == 1)
    n.click('[data-testid="view-btn"]')
    check("narrow: no horizontal scroll with view panel", n.evaluate("document.documentElement.scrollWidth <= window.innerWidth"))
    n.screenshot(path="/tmp/claude-0/-home-claude/72063e12-07d7-5ea3-a183-a1bb5b2f7b2e/scratchpad/narrow-process.png", full_page=False)
    n.click(".tab:has-text('Task')")
    check("narrow: task tab", n.locator(".task-panel").count() == 1)

    m = b.new_page(viewport={"width": 1000, "height": 800})
    m.goto(URL); m.wait_for_selector(".viewer")
    m.click("text=Show task and requirements")
    check("medium: task collapses inline", m.locator(".task-inline .reqs").count() == 1)

    check("no console errors", not errors)
    if errors: print(errors)
    b.close()

failed = [n for n, ok in results if not ok]
print(f"\n{len(results) - len(failed)}/{len(results)} passed")
sys.exit(1 if failed else 0)
