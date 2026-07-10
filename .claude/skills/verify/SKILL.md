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

## Gotchas

- Rapid repeated Enter can land on a day-transition screen whose default focus exits to the main menu — screenshot between presses.
- Old event images are 800px, newer ones 1024px wide.
