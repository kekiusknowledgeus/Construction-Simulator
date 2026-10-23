# SITE — Construction Simulator

A playable local React + TypeScript + Three.js MVP. Cannon-es drives falling rigid bodies. All buildings, crew and equipment use procedural geometry; no asset packs or API keys are needed.

## Run

Requires Node.js 22.12+ (tested with Node 24).

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173. `npm run build` creates `dist/`. `npm test` runs the simulation regression tests.

## First playthrough

1. Leave the default 1500 sq ft, G+1, three bedrooms and two bathrooms, or enter a description and choose **Generate from prompt**.
2. Choose **Generate building**. The plot and foundation plan appear; **Floor plan** opens conceptual room zones.
3. Choose **Start construction**. Watch at 1×, 2×, 5× or 10×; **Timelapse** selects 10×. Pause/resume is supported.
4. Toggle **Structural view**, click members, or use **Inspect first column**. The panel shows member dimensions, grade, capacity, load, utilization, health and connections.
5. Once slabs exist, add loads to bay 1 on a chosen floor. Repeated +100 t loads eventually exceed capacity. Or select a completed column/foundation and use **Damage this support** to test redistribution.
6. Failed parts crack, detach and fall, collide with remaining structure and settle on the ground. **Reset** clears loads and damage; **Rebuild** resets and starts construction again.
7. Finish construction, choose **Make it yours**, change finishes, and click **Apply finishes**. Use the floor selector for interior cutaways. Before/after compares the current finished result with empty land.

## How the MVP works

- `src/model.ts`: serializable specification, materials, structural members and construction states.
- `src/parser.ts`: replaceable `PromptParser` interface and deterministic local parser. It recognizes common area/floor/room/location/finish phrases, not arbitrary natural language. Review generated fields.
- `src/generator.ts`: room zones, 3×3 support grid, columns, beams, floor bays, opening geometry, roofs, balconies and illustrative costs. **Area means total built area**, distributed equally among floors. Maximum five floors. Conceptual zones may overlap and are not usable architectural drawings.
- `src/simulation.ts`: dependency graph, dead/live load distribution, support detachment, capacity checks, redistribution, persistent failure history and construction stage interpolation. Live loads remain attached to bay 1; they are removed from the standing graph when that bay falls.
- `src/Viewport.tsx`: rendering, camera/orbit controls, staged meshes, crew/equipment movement, finish transitions and Cannon-es rigid-body collapse. Structural response is deterministic; debris motion is visual physics.
- `src/App.tsx`: editable controls, playback, inspection, experiments, local specification persistence and presentation.
- `src/simulation.test.ts`: generation, construction stability, load transfer, deterministic overload, progressive support loss, material sensitivity, animation state and prompt parser tests.

The data/generator/simulation modules do not depend on React or Three.js and can be translated to UE5 data structs and gameplay systems later. Replace the viewport with Unreal actors while preserving IDs and support connections. Cannon-es itself would be replaced by Chaos physics.

## Deliberate MVP simplifications

This is a **game simulation, never an engineering design tool**. Capacities, loads, soil strength, reinforcement, pricing and schedules are illustrative. No code compliance, finite-element analysis or real construction planning is provided. Layouts are approximate zones; there is no CAD editor, working services, or detailed circulation/stair design. Crew/machinery are animated placeholders; demolition uses whole member rigid bodies rather than fracture meshes. Specifications persist locally; playback/debris state resets when the page reloads. There is no backend or connected LLM. Google Fonts is optional; system fonts work offline.
