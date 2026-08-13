# Field Atlas

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

## Run locally

```bash
python3 -m http.server 4173
```

Open `http://127.0.0.1:4173`.

## Data and deployment notes

- This is a static prototype; there is no backend or private data store.
- Public source availability and rate limits vary. Nominatim, Overpass, and NPPES should eventually be called through a server-side cache for production use.
- The map uses MapLibre with Carto dark raster tiles.
- Live source failures fall back to clearly labeled demo records for the two discovery lenses; the Moderate workspace stays empty by design.
