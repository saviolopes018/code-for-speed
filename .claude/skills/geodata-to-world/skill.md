---
name: geodata-to-world
description: Converts geographic road and building data into normalized game-world geometry.
paths:
  - src/world/**
  - public/maps/**
---

Use this pipeline:

SOURCE DATA
↓
Parser
↓
NormalizedMapData
↓
Coordinate conversion
↓
Road/building generation
↓
Optimization
↓
Game world

Never make rendering code understand raw GeoJSON.

Convert geographic coordinates into local game coordinates around an explicit origin.

Normalize:

- roads
- building footprints
- road classifications
- optional building heights
- optional metadata

Discard irrelevant metadata early.

Generated world geometry must remain deterministic for identical input and configuration.

Gameplay usability is more important than geographic centimeter-level accuracy.
