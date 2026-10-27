import React, { useState } from "react";
import type { RunRecord } from "../data/types";
import { criterionStatuses, formatTime, type ViewSettings } from "../logic/visibility";

const RESULT_LABEL = { passed: "Checked · passed", failed: "Checked · failed", not_checked: "Not checked" } as const;

export function TaskPanel({ run, settings, time, onSeeRecord }: {
  run: RunRecord; settings: ViewSettings; time: number; onSeeRecord: (toolCallId: string) => void;
}) {
  const [mine, setMine] = useState<Record<string, boolean>>({});
  const statuses = criterionStatuses(run, time);
  const recordVisible = settings.toolSummary || settings.toolFull;

  return (
    <div className="task-panel">
      <p className="eyebrow small">Task</p>
      <h2 className="task-title">{run.task.title}</h2>
      <p className="task-request">{run.task.request}</p>
      <p className="small muted disclaimer">{run.task.disclaimer}</p>

      <h3 className="req-head">Requirements</h3>
      <p className="small muted">Check these against the result yourself. “Your check” is only kept on this page and is not sent anywhere.</p>
      <ol className="reqs">
        {run.criteria.map((c) => {
          const st = statuses.find((s) => s.criterionId === c.id)!;
          const k = st.latest;
          const ver = k ? run.versions.find((v) => v.id === k.versionId) : null;
          return (
            <li key={c.id} className="req" data-criterion={c.id}>
              <div className="req-line"><span className="req-id mono">{c.id}</span><span>{c.text}</span></div>
              <div className="req-try small muted">{c.howToTry}</div>
              {settings.verification && (
                <div className={`verif small verif-${k ? k.result : "none"}`} data-testid={`verif-${c.id}`}>
                  {k ? (
                    <>
                      <span className={`chip chip-${k.result}`}>{RESULT_LABEL[k.result]}</span>{" "}
                      <span>{k.note}</span>{" "}
                      {settings.versions === "all" && ver && <span className="muted">(on version {ver.number}, {formatTime(k.t)})</span>}
                      {k.toolCallId && (recordVisible ? (
                        <button type="button" className="link-btn small" onClick={() => onSeeRecord(k.toolCallId!)}>See record</button>
                      ) : <span className="muted"> · Record hidden in this view</span>)}
                    </>
                  ) : (
                    <span className="chip chip-none">No check yet</span>
                  )}
                </div>
              )}
              {c.tryable && (
                <label className="mine small">
                  <input type="checkbox" checked={!!mine[c.id]} onChange={(e) => setMine((m) => ({ ...m, [c.id]: e.target.checked }))} />
                  Your check: I tried this
                </label>
              )}
            </li>
          );
        })}
      </ol>
      {settings.verification && (
        <p className="small caveat">A passed check means a check ran and passed. It isn't proof the requirement is met — checks can miss things.</p>
      )}
    </div>
  );
}
