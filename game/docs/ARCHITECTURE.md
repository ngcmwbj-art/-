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
  or the whole screen with translucent controls over its edges on wide tablet windows. There (an iPad held
  sideways) the controls stay fixed in the bottom corners and the text keeps off them (2026-09-30):
  `engine/safezones.ts` — `buttonZones()` (game px, null everywhere else: then every screen is as designed),
  `freeSpan(y0, y1)` (the free run of x between them for those rows), `buttonsTop(x0, x1)`. The dialog
  window, the battle's bottom row (`battle/ui/panels.ts` `ROW`), the fishing gauge, the key guides, the HUD's
  hanko plate and place name, the title read them. Text windows still call `markText(x, y, w, h)` (game px,
  the box at rest; `brief = true` for words up only for a moment: the controls in their way fade out) or
  `markTextScreen()` (a whole text screen — the menu, a shop; since 2026-10-01 it too stays full screen with the
  controls fixed: `ui/menu/notebook.ts` `clearLeft`/`listDx`/`pageText`/`tabSpots`, the shop's `desc()` =
  `dialogFrame()`, the dome card lay their contents out round them) from `engine/textzones.ts`; `uiBands()` /
  `__game.cmd.textZones()` read the last frame's (30 10.11). A new text window near the bottom corners must keep
  off `buttonZones()`.
- `ui/autosave.ts`: autosave into the one save slot when Minato stands free on the field after a map change or a
  battle that gave EXP (note 「オートセーブ」 top right), and silently when the page is hidden. Touch 「もどる」
  hides while he can walk (`setBackShown` in engine/touch.ts); `Input` latches presses shorter than a frame.
- `audio/keepalive.ts`: brings the AudioContext back after the system stops it (alarm, call, app switch):
  resume on page show / focus / any gesture, plus a 1 s retry; SFX and blips are skipped while it is stopped.

## HD-2D layer (2026-10-05 prototype → 2026-10-06 chapters 1 and 2 in every build, 02 #85)

