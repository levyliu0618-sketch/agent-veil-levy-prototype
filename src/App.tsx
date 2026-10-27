import React, { useCallback, useEffect, useRef, useState } from "react";
import { RUN } from "./data/run";
import { DEFAULT_PRESET_ID, settingsFromPreset, viewLabel, formatTime, type ViewSettings } from "./logic/visibility";
import { TaskPanel } from "./components/TaskPanel";
import { ArtifactPanel } from "./components/ArtifactPanel";
import { ProcessPanel, type Expansion } from "./components/ProcessPanel";
import { ViewControls } from "./components/ViewControls";
import { Rationale } from "./components/Rationale";

// ---- replay -------------------------------------------------------------
function useReplay(duration: number) {
  // Starts at the finished state so people first see the result and a short
  // process; "Replay from start" runs it again.
  const [time, setTime] = useState(duration);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(2);
  const last = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) { last.current = null; return; }
    let raf = 0;
    const tick = (now: number) => {
      if (last.current != null) {
        const dt = ((now - last.current) / 1000) * speed;
        setTime((t) => {
          const n = Math.min(duration, t + dt);
          if (n >= duration) setPlaying(false);
          return n;
        });
      }
      last.current = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, duration]);

  return {
    time, playing, speed, setSpeed,
    play: () => { if (time >= duration) setTime(0); setPlaying(true); },
    pause: () => setPlaying(false),
    restart: () => { setTime(0); setPlaying(true); },
    end: () => { setTime(duration); setPlaying(false); },
    seek: (t: number) => setTime(Math.max(0, Math.min(duration, t))),
  };
}

