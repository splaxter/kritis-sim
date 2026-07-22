# Design: net_03 — mechanische Erzwingung der sicheren Firewall-Reihenfolge

**Datum:** 2026-07-22
**Status:** Approved
**Motivation:** In net_03 („Die Mauer") wird die sichere Härtungsreihenfolge (Port 22 freigeben, BEVOR die Firewall eingehend sperrt) bisher nur in den Hints gelehrt und per After-Action-Feedback (⚠/✓) bewertet — ein Spieler kann sie aber ignorieren und trotzdem gewinnen. Grund: net_03 ist Single-Host bei Session-Tiefe 1, der `confirmSshDisrupt`-Prompt feuert nie, und selbst wenn, kappt „y" die Session nicht. Diese Arbeit gibt der Reihenfolge echte Zähne: eine unsichere Aktivierung kappt die eigene SSH-Sitzung real.

## Grundentscheidungen (vom Nutzer bestätigt)

- **Remote-Umbau statt Single-Host** — der Spieler arbeitet per SSH auf srv-web; nur so wird die Aussperrung real.
- **Harte Sackgasse statt Recovery-Konsole** — eine unsichere Aktivierung kappt die Sitzung und sperrt aus; der Lauf ist nicht mehr gewinnbar, sauberer Neustart nur per [ESC] + Wiedereinstieg (frische Shell). Kein persistenter Konsolenmodus.
- **⚠-Feedback wird durch die Mechanik ersetzt** — auf einem gewonnenen Lauf kann keine erfolgreiche unsichere Reihenfolge mehr vorkommen.

## A) Zwei-Host-Struktur

- **Primary-Host `ws-timo`** (Workstation) — hier startet der Spieler.
- **Registrierter Host `srv-web`** in `terminalContext.hosts` — Firewall in `hosts[].firewall` von srv-web: `{ enabled: false, defaultIncoming: 'allow' }`. Konto mit Passwort (offen im Briefing; SSH ist hier nur Transportmechanik, nicht die Lektion).
- Der Spieler: `ssh timo@srv-web` (Passwort-Login, Tiefe 2) → härtet dort die Firewall.
- **Alle fünf Firewall-Goals bekommen explizit `host: 'srv-web'`**: `firewallRule allow 22` present, allow 80, allow 443, `firewallDefaultIncoming: 'deny'`, `firewallEnabled: true`. Eine globale `allow 22/tcp` erfüllt das Goal; source-restricted Regeln zählen laut Evaluator bewusst nicht als „Port offen".

## B) Der mechanische Drop (Engine)

### Source-Host im ExecutionContext
`port22Blocked(target, source)` braucht den echten Quell-Host der bestehenden Verbindung. `ctx.host` ist aber nur das Ziel (srv-web). Ergänzung:

- `ExecutionContext.sessionSourceHost?: HostState` — von der ShellEngine bei `sessionDepth > 1` auf den Host des **vorletzten** Session-Frames gesetzt (`sessionStack[length-2]`). Bei Tiefe 1 undefined. Funktioniert auch bei späteren SSH-Hops korrekt (jeder Frame kennt seinen Vorgänger); der Base-Host einzusetzen wäre falsch.

### Drop-Logik in `firewallCmd.ts`
Prompt und Drop sind getrennt:
- **Prompt (Warnung)** feuert wie bisher: über SSH (`sessionDepth > 1`) bei `enable`, wenn die Aktivierung 22 blockieren würde (`enableWouldBlock22`: default-deny ohne admittierende allow-22 bzw. explizite deny-22-Regel), und bei `default deny incoming` (über SSH, keine allow-22). Bei vorhandener allow-22 feuert kein Prompt — der sichere Pfad bleibt promptfrei.
- **Auf „y":** `proceed()` setzt **zuerst** den Firewall-State. **Danach** Prüfung `port22Blocked(ctx.host, ctx.sessionSourceHost)`. Ist die eigene Verbindung jetzt blockiert → `ctx.popSession()` (zurück auf ws-timo). Ausgabe = der erfolgreiche ufw-Text PLUS eine Zeile:
  ```
  Firewall is active and enabled on system startup
  Connection to srv-web closed by remote host.
  ```
  Ist sie NICHT blockiert (Firewall noch disabled, oder Quelle wird admittiert) → kein Drop, Sitzung bleibt, normale ufw-Ausgabe.
- **Auf „n":** `Aborted`, State unverändert, keine Zustandsänderung.

Der `port22Blocked`-Check kapselt die Firewall-`enabled`-Bedingung: bei inaktiver Firewall ist er false → `default deny incoming` bei disabled warnt zwar, droppt aber nicht.

Das [ESC]-Recovery gehört **nicht** in die generische ShellEngine-Ausgabe, sondern in `taskText`/Hints (C/E).

## C) Aussperrung, Win, Retry

Startzustand `enabled:false + default-allow`. Ein frühes `enable` blockiert nichts (default allow), ein `default deny` bei inaktiver Firewall auch nicht. Die zwei echten unsicheren Pfade — jeweils droppt der **zweite** Befehl, der den Blockzustand vollendet:

1. `default deny incoming` (inaktiv → Warnung, State ändert, **kein** Drop) → `enable` + y → jetzt aktiv + deny + keine allow-22 → **Drop**.
2. `enable` (default-allow → kein Prompt/Drop, State ändert) → `default deny incoming` + y → jetzt aktiv + deny + keine allow-22 → **Drop**.

Nach dem Drop: zurück auf ws-timo, `ssh timo@srv-web` läuft in den bestehenden Timeout (22 zu). Der alte gesperrte Shell-State ist innerhalb desselben Versuchs **bewusst nicht** reparierbar. Retry: [ESC] + Wiedereinstieg baut die Shell frisch (Firewall wieder disabled). Der **sichere** Pfad (allow 22/80/443 → deny → enable) löst nie den Prompt aus, die Sitzung überlebt, Level gelöst.

## D) After-Action-⚠ streichen, ✓ behalten

Die beiden ⚠-Regeln in net_03 raus (nach der Mechanisierung tot bzw. Hinweis auf eine Mechaniklücke). Die positive ✓-Regel bleibt in OR-Form:
- allow22 vor deny, **oder**
- allow22 vor enable

Damit werden auch die sicheren Zwischenreihenfolgen gelobt. Mehrteilige Befehle im selben Attempt (`allow 22 && enable`) bleiben weiterhin ohne Zusatztext.

## E) Content (Ton vom Nutzer vorgegeben; finaler Prosa-Pass durch den Nutzer)

**Briefing (Bert):** „Du arbeitest von ws-timo aus per SSH auf srv-web. Wenn du die Firewall aktivierst, bevor Port 22 freigegeben ist, kappst du deine eigene Verbindung. Dann hilft nur noch die Konsole. Also: erst den Zugang sichern, dann die Mauer hochziehen."

**Task:** „Verbinde dich per SSH mit timo@srv-web und härte dort die Firewall. Erlaube 22/tcp, 80/tcp und 443/tcp, setze eingehend auf deny und aktiviere die Firewall — ohne deine SSH-Verbindung zu verlieren."

**Recovery-Hinweis (taskText):** „Falls du dich aussperrst: Terminal mit [ESC] verlassen und die Aufgabe neu starten."

**Result:** „Die Firewall auf srv-web ist aktiv: 22, 80 und 443 bleiben erreichbar, alles andere scheitert an der Standardsperre. Deine SSH-Sitzung blieb während der gesamten Umstellung bestehen."

**✓-Feedback:** „✓ Port 22 war freigegeben, bevor die Firewall deinen Zugang beschränken konnte — die SSH-Verbindung blieb bestehen."

Hints lehren die Reihenfolge explizit als Selbstschutz (Leiter: orientieren ohne Befehl → exakte Syntax zuletzt).

## F) Tests

**Engine (`ufw.test.ts` + ggf. ShellEngine/sessionSourceHost):**
- `sessionSourceHost` bei Tiefe 2 = der vorletzte Frame-Host; bei Tiefe 1 undefined; bei Tiefe 3 der jeweils direkte Vorgänger.
- Beide echten Drop-Reihenfolgen: `deny → enable + y` und `enable → deny + y` → Session gepoppt, danach `ssh srv-web` Timeout.
- `default deny` bei deaktivierter Firewall: Warnung bestätigt (y), State geändert, **Session bleibt** (kein Drop).
- „n": State und Session-Tiefe unverändert.
- Source-aware Allow: eine `allow from <andere-ip> to any port 22` verhindert den Drop **nicht** (ws-timo wird nicht admittiert → weiterhin blockiert → Drop).
- Execution-Log: der UFW-Attempt beginnt auf srv-web (`hostBefore`), endet nach dem bestätigten Drop auf ws-timo (`hostAfter`), Exit-Code bleibt 0.
- Bestehende ufw-Disrupt-y/n-Tests anpassen (y poppt jetzt).

**Lesson (`netTrackLessons.test.ts`):**
- Sicherer Weg über **echten Passwort-Login** (nicht direkt `pushSession()`): `ssh timo@srv-web` → allow 22/80/443 → deny → enable → Session lebt, `checkStateGoals` (alle Goals `host:'srv-web'`) true.
- Unsicherer Weg: ssh → (deny → enable + y) → gepoppt, Goals false.
- Retry mit einer **tatsächlich neuen Engine** beweisen (frischer Lauf löst sicher).
- ✓-Feedback auf dem gewonnenen sicheren Lauf; keine ⚠-Regel mehr vorhanden (feedbackAudit + Regelzahl).

Engine-Unit-Tests dürfen `pushSession()` weiterhin isoliert verwenden.

## Nicht im Umfang

- Kein persistenter Recovery-/Konsolenmodus.
- Keine Änderung an anderen Leveln, an der ufw-Grundmechanik außerhalb des Drops, oder an der Reihenfolge-/Goal-Semantik anderswo.
- Kein globaler Umbau des Session-/SSH-Modells über das `sessionSourceHost`-Feld hinaus.
