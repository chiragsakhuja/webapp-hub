# Agent Guide

This file is the operating guide for automated contributors in this repository. Read it before changing code. For the component and state-flow map, also read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Repository purpose

This is a small, client-only collection of single-page utilities built with Vue 3, TypeScript, Vite, Vue Router, and Pinia. It is deployed as a static SPA to Cloudflare Pages.

The current tools are:

- **Ab Workout Timer** at `/ab-workout`
- **Random Countdown** at `/random-countdown`

There is no server, database, authentication layer, or API client. Browser APIs provide audio, popup-window, timer, and screen-wake-lock behavior.

## Start here

1. Run `git status --short --branch` and preserve unrelated work.
2. Install the locked dependency graph with `npm ci` when `node_modules/` is absent or stale.
3. Use `npm run dev` for local development.
4. Before handing off a change, run the checks appropriate to it (see below) and inspect `git diff`.

Do not edit generated files in `dist/` or dependencies in `node_modules/`.

## Commands

| Command | Purpose | Notes |
| --- | --- | --- |
| `npm run dev` | Start the Vite development server | Browser-only behavior needs manual testing here. |
| `npm run build` | Type-check and create a production build | Primary required validation; outputs to ignored `dist/`. |
| `npm run build-cloudflare` | Create the deployable Vite bundle | Does not run the TypeScript check. |
| `npm run type-check` | Run `vue-tsc` | Useful for a quick TypeScript/Vue check. |
| `npm run lint` | Run ESLint with automatic fixes | This mutates files. Inspect the diff afterward. |
| `npm run format` | Format `src/` with Prettier | This also mutates files. Keep changes scoped. |
| `npm run test:unit -- --run` | Run Vitest once | No tests exist yet, so the baseline exits with “No test files found.” |

To inspect lint without modifying files, run:

```sh
npx eslint . --ext .vue,.js,.jsx,.cjs,.mjs,.ts,.tsx,.cts,.mts \
  --ignore-pattern dist --ignore-pattern node_modules
```

The repository should pass this read-only lint command. If it does not, distinguish pre-existing findings from errors introduced by the current change and report both accurately.

## Code map

- `src/main.ts` creates the app and installs Pinia and the router.
- `src/App.vue` owns global viewport, theme, button, and card styles.
- `src/router/index.ts` defines all routes and the unknown-route redirect.
- `src/views/HomeView.vue` is the landing-page catalog. Its `tools` array is separate from the router and must be kept in sync manually.
- `src/components/tools/ToolLayout.vue` supplies the shared tool page shell and back link.
- `src/components/tools/AbWorkout.vue` orchestrates workout UI, timer, audio, wake lock, and mini-window mode.
- `src/composables/useWorkoutTimer.ts` owns workout state transitions and progress calculations.
- `src/composables/useWorkoutAudio.ts` preloads clips and schedules workout sounds.
- `src/composables/useWakeLock.ts` wraps the Screen Wake Lock API.
- `src/components/tools/RandomCountdown.vue` is currently self-contained and uses Web Audio, timeouts, and wake lock directly.
- `public/_redirects` provides Cloudflare Pages history fallback for Vue Router.
- `src/stores/counter.ts` is unused Vue starter code; do not treat it as active application state.

## Change conventions

- Use Vue Single-File Components with `<script setup lang="ts">`.
- Prefer Composition API primitives (`ref`, `computed`, lifecycle hooks) and explicit TypeScript interfaces for props and emitted events.
- Use the `@/` alias for imports rooted at `src/`; use relative imports for tightly coupled sibling components.
- Keep tool-specific UI in `src/components/tools/`. Extract reusable stateful behavior into `src/composables/` when more than one component or substantial orchestration benefits from it.
- Preserve the existing visual language: purple/blue gradient, translucent cards, white text, green primary actions, yellow secondary actions, rounded corners, and responsive rules.
- Preserve the full-viewport/no-scroll assumption unless the task intentionally changes layout behavior. Test both mobile portrait and short landscape layouts when touching sizing.
- Treat audio playback, wake lock, `window.open`, and timers as fallible browser capabilities. Keep graceful failure paths and clean them up on unmount.
- Avoid drive-by reformatting and unrelated cleanup.

## Adding a tool

Adding a tool requires all of the following:

1. Create `src/components/tools/<ToolName>.vue`, normally wrapped in `ToolLayout`.
2. Add a lazy-loaded route in `src/router/index.ts`.
3. Add the matching catalog entry in `src/views/HomeView.vue`.
4. Confirm direct navigation and refresh work through SPA fallback behavior.
5. Exercise the page at narrow mobile width and desktop width.

If the tool relies on browser APIs, verify the unsupported/denied path as well as the happy path.

## Validation expectations

Always run `npm run build` for code changes. Then add the checks relevant to the change:

- Router/catalog work: open `/`, navigate through the card, directly load the tool URL, and try an unknown URL.
- Timer work: verify start, pause/resume, reset or stop, transitions at zero, completion, and unmount cleanup.
- Audio work: test after an explicit user gesture; browsers may block autoplay. Check missing/failed audio without crashing the tool.
- Wake-lock work: test both supported and unsupported/denied behavior and confirm release on stop/completion/unmount.
- Responsive UI work: check desktop, mobile portrait, and short landscape; also check `?mini=true` for the workout tool.
- Tests: place Vitest files beside the unit under test or in `src/**/__tests__/`, using `.test.ts` or `.spec.ts`. Note that `tsconfig.app.json` currently excludes `src/**/__tests__/*` from the app build.

Report commands run, outcomes, and any skipped browser checks in the handoff. Do not commit or deploy unless the user explicitly requests it.
