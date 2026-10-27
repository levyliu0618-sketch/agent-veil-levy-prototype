import React from "react";
import {
  PRESETS, VERBOSITY_LEVELS, matchPreset, settingsFromPreset,
  type ViewSettings, type Verbosity, type SubagentLevel, type VersionLevel,
} from "../logic/visibility";

function Segmented<T extends string>({ label, value, options, onChange, name }: {
  label: string; value: T; options: T[]; onChange: (v: T) => void; name: string;
}) {
  return (
    <fieldset className="seg">
      <legend className="sr-only">{label}</legend>
      {options.map((o) => (
        <label key={o} className={`seg-opt${o === value ? " is-on" : ""}`}>
          <input type="radio" name={name} value={o} checked={o === value} onChange={() => onChange(o)} />
          <span>{o}</span>
        </label>
      ))}
    </fieldset>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="toggle">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
      <span className="toggle-track" aria-hidden="true"><span className="toggle-thumb" /></span>
      <span className="toggle-text">{checked ? "on" : "off"}</span>
    </label>
  );
}

export function ViewControls({ settings, onChange, onClose }: {
  settings: ViewSettings; onChange: (s: ViewSettings) => void; onClose: () => void;
}) {
  const preset = matchPreset(settings);
  const set = (patch: Partial<ViewSettings>) => onChange({ ...settings, ...patch });

  return (
    <section className="view-panel" aria-label="Process visibility settings" id="view-panel">
      <div className="vp-head">
        <h3>Process visibility</h3>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close visibility settings">✕</button>
      </div>
      <p className="small muted">Changes what you see about the process. It never changes what the agent did or the final result.</p>

      <fieldset className="presets">
        <legend className="small strong">Presets</legend>
        {PRESETS.map((p) => (
          <label key={p.id} className={`preset${preset?.id === p.id ? " is-on" : ""}`}>
            <input type="radio" name="preset" checked={preset?.id === p.id}
              onChange={() => onChange(settingsFromPreset(p.id, settings.verification))} />
            <span className="preset-rung mono">{p.rung}</span>
            <span className="preset-text"><span className="preset-name">{p.name}</span><span className="small muted">{p.shows}</span></span>
          </label>
        ))}
        <div className={`preset custom${preset ? "" : " is-on"}`} aria-live="polite">
          <span className="preset-rung mono">·</span>
          <span className="preset-text"><span className="preset-name">Custom</span>
            <span className="small muted">{preset ? "Appears when you adjust a layer below." : "Your own mix of layers (selected)."}</span></span>
        </div>
      </fieldset>

      <details className="layers-adjust" open>
        <summary className="small strong">Adjust each layer</summary>
        <div className="layer-row">
          <div><div className="layer-name">1 · Verbosity</div><div className="small muted">Status lines and commentary. Same facts, longer or shorter.</div></div>
          <Segmented<Verbosity> name="verbosity" label="Verbosity" value={settings.verbosity} options={VERBOSITY_LEVELS} onChange={(v) => set({ verbosity: v })} />
        </div>
        <div className="layer-row">
          <div><div className="layer-name">2 · Thinking (decision notes)</div><div className="small muted">“Why this approach?” notes inside steps.</div></div>
          <Toggle label="Decision notes" checked={settings.thinking} onChange={(v) => set({ thinking: v })} />
        </div>
        <div className="layer-row">
          <div><div className="layer-name">3 · Summarized tool calls</div><div className="small muted">One line per tool: what it acted on and whether it worked.</div></div>
          <Toggle label="Summarized tool calls" checked={settings.toolSummary} onChange={(v) => set({ toolSummary: v })} />
        </div>
        <div className="layer-row">
          <div><div className="layer-name">4 · Full tool output</div><div className="small muted">Exact command and everything it returned, including errors.</div></div>
          <Toggle label="Full tool output" checked={settings.toolFull} onChange={(v) => set({ toolFull: v })} />
        </div>
        <div className="layer-row">
          <div><div className="layer-name">5 · Subagents</div><div className="small muted">Delegated tasks: who, what, status, what came back.</div></div>
          <Segmented<SubagentLevel> name="subagents" label="Subagents" value={settings.subagents} options={["off", "summary", "full"]} onChange={(v) => set({ subagents: v })} />
        </div>
        <div className="layer-row">
          <div><div className="layer-name">6 · Artifact versions</div><div className="small muted">off: final only · latest: current version · all: pick any saved version.</div></div>
          <Segmented<VersionLevel> name="versions" label="Artifact versions" value={settings.versions} options={["off", "latest", "all"]} onChange={(v) => set({ versions: v })} />
        </div>
        <div className="layer-row extra">
          <div><div className="layer-name">Verification <span className="small muted">(separate helper, not a layer)</span></div><div className="small muted">Shows, next to each requirement, which check backs it and its result.</div></div>
          <Toggle label="Verification" checked={settings.verification} onChange={(v) => set({ verification: v })} />
        </div>
      </details>
      <p className="small muted vp-foot">Seeing more is not the same as the work being more correct.</p>
    </section>
  );
}
