import React from "react";
import type { RunRecord } from "../data/types";
import {
  buildProcess, hiddenCategories, formatTime,
  type StepView, type ToolView, type SubagentView, type ViewSettings,
} from "../logic/visibility";

export interface Expansion {
  open: Record<string, boolean>;
  toggle: (key: string, value?: boolean) => void;
}

const STATUS_LABEL: Record<string, string> = { ok: "OK", failed: "Failed", not_run: "Not run" };

function ToolRow({ tv, ex }: { tv: ToolView; ex: Expansion }) {
  const c = tv.call;
  const key = `out:${c.id}`;
  const open = ex.open[key];
  return (
    <li className={`tool-row status-${c.status}`} id={`tool-${c.id}`} data-tool={c.id}>
      <div className="tool-line">
        <span className="tool-name mono">{c.tool}</span>
        {tv.showSummary ? (
          <span className="tool-summary">{c.summary}</span>
        ) : (
          <span className="tool-summary mono small">{c.command}</span>
        )}
        <span className={`chip chip-${c.status}`}>{STATUS_LABEL[c.status]}</span>
      </div>
      {tv.showSummary && <div className="tool-target mono small">{c.target}</div>}
      {tv.showFull && (
        <>
          <button type="button" className="link-btn small" aria-expanded={!!open} aria-controls={`out-${c.id}`} onClick={() => ex.toggle(key)}>
            {open ? "Hide full output" : "View full output"}
          </button>
          {open && (
            <div className="full-output" id={`out-${c.id}`}>
              <div className="mono small cmd">$ {c.command}</div>
              <pre className="mono small" tabIndex={0} aria-label={`Full output of ${c.tool} ${c.target}`}>{c.output}</pre>
            </div>
          )}
        </>
      )}
    </li>
  );
}

function SubagentBlock({ sv, ex, run, onShowVersion }: { sv: SubagentView; ex: Expansion; run: RunRecord; onShowVersion: (id: string) => void }) {
  const key = `sub:${sv.task.id}`;
  const open = ex.open[key];
  return (
    <div className="subagent" data-subagent={sv.agent.id}>
      <div className="sub-head">
        <span className="role-badge">Subagent</span>
        <strong>{sv.agent.name}</strong>
        <span className={`chip ${sv.done ? "chip-done" : "chip-running"}`}>{sv.done ? "Returned" : "Working"}</span>
      </div>
      <p className="small"><span className="muted">Task:</span> {sv.task.brief}</p>
      {sv.done && <p className="small"><span className="muted">Returned:</span> {sv.task.result}</p>}
      {sv.level === "full" && sv.steps.length > 0 && (
        <>
          <button type="button" className="link-btn small" aria-expanded={!!open} onClick={() => ex.toggle(key)}>
            {open ? `Hide ${sv.agent.name}'s work` : `Show ${sv.agent.name}'s work`}
          </button>
          {open && (
            <ol className="sub-steps">
              {sv.steps.map((cv) => (
                <StepCard key={cv.step.id} v={cv} ex={ex} nested run={run} onShowVersion={onShowVersion} />
              ))}
            </ol>
          )}
        </>
      )}
      {sv.done && <p className="caveat small">A subagent's report is its own claim. Check the linked records or the result yourself.</p>}
    </div>
  );
}

export function StepCard({ v, ex, nested = false, run, onShowVersion }: {
  v: StepView; ex: Expansion; nested?: boolean; run: RunRecord; onShowVersion: (id: string) => void;
}) {
  const s = v.step;
  const notesKey = `notes:${s.id}`;
  const toolsKey = `tools:${s.id}`;
  const failed = v.tools.filter((t) => t.call.status === "failed").length;
  return (
    <li className={`step${v.active ? " is-active" : ""}${nested ? " is-nested" : ""}`} id={`step-${s.id}`} data-step={s.id}>
      <div className="step-head">
        <span className="time mono small">{formatTime(s.t)}</span>
        {v.status ? <span className="step-status">{v.status}</span> : <span className="step-status muted">Step</span>}
        {v.active && <span className="chip chip-running">Working</span>}
      </div>
      {v.narration && <p className="narration">{v.narration}</p>}

      {(v.notes.length > 0 || v.tools.length > 0) && (
        <div className="step-actions">
          {v.notes.length > 0 && (
            <button type="button" className="pill-btn" aria-expanded={!!ex.open[notesKey]} onClick={() => ex.toggle(notesKey)}>
              {ex.open[notesKey] ? "Hide decision notes" : "Why this approach?"}
            </button>
          )}
          {v.tools.length > 0 && (
            <button type="button" className="pill-btn" aria-expanded={!!ex.open[toolsKey]} onClick={() => ex.toggle(toolsKey)}>
              {ex.open[toolsKey] ? "Hide tool calls" : `Tool calls (${v.tools.length})`}{failed > 0 && !ex.open[toolsKey] ? ` · ${failed} failed` : ""}
            </button>
          )}
        </div>
      )}

      {v.notes.length > 0 && ex.open[notesKey] && (
        <div className="notes">
          <p className="notes-label small">Decision notes <span className="muted">— an explanation the agent wrote for people, not a full record of its internal reasoning.</span></p>
          {v.notes.map((n, i) => (
            <div key={i} className="note"><strong>{n.question}</strong><p>{n.answer}</p></div>
          ))}
        </div>
      )}

      {v.tools.length > 0 && ex.open[toolsKey] && (
        <ul className="tool-list">
          {v.tools.map((tv) => <ToolRow key={tv.call.id} tv={tv} ex={ex} />)}
        </ul>
      )}

      {v.subagents.map((sv) => <SubagentBlock key={sv.task.id} sv={sv} ex={ex} run={run} onShowVersion={onShowVersion} />)}

      {v.versionMarker && (
        <div className="version-marker small">
          <span>Saved <strong>version {v.versionMarker.version.number}</strong> — {v.versionMarker.version.title}</span>
          <button type="button" className="link-btn small" onClick={() => onShowVersion(v.versionMarker!.version.id)}>View in preview</button>
        </div>
      )}
    </li>
  );
}

export function ProcessPanel({ run, settings, time, ex, onShowVersion }: {
  run: RunRecord; settings: ViewSettings; time: number; ex: Expansion; onShowVersion: (id: string) => void;
}) {
  const steps = buildProcess(run, settings, time);
  const hidden = hiddenCategories(settings);
  const finished = time >= run.duration;
  const nothingVisible = settings.verbosity === "off" && steps.length === 0;

  return (
    <div className="process-body">
      {hidden.length > 0 && (
        <p className="hidden-note small" data-testid="hidden-note">
          <span className="muted">Hidden in this view:</span> {hidden.join(" · ")}. <span className="muted">Hidden doesn't mean it didn't happen.</span>
        </p>
      )}
      {nothingVisible ? (
        <div className="empty-process" data-testid="blackbox-process">
          <p>{finished ? "The run has finished." : "The agent is working…"}</p>
          <p className="muted small">This view shows only the final result.</p>
        </div>
      ) : (
        <ol className="steps" aria-label="Process steps">
          {steps.map((v) => <StepCard key={v.step.id} v={v} ex={ex} run={run} onShowVersion={onShowVersion} />)}
        </ol>
      )}
      {!nothingVisible && finished && <p className="end-mark small muted">End of run · {formatTime(run.duration)}</p>}
    </div>
  );
}
