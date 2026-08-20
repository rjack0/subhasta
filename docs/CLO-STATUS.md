# CLO Build Status

## Master Completion Ledger

The repository now includes `docs/MASTER-LEDGER.json` and `docs/MASTER-LEDGER.md`, containing 2,820 atomic requirements: the original 1,050-point plan, a 250-point 1540 N. Vine machine extension, a 300-point shared-renderer representation extension, a 1,100-point full-trial operating extension, and a 120-point post-trial/appellate extension. The source registry covers 69 locally available pasted attachment files. The ledger distinguishes implementation, testing, and visual verification; related scaffolding is not treated as completion.

The current baseline is generated from direct repository evidence. The remaining requirements are intentionally open.

## Master Ledger Snapshot

At the current working tree, the 2,820-point ledger contains **605 IMPLEMENTED** and **2,215 UNREAD** requirements. `IMPLEMENTED` means a repository feature exists; it does not imply `TESTED` or `VERIFIED`. Through commit `b330f31`, the verified implementation includes normalized filing/service/docket records, consequence-aware deadlines, inspector evidence/element/authority links, source-review gates, property identity controls, contradiction and gap capture, extracted-text correction provenance, governed manifest/backup exports, strategy linked-object provenance, filing validation issue summaries, and trial foundation/admission/appeal source gates.

This ledger is intentionally conservative. It records what is implemented and verified in the repository, not what is planned.

## Current Baseline After Enactment Pass

| Area | Passed | Total | Notes |
|---|---:|---:|---|
| Architecture and security | 15 | 15 | Electron shell, preload boundary, migration normalization, bounded action IPC, SQLite persistence path, worker-thread hashing/extraction, stateful job health, capture runner, and source tests exist |
| Data integrity and provenance | 18 | 20 | SHA-256, staging, commit, extracted text, audit, duplicate detection, typed evidence links, paragraph provenance, context-only workbook import, and 287-unit/41-front coverage are verified; SQL repository remains |
| Functional surfaces | 24 | 25 | Primary views, Camden Coverage matrix, import flow, proposition/build/validate/export-gate actions, object search, derived deadlines, Evidence filters/pagination, stateful job status, and secondary navigation exist; some domain mutations remain fixtures |
| Visual constitution | 18 | 25 | Shell geometry tokens, palette, responsive rules, 1440px/1024px/mobile captures, and corrected mobile fallback are verified; computed geometry and color-area audit remain |
| Accessibility, interaction, performance | 9 | 10 | Search/Escape, route shortcuts, visible focus/select states, non-chat search, mobile hierarchy, ArrowUp/ArrowDown/Enter navigation, paginated long lists, and 10,000-object search benchmark exist |
| Verification, documentation, delivery | 5 | 5 | Store, constitution, Camden fixture, and performance tests, rubric, README, background Electron smoke launch, capture runner, and 17 generated screenshots exist |
| **Current implementation tranche** | **90** | **100** | **A-** for the original tranche rubric; this is not the master completion score |

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
- Existing background capture artifacts include the earlier normalized `1440x900` route set, 1024px/mobile shell screenshots, and state variants under `artifacts/screenshots/`; the updated capture runner includes GPU-disabled safeguards but still aborts with Electron exit 134 before generating the new Machine, Trial, or Moderate captures in this environment.
- The supplied war-room workbook is imported as `fixtures/camden-1540-vine.json`; its raw sheet rows and source row numbers remain auditable.
- File hashing and text extraction run in `electron/hash-worker.cjs`; the 10,000-object search benchmark passes in the current runtime.
- PDF text extraction uses the local `pdftotext` executable when present; OCR remains intentionally separate and unclaimed.
- `git diff --check` passes for the current source tree.

## Not Yet Verified

- The master completion ledger remains open: the generated `IMPLEMENTED` count and open count are authoritative in `docs/MASTER-LEDGER.json`; open items still require implementation, tests, or screenshot evidence.

- The post-trial operating layer now has explicit persisted mutations for verdict, judgment entry, cost records, enforcement/stay steps, appellate steps, motions, jury instructions, witness foundation, exhibit admission, courtroom events, and argument records.

- OCR tool availability and visual verification of scanned-PDF fallback remain environment-dependent; the worker records `OCR_TESSERACT` only when local conversion/OCR succeeds.
- Typed repository validation beyond the current link validator.
- Full action mutation paths for some domain-specific Law, Procedure, Strategy, and Cicero flows.
- Automated UI tests and full domain integration.
- Pixel-level color-area and computed-geometry audit.

## Immediate Enactment Backlog

1. Add PDF/OCR extraction adapters.
2. Add remaining domain-specific Law, Procedure, Strategy, and Cicero mutations.
3. Add virtualized long lists and full keyboard list traversal.
4. Add pixel-level visual grading and computed geometry assertions.
