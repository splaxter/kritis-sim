# Design: Advanced-CLI-Level — Multi-Host-Engine + 4 neue Lern-Tracks

**Datum:** 2026-07-18
**Status:** Approved
**Umfang:** Multi-Host-Fundament in der ShellEngine (echtes `ssh`, `scp`, Ansible-Mini-Engine, `journalctl`, `ufw`, …) plus vier neue Lern-Tracks à 4 Level (16 Level gesamt).

## Entscheidung

Vom Nutzer bestätigt:
- **Ein eigener Track pro Thema**, je 4 Level: SSH & Remote-Zugriff, Ansible & Konfigurationsmanagement, systemd & Journal, Netz-Forensik.
- **Echte Kommandos** statt gecannter `terminalContext.commands` (Option 1: volle Multi-Host-Engine mit echter Ansible-Idempotenz). Begründung: Der Mehraufwand gegenüber „Ansible check-only“ steckt fast nur in der Mini-Engine, und genau die trägt einen ganzen Track. Alles ist wiederverwendbar (z. B. kann der Blackout-Jumpserver-Beat später auf echtem `ssh` laufen).

## A) Engine: Multi-Host-Fundament

### Host-Register
- Die `ShellEngine` verwaltet mehrere Hosts. Jeder Host: eigenes `VirtualFilesystem`, Hostname, User, Dienste (systemd-State), Journal-Einträge, Crontabs, Firewall-State (ufw).
- Level deklarieren Hosts im `terminalContext`: `hosts: [{ id, templateId, overlay }]`. Bestehende `VFSTemplateId`s (`linux-webserver`, `linux-database`, `linux-mail`, `linux-firewall`, …) werden wiederverwendet; `overlay` wie bisheriges `vfsOverlay`, aber pro Host.
- **Rückwärtskompatibilität:** Bestehende Single-Host-Level laufen unverändert (ein impliziter Default-Host).

### SSH echt
- `ssh user@host` prüft echt gegen `authorized_keys` auf dem Zielhost. Schlüssel werden mit `ssh-keygen` erzeugt und mit `ssh-copy-id`/`scp` verteilt.
- Realistische Fehlerbilder: falsche Permissions auf `id_rsa` → `WARNING: UNPROTECTED PRIVATE KEY FILE`, fehlender Schlüssel → `Permission denied (publickey)`.
- **Session-Stack:** `ssh` pusht eine Session (Prompt, cwd, VFS wechseln), `exit` poppt. ssh-in-ssh (Jumphost-Ketten) wird unterstützt.
- `sshd_config`-Einstellungen (`PermitRootLogin`, `PasswordAuthentication`) wirken auf das Login-Verhalten; Änderungen greifen erst nach `systemctl restart sshd`.

### Ansible-Mini-Engine
- `ansible-playbook` liest Inventory + Playbook aus dem VFS des aktuellen Hosts.
- **Kuratiertes Modul-Set:** `lineinfile`, `copy`, `service`, `user`. Kein generischer YAML-Interpreter.
- **Echte Idempotenz:** Tasks werden gegen die Host-VFS angewendet; 1. Lauf `changed`, 2. Lauf `ok`. `--check`/`--diff` rechnen echt, ohne anzuwenden.
- Fehlerbilder: Tippfehler in Pfad/Parameter → lesbare Fehlermeldung mit Task-Name (Lernziel: Fehlermeldung lesen).

### Neue Kommandos
`ssh`, `scp`, `ssh-keygen`, `ssh-copy-id`, `ansible-playbook`, `journalctl` (`-u`, `--since`, `--until`, `-f` optional), `crontab` (`-l`, `-e` als Hinweis auf sed/tee), `ufw` (status/allow/deny/delete/default), `chown`.
Config-Edits laufen über `sed -i` / `tee` / `>>` — **kein Vollbild-Editor** (eigenes Projekt, out of scope). Falls `sed -i` noch fehlt, wird es ergänzt.

### Lösungs-Erkennung: `stateGoals`
- Canned-Command-Tagging (`teachesCommand` + `TerminalSolution.commands`) funktioniert mit echten Kommandos nicht mehr.
- Neu: deklarative **`stateGoals`** pro Level, nach jedem Befehl geprüft. Beispiele:
  - `{ host: 'web01', file: '/etc/ssh/sshd_config', matches: '^PermitRootLogin no' }`
  - `{ host: 'web01', service: 'sshd', state: 'active' }`
  - `{ host: 'core01', firewallRule: { action: 'deny', port: 4444 } }`
  - `{ host: 'jump01', fileAbsent: … }` / Negativ-Matches für entfernte Zeilen.
- **Level gelten als gelöst, sobald das Kernziel erreicht ist — egal auf welchem Weg** (Analogie zu `guiSolution.ts`; kein Hard-Gating aller Zwischenschritte, vgl. Memory „level-completion-core-find“).
- **skillGain live** beim ersten erfolgreichen Einsatz eines neuen Kommandos (Analogie zu den GUI-Interaction-Tokens); der Lösungs-`skillGain`/`effects` kommt weiterhin aus der `TerminalSolution`.

## B) Die vier Tracks (je 4 Level)

