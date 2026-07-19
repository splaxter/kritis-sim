# Verify: KRITIS Admin Simulator

Recipe to run and drive the app for runtime verification.

## Build & launch

```bash
npm run dev          # Vite dev server → http://localhost:5173/ (ready in <1s)
```

No build step needed for client verification; shared types are consumed via workspace.

## Drive

- App is a React SPA, keyboard-first terminal UI.
- Main menu: "NEUES SPIEL STARTEN" → mode picker → "Story: Die Probezeit" = adventure mode (content from `client/src/content/adventure/story-events.ts`).
- In events: `Enter` selects the highlighted choice AND confirms result screens — one Enter per screen advances. Story event order in week 1: adv_welcome → adv_desk_discovery → adv_first_ticket → adv_mysterious_note.
- Story background images render via `StoryBackground` component as fullscreen `<img>`; check with JS: `document.querySelectorAll('img[src*="/images/events/"]')` and `naturalWidth > 0`.
- Static assets: `client/public/images/events/*.webp`, served at `/images/events/*`.
- Autosave in localStorage (`kritis_autosave_*`); "WEITER SPIELEN" resumes exact story position.

## Advanced CLI / multi-host terminal levels

The advanced learning tracks (SSH, systemd/journal, net-forensics, Ansible — via **Lernbereich**) use a multi-host terminal:

- In SSH levels, after `ssh user@host` a `user@host's password:` prompt appears. Type the password (NOT echoed — masked as `*`, kept out of history) + Enter. On success the prompt switches to `user@remotehost` and you're operating the remote machine. `exit` returns to the previous host (it does not close the terminal until you're back on the base host).
- These levels win by reaching a target **state** (a file edited, a service/firewall/port changed), not by typing one exact command — so any valid path solves them. The "AUFGABE ABGESCHLOSSEN" banner fires as soon as the state condition is met.

## Gotchas

- Rapid repeated Enter can land on a day-transition screen whose default focus exits to the main menu — screenshot between presses.
- Old event images are 800px, newer ones 1024px wide.
