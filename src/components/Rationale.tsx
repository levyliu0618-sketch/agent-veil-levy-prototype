import React from "react";
import { PRESETS } from "../logic/visibility";

type Kind = "Empirical study" | "Interview / design framework" | "Product precedent" | "Prototype precedent" | "Our assumption";

interface Src { id: string; title: string; url: string; kind: Kind; checked: string }

const SOURCES: Src[] = [
  { id: "R1", kind: "Empirical study", url: "https://arxiv.org/abs/2602.07283",
    title: "Mapping the Design Space of User Experience for Computer Use Agents (IUI 2026)",
    checked: "Abstract read on arXiv, 27 Oct 2026." },
  { id: "R2", kind: "Empirical study", url: "https://arxiv.org/abs/2605.25856",
    title: "Explaining Too Much? Understanding How LLM Reasoning Traces Influence Performance and Metacognition",
    checked: "Abstract read on arXiv, 27 Oct 2026." },
  { id: "R3", kind: "Interview / design framework", url: "https://arxiv.org/abs/2001.02478",
    title: "Questioning the AI: Informing Design Practices for Explainable AI User Experiences (CHI 2020)",
    checked: "Abstract read on arXiv, 27 Oct 2026." },
  { id: "R4", kind: "Empirical study", url: "https://arxiv.org/abs/2110.01691",
    title: "AI Chains: Transparent and Controllable Human-AI Interaction by Chaining LLM Prompts (CHI 2022)",
    checked: "Abstract read on arXiv, 27 Oct 2026." },
  { id: "R5", kind: "Empirical study", url: "https://doi.org/10.1145/3772318.3791157",
    title: "Sensemaking in Multi-Agent LLM Interfaces: How Users Interpret Transparency and Trustworthiness Cues (CHI 2026)",
    checked: "Not re-opened in this session; summary from the team's checked notes. PDF: saumyapareek.com/papers/chi26a.pdf" },
  { id: "R6", kind: "Product precedent", url: "https://support.claude.com/en/articles/17153992-what-are-artifacts-and-how-do-i-use-them",
    title: "Claude Help Center: What are artifacts and how do I use them?",
    checked: "Read 27 Oct 2026. The older support.anthropic.com link now redirects here." },
  { id: "R7", kind: "Empirical study", url: "https://arxiv.org/abs/2511.04050",
    title: "Revealing AI Reasoning Increases Trust but Crowds Out Unique Human Knowledge",
    checked: "Abstract read on arXiv, 27 Oct 2026." },
  { id: "R8", kind: "Empirical study", url: "https://doi.org/10.1145/3588594",
    title: "How Do Users Experience Traceability of AI Systems? Subjective Information Processing Awareness in Automated Insulin Delivery Systems",
    checked: "Not re-opened in this session; only the abstract-level idea is used." },
  { id: "P0", kind: "Prototype precedent", url: "https://agent-veil-pink.vercel.app/playground",
    title: "Agent Veil playground (Douglas) — layer and rung definitions",
    checked: "Viewed 27 Oct 2026. Six layers + six rungs as described below. Marked as subject to change." },
];

interface Row { layer: string; choice: string; sources: string[]; found: string; why: string; open: string }

