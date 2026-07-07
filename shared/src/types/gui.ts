import { Skills } from './skills';

/**
 * GUI ("Windows-style") levels: the point-and-click counterpart to terminal
 * levels. A level renders a fake Windows app; the player solves it by
 * performing the right interactions (clicking buttons, selecting rows,
 * answering dialogs) rather than by typing commands.
 */

/** Which fake Windows app a GUI level renders. Extend as new apps are added. */
export type GuiAppId =
  | 'taskmanager'
  | 'eventviewer'
  | 'uac'
  | 'explorer'
  | 'settings'
  | 'corefirewall';

/** Windows Event Viewer severity levels (German labels rendered in the UI). */
export type EventLevel =
  | 'Information'
  | 'Warnung'
  | 'Fehler'
  | 'Kritisch'
  | 'Überwachung erfolgreich'
  | 'Überwachung fehlgeschlagen';

/** A single row in the Event Viewer log. */
export interface EventLogEntry {
  /** Stable key used in interaction tokens (e.g. 'select:<id>', 'report:<id>'). */
  id: string;
  level: EventLevel;
  /** Display timestamp, e.g. '21.06.2026 03:17:42'. */
  dateTime: string;
  source: string;
  eventId: number;
  /** Task category shown in the list (optional). */
  task?: string;
  /** Full message shown in the details pane. */
  message: string;
}

export interface EventViewerState {
  /** Log name shown in the header, e.g. 'Sicherheit'. */
  logName: string;
  entries: EventLogEntry[];
}

/** A single process row shown in the Task Manager app. */
export interface GuiProcess {
  name: string;
  pid: number;
  /** CPU usage in percent. */
  cpu: number;
  /** Memory usage in MB. */
  memoryMb: number;
  /** Short description shown under the name (like Win11 Task Manager). */
  description?: string;
  /**
   * Critical Windows processes cannot be ended (the OS blocks it). Used so
   * "End task" on svchost.exe gives an access-denied message instead of solving.
   */
  critical?: boolean;
}

export interface TaskManagerState {
  processes: GuiProcess[];
}

/** A Windows UAC ("Benutzerkontensteuerung") elevation prompt. */
export interface UacPromptState {
  /** Program requesting elevation, e.g. 'installer_v2.exe'. */
  program: string;
  /** Publisher string shown in the dialog (e.g. 'Microsoft Corporation' or 'Unbekannt'). */
  publisher: string;
  /** Whether the publisher signature is verified — the key trust signal. */
  verifiedPublisher: boolean;
  /** Full origin path, e.g. 'C:\\Users\\azubi\\Downloads\\installer_v2.exe'. */
  programPath: string;
  /** Where the file came from, shown under "Dateiursprung". */
  fileOrigin?: string;
  /** Warning shown if the player allows an untrusted prompt (the risky action). */
  riskFeedback?: string;
}

/** A single toggle row in the Windows-Sicherheit (Settings) app. */
export interface SecuritySetting {
  /** Stable key used in interaction tokens ('enable:<id>' / 'disable:<id>'). */
  id: string;
  /** Section header the row is grouped under, e.g. 'Viren- & Bedrohungsschutz'. */
  category: string;
  label: string;
  description?: string;
  /** Current (seed) state of the toggle. */
  enabled: boolean;
  /**
   * The secure target state. Status is rendered from `enabled === recommended`
   * (NOT from `enabled` alone) so a setting that is secure-when-off — e.g. the
   * developer mode — shows green while disabled.
   */
  recommended: boolean;
  /**
   * Managed by org policy: the switch is disabled (emits nothing) and its
   * `riskFeedback` is shown as static "verwaltet" helper text.
   */
  locked?: boolean;
  /**
   * Shown when the player drives a non-locked setting into an insecure state
   * (enabled !== recommended), or as static helper text on a locked row.
   */
  riskFeedback?: string;
}

export interface SettingsState {
  settings: SecuritySetting[];
}

/** A single ACL entry in the Explorer share-permissions ("Sicherheit") tab. */
export interface AclEntry {
  /** Stable key used in interaction tokens ('select:<id>', 'remove:<id>'). */
  id: string;
  /** Principal — group or user, e.g. 'Jeder', 'Buchhaltung-RW', 'Administratoren'. */
  principal: string;
  /** Permission level, e.g. 'Vollzugriff', 'Ändern', 'Lesen'. */
  permission: string;
  /** Over-broad/insecure entry (e.g. Jeder: Vollzugriff) — the one to remove. */
  overlyBroad?: boolean;
  /**
   * Must-keep entry (Administratoren, the owning business group). Removal is
   * blocked with `riskFeedback` instead of succeeding.
   */
  critical?: boolean;
  /** Warning shown when the player tries to remove a critical entry. */
  riskFeedback?: string;
}

