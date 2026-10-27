// Display rules. Pure functions: (record, settings, time) -> what may be shown.
// Keeping these separate from components means the same rules can be tested
// directly and reused when a real backend supplies the RunRecord.

import type { RunRecord, Step, ToolCall, Version, Check, SubagentTask, Agent, CriterionId } from "../data/types";

export type Verbosity = "off" | "quiet" | "terse" | "standard" | "verbose";
export type SubagentLevel = "off" | "summary" | "full";
export type VersionLevel = "off" | "latest" | "all";

export interface Layers {
  verbosity: Verbosity;
  thinking: boolean;
  toolSummary: boolean;
  toolFull: boolean;
  subagents: SubagentLevel;
  versions: VersionLevel;
}

export interface ViewSettings extends Layers {
  verification: boolean; // separate helper, not one of the six layers
}

export const VERBOSITY_LEVELS: Verbosity[] = ["off", "quiet", "terse", "standard", "verbose"];

export interface Preset {
  id: string;
  rung: number;
  name: string;
  shows: string; // plain description
  layers: Layers;
}

// Rungs follow the definitions in Douglas's playground glossary.
// How each rung sets Subagents and Artifact versions is OUR decision
// (the glossary does not define it): rungs 1–5 only include what their
// names say, so both are off; "Everything" turns both fully on.
export const PRESETS: Preset[] = [
  { id: "black-box", rung: 1, name: "Black box", shows: "Final result only.",
    layers: { verbosity: "off", thinking: false, toolSummary: false, toolFull: false, subagents: "off", versions: "off" } },
  { id: "grey-box", rung: 2, name: "Grey box", shows: "One-line status updates, then the result.",
    layers: { verbosity: "quiet", thinking: false, toolSummary: false, toolFull: false, subagents: "off", versions: "off" } },
  { id: "narration", rung: 3, name: "Narration", shows: "Status plus the agent's running commentary.",
    layers: { verbosity: "standard", thinking: false, toolSummary: false, toolFull: false, subagents: "off", versions: "off" } },
  { id: "narration-tools", rung: 4, name: "Narration and tools", shows: "Commentary plus every tool call, its result and full output.",
    layers: { verbosity: "standard", thinking: false, toolSummary: true, toolFull: true, subagents: "off", versions: "off" } },
  { id: "narration-thinking", rung: 5, name: "Narration and thinking", shows: "Commentary plus decision notes, without tool calls.",
    layers: { verbosity: "standard", thinking: true, toolSummary: false, toolFull: false, subagents: "off", versions: "off" } },
  { id: "everything", rung: 6, name: "Everything", shows: "All six kinds of process information.",
    layers: { verbosity: "standard", thinking: true, toolSummary: true, toolFull: true, subagents: "full", versions: "all" } },
];

export const DEFAULT_PRESET_ID = "narration";

export function settingsFromPreset(id: string, verification = false): ViewSettings {
  const p = PRESETS.find((x) => x.id === id) ?? PRESETS[2];
  return { ...p.layers, verification };
}

const LAYER_KEYS: (keyof Layers)[] = ["verbosity", "thinking", "toolSummary", "toolFull", "subagents", "versions"];

export function matchPreset(s: ViewSettings): Preset | null {
  return PRESETS.find((p) => LAYER_KEYS.every((k) => p.layers[k] === s[k])) ?? null;
}

export function viewLabel(s: ViewSettings): string {
  const p = matchPreset(s);
  const base = p ? p.name : "Custom";
  return s.verification ? `${base} + Verification` : base;
}

// Human-readable list of categories hidden in the current view.
// Deliberately lists categories only — never counts — so a reduced view does
// not leak how much work happened.
export function hiddenCategories(s: ViewSettings): string[] {
  const out: string[] = [];
  if (s.verbosity === "off") out.push("Status updates", "Commentary");
  else if (s.verbosity === "quiet") out.push("Commentary");
  if (!s.thinking) out.push("Decision notes");
  if (!s.toolSummary) out.push("Tool calls");
  if (!s.toolFull) out.push("Full tool output");
  if (s.subagents === "off") out.push("Subagents");
  if (s.versions !== "all") out.push("Version history");
  return out;
}

export function narrationText(step: Step, v: Verbosity): string | null {
  if (v === "terse") return step.narration.terse;
  if (v === "standard") return step.narration.standard;
  if (v === "verbose") return step.narration.verbose;
  return null;
}

export interface ToolView {
  call: ToolCall;
  showSummary: boolean; // "Summarized tool calls" layer
  showFull: boolean;    // "Full tool output" layer
}