A 3D picture of the field, made with three.js (the one library added, with the client's approval). Only
the picture changes: walking, collisions, talking, events, menus and battles are the 2D game's own.

- **Where it runs**: since 2026-10-06 (依頼主「第1章全部HD-2Dにして」) every build has it. `main.ts` imports
  `src/hd2d/` once the title is up, when HD-2D is wanted (せってい「表示 HD-2D／2D」, `ui/settings.ts`
  `settings.hd2d`, saved, default HD-2D; someone who chose 2D never loads three.js). It draws chapter 1's places
  (`map_town`, the 5 outdoor places of `places.ts`, the 24 rooms of `room.ts`), chapter 1's battle backgrounds
  (`battle.ts`, `src/battle/bg/place.ts`) and the ending's cuts (`cut.ts`, `cut_night.ts`), and since the same
  day (依頼主「第２章もHD-2Dにしてみよう」, 02 #85 直し6) chapter 2's too: the 4 outdoor places (`map_hoshimidai`,
  `map_hoshi_hill`, `map_hoshi_sawa`, `map_hoshi_urayama`), the 22 rooms of `room.ts` `CH2_ROOMS`, the battle
  backgrounds of `src/battle/bg/hoshi*.ts` and the cuts (`cut_ch2.ts`: the prologue's crossing, the ending's
  `CH2_SHOTS`, the sunrise and the village lit up). No WebGL → 2D, and the settings page says so. `?hd2d=0|1`
  (`&hd2dq=light|normal`) and `__game.cmd.hd2d(true|false|null)` override it for the session. The demo build
  (`VITE_HD2D_DEMO=1`, `npm run artifact:hd2d`) starts 「はじめる」 in 夕鳴銀座 (`ui/flow.ts` `setNewGameStart`).
  The playthrough runs 2D (`?hd2d=0`) unless `--hd2d` (`--slow n` for its waits). (The paragraphs below were
  written for the prototype; where they say "map_town only" read "chapter 1".)
- **Chapter 2's night** (直し6): the 2D's light map (night colour, dark, the starlight at the feet, the tomato
  light's three rings, Tetsuya's beam, street lamps and windows) is painted each frame round the camera
  (`cut_night.ts` `nightMul`; rooms `room_hoshi.ts`, at half the room's px) and every face and character is
  multiplied by its value where the 2D picture shows that point (x, z − height/SV); the sky light and the
  grade's mul are white (the dark is in the map), glow layers are added on top unmultiplied. litOnly finds show
  only inside the light as in 2D (the flat ones on one small sheet per group of them, `water3d.ts` `litDecals`, left
  alone while the light is away: the night's animal tracks lie all round the village, 02 #87). Light quality paints the map every other frame. Outdoor battles key out the
  still's sky (a second silhouette pass) and lay the background's own 2D sky under it.
- **Layers**: the WebGL canvas is offscreen. `FieldScene.draw()` asks `setFieldDrawer()`'s hook first; in HD-2D it
  renders the town, hands the canvas to `Screen.underlay`, and clears the 2D buffer to transparent before the
  world fx, the emotes, the HUD, the windows and the fade go on top. `Screen.present()` lays the underlay over the display canvas, then the buffer (the buffer has alpha since
  then; the display canvas is still opaque). The touch controls (DOM) and the safe zones are untouched, and
  `#screen.toDataURL()` holds both layers. `FieldScene.worldToScreen()` projects through the 3D camera
  (`setFieldDrawer`'s second hook), so bubbles and HUD marks follow the 3D town.
- **The town** (`hd2d/town.ts`): every surface is a 2D picture already in the game (NearestFilter, alphaTest).
  The ground = the ground chunks + flat decals. A building (`PropArt.box` from `bkit.registerBuilding`: top px,
  R roof rows, F facade rows) = the facade rows standing at the foot line, the roof rows on a box R tiles deep,
  the strip above the roof at its back edge; `hd2d/tune.ts` adds hand-cut pieces for 夕鳴銀座 (the ひのや and
  豆くま吉 boards, the chimney, the clock on its pole) and roof slopes. Other props, their fg parts and the ASCII
  walls stand from their foot line: the rows above it stand, the rows below lie on the ground (with bodies since
  round 2, below). Standing things are stretched by `SV` = tan(pitch) (×0.84 at 40°) so they keep their 2D
  proportions under the tilted camera. Glows are emissive maps (bloom),
  the nearest 4 also get a point light (normal quality). A cut-out in front of Minato turns see-through (the 2D
  x-ray); canopies fade as in 2D. Thin pictures and tree crowns cast long shadows from shadow-only planes turned
  to the sun; those of the props that are always there share one mesh over one atlas (`CasterSet`).
- **Bodies** (round 2, 2026-10-05): props are no longer flat. `hd2d/props3d.ts` stands a prop's picture up with
  the body its id gets in `tune.ts` `SOLID` (default: a slab a third of its smaller side deep): `slab` = the
  painted pixels pushed back N px (`solid.ts` `extrude`: one front quad, only the silhouette's edge faces, merged
  along runs, each in the colour of its edge pixel — the voxel look; vending machines, mailboxes, crates come out
  as boxes), `pole` = the tallest run of columns from the foot an 8-sided column (`prism`) wrapped in those
  columns, the rest (arms, signs, lamps) pushed back, `tree` = the trunk a column, the crown crossed boards
  (three facing the camera, one across), `flat` = as before (creatures, things lying flat). The ASCII layer
  (`hd2d/walls.ts`): block walls 4px boxes (face rows in front, cap rows on top, a north–south run a box down the
  cells with the material's face on its sides), hedges boxes (face rows, top rows), mesh fences two panels with
  the top rail, guardrails / pipe rails / ropes pushed back 3px, the railway fence rails and posts; one atlas,
  one mesh. The ground's tiles have heights (`STEP`: paving 2px up, the canal 6px and the paddies 2px down) with
  the step faces the camera sees; characters and props stand on them. Light quality leaves thin slabs flat.
- **Past the edges**: in the 3D town the camera does not stop at the map's edges (`setFieldDrawer`'s third hook
  `freeCam`, read by `FieldScene.cameraTarget()`; 2D is unchanged), so the land outside is drawn
  (`hd2d/outskirts.ts`, `town.ts` `MARGIN` 16 / 14 / 8 tiles): the ground of the edge tiles goes on (`bakeGround`
  clamps to the edge, so the road, the river and the paddies run on without a seam; baked once per map), the walls,
  hedges and fences that cross an edge go on, and further out houses (the town's house pictures, some mirrored),
  trees, poles and, north of the park, the school (`LAYOUT`, one atlas, one mesh, a step darker). Nobody walks
  there (collisions are the 2D map's).
- **Draw calls**: props whose picture never changes (no animation or glow, no `cond`, no x-ray) share one atlas and
  one mesh (`PropBatch`: one for those that take the shadow map, one for thin ones, tinted by vertex colour);
  the shadows of everything always there with a body go through one more mesh drawn into the shadow map only
  (`ShadowSet`; `solid.ts` `shadowOnly` culls a mesh from the picture while `markShadowPass` lets the shadow pass
  draw it — the sun-facing planes of `CasterSet` and the characters too). At 17:00, normal (PC / iPad): 夕鳴銀座
  163 → 116 draw calls, 川べり 190 → 127, the west edge 169 → 87, the park 96 → 83; light (iPhone): 149 → 102,
  176 → 113, 155 → 72; ~30–32k triangles (was ~2.6k). A rebuild (a door back, a warp) ~0.2–0.5 s (was 0.4–0.65);
  the first one also bakes the land outside (once per map; 4 tiles past each edge, repeated further out).
- **Characters** (`hd2d/actors.ts`): the current 2D frame on an upright plane, unlit, a round contact shadow, and
  the long shadow from a second, shadow-only plane turned to the sun (from `data.shadowFrame` when it lags: the
  cat, fushigi_02); darker inside a building's shadow. An actor with a `drawFn` (the traffic, the stray carts) is
  drawn into a picture of its own each frame. One standing inside a building's box (くま吉 behind his open shop
  front) is brought along the line of sight to just behind the facade (same place on screen).
- **World fx and close-ups** (round 3, 2026-10-05): `FieldScene.projected(x, y, foot)` (the project hook, now
  with a foot line) maps a 2D world point to the frame through the 3D camera, lifted to its height over `foot`.
  An effect registered `anchored` places what it draws with `world/fx.ts` `fxAt()` (2D: `x − cx, y − cy`) and is
  drawn straight onto the HD-2D layer at 1×: the loudspeaker's sound at its horns, bubbles over heads, the stamp's
  seal and ink, sparrows, dragonflies, the mirror's inset, the Z's over the napping driver… (the town's ones all
  are; any other is still laid on as a 2D drawing round the screen centre). A story close-up (`events/stage.ts`
  `ZoomView`, `zoomIn(…, foot)`) centres on the projected point; in HD-2D the camera narrows to the same rect of
  the frame (`setViewOffset`; `closeUp(f)`, `view.ts` keeps an uncropped `eye` for the 2D layer's px) while the
  close-up blows up the 2D layer as before, and the tilt-shift focuses on what it looks at.
- **Solids in each other's way** (round 3): while the town is stood up, every building, prop (its fg parts too),
  wall cell and outskirts thing notes the room it takes (`hd2d/overlap.ts` `Solid`: boxes in world px, heights in
  picture rows, the painted pixels). `__game.cmd.hd2dOverlaps({min, all, area})` (dev server only; the published page leaves it out) lists where a picture the 2D draws
  on top (the foot line further south; on one line the one further east) is buried in another solid, or two
  pictures stand on one plane; `hd2dSolids(name)`, `hd2dNudge(false)` (stand everything as before). The ones found
  are moved in `tune.ts` `NUDGE` (`id@x,y`): `z` = a few px south on the ground, `fgView` = its fg parts (a crown,
  a hung board) along the line of sight towards the camera (as many px south as up: the same place on screen).
- **Camera and light** (`hd2d/view.ts`): a perspective camera 40° down (`town.ts` `PITCH`), fov 26°, 25 tiles back,
  aimed 1.5 tiles north of the 2D camera's centre (`camX/camY`: look-ahead, the dialog slide, pans and locks carry
  over). A low sun from the
  west-south-west (length from `Grade.shadowLen`), sky/ground hemisphere light, a soft fog.
- **Finish** (`hd2d/post.ts`): bloom, a tilt-shift blur away from Minato's row, the field's `Grade` (mul, desat,
  glare, topDark — the same numbers as the 2D grade, so 17:00 tweens the same), the chime's wave, a vignette.
  `normal` = 2048 shadow map, bloom, two-pass tilt-shift, full display size (≤1920 wide); `light` = 1024 shadows,
  no bloom or lamps, one-pass blur, half size (≤960). Phones start light; tablets and computers start normal and
  step down once when more than a third of 2 s of frames are slower than ~38 fps. QA: `__game.cmd.hd2dStats()` (render ms, draw calls, triangles, size, `build`: ms per part of the last build), `hd2dQuality()`,
  `hd2dCam({pitch, fov, dist})`.

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
