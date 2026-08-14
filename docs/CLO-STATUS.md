# CLO Build Status

This ledger is intentionally conservative. It records what is implemented and verified in the repository, not what is planned.

## Current Baseline After Enactment Pass

| Area | Passed | Total | Notes |
|---|---:|---:|---|
| Architecture and security | 14 | 15 | Electron shell, preload boundary, migration normalization, bounded action IPC, SQLite persistence path, stateful job health, capture runner, and source tests exist; true worker isolation remains |
| Data integrity and provenance | 17 | 20 | SHA-256, staging, commit, extracted text, audit, duplicate detection, typed evidence links, paragraph provenance, and context-only import are verified; SQL repository remains |
| Functional surfaces | 22 | 25 | Primary views, import flow, proposition/build/validate/export-gate actions, object search, derived deadlines, Evidence filters, stateful job status, and secondary navigation exist; several domain workflows remain fixtures |
| Visual constitution | 18 | 25 | Shell geometry tokens, palette, responsive rules, 1440px/1024px/mobile captures, and corrected mobile fallback are verified; computed geometry and color-area audit remain |
| Accessibility, interaction, performance | 7 | 10 | Search/Escape, route shortcuts, visible focus/select states, non-chat search, and mobile hierarchy exist; list navigation and benchmarks remain |
| Verification, documentation, delivery | 5 | 5 | Store and constitution tests, rubric, README, background Electron smoke launch, capture runner, and 10 generated route screenshots exist |
| **Total** | **86** | **100** | **B**; worker isolation, performance benchmarks, and full domain integration remain |

## Verified In This Repository

- `electron/main.cjs`, `electron/preload.cjs`, and `electron/store.cjs` parse successfully with the bundled Node runtime.
- The store can stage a file, compute a SHA-256 digest, commit evidence, create extracted-text rows, and append audit history.
- Field Atlas and Cicero have explicit context-export entry points rather than silently writing litigation evidence.
- The CLO shell has the eight primary routes, System, a shared inspector, status strip, and secondary-view support.
- The shell now exposes Field Atlas and Cicero as explicit rail routes and supports Cmd/Ctrl+1–9 switching.
- Object search is a scoped search drawer over normalized matter objects, not a chat prompt.
- Evidence links are typed and validated; duplicate hashes are detected; procedure deadlines are derived and persisted.
- The Electron application path uses a local SQLite file with a versioned case-state table; the JSON path remains available for isolated tests.
- Window presentation is opt-out for normal use and explicitly suppressed with `CLO_BACKGROUND_CAPTURE=1` for background capture/smoke workflows.
- Background capture generated 10 normalized `1440x900` route screenshots, 1024px/mobile shell screenshots, and four state-variant screenshots under `artifacts/screenshots/`.
- `git diff --check` passes for the current source tree.

## Not Yet Verified

- Electron foreground-safe launch and screenshot capture.
- A real SQLite backend.
- PDF/OCR extraction.
- Typed repository validation and duplicate detection.
- Full action mutation paths for Law, Elements, Drafts, and Deadlines.
- Automated UI/performance tests and contradiction/complete state screenshot capture.
- State-variant screenshot grading for inspector, import drawer, validation failure, export-ready, contradiction, and complete states.

## Immediate Enactment Backlog

1. Add schema normalization/migration on load.
2. Make all core action controls invoke named IPC mutations.
3. Add Field Atlas and Cicero rail navigation.
4. Add route keyboard shortcuts and a non-chat object-search drawer.
5. Add test commands for store invariants and export gating.
6. Add a background screenshot manifest once the Electron runtime is available.
