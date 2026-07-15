# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Static, no-build single-page web app (Portuguese, pt-BR) that helps students of *EE Dr. Arnaldo Estevão de Figueiredo* find and copy their institutional Google/EduTec e-mail addresses for first login. There is no build step, no package manager, and no framework — just `index.html`, `css/style.css`, and `js/app.js` (vanilla JS).

## Running

Open `index.html` through a local web server (not `file://`, because `app.js` does `fetch('data/banco_dados.txt')` which CORS-blocks on the filesystem protocol). Any static server works:

```bash
python -m http.server 8000   # then visit http://localhost:8000
```

There are no tests, lint, or build commands.

## Architecture

Everything runs client-side in `js/app.js`, kicked off by the two calls at the bottom of the file (`carregarBancoDeDados()` and `carregarLinkCompartilhado()`).

**Student data** lives in `data/banco_dados.txt`, a semicolon-delimited text file with header `Turma;Nome;Email`. To add/edit/remove students or classes, edit this file — nothing else. `processarTexto()` parses it into the in-memory `DB` object keyed by `turma` (class). The header line and any line starting with `turma` is skipped. Classes are sorted with `localeCompare(..., "pt-BR")` to populate the `#serie` dropdown; selecting a class renders its students with copy-to-clipboard buttons and a live name/e-mail search filter.

**Shared temporary link** feature lets a teacher broadcast a URL to all students for 30 minutes, backed by Firebase Realtime Database at `FIREBASE_URL` (`js/app.js:20`). Flow: teacher clicks "COMPARTILHAR LINK" → password modal → on correct password, a `prompt()` collects the URL → `PUT` to Firebase with a `timestamp`. All visitors poll the link every 60s (`setInterval`); `carregarLinkCompartilhado()` `DELETE`s the entry once older than 30 minutes. Expiry is enforced lazily on read, not by a server.

## Important notes

- The teacher password (`btnConfirmarSenha` handler) and the Firebase URL are hardcoded client-side in `js/app.js` and are therefore public — this is access-convenience gating, not real security. Keep that in mind before treating either as a secret.
- `data/banco_dados.txt` contains real student names and e-mails. Treat it as personal data; don't paste its contents into external services.
- UI strings, comments, and identifiers are in Portuguese — match that convention when editing.
