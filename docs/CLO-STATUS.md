# CLO Build Status

This ledger is intentionally conservative. It records what is implemented and verified in the repository, not what is planned.

## Current Baseline After Enactment Pass

| Area | Passed | Total | Notes |
|---|---:|---:|---|
| Architecture and security | 11 | 15 | Electron shell, preload boundary, migration normalization, and bounded action IPC exist; background jobs and full IPC tests remain |
| Data integrity and provenance | 14 | 20 | SHA-256, staging, commit, extracted text, audit, paragraph provenance, and context-only import are verified; duplicate detection and typed repositories remain |
| Functional surfaces | 18 | 25 | Primary views, import flow, proposition/build/validate/export-gate actions, and secondary navigation exist; several domain workflows remain fixtures |
| Visual constitution | 15 | 25 | Shell geometry tokens and palette exist; computed geometry, screenshot manifest, and color-area verification remain |
| Accessibility, interaction, performance | 5 | 10 | Search/Escape and route shortcuts exist; list navigation and benchmarks remain |
| Verification, documentation, delivery | 4 | 5 | Store test, rubric, and status ledger exist; screenshot capture remains |
| **Total** | **67** | **100** | **D**; hard gates and visual/runtime verification still block release |

## Verified In This Repository

- `electron/main.cjs`, `electron/preload.cjs`, and `electron/store.cjs` parse successfully with the bundled Node runtime.
- The store can stage a file, compute a SHA-256 digest, commit evidence, create extracted-text rows, and append audit history.
- Field Atlas and Cicero have explicit context-export entry points rather than silently writing litigation evidence.
- The CLO shell has the eight primary routes, System, a shared inspector, status strip, and secondary-view support.
- `git diff --check` passes for the current source tree.

## Not Yet Verified

- Electron foreground-safe launch and screenshot capture.
- A real SQLite backend.
- PDF/OCR extraction.
- Typed repository validation and duplicate detection.
- Full action mutation paths for Law, Elements, Drafts, and Deadlines.
- Automated unit, integration, UI, performance, and screenshot tests.
- 1440x900, 1024px, and mobile screenshot grading.

## Immediate Enactment Backlog

1. Add schema normalization/migration on load.
2. Make all core action controls invoke named IPC mutations.
3. Add Field Atlas and Cicero rail navigation.
4. Add route keyboard shortcuts and a non-chat object-search drawer.
5. Add test commands for store invariants and export gating.
6. Add a background screenshot manifest once the Electron runtime is available.