export interface SubagentView {
  task: SubagentTask;
  agent: Agent;
  done: boolean;
  level: "summary" | "full";
  steps: StepView[]; // only filled at "full"
}

export interface VersionMarker {
  version: Version;
}

export interface StepView {
  step: Step;
  agent: Agent;
  status: string | null;
  narration: string | null;
  notes: Step["notes"];
  tools: ToolView[];
  subagents: SubagentView[];
  versionMarker: VersionMarker | null;
  active: boolean; // most recent visible step of its agent while running
}

function agentOf(run: RunRecord, id: string): Agent {
  return run.agents.find((a) => a.id === id)!;
}

function buildStep(run: RunRecord, s: ViewSettings, time: number, step: Step): StepView {
  const status = s.verbosity === "off" ? null : step.status;
  const narration = narrationText(step, s.verbosity);
  const notes = s.thinking ? step.notes : [];

  // Delegate calls belong to the Subagents layer, not to tool calls.
  // Full output can be on without summaries: rows then show the raw command.
  const tools: ToolView[] = s.toolSummary || s.toolFull
    ? run.toolCalls
        .filter((c) => c.stepId === step.id && c.t <= time && c.tool !== "Delegate")
        .map((call) => ({ call, showSummary: s.toolSummary, showFull: s.toolFull }))
    : [];

  const subagents: SubagentView[] = [];
  if (s.subagents !== "off") {
    for (const task of run.subagentTasks) {
      const call = run.toolCalls.find((c) => c.id === task.delegatedBy)!;
      if (call.stepId !== step.id || task.t > time) continue;
      const childSteps =
        s.subagents === "full"
          ? run.steps
              .filter((cs) => cs.parentStepId === step.id && cs.agentId === task.agentId && cs.t <= time)
              .map((cs) => buildStep(run, s, time, cs))
              .filter(hasContent)
          : [];
      subagents.push({ task, agent: agentOf(run, task.agentId), done: task.tDone <= time, level: s.subagents, steps: childSteps });
    }
  }

  let versionMarker: VersionMarker | null = null;
  if (s.versions === "all" && step.producesVersion) {
    const v = run.versions.find((x) => x.id === step.producesVersion)!;
    if (v.t <= time) versionMarker = { version: v };
  }

  return { step, agent: agentOf(run, step.agentId), status, narration, notes, tools, subagents, versionMarker, active: false };
}

export function hasContent(v: StepView): boolean {
  return Boolean(v.status || v.narration || v.notes.length || v.tools.length || v.subagents.length || v.versionMarker);
}

// Main-agent steps that have something visible at this time.
export function buildProcess(run: RunRecord, s: ViewSettings, time: number): StepView[] {
  const views = run.steps
    .filter((st) => !st.parentStepId && st.t <= time)
    .map((st) => buildStep(run, s, time, st))
    .filter(hasContent);
  if (time < run.duration && views.length) views[views.length - 1].active = true;
  return views;
}

export function versionsUpTo(run: RunRecord, time: number): Version[] {
  return run.versions.filter((v) => v.t <= time);
}

// Which version the preview shows. Hiding history never hides the final
// result: at "off", the final version appears once the run is finished.
export function displayedVersion(
  run: RunRecord,
  s: ViewSettings,
  time: number,
  selected: string | null,
): { version: Version | null; isFinal: boolean; isHistorical: boolean } {
  const finished = time >= run.duration;
  const final = run.versions.find((v) => v.id === run.finalVersionId)!;
  const avail = versionsUpTo(run, time);
  const latest = avail[avail.length - 1] ?? null;
  let version: Version | null;
  if (s.versions === "off") version = finished ? final : null;
  else if (s.versions === "latest") version = latest;
  else version = (selected && avail.find((v) => v.id === selected)) || latest;
  const isFinal = Boolean(version && finished && version.id === final.id);
  const isHistorical = Boolean(version && latest && version.id !== latest.id);
  return { version, isFinal, isHistorical };
}

export interface CriterionStatus {
  criterionId: CriterionId;
  latest: Check | null; // most recent check at this time
}

export function criterionStatuses(run: RunRecord, time: number): CriterionStatus[] {
  return run.criteria.map((c) => {
    const checks = run.checks.filter((k) => k.criterionId === c.id && k.t <= time);
    return { criterionId: c.id, latest: checks[checks.length - 1] ?? null };
  });
}

// The step currently being worked on (for the status line).
export function currentStatus(run: RunRecord, time: number): string {
  if (time >= run.duration) return "Finished";
  const main = run.steps.filter((s) => !s.parentStepId && s.t <= time);
  return main.length ? main[main.length - 1].status : "Starting";
}

export function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