Charakter-Kanon: Jens/Henry = kompetente Mentoren (Hints), Bjorg = lauter Delegierer und Verursacher des Config-Drifts, Bert = souveräner, technisch versierter Chef als Auftraggeber.
Hint-Eskalation wie gehabt: `hints[0]` orientiert (nie das Kommando), exakte Syntax zuletzt.

### Track „SSH & Remote-Zugriff“ (`ssh_remote`)
Baut lore-mäßig auf `learn_adv_ssh_orphan` (Access & Hardening) auf.
1. **Der erste Schlüssel** — Keypair erzeugen, auf web01 ausrollen, passwortlos einloggen. Stolperstein: `id_rsa` mit falschen Permissions.
2. **Die offene Tür** — Audit-Befund von Bert: `PermitRootLogin yes` + Passwort-Auth auf web01. Härten per `sed -i`, sshd neu starten — vorher prüfen, dass der eigene Schlüssel greift (Aussperr-Lektion).
3. **Sprung durch die Zone** — db01 nur über jump01 erreichbar (Netzsegmentierung/KRITIS). ssh-Kette, Schlüssel auf dem Jumphost.
4. **Der Schlüsselfriedhof** ★ — `authorized_keys` über alle Hosts auditieren, fremden Schlüssel finden (FENRIS-Anklang), erst Beweis sichern (`scp` nach lokal), dann entfernen.

### Track „Ansible & Konfigurationsmanagement“ (`ansible_config`)
1. **Die Inventur** — Inventory + Playbook lesen, `--check` laufen lassen, verstehen, was passieren *würde*.
2. **Der Drift** — Einer von drei Webhosts weicht ab (Bjorg hat „mal eben“ von Hand geändert). `--check --diff` entlarvt ihn, Playbook konvergiert die Flotte, zweiter Lauf zeigt `ok` — Idempotenz erlebt.
3. **Das kaputte Playbook** — Playbook schlägt fehl (Tippfehler in Pfad/Parameter). Fehlermeldung lesen, YAML per `sed`/`tee` fixen, durchlaufen lassen.
4. **Die Flottenhärtung** — Synthese mit Track 1: sshd-Härtung als Playbook auf alle Hosts ausrollen, stichprobenartig per `ssh` verifizieren.

### Track „systemd & Journal“ (`systemd_journal`)
1. **Der stumme Dienst** — Dienst down: `systemctl status` → `journalctl -u` → Ursache (fehlende Config) → fixen, starten, `enable` nicht vergessen.
2. **Die Zeitreise** — `journalctl --since/--until` + grep: Beginn einer Brute-Force-Welle eingrenzen, Quell-IP identifizieren.
3. **Der Wiedergänger** — Dienst in Restart-Schleife: Unit-File kaputt (falscher `ExecStart`), fixen, `daemon-reload` als Lektion.
4. **Die Kettenreaktion** — Dienst fällt, weil seine Abhängigkeit fehlt (`After=`/`Requires=`): Dependency-Denken statt blindem Neustarten.

### Track „Netz-Forensik“ (`net_forensics`)
1. **Offene Türen** — `ss -tulpen` gegen die Soll-Portliste: unerwarteten Listener finden und dem Prozess zuordnen.
2. **Der Rückkanal** — Etablierte ausgehende Verbindung zu fremder IP; manipulierte `/etc/hosts` als Fund.
3. **Die Mauer** — `ufw`-Regeln auditieren, Loch schließen, default-deny — ohne sich selbst von ssh auszusperren.
4. **Die Spinne im Netz** ★ (Boss) — Multi-Host: kompromittierten Host über Logs finden (per `ssh` hinspringen), Beweis sichern, mit `ufw` isolieren.

## C) Einordnung & Gating

- Vier neue Tracks im LearningHub, Standard-Gating (nach Foundations frei), order 7–10; Blackout und Finale rücken entsprechend.
- Innerhalb eines Tracks: Level 1–3 strikt sequenziell via `requires.events`, Level 4 als Abschluss. ★-Level sind `optional: true` (zählen nicht zur Core-Completion).
- `unlockAfterTracksCompleted: 3` fürs Finale bleibt unverändert.

## D) Tests

- Unit-Tests pro neuem `ShellCommand` (inkl. Fehlerpfade: Permission denied, falsche Args).
- Engine-Tests für Host-Register + Session-Stack (ssh/exit/Verschachtelung, scp zwischen Hosts).
- Ansible-Tests: Idempotenz (changed→ok), `--check`/`--diff` ohne Seiteneffekte, Fehlermeldungen.
- Pro Level ein Lesson-Test nach bestehendem Muster (`engine/sshOrphanLesson.test.ts`): Lösungsweg + mindestens ein alternativer Weg erreicht die `stateGoals`.
- Bestehende Guards bleiben grün: `learningPathShadowing.test.ts`, `content/orthography.test.ts`, Pacing-/Flow-/Skill-Balance-Audits. Audit-Failures sind Content-Feedback, keine Test-Bugs.

## Out of Scope

- Vollbild-Editoren (vi/nano) im Terminal.
- Generischer Ansible-YAML-Interpreter jenseits der vier Module.
- Umstellung bestehender Level (ssh_orphan, cron_privesc, Blackout-Beats) auf die neue Engine — mögliche Folgearbeit.
