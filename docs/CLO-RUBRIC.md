# CLO Acceptance Rubric

This is the release gate for the CLO desktop rebuild. It replaces subjective language such as "feels complete" with observable checks. A criterion passes only when its listed artifact exists and the measurement is satisfied.

## Scoring

Each criterion is worth one point unless a section weight is shown. Record `1` for pass and `0` for fail; partial credit is not allowed. The score is the sum of passed points divided by 100.

| Score | Grade | Release meaning |
|---:|:---:|---|
| 93-100 | A | Constitution-compliant, functional, tested, and visually verified |
| 90-92 | A- | Release quality with only non-blocking deviations |
| 87-89 | B+ | Coherent and functional, but not fully verified |
| 83-86 | B | Usable with bounded deficiencies |
| 80-82 | B- | Usable prototype with material gaps |
| 77-79 | C+ | Partially implemented |
| 73-76 | C | Significant inconsistency or missing verification |
| 70-72 | C- | Prototype behavior only |
| 60-69 | D | Violates one or more major product rules |
| 0-59 | F | Missing, contradictory, or untestable |

## Hard Gates

The overall grade cannot exceed `C` if any gate fails, regardless of arithmetic score.

| Gate | Pass condition | Required artifact |
|---|---|---|
| G-01 | Renderer has no unrestricted Node or Electron access | `electron/preload.cjs`; static source scan |
| G-02 | Every committed evidence item has a SHA-256 hash, original path or explicit text source, import timestamp, and audit entry | store fixture plus integration test |
| G-03 | `EXPORT FILING` is absent until validation returns pass | Elements/Drafts UI test |
| G-04 | All eight CLO routes, System, Field Atlas, and Cicero are reachable without URL navigation | shell UI test |
| G-05 | No core screen contains a marketing or explanatory hero paragraph | screenshot review and text scan |
| G-06 | Semantic colors are not used as decoration or reassigned by screen | token file and screenshot review |
| G-07 | The application can recover its local state after restart | persistence integration test |
| G-08 | No unsupported extremist association or recruitment graph is implemented in Moderate | `moderate/README.md` and product review |

## A. Architecture and Security, 15 points

| ID | Requirement | Measurement | Evidence |
|---|---|---|---|
| A-01 | Electron main process owns window creation and filesystem access | `main.cjs` contains the only file-dialog and store wiring | source scan |
| A-02 | Preload exposes only named, argument-bounded methods | no `require`, `fs`, `ipcRenderer` leakage, or generic `send` in renderer | preload scan |
| A-03 | Context isolation is enabled | `contextIsolation: true` | main-process assertion |
| A-04 | Node integration is disabled | `nodeIntegration: false` | main-process assertion |
| A-05 | Renderer has a single shell | one BrowserWindow and one top-level CLO shell | shell test |
| A-06 | Persistent store is outside renderer-accessible source data | resolved application data path is used | main/store test |
| A-07 | Store schema has a version and migration path | loading an older fixture produces all required collections | migration test |
| A-08 | IPC handlers validate payload shape | malformed evidence/context/save calls reject safely | IPC test |
| A-09 | External URLs are allowlisted or explicitly confirmed | no arbitrary navigation from renderer | IPC test |
| A-10 | Heavy work is represented as jobs, not synchronous renderer loops | hashing/extraction/indexing have job state fields | job fixture |
| A-11 | No remote code execution or remote module loading | no `eval`, `new Function`, remote script, or `webview` | source scan |
| A-12 | App launch does not force foreground activation during capture | screenshot launcher uses background-capable window policy | capture script/config |
| A-13 | Secondary apps are mounted within the shared shell | Field Atlas and Cicero are reachable from CLO navigation | shell test |
| A-14 | Runtime errors are surfaced in the status strip | failed job/store state is visible as a status state | UI test |
| A-15 | Architecture is documented against the constitution | README links to architecture and rubric | documentation review |

## B. Data Integrity and Provenance, 20 points