export interface ExplorerState {
  /** Share display name, e.g. 'Finanzen'. */
  shareName: string;
  /** UNC path shown in the title, e.g. '\\\\srv\\finanzen'. */
  sharePath: string;
  entries: AclEntry[];
}

/** A single rule row in the Core-Firewall console. */
export interface FirewallRuleEntry {
  /** Stable key used in interaction tokens ('block:<id>', 'unblock:<id>'). */
  id: string;
  /** Display label, e.g. 'SSH von extern → Jump-Server'. */
  label: string;
  /** Traffic direction shown as a badge. */
  direction: 'inbound' | 'outbound';
  /** Source/target shown in the row, e.g. '185.234.72.15' or 'scada-net'. */
  target: string;
  /** Current rule action — the seed/live state, toggled by the player. */
  action: 'allow' | 'block';
  /** Hostile/over-broad rule that must be blocked — the one(s) to act on. */
  hostile?: boolean;
  /**
   * Critical link (e.g. the Leitstand management rule). Blocking it is refused
   * with `riskFeedback` instead of succeeding — pulling it cuts the control room.
   */
  critical?: boolean;
  /** Warning shown when the player tries to block a critical rule. */
  riskFeedback?: string;
}

/** A network segment that can be isolated from the rest of the plant. */
export interface FirewallSubnet {
  /** Stable key used in 'isolate:<id>' tokens. */
  id: string;
  label: string;
  /** Whether the segment is already isolated at seed. */
  isolated?: boolean;
  /**
   * Must-stay-reachable segment. Isolation is refused with `riskFeedback`
   * (isolating it would take the plant offline).
   */
  critical?: boolean;
  /** Warning shown when the player tries to isolate a critical segment. */
  riskFeedback?: string;
}

export interface CoreFirewallState {
  /** Appliance / zone name shown in the header, e.g. 'KRITIS-FW-CORE'. */
  zoneName: string;
  rules: FirewallRuleEntry[];
  subnets: FirewallSubnet[];
}

/** App-specific seed state. The relevant field is keyed by the context's `app`. */
export interface GuiAppState {
  taskManager?: TaskManagerState;
  eventViewer?: EventViewerState;
  uac?: UacPromptState;
  settings?: SettingsState;
  explorer?: ExplorerState;
  coreFirewall?: CoreFirewallState;
}

/**
 * Win/GUI level solution: a set of interaction tokens the player must emit.
 * Interaction tokens are strings such as:
 *   'select:suspicious.exe', 'endtask:suspicious.exe', 'answer:uac:yes'
 */
export interface GuiSolution {
  interactions: string[];
  /** If true, ALL listed interactions must occur; otherwise ANY one suffices. */
  allRequired: boolean;
  /** If true, the interactions must occur in the listed order (as a subsequence). */
  ordered?: boolean;
  /** Text shown on the result screen when this solution is met. */
  resultText: string;
  skillGain: Partial<Skills>;
  /**
   * Flags set when THIS solution is matched (distinct from the choice's flags).
   * Lets a later level branch on *how* an earlier one was solved — e.g. a
   * full-credit vs partial solution sets different flags for a follow-up.
   */
  setsFlags?: string[];
}

export interface GuiContext {
  /** Which fake app to render. */
  app: GuiAppId;
  /** Window title shown in the title bar. */
  title: string;
  /** Machine name shown in the level header. */
  hostname: string;
  /** Seed state for the app. */
  state: GuiAppState;
  /** Win conditions (first matching solution wins). */
  solutions: GuiSolution[];
  /** Progressive hints, revealed one at a time. */
  hints: string[];
  /** Optional briefing shown above the window. */
  briefing?: string;
  /**
   * Optional flag-dependent briefing overrides, evaluated in order: the first
   * variant whose `flag` is set on the game state wins, otherwise `briefing`.
   * Used to make a follow-up level's framing react to an earlier decision.
   */
  briefingVariants?: { flag: string; briefing: string }[];
}
