# Subhasta / CLO

## Master completion ledger

The implementation ledger is executable and repository-local:

- `docs/MASTER-LEDGER.json` contains 1,300 atomic requirement records: the original 1,050 plus a 250-point 1540 N. Vine machine extension.
- `docs/MASTER-LEDGER.md` is the review projection.
- `docs/source-registry.json` records indexed attachment sources, hashes, and source families.
- `docs/source-extracts/` preserves the original pasted text used for intake.
- `npm run ledger:build` regenerates the registry and ledger from the local attachment directory.
- `npm run ledger:check` verifies the persisted ledger contract.
- `scripts/import-1540-machine.py` imports the newer 1540 N. Vine workbook into the local-only machine fixture; the raw property fixture is intentionally ignored from public Git delivery.

The ledger distinguishes `IMPLEMENTED`, `TESTED`, and `VERIFIED`; scaffolding is not automatically treated as complete.

Subhasta is an Electron litigation operating environment. CLO is the primary shell; Field Atlas and Cicero are secondary tools mounted from the same desktop navigation. The repository currently contains a seeded local case store and a functional first implementation of evidence staging, SHA-256 provenance, extracted text, audit history, proposition creation, draft building, validation gating, and contextual imports.

The primary seeded matter is the supplied `1540_Vine_Camden_Litigation_War_Room.xlsx` baseline. Its 287-unit matrix, 41 legal fronts, evidence registry, critical clocks, authorities, property facts, and handling rules are preserved in `fixtures/camden-1540-vine.json` and surfaced through the Camden `COVERAGE` route. Workbook leads remain context until primary evidence is committed.

## Current quality gate

The build is measured against [the hyper-precise CLO acceptance rubric](docs/CLO-RUBRIC.md). The current implementation tranche is summarized in [the status ledger](docs/CLO-STATUS.md); the full completion ledger is the 1,050-item master ledger described above. The master ledger is the authoritative completion count.

## Desktop structure

- `electron/main.cjs`: main process, window, dialogs, and IPC handlers.
- `electron/preload.cjs`: narrow renderer bridge.
- `electron/store.cjs`: versioned local case store, provenance, audit, and action mutations.
- `electron/hash-worker.cjs`: background SHA-256 and text extraction worker.
- `clo/`: primary renderer shell, routes, inspector, status strip, and evidence drawer.
- `index.html`, `main.js`, `styles.css`: Field Atlas secondary surface.
- `cicero/`: Cicero organizational analysis secondary surface.
- `tests/store.test.cjs`: repeatable persistence and provenance test.
- `tests/performance.test.cjs`: 10,000-object search feedback benchmark.

## Verification

Run the store test with the project Node runtime:

```bash
npm run test:store
```

Run the constitution test and the background screenshot runner:

```bash
npm test
CLO_BACKGROUND_CAPTURE=1 npm run capture:screenshots
```

The screenshot runner writes the route set to `artifacts/screenshots/` and never calls `show()`.

## Field Atlas

Field Atlas is a simple, map-first prototype for discovering job-specific records inside a geographic area. It keeps the dark, full-screen map composition of RentSeeker while separating the data collector from the interface.

## Included lenses

- **Car dealerships**: queries OpenStreetMap through Overpass for `shop=car`, `shop=car_repair`, and `shop=motorcycle` records.
- **Spine surgeons**: queries the federal CMS NPPES NPI Registry API using orthopedic-spine and neurological-surgery taxonomy codes, then filters returned provider locations by the selected radius.
- **Moderate**: a separate trust-and-safety review workspace. It intentionally does not match, recommend, or associate extremist users with one another. A future version can add locally supplied review cases, policy labels, an acceptance-net rubric, and paid moderation/review workflows without turning those signals into a recruitment graph.

## Adding another job

Add a new entry to `JOB_LENSES` in `main.js`. Each lens declares its label, source, collector, color, and source-specific query fields. Implement the collector next to `fetchOverpass`, `fetchNppes`, or `fetchModerate`, then normalize its output to the common record shape:

```js
{
  id,
  name,
  kind,
  category,
  address,
  lat,
  lng,
  source,
  tags,
  url
}
```

This is the hook for adding NAICS-backed jobs later: a job profile can map a NAICS code to a federal, state, licensed, or OSM collector without changing the map UI.

## Run Field Atlas as a static surface

```bash
python3 -m http.server 4173
```

Open `http://127.0.0.1:4173`.

## Data and deployment notes

- Field Atlas collectors remain public-source, client-side prototype adapters. CLO evidence persistence is local to the Electron application store and is separate from contextual Field Atlas imports.
- Public source availability and rate limits vary. Nominatim, Overpass, and NPPES should eventually be called through a server-side cache for production use.
- The map uses MapLibre with Carto dark raster tiles.
- Live source failures fall back to clearly labeled demo records for the two discovery lenses; the Moderate workspace stays empty by design.