| ID | Requirement | Measurement | Evidence |
|---|---|---|---|
| B-01 | Matter has a stable ID and timestamps | fixture assertion | store test |
| B-02 | Required normalized collections exist | all named collections in constitution are present | schema test |
| B-03 | Evidence import stages before commit | chosen objects have `STAGED` state and are not in committed evidence | import test |
| B-04 | File bytes are hashed with SHA-256 | known input produces known digest | hash test |
| B-05 | Clipboard text is hashed identically to its UTF-8 bytes | known text digest matches | hash test |
| B-06 | Original path is retained for file evidence | committed object preserves path | store test |
| B-07 | Original timestamps and custodian fields exist | fields are present, null allowed only when unknown | schema test |
| B-08 | Extracted text is stored separately from evidence metadata | `extractedText` row references evidence ID | store test |
| B-09 | Evidence commit creates audit history | commit produces timestamped audit record | store test |
| B-10 | Evidence links have typed endpoints | evidence/event/element/person links cannot be arbitrary strings without type | repository test |
| B-11 | Contradictions are explicit objects | contradiction state is distinct from missing evidence | fixture/test |
| B-12 | Gaps are explicit objects | missing proof is represented as an evidence gap | fixture/test |
| B-13 | Authority propositions retain source references | proposition has authority ID and source location | Law test |
| B-14 | Paragraph provenance is per paragraph | every generated paragraph lists fact/law/inference sources | Drafts test |
| B-15 | Inference is visibly distinct from fact | inference status maps to violet/analytical state | token/UI test |
| B-16 | Field Atlas context is not silently evidence | explicit import action creates `CONTEXT_ONLY` object | integration test |
| B-17 | Cicero estimates are not facts | confidence, assumptions, and source note persist | Cicero test |
| B-18 | Update operations append audit history | any persistent mutation adds an audit row | store test |
| B-19 | Restart recovers committed evidence and links | close/reopen store preserves IDs and hashes | integration test |
| B-20 | Store rejects duplicate evidence content or marks it | duplicate SHA-256 is detected and surfaced | repository test |

## C. Functional Surfaces, 25 points

| ID | Requirement | Measurement | Evidence |
|---|---|---|---|
| C-01 | Command identifies one next action | exactly one dominant `OPEN ACTION` control | Command UI test |
| C-02 | Command shows legal-branch proof state | every seeded element has status and percentage | Command UI test |
| C-03 | Evidence has map, chronology, source queue, and filters | all four regions render | Evidence UI test |
| C-04 | Evidence supports file import | file dialog stages a file | integration test |
| C-05 | Evidence supports folder import | directory selection stages readable files | integration test |
| C-06 | Evidence supports clipboard import | clipboard text stages as text evidence | integration test |
| C-07 | Evidence commit is explicit | no staged item enters evidence before button action | integration test |
| C-08 | Law source text is dominant | source text region is present and larger than proposition list | screenshot/DOM test |
| C-09 | Law can create a proposition from selected text | action creates proposition with source link | integration test |
| C-10 | Law can verify and link authorities | source status/link state changes persist | integration test |
| C-11 | Elements show completeness and missing proof | claim, element, required evidence, contradiction, and gap are visible | Elements UI test |
| C-12 | Elements pipeline has nine ordered states | relief through export render in order | DOM test |
| C-13 | Elements build section mutates draft state | action creates or updates paragraph | integration test |
| C-14 | Filing validation is explicit | validation result is persisted and displayed | integration test |
| C-15 | Export is gated | export control is rendered only after validation pass | UI test |
| C-16 | Procedure renders docket chronology | filing, service, court event, and dependency objects are represented | Procedure UI test |
| C-17 | Procedure derives deadlines | deadline has source procedure dependency | deadline test |
| C-18 | Strategy separates judge and opponent surfaces | two distinct panels with source universe and confidence | Strategy UI test |
| C-19 | Strategy labels inference and uncertainty | unsupported personality claims are not rendered | Strategy test |
| C-20 | Drafts expose paragraph-level provenance | each paragraph has source rail and support status | Drafts UI test |
| C-21 | Drafts show broken support in oxide state | invalid source link produces visible failure | validation test |
| C-22 | Deadlines show today line and consequence bars | timeline contains today marker and derived deadlines | Deadlines UI test |
| C-23 | System shows database, jobs, memory, and audit | status fields are visible and stateful | System UI test |
| C-24 | Universal search groups normalized objects | result includes type/name/status/source | search test |
| C-25 | Secondary routes preserve explicit commit semantics | Field Atlas and Cicero remain contextual/analytical tools | integration test |

## D. Visual Constitution, 25 points

