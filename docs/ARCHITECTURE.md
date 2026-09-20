# Architecture Notes

This document gives agents a compact mental model of the application. Keep it current when routes, shared layers, or lifecycle behavior change.

## Runtime shape

```text
index.html
  -> src/main.ts
     -> Pinia (installed; no active store consumers)
     -> Vue Router
        -> HomeView
        -> ToolLayout
           -> AbWorkout
              -> presentational components
              -> useWorkoutTimer
              -> useWorkoutAudio
              -> useWakeLock
           -> RandomCountdown
              -> Web Audio + timers + wake lock (local implementation)
```

The application is entirely client-side. Vue Router uses HTML5 history mode, and `public/_redirects` rewrites Cloudflare Pages requests to `index.html`. If this fallback is removed or narrowed, direct loads of tool routes will fail in production.

## Navigation and discovery

Routes and home-page cards do not come from one shared registry:

- `src/router/index.ts` controls navigation.
- `src/views/HomeView.vue` controls discovery on the landing page.

A new available tool must be registered in both places. The catch-all route redirects unknown locations to `/`.

## Workout timer flow

`AbWorkout.vue` is the coordinator. The timer composable deliberately owns state and transitions while audio and wake-lock effects remain separate.

```text
Start click
  -> acquire wake lock (best effort)
  -> reset/start workout state
  -> play opening countdown
  -> after the clip duration, schedule cues and start 1-second interval

Each tick
  -> decrement timeLeft
  -> watcher sees 1 -> 0
  -> advance exercise/round or finish
  -> play transition cue and schedule next cues

Pause/resume
  -> toggle paused state
  -> cancel or rebuild scheduled audio cues
  -> on resume, replace the interval

Finish/reset/unmount
  -> stop interval
  -> clear audio timeouts
  -> release wake lock
```

Important invariants:

- The final break of the final round is skipped.
- `currentRound` starts at 1; `currentExerciseIndex` starts at 0.
- Exercise and overall progress are derived from `timeLeft`, not stored separately.
- Only one timer interval and one timeout per scheduled sound category should remain active.
- The opening countdown delays the interval. Changes to its duration or load failure can affect when the workout begins.
- Mini-window mode is selected by the presence of the `mini` query parameter. It affects layout and suppresses mobile detection/pop-out controls.

## Random countdown flow

`RandomCountdown.vue` validates a positive minimum/maximum range, acquires wake lock, then recursively schedules one random timeout at a time. When a timeout fires, it produces an alarm pattern with Web Audio, shows the bell animation, and schedules the next random delay while running.

Stopping or unmounting must clear the countdown timeout and bell timeout, hide the bell, and release wake lock. AudioContext creation and wake-lock acquisition are best effort because support and permission vary by browser.

## Styling and layout

`App.vue` defines global styles and locks the document to the viewport. Tool and view styles are scoped locally. `ToolLayout.vue` constrains tool content to 800px while individual tools typically constrain themselves to 500px.

The no-scroll design is a functional constraint, not just decoration. New content can become inaccessible if its height exceeds the viewport, especially on mobile browser chrome changes or landscape devices. Prefer compact responsive layouts and test with dynamic viewport height behavior.

## Testing seams

There are currently no tests. The most valuable initial unit coverage would target deterministic state in `useWorkoutTimer.ts`:

- time formatting and progress percentages;
- exercise and round advancement;
- skipping the final break;
- pause/reset/finish state;
- interval cleanup with fake timers.

For component tests, stub browser boundaries instead of requiring real capabilities:

- `HTMLMediaElement.play` and audio metadata/load events;
- `AudioContext`;
- `navigator.wakeLock` and the returned sentinel;
- `window.open`;
- timers through Vitest fake timers.

Keep a small amount of manual browser validation for gesture-gated audio, popup policies, mobile viewport behavior, and real wake-lock lifecycle; DOM tests cannot fully represent those behaviors.

## Deployment contract

- `npm run build` performs type-checking and bundles the app.
- `npm run build-cloudflare` only bundles the app.
- Vite writes deployable output to `dist/` with base path `/`.
- `public/` files are copied into the build, including `_redirects`.
- The production target is Cloudflare Pages; no runtime server configuration is present in this repository.
