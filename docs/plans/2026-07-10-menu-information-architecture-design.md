# Menu Information Architecture Design

**Date:** 2026-07-10  
**Status:** Approved

## Goal

Reduce the apparent number of game modes by separating fundamentally different
experiences from simulation difficulty variants. Preserve every existing mode,
learning level, save, and mode id.

## Navigation

The main menu contains three primary destinations:

- Neues Spiel
- Lernbereich
- Spielstände

`Weiterspielen` remains a contextual shortcut shown only when a resumable save
exists.

`Neues Spiel` opens an experience picker:

- Freie Simulation — recommended and preselected
- Story: Die Probezeit

Choosing the story starts the existing `story` mode directly. Choosing the free
simulation opens a second picker containing:

- Einsteiger
- Standard
- KRITIS

The existing hidden `hard` mode stays hidden. The `learning` mode is removed
only from the new-game mode picker; it remains fully available through
`Lernbereich`, including all tracks and levels.

## Spielstände

The existing load action moves under the visible `Spielstände` entry. This
opens the current load modal and does not change save formats. The contextual
`Weiterspielen` shortcut continues to resume the latest autosave immediately.

## Interaction

Each picker has one selected item. Arrow keys change selection, Enter confirms,
and Escape goes back exactly one level. Pointer hover updates keyboard selection
as it does today.

Interactive cards use semantic `button` elements with visible
`focus-visible` styling. Modal containers prevent accidental background
interaction. Copy describes experiences first; weeks and difficulty details
appear only at the simulation-variant level.

## State and architecture

The menu flow is local UI state in `App`: main menu, experience picker, and
simulation picker. Existing `GameModeId`, configs, and `handleModeSelect` remain
the single start-game boundary.

Small exported picker components keep keyboard behavior testable. The existing
`GameModeSelectModal` becomes the simulation-variant picker and receives only
`beginner`, `intermediate`, and `kritis` configurations.

## Tests

Browser tests cover:

- the main menu no longer exposes a duplicate learning mode through new game;
- `Lernbereich` still starts the learning hub with all content;
- `Neues Spiel` preselects and recommends free simulation;
- simulation reveals exactly Einsteiger, Standard, and KRITIS;
- story starts directly from the experience picker;
- arrow, Enter, Escape, click, and focus behavior;
- Spielstände opens the existing load modal;
- existing mode configuration and save tests remain green.

## Non-goals

- no removal or renaming of game modes;
- no changes to learning tracks or content;
- no save migration;
- no redesign of the in-game HUD;
- no exposure of the hidden hard mode.
