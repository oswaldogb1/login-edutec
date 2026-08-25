# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Static site (Portuguese, pt-BR), served straight from the filesystem, for *EE Dr. Arnaldo Estevão de Figueiredo* (Figueirão - MS). Two things live here:

1. **Login helper** (`index.html` + `js/app.js`) — students pick their class, find their name, and copy their institutional EduTec e-mail for first Google login.
2. **Educational games** (`jogos/`) — independent mini-games, each in its own folder.

At the top level there is no package manager, no framework, no build step, no tests, no lint — hand-written HTML/CSS/vanilla JS served as-is. The repo root is `login-edutec/` (git remote: `oswaldogb1/login-edutec`); the parent `D:\siteescola` is not versioned.

Two games are large enough to be their own projects and carry **their own `CLAUDE.md`, which takes precedence when you are working inside them** — read it before editing:

- `jogos/acentua/CLAUDE.md` — train game about Portuguese stress/accentuation. This one **does have a build step** (`node build.js` concatenates `src/` into a generated `index.html`); never hand-edit its `index.html`.
- `jogos/Cidade/CLAUDE.md` — "Cidade Inteligente", multiplayer teacher/student game with a live projected panel and its own strictly namespaced Firebase area.

## Running

Serve over HTTP, never `file://` — `app.js` does `fetch('data/banco_dados.txt')`, which CORS-blocks on the filesystem protocol.

```bash
python -m http.server 8000   # then http://localhost:8000
```

Deployment is "push to GitHub" (see `jogos/LEIA-ME.md`, written for the teacher).

## Student data

`data/banco_dados.txt` — semicolon-delimited, header `Turma;Nome;Email`. To add/remove students or classes, edit **only** this file. `processarTexto()` skips the header and any line starting with `turma`, parses into the in-memory `DB` keyed by class, and `configurarSelectTurmas()` sorts classes with `localeCompare(..., "pt-BR")` for the `#serie` dropdown.

This file holds real minors' names and e-mails. Treat it as personal data — don't paste its contents into external services or echo it wholesale.

## Firebase (shared, no SDK, no auth)

Everything dynamic goes through one unauthenticated Realtime Database over plain REST: `https://edutec-arnaldo-default-rtdb.firebaseio.com`.

The database is **shared across school projects**, so every writer confines itself to its own top-level node, and test data has to be cleaned up afterwards. Nodes in use:

| Node | Owner | Notes |
|---|---|---|
| `/link_temporario` | teacher's other site | The single URL broadcast to the class. `app.js` only reads it. |
| `/links_aula` | scheduler app (`D:\SITEAGENDA\agendamento`) | Append-only. **Never delete from this node.** |
| `/jogos` | teacher's "Adicionar Jogo" flow | `{nome, url, timestamp}` per push key. Deleted from by `js/app.js` and `js/jogos.js`. |
| `/ranking` | `jogos/jogo9neu` | via its `js/firebase.js`. |
| `/rankings` | `jogos/jogo8neu` | **Plural — a different node from `/ranking`.** Don't conflate the two. |
| `/jogo_ritmo_memoria` | `jogos/jogo7neu` | The only game using the Firebase **compat SDK** rather than raw REST. |
| `/bingoCidade` | `jogos/Bingo` | Both copies of the bingo share this node — see the Bingo warning below. |
| `/cidade_inteligente/salas/{CODIGO}` | `jogos/Cidade` | Namespace enforced in code — see below. |
| `/cidade_desperta/salas/{SALA}` | `jogos/quebra` | Namespace enforced by `NUVEM.raiz` + `urlSala()`. |

`jogos/Cidade/js/firebase.js` has a single URL builder (`montarCaminho`) that forces its prefix, refuses `PUT`, and self-tests on load. Never add a raw Firebase `fetch()` there, and never widen its `DELETE`.

### Link expiry is decided on read

`buscarLinkDaAula()` shows the `/links_aula` entry whose `[inicio, fim]` window contains "now" and whose `ativo !== false`, and it takes priority over `link_temporario` (which expires 30 minutes after its `timestamp`). Neither is ever deleted — **expiry is applied lazily on read**, and that is exactly what makes the link vanish when the class ends. `app.js` is strictly read-only with respect to both nodes; the teacher-side write UI lives on a different site, not in this repo.

