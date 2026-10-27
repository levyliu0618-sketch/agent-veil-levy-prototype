# Agent Veil — interface prototype (Levy's proposal)

**Live demo:** https://levyliu0618-sketch.github.io/agent-veil-levy-prototype/

An interactive research-design prototype for the Agent Veil project (UC Berkeley HCI). It shows one way the six Agent Veil information layers could look and behave inside a familiar coding-agent workspace:

- **Left:** task and checkable requirements
- **Center:** the result (a 3D circuit-board viewer with three real, different versions)
- **Right:** the process, short by default, with details one click deeper

This is one member's proposal for group discussion — not a team-approved system, and not a running user study.

## What is real vs. authored

| Real, working | Authored example data |
| --- | --- |
| Layout, presets, six layer controls, Verification toggle | The agent run (steps, decision notes, tool calls, logs) |
| Replay controls (play, pause, restart, jump to end, scrub, speed) | Subagents and what they returned |
| Board viewer v1 / v2 / v3 (orbit, zoom, layers, part details, keyboard in v3) | Test results inside the story |
| Version picker, requirement checklist | The fictional "AV-01" board (not a real circuit) |

No model is called. No visitor data is collected or sent anywhere.

## Code layout (for connecting a backend)

```
src/data/types.ts       RunRecord: agents, steps, toolCalls, versions, checks, subagentTasks
src/data/run.ts         the authored demo run (one RunRecord)
src/data/board.ts       fictional board data
src/logic/visibility.ts presets + display rules: (record, settings, time) -> what is visible
src/components/         UI only; every panel reads the same RunRecord through the rules
```

A real backend only needs to produce a `RunRecord` (events linked by step, agent, tool call, version and check IDs).

## Build and test

```
npm install
npm run build      # bundles into docs/ (GitHub Pages serves /docs)
npm test           # data consistency + visibility-rule tests (node --test)
npm run serve      # then: npm run e2e  (Playwright for Python, Chromium)
```

Hash routing (`#/rationale`) and relative asset paths keep every page working under the Pages sub-path, including on refresh.

The design rationale (per-layer sources, rules, assumptions) is in the app under **Design rationale**.
