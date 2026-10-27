// Data model for one recorded (here: authored) agent run.
// Every view is derived from a single RunRecord, so a backend only needs to
// produce this shape. Times are in seconds from the start of the run.

export type AgentId = string;
export type StepId = string;
export type ToolCallId = string;
export type VersionId = string;
export type CriterionId = string;

export interface Agent {
  id: AgentId;
  name: string;            // e.g. "Builder", "Reviewer"
  role: string;            // one short line: what this agent is for
  kind: "main" | "subagent";
}

export interface Criterion {
  id: CriterionId;         // e.g. "A1"
  text: string;            // acceptance requirement, plain language
  howToTry: string;        // how a person can check it in the preview
  tryable: boolean;        // false if it cannot be tried inside this preview
}

export type ToolStatus = "ok" | "failed" | "not_run";

export interface ToolCall {
  id: ToolCallId;
  stepId: StepId;
  agentId: AgentId;
  t: number;               // when the call is visible in the replay
  tool: "Read" | "Write" | "Edit" | "Bash" | "Delegate";
  target: string;          // file or object the tool acted on
  summary: string;         // short line: action + result
  status: ToolStatus;
  command: string;         // full command / input
  output: string;          // full returned text (or error log)
  delegatesTo?: AgentId;   // for Delegate calls
}

export interface Narration {
  terse: string;
  standard: string;
  verbose: string;
}

export interface DecisionNote {
  question: string;        // e.g. "Why CSS 3D instead of WebGL?"
  answer: string;
}

export interface Step {
  id: StepId;
  agentId: AgentId;
  t: number;               // start time
  status: string;          // one-line status (Verbosity: quiet and up)
  narration: Narration;    // commentary (Verbosity: terse / standard / verbose)
  notes: DecisionNote[];   // Thinking layer, shown as "Decision notes"
  parentStepId?: StepId;   // set for steps done by a subagent
  producesVersion?: VersionId;
}

export interface Version {
  id: VersionId;           // "v1" | "v2" | "v3"
  number: number;
  t: number;               // when it was saved
  stepId: StepId;
  title: string;
  changes: string[];       // what changed vs. the previous version
}

export type CheckResult = "passed" | "failed" | "not_checked";

export interface Check {
  id: string;
  criterionId: CriterionId;
  t: number;
  versionId: VersionId;    // version the check ran against
  result: CheckResult;
  toolCallId?: ToolCallId; // the record that backs it (none if not checked)
  note: string;
}

export interface SubagentTask {
  id: string;
  agentId: AgentId;
  delegatedBy: ToolCallId; // the Delegate tool call
  brief: string;
  t: number;
  tDone: number;
  result: string;          // what it returned to the main agent
}

export interface RunRecord {
  id: string;
  task: { title: string; request: string; disclaimer: string };
  duration: number;
  agents: Agent[];
  criteria: Criterion[];
  steps: Step[];
  toolCalls: ToolCall[];
  versions: Version[];
  checks: Check[];
  subagentTasks: SubagentTask[];
  finalVersionId: VersionId;
}
