import React from "react";
import type { RunRecord } from "../data/types";
import { displayedVersion, versionsUpTo, type ViewSettings } from "../logic/visibility";
import { CircuitViewer } from "./CircuitViewer";

export function ArtifactPanel({ run, settings, time, selected, onSelect }: {
  run: RunRecord; settings: ViewSettings; time: number; selected: string | null; onSelect: (id: string | null) => void;
}) {
  const { version, isFinal, isHistorical } = displayedVersion(run, settings, time, selected);
  const finished = time >= run.duration;
  const avail = versionsUpTo(run, time);
  const latest = avail[avail.length - 1];
  const showPicker = settings.versions === "all" && avail.length > 0;

  let label: string;
  if (!version) label = "No result yet";
  else if (settings.versions === "all") label = `Viewing version ${version.number} of ${avail.length}${isFinal ? " · Final" : isHistorical ? " · Earlier version" : finished ? "" : " · Latest so far"}`;
  else label = isFinal ? "Final result" : "Latest result · run still in progress";

  return (
    <div className="artifact-panel">
      <div className="artifact-head">
        <div>
          <h2 className="panel-title">Result</h2>
          <p className="version-label small" data-testid="version-label">{label}</p>
        </div>
        {showPicker && (
          <div className="version-picker" role="group" aria-label="Artifact versions">
            {avail.map((v) => {
              const on = version?.id === v.id;
              const isFinalV = finished && v.id === run.finalVersionId;
              return (
                <button key={v.id} type="button" className={`ver-btn${on ? " is-on" : ""}`} aria-pressed={on}
                  onClick={() => onSelect(v.id === latest.id ? null : v.id)} data-version-btn={v.id}>
                  v{v.number}{isFinalV ? " · Final" : ""}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {isHistorical && version && (
        <div className="history-banner small" role="status">
          <span>You're looking back at <strong>version {version.number}</strong>. This doesn't roll back or change the {finished ? "final result" : "latest version"}.</span>
          <button type="button" className="link-btn small" onClick={() => onSelect(null)}>Back to {finished ? "final" : "latest"}</button>
        </div>
      )}

      {showPicker && version && (
        <details className="changes small">
          <summary>What changed in version {version.number}: {version.title}</summary>
          <ul>{version.changes.map((c, i) => <li key={i}>{c}</li>)}</ul>
        </details>
      )}

      <div className="preview-frame">
        {version ? (
          <CircuitViewer key={version.id} version={version.id as "v1" | "v2" | "v3"} />
        ) : (
          <div className="preview-empty" data-testid="preview-empty">
            <p>{settings.versions === "off" ? "The result appears when the run finishes." : "The agent hasn't saved a version yet."}</p>
          </div>
        )}
      </div>
    </div>
  );
}
