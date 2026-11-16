# ParkingGameWeb

Realistic 3D parking game in Three.js 0.187 + TypeScript, Vite, Vitest, Playwright. Spec: `/workspace/ParkingGame-web-spec-v0.2.md`. Commands: `npm run typecheck`, `npx vitest run`, `npm run build`, `npx playwright test`.

## Division of work (subagents)

- The main agent owns game logic, input, cameras, levels, UI and their tests. Do not split work by job title.
- Delegate only two things:
  - **`procedural-modeler`**: procedural models and materials in `src/vehicle/`, `src/props/`, `src/materials/`. It must read `art/reference/` first and compare renders side by side with the references.
  - **`stage-reviewer`**: at the end of each stage or batch, hand it the commit range. It did not write that code; it reviews the diff and runs typecheck, vitest, build and e2e. Fix what it finds before reporting the stage done.
- Two levels only: subagents never spawn subagents.
- Start a fresh conversation for each stage. Hand off through this file and a plan file in `docs/` (files to touch, steps, acceptance criteria, what is done).

## Rules

- Keep code simple, few abstractions, no dead code. Commit each small feature.
- Ask before adding npm packages or external assets. Never print tokens or keys.
- Every user-facing string needs zh-TW and en.
