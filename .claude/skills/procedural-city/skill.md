---
name: procedural-city
description: Generates performant Brazilian-inspired urban environments from normalized map geometry.
paths:
  - src/world/**
---

Generate cities from reusable procedural systems rather than unique handcrafted geometry wherever practical.

Buildings:

footprint
→ height
→ extrusion
→ facade family
→ rooftop variation

Use deterministic seeded variation.

Prefer a small number of reusable material families.

Possible building families:

- residential
- commercial
- industrial
- generic

Urban props should use instancing where practical.

Examples:

- street lights
- barriers
- signs
- trees
- posts

Do not add decorative complexity that materially damages frame time.

Brazilian visual identity should come from environment language, proportions, props and signage, not copyrighted brands.
