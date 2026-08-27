# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Educational first-person 3D browser game about smart/sustainable cities ("Cidade Inteligente e
Sustentável"), for Brazilian middle/high-school classrooms. Students explore a low-poly city,
answer quizzes at 12 discovery points, and their score lands on a live class ranking that the
teacher projects. **All UI text, comments, identifiers, and content are in Brazilian Portuguese** —
keep it that way.

## Commands

There is no build step, no bundler, no linter, and no test suite. Dependencies (Three.js,
Firebase) load from CDN at runtime, so `npm install` does nothing useful.

```bash
python -m http.server 5173     # or: npm run dev  (npx serve . --listen 5173)
```

Then open `http://localhost:5173/index.html` (game) and `/professor.html` (ranking panel).

**A server is mandatory** — the app uses ES modules, so opening `index.html` from `file://`
fails on CORS.

### Debug mode

Open the game with `?debug=1` to expose `window.jogo`:

```js
jogo.irPara('parque')      // teleport to a discovery point by its zones.js id
jogo.estado                // score, discoveries, timers, chase flags
jogo.perseguicao           // live chase object (animal, blocked shelter)
jogo.simular(3)            // run 3s of game logic without the browser's frame loop
jogo.finalizar('motivo')   // end the run and write to Firebase
```

`jogo.simular()` matters more than it looks: `requestAnimationFrame` does not fire in a
hidden or unfocused tab, so any automated browser check must drive the loop itself. It
calls the same `passo(dt, t)` the render loop calls, so chase outcomes, scoring, and HUD
updates all happen for real. Verification is manual via the browser; there is no automated
test suite.

## Architecture

Static site, no backend. Module graph (all under `src/`):

```
main.js ── world.js ── models.js     (3D geometry builders + ANIMAIS catalogue)
   │          └────── zones.js       (educational content + point placement)
   ├─── player.js                    (PointerLockControls, WASD, AABB collision)
   ├─── perseguicao.js               (chase-the-player mechanic)
   ├─── hud.js                       (minimap/compass canvas, counters, chase alert)
   ├─── firebase.js                  (write-only)
   └─── config.js                    (rules, chase tuning, password, Firebase URL)

professor.js ── config.js            (read-only; separate page, no game code)
```

**`main.js` owns all game state and screen flow.** Screens are `hidden`-toggled overlays in
`index.html`; `mostrar(tela)` hides every screen then reveals one. The render loop lives here,
as does scoring, the interaction panel, and the end-of-run Firebase write.

**`zones.js` is the single source of truth for content.** It exports `ZONAS` (5 themed zones,
each 2–3 points) and derives the flat `TODOS_OS_PONTOS` plus `TOTAL_PONTOS`. Every point carries
its `offset` from the zone center, a `build` function from `models.js`, an `explicacao`, a
`curiosidade`, and a `pergunta` (`opcoes` array + zero-based `correta` index). Adding or removing
a point automatically updates the HUD counter, minimap, completion bonus, and progress bar —
nothing else needs editing. Zone `centro` coordinates must stay aligned with the road grid in
`world.js` (`RUAS = [-72, 0, 72]`), since zones sit at road intersections.

**`world.js` builds the city and returns `{ pontos, areasSeguras, colisores, animar(t) }`.** Buildings are
generated procedurally from a fixed seed (`semente = 20260827` in `criarPredios`) so the map is
identical for every student — do not randomize it, students orient themselves by landmarks.
`colisores` is a flat array of `THREE.Box3` consumed by `player.js`. Each discovery point returns
an object with `marcarDescoberto()`, which recolors its beam/ring/label green.

**The chase is the consequence for a wrong answer.** `responder()` locks the panel, waits
`PERSEGUICAO.tempoAvisoMs`, then `iniciarFuga()` closes it and spawns an animal.
`Perseguicao.update()` returns `'nada' | 'salvo' | 'capturado'` each frame and `main.js`
routes that to `terminarFuga()`, which reopens the same question via
`abrirPainel(ponto, mensagemRetomada)`. Attempt count and wrong-answer marks survive the
chase through `estado.tentativas` / `estado.erradas`, so the question's point value keeps
decaying across escapes.

