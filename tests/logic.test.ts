// Automated tests for the PROTOTYPE'S OWN CODE (data consistency + display
// rules). These are real tests run with `node --test`. They are unrelated to
// the "tests" that appear inside the authored demo story.
import { test } from "node:test";
import assert from "node:assert/strict";
import { RUN } from "../src/data/run";
import {
  PRESETS, buildProcess, displayedVersion, matchPreset, settingsFromPreset,
  hiddenCategories, criterionStatuses, type ViewSettings, type StepView,
} from "../src/logic/visibility";

const times = Array.from({ length: RUN.duration + 1 }, (_, i) => i);
const allSettings = (): ViewSettings[] => {
  const out: ViewSettings[] = [];
  for (const verbosity of ["off", "quiet", "terse", "standard", "verbose"] as const)
    for (const thinking of [false, true])
      for (const toolSummary of [false, true])
        for (const toolFull of [false, true])
          for (const subagents of ["off", "summary", "full"] as const)
            for (const versions of ["off", "latest", "all"] as const)
              out.push({ verbosity, thinking, toolSummary, toolFull, subagents, versions, verification: false });
  return out;
};
const flatten = (vs: StepView[]): StepView[] => vs.flatMap((v) => [v, ...flatten(v.subagents.flatMap((s) => s.steps))]);

test("every reference in the run record resolves", () => {
  const stepIds = new Set(RUN.steps.map((s) => s.id));
  const agentIds = new Set(RUN.agents.map((a) => a.id));
  for (const c of RUN.toolCalls) {
    assert.ok(stepIds.has(c.stepId), c.id);
    assert.ok(agentIds.has(c.agentId), c.id);
    const step = RUN.steps.find((s) => s.id === c.stepId)!;
    assert.equal(step.agentId, c.agentId, `${c.id} agent matches its step`);
    assert.ok(c.t >= step.t, `${c.id} happens after its step starts`);
  }
  for (const v of RUN.versions) {
    const step = RUN.steps.find((s) => s.id === v.stepId)!;
    assert.equal(step.producesVersion, v.id);
    assert.ok(v.t >= step.t);
  }
  for (const t of RUN.subagentTasks) {
    const call = RUN.toolCalls.find((c) => c.id === t.delegatedBy)!;
    assert.equal(call.tool, "Delegate");
    assert.equal(call.delegatesTo, t.agentId);
    assert.ok(RUN.steps.some((s) => s.agentId === t.agentId && s.parentStepId === call.stepId));
  }
  assert.ok(RUN.versions.some((v) => v.id === RUN.finalVersionId));
  assert.ok(RUN.versions.length >= 3);
});

test("checks agree with the tool calls that back them", () => {
  for (const k of RUN.checks) {
    const call = RUN.toolCalls.find((c) => c.id === k.toolCallId)!;
    assert.ok(call, k.id);
    assert.ok(k.t >= call.t, `${k.id} not before its record`);
    const expected = { passed: "ok", failed: "failed", not_checked: "not_run" }[k.result];
    assert.equal(call.status, expected, `${k.id} result matches ${call.id} status`);
    const v = RUN.versions.filter((x) => x.t <= k.t).slice(-1)[0];
    assert.equal(v.id, k.versionId, `${k.id} ran against the latest version at that time`);
  }
  const final = criterionStatuses(RUN, RUN.duration);
  assert.deepEqual(final.map((s) => s.latest?.result), ["passed", "passed", "passed", "passed", "passed", "not_checked"]);
});

test("presets are recognised and rung 5 is not rung 4 plus more", () => {
  for (const p of PRESETS) assert.equal(matchPreset(settingsFromPreset(p.id))?.id, p.id);
  const r4 = PRESETS[3].layers, r5 = PRESETS[4].layers;
  assert.equal(r4.toolSummary && !r5.toolSummary, true);
  assert.equal(!r4.thinking && r5.thinking, true);
  assert.equal(matchPreset({ ...settingsFromPreset("narration"), thinking: true, toolSummary: true }), null);
});

test("Black box shows no process at any time, and the final result only at the end", () => {
  const s = settingsFromPreset("black-box");
  for (const t of times) {
    assert.equal(buildProcess(RUN, s, t).length, 0, `t=${t}`);
    const d = displayedVersion(RUN, s, t, null);
    if (t < RUN.duration) assert.equal(d.version, null);
    else assert.equal(d.version?.id, RUN.finalVersionId);
  }
  assert.ok(hiddenCategories(s).every((c) => !/\d/.test(c)), "hidden note has no counts");
});

test("the final result is the same under every visibility setting", () => {
  for (const s of allSettings()) {
    const d = displayedVersion(RUN, s, RUN.duration, null);
    assert.equal(d.version?.id, RUN.finalVersionId);
    assert.equal(d.isFinal, true);
  }
});

test("looking at an older version is marked historical and not final", () => {
  const s = settingsFromPreset("everything");
  const d = displayedVersion(RUN, s, RUN.duration, "v1");
  assert.equal(d.version?.id, "v1");
  assert.equal(d.isHistorical, true);
  assert.equal(d.isFinal, false);
  // a version not yet saved at this time can't be selected
  assert.equal(displayedVersion(RUN, s, 40, "v3").version?.id, "v1");
});

test("no hidden layer leaks through any panel, at any time", () => {
  for (const s of allSettings()) {
    for (const t of [0, 30, 58, 65, 75, RUN.duration]) {
      const all = flatten(buildProcess(RUN, s, t));
      for (const v of all) {
        if (s.verbosity === "off") { assert.equal(v.status, null); assert.equal(v.narration, null); }
        if (s.verbosity === "quiet") assert.equal(v.narration, null);
        if (!s.thinking) assert.equal(v.notes.length, 0);
        if (!s.toolSummary && !s.toolFull) assert.equal(v.tools.length, 0);
        for (const tv of v.tools) {
          assert.equal(tv.showSummary, s.toolSummary);
          assert.equal(tv.showFull, s.toolFull);
          assert.notEqual(tv.call.tool, "Delegate", "delegation belongs to the Subagents layer");
          assert.ok(tv.call.t <= t, "no tool call from the future");
        }
        if (s.subagents === "off") {
          assert.equal(v.subagents.length, 0);
          assert.equal(v.agent.kind, "main");
        }
        if (s.subagents === "summary") v.subagents.forEach((sv) => assert.equal(sv.steps.length, 0));
        if (s.versions !== "all") assert.equal(v.versionMarker, null);
        assert.ok(v.step.t <= t);
      }
    }
  }
});

test("text shown outside the version layer never names a version number", () => {
  const texts: string[] = [];
  for (const st of RUN.steps) texts.push(st.status, st.narration.terse, st.narration.standard, st.narration.verbose, ...st.notes.flatMap((n) => [n.question, n.answer]));
  for (const t of RUN.subagentTasks) texts.push(t.brief, t.result);
  for (const k of RUN.checks) texts.push(k.note);
  for (const c of RUN.toolCalls) texts.push(c.summary);
  for (const x of texts) assert.ok(!/version \d|\bv\d\b/i.test(x), x);
});
