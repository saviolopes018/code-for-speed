# Map Generation

## Data policy
Open data only. **No Google Maps scraping, no Street View imagery, no derived assets.**
Use OpenStreetMap / Overture / hand-authored GeoJSON.

## Pipeline
```
GeoJSON → MapParser (parseGeoJSON) → MapData → BuildingGenerator → Three.js meshes
                                            → RoadGenerator (future) → road meshes
```
`MapDataSource` (`MapLoader.ts`) abstracts the origin: `GeoJSONSource` (fetch URL),
`InlineGeoJSONSource` (in-memory). `MapData` is engine-agnostic (footprints, roads, bounds).

## Coordinates
Fixture data is **pre-projected local metres** to avoid a mercator dependency for the MVP.
GeoJSON `[x, y]` → world `x = x`, `z = -y` (so +z points "south"). A real OSM/Overture
export should be projected to local metres before loading (a small offline step).

## Buildings (`BuildingGenerator`)
Footprint polygon → `THREE.Shape` → `ExtrudeGeometry` (height from `height` or
`levels × 3.2`) → merged per category (`commercial|residential|industrial|generic`) into
one mesh each for few draw calls. Each building gets an axis-aligned bounding-box static
collider. Small deterministic colour variation avoids visual repetition.

## The city (`ProceduralCity` + `World`)
For the vertical slice the district is emitted as a deterministic GeoJSON
FeatureCollection on a grid (Mulberry32 PRNG), skipping cells near the track curve, then
run through the SAME parser. This keeps the pipeline honest while guaranteeing a dense,
track-aware city. `public/maps/urban.geojson` is a small file fixture demonstrating the
same format (also covered by the MapParser unit test).

## Roads
The playable circuit is procedural (`TrackBuilder`): closed Catmull-Rom spline → road
ribbon mesh + dashed centre line + edge barriers (instanced mesh + per-segment colliders)
+ evenly spaced checkpoint gates. A GeoJSON road→mesh generator is a future extension.

## Scale
Keep it small and dense (~1–4 km²). Prefer "small + dense + fun" over "big + empty".
