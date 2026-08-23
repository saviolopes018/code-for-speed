---
name: game-quality-gates
description: Required validation procedure before Code for Speed gameplay work is considered complete.
disable-model-invocation: true
---

Run all available project checks.

At minimum:

npm run lint
npm run typecheck
npm run test
npm run build

Run browser smoke/e2e tests when available.

Check browser console for fatal errors.

For gameplay changes also validate the affected domain.

Vehicle change:

- vehicle evaluation

World change:

- loading
- collisions
- performance

Rendering change:

- FPS/frame time
- visual regressions
- console

Race change:

- checkpoint flow
- lap flow
- finish flow
- restart

Report failures.

Do not claim completion while a required gate is failing unless the failure is demonstrably unrelated and explicitly documented.