const ROWS: Row[] = [
  { layer: "1 · Verbosity",
    choice: "Short status + one line of commentary per step by default. Five levels change the length of the same event, never its facts, results or test status.",
    sources: ["R1", "R2"],
    found: "R1: a 20-person Wizard-of-Oz study with a web computer-use agent found user needs diverge across people and scenarios (normal, error-prone, risky runs). R2: summaries kept accuracy at baseline while raising trust and appeal; full traces from one open-weight model lowered accuracy.",
    why: "Needs vary, so length should be adjustable; longer text did not help people do better, so the default is short.",
    open: "Whether our five levels match what people actually want during a coding task. R1 studied computer-use agents, not coding agents." },
  { layer: "2 · Thinking (Decision notes)",
    choice: "Off by default. Inside a step, a “Why this approach?” button opens notes tied to that step. Labeled as an explanation written for people, not the model's full internal reasoning.",
    sources: ["R2", "R3", "R7"],
    found: "R2: reasoning traces shifted how people felt about the system more than how well they did; nobody was well calibrated. R3: organizes explanation needs as questions users ask (“Why…?”, “How…?”). R7: showing reasoning, brief or long, raised agreement with the AI and crowded out people's own knowledge (N = 752).",
    why: "Put explanations where a question arises, as answers to that question, and keep them collapsed so they don't replace the person's own check of the requirements.",
    open: "Whether collapsing notes actually reduces over-reliance. None of these papers tested this layout." },
  { layer: "3 · Summarized tool calls",
    choice: "Inside a step, “Tool calls (n)” opens compact rows: tool, what it acted on, result, and an OK / Failed / Not run status.",
    sources: ["R1", "R4"],
    found: "R1: people want to see progress and details at different times — wanting process info isn't the same as watching it constantly. R4: breaking a task into visible steps with intermediate results improved perceived transparency and control (20 people).",
    why: "One short row per action lets people scan what happened and dig in only where they have a doubt.",
    open: "R4's system also let people edit steps; its benefits can't be credited to visibility alone." },
  { layer: "4 · Full tool output",
    choice: "Separate layer. Under each tool row, “View full output” shows the exact command and full returned text in a scrolling box. Failures and “not run” are kept. If summaries are off, rows show the raw command instead.",
    sources: ["R4", "P0"],
    found: "R4: people debugged unexpected outputs by inspecting intermediate results (“unit-testing” sub-steps). P0: the playground treats full output as its own layer, separate from summaries.",
    why: "Raw records are evidence a person can verify, so they stay one click below the summary they back.",
    open: "Our assumption: two levels of nesting is the right depth. No source shows that full logs help more than summaries." },
  { layer: "5 · Subagents",
    choice: "Delegated work appears as a labeled “Subagent” block in the step that delegated it: task, status, what it returned. “Full” also shows its own steps and tool calls (still filtered by layers 1–4). A note says a subagent's report is its own claim.",
    sources: ["R5"],
    found: "R5: a 12-person qualitative comparison of five multi-agent interfaces; what people needed depended on task and context, and individual agents could be wrong even when the final answer was right.",
    why: "Show who did what and what came back, tied to the step it served; avoid implying that agents agreeing means the work is right — in the demo, tests pass while the review fails.",
    open: "Grouping rules for many subagents. R5's five interfaces are not our six layers." },
  { layer: "6 · Artifact versions",
    choice: "off: final result once the run ends · latest: current version · all: a v1/v2/v3 picker plus “Saved version” markers in steps. Viewing an older version shows “You're looking back at version X” and never changes the final result.",
    sources: ["R6", "R4"],
    found: "R6 (product page): artifacts open in their own window beside the conversation; editing an earlier message creates a different version with its own artifacts, without losing previous work. R4: intermediate results are visible and comparable.",
    why: "Keeping the work separate from the process, and letting people compare earlier states, is a familiar pattern.",
    open: "This is a product pattern, not experimental evidence. R6 doesn't describe a per-artifact version picker like ours." },
];

const EXTRA: Row = {
  layer: "Whole task: requirements + Verification",
  choice: "Requirements stay visible on the left so people can check the result themselves. Optional Verification shows, per requirement, the latest check: Checked · passed / Checked · failed / Not checked.",
  sources: ["R7", "R8"],
  found: "R7: revealed reasoning increased trust beyond what was warranted. R8: separates people's sense of understanding a system from their actual ability to follow it.",
  why: "Feeling informed isn't the same as being able to judge. Keeping the requirements in view keeps an independent check open.",
  open: "How to measure “can judge” vs. “feels informed” in our study.",
};

function SrcLinks({ ids }: { ids: string[] }) {
  return (
    <>
      {ids.map((id, i) => {
        const s = SOURCES.find((x) => x.id === id)!;
        return <React.Fragment key={id}>{i > 0 && ", "}<a href={s.url} target="_blank" rel="noreferrer">{id}</a></React.Fragment>;
      })}
    </>
  );
}