| ID | Requirement | Measurement | Evidence |
|---|---|---|---|
| D-01 | Reference viewport is supported | 1440x900 screenshot has no overflow | screenshot |
| D-02 | Rail is 72px | computed style equals 72px | visual test |
| D-03 | Topbar is 56px | computed style equals 56px | visual test |
| D-04 | Status strip is 28px | computed style equals 28px | visual test |
| D-05 | Main shell uses 960px stage, 336px inspector, 24px gutter at reference width | computed grid matches tokens | visual test |
| D-06 | Spacing uses only allowed increments | static CSS token scan plus computed sample | lint/test |
| D-07 | Button heights follow 40/44/48 control classes | computed styles and class mapping | visual test |
| D-08 | One B3 per major region and one B4 maximum per screen | DOM/class count | visual test |
| D-09 | Core palette matches constitutional hex values | CSS variable assertion | token test |
| D-10 | Semantic color area remains at or below 15% | pixel sampling on required screenshots | screenshot audit |
| D-11 | Color expresses state, not decorative gradients | no neon map palette in CLO shell | screenshot audit |
| D-12 | Typography uses system UI and monospace metadata | computed font-family assertion | visual test |
| D-13 | Minimum text size is 10px | computed style scan | visual test |
| D-14 | 320x224 thirds structure major screens | stage grid geometry is measurable | screenshot/DOM test |
| D-15 | Evidence map is 2.5D information drawing | no realtime 3D engine or arbitrary scene | source/screenshot review |
| D-16 | Z-plane layering is restrained | structural/active/overlay layers have limited shadows | visual review |
| D-17 | Inspector is a fixed shared surface | same inspector DOM contract across routes | UI test |
| D-18 | Inspector has DETAIL/LINKS/PROOF/HISTORY tabs | exact labels and local selection behavior | UI test |
| D-19 | No equal six-card dashboard | Command has bands and unequal fields | screenshot review |
| D-20 | No explanatory hero copy | first visual mass is operational state/action | screenshot review |
| D-21 | Empty states are action-oriented | missing data includes a next action, not marketing copy | UI review |
| D-22 | Route transitions are restrained | no continuous decorative animation | source/screenshot review |
| D-23 | Mobile fallback preserves hierarchy | 1024 and mobile screenshots maintain action/inspector order | screenshots |
| D-24 | Focus and selected states are visible without hover | keyboard screenshot set | accessibility review |
| D-25 | Required screenshot set exists | 8 core routes + secondary routes + state variants | screenshot manifest |

## E. Accessibility, Interaction, and Performance, 10 points

| ID | Requirement | Measurement | Evidence |
|---|---|---|---|
| E-01 | Cmd/Ctrl+K opens object search | keyboard test | UI test |
| E-02 | Cmd/Ctrl+1–9 switches routes | keyboard test | UI test |
| E-03 | Escape closes drawers and overlays | keyboard test | UI test |
| E-04 | Lists and chronology support arrow/Enter navigation | keyboard test | UI test |
| E-05 | Tab order follows shell hierarchy | accessibility tree audit | UI test |
| E-06 | Critical content is never hover-only | DOM/a11y review | UI test |
| E-07 | Search feedback target is under 100ms perceived | seeded benchmark | performance test |
| E-08 | Warm route response target is under 250ms | seeded benchmark | performance test |
| E-09 | Long lists are virtualized or paginated | 10,000-item fixture remains responsive | performance test |
| E-10 | Background work does not block selection | job fixture plus interaction benchmark | performance test |

## F. Verification, Documentation, and Delivery, 5 points

| ID | Requirement | Measurement | Evidence |
|---|---|---|---|
| F-01 | Unit tests cover state colors, completeness, hashing, deadlines, provenance, and export gating | test files and passing run | test report |
| F-02 | Integration test covers import-to-export happy path and restart | one passing end-to-end fixture | test report |
| F-03 | Screenshot capture is reproducible without foreground takeover | capture command and manifest | script/report |
| F-04 | Every failed criterion has an owner and next action | status ledger | `docs/CLO-STATUS.md` |
| F-05 | Delivery commit and remote branch are traceable | `git log`, remote URL, push result | git output |

## Grade Ledger Rules

1. A criterion is not passed because code exists; the listed measurement must be run.
2. A screenshot criterion is not passed from a DOM assertion alone.
3. Seed data is valid test data, not production evidence.
4. Any regression of a hard gate blocks release and resets the overall grade to `C` maximum.
5. The status ledger must include score, grade, timestamp, test command, and unresolved criterion IDs.
