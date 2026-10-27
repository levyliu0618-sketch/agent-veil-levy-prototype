// The "artifact" the demo agent builds. Three versions with genuinely
// different behaviour:
//   v1  static 3D board, fixed angle, no controls
//   v2  drag/wheel orbit + zoom, layer switches, click parts for details
//       (parts are plain clickable boxes: NOT reachable by keyboard)
//   v3  v2 + parts are named buttons, arrow-key orbit, +/− zoom, labeled controls

import React, { useEffect, useRef, useState } from "react";
import { BOARD, BOARD_LAYERS, PARTS, TOP_TRACES, BOTTOM_TRACES, type BoardLayerId, type Part } from "../data/board";

type VersionId = "v1" | "v2" | "v3";

interface ViewState { tilt: number; spin: number; zoom: number }
const START: ViewState = { tilt: 52, spin: -18, zoom: 1 };
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

function TracesSvg({ traces, kind }: { traces: number[][][]; kind: "top" | "bottom" }) {
  return (
    <svg className={`traces traces-${kind}`} viewBox={`0 0 ${BOARD.w} ${BOARD.h}`} preserveAspectRatio="none" aria-hidden="true">
      {traces.map((t, i) => (
        <polyline key={i} points={t.map((p) => p.join(",")).join(" ")} />
      ))}
      {kind === "top" && traces.map((t, i) => (
        <g key={`p${i}`}>
          <circle cx={t[0][0]} cy={t[0][1]} r={0.9} />
          <circle cx={t[t.length - 1][0]} cy={t[t.length - 1][1]} r={0.9} />
        </g>
      ))}
    </svg>
  );
}

function PartBox({ p, u, selected, mode, onSelect }: {
  p: Part; u: number; selected: boolean; mode: VersionId; onSelect: (p: Part) => void;
}) {
  const w = p.w * u, d = p.h * u, h = p.z * u;
  const faces = (
    <>
      <span className="face top" style={{ width: w, height: d, transform: `translateZ(${h}px)`, background: selected ? "var(--accent)" : p.color }} />
      <span className="face side" style={{ width: w, height: h, transform: `rotateX(90deg)`, transformOrigin: "top", top: 0, background: p.color }} />
      <span className="face side" style={{ width: w, height: h, transform: `translateY(${d}px) rotateX(90deg)`, transformOrigin: "top", top: 0, background: p.color, filter: "brightness(0.75)" }} />
      <span className="face side" style={{ width: h, height: d, transform: `rotateY(-90deg)`, transformOrigin: "left", left: 0, background: p.color, filter: "brightness(0.85)" }} />
      <span className="face side" style={{ width: h, height: d, transform: `translateX(${w}px) rotateY(-90deg)`, transformOrigin: "left", left: 0, background: p.color, filter: "brightness(0.65)" }} />
    </>
  );
  const style: React.CSSProperties = { left: p.x * u, top: p.y * u, width: w, height: d };
  if (mode === "v3") {
    return (
      <button type="button" className={`part part-btn${selected ? " is-selected" : ""}`} style={style}
        aria-label={`${p.ref}, ${p.kind}`} aria-pressed={selected} data-ref={p.ref}
        onClick={() => onSelect(p)}>{faces}</button>
    );
  }
  if (mode === "v2") {
    return (
      <div className={`part part-click${selected ? " is-selected" : ""}`} style={style} data-ref={p.ref}
        onClick={() => onSelect(p)}>{faces}</div>
    );
  }
  return <div className="part" style={style} data-ref={p.ref}>{faces}</div>;
}