// ---- layout -------------------------------------------------------------
function useLayout(): "wide" | "medium" | "narrow" {
  const get = () => (window.innerWidth >= 1180 ? "wide" : window.innerWidth >= 820 ? "medium" : "narrow");
  const [l, setL] = useState(get);
  useEffect(() => {
    const on = () => setL(get());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return l;
}

function useRoute(): string {
  const [r, setR] = useState(() => window.location.hash || "#/");
  useEffect(() => {
    const on = () => setR(window.location.hash || "#/");
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return r;
}

function ReplayBar({ r, duration }: { r: ReturnType<typeof useReplay>; duration: number }) {
  const finished = r.time >= duration;
  const state = r.playing ? "Playing" : finished ? "Finished" : r.time === 0 ? "Ready" : "Paused";
  return (
    <div className="replay" role="group" aria-label="Replay controls">
      {r.playing ? (
        <button type="button" className="btn" onClick={r.pause}>❚❚ Pause</button>
      ) : (
        <button type="button" className="btn btn-primary" onClick={r.play}>▶ {finished ? "Replay from start" : "Play"}</button>
      )}
      <button type="button" className="btn" onClick={r.restart}>↺ Restart</button>
      <button type="button" className="btn" onClick={r.end} disabled={finished}>⇥ Jump to end</button>
      <input className="scrub" type="range" min={0} max={duration} step={1} value={Math.floor(r.time)}
        onChange={(e) => r.seek(Number(e.target.value))} aria-label="Replay position" aria-valuetext={`${formatTime(r.time)} of ${formatTime(duration)}`} />
      <span className="mono small time-readout" data-testid="time">{formatTime(r.time)} / {formatTime(duration)}</span>
      <span className="small muted replay-state" data-testid="replay-state">{state}</span>
      <label className="small speed">Speed{" "}
        <select value={r.speed} onChange={(e) => r.setSpeed(Number(e.target.value))}>
          <option value={1}>1×</option><option value={2}>2×</option><option value={4}>4×</option>
        </select>
      </label>
    </div>
  );
}

export function App() {
  const route = useRoute();
  const layout = useLayout();
  const replay = useReplay(RUN.duration);
  const [settings, setSettings] = useState<ViewSettings>(() => settingsFromPreset(DEFAULT_PRESET_ID));
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<"task" | "result" | "process">("result");
  const [taskOpen, setTaskOpen] = useState(false);
  const viewBtnRef = useRef<HTMLButtonElement>(null);

  const ex: Expansion = {
    open,
    toggle: useCallback((key: string, value?: boolean) => setOpen((o) => ({ ...o, [key]: value ?? !o[key] })), []),
  };

  useEffect(() => { document.title = route.startsWith("#/rationale") ? "Design rationale · Agent Veil prototype" : "Agent Veil · Interface prototype"; }, [route]);

  if (route.startsWith("#/rationale")) return <Rationale />;

  // "See record" from a requirement: open the step + tool row and move focus there.
  const seeRecord = (toolCallId: string) => {
    const call = RUN.toolCalls.find((c) => c.id === toolCallId)!;
    const step = RUN.steps.find((s) => s.id === call.stepId)!;
    const keys: Record<string, boolean> = { [`tools:${step.id}`]: true };
    if (step.parentStepId) {
      const task = RUN.subagentTasks.find((t) => t.agentId === step.agentId)!;
      keys[`sub:${task.id}`] = true;
      keys[`tools:${step.parentStepId}`] = open[`tools:${step.parentStepId}`] ?? false;
    }
    setOpen((o) => ({ ...o, ...keys }));
    if (layout === "narrow") setTab("process");
    setTimeout(() => {
      const el = document.getElementById(`tool-${toolCallId}`);
      if (el) {
        el.classList.add("flash");
        el.scrollIntoView({ block: "nearest", behavior: "smooth" });
        el.setAttribute("tabindex", "-1");
        (el as HTMLElement).focus({ preventScroll: true });
        setTimeout(() => el.classList.remove("flash"), 1600);
      } else {
        const st = document.getElementById(`step-${step.parentStepId ?? step.id}`);
        st?.scrollIntoView({ block: "nearest" });
      }
    }, 60);
  };

  const showVersion = (id: string) => {
    const latest = RUN.versions.filter((v) => v.t <= replay.time).slice(-1)[0];
    setSelectedVersion(latest && latest.id === id ? null : id);
    if (layout === "narrow") setTab("result");
  };

  const label = viewLabel(settings);
  const taskPanel = <TaskPanel run={RUN} settings={settings} time={replay.time} onSeeRecord={seeRecord} />;
  const artifactPanel = <ArtifactPanel run={RUN} settings={settings} time={replay.time} selected={selectedVersion} onSelect={setSelectedVersion} />;
  const processPanel = (
    <div className="process-panel">
      <div className="process-head">
        <h2 className="panel-title">Process</h2>
        <button ref={viewBtnRef} type="button" className={`view-btn${viewOpen ? " is-open" : ""}`} aria-expanded={viewOpen} aria-controls="view-panel"
          onClick={() => setViewOpen((v) => !v)} data-testid="view-btn">
          <span className="muted">View:</span> <strong>{label}</strong> <span aria-hidden="true">{viewOpen ? "▴" : "▾"}</span>
        </button>
      </div>
      {viewOpen && <ViewControls settings={settings} onChange={setSettings} onClose={() => { setViewOpen(false); viewBtnRef.current?.focus(); }} />}
      <ProcessPanel run={RUN} settings={settings} time={replay.time} ex={ex} onShowVersion={showVersion} />
    </div>
  );

  return (
    <div className={`app layout-${layout}`}>
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden="true" />
          <span className="brand-name">Agent Veil</span>
          <span className="brand-sub small muted">Interface prototype · Levy's proposal</span>
        </div>
        <span className="demo-badge small" title="Nothing here calls a model or runs real tests.">Demo replay · Example data</span>
        <a className="small rationale-link" href="#/rationale">Design rationale</a>
      </header>

      <ReplayBar r={replay} duration={RUN.duration} />

      {layout === "narrow" && (
        <nav className="tabs" role="tablist" aria-label="Panels">
          {(["task", "result", "process"] as const).map((t) => (
            <button key={t} role="tab" type="button" aria-selected={tab === t} className={`tab${tab === t ? " is-on" : ""}`} onClick={() => setTab(t)}>
              {t === "task" ? "Task" : t === "result" ? "Result" : "Process"}
            </button>
          ))}
        </nav>
      )}

      <main className="workspace">
        {layout === "wide" && <aside className="col col-task" aria-label="Task and requirements">{taskPanel}</aside>}
        {layout === "narrow" ? (
          <section className="col col-single" role="tabpanel">
            {tab === "task" ? taskPanel : tab === "result" ? artifactPanel : processPanel}
          </section>
        ) : (
          <>
            <section className="col col-center" aria-label="Result">
              {layout === "medium" && (
                <div className="task-collapse">
                  <button type="button" className="btn small" aria-expanded={taskOpen} onClick={() => setTaskOpen((v) => !v)}>
                    {taskOpen ? "Hide task and requirements" : "Show task and requirements"}
                  </button>
                  {taskOpen && <div className="task-inline">{taskPanel}</div>}
                </div>
              )}
              {artifactPanel}
            </section>
            <aside className="col col-process" aria-label="Process">{processPanel}</aside>
          </>
        )}
      </main>
    </div>
  );
}