**Animation is push-based:** `world.js` collects closures into an `animaveis` array and
`mundo.animar(t)` runs them all each frame. Per-model animation is attached as
`grupo.userData.animar = (t) => {...}` inside `models.js` builders and picked up by `world.js`.

## Non-obvious constraints

### Firebase must never delete or overwrite

This is the project's hard rule, enforced structurally rather than by convention:

- `firebase.js` imports **only** `getDatabase, ref, push` from the SDK.
- `professor.js` imports **only** `getDatabase, ref, onValue, get`.
- `set()`, `update()`, and `remove()` are **not imported anywhere**, so they cannot be called.

Do not add them. Records go to `resultados/{turma}/{pushId}`; `push()` always creates a new child.
Both modules load the SDK via dynamic `import()` so the game still runs offline (it falls back to
`salvarBackupLocal` in `localStorage`).

`sanitizarTurma()` turns a typed class name into a Firebase key with an allow-list regex
(`9ºA → 9ºA`, `7.C → 7-C`, empty → `SEM-TURMA`). Avoid `\uXXXX` escapes in that regex — this
environment has rewritten them into literal control bytes in the file.

### CSS `hidden` vs. `display`

Any element toggled via the `hidden` attribute needs an explicit `[hidden] { display: none; }`
rule if its class also sets `display`. A class-level `display: grid/flex` outranks the UA
`[hidden]` rule and the element stays visible. This already bit `.prof-login`; check it whenever
you add a toggled overlay.

### 3D text labels

`criarLabel()` in `world.js` renders text to a canvas and sizes the result in **world metres**,
not pixels. Its `plano` flag matters:

- `plano: true` → flat `Mesh`, used for zone signs. A `Sprite` there rotates toward the camera and
  half of it sinks into the sign board and gets depth-culled.
- `plano: false` → `Sprite` with `depthTest: false` for floating point names, made visible only
  within 34 m (in the per-point `animar` closure) to avoid 12 labels cluttering the screen.

### Chase balance is a three-way constraint

`PERSEGUICAO.velocidadeAnimal` (m/s) must sit strictly between the player's walk and run
terminal speeds, which are `JOGADOR.velocidade / atrito` and
`JOGADOR.velocidadeCorrida / atrito`. Today: walk 4.4, animal 6.5, run 8.0 — so walking
gets you caught in ~7 s and running escapes in ~4–6 s. Touching any of those three numbers
(including `atrito`) breaks the mechanic in one direction or the other; re-check both cases
with `jogo.simular()` after changing them.

Two fairness rules exist because the naive version was unplayable, and both are easy to
delete by accident:

- `_pontoDeSurgimento()` spawns the animal **opposite the target shelter**, not simply
  behind the player. Spawning behind the player put the animal directly on the escape
  route, and the player ran straight into it.
- `Perseguicao.abrigoBloqueado` excludes the shelter the player is standing in when a chase
  starts. Without it, a second wrong answer right after an escape resolves as `'salvo'` on
  the first frame — the animal spawns and vanishes, and the mechanic silently stops
  applying for the rest of that question.

`AREAS_SEGURAS` (config.js) sits on the road-grid diagonals so every zone is ~51 m from a
shelter. Moving them changes chase length directly, and `world.js` must keep excluding
those spots from procedural building generation (`sobreAreaSegura`).

### Background-tab throttling

`requestAnimationFrame` does not fire in hidden tabs. The boot sequence therefore uses
`setTimeout`, guarded by `if (estado.rodando || estado.finalizado) return;` — without that guard
a delayed callback can drop the start screen on top of a game already in progress.

### Pointer lock

`travarMouse()` in `main.js` wraps `controls.lock()` in try/catch and shows the `#aviso-mouse`
hint if the lock is refused (the browser rejects it when the window isn't focused). The game must
stay playable by keyboard in that state — clicking the canvas retries the lock instead of
interacting.

## Deployment

GitHub Pages from the repo root: `index.html` is at the top level and `.nojekyll` is present.
`index.html`, `professor.html`, `src/`, and `assets/` must stay together — all paths are relative.
Teacher panel password is `SENHA_PROFESSOR` in `config.js` (client-side check; the data isn't
sensitive). See `README.md` for the full publishing walkthrough and suggested database rules.
