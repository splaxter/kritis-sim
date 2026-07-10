# Story and Level Improvements Design

**Date:** 2026-07-10  
**Status:** Approved

## Goal

Strengthen the existing campaigns and learning levels without replacing the
current content architecture. The work covers all six review findings:
consistent crisis pacing, meaningful consequences, stronger dilemmas, a
Blackout debrief, deliberate sidequest selection, and a more coherent and
balanced learning experience. Character voice and contradictory marketing copy
are cleaned up in the same content wave.

## Approach

Use a targeted system expansion. Keep `AdventureChapter`, `GameEvent`, the
learning-track registry, and the existing flag/effect model. Add only the small
pieces of state and pure engine helpers needed for a crisis phase, preparation
tiers, and explicit sidequest offers. Avoid a general multi-campaign framework.

This gives the authored content reliable consequences while keeping save-state
and engine risk contained.

## Adventure crisis timeline

Chapters 9 through 12 form one continuous 72-hour incident. Entering chapter 9
starts a crisis clock. Story presentation uses incident phases such as Day 1,
Night 1, Day 2, and 23:47 instead of implying that four calendar weeks pass.
Normal story sidequests cannot start during this phase, although dialogue and
abilities earned from completed sidequests remain available.

The earlier countdown copy is aligned with the actual story. Chapter 4 warns of
an attack window rather than promising an attack in exactly two weeks; chapter
5 narrows the warning without contradicting the later crisis entry.

## Preparation and consequences

A pure helper derives a preparation profile from existing flags. The profile
has three tiers:

- prepared: redundant evidence, tested recovery, allies, and containment work;
- partial: some useful preparation but important gaps;
- exposed: little preparation or actively harmful decisions.

The profile does not replace individual flags. It provides a stable summary for
briefing variants, crisis result text, and the final outcome. The climax has
three consequence levels:

- controlled victory: the pivot is stopped with limited disruption;
- costly victory: the attack is stopped, but recovery or public services take a
  visible hit;
- emergency save: physical isolation prevents the worst case, but substantial
  operational damage remains.

All outcomes continue to an ending. Preparation changes the fiction and ending
score inputs rather than creating a surprise hard failure.

## Decision rewrite

High-impact choices are rewritten as competing professional priorities. Each
option needs a credible short-term benefit and a real cost. Labels that announce
the wrong answer, such as all-caps panic or obviously reckless overwork, are
removed.

The rewrite focuses on the countdown, containment, evidence handling, staffing,
ransom response, and final isolation decisions. Teaching moments explain the
trade-off after the choice rather than revealing the correct answer beforehand.

## Sidequest selection

Random automatic sidequest starts are replaced in story mode by an explicit
offer. When one or more sidequests are available, the player sees a compact
choice event that lets them start one quest or defer side work for the current
chapter. A deferred quest may appear again in a later eligible chapter; it still
expires at its authored maximum chapter.

Only one sidequest remains active at a time. Active quests still play before the
next main beat. No new offer is generated during the 72-hour crisis.

## Blackout debrief

Operation Dunkelkammer gains a sixth learning level: a short incident debrief.
It reads the existing `blk_sloppy`, `blk_source_ip_known`,
`blk_attacker_cut`, and `solution_firewall_locked` flags. The player records the
root cause and follow-up actions; copy changes based on whether earlier triage
was careful or sloppy. Completing the debrief marks the Blackout track complete
and gives Bergmann a final reaction.

## Learning cohesion and balance

The learning hub is framed as an incident case archive. Existing Awakening,
Windows, access-control, and Blackout material become case files in the same
training environment instead of appearing to be unrelated campaigns.

Finale access requires breadth. A completed set must include core competence in
at least three tracks and cover Linux/services, security/access, and either
networking or incident response. This prevents the shortest three tracks from
unlocking graduation alone.

Thin tracks receive new compact core cases:

- Network & DNS: a DNS/service reachability triage case;
- Incident Response: an evidence-to-containment prioritization case;
- Blackout: the debrief becomes its final core level.

The existing long Windows track remains unchanged structurally. Track text and
progress messaging explain the breadth requirement.

## Character voice and copy

Bjorg remains loud, evasive, and eager to claim credit, but repeated sexist
wife/women jokes are replaced with delegation, fake meetings, management jargon,
and bureaucratic incompetence. The story tagline and overview describe Bert as
the competent, pragmatic manager he is in the authored campaign.

## State and compatibility

New adventure fields are optional and derived defaults are used for older saves.
Existing flags remain valid. Preparation is derived instead of persisted where
possible. Sidequest deferrals use chapter-scoped state so old saves do not need
a migration.

## Testing

Work proceeds test-first. Coverage includes:

- crisis entry, phase labels, and suppression of new sidequests;
- preparation-tier derivation and all three climax outcomes;
- explicit sidequest offers, selection, deferral, expiry, and active-quest flow;
- Blackout debrief gating and flag-reactive variants;
- learning-track completeness and breadth-based finale unlocking;
- content assertions for corrected countdowns, dilemma labels, and character
  voice;
- the existing full campaign pacing, consistency, content, and browser suites.

## Non-goals

- no general campaign registry or second Adventure engine;
- no real-time countdown timer;
- no rewrite of every free-play event;
- no failure ending that discards campaign progress;
- no save migration for write-only historical flags.