export function CircuitViewer({ version }: { version: VersionId }) {
  const interactive = version !== "v1";
  const keyboard = version === "v3";
  const [view, setView] = useState<ViewState>(START);
  const [layers, setLayers] = useState<Record<BoardLayerId, boolean>>({ components: true, silkscreen: true, topCopper: true, bottomCopper: false });
  const [selected, setSelected] = useState<Part | null>(null);
  const [unit, setUnit] = useState(4.6);
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  // Fit board to available width.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      setUnit(clamp((w - 48) / (BOARD.w * 1.12), 2.2, 5.2));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Wheel zoom (v2, v3). Needs a non-passive listener.
  useEffect(() => {
    const el = stageRef.current;
    if (!el || !interactive) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setView((v) => ({ ...v, zoom: clamp(v.zoom - Math.sign(e.deltaY) * 0.1, 0.6, 2) }));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [interactive]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!interactive) return;
    drag.current = { x: e.clientX, y: e.clientY, moved: false };
    const move = (ev: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const dx = ev.clientX - d.x, dy = ev.clientY - d.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
      d.x = ev.clientX; d.y = ev.clientY;
      setView((v) => ({ ...v, spin: v.spin + dx * 0.4, tilt: clamp(v.tilt - dy * 0.3, 0, 80) }));
    };
    const up = () => {
      suppressClick.current = Boolean(drag.current?.moved);
      drag.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const select = (p: Part) => {
    if (suppressClick.current) { suppressClick.current = false; return; }
    setSelected((cur) => (cur?.ref === p.ref ? null : p));
  };

  const nudge = (d: Partial<ViewState>) =>
    setView((v) => ({
      tilt: clamp(v.tilt + (d.tilt ?? 0), 0, 80),
      spin: v.spin + (d.spin ?? 0),
      zoom: clamp(+(v.zoom + (d.zoom ?? 0)).toFixed(2), 0.6, 2),
    }));

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!keyboard) return;
    const map: Record<string, Partial<ViewState>> = {
      ArrowLeft: { spin: -15 }, ArrowRight: { spin: 15 }, ArrowUp: { tilt: -10 }, ArrowDown: { tilt: 10 },
      "+": { zoom: 0.15 }, "=": { zoom: 0.15 }, "-": { zoom: -0.15 }, "_": { zoom: -0.15 },
    };
    const d = map[e.key];
    if (d) { e.preventDefault(); nudge(d); }
  };

  const bw = BOARD.w * unit, bh = BOARD.h * unit;
  const sceneTransform = `scale(${view.zoom}) rotateX(${view.tilt}deg) rotateZ(${view.spin}deg)`;

  return (
    <div className={`viewer viewer-${version}`} data-version={version}>
      <div
        ref={stageRef}
        className={`stage${interactive ? " is-interactive" : ""}`}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        tabIndex={keyboard ? 0 : undefined}
        role={keyboard ? "group" : undefined}
        aria-label={keyboard ? "3D board view. Arrow keys orbit, plus and minus zoom." : undefined}
        aria-roledescription={keyboard ? "3D view" : undefined}
        data-testid="stage"
      >
        <div className="scene" style={{ transform: sceneTransform }} data-tilt={view.tilt} data-spin={view.spin} data-zoom={view.zoom}>
          <div className="board" style={{ width: bw, height: bh, marginLeft: -bw / 2, marginTop: -bh / 2 }}>
            <div className="board-edge" style={{ transform: `translateZ(${-1.6 * unit}px)` }} />
            {layers.bottomCopper && <div className="layer" data-layer="bottomCopper" style={{ transform: "translateZ(0.4px)" }}><TracesSvg traces={BOTTOM_TRACES} kind="bottom" /></div>}
            {layers.topCopper && <div className="layer" data-layer="topCopper" style={{ transform: "translateZ(0.8px)" }}><TracesSvg traces={TOP_TRACES} kind="top" /></div>}
            {layers.silkscreen && (
              <div className="layer silk" data-layer="silkscreen" style={{ transform: "translateZ(1.2px)" }}>
                {PARTS.map((p) => (
                  <React.Fragment key={p.ref}>
                    <span className="silk-outline" style={{ left: (p.x - 0.6) * unit, top: (p.y - 0.6) * unit, width: (p.w + 1.2) * unit, height: (p.h + 1.2) * unit }} />
                    <span className="silk-label" style={{ left: p.x * unit, top: (p.y - 3.4) * unit, fontSize: Math.max(9, unit * 2.3) }}>{p.ref}</span>
                  </React.Fragment>
                ))}
                <span className="silk-title" style={{ left: 4 * unit, top: 3 * unit, fontSize: Math.max(9, unit * 2.2) }}>AV-01 DEMO</span>
              </div>
            )}
            {layers.components && (
              <div className="layer" data-layer="components" style={{ transform: "translateZ(1.6px)" }}>
                {PARTS.map((p) => (
                  <PartBox key={p.ref} p={p} u={unit} selected={selected?.ref === p.ref} mode={version} onSelect={select} />
                ))}
              </div>
            )}
          </div>
        </div>
        {version === "v1" && <p className="stage-hint">Fixed view · no controls in this version</p>}
        {keyboard && <p className="stage-hint">Drag or use arrow keys to orbit · + / − to zoom</p>}
      </div>

      {interactive && (
        <div className="viewer-controls">
          <div className="vc-group" aria-label={keyboard ? "View controls" : undefined} role={keyboard ? "group" : undefined}>
            {keyboard && (
              <>
                <button type="button" className="vbtn" onClick={() => nudge({ spin: -15 })}>⟲ Orbit left</button>
                <button type="button" className="vbtn" onClick={() => nudge({ spin: 15 })}>Orbit right ⟳</button>
              </>
            )}
            <button type="button" className="vbtn" onClick={() => nudge({ zoom: -0.15 })} aria-label={keyboard ? "Zoom out" : undefined}>{keyboard ? "− Zoom out" : "−"}</button>
            <button type="button" className="vbtn" onClick={() => nudge({ zoom: 0.15 })} aria-label={keyboard ? "Zoom in" : undefined}>{keyboard ? "+ Zoom in" : "+"}</button>
            {keyboard && <button type="button" className="vbtn" onClick={() => setView(START)}>Reset view</button>}
            <span className="vc-readout" aria-live="off">{Math.round(view.zoom * 100)}%</span>
          </div>
          <fieldset className="vc-layers">
            <legend>Board layers</legend>
            {BOARD_LAYERS.map((l) => (
              <label key={l.id}>
                <input type="checkbox" checked={layers[l.id]} onChange={(e) => setLayers((s) => ({ ...s, [l.id]: e.target.checked }))} />
                {l.label}
              </label>
            ))}
          </fieldset>
          <div className="vc-details" aria-live="polite">
            {selected ? (
              <p><strong>{selected.ref}</strong> · {selected.kind} · {selected.value} — <span className="muted">{selected.note}</span></p>
            ) : (
              <p className="muted">{keyboard ? "Select a part (click it, or Tab to it and press Enter) to see what it is." : "Click a part to see what it is."}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
