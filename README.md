# Area Scout

Simple RentSeeker-inspired website for mapping tagged OpenStreetMap features in a chosen area.

## What it does

- Search a city, neighborhood, or ZIP code
- Pull nearby OSM features from Overpass
- Show the results on a dark MapLibre map
- Surface the same kind of left-controls / map / right-details layout used in RentSeeker
- Fall back to demo pins if live lookup fails

## Run locally

```bash
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173`.

## Notes

- This is a static prototype.
- The map uses public Carto dark tiles.
- The live data source is Overpass + Nominatim.
