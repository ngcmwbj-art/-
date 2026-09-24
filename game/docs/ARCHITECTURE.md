# Architecture & team conventions

Browser RPG vertical slice. TypeScript + Vite, custom Canvas2D engine, **no image or audio files**:
all pixel art is authored in code (PixelCanvas / char-art), all sound is WebAudio synthesis.

## Run

```
cd game
npm install
npm run dev          # http://127.0.0.1:5173/   (?scene=<name> jumps to a registered scene)
npm run typecheck
npm run build        # subsets the font, typechecks, builds dist/
```

## Screen & rendering rules

- Internal resolution **384×216**, integer-scaled to the display (`engine/screen.ts`). Never draw at fractional
  coordinates: use `Gfx` helpers (they round) or round yourself.
- Tiles are **16×16**. Field character sprites are **16×24** (feet at the bottom row; origin = feet center).
- Text: `engine/font.ts` — DotGothic16 at 16px, crisp 1-bit glyphs. Full-width glyph = 16px, half-width = 8px.
  `LINE_H` = 18. Dialog box = 3 lines × ~21 full-width chars. Use `g.text(str, x, y, {color, shadow, outline, align})`.
- Colors are hex strings. Design palette lives in `docs/design/30_level_art.md`; shared UI colors in `ui/window.ts` (`UI`).
- Build art once and cache the resulting canvases (`PixelCanvas.toCanvas()`); never rebuild per frame.

## Engine modules (`src/engine/`, owned by the lead — ask before changing signatures)

| file | what |
|---|---|
| `game.ts` | `game` singleton: scene stack (`push/pop/replace/replaceAll`), `ui` overlay layer, `scripts` runner, post-fx (`flash`, `shake`, `fadeOut`, `fadeIn`, `hitstop`) |
| `co.ts` | generator coroutines. `yield ms`, `yield null` (1 frame), `yield () => cond`, `yield* subCo()`, `all(a, b)` |
| `input.ts` | actions `up/down/left/right/confirm/cancel/menu/dash`; `pressed`, `down`, `repeat`, `axis()`. Keys: arrows/WASD, Z/Enter/Space = confirm, X/Esc = cancel, C/Tab = menu, Shift = dash |
| `gfx.ts` | `Gfx` drawing: `rect/frame/line/circle/ring/img(src,x,y,{flipX,alpha,tint,tintAmount,scale})/text/clip/alpha/composite`, `silhouette()` |
| `pixel.ts` | `PixelCanvas` for authoring art: `set/rect/line/ellipse/poly/art(rows,palette)/dither/outline/edge/swap/blit/toCanvas`, `mix()` |
| `font.ts` | pixel text, `wrap()` with kinsoku |
| `tween.ts` | `ease.*`, `tween(obj, props, ms, ease)` coroutine, `animate(ms, fn)`, `approach()` |
| `particles.ts` | `Particles.burst(x, y, {count, speed, angle, life, colors, gravity, drag, shape, size})` |
| `rng.ts` | seeded `Rng`, `hash2`, `valueNoise`, global `rng` |
| `screen.ts` | `W`, `H` |

## Game-level contracts

- `game/state.ts` — `state` (party, inventory, money, flags, map/x/y/dir, taken), `flag/setFlag`, `addItem/removeItem/hasItem`, `saveGame/loadGame`.
- `ui/dialog.ts` — `yield* say(text | pages[], {name, voice})`, `yield* choose(options, {cancel})`, `yield* ask(text, options)`.
  Inline markup: `{w=300}` pause, `{c=#hex}…{/c}` color, `{shake}…{/shake}`, `{wave}…{/wave}`, `{spd=0.5}`.
- `ui/window.ts` — `drawWindow(g, x, y, w, h)`, `UI` colors.
- `battle/api.ts` — `const r = yield* startBattle({ enemies, initiative, boss, music, background, canLose })` → `'win' | 'lose' | 'flee'`.
  The battle module installs its implementation with `setBattleImpl()`.