export function Rationale() {
  return (
    <div className="rationale">
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden="true" />
          <span className="brand-name">Agent Veil</span>
          <span className="brand-sub small muted">Design rationale</span>
        </div>
        <a className="small rationale-link" href="#/">← Back to prototype</a>
      </header>
      <main className="rationale-body">
        <h1>Design rationale</h1>
        <p className="lead">
          One person's proposal (Levy) for how the six Agent Veil information layers could look and behave in a familiar coding-agent workspace.
          It's for group discussion and to merge with other proposals — not a team-approved final system.
        </p>

        <section>
          <h2>What is real and what is authored</h2>
          <ul>
            <li><strong>Real and working:</strong> the layout, all visibility controls and presets, replay controls, the circuit-board viewer in each of its three versions (orbit, zoom, layers, part details, keyboard access in version 3), the version picker, and the requirement checklist.</li>
            <li><strong>Authored example data:</strong> the agent run itself. No model is called; the steps, decision notes, tool calls, logs, subagents and test results in the story were written by hand and replayed. They are consistent with each other and with the three viewer versions.</li>
            <li><strong>The board is fictional.</strong> It is not a real or verified circuit, and nothing here simulates electronics.</li>
            <li><strong>No visitor data is collected.</strong> Nothing you click is stored or sent anywhere. No study is running; no IRB approval is implied.</li>
          </ul>
        </section>

        <section>
          <h2>Layers and presets are different things</h2>
          <p>The six <strong>layers</strong> are kinds of information that can each be adjusted. The six <strong>presets</strong> (“rungs” in the playground) are named combinations of them. Rung 5 is not rung 4 plus more: it swaps tool calls for thinking.</p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Preset</th><th>Shows</th><th>Verbosity</th><th>Thinking</th><th>Tool summaries</th><th>Full output</th><th>Subagents</th><th>Versions</th></tr></thead>
              <tbody>
                {PRESETS.map((p) => (
                  <tr key={p.id}>
                    <td>{p.rung} · {p.name}</td><td>{p.shows}</td><td>{p.layers.verbosity}</td><td>{p.layers.thinking ? "on" : "off"}</td>
                    <td>{p.layers.toolSummary ? "on" : "off"}</td><td>{p.layers.toolFull ? "on" : "off"}</td><td>{p.layers.subagents}</td><td>{p.layers.versions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small muted">Preset names and what they show follow the playground glossary. How each preset sets Subagents and Artifact versions is <em>my</em> decision, since the glossary doesn't define it. Any change to a layer shows “Custom”. Verification is a separate helper and adds “+ Verification” to the label.</p>
        </section>

        <section>
          <h2>Consistent rules (my decisions, not Douglas's wording)</h2>
          <ol>
            <li><strong>One record, many views.</strong> Every view is filtered from the same run record. Changing visibility never changes the run, the replay position, or the final result.</li>
            <li><strong>Hidden isn't absent.</strong> The process panel lists hidden <em>categories</em> (“Hidden in this view: Decision notes · Tool calls…”). It never shows counts of hidden items, so a reduced view doesn't leak how much happened.</li>
            <li><strong>Black box shows only “working / finished”</strong> plus the final result. No step names, counts, statuses or nested panels.</li>
            <li><strong>Steps appear only if something in them is visible.</strong> With status hidden but tools on, a step shows as “Step” with its time.</li>
            <li><strong>Nested records follow the same layers.</strong> A subagent's own steps appear only at Subagents = full, and inside them commentary, notes, tool rows and full output are still controlled by layers 1–4.</li>
            <li><strong>Delegation belongs to the Subagents layer.</strong> “Delegate” calls are not listed as tool calls, so turning Subagents off hides delegated work entirely (the main agent's own commentary may still mention it).</li>
            <li><strong>Version history never hides the result.</strong> At “off”, the final result appears when the run ends. Looking at an older version is labeled and is not a rollback.</li>
            <li><strong>Version numbers are only shown at “all”.</strong> Elsewhere the result is labeled “Final result” or “Latest result”.</li>
            <li><strong>A check is not proof.</strong> Verification shows “Checked · passed / failed” or “Not checked”, and says that a passing check can still miss things.</li>
          </ol>
        </section>

        <section>
          <h2>Why each layer looks the way it does</h2>
          <p className="small muted">Source types: empirical study, interview/design framework, product precedent, prototype precedent. “Still open” is what no source tested — those are design choices to test, not findings.</p>
          <div className="table-wrap">
            <table className="evidence">
              <thead><tr><th>Layer</th><th>Design choice</th><th>Source</th><th>What the source found or shows</th><th>Why it informs this</th><th>Still open</th></tr></thead>
              <tbody>
                {[...ROWS, EXTRA].map((r) => (
                  <tr key={r.layer}><td><strong>{r.layer}</strong></td><td>{r.choice}</td><td><SrcLinks ids={r.sources} /></td><td>{r.found}</td><td>{r.why}</td><td>{r.open}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2>Sources</h2>
          <ul className="sources">
            {SOURCES.map((s) => (
              <li key={s.id}><span className="mono">{s.id}</span> <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a> <span className="small muted">— {s.kind}. {s.checked}</span></li>
            ))}
          </ul>
        </section>

        <section>
          <h2>Assumptions in this demo</h2>
          <ul>
            <li>The task (3D circuit-board viewer) follows a direction already in the playground. The final study task is not decided.</li>
            <li>The replay is authored and deterministic. Whether the study uses live generation, planted bugs, or recorded traces is not decided.</li>
            <li>Default view: the run starts finished, shown with the “Narration” preset, so people see the result first and a short process.</li>
            <li>Model, cost and token labels from the playground are left out on purpose; they are a separate experimental factor.</li>
          </ul>
        </section>
        <p className="small muted"><a href="#/">← Back to prototype</a></p>
      </main>
    </div>
  );
}
