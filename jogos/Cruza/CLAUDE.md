# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Batalha das Cruzadinhas! is a classroom crossword game (Portuguese, pt-BR) about smart & sustainable cities: `index.html` is the student game, `professor.html` is a password-protected live ranking dashboard meant for projection. The code, identifiers, comments and UI are all in Portuguese — keep new code that way. `README.md` is the user-facing documentation (scoring table, word list, Firebase schema); update it when changing those.

## Commands

No build, no package manager, no tests, no linter — plain static files, vanilla ES5 JS loaded via `<script>` tags.

```bash
python -m http.server 8777    # then open http://localhost:8777/index.html and /professor.html
```

Serve over HTTP rather than `file://` (QR code and some features break otherwise). External deps come from CDNs (Three.js r128, qrcodejs 1.0.0, Google Fonts); all degrade gracefully if missing.

Sanity-check the board after editing `LAYOUT` (`Puzzle.build()` does **not** validate that crossing letters agree — a conflict silently overwrites the first word's letter):

```bash
node -e "global.window=global;require('./assets/js/puzzle.js');var p=Puzzle.build(),bad=0;p.words.forEach(w=>w.cells.forEach((c,i)=>{if(p.grid[c.r][c.c].letter!==w.answer[i]){bad++;console.log('conflito',w.raw,c)}}));console.log('palavras',p.words.length,'cruzamentos',p.crossings,'conflitos',bad)"
```

## Architecture

Each JS file is an IIFE that exposes one global; load order in the HTML matters:

- `puzzle.js` → `Puzzle` — the fixed 17×17 `LAYOUT` (word, row/col, `H`/`V`, `clue`, `hint`). `build()` derives grid, clue numbering and crossing count; `normalize()` strips accents (`Ç`→`C`) and answers are compared in normalized form. Both pages call `Puzzle.build()` (the teacher page uses it for per-word stats).
- `db.js` → `DB` — Firebase Realtime Database via raw REST `fetch` (no SDK), everything under `/cruzada_cidades/salas/{SALA}/jogadores/{id}`. Live updates via Firebase REST streaming (`EventSource` `put`/`patch` events applied to an in-memory tree), falling back to polling every 4s.
- `sfx.js` → `SFX` — WebAudio synthesized tones; no audio files.
- `scene.js` → `Scene3D.init(canvas, opts)` — low-poly Three.js city background. Returns a stub `{ok:false, celebrar(){}, pulsar(){}}` when THREE/WebGL is unavailable, so callers check `cena.ok`.
- `game.js` — student page. All state lives in the `S` object; scoring constants at the top. A word is checked only when all its cells are filled; cells of solved words are locked. Progress is PATCHed on each solved word, every 20s, and on `pagehide` (with `fetch` `keepalive` — not `sendBeacon`, since POST would create a new Firebase child).
- `teacher.js` — dashboard. State in `P`; password is the `SENHA` constant (client-side only, unlocked per tab via `sessionStorage`). Sort modes in `ORDENS`. Changing room just re-subscribes to a different `salas/{code}` path.

CSS: `base.css` holds shared design tokens (CSS variables, Portuguese names) and components; `game.css` / `teacher.css` are page-specific. Visibility is toggled with the `oculto` class.

## Hard rules

- **Never delete data in Firebase.** All writes must be `PATCH` (merge) inside the `cruzada_cidades` namespace — no `PUT`, `DELETE`, or `POST` anywhere. The database is shared with other apps. A "clean round" is done by creating a new room code, not by clearing data.
- Player identity: `localStorage` key `cruza:id:{SALA}:{NOME normalizado}` keeps the same Firebase record across reloads. Only the id persists — board state is not restored, so a reload restarts the game and its next save overwrites that record's score.
- Room codes arrive via `?sala=` on either page and are sanitized by `limparCodigo()` (duplicated in `game.js` and `teacher.js`).