- `audio/index.ts` — `sfx(id, {pitch, pan, vol})`, `playBgm(id)`, `stopBgm(fade)`, `duckMusic()`, `textBlip(voiceId, ch)`;
  sound content registers with `registerSfx(id, fn)` / `registerBgm(id, song)` in `audio/content.ts` (and files it imports).
- `boot.ts` — `registerScene(name, factory)`; the first scene is `?scene=` or `title`.
- `debug.ts` — `registerDebug(name, fn)`; available in the browser as `__game.cmd.<name>(...)`.
- `modules.ts` — side-effect imports of each subsystem's entry (`audio/content`, `data`, `world`, `battle`, `ui/scenes`, `events`).

## Engine updates (lead)

- `makeCanvas(w, h, { willReadFrequently: true })` for canvases you read back with getImageData.
- `Gfx.rect(..., alpha)` now multiplies with the current globalAlpha (and restores it).
- `Gfx.line` draws axis-aligned lines with a single fillRect.
- `boot.ts`: `createScene(name, params?)` builds any registered scene (e.g. `'gameover'`).
- `game/state.ts`: key items (`isKeyItem`) no longer count toward `INVENTORY_MAX`; `bagCount()` gives used slots.
- `tools/shot.mjs` re-waits for `__game` if Vite HMR reloads the page mid-run.
- `engine/touch.ts`: on-screen D-pad and buttons for touch devices. It sets `Screen.fixedScale` (device px per
  game px, may be fractional; drawn sharp-bilinear) so the picture fills the screen next to or below the controls,
  or the whole screen with translucent controls over its edges on wide tablet windows.
- `audio/keepalive.ts`: brings the AudioContext back after the system stops it (alarm, call, app switch):
  resume on page show / focus / any gesture, plus a 1 s retry; SFX and blips are skipped while it is stopped.

## Directory ownership (parallel teams: only edit what you own)

| path | owner |
|---|---|
| `src/engine/**`, `src/main.ts`, `src/boot.ts`, `src/debug.ts`, `src/modules.ts`, `src/game/state.ts` | lead |
| `src/world/**`, `src/art/tiles/**`, `src/art/props/**`, `src/data/maps/**` | world & level team |
| `src/battle/**`, `src/art/enemies/**`, `src/data/battle/**` (members/items/skills/enemies) | battle team |
| `src/ui/**` (except the contracts above keep their signatures) | UI team |
| `src/art/chars/**` | character art team |
| `src/audio/**` (except `audio/index.ts` API signatures) | sound team |
| `src/events/**`, `src/data/text/**` | scenario team |

If you need something from another team's module, use its public API. If the API is missing something,
add a small adapter in your own directory and mention it in your final report — don't edit their files.

## QA tooling

- `node tools/shot.mjs --inline '[{"wait":800},{"shot":"x.png"}]' --out <dir>` — Playwright (Chromium) driver.
  Steps: `wait, press, hold+ms, keys, eval, waitFor, pause, resume, advance, shot`. Screenshots are 3× (1152×648).
- `window.__game` in the page: `pause()`, `resume()`, `advance(ms)`, `scenes()`, `cmd.*` (debug commands registered by modules).
- Every module should register debug commands that let QA jump straight to its content
  (e.g. `__game.cmd.warp(map, x, y)`, `__game.cmd.battle(['enemy_x'])`).
- The dev server must be running for shot.mjs: `npx vite --host 127.0.0.1 --port 5173 &`.

## Quality bar

The target is a commercial indie RPG demo. No placeholders, no emoji, no plain colored rectangles standing in
for art, no unimplemented menu entries, no TODOs left in the shipped build. Every sprite has shading,
outline/readability, and animation where appropriate. Everything must be original (no MOTHER/EarthBound assets,
names, music or designs).
