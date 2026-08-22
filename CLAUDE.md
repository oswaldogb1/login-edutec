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

Everything dynamic goes through one unauthenticated Realtime Database over plain REST: `https://edutec-arnaldo-default-rtdb.firebaseio.com`. Nodes in use:

- `/link_temporario` — the single URL a teacher broadcasts to the class.
- `/links_aula` — append-only; links attached to a specific booked class by the scheduler app (`D:\SITEAGENDA\agendamento`). `buscarLinkDaAula()` shows the entry whose `[inicio, fim]` window contains "now" and whose `ativo !== false`, and takes priority over `link_temporario`. Expiry is decided on read — **never delete from this node**; that is what makes the link vanish when the class ends.
- `/jogos` — the list of games shown to students (`{nome, url, timestamp}` per push key).
- `/ranking` — score board written by `jogos/jogo9neu`.
- `/cidade_inteligente/salas/{CODIGO}` — everything `jogos/Cidade` writes. That game's `js/firebase.js` has a single URL builder (`montarCaminho`) that forces this prefix, refuses `PUT`, and self-tests on load. Never add a raw Firebase `fetch()` there, and never widen its `DELETE`.
- `jogos/jogo7neu` embeds the same `databaseURL` via the Firebase compat SDK for its own live ranking.

Because the database is shared across school projects, a game that writes must confine itself to its own node, and test data has to be cleaned up afterwards.

The database is world-readable and world-writable. All "passwords" are string literals in client JS and therefore public — they are convenience gating, not security:

- `js/app.js` `SENHA_JOGOS` — delete a game from the modal on the home page.
- `js/jogos.js` `SENHA_ADMIN` — delete a game from the standalone `jogos.html` page.
- `jogos/Cidade/js/app.js` `SENHA_PROFESSOR` — open the teacher panel of that game.

The first two are **different values** guarding the same Firebase node. Note also that `app.js` is read-only with respect to `link_temporario`: it never writes or deletes, and 30-minute expiry is applied lazily on read (an expired link is ignored, not removed). The teacher-side write UI lives on a different site, not in this repo.

Because the teacher shares the link from that other site while students already have this page open, `monitorarLink()` re-checks every 20 s **and** on `visibilitychange`/`focus`/`pageshow`/`online`. The event triggers are the important half: browsers throttle and eventually freeze timers in background tabs, which is what used to force students to reload the page before the link showed up. Keep those listeners if you touch this code, and keep `cache: "no-store"` on the two link fetches.

## Two overlapping games UIs

`index.html` shows games in a **modal** driven by `js/app.js`; `jogos.html` is a **standalone page** driven by `js/jogos.js`. The card rendering, sorting (newest first by `timestamp`), and delete logic are duplicated between the two files with small divergences (different password, modal vs. `prompt()`). Changing games behavior usually means editing both.

## Adding a game

Each game is a self-contained folder under `jogos/` with an `index.html` entry point and **relative** asset paths, so it works from any location. Most games (`Bingo`, `jogo1neu`, `jogo7neu`, `jogo8neu`, `ohm`) are single-file — markup, `<style>`, and `<script>` in one `index.html`. Others are split (`jogo6neu`: `script.js`/`perguntas.js`/`style.css`; `jogo9neu`: `js/{data,firebase,board,game}.js`; `Cidade`: `js/` modules on a `window.CI` namespace; `acentua`: `src/` compiled by `build.js`). Follow whichever shape the game you're touching already uses.

A game folder existing on disk does **not** put it in the list — the list comes from Firebase `/jogos`, populated via the teacher's "Adicionar Jogo" flow with a path like `jogos/quiz-matematica/index.html` (or any full `https://` URL, e.g. itch.io).

Known oddities:

- `jogos/jogo2neu/index.html.html` is misnamed and won't load as a folder entry point.
- `jogos/Bingo/` holds two near-identical copies of the same bingo (`index.html` and `bingo-cidade-inteligente.html`) that have since diverged; check which one the Firebase `/jogos` entry actually points at before editing.

## Conventions

UI strings, comments, function names, and variables are all Portuguese (`carregarJogos`, `renderizarLista`, `senhaInput`). Match that when editing — don't introduce English identifiers into existing files.