Because the teacher shares the link from that other site while students already have this page open, `monitorarLink()` re-checks every 20 s **and** on `visibilitychange`/`focus`/`pageshow`/`online`. The event triggers are the important half: browsers throttle and eventually freeze timers in background tabs, which is what used to force students to reload the page before the link showed up. Keep those listeners if you touch this code, and keep `cache: "no-store"` on the two link fetches. A network failure deliberately keeps the last known link rather than making the button disappear.

### Passwords are public

The database is world-readable and world-writable. All "passwords" are string literals in client JS and therefore public — they are convenience gating, not security:

| Constant | File | Value | Guards |
|---|---|---|---|
| `SENHA_JOGOS` | `js/app.js` | `54321Paz` | Delete a game from the modal on the home page. |
| `SENHA_ADMIN` | `js/jogos.js` | `arnaldotec` | Delete a game from the standalone `jogos.html` page. |
| `SENHA_PROFESSOR` | `jogos/Cidade/js/app.js` | `54321` | Teacher panel. |
| `SENHA_PROFESSOR` | `jogos/Bingo/*.html` | `54321` | Teacher panel. |
| `NUVEM.senha` | `jogos/quebra/index.html` | `54321` | Teacher panel. |

The top two are **different values guarding the same `/jogos` node**; the games have separately converged on a shared `54321` for their teacher panels.

## Two overlapping games UIs

`index.html` shows games in a **modal** driven by `js/app.js`; `jogos.html` is a **standalone page** driven by `js/jogos.js`. The card rendering, sorting (newest first by `timestamp`), and delete logic are duplicated between the two files with small divergences — a different password, and a different way of asking for it: `app.js` uses a bare `prompt()`, while `jogos.js` drives the `#passwordModal` dialog in `jogos.html` through `abrirModalSenha(mensagem, acao)`. Changing games behavior usually means editing both.

## Adding a game

Each game is a self-contained folder under `jogos/` with an `index.html` entry point and **relative** asset paths, so it works from any location. Follow whichever shape the game you're touching already uses:

- **Single-file** (markup, `<style>`, and `<script>` in one `index.html`): `Bingo`, `jogo1neu`, `jogo7neu`, `jogo8neu`, `ohm`, `quebra`. Single-file does not mean small — `quebra` is ~4,100 lines.
- **Split flat files**: `jogo6neu` (`script.js`/`perguntas.js`/`style.css`).
- **`js/` modules**: `jogo9neu` (`js/{data,firebase,board,game}.js`), `Cidade` (modules on a `window.CI` namespace).
- **Compiled**: `acentua` (`src/` concatenated by `build.js`).

A game folder existing on disk does **not** put it in the list — the list comes from Firebase `/jogos`, populated via the teacher's "Adicionar Jogo" flow with a path like `jogos/quiz-matematica/index.html` (or any full `https://` URL, e.g. itch.io).

### Live-ranking games

`Cidade`, `Bingo`, and `quebra` share a pattern: students join a room code, and the teacher opens a password-gated panel that projects a live ranking. `quebra` reads its room with a Firebase REST `EventSource` stream (`put`/`patch` events) and falls back to a 4 s poll when the stream fails; its "Limpar sala" button is a two-click confirm that `DELETE`s only `/{raiz}/salas/{SALA}`. Keep new network calls in these games optional and silently failing — they are all designed to stay playable offline.

### Known oddities

- `jogos/jogo2neu/index.html.html` is misnamed and won't load as a folder entry point.
- `jogos/Bingo/` holds two copies of the same bingo. `bingo-cidade-inteligente.html` is the **newer** one and has genuinely diverged from `index.html` (~180 diff lines): it adds "Encerrar e apurar", a most-correct-answers tie-break for when every theme is drawn with no winner, a penalty that frees a theme again on a wrong answer, and extra `estado` fields (`sorteadoEm`, `vencedor`) that the older copy does not understand. Both write to the **same** `/bingoCidade` room, so pointing the two copies at one room corrupts it. Check which file the Firebase `/jogos` entry actually references before editing.

## Conventions

UI strings, comments, function names, and variables are all Portuguese (`carregarJogos`, `renderizarLista`, `senhaInput`). Match that when editing — don't introduce English identifiers into existing files.
